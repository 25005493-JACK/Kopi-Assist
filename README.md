# ☕ Kopi-Assist: Smart AI-Driven Financial Health Assistant for F&B & Retail SMEs

**Kopi-Assist** is an intelligent financial monitoring, risk prediction, and anomaly detection platform tailored specifically to safeguard Small and Medium Enterprises (SMEs)—particularly in the food & beverage (F&B) and retail sectors—against cash flow insolvency, operational leaks, and billing fraud.

By connecting headless transactional databases (via Baserow) with Google Gemini AI models, Kopi-Assist monitors transaction patterns, compares company performance against industry benchmarks, identifies operational anomalies, and forecasts the cash flow consequences of macroeconomic and operational incidents.

---

## ✨ Features

### 1. 📊 Interactive Financial Dashboard
* **Composed Visualizations:** Charts monthly income and expenses as distinct visual bars.
* **Net Flow Tracker:** Overlays a solid line graphing net cash flow trends (turning orange to indicate deficit periods).
* **Tailored Benchmarks:** Displays a gold-dashed overlay showing the sector-specific average net margin (e.g., F&B: 12%, Retail: 8%, Services: 25%) dynamically computed against the company's monthly revenue.
* **Smart Forecasts:** Appends a 1-month future cash flow projection calculated using a rolling 3-month moving average of current historical records.

### 2. 🔍 Real-Time Anomaly & Leakage Detection
* **Hybrid Scan Engine:** Pairs fast heuristic screening with Gemini AI reasoning to detect duplicate billing, atypical high-value asset purchases, vague miscellaneous charges, and suspicious claims.
* **Accountability & PIC Tracking:** Extracts the Person-in-Charge (PIC) from raw descriptions via regex and metadata tags (e.g., `[PIC: Name]`) to establish clear team ownership.
* **Severity Mapping:** Categorizes risks into color-coded flags (High, Medium, Low) with explicit calculations on how a transaction breached safety thresholds.

### 3. 🔮 Predictive Scenario Planner & Sandbox
* **Macro & IT Incident Presets:** Simulates major operational shocks including **System Outages (POS failures)**, **Logistics/Supply Chain Bottlenecks**, **Economic Downturns**, and **Festive Season Surges**.
* **3-Month Cash Forecasts:** Generates simulated forecasts warning business owners of cash reserve impacts if no defensive action is taken over a rolling 3-month window.
* **Interactive Sandbox:** Provides manual slider controls allowing managers to model custom fluctuations in revenue or expenses and receive real-time mitigation advice.

### 4. 🗂️ Frictionless Data Management
* **API-First Database:** Integrates with a Baserow database for real-time transaction updates.
* **OCR File Parser:** Automatically extracts transaction details from uploaded `.csv`, `.txt`, and invoice images (`.png`, `.jpg`) using Gemini OCR, with a robust fallback to regex rules.
* **E-Invoice Generator:** Instantly logs new transactions to the database.

### 5. 🌐 Multi-Lingual Support & AI Chat
* **Localization:** Supports English (EN), Bahasa Melayu (BM), and Chinese (中文) languages for a localized experience.
* **Interactive AI Chatbot:** An embedded conversational assistant that lets owners ask questions about their cash flows, recent anomalies, or financial health in real-time.

---

## 🏗️ Tech Stack

* **Frontend:** Next.js 15+ (App Router), Recharts
* **Backend:** Next.js Serverless API Routes
* **Database:** Baserow Cloud API
* **AI Engine:** Google Gemini API (`gemini-2.0-flash`)
* **Deployment:** Vercel

---

## 🚀 Getting Started

### 1. Prerequisite Setup
Install the dependencies and prepare your local environment configuration:
```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and configure your API credentials and table details:
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
Open [http://localhost:3000](http://localhost:3000) in your browser. If you encounter Turbopack caching issues, you can clear the cache and run:
```powershell
Remove-Item -Recurse -Force .next; npm run dev
```

### 3. Sync Database with Simulated Datasets
Kopi-Assist includes simulated datasets preloaded with realistic financial trends and anomalies. To clear and populate your Baserow table for **Jack Enterprise** (Company ID: 3), run:
```bash
node sync-baserow.mjs
```

---

## 📊 Datasets & Embedded Anomalies

### 1. Jack Enterprise (Retail Sector)
Contains 3 positive cash flow months (Jan, Feb, Mar) followed by 3 negative months (Apr, May, Jun) with 5 embedded anomalies:
* **Jan 22 (Claims):** RM 950 claim for a business dinner (excessive entertainment cost).
* **Feb 14 (Office Equipment):** RM 2,500 MacBook Pro purchase (atypical asset buy for a standard retail storefront).
* **Mar 11 (Miscellaneous):** RM 1,500 vague transaction with no itemized description or category breakdown.
* **May 19 (Claims):** RM 1,100 business trip claim lacking receipt verification.
* **Jun 11 (Utilities):** RM 420 bill posted within 24 hours of a previous RM 450 bill (near-duplicate utility charge).

### 2. Oriental Tea (F&B Sector)
Located at `Data/Oriental Tea FnB/oriental_tea_financial_data.txt`. Upload this file via the **Data Management** panel to test F&B industry benchmark margin lines (~RM 2,400/mo net profit based on F&B parameters).

---

## ⚙️ Deployment on Vercel
1. Import your repository to Vercel.
2. Navigate to **Settings → Environment Variables** and add all variables defined in `.env.local`.
3. Deploy. Vercel automatically sets up the serverless routes.
