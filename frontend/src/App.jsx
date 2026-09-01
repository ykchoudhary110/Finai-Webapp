import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import CACopilotView from './components/CACopilotView';
import StockEvaluatorView from './components/StockEvaluatorView';
import AuditDrawer from './components/AuditDrawer';
import { getApiUrl } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('copilot');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    fetch(getApiUrl('/api/status'))
      .then((res) => res.json())
      .then((data) => setSystemStatus(data))
      .catch((err) => console.error("Status fetch error", err));
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F5F6FA] flex">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-60'}`}>
        {/* Glassmorphic Top Bar */}
        <TopBar
          activeTab={activeTab}
          onOpenAudit={() => setIsAuditOpen(true)}
          systemStatus={systemStatus}
        />

        {/* View Routing */}
        <main className="flex-1 flex flex-col">
          {activeTab === 'copilot' && <CACopilotView />}
          {activeTab === 'stocks' && <StockEvaluatorView />}
          {activeTab === 'audit' && (
            <div className="max-w-5xl mx-auto w-full px-6 py-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#F5F6FA]">Cryptographic Audit Ledger</h3>
                  <p className="text-xs text-[#6B7280]">All transactions and stock evaluations stored with SHA-256 block hashes.</p>
                </div>
                <button
                  onClick={() => setIsAuditOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#5B5FEF] text-xs font-semibold text-white hover:bg-[#7477F5]"
                >
                  Open Full Ledger Drawer
                </button>
              </div>
              <div className="p-6 bg-[#12151C] border border-[#232732] rounded-2xl text-center text-xs text-[#A6ADBB]">
                Click "Open Full Ledger Drawer" or the Audit Drawer button in the top bar to inspect and export logs.
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 480px Slide-Over Audit Ledger Drawer */}
      <AuditDrawer isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />
    </div>
  );
}
