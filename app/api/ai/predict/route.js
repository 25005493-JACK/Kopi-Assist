import { NextResponse } from 'next/server';
import { GoogleGenAI } from '../openai-fallback';

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
    if (company.industry) {
      company.industry = company.industry.split('|')[0];
    }

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

    const prompt = `You are a financial risk analyst for F&B companies. Analyze this company and produce incident predictions.

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
      
      // Calculate actual average monthly income & expenses from real transaction data
      const monthlyData = {};
      allRows.forEach(r => {
        const month = r.date ? r.date.substring(0, 7) : null;
        if (!month) return;
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
        const amt = parseFloat(r.amount) || 0;
        if (r.type === 'income') monthlyData[month].income += amt;
        else monthlyData[month].expenses += amt;
      });
      const monthEntries = Object.values(monthlyData);
      const actualRevAvg = monthEntries.length > 0
        ? monthEntries.reduce((s, m) => s + m.income, 0) / monthEntries.length
        : 0;
      const actualExpAvg = monthEntries.length > 0
        ? monthEntries.reduce((s, m) => s + m.expenses, 0) / monthEntries.length
        : 0;

      // Use real data if available, otherwise fall back to company profile estimate
      const rev = actualRevAvg > 0 ? Math.round(actualRevAvg) : (parseFloat(company.avg_monthly_revenue) || 25000);
      const expBase = actualExpAvg > 0 ? Math.round(actualExpAvg) : rev * 0.75;
      const industry = company.industry || 'your industry';
      const name = company.company_name || 'Your company';

      
      const scenarios = [
        {
          id: "FESTIVE_SEASON",
          title: "Festive Season Surge",
          impact: "Dine-in and food delivery orders surge 2–3x during Hari Raya, Chinese New Year, or Year-End celebrations. Ingredient demand spikes and kitchen throughput is stretched to its limit, creating both high revenue opportunity and high operational risk if not prepared.",
          severity: "medium",
          actions: [
            "Pre-order bulk dry ingredients and sauces at least 45 days before the festive window to lock in lower prices before demand-driven inflation hits wet market suppliers",
            "Hire short-term kitchen assistants and floor crew on a 2-month contract to handle the increased cover count without overworking permanent staff",
            "Create festive-only limited menu sets (e.g. Raya hamper bundles, CNY combo meals) to drive higher average order value while simplifying kitchen execution"
          ],
          consequence: `${name} will miss the single highest-revenue window of the F&B calendar entirely — festive seasons can represent 30–40% of a restaurant's annual revenue. Without pre-stocked ingredients, the kitchen will face mid-peak stockouts on popular items, forcing early 86s (out-of-stock notices) that drive diners to competitors. Negative GrabFood and Shopee Food reviews during the festive rush will suppress platform rankings for months after the season ends, compounding the financial damage well beyond the holiday period.`,
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
          title: "MCO / Dine-In Restrictions",
          impact: "Dine-in operations are suspended. Walk-in revenue drops to zero. The outlet must pivot fully to delivery and takeaway, absorbing GrabFood/Shopee Food platform commissions of up to 30% — drastically compressing margins on every order.",
          severity: "high",
          actions: [
            "Immediately activate GrabFood, Shopee Food, and Food Panda storefronts and run platform-subsidised promotions to maintain order volume during the lockdown period",
            "Renegotiate rental with the landlord for a 30–50% temporary deferral, citing the forced closure of dine-in — most commercial landlords have MCO hardship clauses",
            "Introduce a cost-engineered 'MCO Survival Menu' with only the top 8–10 highest-margin dishes that are delivery-optimised (travel well, low waste, fast prep time)"
          ],
          consequence: `Without a delivery-first pivot, ${name} will absorb full fixed costs (rent at RM ${Math.round(expBase * 0.2).toLocaleString()}/month, salaries, utilities) against near-zero dine-in revenue. After 3 months of inaction, cumulative cash burn could reach RM ${Math.round(expBase * 0.8 * 3 - rev * 0.35 * 3).toLocaleString()}, exhausting operating reserves and likely forcing premature staff retrenchments. Perishable ingredient inventory will also generate significant food waste losses daily if orders do not materialise, adding hidden losses on top of the revenue gap.`,
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
          impact: "Consumer discretionary dining spend contracts by 25–35%. Customers trade down from dine-in to cheaper takeaway or cook-at-home options. Delivery order volumes fall and average basket sizes shrink as consumers cut non-essential spending.",
          severity: "high",
          actions: [
            "Streamline the menu to your top 15 highest-margin, fastest-selling items — reducing ingredient variety lowers procurement costs and minimises food waste during a low-traffic period",
            "Launch value-bundle promotions (e.g. 'RM 15 set lunch for 2') to retain price-sensitive customers and protect cover count without deep discounting individual items",
            "Renegotiate supplier credit terms from Net 15 to Net 30 and source fresh produce from Pasar Borong (wholesale markets) directly to cut ingredient costs by up to 20%"
          ],
          consequence: `${name} will face persistent food cost pressure — ingredient prices often lag economic conditions, meaning costs remain high even as customer spending drops. Without menu rationalisation, the food cost ratio (ideally 28–35% for F&B) may climb above 45%, eroding every order's contribution margin. After 3 months of inaction, the cumulative deficit could reach RM ${Math.round(((rev * 0.7) - (expBase * 0.85)) * 3 * -1).toLocaleString()}, and the business risks losing trained kitchen staff who will seek more stable income elsewhere, further degrading service quality and the ability to recover when conditions improve.`,
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
          title: "Ingredient Supply Chain Disruption",
          impact: "Key raw ingredient suppliers — wet market vendors, food distributors, or packaging suppliers — face shortages, price spikes, or logistical delays. Core menu items cannot be prepared, forcing last-minute menu changes and disappointing regulars.",
          severity: "high",
          actions: [
            "Register immediately with at least 2–3 alternative fresh produce suppliers or Pasar Borong (wholesale market) distributors per ingredient category to eliminate single-supplier dependency",
            "Implement a minimum safety stock of 5–7 days for dry ingredients and 2–3 days for fresh produce to buffer against sudden delivery delays from primary suppliers",
            "Engineer 2–3 ingredient-flexible 'substitute dishes' into the menu that can replace affected items when a key ingredient is unavailable, maintaining cover count without 86-ing customer favourites"
          ],
          consequence: `${name} will be forced to 86 key menu items within days as fresh ingredients run out — in F&B, a menu missing its signature dishes loses its primary selling proposition. After 3 months without backup suppliers, regular diners who cannot find their preferred items will permanently shift to competitor restaurants, generating an estimated RM ${Math.round(rev * 0.35).toLocaleString()} in monthly recurring revenue loss. Emergency spot-buying from retail supermarkets at retail price (vs. bulk distributor price) will inflate food cost ratios by 15–25%, further squeezing already thin F&B margins.`,
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
          title: "Food Delivery Platform Suspension",
          impact: "Your primary food delivery storefront (GrabFood, Shopee Food, or Food Panda) is suspended due to merchant account violations, low ratings, or platform-side outages. Online delivery revenue — often 40–60% of total F&B revenue — halts instantly.",
          severity: "high",
          actions: [
            "Immediately activate a WhatsApp Business ordering channel with a photo menu and DuitNow QR payment link to capture direct orders and avoid the 25–30% platform commission during the outage",
            "SMS-blast your existing customer database redirecting them to direct ordering channels or alternative platforms (e.g. if GrabFood suspends, activate Shopee Food as your primary delivery channel)",
            "Establish merchant accounts on all major platforms simultaneously — GrabFood, Shopee Food, and Food Panda — to eliminate single-platform dependency and maintain revenue continuity if one platform suspends"
          ],
          consequence: `With the primary delivery platform offline and no direct ordering fallback, ${name} will lose 40–60% of total monthly revenue — approximately RM ${Math.round(rev * 0.5).toLocaleString()} — within 48 hours. Over 3 months, the platform's algorithm will de-rank the restaurant's listing (lower search visibility, fewer recommended slots), meaning even after reinstatement, recovering to prior order volume could take 4–6 months of sustained promotional spending. The sustained revenue cliff will also strain the owner's ability to pay kitchen staff wages on time, risking a staff exodus at the worst possible moment.`,
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
          title: "POS & Payment System Outage",
          impact: "The restaurant's POS system (e.g. StoreHub, Eats365, or Square) crashes or the payment gateway fails. Card and QR payments cannot be processed. The kitchen loses order tickets, causing confusion during service and causing tables to leave unpaid or unfulfilled.",
          severity: "high",
          actions: [
            "Maintain a printed manual order docket system and a designated cash-only fallback mode — train all floor and kitchen staff to switch within 5 minutes of a POS failure",
            "Subscribe to a POS vendor SLA that guarantees 4-hour maximum downtime response, and keep a backup tablet with an offline-capable POS app (e.g. Square offline mode) charged and ready",
            "Set up real-time uptime monitoring alerts (e.g. via POS vendor dashboard or UptimeRobot) to notify the outlet manager immediately when the system goes down during service hours"
          ],
          consequence: `Every 1 hour of POS downtime during a lunch or dinner peak costs ${name} an estimated RM ${Math.round(rev / 240).toLocaleString()} in lost table covers and delivery ticket processing. 3 months of recurring outages without resolution would result in severe customer trust erosion — diners who experienced a poor service episode due to system failures are statistically 3x less likely to return. Kitchen teams operating without order management systems also face significant food waste from misfired dishes, adding hidden costs on top of the direct revenue losses.`,
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
          title: "Operational Overload & Kitchen Breakdown",
          impact: "Order volume across outlets exceeds kitchen throughput capacity — more than 25 tickets per minute overwhelms kitchen crews, causes ticket backlog, degrades food quality, and triggers delivery partner complaints. POS freezes and delivery platform SLA timers breach, leading to automatic order cancellations.",
          severity: "high",
          actions: [
            "Station a dedicated kitchen coordinator (expeditor) during peak lunch and dinner hours to manage ticket flow, call out orders, and prevent bottlenecks at the pass",
            "Implement a delivery order throttle on GrabFood and Shopee Food — set maximum concurrent orders to 80% of kitchen capacity during peak hours to prevent SLA breaches and food quality decline",
            "Install real-time KDS (Kitchen Display System) alerts — when ticket queue exceeds 15 pending orders, auto-pause new delivery platform orders until the backlog clears",
            "Pre-prep high-volume menu items (e.g. portion and marinate proteins, pre-cook rice, prep sauces) before each meal service to reduce cook time and increase throughput per station",
            "Implement outlet-level ingredient depletion alerts: when any key ingredient drops below 20% of daily par level, auto-notify the outlet manager for emergency restocking via backup supplier"
          ],
          consequence: `Without operational safeguards, ${name} risks complete kitchen breakdown during peak hours — losing an estimated RM ${Math.round(rev * 0.4 / 30 * 3).toLocaleString()} per day in cancelled and refunded orders when ticket queues overflow. Repeated delivery SLA breaches will trigger automatic penalties and ranking suppression on GrabFood and Shopee Food, reducing the restaurant's visibility and new customer acquisition for months after the incident. Chronic overload also accelerates kitchen staff burnout and turnover — replacing a trained line cook in the F&B industry typically takes 4–6 weeks of hiring and training, during which service quality and speed are degraded further.`,
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
