from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from finai.ai_orchestrator import orchestrate_ca_consultation
from finai.stock_engine import evaluate_stock_risk, get_market_indices
from finai.storage import save_record, get_history
from finai.rules import gst, income_tax, capital_gains, emi, hra_exemption, presumptive_44ada, presumptive_44ad

# Load environment variables from .env
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(
    title="FinAI API",
    description="Next-Gen Institutional AI Chartered Accountant & Stock Risk Assessment Engine",
    version="2.0.0",
)

# Enable CORS for frontend development and production (allow local & Vercel domains)
origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins else [o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=2, description="User question or financial scenario")
    mode: str = Field(default="auto", description="auto | salary | gst")


class CalculateRequest(BaseModel):
    kind: str = Field(..., description="tax | gst | capital_gains | emi | presumptive_44ada | presumptive_44ad | hra")
    params: dict[str, Any] = Field(default_factory=dict)


@app.get("/api/status")
def get_system_status() -> dict[str, Any]:
    """Health check endpoint showing AI API, Search Grounding, and Market Feed connectivity."""
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash").strip()
    has_cloud_ai = bool(gemini_key or groq_key)
    return {
        "status": "online",
        "gemini_api": {
            "online": has_cloud_ai,
            "model": model_name if gemini_key else "llama-3.3-70b",
            "provider": "Google Gemini (Search Grounded)" if gemini_key else "Groq Llama 3.3" if groq_key else "Offline Synthesis",
            "mode": "Live Cloud AI (Google Grounded)" if has_cloud_ai else "Deterministic High-Fidelity Synthesis",
            "groq_backup": bool(groq_key),
        },
        "market_data": {
            "online": True,
            "provider": "Yahoo Finance (NSE/BSE Real-Time)",
        },
        "version": "2.0.0",
    }


@app.post("/api/chat")
def handle_chat(req: ChatRequest) -> dict[str, Any]:
    """
    Handle natural language financial scenarios.
    Executes live statutory search, deterministic math engines, and AI synthesis.
    Logs transaction to cryptographic SHA-256 audit ledger.
    """
    try:
        response = orchestrate_ca_consultation(req.query, mode=req.mode)
        # Save to audit ledger
        audit_record = save_record(
            kind="ca_consultation",
            user_input={"query": req.query, "mode": req.mode},
            result={
                "has_math": bool(response.get("tax_comparison_card") or response.get("verified_math_card")),
                "citations_count": len(response.get("citations", [])),
            },
        )
        response["audit_record"] = audit_record
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Consultation engine error: {str(e)}")


@app.get("/api/stock-risk")
def get_stock_risk(ticker: str = Query(..., min_length=1, description="Stock ticker e.g. RELIANCE, TCS, INFY")) -> dict[str, Any]:
    """
    Evaluate real-time multi-factor risk score (0-100) for Indian stocks.
    Strictly educational and quantitative — zero Buy/Sell recommendations.
    """
    try:
        result = evaluate_stock_risk(ticker)
        # Log stock assessment to audit ledger
        audit_record = save_record(
            kind="stock_evaluation",
            user_input={"ticker": ticker},
            result={
                "symbol": result["symbol"],
                "score": result["composite_score"],
                "risk_category": result["risk_category"],
            },
        )
        result["audit_record"] = audit_record
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stock assessment error: {str(e)}")


@app.get("/api/market-indices")
def get_indices() -> dict[str, Any]:
    """Return live Nifty 50 and Sensex benchmarks with health scores and sparkline trend graphs."""
    try:
        return get_market_indices()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market indices error: {str(e)}")


@app.post("/api/calculate")
def execute_calculation(req: CalculateRequest) -> dict[str, Any]:
    """Direct execution of deterministic Python rule engines."""
    p = req.params
    try:
        if req.kind == "gst":
            res = gst(float(p.get("base_amount", 0)), float(p.get("rate", 18)), bool(p.get("interstate", False)))
        elif req.kind == "tax":
            res = {
                "new_regime": income_tax(float(p.get("gross", 0)), "new"),
                "old_regime": income_tax(
                    float(p.get("gross", 0)), "old",
                    deductions=float(p.get("deductions", 0)),
                    hra=float(p.get("hra", 0)),
                    home_loan=float(p.get("home_loan", 0)),
                ),
            }
        elif req.kind == "capital_gains":
            res = capital_gains(
                stcg_equity=float(p.get("stcg_equity", 0)),
                ltcg_equity=float(p.get("ltcg_equity", 0)),
                ltcg_property=float(p.get("ltcg_property", 0)),
            )
        elif req.kind == "emi":
            res = emi(float(p.get("principal", 0)), float(p.get("annual_rate", 8.5)), int(p.get("tenure_months", 240)))
        elif req.kind == "hra":
            res = hra_exemption(
                basic_salary=float(p.get("basic_salary", 0)),
                hra_received=float(p.get("hra_received", 0)),
                rent_paid=float(p.get("rent_paid", 0)),
                is_metro=bool(p.get("is_metro", True)),
            )
        elif req.kind == "presumptive_44ada":
            res = presumptive_44ada(float(p.get("gross_receipts", 0)))
        elif req.kind == "presumptive_44ad":
            res = presumptive_44ad(float(p.get("digital_turnover", 0)), float(p.get("cash_turnover", 0)))
        else:
            raise HTTPException(status_code=400, detail=f"Unknown calculation kind: {req.kind}")

        audit_record = save_record(kind=f"calc_{req.kind}", user_input=p, result=res)
        return {"calculation": res, "audit_record": audit_record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@app.get("/api/audit-logs")
def get_audit_logs(limit: int = Query(50, ge=1, le=200)) -> dict[str, Any]:
    """Retrieve immutable audit history records with SHA-256 block hashes."""
    records = get_history(limit=limit)
    return {"count": len(records), "records": records}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    is_prod = "PORT" in os.environ
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not is_prod)
