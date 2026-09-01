from __future__ import annotations

import logging
from typing import Any
import yfinance as yf

logger = logging.getLogger(__name__)

SEBI_DISCLAIMER = (
    "Educational risk and financial health analysis only. Not investment advice or recommendation. "
    "FinAI does not recommend to Buy, Sell, or Hold any security. "
    "All stock investments are subject to market risks. Please consult a SEBI-registered investment advisor."
)


COMMON_ALIASES = {
    "HDFC BANK": "HDFCBANK",
    "HDFC": "HDFCBANK",
    "SBI": "SBIN",
    "STATE BANK OF INDIA": "SBIN",
    "STATE BANK": "SBIN",
    "TATA MOTORS": "TATAMOTORS",
    "ICICI BANK": "ICICIBANK",
    "ICICI": "ICICIBANK",
    "KOTAK BANK": "KOTAKBANK",
    "KOTAK": "KOTAKBANK",
    "AXIS BANK": "AXISBANK",
    "AXIS": "AXISBANK",
    "BAJAJ FINANCE": "BAJFINANCE",
    "BAJAJ FINSERV": "BAJAJFINSV",
    "L&T": "LT",
    "LARSEN": "LT",
    "LARSEN & TOUBRO": "LT",
    "AIRTEL": "BHARTIARTL",
    "BHARTI AIRTEL": "BHARTIARTL",
    "INFOSYS": "INFY",
    "MARUTI SUZUKI": "MARUTI",
    "ASIAN PAINTS": "ASIANPAINT",
    "SUN PHARMA": "SUNPHARMA",
    "HCL TECH": "HCLTECH",
    "ITC": "ITC",
    "MAMAEARTH": "HONASA",
    "HONASA": "HONASA",
    "HONASA CONSUMER": "HONASA",
    "PAYTM": "PAYTM",
    "ONE97": "PAYTM",
    "NYKAA": "NYKAA",
    "FSN": "NYKAA",
    "DMART": "DMART",
    "AVENUE SUPERMARTS": "DMART",
    "INDIGO": "INDIGO",
    "INTERGLOBE": "INDIGO",
    "JIO": "JIOFIN",
    "JIO FINANCIAL": "JIOFIN",
    "OLA": "OLAELEC",
    "OLA ELECTRIC": "OLAELEC",
    "SWIGGY": "SWIGGY",
}


def _normalize_ticker(ticker: str) -> str:
    cleaned = ticker.strip().upper()
    # Check alias map
    if cleaned in COMMON_ALIASES:
        cleaned = COMMON_ALIASES[cleaned]
    # Remove interior spaces (e.g. "HDFC  BANK" -> "HDFCBANK")
    cleaned = cleaned.replace(" ", "")
    if not cleaned.endswith(".NS") and not cleaned.endswith(".BO"):
        return f"{cleaned}.NS"
    return cleaned


