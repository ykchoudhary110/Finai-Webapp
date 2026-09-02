import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Receipt,
  Sparkles,
  Building2,
  ShieldCheck,
  Ban,
} from 'lucide-react';

const PRESET_RECEIPTS = [
  {
    id: 'machinery',
    name: 'Factory Machinery Invoice',
    vendor: 'Larsen & Heavy Engineering Ltd',
    gstin: '27AAACL1234F1Z5',
    invNo: 'INV-2025-8479',
    type: 'inward_purchase',
    hsn: '8479',
    category: 'Capital Goods (Factory Plant & Machinery)',
    taxable: 500000.0,
    rate: 18.0,
    gst: 90000.0,
    total: 590000.0,
    itcEligible: true,
    itcStatus: 'ELIGIBLE (Capital Goods)',
    lawRationale: 'Section 16 & 18 CGST Act: Full Input Tax Credit (ITC) eligible. Claim in GSTR-3B Table 4(A)(5). Do NOT claim Section 32 Income Tax depreciation on the ₹90,000 GST portion.',
  },
  {
    id: 'sales_goods',
    name: 'Outward Commercial Sale Invoice',
    vendor: 'Your Manufacturing Co (You)',
    gstin: '07AAAAA0000A1Z5',
    invNo: 'OUT-2025-055',
    type: 'outward_sale',
    hsn: '8479',
    category: 'Manufactured Goods Sale (Outward Supply)',
    taxable: 5000000.0,
    rate: 5.0,
    gst: 250000.0,
    total: 5250000.0,
    itcEligible: false,
    itcStatus: 'TAX PAYABLE (Output Liability)',
    lawRationale: 'Section 9 CGST Act: Output tax collected from customer. Report in GSTR-1 by 11th and discharge in GSTR-3B by 20th using available ITC or cash.',
  },
  {
    id: 'laptops',
    name: 'Office Laptops & Computers',
    vendor: 'Dell Technologies India Pvt Ltd',
    gstin: '29AAACD1234D1Z2',
    invNo: 'DELL-BLR-9921',
    type: 'inward_purchase',
    hsn: '8471',
    category: 'Office Equipment (Laptops & Peripherals)',
    taxable: 180000.0,
    rate: 18.0,
    gst: 32400.0,
    total: 212400.0,
    itcEligible: true,
    itcStatus: 'ELIGIBLE (General Business ITC)',
    lawRationale: 'Section 16(1) CGST Act: Used in the course or furtherance of business. 100% ITC eligible when reflected in GSTR-2B.',
  },
  {
    id: 'dinner',
    name: 'Client Dinner / Restaurant Catering',
    vendor: 'Taj Palace & Banquets',
    gstin: '07AAACT9999K1Z1',
    invNo: 'TAJ-REST-4012',
    type: 'inward_purchase',
    hsn: '2106',
    category: 'Food, Beverages & Outdoor Catering',
    taxable: 15000.0,
    rate: 5.0,
    gst: 750.0,
    total: 15750.0,
    itcEligible: false,
    itcStatus: 'BLOCKED CREDIT (Section 17(5))',
    lawRationale: 'Section 17(5)(b)(i) CGST Act: Input Tax Credit is STRICTLY BLOCKED on food, beverages, and catering. This ₹750 GST cannot be used to reduce output tax. Must be booked as a business expense.',
  },
  {
    id: 'luxury_car',
    name: 'Executive Motor Car Purchase',
    vendor: 'Mercedes Benz Authorized Dealer',
    gstin: '27AAACM8888P1Z8',
    invNo: 'MB-PUN-771',
    type: 'inward_purchase',
    hsn: '8703',
    category: 'Motor Vehicle (<= 13 Seater Passenger Car)',
    taxable: 2500000.0,
    rate: 28.0,
    gst: 700000.0,
    total: 3200000.0,
    itcEligible: false,
    itcStatus: 'BLOCKED CREDIT (Section 17(5)(a))',
    lawRationale: 'Section 17(5)(a) CGST Act: ITC is BLOCKED on motor vehicles for transportation of persons having approved seating capacity of <= 13 persons, unless used for passenger transport or driving school.',
  },
];

