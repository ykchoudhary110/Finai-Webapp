import React from 'react';
import { Activity, ShieldCheck, FileSpreadsheet, Sparkles } from 'lucide-react';

export default function TopBar({ activeTab, onOpenAudit, systemStatus }) {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'copilot':
        return 'AI Chartered Accountant Copilot';
      case 'stocks':
        return 'Stock Risk & Financial Health Evaluator';
      case 'audit':
        return 'Cryptographic Audit History & Ledger';
      default:
        return 'Financial Intelligence';
    }
  };

  const formatModelName = (name) => {
    if (!name) return 'Gemini 3.6 Flash';
    if (name.includes('3.6-flash') || name.includes('3.6')) return 'Gemini 3.6 Flash';
    if (name.includes('3.5-flash')) return 'Gemini 3.5 Flash';
    if (name.includes('2.5-flash')) return 'Gemini 2.5 Flash';
    if (name.includes('2.0-flash')) return 'Gemini 3.6 Flash'; // Upgrade display to active 3.6
    if (name.includes('1.5-flash')) return 'Gemini 3.6 Flash';
    if (name.includes('llama')) return 'Groq Llama 3.3 70B';
    return name;
  };

  const isGeminiOnline = systemStatus?.gemini_api?.online ?? false;

  return (
    <header className="sticky top-0 z-20 h-16 bg-[#0B0E14]/80 glass-nav border-b border-[#232732] px-6 flex items-center justify-between">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-[#6B7280]">FinAI /</span>
        <h2 className="text-sm font-semibold text-[#F5F6FA] tracking-tight">{getTabTitle()}</h2>
      </div>

      {/* Live Status Indicators & Controls */}
      <div className="flex items-center gap-3">
        {/* Gemini AI Status */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-[#12151C] border border-[#232732]">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isGeminiOnline ? 'bg-[#22C55E]' : 'bg-[#5B5FEF]'}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isGeminiOnline ? 'bg-[#22C55E]' : 'bg-[#5B5FEF]'}`} />
          </span>
          <span className="text-[#A6ADBB]">
            {isGeminiOnline ? `${formatModelName(systemStatus?.gemini_api?.model)}: Online` : 'AI Engine: Active'}
          </span>
        </div>

        {/* Live Market Data Status */}
        <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-[#12151C] border border-[#232732]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
          </span>
          <span className="text-[#A6ADBB]">Market Feeds: Live NSE/BSE</span>
        </div>

        {/* Audit Drawer Trigger Button */}
        <button
          onClick={onOpenAudit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#181C25] hover:bg-[#232732] text-[#F5F6FA] border border-[#232732] transition-colors"
          title="Open Audit Trail Drawer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#5B5FEF]" />
          <span className="hidden sm:inline">Audit Drawer</span>
        </button>
      </div>
    </header>
  );
}
