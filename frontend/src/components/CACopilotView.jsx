import React, { useState } from 'react';
import { Send, Sparkles, AlertCircle, ChevronDown, ChevronUp, Bot, User, ArrowRight } from 'lucide-react';
import CitationPopover from './CitationPopover';
import TaxComparisonCard from './TaxComparisonCard';
import VerifiedMathCard from './VerifiedMathCard';

export default function CACopilotView() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState(null);

  const presetChips = [
    { label: "💼 ₹45L Freelancer US Export & 44ADA", query: "I earned ₹45 Lakhs this year providing remote software engineering services to a US client. What are my GST LUT export rules, Section 44ADA presumptive tax, and advance tax liabilities?" },
    { label: "🚗 Corporate Car Purchase & Blocked ITC 17(5)", query: "Our company purchased an executive SUV for ₹35 Lakhs plus 28% GST and 15% cess. Can we claim input tax credit (ITC) and depreciation?" },
    { label: "📊 ₹18L Salary: Old vs New Regime Comparison", query: "My annual CTC is ₹18 Lakhs. I invest ₹1.5L in 80C and pay ₹35,000 in health insurance under 80D. Compare Old vs New tax regimes for me under Budget 2024." },
    { label: "📈 ₹6L Equity Mutual Fund Sale (Budget 2024)", query: "I booked ₹6 Lakhs long-term capital gains (LTCG) selling equity mutual funds after 18 months. What is my revised tax liability under Budget 2024 Section 112A?" },
  ];

  const handleSend = async (textToSend) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();

      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        narrative: data.narrative,
        tax_comparison: data.tax_comparison_card,
        verified_math: data.verified_math_card,
        citations: data.citations || [],
        audit_record: data.audit_record,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          narrative: 'Unable to connect to the backend consultation engine. Please ensure the backend server is running.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto w-full px-4 sm:px-6">
      {/* Scrollable Message Feed */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty State Hero Zone */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5B5FEF] to-[#1B2A4A] flex items-center justify-center mb-4 shadow-lg shadow-[#5B5FEF]/10">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F6FA] mb-2">
              Institutional Indian CA Copilot
            </h2>
            <p className="text-sm text-[#A6ADBB] max-w-lg mb-8 leading-relaxed">
              Real-time Indian tax advisory grounded in official CBIC circulars and Income Tax provisions. Calculations computed deterministically — zero mathematical hallucinations.
            </p>

            {/* Preset Demo Chips for Presentation */}
            <div className="w-full max-w-2xl space-y-2">
              <div className="text-xs font-mono text-[#6B7280] uppercase tracking-wider mb-2">
                Teacher & Examiner Demo Scenarios
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presetChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip.query)}
                    className="p-3 text-left rounded-xl bg-[#12151C] border border-[#232732] hover:border-[#5B5FEF]/50 hover:bg-[#181C25] transition-all group"
                  >
                    <div className="text-xs font-medium text-[#F5F6FA] group-hover:text-[#5B5FEF] flex items-center justify-between">
                      <span>{chip.label}</span>
                      <ArrowRight className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B5FEF] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Message List */
          messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {msg.role === 'user' ? (
                /* User Message (Right Aligned Plain Bubble) */
                <div className="flex justify-end">
                  <div className="max-w-xl px-4 py-2.5 rounded-2xl bg-[#181C25] border border-[#232732] text-sm text-[#F5F6FA] leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                /* AI Response (Left Aligned Full Width Structured Card) */
                <div className="p-6 bg-[#12151C] border border-[#232732] rounded-2xl shadow-inner-glow space-y-4 text-left">
                  {/* AI Header with Citations */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#232732]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#5B5FEF]/20 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-[#5B5FEF]" />
                      </div>
                      <span className="text-xs font-semibold text-[#F5F6FA]">FinAI CA Advisory</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 font-medium">
                        Verified Statutory Trace
                      </span>
                    </div>

                    {/* Inline Citation Pills */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-[#6B7280] mr-1">Sources:</span>
                        {msg.citations.map((c, i) => (
                          <CitationPopover key={i} citation={c} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI Narrative Body */}
                  <div className="text-sm text-[#A6ADBB] leading-relaxed space-y-2 whitespace-pre-line font-sans">
                    {msg.narrative}
                  </div>

                  {/* Deterministic Tax Regime Comparison Card (if present) */}
                  {msg.tax_comparison && (
                    <TaxComparisonCard data={msg.tax_comparison} />
                  )}

                  {/* Deterministic Verified Math Card (if present) */}
                  {msg.verified_math && (
                    <VerifiedMathCard card={msg.verified_math} />
                  )}

                  {/* Expandable "Why this answer?" Statutory Audit Trace */}
                  <div className="pt-2 border-t border-[#232732]">
                    <button
                      onClick={() => setExpandedTraceId(expandedTraceId === msg.id ? null : msg.id)}
                      className="inline-flex items-center gap-1 text-xs font-mono text-[#6B7280] hover:text-[#A6ADBB] transition-colors"
                    >
                      <span>Why this answer? — Statutory Trace</span>
                      {expandedTraceId === msg.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {expandedTraceId === msg.id && (
                      <div className="mt-2.5 p-3 rounded-xl bg-[#0B0E14] border border-[#232732] text-xs font-mono text-[#A6ADBB] space-y-1.5 animate-in fade-in">
                        <div>● Computation Mode: Deterministic Python IEEE-754 Decimal arithmetic</div>
                        <div>● Statutory Datasets: Central Board of Indirect Taxes & Customs (CBIC) 2024-2025</div>
                        <div>● Tax Slabs Version: Finance (No. 2) Act, 2024 amended Section 115BAC</div>
                        {msg.audit_record && (
                          <div className="text-[#6B7280] pt-1 border-t border-[#232732]/60">
                            Immutable Ledger Block: #{msg.audit_record.id} · Hash: {msg.audit_record.hash}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="p-6 bg-[#12151C] border border-[#232732] rounded-2xl animate-pulse space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#5B5FEF]">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Fetching live CBIC circulars & computing deterministic tax matrices...</span>
            </div>
            <div className="h-4 bg-[#181C25] rounded w-3/4" />
            <div className="h-4 bg-[#181C25] rounded w-1/2" />
          </div>
        )}
      </div>

      {/* Persistent Bottom Chat Input Bar */}
      <div className="py-4 border-t border-[#232732] bg-[#0B0E14]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about GST classification, Section 44ADA, Old vs New regime, capital gains..."
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-[#12151C] border border-[#232732] text-sm text-[#F5F6FA] placeholder-[#6B7280] focus:outline-none focus:border-[#5B5FEF] focus:ring-1 focus:ring-[#5B5FEF] transition-all"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute right-2.5 p-2 rounded-lg bg-[#5B5FEF] text-white hover:bg-[#7477F5] disabled:opacity-40 disabled:hover:bg-[#5B5FEF] transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
