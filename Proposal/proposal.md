# Kopi-Assist: AI-Driven Financial Health Assistant for F&B & Retail SMEs

**Team Name:** Hack Attack 3
**Project Name:** Kopi-Assist
**Case Study Category:** Case Study 1 - AI-Driven IT Incident Prediction & Financial Risk Detection
**Team Members:** Tan Wei Feng, Member 2, Member 3, Member 4

---

## 1. Introduction

**Kopi-Assist** is an intelligent, AI-powered financial monitoring, risk prediction, and anomaly detection platform purpose-built for Small and Medium Enterprises (SMEs), particularly those operating in the Food & Beverage (F&B) and retail sectors. The platform is designed to protect SME owners against cash flow insolvency, billing fraud, operational leaks, and the financial consequences of external macroeconomic shocks.

### Background & Context

SMEs in Malaysia form the backbone of the national economy, accounting for approximately 97.4% of all business establishments and contributing close to 38% of GDP. Yet they consistently suffer disproportionately from three critical operational blind spots:

1. **No real-time financial visibility** - Most SME owners operate from a single notebook ledger, a spreadsheet, or from memory, with no consolidated view of income versus expenditure trends.
2. **Fraud and leakage blind spots** - Without structured anomaly detection, duplicate billing, excessive claims, and vague miscellaneous charges go unnoticed until they compound into significant losses.
3. **Zero proactive risk planning** - SMEs are entirely reactive; they only discover operational financial risk (e.g. cash flow crisis from an MCO lockdown or festive inventory overstock) after it occurs, when it is already too late to mitigate.

Kopi-Assist solves all three problems in a single, unified platform by connecting a real-time transactional database (Baserow) with Google Gemini AI models to deliver intelligent financial dashboards, anomaly scanning, predictive scenario planning, and an AI-powered chatbot fully localised for Malaysian SME owners.

### Project Features

- **Interactive Financial Dashboard** - Monthly cash flow charts with net flow tracking, industry benchmark overlays, and 1-month AI forecast projection computed from a 3-month rolling moving average.
- **Real-Time Anomaly & Leakage Detection** - Hybrid heuristic + Gemini AI scanning engine that detects suspicious claims, duplicate billings, vague miscellaneous charges, atypical asset purchases, and near-duplicate utility bills within 48 hours.
- **Predictive Scenario Planner & Interactive Sandbox** - AI-generated 6-month cash flow simulations for 7 operational risk scenarios (Festive Season, MCO Lockdown, Economic Downturn, Supply Chain Disruption, Platform Shutdown, IT System Outage, Operational Overload), plus a manual slider sandbox for custom financial projections.
- **Frictionless Data Management** - API-first Baserow integration with multi-format file upload (CSV, TXT, PNG, JPG) powered by Gemini OCR, PapaParse, and a regex fallback engine, alongside an E-Invoice and Receipt PDF generator and Annual Report exporter.
- **Multi-Lingual AI Chatbot** - Embedded conversational AI financial advisor supporting English, Bahasa Melayu, and Chinese, with context-aware advice grounded in live company transaction data.

### Key Technologies

Next.js 16 (App Router), Google Gemini API (gemini-2.0-flash), Baserow Cloud API, Recharts, jsPDF, and Vercel for serverless deployment.

---

## 2. Problem Statement

### Identified Problem

Malaysian F&B and retail SMEs are acutely vulnerable to three interconnected financial threats that frequently result in cash flow insolvency, business closure, or undetected financial fraud.

**Threat 1 - Invisible Operational Leakage:**
Employee expense claims, duplicated vendor invoices, and poorly documented miscellaneous charges are extremely common in SME environments where internal controls are minimal. A RM 950 business dinner claim, a RM 2,500 MacBook purchase for a retail storefront, or a RM 420 utility bill posted within 24 hours of a previous RM 450 charge are individually small enough to evade attention. Collectively they represent a category of financial leakage that, left undetected, compounds into thousands of ringgit in unrecoverable losses per year.

**Threat 2 - Cash Flow Blindness:**
Without a centralised, real-time view of cash flows versus industry benchmarks, SME owners cannot determine whether their business performance is healthy, declining, or already in distress. The average F&B SME operates on a net margin of only 12%, meaning even a modest 10% overspend in a single month can flip a profitable operation into a cash flow deficit.

