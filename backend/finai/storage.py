from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "finai.db"
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()


def _is_postgres() -> bool:
    return DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")


def _get_pg_connection():
    import psycopg2
    import psycopg2.extras
    # Neon URLs sometimes use postgres:// instead of postgresql://
    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    conn = psycopg2.connect(url, sslmode="require")
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS consultations (
                id SERIAL PRIMARY KEY,
                created_at TEXT NOT NULL,
                kind TEXT NOT NULL,
                input_json TEXT NOT NULL,
                result_json TEXT NOT NULL,
                previous_hash TEXT NOT NULL,
                audit_hash TEXT NOT NULL
            );
        """)
    conn.commit()
    return conn


def _get_sqlite_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS consultations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            kind TEXT NOT NULL,
            input_json TEXT NOT NULL,
            result_json TEXT NOT NULL,
            previous_hash TEXT NOT NULL,
            audit_hash TEXT NOT NULL
        )
    """)
    conn.commit()
    return conn


def save_record(kind: str, user_input: dict, result: dict) -> dict:
    """Save record to Neon PostgreSQL (if DATABASE_URL is set) or local SQLite."""
    created_at = datetime.now(timezone.utc).isoformat()

    if _is_postgres():
        try:
            conn = _get_pg_connection()
            with conn.cursor() as cur:
                cur.execute("SELECT audit_hash FROM consultations ORDER BY id DESC LIMIT 1")
                prev = cur.fetchone()
                previous_hash = prev[0] if prev else "GENESIS_BLOCK_FINAI"

                canonical = json.dumps({
                    "created_at": created_at,
                    "kind": kind,
                    "input": user_input,
                    "result": result,
                    "previous": previous_hash,
                }, sort_keys=True, separators=(",", ":"))
                audit_hash = hashlib.sha256(canonical.encode()).hexdigest()

                cur.execute("""
                    INSERT INTO consultations (created_at, kind, input_json, result_json, previous_hash, audit_hash)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
                """, (created_at, kind, json.dumps(user_input), json.dumps(result), previous_hash, audit_hash))
                rec_id = cur.fetchone()[0]
                conn.commit()
                conn.close()
                return {
                    "id": rec_id,
                    "created_at": created_at,
                    "kind": kind,
                    "hash": audit_hash,
                    "previous_hash": previous_hash,
                    "engine": "Neon PostgreSQL",
                }
        except Exception as e:
            # Fall back to SQLite if PostgreSQL connection fails
            pass

    # SQLite fallback
    with _get_sqlite_connection() as conn:
        prev = conn.execute("SELECT audit_hash FROM consultations ORDER BY id DESC LIMIT 1").fetchone()
        previous_hash = prev["audit_hash"] if prev else "GENESIS_BLOCK_FINAI"

        canonical = json.dumps({
            "created_at": created_at,
            "kind": kind,
            "input": user_input,
            "result": result,
            "previous": previous_hash,
        }, sort_keys=True, separators=(",", ":"))
        audit_hash = hashlib.sha256(canonical.encode()).hexdigest()

        cur = conn.execute("""
            INSERT INTO consultations (created_at, kind, input_json, result_json, previous_hash, audit_hash)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (created_at, kind, json.dumps(user_input), json.dumps(result), previous_hash, audit_hash))
        conn.commit()
        return {
            "id": cur.lastrowid,
            "created_at": created_at,
            "kind": kind,
            "hash": audit_hash,
            "previous_hash": previous_hash,
            "engine": "SQLite Local",
        }


def get_history(limit: int = 50) -> list[dict]:
    """Retrieve audit history records from Neon Postgres or SQLite."""
    if _is_postgres():
        try:
            conn = _get_pg_connection()
            import psycopg2.extras
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("SELECT * FROM consultations ORDER BY id DESC LIMIT %s", (limit,))
                rows = cur.fetchall()
                records = []
                for r in rows:
                    try:
                        inp = json.loads(r["input_json"])
                    except Exception:
                        inp = {}
                    try:
                        res = json.loads(r["result_json"])
                    except Exception:
                        res = {}
                    records.append({
                        "id": r["id"],
                        "created_at": r["created_at"],
                        "kind": r["kind"],
                        "input": inp,
                        "result": res,
                        "previous_hash": r["previous_hash"],
                        "audit_hash": r["audit_hash"],
                        "engine": "Neon PostgreSQL",
                    })
                conn.close()
                return records
        except Exception:
            pass

    with _get_sqlite_connection() as conn:
        rows = conn.execute("SELECT * FROM consultations ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        records = []
        for r in rows:
            try:
                inp = json.loads(r["input_json"])
            except Exception:
                inp = {}
            try:
                res = json.loads(r["result_json"])
            except Exception:
                res = {}
            records.append({
                "id": r["id"],
                "created_at": r["created_at"],
                "kind": r["kind"],
                "input": inp,
                "result": res,
                "previous_hash": r["previous_hash"],
                "audit_hash": r["audit_hash"],
                "engine": "SQLite Local",
            })
        return records
