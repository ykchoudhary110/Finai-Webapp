"""Ambiguity & Missing Information Detector for Indian Taxation.

Identifies missing statutory parameters (e.g. Garment per-piece threshold under Notif 15/2021,
place of supply, HRA rent receipts) and generates deterministic scenario branches.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any
from finai.deterministic_math import calculate_gst_breakdown, calculate_rule_88a_setoff


def detect_gst_ambiguities_and_branch(facts: dict[str, Any]) -> dict[str, Any]:
    """
    Check for missing facts in GST transactions and produce explicit Scenario branches.
    Never silently assumes a single low tax rate!
    """
    inward = facts.get("inward_supplies", [])
    outward = facts.get("outward_supplies", [])
    is_interstate = facts.get("is_interstate", False)
    is_inclusive = facts.get("is_inclusive", False)

    scenarios = []
    missing_info = []
    statutory_cautions = []

    # 1. Capital Goods Section 16(3) Check
    for item in inward:
        if item.get("is_capital_goods"):
            statutory_cautions.append(
                "Section 16(3) CGST Act Restriction: If Input Tax Credit (ITC) is claimed on this machinery, "
                "you CANNOT claim depreciation on the tax component under Section 32 of the Income Tax Act."
            )

    # 2. Garments Rate Ambiguity (CBIC Notification No. 15/2021-Central Tax Rate)
    has_garments = any(item.get("is_garments") for item in outward)
    
    if has_garments and inward and outward:
        # User has machine purchase + garment sale
        mach = inward[0]
        garm = outward[0]
        
        mach_gst = calculate_gst_breakdown(
            amount=mach["taxable_value"],
            rate=mach["gst_rate"],
            is_inclusive=mach["is_inclusive"],
            is_interstate=mach["is_interstate"],
            description=mach["description"],
            is_itc_eligible=True,
        )

        missing_info.append(
            "Per-piece sale value of garments not specified. Under CBIC Notification No. 15/2021, "
            "garments ≤ ₹1,000/pc attract 5% GST, while garments > ₹1,000/pc attract 12% GST."
        )

        # SCENARIO A: 5% Rate (Per-piece value <= ₹1,000)
        garm_5 = calculate_gst_breakdown(
            amount=garm["taxable_value"],
            rate=Decimal("5.00"),
            is_inclusive=garm["is_inclusive"],
            is_interstate=garm["is_interstate"],
            description="Garments (≤ ₹1,000/pc @ 5% GST)",
        )
        setoff_a = calculate_rule_88a_setoff(
            output_cgst=garm_5.cgst_amount,
            output_sgst=garm_5.sgst_amount,
            output_igst=garm_5.igst_amount,
            itc_cgst=mach_gst.cgst_amount,
            itc_sgst=mach_gst.sgst_amount,
            itc_igst=mach_gst.igst_amount,
        )

        scenarios.append({
            "scenario_name": "Scenario A: Garment Value ≤ ₹1,000 per piece (5% GST)",
            "condition": "Applicable if readymade clothes are sold at or below ₹1,000 per unit piece",
            "statutory_notification": "Notification No. 15/2021-Central Tax (Rate)",
            "inward_breakdown": mach_gst.to_dict(),
            "outward_breakdown": garm_5.to_dict(),
            "setoff_result": setoff_a.to_dict(),
        })

        # SCENARIO B: 12% Rate (Per-piece value > ₹1,000)
        garm_12 = calculate_gst_breakdown(
            amount=garm["taxable_value"],
            rate=Decimal("12.00"),
            is_inclusive=garm["is_inclusive"],
            is_interstate=garm["is_interstate"],
            description="Garments (> ₹1,000/pc @ 12% GST)",
        )
        setoff_b = calculate_rule_88a_setoff(
            output_cgst=garm_12.cgst_amount,
            output_sgst=garm_12.sgst_amount,
            output_igst=garm_12.igst_amount,
            itc_cgst=mach_gst.cgst_amount,
            itc_sgst=mach_gst.sgst_amount,
            itc_igst=mach_gst.igst_amount,
        )

        scenarios.append({
            "scenario_name": "Scenario B: Garment Value > ₹1,000 per piece (12% GST)",
            "condition": "Applicable if readymade garments are sold above ₹1,000 per unit piece",
            "statutory_notification": "Notification No. 15/2021-Central Tax (Rate)",
            "inward_breakdown": mach_gst.to_dict(),
            "outward_breakdown": garm_12.to_dict(),
            "setoff_result": setoff_b.to_dict(),
        })

    elif inward and outward:
        # Generic purchase + sale with stated rates
        mach = inward[0]
        sale = outward[0]
        
        inward_gst = calculate_gst_breakdown(
            amount=mach["taxable_value"],
            rate=mach["gst_rate"],
            is_inclusive=mach["is_inclusive"],
            is_interstate=mach["is_interstate"],
            description=mach["description"],
            is_itc_eligible=True,
        )
        out_rate = sale.get("gst_rate_specified") or Decimal("18.00")
        outward_gst = calculate_gst_breakdown(
            amount=sale["taxable_value"],
            rate=out_rate,
            is_inclusive=sale["is_inclusive"],
            is_interstate=sale["is_interstate"],
            description=sale["description"],
        )
        setoff = calculate_rule_88a_setoff(
            output_cgst=outward_gst.cgst_amount,
            output_sgst=outward_gst.sgst_amount,
            output_igst=outward_gst.igst_amount,
            itc_cgst=inward_gst.cgst_amount,
            itc_sgst=inward_gst.sgst_amount,
            itc_igst=inward_gst.igst_amount,
        )
        scenarios.append({
            "scenario_name": "Standard Commercial Set-Off",
            "condition": "Calculated based on extracted transaction values",
            "statutory_notification": "CGST Act Sections 16, 49 & Rule 88A",
            "inward_breakdown": inward_gst.to_dict(),
            "outward_breakdown": outward_gst.to_dict(),
            "setoff_result": setoff.to_dict(),
        })

    elif inward and not outward:
        # Standalone inward purchase
        mach = inward[0]
        inward_gst = calculate_gst_breakdown(
            amount=mach["taxable_value"],
            rate=mach["gst_rate"],
            is_inclusive=mach["is_inclusive"],
            is_interstate=mach["is_interstate"],
            description=mach["description"],
            is_itc_eligible=True,
        )
        scenarios.append({
            "scenario_name": "Inward Purchase Tax & ITC Eligibility",
            "condition": "Capital goods / Business asset purchase",
            "statutory_notification": "CGST Act Section 16",
            "inward_breakdown": inward_gst.to_dict(),
            "outward_breakdown": None,
            "setoff_result": None,
        })

    return {
        "scenarios": scenarios,
        "missing_info": missing_info,
        "statutory_cautions": statutory_cautions,
    }
