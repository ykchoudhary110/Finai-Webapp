import React from 'react';
import { Calculator } from 'lucide-react';

export default function VerifiedMathCard({ card }) {
  if (!card) return null;

  return (
    <div className="my-4 p-5 bg-[#12151C] border border-[#232732] rounded-2xl shadow-inner-glow">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#232732]">
        <h4 className="text-sm font-semibold text-[#F5F6FA] flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#5B5FEF]" />
          <span>{card.title || 'Verified Computation'}</span>
        </h4>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#1B2A4A] text-[#7477F5] border border-[#5B5FEF]/30">
          <span>⚙ {card.computed_by || 'Computed by Rule Engine'}</span>
        </span>
      </div>

      <div className="divide-y divide-[#232732]/60">
        {card.details && card.details.map((item, idx) => (
          <div key={idx} className="py-2 flex items-center justify-between text-xs">
            <span className="text-[#A6ADBB]">{item.label}</span>
            <span className="font-mono font-medium text-[#F5F6FA]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
