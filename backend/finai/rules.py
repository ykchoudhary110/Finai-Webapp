from __future__ import annotations
from decimal import Decimal, ROUND_HALF_UP


def money(value: float | Decimal) -> float:
    """Return rounded float with 2 decimal places using Decimal(ROUND_HALF_UP)."""
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def gst(base_amount: float, rate: float, interstate: bool = False) -> dict:
    """Deterministic forward GST calculation."""
    base = money(base_amount)
    gst_amount = money(Decimal(str(base)) * Decimal(str(rate)) / Decimal("100"))
    if interstate:
        cgst = 0.0
        sgst = 0.0
        igst = gst_amount
    else:
        half = money(Decimal(str(gst_amount)) / Decimal("2"))
        cgst = half
        sgst = half
        igst = 0.0
    return {
        "taxable_value": base,
        "rate": float(rate),
        "gst_amount": gst_amount,
        "cgst": cgst,
        "sgst": sgst,
        "igst": igst,
        "invoice_total": money(Decimal(str(base)) + Decimal(str(gst_amount))),
        "treatment": "IGST (Interstate)" if interstate else "CGST + SGST (Intrastate)",
    }


def _slab_tax(income: float, slabs: list[tuple[float, float]]) -> float:
    """Calculate bracketed progressive tax across slabs."""
    inc = Decimal(str(income))
    lower = Decimal("0")
    total = Decimal("0")
    for upper, rate in slabs:
        upper_d = Decimal(str(upper)) if upper != float("inf") else Decimal("999999999999")
        if inc > lower:
            taxable_chunk = min(inc, upper_d) - lower
            total += taxable_chunk * Decimal(str(rate))
        lower = upper_d
        if inc <= upper_d:
            break
    return money(total)


def income_tax(gross: float, regime: str = "new", deductions: float = 0, hra: float = 0, home_loan: float = 0) -> dict:
    """
    Calculate Indian Income Tax under Budget 2024/25 revised frameworks.
    - New Regime (Sec 115BAC): Standard deduction ₹75,000, 87A rebate up to ₹12 Lakhs taxable.
    - Old Regime: Standard deduction ₹50,000 + Ch VI-A (up to 3L) + HRA + Home loan (up to 2L), 87A rebate up to ₹5 Lakhs.
    - 4% Health & Education Cess on net tax.
    """
    reg = str(regime).lower().strip()
    gross_dec = Decimal(str(gross))
    if reg == "new":
        std_ded = Decimal("75000")
        deductions_allowed = std_ded
        taxable_dec = max(Decimal("0"), gross_dec - deductions_allowed)
        slabs = [
            (400000, 0.0),
            (800000, 0.05),
            (1200000, 0.10),
            (1600000, 0.15),
            (2000000, 0.20),
            (2400000, 0.25),
            (float("inf"), 0.30),
        ]
        slab_tax = _slab_tax(float(taxable_dec), slabs)
        rebate_limit = 1200000.0
        rebate = slab_tax if float(taxable_dec) <= rebate_limit else 0.0
    else:
        std_ded = Decimal("50000")
        ch_via = min(Decimal(str(deductions)), Decimal("300000"))
        hra_dec = max(Decimal("0"), Decimal(str(hra)))
        hl_dec = min(Decimal(str(home_loan)), Decimal("200000"))
        deductions_allowed = std_ded + ch_via + hra_dec + hl_dec
        taxable_dec = max(Decimal("0"), gross_dec - deductions_allowed)
        slabs = [
            (250000, 0.0),
            (500000, 0.05),
            (1000000, 0.20),
            (float("inf"), 0.30),
        ]
        slab_tax = _slab_tax(float(taxable_dec), slabs)
        rebate_limit = 500000.0
        rebate = slab_tax if float(taxable_dec) <= rebate_limit else 0.0

    tax_after_rebate = max(0.0, slab_tax - rebate)
    cess = money(Decimal(str(tax_after_rebate)) * Decimal("0.04"))
    total_tax = money(Decimal(str(tax_after_rebate)) + Decimal(str(cess)))

    return {
        "regime": "New (Sec 115BAC)" if reg == "new" else "Old Regime",
        "gross_income": money(gross),
        "deductions_allowed": money(deductions_allowed),
        "taxable_income": money(taxable_dec),
        "slab_tax": slab_tax,
        "rebate": rebate,
        "cess": cess,
        "total_tax": total_tax,
    }


def capital_gains(stcg_equity: float = 0, ltcg_equity: float = 0, ltcg_property: float = 0) -> dict:
    """Budget 2024/25 Capital Gains Tax engine (Effective 23 July 2024)."""
    stcg_tax = money(Decimal(str(stcg_equity)) * Decimal("0.20"))
    ltcg_eq = max(Decimal("0"), Decimal(str(ltcg_equity)))
    exemption = min(ltcg_eq, Decimal("125000"))
    taxable_ltcg_equity = ltcg_eq - exemption
    ltcg_equity_tax = money(taxable_ltcg_equity * Decimal("0.125"))
    ltcg_prop_tax = money(Decimal(str(ltcg_property)) * Decimal("0.125"))

    total_base = money(Decimal(str(stcg_tax)) + Decimal(str(ltcg_equity_tax)) + Decimal(str(ltcg_prop_tax)))
    cess = money(Decimal(str(total_base)) * Decimal("0.04"))
    total_tax = money(Decimal(str(total_base)) + Decimal(str(cess)))

    return {
        "stcg_tax": stcg_tax,
        "ltcg_equity_exemption": money(exemption),
        "taxable_ltcg_equity": money(taxable_ltcg_equity),
        "ltcg_equity_tax": ltcg_equity_tax,
        "ltcg_property_tax": ltcg_prop_tax,
        "total_before_cess": total_base,
        "cess": cess,
        "total_capital_gains_tax": total_tax,
    }


