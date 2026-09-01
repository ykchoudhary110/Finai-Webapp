import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Download, History, Shield, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../api';

export default function AuditDrawer({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/audit-logs?limit=40'));
      const data = await res.json();
      setLogs(data.records || []);
    } catch (e) {
      console.error("Failed to load audit logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const handleCopyHash = (hash, id) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJSON = (record) => {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finai_audit_${record.id}_${record.kind}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md md:max-w-lg bg-[#0B0E14] border-l border-[#232732] flex flex-col shadow-2xl">
          {/* Drawer Header */}
          <div className="p-5 border-b border-[#232732] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#5B5FEF]" />
              <h3 className="text-sm font-semibold text-[#F5F6FA]">SHA-256 Cryptographic Audit Ledger</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchLogs}
                className="p-1.5 rounded-lg text-[#A6ADBB] hover:text-white hover:bg-[#181C25] transition-colors"
                title="Refresh logs"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#A6ADBB] hover:text-white hover:bg-[#181C25] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body / Table */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-xs text-[#6B7280]">
              Every user calculation and AI assessment is chained cryptographically to ensure non-repudiation and audit defense.
            </p>

            {loading && logs.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#6B7280]">Loading ledger records...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#6B7280]">No consultation records in audit ledger yet.</div>
            ) : (
              logs.map((record) => (
                <div
                  key={record.id}
                  className="p-3.5 bg-[#12151C] border border-[#232732] rounded-xl hover:border-[#383E4F] transition-all space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-[#5B5FEF]">
                      #{record.id} · <span className="uppercase">{record.kind}</span>
                    </span>
                    <span className="text-[10px] text-[#6B7280]">
                      {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Truncated Hash with Copy button */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#181C25] font-mono text-[11px]">
                    <span className="text-[#A6ADBB] truncate max-w-[260px]">
                      {record.audit_hash}
                    </span>
                    <button
                      onClick={() => handleCopyHash(record.audit_hash, record.id)}
                      className="text-[#6B7280] hover:text-[#5B5FEF] p-1 ml-2 transition-colors"
                      title="Copy full SHA-256 hash"
                    >
                      {copiedId === record.id ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-[#6B7280]">
                    <span>Prev: {record.previous_hash ? record.previous_hash.slice(0, 10) + '...' : 'GENESIS'}</span>
                    <button
                      onClick={() => handleExportJSON(record)}
                      className="inline-flex items-center gap-1 text-[#7477F5] hover:text-[#5B5FEF]"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export JSON</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
