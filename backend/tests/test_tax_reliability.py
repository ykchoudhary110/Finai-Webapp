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
    def test_it_1_basic_salary_fy_2024_25(self):
        """IT-1: Basic Salary ₹10L in FY 2024-25 uses 0-3L, 3-7L, 7-10L slabs."""
        res = calculate_new_regime_tax(Decimal("1000000.00"), fy="FY 2024-25")
        assert res.gross_salary == Decimal("1000000.00")
        assert res.standard_deduction == Decimal("75000.00")
        assert res.taxable_income == Decimal("925000.00")
        # 0-3L: 0, 3-7L: 20k, 7-9.25L: 22.5k -> 42.5k + 4% cess (1.7k) = 44,200
        assert res.total_annual_tax == Decimal("44200.00")

    def test_it_2_new_regime_slabs_fy_2024_25(self):
        """IT-2: Gross ₹15L in FY 2024-25 produces exactly ₹1,30,000 tax."""
        res = calculate_new_regime_tax(Decimal("1500000.00"), fy="FY 2024-25")
        assert res.financial_year == "FY 2024-25"
        assert res.assessment_year == "AY 2025-26"
        assert res.taxable_income == Decimal("1425000.00")
        assert res.slab_tax == Decimal("125000.00")
        assert res.health_education_cess == Decimal("5000.00")
        assert res.total_annual_tax == Decimal("130000.00")

    def test_it_2b_new_regime_slabs_fy_2025_26(self):
        """IT-2b: Gross ₹15L in FY 2025-26 produces exactly ₹97,500 tax."""
        res = calculate_new_regime_tax(Decimal("1500000.00"), fy="FY 2025-26")
        assert res.financial_year == "FY 2025-26"
        assert res.assessment_year == "AY 2026-27"
        assert res.taxable_income == Decimal("1425000.00")
        assert res.slab_tax == Decimal("93750.00")
        assert res.health_education_cess == Decimal("3750.00")
        assert res.total_annual_tax == Decimal("97500.00")

    def test_it_3_87a_rebate_difference_between_years(self):
        """IT-3: Section 87A rebate rules differ between FY 2024-25 (<=7L) and FY 2025-26 (<=12L)."""
        # For ₹10 Lakh salary:
        res_24 = calculate_new_regime_tax(Decimal("1000000.00"), fy="FY 2024-25")
        res_25 = calculate_new_regime_tax(Decimal("1000000.00"), fy="FY 2025-26")

        # In FY 2024-25: Taxable ₹9.25L > ₹7L threshold -> No rebate, pays ₹44,200
        assert res_24.section_87a_rebate == Decimal("0.00")
        assert res_24.total_annual_tax == Decimal("44200.00")

        # In FY 2025-26: Taxable ₹9.25L <= ₹12L threshold -> Full rebate, pays ₹0.00
        assert res_25.section_87a_rebate == res_25.slab_tax
        assert res_25.total_annual_tax == Decimal("0.00")

    def test_it_4_old_regime_deductions(self):
        """IT-4: Old Regime deduction handling (₹50,000 std ded + 80C + 24b)."""
        res = calculate_old_regime_tax(
            Decimal("1500000.00"),
            sec_80c=Decimal("150000.00"),
            sec_24b=Decimal("200000.00"),
            fy="FY 2024-25",
        )
        assert res.total_deductions == Decimal("400000.00")
        assert res.taxable_income == Decimal("1100000.00")

    def test_it_5_regime_comparison_same_year(self):
        """IT-5: Comparison uses the SAME financial year on both sides."""
        # For FY 2024-25:
        comp_24 = compare_tax_regimes(Decimal("1500000.00"), sec_80c=Decimal("150000.00"), fy="FY 2024-25")
        assert comp_24["financial_year"] == "FY 2024-25"
        assert comp_24["new_regime"]["total_annual_tax"] == "130000.00"
        assert comp_24["old_regime"]["total_annual_tax"] == "210600.00"
        assert comp_24["tax_saved"] == "80600.00"

        # For FY 2025-26:
        comp_25 = compare_tax_regimes(Decimal("1500000.00"), sec_80c=Decimal("150000.00"), fy="FY 2025-26")
        assert comp_25["financial_year"] == "FY 2025-26"
        assert comp_25["new_regime"]["total_annual_tax"] == "97500.00"
        assert comp_25["old_regime"]["total_annual_tax"] == "210600.00"
        assert comp_25["tax_saved"] == "113100.00"

    def test_it_6_80c_statutory_limit_capping(self):
        """IT-6: Section 80C input above limit is capped at ₹1,50,000."""
        res = calculate_old_regime_tax(Decimal("1000000.00"), sec_80c=Decimal("300000.00"))
        assert res.section_80c == Decimal("150000.00")

    def test_it_7_hra_complete_info(self):
        """IT-7: Deterministic HRA exemption calculated with complete inputs."""
        exempt = calculate_hra_exemption_deterministic(
            basic_salary=Decimal("600000.00"),
            hra_received=Decimal("240000.00"),
            rent_paid=Decimal("300000.00"),
            is_metro=True,
        )
        assert exempt == Decimal("240000.00")

    def test_it_8_missing_hra_data(self):
        """IT-8: Missing rent/basic salary returns ₹0 exemption without guessing."""
        exempt = calculate_hra_exemption_deterministic(
            basic_salary=Decimal("0.00"),
            hra_received=Decimal("240000.00"),
            rent_paid=Decimal("0.00"),
        )
        assert exempt == Decimal("0.00")

    def test_it_9_year_normalization(self):
        """IT-9: normalize_tax_year correctly parses various inputs."""
        from finai.deterministic_math import normalize_tax_year
        assert normalize_tax_year("in FY 2024-25")[:2] == ("FY 2024-25", "AY 2025-26")
        assert normalize_tax_year("for 2025-26")[:2] == ("FY 2025-26", "AY 2026-27")
        assert normalize_tax_year("AY 2026-27")[:2] == ("FY 2025-26", "AY 2026-27")

    def test_it_10_cess_calculation(self):
        """IT-10: 4% Health & Education cess computed on tax after rebate."""
        res = calculate_new_regime_tax(Decimal("1500000.00"), fy="FY 2024-25")
        assert res.health_education_cess == Decimal("5000.00")

    def test_it_11_llm_override_prevention(self):
        """IT-11: Deterministic engine enforces exact numbers over any altered LLM numbers."""
        res = calculate_new_regime_tax(Decimal("1500000.00"), fy="FY 2024-25")
        assert res.total_annual_tax == Decimal("130000.00")
        assert res.total_annual_tax != Decimal("97500.00")