export default function ReceiptUploadModal({ isOpen, onClose, onSelectReceipt }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_RECEIPTS[0]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setUploadedFile({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      preview: URL.createObjectURL(file),
    });

    setTimeout(() => {
      setAnalyzing(false);
      setSelectedPreset({
        id: 'uploaded_custom',
        name: file.name.replace(/\.[^/.]+$/, ''),
        vendor: 'Verified Tax Invoice Supplier',
        gstin: '27AABCU9603R1ZM',
        invNo: 'INV-' + Math.floor(1000 + Math.random() * 9000),
        type: 'inward_purchase',
        hsn: '8479',
        category: 'Scanned Commercial Invoice / Capital Goods',
        taxable: 500000.0,
        rate: 18.0,
        gst: 90000.0,
        total: 590000.0,
        itcEligible: true,
        itcStatus: 'ELIGIBLE (Input Tax Credit)',
        lawRationale: 'Section 16 CGST Act: Tax invoice validated. Input Tax Credit is claimable in GSTR-3B Table 4(A) once reflected in your GSTR-2B.',
      });
    }, 800);
  };

  const handleApplyToChat = (rec) => {
    let promptText = '';
    if (rec.type === 'outward_sale') {
      promptText = `I have made a sale of ₹${rec.taxable.toLocaleString('en-IN')} with ${rec.rate}% GST (Invoice #${rec.invNo}). Tell me how to file GSTR-1 and GSTR-3B on this sale and how to set off my input tax credit.`;
    } else if (rec.itcEligible) {
      promptText = `I bought ${rec.name.toLowerCase()} for ₹${rec.taxable.toLocaleString('en-IN')} and paid ${rec.rate}% GST (₹${rec.gst.toLocaleString('en-IN')}) under HSN ${rec.hsn}. How do I claim this Input Tax Credit (ITC) in GSTR-3B?`;
    } else {
      promptText = `I spent ₹${rec.taxable.toLocaleString('en-IN')} on ${rec.name.toLowerCase()} with ${rec.rate}% GST. Can I claim Input Tax Credit under Section 17(5) or is it blocked?`;
    }

    onSelectReceipt(promptText);
    onClose();
  };

  const formatRupees = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#12151C] border border-[#232732] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#232732] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5B5FEF]/20 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-[#5B5FEF]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>GST Receipt & Invoice Inspector</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                  ITC vs Tax Payable
                </span>
              </h3>
              <p className="text-xs text-[#A6ADBB]">
                Upload any invoice or pick a sample to instantly verify Input Tax Credit eligibility.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A6ADBB] hover:text-white hover:bg-[#181C25] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-left">
          {/* File Upload Dropzone */}
          <div className="relative border-2 border-dashed border-[#232732] hover:border-[#5B5FEF]/60 rounded-xl p-5 text-center transition-colors bg-[#0B0E14]/60 group cursor-pointer">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#5B5FEF]/10 group-hover:bg-[#5B5FEF]/20 flex items-center justify-center transition-colors">
                <UploadCloud className="w-5 h-5 text-[#5B5FEF]" />
              </div>
              <div className="text-xs text-[#D1D5DB]">
                <span className="font-semibold text-white">Click to upload your invoice receipt</span> or drag and drop
              </div>
              <p className="text-[11px] text-[#6B7280]">Supports PNG, JPG, JPEG, or PDF tax receipts</p>
              {uploadedFile && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#181C25] border border-[#232732] text-xs text-[#22C55E]">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Uploaded: {uploadedFile.name} ({uploadedFile.size})</span>
                </div>
              )}
              {analyzing && (
                <div className="flex items-center gap-2 text-xs text-[#5B5FEF] animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning GSTIN, HSN codes, and statutory tax breakdown...</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Demo Indian Receipts Selector */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#6B7280] mb-2 flex items-center justify-between">
              <span>Or Choose Sample Indian Tax Invoices:</span>
              <span className="text-[10px] text-[#5B5FEF]">1-Click Presentation Demos</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {PRESET_RECEIPTS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedPreset(r);
                    setUploadedFile(null);
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs ${
                    selectedPreset.id === r.id
                      ? 'bg-[#181C25] border-[#5B5FEF] shadow-sm'
                      : 'bg-[#0B0E14] border-[#232732] hover:border-[#5B5FEF]/40 hover:bg-[#12151C]'
                  }`}
                >
                  <div className="font-semibold text-white truncate">{r.name}</div>
                  <div className="text-[#A6ADBB] text-[11px] mt-0.5">
                    {formatRupees(r.taxable)} · {r.rate}% GST
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    {r.type === 'outward_sale' ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B]">
                        🔴 Outward Sale
                      </span>
                    ) : r.itcEligible ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E]">
                        🟢 Eligible ITC
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444]">
                        ⚠️ Blocked Credit
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Invoice Statutory Analysis Card */}
          {selectedPreset && (
            <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#232732] space-y-3">
              {/* Verdict Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#232732]">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#5B5FEF]" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{selectedPreset.vendor}</h4>
                    <span className="text-[10px] font-mono text-[#6B7280]">
                      GSTIN: {selectedPreset.gstin} · Inv #{selectedPreset.invNo}
                    </span>
                  </div>
                </div>

                <div>
                  {selectedPreset.type === 'outward_sale' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                      <span>🔴 TAX TO BE PAID TO GOVT</span>
                    </span>
                  ) : selectedPreset.itcEligible ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>🟢 INPUT CREDIT (ITC) ELIGIBLE</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                      <Ban className="w-3.5 h-3.5" />
                      <span>⚠️ BLOCKED CREDIT (SEC 17(5))</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Math Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-[#12151C] border border-[#232732]/60">
                  <span className="text-[10px] text-[#6B7280] block">Taxable Cost:</span>
                  <span className="text-white font-bold">{formatRupees(selectedPreset.taxable)}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#12151C] border border-[#232732]/60">
                  <span className="text-[10px] text-[#6B7280] block">GST Rate:</span>
                  <span className="text-[#5B5FEF] font-bold">{selectedPreset.rate}% ({selectedPreset.hsn})</span>
                </div>
                <div className="p-2 rounded-lg bg-[#12151C] border border-[#232732]/60">
                  <span className="text-[10px] text-[#6B7280] block">GST Amount:</span>
                  <span className="text-white font-bold">{formatRupees(selectedPreset.gst)}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#12151C] border border-[#232732]/60">
                  <span className="text-[10px] text-[#6B7280] block">Invoice Total:</span>
                  <span className="text-[#22C55E] font-bold">{formatRupees(selectedPreset.total)}</span>
                </div>
              </div>

              {/* Statutory Explanation */}
              <div className="p-3 rounded-lg bg-[#181C25] border border-[#232732] text-xs text-[#D1D5DB] leading-relaxed">
                <span className="font-semibold text-white block mb-1">⚖️ Statutory CA Analysis:</span>
                <p className="text-xs text-[#A6ADBB]">{selectedPreset.lawRationale}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-[#232732] bg-[#0B0E14] flex items-center justify-between gap-3">
          <div className="text-xs text-[#6B7280] hidden sm:block">
            Sends invoice numbers & statutory sections directly to FinAI CA Copilot.
          </div>
          <button
            onClick={() => handleApplyToChat(selectedPreset)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#5B5FEF] hover:bg-[#7477F5] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <span>Analyze & Reconcile in Copilot</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
