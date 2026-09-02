# FinAI — Offline Payment Reconciliation Agent

> **Built for:** Razorpay Buildathon · Track 04: AI Finance Controller  
> **Core Principle:** Deterministic financial reconciliation engine with a polished dashboard UI. Zero LLM calls. Zero hallucinations. 100% offline in-browser execution.

---

## ⚡ Overview

Financial controllers and treasury managers cannot tolerate hallucinations, latency, or data privacy risks when reconciling transaction ledgers with payment gateways and bank statements.

**FinAI** is a **pure-client, zero-dependency, deterministic 3-way payment reconciliation engine** engineered to run entirely in the browser with **zero internet connection**. It evaluates multi-source financial feeds across **Razorpay Settlements**, **Internal ERP Ledgers**, and **Core Banking Statements**, instantly classifying transactions, isolating fee deductions, identifying timing transit delays, and detecting anomalous or fraudulent records.

---

## 🔒 Hard Constraints & Demo Guarantees

| Constraint | FinAI Implementation |
| :--- | :--- |
| **Zero External Requests** | No CDN scripts, no Google Fonts, no remote images. 100% self-contained. |
| **Offline First** | Works via `file://` protocol directly (double-click `index.html`) with zero console errors. |
| **Deterministic Math** | Pure algorithms in O(N) time complexity. Same seed = identical output every time. |
| **No LLM Hallucinations** | Pure rule-based classification heuristics. No floating-point math drift. |
| **Zero Build Tools** | Vanilla HTML5, CSS3 Custom Properties, and ES6 JavaScript. No npm, no Vite, no React. |
| **Fault Tolerant** | All operations wrapped in resilient `try/catch` handlers with graceful inline error states. |

---

## 📊 3-Way Reconciliation Engine Rules

FinAI groups records into a hash index across `txn_id` and runs 5 deterministic classification rules:

```
                                  [ Financial Feeds ]
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
[ Razorpay Settlements ]         [ Internal ERP Ledger ]         [ Core Bank Statement ]
         │                                 │                                 │
         └─────────────────────────────────┼─────────────────────────────────┘
                                           │
                              [ O(N) Hash Index Construction ]
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
[ Match Heuristics ]                                              [ Anomaly Detection ]
 ├── 1. Clean Match (1:1 Exact)                                    ├── 4. Duplicate Billing
 ├── 2. Fee Adjusted (~2% MDR Fee)                                 ├── 5. Missing in Bank
 └── 3. Delayed Settlement (1-2 Day Float)                         └── 6. Unrecognized Charge
```

1. **Clean Match (1:1)**:
   - Exact ledger amount matches bank statement amount within ₹0.50 tolerance and identical transaction dates.
2. **Fee Adjusted (~2% Razorpay MDR)**:
   - Bank credit differs by Razorpay's standard ~2% settlement fee formula: `bankAmount = round(ledgerAmount * 0.98 - 2)`. Reconciles automatically without human intervention.
3. **Delayed Settlement (Float / Transit Delay)**:
   - Amount matches, but bank value date is 1–2 days after the order date due to banking holidays or settlement clearing windows.
4. **Duplicate Ledger Entry (ERP Double-Billing)**:
   - The same `txn_id` appears multiple times in the internal ledger against only one bank settlement credit. Flags capital discrepancy.
5. **Missing in Bank (Unsettled / In Transit)**:
   - Order recorded in internal ERP and settled in gateway, but zero bank credit received.
6. **Unrecognized Bank Charge (Anomalous / Fraud Flag)**:
   - Bank credit entry with no corresponding order or settlement record. Automatically flagged for forensic manual review.

---

## 📁 Repository Structure

```
Finai-Webapp/
├── index.html           # Structure & markup; zero CDNs, hand-coded inline SVGs
├── style.css            # Design tokens, responsive CSS grid, table shells & animations
├── data-generator.js    # Seeded PRNG synthetic dataset generator (zero DOM access)
├── reconciler.js        # Deterministic reconciliation engine (zero DOM access)
├── charts.js            # Responsive SVG/CSS horizontal bar chart renderer
├── app.js               # Application controller & DOM event wiring
└── finai/               # Standalone mirror copy for subdirectory execution
```

### Separation of Concerns
- **`data-generator.js`**: Pure functions. Uses a Mulberry32 PRNG to generate controlled, reproducible datasets of 60–80 transactions with realistic Indian customer names, Razorpay settlements, bank statements, and injected edge cases.
- **`reconciler.js`**: Pure functions. Takes raw datasets in, builds hash maps, applies classification heuristics, computes match rates, aggregates capital at risk, and outputs plain-English business reasons.
- **`charts.js`**: Pure render component. Generates horizontal proportional breakdown bars with SVG category icons and staggered entrance transitions.
- **`app.js`**: UI controller. Handles synchronized count-up animations, simulated agent execution delay (450ms), interactive category filters, tab switches, and accordion expansions.

---

## 🚀 How to Run

### Option 1: Direct File Launch (No Server Required)
1. Clone or download this repository.
2. Double-click **`index.html`** in your file manager (File Explorer / Finder).
3. The app opens immediately via `file://` protocol with zero console warnings or errors.

### Option 2: Local HTTP Server (Optional)
```bash
# Python
python -m http.server 8000

# Or Node.js
npx serve .
```
Visit `http://localhost:8000`.

---

## 🧪 Verification Checklist for Judges

1. **Verify Offline Isolation**:
   - Open browser Developer Tools (`F12` or `Ctrl+Shift+I`).
   - Go to the **Network** tab.
   - Refresh the page or click **"Re-run Reconciliation"**.
   - **Result:** **0 network requests**. No external fonts, no telemetry, no tracking scripts.
2. **Test Engine Determinism & Resilience**:
   - Click **"Re-run Reconciliation"** 5+ times rapidly.
   - Observe smooth button feedback (spinning refresh icon, 450ms agent working delay).
   - Metrics always land within consistent, realistic ranges (Match Rate ~70–75%, Exceptions never zero, Amount at Risk accurately calculated).
3. **Inspect Plain-English Audit Explanations**:
   - Navigate to the **"Exceptions"** tab.
   - Filter by **"Fee Adjusted"**, **"Delayed"**, **"Duplicate"**, **"Missing"**, and **"Unrecognized"**.
   - Notice the 3px color-coded left border on exception rows and clear audit rationale.
4. **Audit Raw Data**:
   - Navigate to the **"Raw Data"** tab.
   - Expand the accordions to audit raw records across Razorpay Settlements, Bank Statement, and Internal Ledger.

---

## 🏆 Razorpay Buildathon Compliance

- **Track:** Track 04 — AI Finance Controller
- **Design System:** Deep muted navy (`#1F3A5F`), forest green (`#2E7D5B`), amber gold (`#B8860B`), crimson red (`#C0392B`), clean tabular typography.
- **License:** MIT
