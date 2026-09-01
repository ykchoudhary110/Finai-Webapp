import React, { useEffect, useState } from 'react';

export default function StockGauge({ score = 75, category = "Moderate Risk", color = "amber" }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800; // ms
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = score / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Number(start.toFixed(1)));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  // Semicircular angle: 0 score = -90 deg, 100 score = +90 deg
  const rotationAngle = -90 + (animatedScore / 100) * 180;

  // Determine dynamic badge colors
  const getColorClasses = (scoreVal) => {
    if (scoreVal >= 75) return { text: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/30', hex: '#22C55E' };
    if (scoreVal >= 55) return { text: 'text-[#38BDF8]', bg: 'bg-[#38BDF8]/10', border: 'border-[#38BDF8]/30', hex: '#38BDF8' };
    if (scoreVal >= 35) return { text: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]/30', hex: '#F59E0B' };
    return { text: 'text-[#EF4444]', bg: 'bg-[#EF4444]/10', border: 'border-[#EF4444]/30', hex: '#EF4444' };
  };

  const currentTheme = getColorClasses(score);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#12151C] border border-[#232732] rounded-2xl shadow-inner-glow relative overflow-hidden">
      <div className="relative w-72 h-40 flex items-end justify-center">
        {/* SVG Arc Gauge */}
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="35%" stopColor="#F59E0B" />
              <stop offset="70%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>
          {/* Background Track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#181C25"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Active Gradient Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.85"
          />
          {/* Pivot Center */}
          <circle cx="100" cy="100" r="7" fill="#F5F6FA" />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="32"
            stroke="#F5F6FA"
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{
              transformOrigin: '100px 100px',
              transform: `rotate(${rotationAngle}deg)`,
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        {/* Large Centered Score Numeral */}
        <div className="absolute -bottom-1 flex flex-col items-center">
          <span className="font-mono text-4xl font-bold tracking-tight text-[#F5F6FA]">
            {animatedScore}
          </span>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#6B7280]">
            Score / 100
          </span>
        </div>
      </div>

      {/* Category Pill */}
      <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${currentTheme.bg} ${currentTheme.text} ${currentTheme.border}`}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentTheme.hex }} />
        <span>{category}</span>
      </div>
    </div>
  );
}
