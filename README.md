# FinAI — Institutional AI CA Copilot & Stock Risk Evaluator

> **Venture-grade FinTech platform for the Indian financial ecosystem.**  
> Aesthetic Target: **Stripe × Linear × Perplexity × Wealthfront**

---

## 🌟 Executive Summary

**FinAI** is a production-grade dual-engine financial intelligence platform:
1. **AI Chartered Accountant Copilot**: Real-time statutory tax advisory grounded in official CBIC circulars and Income Tax provisions via live web scraping. Powered by Google Gemini Flash with **deterministic Python rule engines** (IEEE-754 Decimal precision) ensuring zero mathematical hallucinations.
2. **Real-Time Stock Market Risk & Health Evaluator**: Multi-factor quantitative scoring (0–100) for Indian stocks (NSE/BSE) across 4 pillars (Volatility, Valuation, Solvency, Quality). Strictly educational and SEBI-compliant with zero Buy/Sell/Hold recommendations.
3. **Cryptographic Audit Ledger**: Immutable SHA-256 block chain for all consultations, calculations, and stock assessments with JSON/PDF export capabilities.

---

## 🏛️ System Architecture

```
                               ┌─────────────────────────────┐
                               │   Vite + React + Tailwind   │
                               │  Stripe/Linear Design System│
                               └──────────────┬──────────────┘
                                              │ HTTP / JSON
                                              ▼
                               ┌─────────────────────────────┐
                               │     FastAPI API Gateway     │
                               └──────┬───────┬───────┬──────┘
                                      │       │       │
             ┌────────────────────────┘       │       └────────────────────────┐
             ▼                                ▼                                ▼
┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│   Live Statutory Search │      │  Deterministic Math     │      │   Real-Time Stock Quant │
│   DuckDuckGo Scraper    │      │  Decimal Rule Engines   │      │   Yahoo Finance API     │
│   CBIC / Income Tax     │      │  GST/Tax/CG/44ADA/EMI   │      │   4-Pillar Score (0-100)│
└────────────┬────────────┘      └────────────┬────────────┘      └────────────┬────────────┘
             │                                │                                │
             └───────────────────────┬────────┴────────────────────────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │    Gemini 1.5 Flash API     │
                      │  Contextual Synthesis &     │
                      │  Inline Citation Badges     │
                      └──────────────┬──────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │   SQLite SHA-256 Ledger     │
                      │  Immutable Audit Blockchain │
                      └─────────────────────────────┘
```

---

## 🎨 Design System & Tokens

FinAI implements Claude's exact dark-mode first design palette:

| Token | Hex Code | Role |
| :--- | :--- | :--- |
| **Background Base** | `#0B0E14` | Main application canvas |
| **Surface / Card** | `#12151C` | Elevated content surfaces |
| **Elevated Hover** | `#181C25` | Interactive card states |
| **Border Subtle** | `#232732` | 1px clean separation lines |
| **Brand Navy** | `#1B2A4A` | Institutional badge backgrounds |
| **Primary Accent** | `#5B5FEF` | Electric Indigo buttons & focus |
| **Success / Savings** | `#22C55E` | Emerald Green tax savings & green flags |
| **Warning** | `#F59E0B` | Amber regulatory caution flags |
| **Risk / Blocked** | `#EF4444` | Crimson blocked credit & volatility alerts |
| **Typography** | Inter + Geist/JetBrains Mono | Inter for narrative, Monospace for all financial numbers |

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.10+** (Tested on Python 3.13)
- **Node.js 18+** (Tested on Node.js v24)
- **Git**

### 1-Click Launch (Windows)
Double-click **`start.bat`** in the project root. It will automatically:
1. Copy `.env.example` to `.env` (if missing).
2. Install Python dependencies.
3. Start the FastAPI backend on `http://localhost:8000`.
4. Start the Vite React frontend on `http://localhost:5173`.
5. Open your default browser.

### Manual Launch

**1. Backend**:
```bash
cd backend
python -m pip install -r requirements.txt
python main.py
```

**2. Frontend**:
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Environment Configuration

Create a `.env` file in the project root:
```env
# Google Gemini API Key (Free tier from https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```
*(Note: If `GEMINI_API_KEY` is omitted, FinAI gracefully switches to deterministic institutional synthesis with real math and live search).*

---

## 👨‍🏫 Presentation Guide for College Examiners & Hackathons

1. **AI CA Copilot (With Live Search)**:
   - Click the preset chip: *"💼 ₹45L Freelancer US Export & 44ADA"*.
   - Point out the **inline citation pills** (`[CBIC Notification]`, `[Income Tax Dept]`).
   - Hover over the citation pill to demonstrate the live popover preview.
   - Show the **"⚙ Computed by Deterministic Rule Engine"** card proving zero hallucinated numbers.
2. **Old vs New Tax Regime Comparison**:
   - Click: *"📊 ₹18L Salary: Old vs New Regime Comparison"*.
   - Point out the side-by-side comparison table, animated savings badge, and Section 87A rebate calculation.
3. **Stock Risk & Health Evaluator**:
   - Enter `RELIANCE`, `TCS`, or `ZOMATO`.
   - Show the animated semicircular gauge sweep (0–100).
   - Walk through the 4 quantitative sub-pillars (Volatility, Valuation, Solvency, Quality).
   - Highlight the non-dismissible **SEBI educational disclaimer** to demonstrate regulatory compliance.
4. **Cryptographic Audit Ledger**:
   - Click **"Audit Drawer"** in the top bar.
   - Show the immutable SHA-256 block hashes and click **"Export JSON"**.
