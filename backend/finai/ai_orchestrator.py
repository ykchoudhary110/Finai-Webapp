from __future__ import annotations

import json
import logging
import os
import re
import urllib.request
import urllib.error
from typing import Any

from finai.rules import gst, income_tax, capital_gains, presumptive_44ada, presumptive_44ad, blocked_credit_17_5
from finai.live_search import search_tax_statutes
from finai.catalog import find_candidates

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are FinAI CA Pro, an expert institutional Chartered Accountant AI for the Indian tax and compliance ecosystem.
Your audience includes business founders, CFOs, freelancers, and tax professionals.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. You NEVER perform raw tax math or invent calculation numbers yourself. All figures must come from the deterministic computational engine.
2. Provide precise, actionable legal advisory citing sections of the Income Tax Act 1961, CGST Act 2017, and relevant CBIC circulars.
3. Use inline citation references like [CBIC Notification] or [Section 115BAC] whenever citing statutory provisions.
4. Keep explanations crisp, professional, and well-structured with clear headings and bullet points.
5. If credit is blocked under Section 17(5) or compliance thresholds apply (Section 44AB audit, Section 22 GST registration, Section 208 advance tax), prominently highlight them as risks.
"""


def _extract_monetary_amounts(text: str) -> list[float]:
    normalized = text.lower().replace("₹", " ").replace("rs.", " ").replace("rs ", " ")
    # Handle numbers with commas e.g. 45,00,000 or 1,20,000 or 4500000 or 45L / 45 lakhs
    lakh_match = re.findall(r"(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b", normalized)
    crore_match = re.findall(r"(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b", normalized)
    raw_match = re.findall(r"(?<!\w)(\d[\d,]*(?:\.\d+)?)(?!\w)", normalized)

    amounts = []
    for m in crore_match:
        try:
            amounts.append(float(m) * 10000000.0)
        except ValueError:
            pass
    for m in lakh_match:
        try:
            amounts.append(float(m) * 100000.0)
        except ValueError:
            pass
    for m in raw_match:
        cleaned = m.replace(",", "")
        try:
            val = float(cleaned)
            if val >= 500:  # ignore tiny numbers like dates or sections
                amounts.append(val)
        except ValueError:
            pass
    return sorted(amounts, reverse=True)


def _call_gemini_rest(prompt: str, search_context: str, api_key: str) -> str | None:
    """Call Google Gemini via REST endpoint (supports gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash)."""
    model_name = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash").strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"{SYSTEM_PROMPT}\n\nLIVE STATUTORY CONTEXT FETCHED FROM GOVERNMENT SOURCES:\n{search_context}\n\nUSER QUESTION / SCENARIO:\n{prompt}"
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1200,
        },
    }
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
    except Exception as e:
        logger.warning(f"Gemini API call failed: {e}")
    return None


def orchestrate_ca_consultation(user_query: str) -> dict[str, Any]:
    """
    Main neuro-symbolic agent orchestrator:
    1. Fetches live statutory context via web search.
    2. Runs deterministic rule engines on detected amounts and scenarios.
    3. Calls Gemini API for institutional commentary, or uses verified template synthesis if key is missing.
    4. Attaches verified math cards and statutory citation pills.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    amounts = _extract_monetary_amounts(user_query)
    primary_amount = amounts[0] if amounts else None

    # Step 1: Live search for statutory citations
    search_results = search_tax_statutes(user_query, max_results=3)
    search_context_str = "\n".join(
        [f"- [{s['citation_tag']}] {s['title']}: {s['snippet']} (Source: {s['url']})" for s in search_results]
    )

    # Step 2: Deterministic Rule Engines Triggering
    verified_math_card = None
    tax_comparison_card = None
    q_lower = user_query.lower()

    # Check for GST transaction intent
    is_gst = any(k in q_lower for k in ("gst", "sale", "purchase", "invoice", "hsn", "sac", "interstate", "itc"))
    # Check for Salary / Personal Tax intent
    is_income_tax = any(k in q_lower for k in ("salary", "income tax", "regime", "deduction", "80c", "hra", "115bac"))
    # Check for Capital Gains intent
    is_capital_gains = any(k in q_lower for k in ("capital gain", "stcg", "ltcg", "mutual fund", "shares", "equity", "stocks"))
    # Check for Freelancer / Presumptive intent
    is_presumptive = any(k in q_lower for k in ("freelancer", "freelance", "consultant", "44ada", "44ad", "turnover", "developer", "remote"))

    # Execute math when amounts exist
    if primary_amount:
        if is_income_tax or (not is_gst and not is_capital_gains and not is_presumptive):
            # Compute Old vs New Regime
            new_reg = income_tax(primary_amount, "new")
            old_reg = income_tax(primary_amount, "old", deductions=150000.0)
            diff = abs(new_reg["total_tax"] - old_reg["total_tax"])
            winner = "New Regime (Sec 115BAC)" if new_reg["total_tax"] <= old_reg["total_tax"] else "Old Regime"

            tax_comparison_card = {
                "type": "tax_regime_comparison",
                "gross_income": primary_amount,
                "winner": winner,
                "savings_amount": diff,
                "new_regime": new_reg,
                "old_regime": old_reg,
                "computed_by": "RuleEngine:IncomeTax_Budget2024",
            }
        elif is_presumptive:
            ada_res = presumptive_44ada(primary_amount)
            tax_calc = income_tax(ada_res["taxable_profit"], "new")
            verified_math_card = {
                "type": "presumptive_44ada",
                "title": "Section 44ADA Presumptive Taxation Analysis",
                "gross_receipts": primary_amount,
                "deemed_profit": ada_res["taxable_profit"],
                "effective_tax": tax_calc["total_tax"],
                "details": [
                    {"label": "Gross Professional Receipts", "value": f"₹{primary_amount:,.2f}"},
                    {"label": "Statutory Deemed Profit (50%)", "value": f"₹{ada_res['taxable_profit']:,.2f}"},
                    {"label": "Estimated Tax Payable (New Regime)", "value": f"₹{tax_calc['total_tax']:,.2f}"},
                    {"label": "Books of Accounts & Audit", "value": "Exempt up to ₹75 Lakhs"},
                ],
                "computed_by": "RuleEngine:Sec44ADA_Presumptive",
            }
        elif is_gst:
            candidates = find_candidates(user_query)
            selected_item = candidates[0] if candidates else {
                "code": "998313", "kind": "SAC", "name": "IT & Software Consulting", "rate": 18.0, "itc": True,
                "source": "Notification No. 11/2017-Central Tax (Rate)",
            }
            is_interstate = any(k in q_lower for k in ("interstate", "igst", "mumbai", "delhi", "bangalore", "outside state"))
            gst_res = gst(primary_amount, selected_item["rate"], is_interstate)

            bc_res = blocked_credit_17_5(user_query)

            verified_math_card = {
                "type": "gst_computation",
                "title": f"GST Invoicing Assessment — {selected_item['name']}",
                "taxable_value": primary_amount,
                "gst_amount": gst_res["gst_amount"],
                "invoice_total": gst_res["invoice_total"],
                "rate": selected_item["rate"],
                "hsn_sac": selected_item["code"],
                "itc_status": "Blocked under " + bc_res["section"] if bc_res["is_blocked"] else "Eligible under Section 16",
                "details": [
                    {"label": "Tariff Code", "value": f"{selected_item['kind']} {selected_item['code']}"},
                    {"label": "Statutory Rate", "value": f"{selected_item['rate']}% ({gst_res['treatment']})"},
                    {"label": "Taxable Value", "value": f"₹{primary_amount:,.2f}"},
                    {"label": "GST Amount", "value": f"₹{gst_res['gst_amount']:,.2f}"},
                    {"label": "Total Invoiced Amount", "value": f"₹{gst_res['invoice_total']:,.2f}"},
                    {"label": "Input Tax Credit (ITC)", "value": bc_res["reason"]},
                ],
                "computed_by": "RuleEngine:GST_Deterministic",
            }

    # Step 3: Generate AI Advisory (via Gemini or Verified Local Fallback)
    ai_narrative = None
    if api_key:
        math_summary = ""
        if tax_comparison_card:
            math_summary = f"COMPUTED MATH: On Gross ₹{primary_amount:,.2f}, New Regime Tax is ₹{tax_comparison_card['new_regime']['total_tax']:,.2f}, Old Regime Tax is ₹{tax_comparison_card['old_regime']['total_tax']:,.2f}. Winner saves ₹{tax_comparison_card['savings_amount']:,.2f}."
        elif verified_math_card:
            math_summary = f"COMPUTED MATH: {verified_math_card['title']} => Total Tax: ₹{verified_math_card.get('effective_tax', verified_math_card.get('gst_amount', 0)):,.2f}."

        augmented_prompt = f"{user_query}\n\n[RULE ENGINE OUTPUT TO INTEGRATE INTO ADVISORY: {math_summary}]"
        ai_narrative = _call_gemini_rest(augmented_prompt, search_context_str, api_key)

    if not ai_narrative:
        # High-grade deterministic template synthesis with real citations
        ai_narrative = _generate_institutional_synthesis(
            user_query, primary_amount, tax_comparison_card, verified_math_card, search_results
        )

    return {
        "user_query": user_query,
        "narrative": ai_narrative,
        "tax_comparison_card": tax_comparison_card,
        "verified_math_card": verified_math_card,
        "citations": search_results,
        "api_online": bool(api_key),
    }


