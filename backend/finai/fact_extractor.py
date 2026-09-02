"""Structured Fact Extraction and Unit Normalization Engine for Indian Taxation.

Normalizes natural language inputs, Indian numbering formats (Lakhs, Crores, etc.),
tax-inclusive vs. exclusive flags, and head-aware place of supply parameters.
"""
from __future__ import annotations

import re
from decimal import Decimal
from typing import Any
from finai.deterministic_math import parse_indian_number, money, normalize_tax_year


def detect_tax_domain(query: str) -> str:
    """Classify user query into GST, INCOME_TAX, or HYBRID."""
    q = query.lower()
    gst_keywords = [
        "gst", "itc", "cgst", "sgst", "igst", "input tax credit",
        "hsn", "sac", "gstr", "e-way", "purchase", "purchased", "sale",
        "garment", "garments", "clothes", "machine", "machinery"
    ]
    it_keywords = [
        "income tax", "salary", "ctc", "regime", "115bac", "80c", "80d",
        "section 24", "home loan", "hra", "standard deduction", "itr", "tds",
        "rebate", "slab", "capital gain", "stcg", "ltcg"
    ]

    has_gst = any(k in q for k in gst_keywords)
    has_it = any(k in q for k in it_keywords)

    if has_gst and has_it:
        return "HYBRID"
    if has_gst:
        return "GST"
    if has_it:
        return "INCOME_TAX"
    return "GST"


def extract_gst_facts(query: str) -> dict[str, Any]:
    """
    Clause-based extraction for GST transactions.
    Preserves exact semantics: purchase vs. sale, items, rates, inclusive/exclusive.
    """
    q_lower = query.lower()
    is_global_interstate = any(k in q_lower for k in ("interstate", "igst", "outside state", "delhi to mumbai", "to other state"))
    is_global_inclusive = any(k in q_lower for k in ("including gst", "inclusive", "inclusive of tax", "incl gst"))

    # Split by conjunctions into distinct clauses (do not split on decimal numbers like 11.8)
    clauses = re.split(r"\band\b|\bthen\b|;|,|(?<!\d)\.(?!\d)", query, flags=re.IGNORECASE)

    inward_supplies = []
    outward_supplies = []

    for raw_clause in clauses:
        clause = raw_clause.strip()
        c_lower = clause.lower()
        if not clause:
            continue

        # Extract amount in this clause
        amt = parse_indian_number(clause)
        if not amt or amt <= Decimal("100"):
            continue

        # Extract rate in this clause
        rate_m = re.search(r"(\d+(?:\.\d+)?)\s*%", clause)
        rate = Decimal(rate_m.group(1)) if rate_m else None

        # Check local inclusive / interstate flags
        clause_inclusive = is_global_inclusive or any(k in c_lower for k in ("including", "inclusive", "incl"))
        clause_interstate = is_global_interstate or any(k in c_lower for k in ("interstate", "outside state", "igst"))

        # Determine transaction type
        is_purchase = any(k in c_lower for k in ("purchas", "bought", "machine", "machin", "inward", "expense", "cost", "raw material", "equipment", "asset"))
        is_sale = any(k in c_lower for k in ("sale", "sold", "cloth", "garment", "revenue", "outward", "turnover", "supply"))

        if is_purchase and not is_sale:
            item_rate = rate or Decimal("18.00")
            desc = "Factory Machine (Capital Goods)" if any(k in c_lower for k in ("machine", "machinery", "equipment")) else "Inward Commercial Supply"
            inward_supplies.append({
                "description": desc,
                "taxable_value": amt,
                "gst_rate": item_rate,
                "is_inclusive": clause_inclusive,
                "is_interstate": clause_interstate,
                "is_capital_goods": any(k in c_lower for k in ("machine", "machinery", "equipment")),
            })
        elif is_sale:
            desc = "Sale of Readymade Garments / Apparel" if any(k in c_lower for k in ("cloth", "garment", "apparel")) else "Outward Commercial Supply"
            outward_supplies.append({
                "description": desc,
                "taxable_value": amt,
                "gst_rate_specified": rate,  # None triggers ambiguity branching
                "is_inclusive": clause_inclusive,
                "is_interstate": clause_interstate,
                "is_garments": any(k in c_lower for k in ("cloth", "garment", "apparel")),
            })

    # Fallback if clause splitting didn't classify
    if not inward_supplies and not outward_supplies:
        all_amounts = [money(m) for m in re.findall(r"(\d+(?:\.\d+)?)\s*(?:lakh|crore)?", q_lower) if money(m) > Decimal("100")]
        if len(all_amounts) >= 2:
            inward_supplies.append({
                "description": "Inward Commercial Supply",
                "taxable_value": all_amounts[0],
                "gst_rate": Decimal("18.00"),
                "is_inclusive": is_global_inclusive,
                "is_interstate": is_global_interstate,
                "is_capital_goods": "machine" in q_lower,
            })
            outward_supplies.append({
                "description": "Outward Commercial Supply",
                "taxable_value": all_amounts[1],
                "gst_rate_specified": Decimal("5.00") if ("cloth" in q_lower or "garment" in q_lower) else Decimal("18.00"),
                "is_inclusive": is_global_inclusive,
                "is_interstate": is_global_interstate,
                "is_garments": "cloth" in q_lower or "garment" in q_lower,
            })

    return {
        "tax_type": "GST",
        "inward_supplies": inward_supplies,
        "outward_supplies": outward_supplies,
        "is_interstate": is_global_interstate,
        "is_inclusive": is_global_inclusive,
    }


