import React, { useState } from 'react';
import { ExternalLink, BookOpen } from 'lucide-react';

export default function CitationPopover({ citation }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!citation) return null;

  return (
    <div className="relative inline-block mx-1">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => citation.url && window.open(citation.url, '_blank')}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-[#1B2A4A] text-[#7477F5] border border-[#5B5FEF]/30 hover:border-[#5B5FEF] hover:bg-[#5B5FEF]/20 transition-all cursor-pointer shadow-sm"
      >
        <BookOpen className="w-3 h-3 text-[#5B5FEF]" />
        <span>[{citation.citation_tag || 'Statute'}]</span>
      </button>

      {isOpen && (
        <div
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          className="absolute z-50 bottom-full left-0 mb-2 w-72 p-3.5 bg-[#181C25] border border-[#232732] rounded-xl shadow-2xl text-left transform transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5B5FEF]">
              {citation.citation_tag}
            </span>
            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="text-[#A6ADBB] hover:text-white inline-flex items-center gap-1 text-[11px]"
              >
                View <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <h5 className="text-xs font-medium text-[#F5F6FA] mb-1 line-clamp-2">
            {citation.title}
          </h5>
          <p className="text-[11px] text-[#A6ADBB] leading-relaxed line-clamp-3">
            {citation.snippet}
          </p>
          <div className="mt-2 pt-2 border-t border-[#232732] flex items-center justify-between text-[10px] text-[#6B7280]">
            <span>Official Legal Source</span>
            <span className="text-[#22C55E]">● Verified</span>
          </div>
        </div>
      )}
    </div>
  );
}