**Threat 3 - Reactive Posture Toward Operational Shocks:**
SMEs have no structured mechanism to model the financial consequence of an MCO lockdown, a supply chain disruption, a platform outage, or a festive season demand spike before it hits. When it does hit, the response is purely reactive: scrambling for emergency credit, emergency stock, or emergency IT support at far greater cost than proactive planning would have required.

### Why It Matters & Who Is Affected

These three threats directly affect approximately **900,000 F&B and retail SMEs** registered in Malaysia. SMEs with fewer than 10 staff (the micro-SME segment) are most vulnerable - they have no dedicated finance team, no enterprise ERP, and no AI-powered monitoring. Financial distress in this segment often goes undetected until the company misses payroll or defaults on a supplier invoice.

### Supporting Data

- **SME Corp Malaysia (2023):** SMEs contribute 38.2% of GDP; 97.4% of all businesses in Malaysia are SMEs (SME Annual Report 2022/2023).
- **Bank Negara Malaysia (2023):** 60% of SME loan defaults are directly linked to poor cash flow management and insufficient early-warning monitoring.
- **DOSM (2023):** F&B sector average net profit margin is ~12% and retail sector is ~8% - the narrowest margins of any Malaysian industry, leaving virtually no buffer for undetected leakage.
- **Deloitte (2022):** Organisations without automated anomaly detection take an average of 207 days to identify internal financial fraud, by which time losses are often irreversible.

---

## 3. Aim and Objectives

### Aim

To build an accessible, AI-powered financial health platform that enables Malaysian F&B and retail SMEs to continuously monitor cash flow, detect billing anomalies in real time, and proactively simulate the financial impact of macroeconomic disruptions and operational incidents - empowering SME owners to make confident, data-driven decisions before problems escalate.

### Objectives

1. **Deliver real-time financial visibility** by building a dashboard that aggregates all transactional records from the Baserow database and renders monthly income, expense, and net cash flow trends in an interactive ComposedChart - updated within seconds of any data upload.

2. **Establish industry-relative performance benchmarking** by computing sector-specific net margin benchmarks (F&B: 12%, Retail: 8%, Services: 25%, Technology: 22%, Logistics: 10%, Healthcare: 18%, Education: 20%, Construction: 9%, E-Commerce: 14%, Manufacturing: 11%) against the company's actual average monthly revenue, overlaying the result as a dashed reference line so owners can immediately see if they are operating above or below industry standard.

3. **Detect financial anomalies and operational leakage automatically** by implementing a dual-engine scan: a heuristic rule layer (claim thresholds, asset purchase limits, miscellaneous flags, near-duplicate utility bill detection, duplicate voucher code flagging) reinforced by Gemini AI reasoning, returning severity-mapped anomaly cards (High / Medium / Low) with a full audit trail per flagged transaction including reason, formulation rule, threshold, step-by-step calculation, and the Person-in-Charge (PIC) responsible.

4. **Simulate and quantify the financial impact of 7 operational risk scenarios** - Festive Season Surge, MCO Lockdown, Economic Downturn, Supply Chain Disruption, Platform Shutdown, IT System Outage, and Operational Overload - each with a 6-month projected cash flow simulation, a prioritised action plan (3-5 steps), and a 2-3 sentence consequence narrative if no action is taken within 3 months.

5. **Provide an interactive cash flow sandbox** where business owners drag per-month income and expense sliders across a 6-month horizon to model custom financial scenarios, then request a real-time Gemini AI consultant analysis of their custom curve with a strategic action plan and projected consequence.

6. **Eliminate data entry friction** through a multi-format file parser accepting CSV, TXT, and invoice images (PNG/JPG) using Gemini Vision OCR as primary, gemini-1.5-flash as secondary fallback, and a local regex parser as tertiary fallback, with all parsed records bulk-committed to Baserow in batches of 200 tagged with source file and PIC metadata.

7. **Generate professional E-Invoices and Annual Financial Reports** as downloadable PDFs using jsPDF and jsPDF-AutoTable directly within the platform, enabling SMEs to produce audit-ready documentation without any external accounting software.

8. **Support Malaysian multi-lingual operation** with full interface localisation across English, Bahasa Melayu, and Mandarin Chinese, ensuring accessibility for all major ethnic business owner groups in Malaysia.

