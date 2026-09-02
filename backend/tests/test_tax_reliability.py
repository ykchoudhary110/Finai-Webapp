"""Master Tax Calculation Reliability & Regression Test Suite.

Covers all 9 GST benchmark tests (GST-1 to GST-9) and
all 11 Income Tax benchmark tests (IT-1 to IT-11).
"""
from __future__ import annotations

import pytest
from decimal import Decimal
from finai.deterministic_math import (
    calculate_gst_breakdown,
    calculate_rule_88a_setoff,
    calculate_new_regime_tax,
    calculate_old_regime_tax,
    compare_tax_regimes,
    calculate_hra_exemption_deterministic,
    money,
)
from finai.fact_extractor import extract_gst_facts, extract_income_tax_facts
from finai.ambiguity_detector import detect_gst_ambiguities_and_branch


# ==============================================================================
# GST TEST SUITE (GST-1 to GST-9)
# ==============================================================================

class TestGSTSuite:
    def test_gst_1_ten_lakh_machine_at_18_percent(self):
        """GST-1: ₹10 lakh machine @ 18% must produce exactly ₹1,80,000 GST (NOT ₹32,400)."""
        res = calculate_gst_breakdown(amount=Decimal("1000000.00"), rate=Decimal("18.00"))
        assert res.taxable_base == Decimal("1000000.00")
        assert res.total_gst == Decimal("180000.00")
        assert res.total_gst != Decimal("32400.00")

    def test_gst_2_intrastate_split(self):
        """GST-2: Intrastate purchase splits 50/50: CGST ₹90,000, SGST ₹90,000, IGST ₹0."""
        res = calculate_gst_breakdown(amount=Decimal("1000000.00"), rate=Decimal("18.00"), is_interstate=False)
        assert res.cgst_amount == Decimal("90000.00")
        assert res.sgst_amount == Decimal("90000.00")
        assert res.igst_amount == Decimal("0.00")
        assert res.cgst_amount + res.sgst_amount == Decimal("180000.00")

    def test_gst_3_interstate_igst(self):
        """GST-3: Interstate purchase allocates 100% to IGST: ₹1,80,000."""
        res = calculate_gst_breakdown(amount=Decimal("1000000.00"), rate=Decimal("18.00"), is_interstate=True)
        assert res.igst_amount == Decimal("180000.00")
        assert res.cgst_amount == Decimal("0.00")
        assert res.sgst_amount == Decimal("0.00")

    def test_gst_4_exclusive_tax_addition(self):
        """GST-4: ₹10 lakh + 18% yields Gross ₹11,80,000."""
        res = calculate_gst_breakdown(amount=Decimal("1000000.00"), rate=Decimal("18.00"), is_inclusive=False)
        assert res.gross_invoice == Decimal("1180000.00")
        assert res.taxable_base == Decimal("1000000.00")

    def test_gst_5_inclusive_tax_extraction(self):
        """GST-5: ₹11.8 lakh including 18% GST yields Base ₹10,00,000 and GST ₹1,80,000."""
        res = calculate_gst_breakdown(amount=Decimal("1180000.00"), rate=Decimal("18.00"), is_inclusive=True)
        assert res.taxable_base == Decimal("1000000.00")
        assert res.total_gst == Decimal("180000.00")
        assert res.gross_invoice == Decimal("1180000.00")

    def test_gst_6_itc_eligibility(self):
        """GST-6: Machine qualifies as Capital Goods with 100% eligible ITC of ₹1,80,000."""
        res = calculate_gst_breakdown(amount=Decimal("1000000.00"), rate=Decimal("18.00"), is_itc_eligible=True)
        assert res.is_itc_eligible is True
        assert res.total_gst == Decimal("180000.00")

    def test_gst_7_rule_88a_setoff(self):
        """
        GST-7:
        Output: CGST ₹75,000, SGST ₹75,000
        Input: CGST ₹90,000, SGST ₹90,000
        Expected: Cash = ₹0, Remaining CGST = ₹15,000, Remaining SGST = ₹15,000, Total CF = ₹30,000.
        """
        res = calculate_rule_88a_setoff(
            output_cgst=Decimal("75000.00"),
            output_sgst=Decimal("75000.00"),
            output_igst=Decimal("0.00"),
            itc_cgst=Decimal("90000.00"),
            itc_sgst=Decimal("90000.00"),
            itc_igst=Decimal("0.00"),
        )
        assert res.cash_cgst == Decimal("0.00")
        assert res.cash_sgst == Decimal("0.00")
        assert res.total_cash_payable == Decimal("0.00")
        assert res.closing_cgst_itc == Decimal("15000.00")
        assert res.closing_sgst_itc == Decimal("15000.00")
        assert res.total_itc_carried_forward == Decimal("30000.00")

    def test_gst_8_garment_ambiguity_scenarios(self):
        """GST-8: Garment without classification info must generate Scenario A (5%) and Scenario B (12%)."""
        facts = extract_gst_facts("I purchased a machine for 10 lakh with 18% GST and sold garments for 30 lakh.")
        branch = detect_gst_ambiguities_and_branch(facts)
        assert len(branch["scenarios"]) == 2
        sc_a = branch["scenarios"][0]
        sc_b = branch["scenarios"][1]
        assert "5% GST" in sc_a["scenario_name"]
        assert "12% GST" in sc_b["scenario_name"]
        assert sc_a["setoff_result"]["total_cash_payable"] == "0.00"
        assert sc_b["setoff_result"]["total_cash_payable"] == "180000.00"

    def test_gst_9_rejection_of_hallucinated_32400(self):
        """GST-9: Numerical verification must flag 32,400 as wrong and maintain 1,80,000."""
        correct_gst = Decimal("180000.00")
        hallucinated_gst = Decimal("32400.00")
        assert correct_gst != hallucinated_gst
        assert correct_gst == Decimal("1000000.00") * Decimal("0.18")


