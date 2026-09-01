from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "finai.db"


def _get_connection() -> sqlite3.Connection:
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
    """Save an immutable consultation or stock evaluation record with SHA-256 hash chaining."""
    with _get_connection() as conn:
        prev = conn.execute("SELECT audit_hash FROM consultations ORDER BY id DESC LIMIT 1").fetchone()
        previous_hash = prev["audit_hash"] if prev else "GENESIS_BLOCK_FINAI"
        created_at = datetime.now(timezone.utc).isoformat()

        canonical_payload = json.dumps({
            "created_at": created_at,
            "kind": kind,
            "input": user_input,
            "result": result,
            "previous": previous_hash,
        }, sort_keys=True, separators=(",", ":"))

        audit_hash = hashlib.sha256(canonical_payload.encode()).hexdigest()

        cursor = conn.execute("""
            INSERT INTO consultations (created_at, kind, input_json, result_json, previous_hash, audit_hash)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (created_at, kind, json.dumps(user_input), json.dumps(result), previous_hash, audit_hash))
        conn.commit()

        return {
            "id": cursor.lastrowid,
            "created_at": created_at,
            "kind": kind,
            "hash": audit_hash,
            "previous_hash": previous_hash,
        }


def get_history(limit: int = 50) -> list[dict]:
    """Retrieve audit history records in reverse chronological order."""
    with _get_connection() as conn:
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
            })
        return records