---

## 4. Methodology

### 4.1 Implementation

**Phase 1 - Foundation & Data Layer**

The project begins with establishing the core data layer using Baserow, a self-hosted-compatible API-first no-code database. Three primary tables are structured: (1) a companies table (company name, industry, headcount, average monthly revenue, outlet count, hashed password); (2) a financial_transactions table (date, type, category, amount, description, source file, PIC tag, voucher code); and (3) a menu table (storing menu item names and pricing parsed from the uploaded menu file during registration, used to validate and cross-reference sales). Next.js Serverless API Routes serve as the backend, authenticating against Baserow via token-based REST calls. bcryptjs handles secure password hashing for the SME login and register flow.

**Phase 2 - Dashboard & Benchmarking**

The financial dashboard aggregates all transaction records per company, computes monthly income and expense buckets, and renders them as a Recharts ComposedChart with grouped bars for income (green) and expenses (red) and a Line series for net cash flow (blue). A 1-month forward projection is appended using a 3-month rolling moving average of the most recent historical data, displayed as a semi-transparent projected bar with a dashed border. An industry benchmark net flow line is computed dynamically from avgMonthlyRevenue multiplied by sectorNetMarginRatio using a built-in lookup table covering 10 Malaysian industry sectors. Four KPI cards display Annual Income, Annual Expenses, Annual Net Flow, and All-Time Transactions. Four monthly cards display the same metrics for the current month. Below the chart, Gemini AI recommendations are rendered as a styled recommendation list.

**Phase 3 - Anomaly Detection Engine**

The anomaly detection pipeline is triggered on-demand. All records for the company are fetched from Baserow and passed first to Gemini gemini-2.0-flash with a structured prompt instructing it to identify unusual expense amounts, suspicious employee claims over RM 1,000, duplicate transactions (same amount, same description, same day), near-duplicate utility bills within 48 hours with amounts within RM 100, and duplicate voucher code redemptions across income records.

If the Gemini call fails due to rate limiting or an API error, a deterministic rule-based fallback engine applies five coded heuristics:

- **Rule 1 - Suspicious Claims:** Claim category expenses at or above RM 500 are flagged as suspicious_claim (medium severity); above RM 1,000 escalates to high severity. The calculation shows the RM amount versus the RM 500 limit with the exact overage.
- **Rule 2 - Atypical Asset Purchase:** Office Equipment category purchases at or above RM 2,000 are flagged as unusual_expense (high). Intended to catch high-value purchases inappropriate for a standard retail or F&B storefront profile.
- **Rule 3 - Vague Miscellaneous:** Miscellaneous category amounts at or above RM 1,000 are flagged as irregular_pattern (high), indicating a large unitemised expense lacking receipt or description justification.
- **Rule 4 - Near-Duplicate Utility:** Utility category entries are compared against all other utility entries. If a pair is found within 48 hours, with the same utility type (both electricity or both water) and same outlet branch, and amounts within RM 100 of each other, the later (second) transaction is flagged as duplicate (medium).
- **Rule 5 - Duplicate Voucher Code:** All income records sharing the same non-empty voucher code are grouped. Any entry after the first is flagged as duplicate_voucher (high).

Every anomaly card in the UI includes: date, category, amount, colour-coded severity badge, reason narrative, formulation rule (monospace code chip), threshold (red code chip), step-by-step calculation, and the PIC name extracted via regex from the [PIC: Name] tag embedded in the transaction description field at ingestion time.

**Phase 4 - Predictive Scenario Planner**

On demand, the prediction engine calls Gemini with a structured prompt containing the company profile and up to 100 recent transaction records, requesting 7 scenario objects: id, title, impact, severity, actions array, consequence string, and cashflow array (6 months of projected_income, projected_expenses, net_cashflow). A deterministic fallback is pre-coded for all 7 scenarios using revenue-ratio multipliers calibrated to each scenario type, ensuring the planner functions even without API access.

A dedicated Operation Failure Prediction module models POS system overload at transaction volumes from 5 TXN/min to 30 TXN/min, plotting system_down_risk percentage and stock_depletion_risk percentage on an AreaChart. This is specifically designed for F&B operators running multiple outlets who face the risk of operational collapse during lunch and dinner peak hours.

