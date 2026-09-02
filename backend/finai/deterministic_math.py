"""Deterministic mathematical calculation engine for Indian GST and Income Tax.

ALL financial arithmetic MUST use Decimal with ROUND_HALF_UP.
Zero floating-point arithmetic is permitted for monetary calculations.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any


def money(value: Any) -> Decimal:
    """Convert any numeric/string value to exact Decimal with 2 decimal places."""
    if isinstance(value, Decimal):
        return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    # Strip currency symbols and clean commas
    cleaned = str(value).replace("₹", "").replace("Rs.", "").replace("Rs", "").replace(",", "").strip()
    if not cleaned:
        return Decimal("0.00")
    try:
        return Decimal(cleaned).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except Exception:
        return Decimal("0.00")


def parse_indian_number(text: str) -> Decimal | None:
    """Parse text containing Indian currency words (lakh, crore, etc.) into exact Decimal."""
    text_clean = text.lower().replace("₹", " ").replace("rs.", " ").replace("rs ", " ")
    text_clean = text_clean.replace(",", "").strip()

    # Crore check
    crore_m = re.search(r"(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b", text_clean)
    if crore_m:
        val = Decimal(crore_m.group(1)) * Decimal("10000000")
        return money(val)

    # Lakh check
    lakh_m = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b", text_clean)
    if lakh_m:
        val = Decimal(lakh_m.group(1)) * Decimal("100000")
        return money(val)

    # Thousand / k check
    k_m = re.search(r"(\d+(?:\.\d+)?)\s*(?:thousand|k)\b", text_clean)
    if k_m:
        val = Decimal(k_m.group(1)) * Decimal("1000")
        return money(val)

    # Direct digit check
    digit_m = re.search(r"(\d+(?:\.\d+)?)", text_clean)
    if digit_m:
        return money(digit_m.group(1))

    return None


# ==============================================================================
# GST DETERMINISTIC ENGINE
# ==============================================================================

@dataclass
class GstItemBreakdown:
    description: str
    taxable_base: Decimal
    gst_rate: Decimal
    cgst_rate: Decimal
    sgst_rate: Decimal
    igst_rate: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_gst: Decimal
    gross_invoice: Decimal
    is_inclusive: bool
    is_interstate: bool
    is_itc_eligible: bool = True
    blocked_reason: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "description": self.description,
            "taxable_base": str(self.taxable_base),
            "gst_rate": str(self.gst_rate),
            "cgst_amount": str(self.cgst_amount),
            "sgst_amount": str(self.sgst_amount),
            "igst_amount": str(self.igst_amount),
            "total_gst": str(self.total_gst),
            "gross_invoice": str(self.gross_invoice),
            "is_inclusive": self.is_inclusive,
            "is_interstate": self.is_interstate,
            "is_itc_eligible": self.is_itc_eligible,
            "blocked_reason": self.blocked_reason,
        }


def calculate_gst_breakdown(
    amount: Any,
    rate: Any,
    is_inclusive: bool = False,
    is_interstate: bool = False,
    description: str = "Supply Item",
    is_itc_eligible: bool = True,
    blocked_reason: str = "",
) -> GstItemBreakdown:
    """Calculate deterministic GST with exact tax-inclusive / exclusive formulas and head splits."""
    amt = money(amount)
    r = Decimal(str(rate))

    if is_inclusive:
        # Gross = amt, Base = Gross / (1 + r/100), GST = Gross - Base
        gross = amt
        divisor = Decimal("1") + (r / Decimal("100"))
        base = money(gross / divisor)
        total_gst = money(gross - base)
    else:
        # Base = amt, GST = Base * (r/100), Gross = Base + GST
        base = amt
        total_gst = money(base * (r / Decimal("100")))
        gross = money(base + total_gst)

    if is_interstate:
        cgst_rate = Decimal("0.00")
        sgst_rate = Decimal("0.00")
        igst_rate = r
        cgst_amt = Decimal("0.00")
        sgst_amt = Decimal("0.00")
        igst_amt = total_gst
    else:
        half_rate = r / Decimal("2")
        cgst_rate = half_rate
        sgst_rate = half_rate
        igst_rate = Decimal("0.00")
        half_gst = money(total_gst / Decimal("2"))
        cgst_amt = half_gst
        sgst_amt = money(total_gst - half_gst)  # Handles 1-paisa rounding reconciliation
        igst_amt = Decimal("0.00")

    return GstItemBreakdown(
        description=description,
        taxable_base=base,
        gst_rate=r,
        cgst_rate=cgst_rate,
        sgst_rate=sgst_rate,
        igst_rate=igst_rate,
        cgst_amount=cgst_amt,
        sgst_amount=sgst_amt,
        igst_amount=igst_amt,
        total_gst=total_gst,
        gross_invoice=gross,
        is_inclusive=is_inclusive,
        is_interstate=is_interstate,
        is_itc_eligible=is_itc_eligible,
        blocked_reason=blocked_reason,
    )


@dataclass
class Rule88ASetoffResult:
    # Output liabilities
    output_cgst: Decimal
    output_sgst: Decimal
    output_igst: Decimal
    total_output: Decimal

    # Available ITC inputs
    input_cgst: Decimal
    input_sgst: Decimal
    input_igst: Decimal
    total_itc_available: Decimal

    # Set-off utilization amounts
    igst_used_for_igst: Decimal = Decimal("0.00")
    igst_used_for_cgst: Decimal = Decimal("0.00")
    igst_used_for_sgst: Decimal = Decimal("0.00")

    cgst_used_for_cgst: Decimal = Decimal("0.00")
    cgst_used_for_igst: Decimal = Decimal("0.00")

    sgst_used_for_sgst: Decimal = Decimal("0.00")
    sgst_used_for_igst: Decimal = Decimal("0.00")

    # Net Cash to pay via PMT-06 challan
    cash_cgst: Decimal = Decimal("0.00")
    cash_sgst: Decimal = Decimal("0.00")
    cash_igst: Decimal = Decimal("0.00")
    total_cash_payable: Decimal = Decimal("0.00")

    # Closing ITC carried forward to next month
    closing_cgst_itc: Decimal = Decimal("0.00")
    closing_sgst_itc: Decimal = Decimal("0.00")
    closing_igst_itc: Decimal = Decimal("0.00")
    total_itc_carried_forward: Decimal = Decimal("0.00")

    def to_dict(self) -> dict[str, Any]:
        return {
            "output_cgst": str(self.output_cgst),
            "output_sgst": str(self.output_sgst),
            "output_igst": str(self.output_igst),
            "total_output": str(self.total_output),
            "input_cgst": str(self.input_cgst),
            "input_sgst": str(self.input_sgst),
            "input_igst": str(self.input_igst),
            "total_itc_available": str(self.total_itc_available),
            "cash_cgst": str(self.cash_cgst),
            "cash_sgst": str(self.cash_sgst),
            "cash_igst": str(self.cash_igst),
            "total_cash_payable": str(self.total_cash_payable),
            "closing_cgst_itc": str(self.closing_cgst_itc),
            "closing_sgst_itc": str(self.closing_sgst_itc),
            "closing_igst_itc": str(self.closing_igst_itc),
            "total_itc_carried_forward": str(self.total_itc_carried_forward),
            "statutory_rule": "Section 49, 49A, 49B & Rule 88A of CGST Rules — Prohibits CGST/SGST cross-utilization",
        }


def calculate_rule_88a_setoff(
    output_cgst: Any,
    output_sgst: Any,
    output_igst: Any,
    itc_cgst: Any,
    itc_sgst: Any,
    itc_igst: Any,
) -> Rule88ASetoffResult:
    """
    Statutory set-off under Section 49, 49A, 49B & Rule 88A of CGST Rules:
    1. IGST credit must be completely exhausted first against IGST, then CGST & SGST in any proportion.
    2. CGST credit is utilized against CGST, then IGST. (Never SGST).
    3. SGST credit is utilized against SGST, then IGST. (Never CGST).
    """
    o_cgst = money(output_cgst)
    o_sgst = money(output_sgst)
    o_igst = money(output_igst)

    rem_itc_igst = money(itc_igst)
    rem_itc_cgst = money(itc_cgst)
    rem_itc_sgst = money(itc_sgst)

    # Step 1: IGST Credit against IGST liability
    igst_for_igst = min(rem_itc_igst, o_igst)
    o_igst -= igst_for_igst
    rem_itc_igst -= igst_for_igst

    # Step 1b: Remaining IGST Credit against CGST and SGST (equally or as available)
    igst_for_cgst = min(rem_itc_igst, o_cgst)
    o_cgst -= igst_for_cgst
    rem_itc_igst -= igst_for_cgst

    igst_for_sgst = min(rem_itc_igst, o_sgst)
    o_sgst -= igst_for_sgst
    rem_itc_igst -= igst_for_sgst

    # Step 2: CGST Credit against remaining CGST liability, then IGST
    cgst_for_cgst = min(rem_itc_cgst, o_cgst)
    o_cgst -= cgst_for_cgst
    rem_itc_cgst -= cgst_for_cgst

    cgst_for_igst = min(rem_itc_cgst, o_igst)
    o_igst -= cgst_for_igst
    rem_itc_cgst -= cgst_for_igst

    # Step 3: SGST Credit against remaining SGST liability, then IGST
    sgst_for_sgst = min(rem_itc_sgst, o_sgst)
    o_sgst -= sgst_for_sgst
    rem_itc_sgst -= sgst_for_sgst

    sgst_for_igst = min(rem_itc_sgst, o_igst)
    o_igst -= sgst_for_igst
    rem_itc_sgst -= sgst_for_igst

    cash_cgst = money(o_cgst)
    cash_sgst = money(o_sgst)
    cash_igst = money(o_igst)
    total_cash = money(cash_cgst + cash_sgst + cash_igst)

    closing_cgst = money(rem_itc_cgst)
    closing_sgst = money(rem_itc_sgst)
    closing_igst = money(rem_itc_igst)
    total_carried_fwd = money(closing_cgst + closing_sgst + closing_igst)

    return Rule88ASetoffResult(
        output_cgst=money(output_cgst),
        output_sgst=money(output_sgst),
        output_igst=money(output_igst),
        total_output=money(Decimal(str(output_cgst)) + Decimal(str(output_sgst)) + Decimal(str(output_igst))),
        input_cgst=money(itc_cgst),
        input_sgst=money(itc_sgst),
        input_igst=money(itc_igst),
        total_itc_available=money(Decimal(str(itc_cgst)) + Decimal(str(itc_sgst)) + Decimal(str(itc_igst))),
        igst_used_for_igst=money(igst_for_igst),
        igst_used_for_cgst=money(igst_for_cgst),
        igst_used_for_sgst=money(igst_for_sgst),
        cgst_used_for_cgst=money(cgst_for_cgst),
        cgst_used_for_igst=money(cgst_for_igst),
        sgst_used_for_sgst=money(sgst_for_sgst),
        sgst_used_for_igst=money(sgst_for_igst),
        cash_cgst=cash_cgst,
        cash_sgst=cash_sgst,
        cash_igst=cash_igst,
        total_cash_payable=total_cash,
        closing_cgst_itc=closing_cgst,
        closing_sgst_itc=closing_sgst,
        closing_igst_itc=closing_igst,
        total_itc_carried_forward=total_carried_fwd,
    )


# ==============================================================================
# INCOME TAX & SALARY DETERMINISTIC ENGINE
# ==============================================================================

@dataclass
class RegimeResult:
    regime_name: str
    financial_year: str
    assessment_year: str
    gross_salary: Decimal
    standard_deduction: Decimal
    section_80c: Decimal
    section_80d: Decimal
    section_24b_home_loan: Decimal
    hra_exemption: Decimal
    total_deductions: Decimal
    taxable_income: Decimal
    slab_tax: Decimal
    section_87a_rebate: Decimal
    tax_after_rebate: Decimal
    surcharge: Decimal
    health_education_cess: Decimal
    total_annual_tax: Decimal
    monthly_tds_estimate: Decimal

    def to_dict(self) -> dict[str, Any]:
        return {
            "regime_name": self.regime_name,
            "financial_year": self.financial_year,
            "assessment_year": self.assessment_year,
            "gross_salary": str(self.gross_salary),
            "standard_deduction": str(self.standard_deduction),
            "section_80c": str(self.section_80c),
            "section_80d": str(self.section_80d),
            "section_24b_home_loan": str(self.section_24b_home_loan),
            "hra_exemption": str(self.hra_exemption),
            "total_deductions": str(self.total_deductions),
            "taxable_income": str(self.taxable_income),
            "slab_tax": str(self.slab_tax),
            "section_87a_rebate": str(self.section_87a_rebate),
            "tax_after_rebate": str(self.tax_after_rebate),
            "surcharge": str(self.surcharge),
            "health_education_cess": str(self.health_education_cess),
            "total_annual_tax": str(self.total_annual_tax),
            "monthly_tds_estimate": str(self.monthly_tds_estimate),
        }


def calculate_hra_exemption_deterministic(
    basic_salary: Any,
    hra_received: Any,
    rent_paid: Any,
    is_metro: bool = True,
) -> Decimal:
    """Calculate Section 10(13A) HRA exemption: minimum of 3 statutory conditions."""
    basic = money(basic_salary)
    hra = money(hra_received)
    rent = money(rent_paid)

    if basic <= 0 or hra <= 0 or rent <= 0:
        return Decimal("0.00")

    pct_basic = basic * (Decimal("0.50") if is_metro else Decimal("0.40"))
    rent_minus_10pct = max(Decimal("0.00"), rent - (basic * Decimal("0.10")))

    return money(min(hra, pct_basic, rent_minus_10pct))


def calculate_new_regime_tax(gross: Decimal, fy: str = "2024-25") -> RegimeResult:
    """
    Section 115BAC (New Tax Regime):
    Budget 2024 (AY 2025-26):
    - Standard deduction: ₹75,000 for salaried employees
    - Slabs:
      0 - 4L: Nil
      4L - 8L: 5%
      8L - 12L: 10%
      12L - 16L: 15%
      16L - 20L: 20%
      20L - 24L: 25%
      Above 24L: 30%
    - Rebate 87A: Full rebate if taxable income <= ₹12,00,000 (up to ₹25,000 tax free).
    """
    std_ded = Decimal("75000.00")
    taxable = max(Decimal("0.00"), gross - std_ded)

    slabs = [
        (Decimal("400000"), Decimal("0.00")),
        (Decimal("800000"), Decimal("0.05")),
        (Decimal("1200000"), Decimal("0.10")),
        (Decimal("1600000"), Decimal("0.15")),
        (Decimal("2000000"), Decimal("0.20")),
        (Decimal("2400000"), Decimal("0.25")),
        (Decimal("999999999999"), Decimal("0.30")),
    ]

    lower = Decimal("0.00")
    slab_tax = Decimal("0.00")
    for upper, rate in slabs:
        if taxable > lower:
            chunk = min(taxable, upper) - lower
            slab_tax += chunk * rate
        lower = upper
        if taxable <= upper:
            break

    slab_tax = money(slab_tax)

    # 87A Rebate for New Regime: up to ₹12,00,000 with Budget 2024 revisions
    rebate = Decimal("0.00")
    if taxable <= Decimal("1200000.00"):
        rebate = slab_tax

    tax_after_rebate = max(Decimal("0.00"), slab_tax - rebate)

    # Surcharge (if taxable > ₹50L)
    surcharge = Decimal("0.00")
    if taxable > Decimal("5000000.00") and taxable <= Decimal("10000000.00"):
        surcharge = money(tax_after_rebate * Decimal("0.10"))
    elif taxable > Decimal("10000000.00") and taxable <= Decimal("20000000.00"):
        surcharge = money(tax_after_rebate * Decimal("0.15"))
    elif taxable > Decimal("20000000.00"):
        surcharge = money(tax_after_rebate * Decimal("0.25"))

    cess = money((tax_after_rebate + surcharge) * Decimal("0.04"))
    total_tax = money(tax_after_rebate + surcharge + cess)
    monthly_tds = money(total_tax / Decimal("12"))

    return RegimeResult(
        regime_name="New Regime (Section 115BAC - Default)",
        financial_year="FY 2024-25",
        assessment_year="AY 2025-26",
        gross_salary=gross,
        standard_deduction=std_ded,
        section_80c=Decimal("0.00"),
        section_80d=Decimal("0.00"),
        section_24b_home_loan=Decimal("0.00"),
        hra_exemption=Decimal("0.00"),
        total_deductions=std_ded,
        taxable_income=taxable,
        slab_tax=slab_tax,
        section_87a_rebate=rebate,
        tax_after_rebate=tax_after_rebate,
        surcharge=surcharge,
        health_education_cess=cess,
        total_annual_tax=total_tax,
        monthly_tds_estimate=monthly_tds,
    )


def calculate_old_regime_tax(
    gross: Decimal,
    sec_80c: Any = 0,
    sec_80d: Any = 0,
    sec_24b: Any = 0,
    hra_exempt: Any = 0,
    fy: str = "2024-25",
) -> RegimeResult:
    """
    Old Tax Regime:
    - Standard deduction: ₹50,000
    - Section 80C capped at ₹1,50,000
    - Section 80D capped at ₹25,000 (regular) or ₹50,000 (senior)
    - Section 24(b) Home loan interest capped at ₹2,00,000 for self-occupied
    - Slabs:
      0 - 2.5L: Nil
      2.5L - 5L: 5%
      5L - 10L: 20%
      Above 10L: 30%
    - Rebate 87A: If taxable income <= ₹5,00,000 (rebate up to ₹12,500).
    """
    std_ded = Decimal("50000.00")
    c_80c = min(money(sec_80c), Decimal("150000.00"))
    c_80d = min(money(sec_80d), Decimal("50000.00"))
    c_24b = min(money(sec_24b), Decimal("200000.00"))
    c_hra = money(hra_exempt)

    total_ded = std_ded + c_80c + c_80d + c_24b + c_hra
    taxable = max(Decimal("0.00"), gross - total_ded)

    slabs = [
        (Decimal("250000"), Decimal("0.00")),
        (Decimal("500000"), Decimal("0.05")),
        (Decimal("1000000"), Decimal("0.20")),
        (Decimal("999999999999"), Decimal("0.30")),
    ]

    lower = Decimal("0.00")
    slab_tax = Decimal("0.00")
    for upper, rate in slabs:
        if taxable > lower:
            chunk = min(taxable, upper) - lower
            slab_tax += chunk * rate
        lower = upper
        if taxable <= upper:
            break

    slab_tax = money(slab_tax)

    rebate = Decimal("0.00")
    if taxable <= Decimal("500000.00"):
        rebate = slab_tax

    tax_after_rebate = max(Decimal("0.00"), slab_tax - rebate)

    surcharge = Decimal("0.00")
    if taxable > Decimal("5000000.00") and taxable <= Decimal("10000000.00"):
        surcharge = money(tax_after_rebate * Decimal("0.10"))
    elif taxable > Decimal("10000000.00"):
        surcharge = money(tax_after_rebate * Decimal("0.15"))

    cess = money((tax_after_rebate + surcharge) * Decimal("0.04"))
    total_tax = money(tax_after_rebate + surcharge + cess)
    monthly_tds = money(total_tax / Decimal("12"))

    return RegimeResult(
        regime_name="Old Regime (With Exemptions & Deductions)",
        financial_year="FY 2024-25",
        assessment_year="AY 2025-26",
        gross_salary=gross,
        standard_deduction=std_ded,
        section_80c=c_80c,
        section_80d=c_80d,
        section_24b_home_loan=c_24b,
        hra_exemption=c_hra,
        total_deductions=total_ded,
        taxable_income=taxable,
        slab_tax=slab_tax,
        section_87a_rebate=rebate,
        tax_after_rebate=tax_after_rebate,
        surcharge=surcharge,
        health_education_cess=cess,
        total_annual_tax=total_tax,
        monthly_tds_estimate=monthly_tds,
    )


def compare_tax_regimes(
    gross_salary: Any,
    sec_80c: Any = 0,
    sec_80d: Any = 0,
    sec_24b: Any = 0,
    basic_salary: Any = 0,
    hra_received: Any = 0,
    rent_paid: Any = 0,
    is_metro: bool = True,
    fy: str = "2024-25",
) -> dict[str, Any]:
    """Deterministically calculate both New and Old tax regimes and recommend the optimal one."""
    gross = money(gross_salary)
    hra_exempt = calculate_hra_exemption_deterministic(basic_salary, hra_received, rent_paid, is_metro)

    new_res = calculate_new_regime_tax(gross, fy=fy)
    old_res = calculate_old_regime_tax(
        gross, sec_80c=sec_80c, sec_80d=sec_80d, sec_24b=sec_24b, hra_exempt=hra_exempt, fy=fy
    )

    diff = old_res.total_annual_tax - new_res.total_annual_tax
    if diff > 0:
        recommendation = f"New Regime saves ₹{diff:,.2f} annually"
        optimal_regime = "NEW"
        tax_saved = diff
    elif diff < 0:
        recommendation = f"Old Regime saves ₹{abs(diff):,.2f} annually"
        optimal_regime = "OLD"
        tax_saved = abs(diff)
    else:
        recommendation = "Both regimes yield identical tax"
        optimal_regime = "EQUAL"
        tax_saved = Decimal("0.00")

    return {
        "new_regime": new_res.to_dict(),
        "old_regime": old_res.to_dict(),
        "recommendation": recommendation,
        "optimal_regime": optimal_regime,
        "tax_saved": str(tax_saved),
        "hra_exempt_amount": str(hra_exempt),
    }
