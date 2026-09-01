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

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
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

  return <div className="space-y-1.5 font-sans">{elements}</div>;
}