The Interactive Cash Flow Sandbox pre-populates 6 months of income and expense sliders based on the company's avg_monthly_revenue (expenses defaulting to 75% of revenue). Owners drag sliders per month and the AreaChart updates in real time. Clicking Ask AI for Advice sends the custom 6-month cashflow to Gemini, which responds with a consultant summary, strategic action list, and if-this-trajectory-continues consequence block.

**Phase 5 - Data Management & File Ingestion**

The data management panel provides a drag-and-drop upload zone. The backend handler (/api/financial/upload) routes by file extension: CSV and TXT files are parsed with PapaParse using header normalisation and date canonicalisation to YYYY-MM-DD. Image files (PNG, JPG, JPEG, WebP, BMP) are base64-encoded and passed to gemini-2.0-flash as inline image data with a structured extraction prompt. If the primary model fails, gemini-1.5-flash is attempted as a secondary fallback. If both fail, a filename-based regex parser extracts what it can and returns needsManual: true prompting the user to complete the record manually.

All parsed records are enriched with company_id, source filename, and a [PIC: Name] tag appended to the description if not already present, then bulk-inserted into Baserow via the batch endpoint in groups of 200.

The E-Invoice generator renders a jsPDF document from user-provided client details, line items (description, quantity, unit price), tax rate, and notes. The Annual Report generator exports a formatted PDF of the company's full-year income, expenses, and net flow broken down by month and category.

**Phase 6 - Multilingual AI Chatbot**

The embedded ChatBot component calls /api/ai/chat, which maintains multi-turn conversation history. Each API call injects a system prompt containing the company profile and the 50 most recent transactions, followed by the full conversation history, before appending the user's latest message and calling gemini-2.0-flash. A rule-based intent fallback handles 6 categories (greeting, revenue inquiry, expense inquiry, cash flow health check, anomaly check, strategic advice) by computing live metrics from the retrieved transaction records. The chat interface is accessible from both the Dashboard and the Anomaly & Prediction pages via an always-visible chat widget.

**Phase 7 - Testing & Refinement**

End-to-end testing is performed using two embedded mock datasets. Jack Enterprise (Retail sector, 6 months of data, 5 deliberately embedded anomalies covering all 5 detection rule types) validates the anomaly engine. Oriental Tea (F&B sector, multi-platform CSVs from FoodPanda, GrabFood, Shopee Food, and general ledger) validates the file parser, F&B benchmark overlay, and chatbot responses. Tests confirm: all 5 anomaly rules trigger correctly, benchmark overlays match the sector ratio, all 7 scenario cashflows render without live API access, and all supported file formats parse correctly to Baserow records.

### 4.2 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, Recharts 3.x |
| Backend | Next.js Serverless API Routes (Node.js runtime) |
| Database | Baserow Cloud API (REST, token-authenticated) |
| AI Engine | Google Gemini API - gemini-2.0-flash (primary), gemini-1.5-flash (OCR fallback) |
| File Parsing | PapaParse (CSV/TXT), Gemini Vision OCR (images), custom Regex fallback |
| PDF Generation | jsPDF, jsPDF-AutoTable |
| Authentication | bcryptjs password hashing, Baserow-backed user store |
| Internationalisation | Custom React i18n context (EN / BM / Chinese) |
| Deployment | Vercel (Serverless, global edge network) |

---

## 5. Potential Impact

### 5.1 Market Research

**Existing Solutions & Competitors**

| Solution | Limitation Relative to Kopi-Assist |
|---|---|
| QuickBooks / Xero | Enterprise-grade accounting, RM 50-250/month, steep learning curve, no AI anomaly detection, no scenario planning, not localised for Malaysia. |
| Wave Accounting | Free but US-centric, no Bahasa Melayu, no AI features, no cash flow forecasting or anomaly detection. |
| StoreHub / Wavemaker POS | Point-of-sale focused only. No financial monitoring, no anomaly detection, no predictive planning. |
| SQL Account | Desktop-installed ERP. Complex setup, no AI integration, no cloud-first architecture. |
| Bank SME Dashboards | Limited to one bank's transaction history. No cross-source aggregation, no anomaly scan, no scenario modelling. |

**What Makes Kopi-Assist Unique (Compared to Competitors):**