def emi(principal: float, annual_rate: float, tenure_months: int) -> dict:
    """Standard reducing-balance loan amortization."""
    P = Decimal(str(principal))
    r = Decimal(str(annual_rate)) / Decimal("12") / Decimal("100")
    n = Decimal(str(tenure_months))
    if r == 0:
        monthly_emi = P / n if n > 0 else Decimal("0")
    else:
        monthly_emi = P * r * ((Decimal("1") + r) ** n) / (((Decimal("1") + r) ** n) - Decimal("1"))
    total_payment = monthly_emi * n
    total_interest = total_payment - P
    return {
        "principal": money(principal),
        "annual_rate": float(annual_rate),
        "tenure_months": int(tenure_months),
        "monthly_emi": money(monthly_emi),
        "total_interest": money(total_interest),
        "total_payment": money(total_payment),
    }


def hra_exemption(basic_salary: float, hra_received: float, rent_paid: float, is_metro: bool = True) -> dict:
    """Section 10(13A) HRA exemption: minimum of 3 statutory tests."""
    actual = Decimal(str(hra_received))
    percent_basic = Decimal(str(basic_salary)) * (Decimal("0.5") if is_metro else Decimal("0.4"))
    rent_minus = max(Decimal("0"), Decimal(str(rent_paid)) - (Decimal(str(basic_salary)) * Decimal("0.1")))
    exempt = min(actual, percent_basic, rent_minus)
    taxable = max(Decimal("0"), actual - exempt)
    return {
        "actual_hra": money(actual),
        "percent_of_basic": money(percent_basic),
        "rent_minus_10pct": money(rent_minus),
        "exempt_hra": money(exempt),
        "taxable_hra": money(taxable),
    }


def presumptive_44ada(gross_receipts: float) -> dict:
    """Section 44ADA for specified professionals (50% deemed profit, limit ₹75 Lakhs)."""
    gross = Decimal(str(gross_receipts))
    profit = gross * Decimal("0.5")
    return {
        "gross_receipts": money(gross),
        "presumptive_rate": 50.0,
        "taxable_profit": money(profit),
        "eligible": float(gross) <= 7500000.0,
        "audit_required": float(gross) > 7500000.0,
    }


def presumptive_44ad(digital_turnover: float, cash_turnover: float) -> dict:
    """Section 44AD for small businesses (6% digital, 8% cash, limit ₹3 Crore)."""
    dig = Decimal(str(digital_turnover))
    csh = Decimal(str(cash_turnover))
    dp = dig * Decimal("0.06")
    cp = csh * Decimal("0.08")
    total_to = dig + csh
    return {
        "digital_turnover": money(dig),
        "cash_turnover": money(csh),
        "total_turnover": money(total_to),
        "digital_profit": money(dp),
        "cash_profit": money(cp),
        "total_profit": money(dp + cp),
        "eligible": float(total_to) <= 30000000.0,
    }


def blocked_credit_17_5(category: str) -> dict:
    """Detect CGST Act Section 17(5) blocked ITC categories."""
    cat = category.lower()
    if any(k in cat for k in ("motor vehicle", "car", "suv", "automobile", "passenger vehicle")):
        return {
            "is_blocked": True,
            "section": "17(5)(a)",
            "reason": "Motor vehicles for seating up to 13 persons — ITC blocked unless used for transportation of passengers or driving tuition",
        }
    if any(k in cat for k in ("food", "catering", "restaurant", "dinner", "lunch", "beverages")):
        return {
            "is_blocked": True,
            "section": "17(5)(b)(i)",
            "reason": "Food, beverages, outdoor catering, and club memberships — ITC explicitly blocked",
        }
    if any(k in cat for k in ("health", "fitness", "gym", "club")):
        return {
            "is_blocked": True,
            "section": "17(5)(b)(ii)",
            "reason": "Health club and fitness center memberships — ITC blocked",
        }
    if any(k in cat for k in ("rent-a-cab", "cab", "flight", "air ticket", "travel")):
        return {
            "is_blocked": True,
            "section": "17(5)(b)(iii)",
            "reason": "Rent-a-cab and travel benefits extended to employees — ITC blocked",
        }
    if any(k in cat for k in ("gift", "free sample", "giveaway")):
        return {
            "is_blocked": True,
            "section": "17(5)(h)",
            "reason": "Goods lost, stolen, destroyed, written off, or disposed of as gifts/free samples — ITC blocked",
        }
    return {
        "is_blocked": False,
        "section": "Section 16",
        "reason": "Input tax credit eligible subject to general Section 16 conditions and GSTR-2B reflection",
    }


def rule_86b_check(monthly_output_tax: float, monthly_cash_paid: float) -> dict:
    """Rule 86B check: Businesses with monthly taxable supplies > ₹50L must pay >= 1% output tax in cash."""
    output = Decimal(str(monthly_output_tax))
    cash = Decimal(str(monthly_cash_paid))
    min_cash = output * Decimal("0.01")
    return {
        "minimum_cash_required": money(min_cash),
        "cash_paid": money(cash),
        "compliant": cash >= min_cash,
        "rule": "Rule 86B of CGST Rules — mandatory 1% cash discharge on high-turnover accounts",
    }
