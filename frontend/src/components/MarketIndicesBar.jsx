import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../api';

function SparklineChart({ data, isPositive }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 160;
  const height = 46;
  const padding = 4;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;
  const strokeColor = isPositive ? '#22C55E' : '#EF4444';
  const fillGradientId = `grad-${isPositive ? 'pos' : 'neg'}-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={fillGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${fillGradientId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Glowing dot on latest point */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].split(',')[0]}
            cy={points[points.length - 1].split(',')[1]}
            r="3"
            fill={strokeColor}
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}

export default function MarketIndicesBar({ onSelectTicker }) {
  const [indices, setIndices] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchIndices = async () => {
    try {
      const res = await fetch(getApiUrl('/api/market-indices'));
      if (res.ok) {
        const data = await res.json();
        setIndices(data);
      }
    } catch (e) {
      console.warn('Failed to load market indices:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndices();
    const timer = setInterval(fetchIndices, 60000); // 1 min poll
    return () => clearInterval(timer);
  }, []);

  if (loading && !indices) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        <div className="h-28 bg-[#12151C] border border-[#232732] rounded-2xl" />
        <div className="h-28 bg-[#12151C] border border-[#232732] rounded-2xl" />
      </div>
    );
  }

  if (!indices) return null;

  const renderCard = (item, defaultTicker) => {
    if (!item) return null;
    const isPos = item.percent >= 0;

    return (
      <div className="p-5 bg-[#12151C] border border-[#232732] rounded-2xl shadow-inner-glow relative overflow-hidden flex flex-col justify-between group hover:border-[#5B5FEF]/40 transition-all">
        {/* Top row: Name, exchange badge, score */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#181C25] border border-[#232732] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-[#5B5FEF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#F5F6FA] tracking-tight">{item.name}</h4>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181C25] text-[#A6ADBB] border border-[#232732]">
                  {item.exchange.split(' ')[0]}
                </span>
              </div>
              <span className="text-[11px] text-[#6B7280]">{item.exchange}</span>
            </div>
          </div>

          {/* Market Health Score Pill */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] font-mono text-[#6B7280]">Health Score:</span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                  item.score >= 70
                    ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                    : item.score >= 50
                    ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30'
                    : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                }`}
              >
                {item.score} / 100
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#A6ADBB]">{item.sentiment}</span>
          </div>
        </div>

        {/* Bottom row: Points, Change pill, Sparkline graph */}
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <div className="text-2xl font-mono font-bold text-[#F5F6FA] tracking-tight">
              ₹{item.current.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                  isPos ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                }`}
              >
                {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPos ? '+' : ''}
                {item.change.toFixed(2)} ({isPos ? '+' : ''}
                {item.percent.toFixed(2)}%)
              </span>
              <span className="text-[10px] font-mono text-[#6B7280]">Today's Trend</span>
            </div>
          </div>

          {/* Sparkline Graph */}
          <div className="shrink-0">
            <SparklineChart data={item.sparkline} isPositive={isPos} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 mb-6">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-mono text-[#6B7280]">
          <span>🇮🇳 Indian Benchmark Indices (Macro Risk Engine)</span>
        </div>
        <button
          onClick={fetchIndices}
          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6B7280] hover:text-[#5B5FEF] transition-colors"
          title="Refresh Market Indices"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Sync Feeds</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderCard(indices.nifty, 'RELIANCE')}
        {renderCard(indices.sensex, 'TCS')}
      </div>
    </div>
  );
}
