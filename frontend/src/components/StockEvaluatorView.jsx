import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, AlertTriangle, CheckCircle, ShieldAlert, BarChart3, Building2 } from 'lucide-react';
import StockGauge from './StockGauge';

export default function StockEvaluatorView() {
  const [tickerInput, setTickerInput] = useState('RELIANCE');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const quickTickers = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ZOMATO', 'TATAMOTORS'];

  const handleEvaluate = async (symbolToFetch) => {
    const sym = symbolToFetch || tickerInput;
    if (!sym.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock-risk?ticker=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error("Failed to evaluate stock data.");
      const data = await res.json();
      setStockData(data);
    } catch (e) {
      console.error(e);
      setError("Unable to retrieve real-time market data for ticker. Please verify symbol.");
    } finally {
      setLoading(false);
    }
  };

  // Evaluate default stock on first load
  useEffect(() => {
    handleEvaluate('RELIANCE');
  }, []);

  const formatRupees = (val) => val ? `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
      {/* Persistent SEBI Educational Disclaimer Banner */}
      <div className="p-3 bg-[#181C25] border border-[#232732] rounded-xl flex items-start gap-2.5 text-xs text-[#A6ADBB]">
        <ShieldAlert className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#F5F6FA]">SEBI Educational Risk Analysis:</strong> Quantitative balance-sheet and volatility assessment only. FinAI does not offer investment advice or recommendations to Buy, Sell, or Hold any security.
        </p>
      </div>

      {/* Ticker Search Bar */}
      <div className="p-5 bg-[#12151C] border border-[#232732] rounded-2xl shadow-inner-glow space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEvaluate();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              placeholder="Enter Indian stock symbol e.g. RELIANCE, TCS, INFY..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#232732] text-sm font-mono uppercase text-[#F5F6FA] placeholder-[#6B7280] focus:outline-none focus:border-[#5B5FEF]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-[#5B5FEF] text-white text-xs font-semibold hover:bg-[#7477F5] transition-colors disabled:opacity-50"
          >
            {loading ? 'Evaluating...' : 'Evaluate Risk Score'}
          </button>
        </form>

        {/* Quick Ticker Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-mono text-[#6B7280]">Popular:</span>
          {quickTickers.map((sym) => (
            <button
              key={sym}
              onClick={() => {
                setTickerInput(sym);
                handleEvaluate(sym);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#181C25] hover:bg-[#232732] text-[#A6ADBB] hover:text-[#F5F6FA] border border-[#232732] font-mono text-xs transition-colors"
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444]">
          {error}
        </div>
      )}

      {stockData && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header & Main Gauge Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Company Info Card */}
            <div className="p-6 bg-[#12151C] border border-[#232732] rounded-2xl shadow-inner-glow space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-[#5B5FEF]">
                <Building2 className="w-4 h-4" />
                <span>{stockData.sector}</span>
              </div>
              <h3 className="text-xl font-bold text-[#F5F6FA] tracking-tight">{stockData.company_name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-[#F5F6FA]">{formatRupees(stockData.current_price)}</span>
                <span className="text-xs font-mono text-[#6B7280]">NSE Real-Time</span>
              </div>
              <div className="pt-2 border-t border-[#232732] text-[11px] text-[#A6ADBB] flex justify-between font-mono">
                <span>52W High: {formatRupees(stockData.key_stats.fifty_two_high)}</span>
                <span>52W Low: {formatRupees(stockData.key_stats.fifty_two_low)}</span>
              </div>
            </div>

            {/* Central Animated Risk & Health Score Gauge */}
            <div className="md:col-span-2">
              <StockGauge
                score={stockData.composite_score}
                category={stockData.risk_category}
                color={stockData.status_color}
              />
            </div>
          </div>

          {/* 4-Column Sub-Pillar Breakdown Cards */}
          <div>
            <div className="text-xs font-mono uppercase text-[#6B7280] tracking-wider mb-3">
              4-Pillar Quantitative Evaluation (Weight: 25% each)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(stockData.pillars).map(([key, pillar]) => (
                <div key={key} className="p-4 bg-[#12151C] border border-[#232732] rounded-xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#F5F6FA]">{pillar.name}</span>
                    <span className="font-mono font-bold text-[#5B5FEF]">{pillar.score} / {pillar.max}</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-[#181C25] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#5B5FEF] to-[#22C55E] rounded-full transition-all duration-500"
                      style={{ width: `${(pillar.score / pillar.max) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-mono text-[#A6ADBB] truncate">{pillar.summary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Positive Green Flags & Risk Red Flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Green Flags */}
            <div className="p-4 bg-[#12151C] border border-[#232732] rounded-2xl space-y-2.5">
              <h4 className="text-xs font-semibold text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Fundamental Strengths (Green Flags)</span>
              </h4>
              <ul className="space-y-1.5">
                {stockData.green_flags.map((flag, i) => (
                  <li key={i} className="text-xs text-[#A6ADBB] flex items-start gap-2">
                    <span className="text-[#22C55E] font-bold">✓</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Red Flags / Cautionary Indicators */}
            <div className="p-4 bg-[#12151C] border border-[#232732] rounded-2xl space-y-2.5">
              <h4 className="text-xs font-semibold text-[#EF4444] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Risk & Volatility Indicators (Red Flags)</span>
              </h4>
              <ul className="space-y-1.5">
                {stockData.red_flags.map((flag, i) => (
                  <li key={i} className="text-xs text-[#A6ADBB] flex items-start gap-2">
                    <span className="text-[#EF4444] font-bold">!</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