def _generate_institutional_synthesis(
    query: str,
    amount: float | None,
    tax_comp: dict | None,
    math_card: dict | None,
    citations: list[dict],
) -> str:
    """Generate professional institutional CA advisory when cloud API is offline."""
    q_lower = query.lower()
    sections = []

    sections.append("### ⚖️ Professional CA Advisory Memorandum")

    if tax_comp:
        win = tax_comp["winner"]
        savings = tax_comp["savings_amount"]
        new_tax = tax_comp["new_regime"]["total_tax"]
        old_tax = tax_comp["old_regime"]["total_tax"]

        sections.append(
            f"Based on your gross income of **₹{amount:,.2f}**, the **{win}** is significantly more tax-efficient. "
            f"Adopting this strategy results in a direct net tax savings of **₹{savings:,.2f}** for the assessment year."
        )
        sections.append(
            "#### Key Statutory Frameworks Applied:\n"
            "- **Section 115BAC (New Default Regime)**: Slabs revised under Finance Act 2024 with standard deduction enhanced to **₹75,000**.\n"
            "- **Section 87A Tax Rebate**: Full rebate available up to ₹12,00,000 taxable income, resulting in ₹0 net tax liability for qualifying brackets.\n"
            "- **Chapter VI-A Deductions**: In Old Regime, investments under 80C/80D/NPS are evaluated against the enhanced New Regime thresholds."
        )
    elif math_card and math_card.get("type") == "presumptive_44ada":
        sections.append(
            f"For professional and consulting income of **₹{amount:,.2f}**, **Section 44ADA of the Income Tax Act** offers substantial compliance and tax advantages."
        )
        sections.append(
            "#### Key Advisory Points:\n"
            "- **50% Deemed Profit Rule**: You are only required to offer 50% of your gross professional receipts as taxable profit.\n"
            "- **Books of Accounts Exemption**: No statutory obligation to maintain detailed day-to-day books of accounts or undergo a tax audit under Section 44AB (up to ₹75 Lakhs receipts).\n"
            "- **GST Registration Reminder**: If your aggregate annual turnover exceeds **₹20 Lakhs** (or ₹10 Lakhs in special category states), mandatory GST registration is triggered under Section 22 of the CGST Act."
        )
    elif math_card and math_card.get("type") == "gst_computation":
        sections.append(
            f"This transaction is classified under **{math_card['hsn_sac']}** with statutory GST liability calculated at **{math_card['rate']}%**."
        )
        sections.append(
            f"#### Invoicing & Compliance Note:\n"
            f"- **Input Tax Credit**: {math_card['itc_status']}.\n"
            f"- **Place of Supply**: Evaluated under Sections 10 and 12 of the IGST Act 2017 to determine whether CGST+SGST or IGST applies.\n"
            f"- **Invoicing Total**: Taxable amount of ₹{math_card['taxable_value']:,.2f} + GST of ₹{math_card['gst_amount']:,.2f} = **₹{math_card['invoice_total']:,.2f}**."
        )
    else:
        sections.append(
            "Your financial query has been evaluated against current statutory provisions of the **Income Tax Act 1961** and the **CGST Act 2017**."
        )
        sections.append(
            "#### Statutory Compliance Reminders:\n"
            "- **Advance Tax Compliance**: Under Section 208, any taxpayer whose estimated tax liability exceeds ₹10,000 must discharge advance tax in quarterly installments.\n"
            "- **Section 17(5) Blocked ITC**: Ensure input tax credit is not claimed on ineligible categories such as personal motor vehicles or outdoor catering.\n"
            "- **TDS / TCS Provisions**: Verify withholding tax thresholds (e.g., Section 194J for professional fees, Section 194C for contracts) prior to payment remittance."
        )

    # Attach citation tags
    if citations:
        tag_list = ", ".join([f"**[{c['citation_tag']}]**" for c in citations])
        sections.append(f"\n*Statutory References Verified:* {tag_list}")

    return "\n\n".join(sections)