1. **AI-First with Deterministic Fallbacks vs. Static Rules:** Unlike traditional desktop accounting systems (such as SQL Account) or cloud accounting platforms (like QuickBooks/Xero) which rely entirely on manual data entry and static business rules, Kopi-Assist utilizes Google Gemini AI to analyze logs and transaction context. If the AI model faces API rate limits or internet connectivity drops, Kopi-Assist switches to fully-coded heuristic fallbacks—an architecture lacking in static competitors.

2. **F&B & Retail Specificity vs. Generalist Ledger Systems:** General accounting software (Xero or Wave) are generalist ledger systems requiring extensive setup of charts of accounts, and POS systems (like StoreHub) focus strictly on checkout operations. Kopi-Assist is pre-configured with Malaysian F&B and Retail sector benchmark net margins. Its scenario planner natively models sector-specific events (e.g. food delivery platform MCO restrictions, GrabFood/FoodPanda surges), and its OCR parser is built to recognize raw formats from Shopee Food, FoodPanda, and Grab delivery logs.

3. **Malaysian Localisation vs. US/Euro-Centric Apps:** Apps like Wave are heavily US-centric, and Xero/QuickBooks lack standard Bahasa Melayu support. Kopi-Assist is fully translated in English, Bahasa Melayu, and Mandarin Chinese. All dashboard charts, currency displays, AI advice prompts, and benchmark margins are hardcoded using Malaysian Ringgit (RM) and tailored to the local Malaysian macroeconomic climate.

4. **Zero Infrastructure Cost vs. High Software Licenses:** Desktop ERP systems (like SQL Account) require upfront installation fees and hardware, and cloud subscriptions (Xero/QuickBooks) cost RM 50-250 per month. Kopi-Assist runs entirely on Vercel free tier, Baserow cloud database free tier, and free-tier Gemini API, allowing micro-SMEs to deploy a complete financial dashboard and anomaly engine with zero upfront cost.

5. **PIC Accountability Tracking vs. Raw Bank Statements:** While bank SME dashboards only display chronological transactions with no contextual metadata, and accounting systems record transactions at a ledger level, Kopi-Assist parses the Person-in-Charge (PIC) from receipt/invoice descriptions and displays it alongside the anomaly flag. This allows business owners to instantly trace cost leakage to a specific employee or cashier.

### 5.2 Target Users

**Primary Users - SME Owners / Business Operators**
F&B entrepreneurs operating cafes, bubble tea chains, or restaurants with 5-50 staff. These owners log in, upload monthly transaction files or manage live Baserow-connected data, and use the dashboard and anomaly scanner weekly to monitor financial health and catch irregularities early.

**Secondary Users - Finance Managers / Bookkeepers**
In-house finance staff or outsourced accountants managing the financial records of multiple SME clients. They benefit from the E-Invoice generator, Annual Report PDF export, bulk CSV upload, and the anomaly report as supporting documentation for audit preparation and client reporting.

**Tertiary Users - Bank / Financial Institution Analysts**
SME loan officers who could use the platform's historical cash flow data, industry benchmark comparisons, and 3-month scenario consequence narratives to make faster, better-informed credit risk decisions for SME loan applications - transforming an otherwise opaque SME financial picture into a structured, AI-validated risk profile.

---

## 6. Prototype Interface (Appendix)

### Screen 1 - Login & Registration
Dark-theme glassmorphism card centred on screen. Login mode: company name and password fields with a Login button. Register mode: adds headcount, industry selector with outlet count, average monthly revenue field, and a mandatory menu file upload (CSV or image, parsed via Gemini OCR or PapaParse into Item_Name and Price pairs). Error and success messages appear inline. Language switcher visible at top-right.

### Screen 2 - Dashboard (Financial Overview)
Top row: four KPI summary cards for Annual Income (green), Annual Expenses (red), Annual Net Flow (blue), and All-Time Transactions (purple). Second row: four monthly summary cards for the most recent data month. Centre: full-width ComposedChart with income bars (green), expense bars (red), net flow line (blue solid), and industry benchmark net flow line (blue dashed). The final bar is semi-transparent and carries a (Proj) label to indicate the 3-month moving average forecast. A legend pill above the chart displays the benchmark sector label and RM amount per month. Below: AI Recommendations section listing Gemini-generated titles, impact badges, and description text.

