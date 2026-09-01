import React from 'react';
import { MessageSquareText, TrendingUp, History, Shield, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }) {
  const navItems = [
    { id: 'copilot', label: 'CA Copilot', icon: MessageSquareText, badge: 'AI + Math' },
    { id: 'stocks', label: 'Stock Evaluator', icon: TrendingUp, badge: 'Real-Time' },
    { id: 'audit', label: 'Audit History', icon: History, badge: 'SHA-256' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-[#0B0E14] border-r border-[#232732] z-30 transition-all duration-300 flex flex-col justify-between ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#232732]">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B5FEF] to-[#1B2A4A] flex items-center justify-center shadow-md">
                <span className="text-base">⚖️</span>
              </div>
              <div>
                <div className="font-semibold text-sm tracking-tight text-[#F5F6FA] flex items-center gap-1.5">
                  FinAI
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#5B5FEF]/20 text-[#5B5FEF] font-bold">
                    PRO
                  </span>
                </div>
                <div className="text-[10px] text-[#6B7280]">Institutional CA Intelligence</div>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-br from-[#5B5FEF] to-[#1B2A4A] flex items-center justify-center">
              <span className="text-sm">⚖️</span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-[#6B7280] hover:text-[#F5F6FA] hover:bg-[#181C25] transition-colors hidden md:block"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#181C25] text-[#F5F6FA] border-l-2 border-[#5B5FEF] shadow-sm'
                    : 'text-[#A6ADBB] hover:text-[#F5F6FA] hover:bg-[#12151C]'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#5B5FEF]' : 'text-[#6B7280]'}`} />
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#232732] text-[#A6ADBB]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Status */}
      <div className="p-3 border-t border-[#232732]">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl bg-[#12151C] border border-[#232732]">
            <div className="flex items-center gap-2 text-[11px] font-medium text-[#A6ADBB] mb-1">
              <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Offline Verified</span>
            </div>
            <p className="text-[10px] text-[#6B7280] leading-snug">
              Calculations verified by Python deterministic rules.
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title="Offline Verified">
            <Shield className="w-4 h-4 text-[#22C55E]" />
          </div>
        )}
      </div>
    </aside>
  );
}
