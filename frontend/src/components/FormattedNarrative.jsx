import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';

// Helper to render bold, italic, and citation badge pills within inline text
function renderInlineContent(text) {
  if (!text) return null;

  // Pattern matches:
  // 1. **bold**
  // 2. *italic*
  // 3. [Citation text]
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\])/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      // If bold wraps a citation like **[Statutory Citation]**
      if (inner.startsWith('[') && inner.endsWith(']')) {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md text-[11px] font-mono font-medium bg-[#5B5FEF]/15 text-[#7477F5] border border-[#5B5FEF]/30"
          >
            <BookOpen className="w-3 h-3" />
            {inner.slice(1, -1)}
          </span>
        );
      }
      return (
        <strong key={idx} className="font-semibold text-white">
          {inner}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="italic text-[#9CA3AF]">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md text-[11px] font-mono font-medium bg-[#5B5FEF]/15 text-[#7477F5] border border-[#5B5FEF]/30"
        >
          <BookOpen className="w-3 h-3" />
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

export default function FormattedNarrative({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let currentTable = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <div key={`list-${elements.length}`} className="my-2.5 space-y-2">
          {currentList.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-[#D1D5DB]">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#5B5FEF] shrink-0" />
              <span className="leading-relaxed">{renderInlineContent(item)}</span>
            </div>
          ))}
        </div>
      );
      currentList = [];
    }
  };

  const flushTable = () => {
    if (currentTable.length >= 2) {
      // First line is headers
      const rawHeaders = currentTable[0].split('|').map((c) => c.trim()).filter(Boolean);
      // Skip separator line (line with :--- or ---)
      const rawRows = currentTable.slice(1).filter((line) => !line.match(/^\|[\s\-:]+\|$/));

      elements.push(
        <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-[#232732] bg-[#0B0E14] shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#181C25] text-white uppercase text-[10px] tracking-wider border-b border-[#232732]">
              <tr>
                {rawHeaders.map((h, i) => (
                  <th key={i} className="px-3.5 py-2.5 font-semibold text-white">
                    {renderInlineContent(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232732]/60 text-[#D1D5DB]">
              {rawRows.map((line, rIdx) => {
                const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
                return (
                  <tr key={rIdx} className="hover:bg-[#12151C] transition-colors">
                    {cells.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2.5 text-xs">
                        {renderInlineContent(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      currentTable = [];
    } else if (currentTable.length > 0) {
      currentTable.forEach((line, idx) => {
        elements.push(
          <p key={`tline-${elements.length}-${idx}`} className="text-sm text-[#A6ADBB] leading-relaxed my-1.5">
            {renderInlineContent(line)}
          </p>
        );
      });
      currentTable = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushTable();
      return;
    }

    // Markdown Table Rows: | Col 1 | Col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      currentTable.push(trimmed);
      return;
    } else {
      flushTable();
    }

    // Main Heading: ### Heading
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3
          key={`h3-${idx}`}
          className="text-base font-bold text-white tracking-tight pt-2 pb-1 border-b border-[#232732]/60 flex items-center gap-2"
        >
          {renderInlineContent(trimmed.replace(/^###\s*/, ''))}
        </h3>
      );
      return;
    }

    // Sub Heading: #### Subheading
    if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4
          key={`h4-${idx}`}
          className="text-xs font-semibold uppercase tracking-wider text-[#5B5FEF] pt-2 pb-0.5"
        >
          {renderInlineContent(trimmed.replace(/^####\s*/, ''))}
        </h4>
      );
      return;
    }

    // Bullet points: - item or * item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2));
      return;
    }

    // Verified References footer: *Statutory References Verified:*
    if (trimmed.toLowerCase().includes('statutory references verified')) {
      flushList();
      elements.push(
        <div
          key={`ref-${idx}`}
          className="mt-3 pt-2.5 border-t border-[#232732] flex flex-wrap items-center gap-1.5 text-xs text-[#9CA3AF]"
        >
          <span className="font-medium text-[#D1D5DB] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
            Verified References:
          </span>
          {renderInlineContent(trimmed.replace(/^[*\s]*statutory references verified:[*\s]*/i, ''))}
        </div>
      );
      return;
    }

    // Standard paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-sm text-[#A6ADBB] leading-relaxed my-1.5">
        {renderInlineContent(trimmed)}
      </p>
    );
  });

  flushList();
  flushTable();

  return <div className="space-y-1.5 font-sans">{elements}</div>;
}
