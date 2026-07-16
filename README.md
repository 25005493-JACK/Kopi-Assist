# 🚀 SME-Assist: Smart AI-Driven Financial Health Assistant for SMEs

SME-Assist is an intelligent financial monitoring, risk prediction, and anomaly detection platform designed specifically to safeguard Small and Medium Enterprises (SMEs) against cash flow insolvency and operational leaks. 

By linking transactional databases (via Baserow) with Gemini AI API models, SME-Assist monitors transaction patterns, compares company performance against industry benchmarks, detects operational anomalies, and predicts the cash flow consequences of IT-related and macroeconomic incidents.

---

## ✨ Features

### 1. 📊 Interactive Financial Dashboard
*   **Composed Visualizations:** Charts monthly income and expenses as distinct visual bars.
*   **Net Flow Tracker:** Overlays a solid cyan line graphing net cash flow trends (dots turn orange to indicate deficit periods).
*   **Industry Benchmarks:** Displays a gold-dashed overlay showing the sector-specific average net margin (Retail: 8%, F&B: 12%, Services: 15%, etc.) dynamically computed against the company's average monthly revenue profile.

### 2. 🔍 Real-Time Anomaly & Leakage Detection
*   **Hybrid Scan Engine:** Pairs fast heuristic screening with Gemini LLM reasoning to identify duplicate billings, atypical high-value asset purchases, vague miscellaneous charges, and suspicious claims.
*   **PIC Tracking:** Extracts the Person-in-Charge (PIC) from raw descriptions via regex and metadata tags (`[PIC: Name]`) to establish clear team accountability.
*   **Severity Mapping:** Color-coded flags categorize risk levels (High, Medium, Low) with detailed calculations showing how the transaction breached allowance thresholds.

### 3. 🔮 Predictive Scenario Planner & Sandbox
*   **Macro & IT Incident Presets:** Simulates major shocks, including **System Outages**, **Logistics/Supply Chain Bottlenecks**, **Economic Downturns**, and **Festive Season Surges**.
*   **3-Month Consequence Forecasts:** Generates simulated forecasts warning business owners of what will happen to their business cash reserves if no defensive action is taken over a rolling 3-month window.
*   **Interactive Manual Sandbox:** Slider controls allow managers to custom-model changes in revenue and expenses and receive real-time, context-specific mitigation advice.

### 4. 🗂️ Frictionless Data Management
*   **API-First Database:** Integrates with headless cloud databases (Baserow) for real-time transaction updates.
*   **File Uploader & OCR:** Parses uploaded `.csv`, `.txt`, and invoice images (`.png`, `.jpg`), extracting fields with Gemini OCR and falling back to regex rules if API limits are hit.
*   **E-Invoice Generator:** Creates transaction logs instantly.

---

## 🏗️ Tech Stack

*   **Frontend:** Next.js 15+ (App Router), Recharts
*   **Backend:** Next.js Serverless API Routes
*   **Database:** Baserow Cloud API
*   **AI Engine:** Google Gemini API (`gemini-2.0-flash` with automatic free-tier quota fallback)
*   **Deployment:** Vercel

---

## 🚀 Getting Started

### 1. Prerequiste Setup
Install dependencies and prepare your local environment config:
```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and configure your API tokens:
```env
BASEROW_API_TOKEN=your_token
BASEROW_BASE_URL=https://api.baserow.io
BASEROW_COMPANY_TABLE_ID=your_company_table_id
BASEROW_FINANCIAL_TABLE_ID=your_financial_table_id
GEMINI_API_KEY=your_gemini_key
```

### 2. Run the Development Server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000). If Turbopack cache issues occur, run:
```bash
Remove-Item -Recurse -Force .next; npm run dev
```

### 3. Sync Database with Simulated Datasets
SME-Assist includes simulated datasets preloaded with realistic financial trends and anomalies. To clear and populate your Baserow table for **Jack Enterprise** (Company ID: 3), run:
```bash
node sync-baserow.mjs
```

---

## 📊 Datasets & Embedded Anomalies

### 1. Jack Enterprise (Retail Sector)
Contains 3 positive cash flow months (Jan, Feb, Mar) followed by 3 negative months (Apr, May, Jun) with 5 embedded anomalies:
*   **Jan 22 (Claims):** RM 950 claim for a business dinner (excessive entertainment cost).
*   **Feb 14 (Office Equipment):** RM 2,500 MacBook Pro purchase (atypical asset buy for a standard retail storefront).
*   **Mar 11 (Miscellaneous):** RM 1,500 vague transaction with no itemized description or category breakdown.
*   **May 19 (Claims):** RM 1,100 business trip claim lacking receipt verification.
*   **Jun 11 (Utilities):** RM 420 bill posted within 24 hours of a previous RM 450 bill (near-duplicate utility charge).

### 2. Oriental Tea (F&B Sector)
Located at `Data/Oriental Tea FnB/oriental_tea_financial_data.txt`. Upload this file via the **Data Management** panel to test F&B industry benchmark margin lines (~RM 2,400/mo net profit based on F&B parameters).

---

## ⚙️ Deployment on Vercel
1.  Import your repository to Vercel.
2.  Navigate to **Settings → Environment Variables** and add all variables defined in `.env.local`.
3.  Deploy. Vercel automatically sets up the serverless routes.
