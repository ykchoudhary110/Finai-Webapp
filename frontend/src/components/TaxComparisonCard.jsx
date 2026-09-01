import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, TrendingDown } from 'lucide-react';

export default function TaxComparisonCard({ data }) {
  if (!data) return null;

  const { new_regime, old_regime, winner, savings_amount, gross_income } = data;
  const isNewWinner = winner.toLowerCase().includes('new');

  // Animated savings counter
  const [displayedSavings, setDisplayedSavings] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 600;
    const steps = 30;
    const inc = savings_amount / steps;
    const timer = setInterval(() => {
      start += inc;
      if (start >= savings_amount) {
        setDisplayedSavings(savings_amount);
        clearInterval(timer);
      } else {
        setDisplayedSavings(Math.floor(start));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [savings_amount]);

  const formatRupees = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="my-4 p-5 bg-[#12151C] border border-[#232732] rounded-2xl shadow-inner-glow relative overflow-hidden">
      {/* Rule Engine Transparency Badge */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#232732]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#1B2A4A] text-[#7477F5] border border-[#5B5FEF]/30">
            <span>⚙ Computed by Deterministic Rule Engine</span>
          </span>
          <span className="text-[11px] font-mono text-[#6B7280]">Finance Act 2024</span>
        </div>

        {savings_amount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 animate-pulse">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>SAVE {formatRupees(displayedSavings)}</span>
          </div>
        )}
      </div>

      {/* Recommended Filing Action Banner */}
      {data.filing_guidance && (
        <div className="mb-4 p-4 rounded-xl bg-[#181C25] border border-[#5B5FEF]/40 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#5B5FEF] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Recommended Filing Action</span>
            </span>
            <h4 className="text-sm font-bold text-white mt-1">
              File <span className="text-[#5B5FEF]">{data.filing_guidance.recommended_form}</span> under {data.winner}
            </h4>
            <p className="text-xs text-[#A6ADBB] mt-0.5">
              Portal: <span className="text-white font-mono">{data.filing_guidance.portal}</span> · Deadline: <span className="text-[#F59E0B] font-mono">{data.filing_guidance.deadline}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[#A6ADBB]">Final Net Tax You Have To Pay:</span>
            <div className="text-xl font-mono font-bold text-[#22C55E]">
              {formatRupees(data.filing_guidance.final_tax_to_pay)}
            </div>
            <span className="text-[10px] text-[#22C55E] font-mono font-medium">
              (Direct Net Savings: {formatRupees(displayedSavings)})
            </span>
          </div>
        </div>
      )}

      {/* Two Column Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* New Regime Card */}
        <div className={`p-4 rounded-xl border transition-all ${isNewWinner ? 'bg-[#181C25] border-[#22C55E]/60 border-l-4' : 'bg-[#12151C] border-[#232732] opacity-75'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[#F5F6FA] flex items-center gap-1.5">
              New Regime (Sec 115BAC)
              {isNewWinner && <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />}
            </h4>
            {isNewWinner && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] font-medium">
                OPTIMAL
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-[#A6ADBB]">
              <span>Std Deduction:</span>
              <span className="text-[#F5F6FA]">{formatRupees(new_regime.deductions_allowed)}</span>
            </div>
            <div className="flex justify-between text-[#A6ADBB]">
              <span>Taxable Income:</span>
              <span className="text-[#F5F6FA]">{formatRupees(new_regime.taxable_income)}</span>
            </div>
            <div className="flex justify-between text-[#A6ADBB]">
              <span>Slab Tax:</span>
              <span className="text-[#F5F6FA]">{formatRupees(new_regime.slab_tax)}</span>
            </div>
            <div className="flex justify-between text-[#A6ADBB]">
              <span>Sec 87A Rebate:</span>
              <span className="text-[#22C55E]">−{formatRupees(new_regime.rebate)}</span>
            </div>
            <div className="flex justify-between text-[#A6ADBB]">
              <span>4% Cess:</span>
              <span className="text-[#F5F6FA]">{formatRupees(new_regime.cess)}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-[#232732] flex justify-between text-sm font-bold">
              <span className="text-[#F5F6FA]">Total Net Tax:</span>
              <span className={isNewWinner ? 'text-[#22C55E]' : 'text-[#F5F6FA]'}>
                {formatRupees(new_regime.total_tax)}
              </span>
            </div>
          </div>
        </div>

        {/* Old Regime Card */}
        <div className={`p-4 rounded-xl border transition-all ${!isNewWinner ? 'bg-[#181C25] border-[#22C55E]/60 border-l-4' : 'bg-[#12151C] border-[#232732] opacity-75'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[#F5F6FA] flex items-center gap-1.5">
              Old Tax Regime
              {!isNewWinner && <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />}
            </h4>
            {!isNewWinner && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] font-medium">
                OPTIMAL
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-[#A6ADBB]">
              <span>Total Deductions:</span>
              <span className="text-[#F5F6FA]">{formatRupees(old_regime.deductions_allowed)}</span>
            </div>
            <div className="flex justify-between text-[#A6ADBB]">
              <span>Taxable Income:</span>
              <span className="text-[#F5F6FA]">{formatRupees(old_regime.taxable_income)}</span>
            </div>
            <div className="flex justify-between text-[#A6ADBB]">
              <span>Slab Tax:</span>
              <span className="text-[#F5F6FA]">{formatRupees(old_regime.slab_tax)}</span>
            </div>
            <div className="flex justify-between text-[#A6ADBB]">
              <span>Sec 87A Rebate:</span>
              <span className="text-[#22C55E]">−{formatRupees(old_regime.rebate)}</span>
            </div>
            <div className="flex justify-between text-[#A6ADBB]">
              <span>4% Cess:</span>
              <span className="text-[#F5F6FA]">{formatRupees(old_regime.cess)}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-[#232732] flex justify-between text-sm font-bold">
              <span className="text-[#F5F6FA]">Total Net Tax:</span>
              <span className={!isNewWinner ? 'text-[#22C55E]' : 'text-[#F5F6FA]'}>
                {formatRupees(old_regime.total_tax)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