def evaluate_stock_risk(ticker_input: str) -> dict[str, Any]:
    """
    Evaluate real-time multi-factor risk and financial health score (0-100)
    for an Indian stock ticker via Yahoo Finance.
    Strictly educational and quantitative — zero Buy/Sell recommendations.
    """
    symbol = _normalize_ticker(ticker_input)
    info = {}
    fast_info = None
    try:
        stock = yf.Ticker(symbol)
        try:
            info = stock.info or {}
        except Exception:
            info = {}
        try:
            fast_info = stock.fast_info
        except Exception:
            fast_info = None
    except Exception as e:
        logger.warning(f"Error fetching ticker {symbol}: {e}")

    company_name = (
        info.get("shortName")
        or info.get("longName")
        or (symbol.replace(".NS", "").replace(".BO", ""))
    )
    current_price = (
        info.get("currentPrice")
        or info.get("regularMarketPrice")
        or (getattr(fast_info, "last_price", None) if fast_info else None)
        or 0.0
    )
    currency = info.get("currency", "INR")
    sector = info.get("sector", "Diversified")
    industry = info.get("industry", "General")

    # --- PILLAR 1: Volatility & Market Risk (25 points) ---
    # Low beta & small drawdown = High Score (Lower Risk)
    beta = info.get("beta") or 1.0
    fifty_two_high = info.get("fiftyTwoWeekHigh") or current_price or 1.0
    fifty_two_low = info.get("fiftyTwoWeekLow") or (current_price * 0.7) or 1.0

    drawdown_from_high = 0.0
    if fifty_two_high and current_price:
        drawdown_from_high = max(0.0, (fifty_two_high - current_price) / fifty_two_high)

    volatility_score = 15.0
    if beta < 0.8:
        volatility_score = 23.0
    elif beta <= 1.1:
        volatility_score = 19.0
    elif beta <= 1.4:
        volatility_score = 14.0
    else:
        volatility_score = 8.0

    if drawdown_from_high > 0.35:
        volatility_score = max(5.0, volatility_score - 5.0)

    # --- PILLAR 2: Valuation Risk (25 points) ---
    pe = info.get("trailingPE") or info.get("forwardPE")
    pb = info.get("priceToBook")

    valuation_score = 15.0
    if pe is None or pe <= 0:
        valuation_score = 10.0  # Unprofitable or no PE
    elif pe < 18:
        valuation_score = 23.0
    elif pe <= 30:
        valuation_score = 18.0
    elif pe <= 50:
        valuation_score = 12.0
    else:
        valuation_score = 7.0  # Highly stretched valuation

    # --- PILLAR 3: Solvency & Balance Sheet Health (25 points) ---
    debt_to_equity = info.get("debtToEquity")  # Yahoo provides as percentage e.g. 25.4 for 0.254
    current_ratio = info.get("currentRatio") or 1.0

    solvency_score = 16.0
    if debt_to_equity is not None:
        de_ratio = debt_to_equity / 100.0
        if de_ratio < 0.3:
            solvency_score = 24.0  # Virtually debt free
        elif de_ratio <= 0.8:
            solvency_score = 20.0
        elif de_ratio <= 1.5:
            solvency_score = 14.0
        else:
            solvency_score = 6.0  # High debt burden
    else:
        # For financials / banks where debtToEquity is undefined
        solvency_score = 18.0

    if current_ratio < 0.9:
        solvency_score = max(5.0, solvency_score - 4.0)

    # --- PILLAR 4: Operational Quality & Profitability (25 points) ---
    roe = info.get("returnOnEquity")  # float e.g. 0.18 for 18%
    operating_margins = info.get("operatingMargins") or 0.0

    quality_score = 15.0
    if roe is not None:
        if roe > 0.22:
            quality_score = 24.0
        elif roe >= 0.14:
            quality_score = 20.0
        elif roe >= 0.08:
            quality_score = 14.0
        else:
            quality_score = 7.0
    else:
        quality_score = 14.0

    # Composite Score (0 - 100)
    composite_score = round(volatility_score + valuation_score + solvency_score + quality_score, 1)
    composite_score = max(5.0, min(98.0, composite_score))

    # Risk Band Interpretation
    if composite_score >= 75:
        risk_category = "Low Risk / High Financial Stability"
        status_color = "emerald"
    elif composite_score >= 55:
        risk_category = "Moderate Risk / Balanced Fundamentals"
        status_color = "amber"
    elif composite_score >= 35:
        risk_category = "Elevated Risk / Volatile Profile"
        status_color = "orange"
    else:
        risk_category = "High Risk / Financially Strained"
        status_color = "crimson"

    # Red & Green Flags
    green_flags = []
    red_flags = []

    if debt_to_equity is not None and (debt_to_equity / 100.0) < 0.4:
        green_flags.append(f"Low Debt Profile (D/E ratio: {debt_to_equity / 100.0:.2f})")
    if roe and roe >= 0.15:
        green_flags.append(f"Strong Return on Equity ({roe * 100:.1f}%)")
    if beta < 0.9:
        green_flags.append(f"Lower Market Volatility (Beta: {beta:.2f})")
    if current_ratio and current_ratio >= 1.3:
        green_flags.append(f"Healthy Liquidity (Current Ratio: {current_ratio:.2f})")

    if pe and pe > 45:
        red_flags.append(f"Premium Valuation Multiples (P/E: {pe:.1f})")
    if beta > 1.35:
        red_flags.append(f"Elevated Systematic Volatility (Beta: {beta:.2f})")
    if debt_to_equity is not None and (debt_to_equity / 100.0) > 1.8:
        red_flags.append(f"High Leverage Risk (D/E ratio: {debt_to_equity / 100.0:.2f})")
    if drawdown_from_high > 0.25:
        red_flags.append(f"Trading {drawdown_from_high * 100:.1f}% Below 52-Week High")
    if current_ratio and current_ratio < 1.0:
        red_flags.append("Working Capital Strain (Current Ratio < 1.0)")

    if not green_flags:
        green_flags.append("Established market presence across Indian exchanges")
    if not red_flags:
        red_flags.append("No immediate severe financial red flags detected")

    return {
        "symbol": symbol,
        "company_name": company_name,
        "current_price": current_price,
        "currency": currency,
        "sector": sector,
        "industry": industry,
        "composite_score": composite_score,
        "risk_category": risk_category,
        "status_color": status_color,
        "pillars": {
            "volatility": {
                "name": "Market Volatility",
                "score": round(volatility_score, 1),
                "max": 25,
                "summary": f"Beta: {beta:.2f} · Drawdown: {drawdown_from_high * 100:.1f}%",
            },
            "valuation": {
                "name": "Valuation Multiples",
                "score": round(valuation_score, 1),
                "max": 25,
                "summary": f"P/E: {f'{pe:.1f}' if pe else 'N/A'} · P/B: {f'{pb:.1f}' if pb else 'N/A'}",
            },
            "solvency": {
                "name": "Balance Sheet Solvency",
                "score": round(solvency_score, 1),
                "max": 25,
                "summary": f"D/E: {f'{debt_to_equity / 100.0:.2f}' if debt_to_equity is not None else 'N/A'} · Current Ratio: {f'{current_ratio:.2f}' if current_ratio else 'N/A'}",
            },
            "profitability": {
                "name": "Quality & Margins",
                "score": round(quality_score, 1),
                "max": 25,
                "summary": f"ROE: {f'{roe * 100:.1f}%' if roe else 'N/A'} · Op Margin: {f'{operating_margins * 100:.1f}%' if operating_margins else 'N/A'}",
            },
        },
        "key_stats": {
            "beta": round(beta, 2),
            "pe_ratio": round(pe, 2) if pe else None,
            "pb_ratio": round(pb, 2) if pb else None,
            "fifty_two_high": fifty_two_high,
            "fifty_two_low": fifty_two_low,
            "market_cap": info.get("marketCap"),
        },
        "green_flags": green_flags,
        "red_flags": red_flags,
        "sebi_disclaimer": SEBI_DISCLAIMER,
    }