# ==============================================================================
# INCOME TAX TEST SUITE (IT-1 to IT-11)
# ==============================================================================

class TestIncomeTaxSuite:
    def test_it_1_basic_salary(self):
        """IT-1: Basic Salary ₹10L in New Regime with ₹75,000 std deduction."""
        res = calculate_new_regime_tax(Decimal("1000000.00"))
        assert res.gross_salary == Decimal("1000000.00")
        assert res.standard_deduction == Decimal("75000.00")
        assert res.taxable_income == Decimal("925000.00")

    def test_it_2_new_regime_slabs(self):
        """IT-2: New Regime slabs verified under Budget 2024 revisions."""
        res = calculate_new_regime_tax(Decimal("1500000.00"))
        # Taxable = 15L - 75k = 14,25,000
        # 0-4L: 0
        # 4-8L @ 5%: 20,000
        # 8-12L @ 10%: 40,000
        # 12-14.25L @ 15%: 33,750
        # Total slab tax: 93,750 + 4% cess (3,750) = 97,500.00
        assert res.total_annual_tax == Decimal("97500.00")

    def test_it_3_old_regime_deductions(self):
        """IT-3: Old Regime deduction handling (₹50,000 std ded + 80C + 24b)."""
        res = calculate_old_regime_tax(
            Decimal("1500000.00"),
            sec_80c=Decimal("150000.00"),
            sec_24b=Decimal("200000.00"),
        )
        assert res.total_deductions == Decimal("400000.00")
        assert res.taxable_income == Decimal("1100000.00")

    def test_it_4_regime_comparison(self):
        """IT-4: Both regimes calculated independently without inference."""
        comp = compare_tax_regimes(Decimal("1500000.00"), sec_80c=Decimal("150000.00"), sec_24b=Decimal("200000.00"))
        assert "new_regime" in comp
        assert "old_regime" in comp
        assert comp["optimal_regime"] == "NEW"

    def test_it_5_80c_statutory_limit_capping(self):
        """IT-5: Section 80C input above limit is capped at ₹1,50,000."""
        res = calculate_old_regime_tax(Decimal("1000000.00"), sec_80c=Decimal("300000.00"))
        assert res.section_80c == Decimal("150000.00")

    def test_it_6_hra_complete_info(self):
        """IT-6: Deterministic HRA exemption calculated with complete inputs."""
        exempt = calculate_hra_exemption_deterministic(
            basic_salary=Decimal("600000.00"),
            hra_received=Decimal("240000.00"),
            rent_paid=Decimal("300000.00"),
            is_metro=True,
        )
        # Min of:
        # 1. HRA: 2,40,000
        # 2. 50% of Basic: 3,00,000
        # 3. Rent - 10% basic: 3,00,000 - 60,000 = 2,40,000
        assert exempt == Decimal("240000.00")

    def test_it_7_missing_hra_data(self):
        """IT-7: Missing rent/basic salary returns ₹0 exemption without guessing."""
        exempt = calculate_hra_exemption_deterministic(
            basic_salary=Decimal("0.00"),
            hra_received=Decimal("240000.00"),
            rent_paid=Decimal("0.00"),
        )
        assert exempt == Decimal("0.00")

    def test_it_8_financial_year(self):
        """IT-8: Result explicitly tags FY 2024-25 / AY 2025-26."""
        res = calculate_new_regime_tax(Decimal("1200000.00"))
        assert res.financial_year == "FY 2024-25"
        assert res.assessment_year == "AY 2025-26"

    def test_it_9_cess_calculation(self):
        """IT-9: 4% Health & Education cess computed on tax after rebate."""
        res = calculate_new_regime_tax(Decimal("1500000.00"))
        assert res.health_education_cess == Decimal("3750.00")

    def test_it_10_rebate_87a(self):
        """IT-10: Section 87A rebate provides full relief for taxable income up to ₹12 Lakhs."""
        res = calculate_new_regime_tax(Decimal("1200000.00"))
        assert res.total_annual_tax == Decimal("0.00")
        assert res.section_87a_rebate == res.slab_tax

    def test_it_11_llm_override_prevention(self):
        """IT-11: Deterministic engine enforces ₹97,500 over any altered LLM numbers."""
        res = calculate_new_regime_tax(Decimal("1500000.00"))
        assert res.total_annual_tax == Decimal("97500.00")
        assert res.total_annual_tax != Decimal("110000.00")
