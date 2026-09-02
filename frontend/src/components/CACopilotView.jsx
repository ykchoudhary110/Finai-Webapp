import React, { useState } from 'react';
import { Send, Sparkles, AlertCircle, ChevronDown, ChevronUp, Bot, User, ArrowRight, Receipt, CheckCircle2, ShieldCheck, Globe } from 'lucide-react';
import CitationPopover from './CitationPopover';
import TaxComparisonCard from './TaxComparisonCard';
import VerifiedMathCard from './VerifiedMathCard';
import FormattedNarrative from './FormattedNarrative';
import ReceiptUploadModal from './ReceiptUploadModal';
import { getApiUrl } from '../api';

export default function CACopilotView() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState(null);
  const [mode, setMode] = useState('auto'); // 'auto' | 'salary' | 'gst'
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  const presetChips = [
    { label: "💼 ₹45L Freelancer US Export & 44ADA", query: "I earned ₹45 Lakhs this year providing remote software engineering services to a US client. What are my GST LUT export rules, Section 44ADA presumptive tax, and advance tax liabilities?" },
    { label: "🚗 Corporate Car Purchase & Blocked ITC 17(5)", query: "Our company purchased an executive SUV for ₹35 Lakhs plus 28% GST and 15% cess. Can we claim input tax credit (ITC) and depreciation?" },
    { label: "📊 ₹18L Salary: Old vs New Regime Comparison", query: "My annual CTC is ₹18 Lakhs. I invest ₹1.5L in 80C and pay ₹35,000 in health insurance under 80D. Compare Old vs New tax regimes for me under Budget 2024." },
    { label: "📈 ₹6L Equity Mutual Fund Sale (Budget 2024)", query: "I booked ₹6 Lakhs long-term capital gains (LTCG) selling equity mutual funds after 18 months. What is my revised tax liability under Budget 2024 Section 112A?" },
  ];

  const handleSend = async (textToSend) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: q, mode: mode };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const conversationHistory = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.narrative || m.content || '',
      }));

      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, mode: mode, history: conversationHistory }),
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

  const handleApproveAdvisory = async (msg) => {
    if (approvingId === msg.id || msg.audit_record) return;
    setApprovingId(msg.id);
    try {
      const res = await fetch(`${getApiUrl()}/api/approve-advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: msg.query || query,
          narrative: msg.narrative,
          citations: msg.citations || [],
          mode: mode,
        }),
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, audit_record: data.audit_record, pending_approval: false }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to seal advisory in hash chain:", err);
    } finally {
      setApprovingId(null);
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
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#5B5FEF]/10 text-[#5B5FEF] border border-[#5B5FEF]/20 font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3 text-[#5B5FEF]" />
                        <span>Live Internet Grounded</span>
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

                  {/* AI Narrative Body (Formatted clean text from live internet) */}
                  <div className="text-sm text-[#A6ADBB] leading-relaxed">
                    <FormattedNarrative text={msg.narrative} />
                  </div>

                  {/* Approval & Immutable Hash Chain Action Bar */}
                  <div className="pt-3 border-t border-[#232732]">
                    {msg.audit_record ? (
                      <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#22C55E]/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <div className="flex items-center gap-2 text-[#22C55E] font-semibold">
                          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                          <span>Approved by Taxpayer · Sealed in Hash Chain Block #{msg.audit_record.id}</span>
                        </div>
                        <div className="text-[#6B7280] text-[11px] truncate max-w-sm">
                          SHA-256: <span className="text-white font-mono">{msg.audit_record.hash.slice(0, 18)}...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0B0E14] border border-[#232732]">
                        <div className="text-xs text-[#A6ADBB]">
                          <span className="font-semibold text-white">Taxpayer Review:</span> Verify the statutory advice above. Click Approve to cryptographically seal this log into the immutable SHA-256 hash chain for future audit defense.
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApproveAdvisory(msg)}
                          disabled={approvingId === msg.id}
                          className="px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{approvingId === msg.id ? 'Sealing in Block...' : 'Approve & Put in Hash Chain'}</span>
                        </button>
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
      <div className="py-3 border-t border-[#232732] bg-[#0B0E14] space-y-2">
        {/* Mode Selector Pill Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-[#6B7280]">Target Calculator:</span>
            <div className="inline-flex p-0.5 rounded-lg bg-[#12151C] border border-[#232732]">
              <button
                type="button"
                onClick={() => setMode('auto')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium text-[11px] ${
                  mode === 'auto'
                    ? 'bg-[#5B5FEF] text-white shadow'
                    : 'text-[#A6ADBB] hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Detect</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('salary')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium text-[11px] ${
                  mode === 'salary'
                    ? 'bg-[#22C55E] text-white shadow'
                    : 'text-[#A6ADBB] hover:text-white'
                }`}
              >
                <span>💼 Salary & Income Tax</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('gst')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium text-[11px] ${
                  mode === 'gst'
                    ? 'bg-[#F59E0B] text-black shadow'
                    : 'text-[#A6ADBB] hover:text-white'
                }`}
              >
                <span>🧾 GST Invoicing</span>
              </button>
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#6B7280] hidden sm:inline">
            {mode === 'salary' && '🔒 Locked: Salary Income Tax (Strictly Exempt from GST)'}
            {mode === 'gst' && '🔒 Locked: GST Commercial Invoice & ITC'}
            {mode === 'auto' && '⚡ Smart AI Auto-Classification'}
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center gap-2"
        >
          {/* Upload Receipt / Invoice Button */}
          <button
            type="button"
            onClick={() => setIsReceiptModalOpen(true)}
            className="px-3 py-2.5 rounded-xl bg-[#12151C] border border-[#232732] hover:border-[#5B5FEF]/60 text-[#A6ADBB] hover:text-[#5B5FEF] hover:bg-[#181C25] transition-all flex items-center gap-1.5 shrink-0 shadow-sm group"
            title="Scan or Upload GST Invoice / Receipt"
          >
            <Receipt className="w-4 h-4 text-[#5B5FEF] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium hidden sm:inline text-white">Upload Receipt</span>
          </button>

          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === 'salary'
                  ? "Enter your annual salary or CTC (e.g. 15 Lakhs) for Old vs New Regime calculation..."
                  : mode === 'gst'
                  ? "Enter commercial transaction (e.g. bought office laptops for ₹1.8 Lakhs) for GST & ITC..."
                  : "Ask about Salary, GST, Section 44ADA, Old vs New regime, capital gains..."
              }
              className="w-full pl-4 pr-12 py-3 rounded-xl bg-[#12151C] border border-[#232732] text-sm text-[#F5F6FA] placeholder-[#6B7280] focus:outline-none focus:border-[#5B5FEF] focus:ring-1 focus:ring-[#5B5FEF] transition-all"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="absolute right-2.5 p-2 rounded-lg bg-[#5B5FEF] text-white hover:bg-[#7477F5] disabled:opacity-40 disabled:hover:bg-[#5B5FEF] transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Receipt & Tax Invoice Upload Inspector Modal */}
      <ReceiptUploadModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onSelectReceipt={(receiptQuery) => handleSend(receiptQuery)}
      />
    </div>
  );
}
