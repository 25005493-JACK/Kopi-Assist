import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const BASEROW_URL = process.env.BASEROW_BASE_URL;
const FIN_TABLE = process.env.BASEROW_FINANCIAL_TABLE_ID;
const COMP_TABLE = process.env.BASEROW_COMPANY_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

export async function POST(request) {
  try {
    const { company_id } = await request.json();

    // Fetch company
    const compRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${COMP_TABLE}/${company_id}/?user_field_names=true`,
      { headers: { 'Authorization': `Token ${TOKEN}` } }
    );
    if (!compRes.ok) {
      return NextResponse.json({ error: 'Company not found or deleted' }, { status: 404 });
    }
    const company = await compRes.json();

    // Fetch financial data
    let allRows = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await fetch(
        `${BASEROW_URL}/api/database/rows/table/${FIN_TABLE}/?user_field_names=true&filter__company_id__equal=${company_id}&size=200&page=${page}`,
        { headers: { 'Authorization': `Token ${TOKEN}` } }
      );
      const data = await res.json();
      allRows = allRows.concat(data.results || []);
      hasMore = data.next !== null;
      page++;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `You are a financial risk analyst for SMEs. Analyze this company and produce incident predictions.

Company: ${company.company_name}
Industry: ${company.industry}
Headcount: ${company.headcount}
Avg Monthly Revenue: RM ${company.avg_monthly_revenue}

Financial Data (${allRows.length} records):
${JSON.stringify(allRows.slice(0, 100).map(r => ({ date: r.date, type: r.type, category: r.category, amount: r.amount })), null, 2)}

Generate predictions for these 7 scenarios. For each scenario, provide:
1. Impact assessment on the company
2. Recommended actions (3-5 specific steps)
3. A 6-month projected cashflow simulation (month1 through month6) showing projected_income, projected_expenses, and net_cashflow for each month. Base values on existing data patterns.
4. A "consequence" field: 2-3 sentences describing what will specifically happen to THIS company if no action is taken for 3 months after this scenario hits. Be specific about financial deterioration, customer loss, or operational collapse risks based on their industry and revenue.

Scenarios:
1. FESTIVE_SEASON: Major festive season (Hari Raya/Chinese New Year/Deepavali) is approaching. Stock demand will spike.
2. MCO_LOCKDOWN: Movement Control Order is imposed. Physical business operations restricted.
3. ECONOMIC_DOWNTURN: Economic recession hits, consumer spending drops 30%.
4. SUPPLY_CHAIN_STUN: Logistics / Supply Chain shutdown. Key suppliers face delays, causing inventory shortages.
5. PLATFORM_SHUTDOWN: Main e-commerce/online retail storefront goes down or Shopify/Shopee accounts suspended.
6. SYSTEM_OUTAGE: Core IT system outages (e.g. database server crash, payment gateway timeout, POS network failure) disrupt sales transactions.
7. OPERATION_FAILURE: Transaction volume at one or more outlets exceeds 25 per minute, causing system/operational overload. POS systems freeze, queue builds up, stock depletes rapidly. Risk: operational collapse if not managed. Actions should include IT engineer standby, cashier manual backup plan, and real-time stock depletion alert and restocking protocol.

Return ONLY a JSON object with this structure:
{
  "scenarios": [
    {
      "id": "FESTIVE_SEASON",
      "title": "Festive Season Surge",
      "impact": "description",
      "severity": "medium",
      "actions": ["action1", "action2", "action3"],
      "consequence": "2-3 sentence description of what happens if no action is taken for 3 months",
      "cashflow": [
        {"month": "Month 1", "projected_income": 50000, "projected_expenses": 40000, "net_cashflow": 10000},
        ... (6 months)
      ]
    },
    ... (7 scenarios)
  ]
}

Only return the JSON, no other text.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const text = response.text || '{}';
      const jsonMatch = text.match(/\{.*\}/s);
      const predictions = jsonMatch ? JSON.parse(jsonMatch[0]) : { scenarios: [] };
      return NextResponse.json({ success: true, ...predictions });
    } catch (aiErr) {
      console.warn("AI Prediction failed, returning mock scenarios:", aiErr.message);
      
      const rev = parseFloat(company.avg_monthly_revenue) || 25000;
      const expBase = rev * 0.75;
      const industry = company.industry || 'your industry';
      const name = company.company_name || 'Your company';
      
      const scenarios = [
        {
          id: "FESTIVE_SEASON",
          title: "Festive Season Surge",
          impact: "Demand for products spikes significantly due to major cultural celebrations (Chinese New Year, Hari Raya, or Year End). Cash balances rise, but upfront supply costs increase.",
          severity: "medium",
          actions: [
            "Increase inventory holdings by 30% at least 45 days prior to peak season",
            "Hire short-term part-time staff to handle shop front and customer service load",
            "Negotiate extended payment terms (e.g. Net 60) with key suppliers to protect cash flow"
          ],
          consequence: `${name} will miss the peak revenue window entirely, allowing competitors to capture festive demand. Without pre-stocked inventory, stockouts during the busiest sales period will cause an estimated 35–50% revenue shortfall versus potential. Customer loyalty will erode as buyers shift to better-prepared alternatives, making recovery harder even after the season ends.`,
          cashflow: [
            { month: "Month 1", projected_income: Math.round(rev * 1.0), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round(rev * 0.25) },
            { month: "Month 2", projected_income: Math.round(rev * 1.4), projected_expenses: Math.round(expBase * 1.2), net_cashflow: Math.round((rev * 1.4) - (expBase * 1.2)) },
            { month: "Month 3 (Peak)", projected_income: Math.round(rev * 1.8), projected_expenses: Math.round(expBase * 1.3), net_cashflow: Math.round((rev * 1.8) - (expBase * 1.3)) },
            { month: "Month 4", projected_income: Math.round(rev * 1.1), projected_expenses: Math.round(expBase * 0.95), net_cashflow: Math.round((rev * 1.1) - (expBase * 0.95)) },
            { month: "Month 5", projected_income: Math.round(rev * 0.95), projected_expenses: Math.round(expBase * 0.9), net_cashflow: Math.round((rev * 0.95) - (expBase * 0.9)) },
            { month: "Month 6", projected_income: Math.round(rev * 1.0), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round(rev * 0.25) }
          ]
        },
        {
          id: "MCO_LOCKDOWN",
          title: "MCO / Lockdown restrictions",
          impact: "Operations are restricted to online channels only. Retail foot traffic hits zero. Revenues contract by up to 70% while fixed costs remain high.",
          severity: "high",
          actions: [
            "Immediately transition sales channels to e-commerce and home delivery models",
            "Renegotiate with landlord for a temporary 30-50% rental discount during the MCO period",
            "Minimize discretionary operational expenses and pause active retail marketing spend"
          ],
          consequence: `Without pivoting to digital channels, ${name} will burn through cash reserves at an accelerated rate — fixed costs (rent, salaries, utilities) will consume an estimated RM ${Math.round(expBase * 0.8).toLocaleString()} monthly with near-zero revenue. After 3 months of inaction, cumulative losses could reach RM ${Math.round(expBase * 0.8 * 3 - rev * 0.35 * 3).toLocaleString()}, threatening the business's ability to reopen once restrictions lift.`,
          cashflow: [
            { month: "Month 1 (MCO Start)", projected_income: Math.round(rev * 0.35), projected_expenses: Math.round(expBase * 0.8), net_cashflow: Math.round((rev * 0.35) - (expBase * 0.8)) },
            { month: "Month 2", projected_income: Math.round(rev * 0.35), projected_expenses: Math.round(expBase * 0.75), net_cashflow: Math.round((rev * 0.35) - (expBase * 0.75)) },
            { month: "Month 3", projected_income: Math.round(rev * 0.45), projected_expenses: Math.round(expBase * 0.75), net_cashflow: Math.round((rev * 0.45) - (expBase * 0.75)) },
            { month: "Month 4 (Easing)", projected_income: Math.round(rev * 0.7), projected_expenses: Math.round(expBase * 0.85), net_cashflow: Math.round((rev * 0.7) - (expBase * 0.85)) },
            { month: "Month 5", projected_income: Math.round(rev * 0.9), projected_expenses: Math.round(expBase * 0.95), net_cashflow: Math.round((rev * 0.9) - (expBase * 0.95)) },
            { month: "Month 6", projected_income: Math.round(rev * 1.0), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round(rev * 0.25) }
          ]
        },
        {
          id: "ECONOMIC_DOWNTURN",
          title: "Economic Downturn (Recession)",
          impact: "Consumer purchasing power drops, decreasing store revenues by 30% over a prolonged period. Pressure builds on margins.",
          severity: "high",
          actions: [
            "Downsize inventory SKU counts to focus strictly on essential, fast-moving products",
            "Launch budget-focused bundles or loyalty campaigns to retain cash-strapped consumers",
            "Reduce internal operating costs (such as utilities, packaging, and non-essential travel)"
          ],
          consequence: `${name} will face persistent margin compression as revenue stays 25–30% below pre-recession levels while costs remain sticky. Without a lean cost structure, monthly net losses will widen over 3 months — total cumulative deficit could reach RM ${Math.round(((rev * 0.7) - (expBase * 0.85)) * 3 * -1).toLocaleString()} if expenses aren't restructured. Prolonged negative cash flow will impair supplier credit terms, limiting the ability to restock when the economy recovers.`,
          cashflow: [
            { month: "Month 1", projected_income: Math.round(rev * 0.8), projected_expenses: Math.round(expBase * 0.95), net_cashflow: Math.round((rev * 0.8) - (expBase * 0.95)) },
            { month: "Month 2", projected_income: Math.round(rev * 0.75), projected_expenses: Math.round(expBase * 0.9), net_cashflow: Math.round((rev * 0.75) - (expBase * 0.9)) },
            { month: "Month 3", projected_income: Math.round(rev * 0.7), projected_expenses: Math.round(expBase * 0.85), net_cashflow: Math.round((rev * 0.7) - (expBase * 0.85)) },
            { month: "Month 4", projected_income: Math.round(rev * 0.7), projected_expenses: Math.round(expBase * 0.8), net_cashflow: Math.round((rev * 0.7) - (expBase * 0.8)) },
            { month: "Month 5", projected_income: Math.round(rev * 0.75), projected_expenses: Math.round(expBase * 0.8), net_cashflow: Math.round((rev * 0.75) - (expBase * 0.8)) },
            { month: "Month 6", projected_income: Math.round(rev * 0.8), projected_expenses: Math.round(expBase * 0.85), net_cashflow: Math.round((rev * 0.8) - (expBase * 0.85)) }
          ]
        },
        {
          id: "SUPPLY_CHAIN_STUN",
          title: "Supply Chain disruption / Stun",
          impact: "Key inventory suppliers face logistical blocks, raw material shortages, or factory shutdowns. Stock levels drop, leading to unfulfilled client orders and customer attrition.",
          severity: "high",
          actions: [
            "Identify and contract secondary regional and domestic backup suppliers immediately",
            "Implement a safety stock reserve policy of 1.5x standard monthly demand for critical SKUs",
            "Divert sales to substitute inventory lines that rely on independent, local supply networks"
          ],
          consequence: `${name} will exhaust existing stock within weeks, forcing it to turn away orders and issue refunds — directly eroding RM ${Math.round(rev * 0.35).toLocaleString()} or more in monthly revenue. After 3 months without a backup supplier, customer churn to competitors with consistent stock availability will become structural and difficult to reverse. Supplier relationship damage may also result in stricter credit terms or upfront payment requirements post-disruption.`,
          cashflow: [
            { month: "Month 1 (Stun Start)", projected_income: Math.round(rev * 0.9), projected_expenses: Math.round(expBase * 1.1), net_cashflow: Math.round((rev * 0.9) - (expBase * 1.1)) },
            { month: "Month 2", projected_income: Math.round(rev * 0.65), projected_expenses: Math.round(expBase * 0.85), net_cashflow: Math.round((rev * 0.65) - (expBase * 0.85)) },
            { month: "Month 3", projected_income: Math.round(rev * 0.6), projected_expenses: Math.round(expBase * 0.8), net_cashflow: Math.round((rev * 0.6) - (expBase * 0.8)) },
            { month: "Month 4 (Resolving)", projected_income: Math.round(rev * 0.8), projected_expenses: Math.round(expBase * 0.95), net_cashflow: Math.round((rev * 0.8) - (expBase * 0.95)) },
            { month: "Month 5", projected_income: Math.round(rev * 0.95), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round((rev * 0.95) - (expBase * 1.0)) },
            { month: "Month 6", projected_income: Math.round(rev * 1.0), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round(rev * 0.25) }
          ]
        },
        {
          id: "PLATFORM_SHUTDOWN",
          title: "Online Retail Platform Shutdown",
          impact: "Your primary digital storefront (Shopify/Shopee/Lazada) goes down due to system failures, cloud outages, or merchant account suspension. Incoming online orders halt instantly.",
          severity: "high",
          actions: [
            "Set up WhatsApp Business and social commerce ordering channels as instant fallback mechanisms",
            "Send an immediate newsletter/SMS campaign to your customer base redirecting traffic to your backup landing pages",
            "Establish secondary merchant accounts on a separate platform to prevent single-point-of-failure lockouts"
          ],
          consequence: `With the primary storefront offline and no fallback channel, ${name} will lose its entire online revenue stream — approximately RM ${Math.round(rev * 0.75).toLocaleString()} per month — within days. Over 3 months, organic search rankings and platform algorithm scores will decay sharply, meaning even after restoration, recovering prior visibility and sales volume could take 6–12 months. The prolonged absence will also allow competing sellers to capture the business's customer base permanently.`,
          cashflow: [
            { month: "Month 1", projected_income: Math.round(rev * 1.0), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round(rev * 0.25) },
            { month: "Month 2 (Outage)", projected_income: Math.round(rev * 0.25), projected_expenses: Math.round(expBase * 0.7), net_cashflow: Math.round((rev * 0.25) - (expBase * 0.7)) },
            { month: "Month 3 (Pivoting)", projected_income: Math.round(rev * 0.55), projected_expenses: Math.round(expBase * 0.8), net_cashflow: Math.round((rev * 0.55) - (expBase * 0.8)) },
            { month: "Month 4", projected_income: Math.round(rev * 0.85), projected_expenses: Math.round(expBase * 0.95), net_cashflow: Math.round((rev * 0.85) - (expBase * 0.95)) },
            { month: "Month 5", projected_income: Math.round(rev * 0.95), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round((rev * 0.95) - (expBase * 1.0)) },
            { month: "Month 6", projected_income: Math.round(rev * 1.0), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round(rev * 0.25) }
          ]
        },
        {
          id: "SYSTEM_OUTAGE",
          title: "IT Infrastructure System Outage",
          impact: "Core IT backend systems (database, servers, cloud hosting, or third-party payment gateway integration) crash. Credit card checkouts fail, resulting in immediate transaction losses and server recovery expenses.",
          severity: "high",
          actions: [
            "Configure multi-region hot-standby servers with active automated database failover scripts",
            "Implement client-side offline storage cache inside checkout applications to record sales queue buffers",
            "Set up instant uptime status alerts to monitor endpoint responses and alert vendor technical support"
          ],
          consequence: `Every hour of downtime costs ${name} an estimated RM ${Math.round(rev / 300).toLocaleString()} in lost transactions; 3 months without system restoration would result in catastrophic cumulative revenue loss and potential data integrity issues. Customer trust will collapse as failed payments and lost order histories drive negative reviews, with recovery requiring expensive emergency IT contracts on top of the already incurred losses. Regulatory exposure is also possible if transaction records are corrupted during the outage period.`,
          cashflow: [
            { month: "Month 1", projected_income: Math.round(rev * 1.0), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round(rev * 0.25) },
            { month: "Month 2 (Crash)", projected_income: Math.round(rev * 0.4), projected_expenses: Math.round(expBase * 1.3), net_cashflow: Math.round((rev * 0.4) - (expBase * 1.3)) },
            { month: "Month 3 (Restored)", projected_income: Math.round(rev * 0.9), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round((rev * 0.9) - (expBase * 1.0)) },
            { month: "Month 4", projected_income: Math.round(rev * 1.0), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round(rev * 0.25) },
            { month: "Month 5", projected_income: Math.round(rev * 1.0), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round(rev * 0.25) },
            { month: "Month 6", projected_income: Math.round(rev * 1.0), projected_expenses: Math.round(expBase * 1.0), net_cashflow: Math.round(rev * 0.25) }
          ]
        },
        {
          id: "OPERATION_FAILURE",
          title: "Operational Overload & System Failure",
          impact: "Transaction volume at one or more outlets exceeds 25 per minute, overwhelming POS systems, payment gateways, and kitchen workflows. Systems freeze, queues build rapidly, and stock depletes faster than supply can cover.",
          severity: "high",
          actions: [
            "Deploy IT engineer on standby during peak hours (e.g. lunch & dinner rush) to respond immediately to system freezes",
            "Prepare a manual cashier backup: printed order sheets, manual cash tally, and designated offline payment fallback (Cash Only mode)",
            "Install real-time transaction-rate monitoring dashboard — alert triggered at >20 TXN/min per outlet",
            "Pre-position safety stock at each outlet before peak periods based on historical sales velocity",
            "Implement outlet-level stock depletion alerts: when stock drops below 20% of daily par, auto-notify the owner to restock"
          ],
          consequence: `Without operational safeguards, ${name} risks complete service halt during peak hours — losing an estimated RM ${Math.round(rev * 0.4 / 30 * 3).toLocaleString()} per day in missed transactions when systems fail. Repeated failures erode customer trust and drive negative online reviews on Shopee Food and Food Panda, reducing the platform ranking and reducing future order volume. Stock depletion without restocking alerts can result in menu item unavailability, forcing refunds and order cancellations that damage brand reputation across all 5 outlets.`,
          system_load: [
            { label: '5 TXN/min', system_down_risk: 2, stock_depletion_risk: 5 },
            { label: '10 TXN/min', system_down_risk: 8, stock_depletion_risk: 15 },
            { label: '15 TXN/min', system_down_risk: 20, stock_depletion_risk: 35 },
            { label: '20 TXN/min', system_down_risk: 45, stock_depletion_risk: 65 },
            { label: '25 TXN/min', system_down_risk: 80, stock_depletion_risk: 88 },
            { label: '30 TXN/min', system_down_risk: 99, stock_depletion_risk: 98 }
          ]
        }
      ];

      return NextResponse.json({ success: true, scenarios });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