def extract_income_tax_facts(query: str) -> dict[str, Any]:
    """Extract structured facts for Income Tax and Salary computations."""
    q_lower = query.lower()

    # Split into clauses for entity-level precision (do not split on decimal numbers like 1.5)
    clauses = re.split(r"\band\b|\bwith\b|\bplus\b|\bhaving\b|\bincluding\b|\bthen\b|;|,|(?<!\d)\.(?!\d)", query, flags=re.IGNORECASE)

    gross_salary = Decimal("0.00")
    sec_80c = Decimal("0.00")
    sec_80d = Decimal("0.00")
    sec_24b = Decimal("0.00")
    basic_salary = Decimal("0.00")
    hra_received = Decimal("0.00")
    rent_paid = Decimal("0.00")
    is_metro = any(k in q_lower for k in ("metro", "mumbai", "delhi", "bangalore", "chennai", "kolkata"))

    for raw_c in clauses:
        c = raw_c.strip().lower()
        if not c:
            continue
        amt = parse_indian_number(c)
        if not amt:
            continue

        if any(k in c for k in ("salary", "ctc", "annual", "income", "earning", "package")):
            if gross_salary == Decimal("0.00"):
                gross_salary = amt
        elif any(k in c for k in ("80c", "pf", "ppf", "elss", "lic", "provident fund")):
            sec_80c = amt
        elif any(k in c for k in ("80d", "medical", "health insurance", "mediclaim")):
            sec_80d = amt
        elif any(k in c for k in ("home loan", "loan interest", "24b", "housing loan", "interest")):
            # Check if monthly EMI was stated
            if "month" in c or "monthly" in c or "every month" in c or "per month" in c:
                # Up to Section 24(b) statutory cap of ₹2,00,000
                sec_24b = min(Decimal("200000.00"), amt * Decimal("12") * Decimal("0.70"))
            else:
                sec_24b = min(Decimal("200000.00"), amt)
        elif "hra" in c:
            hra_received = amt
        elif "rent" in c:
            rent_paid = amt * (Decimal("12") if any(k in c for k in ("month", "monthly", "per month")) else Decimal("1"))

    # Fallback for gross salary if not matched by keyword
    if gross_salary == Decimal("0.00"):
        first_amt = parse_indian_number(query)
        if first_amt:
            gross_salary = first_amt

    regime_requested = "COMPARE"
    fy_norm, ay_norm, is_explicit = normalize_tax_year(query)

    return {
        "tax_type": "INCOME_TAX",
        "financial_year": fy_norm,
        "assessment_year": ay_norm,
        "is_year_explicit": is_explicit,
        "gross_salary": gross_salary,
        "sec_80c": sec_80c,
        "sec_80d": sec_80d,
        "sec_24b": sec_24b,
        "basic_salary": basic_salary,
        "hra_received": hra_received,
        "rent_paid": rent_paid,
        "is_metro": is_metro,
        "regime_requested": regime_requested,
    }