### Screen 3 - Anomaly Detection (Anomaly Tab)
Two top tabs: Anomaly and Prediction. Anomaly tab: a card containing the section title, a Run Analysis button, and a description. After scanning, anomaly item rows appear - each with a coloured warning icon, description text, date/category/severity badge line, and RM amount. Clicking any row opens a full-screen modal overlay with blurred background containing: Flagged Transaction block (description, date, category, amount), Reason for Flagging narrative, Formulation Rule (blue monospace chip), Anomaly Threshold (red chip), step-by-step Calculation (dashed border box), and Person-in-Charge (green bold name at bottom with close button).

### Screen 4 - Scenario Planner (Prediction Tab - Presets)
Prediction tab with two sub-buttons: Presets and Manual Sandbox. Presets view: Run Predictions button at top-right. After loading, 6 scenario cards appear. Each scenario card has a colour-coded badge (red for MCO_LOCKDOWN, green for FESTIVE_SEASON, orange for ECONOMIC_DOWNTURN, purple for PLATFORM_SHUTDOWN), title, impact text, recommended action bullet list, a red left-bordered consequence block with 3-month narrative, and a 6-month AreaChart of projected income, expenses, and net cash flow with gradient fills.

### Screen 5 - Operation Failure Prediction
A dedicated scenario card below the main scenario list labelled Operation Failure Prediction with a purple badge. After clicking Run Predictions, it displays the OPERATION_FAILURE scenario: title, impact description, recommended actions (IT engineer standby, manual cashier backup plan, real-time transaction-rate monitoring alert at over 20 TXN/min, pre-positioned safety stock, and outlet-level stock depletion notification at below 20% of daily par), and a System Down and Stock Insufficient Risk versus Transaction Load AreaChart plotting system_down_risk percent (red) and stock_depletion_risk percent (purple) from 5 TXN/min to 30 TXN/min.

### Screen 6 - Interactive Cash Flow Sandbox
Manual Sandbox sub-tab: descriptive subtitle, then a live AreaChart (income green, expenses red, net flow blue) that updates in real time as sliders move. Below: a responsive grid of per-month slider cards (Month 1 through Month 6). Each card shows the month label, current net cash flow (green if positive, red if negative), an Inflow slider in green with current RM value, and an Outflow slider in red with current RM value. At the bottom: Ask AI for Advice on this Custom Curve button. After clicking, an AI Consultant Analysis card appears below with summary paragraph, Strategic Action Steps bullet list, and an optional consequence block.

### Screen 7 - Data Management
Three sections. Upload Financial Data: drag-and-drop zone with file type hint text; after upload, a success count message or a manual-entry prompt if OCR failed. Financial Records: a table showing the last 50 records with columns Date, Type (income/expense badge), Category, Amount (RM), Description, and Source file. E-Invoice Generator: client name and address fields, a line items table with Description, Qty, Unit Price, and auto-computed Total columns, Add Item button, Tax Rate input, Notes textarea, and Generate & Download PDF button.

### Screen 8 - Sidebar Navigation
Persistent left sidebar: company icon and name at top, industry label below, navigation links (Dashboard, Data Management, Anomaly & Prediction). At the bottom: language switcher toggle (EN / BM / Chinese) and a Logout button.

---

## 7. References

1. Malaysia SME Corporation. (2023). *SME Annual Report 2022/2023*. SME Corp Malaysia. https://www.smecorp.gov.my
2. Bank Negara Malaysia. (2023). *Financial Stability Review H2 2022: SME Financing and Credit Risk*. BNM. https://www.bnm.gov.my
3. Department of Statistics Malaysia. (2023). *Report on the Census of Establishments and Enterprises 2022*. DOSM. https://www.dosm.gov.my
4. Deloitte. (2022). *The Cost of Fraud: Global Benchmarking Study on Fraud Detection Timelines*. Deloitte Insights.
5. Google. (2024). *Gemini API Documentation - gemini-2.0-flash model*. Google AI for Developers. https://ai.google.dev/docs
6. Baserow. (2024). *Baserow API Reference: Database Rows and Batch Operations*. Baserow Documentation. https://baserow.io/docs/apis
7. Vercel. (2024). *Next.js App Router Documentation*. Vercel. https://nextjs.org/docs
8. McKinsey & Company. (2022). *The State of AI in Southeast Asia: SME Digital Adoption and Financial Inclusion*. McKinsey Global Institute.
