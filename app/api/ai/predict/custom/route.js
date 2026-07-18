import { NextResponse } from 'next/server';
import { GoogleGenAI } from '../../openai-fallback';

const BASEROW_URL = process.env.BASEROW_BASE_URL;
const COMP_TABLE = process.env.BASEROW_COMPANY_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

export async function POST(request) {
  try {
    const { company_id, cashflow } = await request.json();

    if (!company_id || !cashflow || !cashflow.length) {
      return NextResponse.json({ error: 'company_id and cashflow data required' }, { status: 400 });
    }

    // Fetch company info
    const compRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${COMP_TABLE}/${company_id}/?user_field_names=true`,
      { 
        headers: { 'Authorization': `Token ${TOKEN}` },
        cache: 'no-store'
      }
    );
    if (!compRes.ok) {
      return NextResponse.json({ error: 'Company not found or deleted' }, { status: 404 });
    }
    const company = await compRes.json();
    if (company.industry) {
      company.industry = company.industry.split('|')[0];
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `You are a strategic financial consultant for F&B businesses. The business owner has manually simulated a custom 6-month cashflow forecast by adjusting income and expenses. 

Company Profile:
- Name: ${company.company_name}
- Industry: ${company.industry}
- Headcount: ${company.headcount}
- Avg Monthly Revenue: RM ${company.avg_monthly_revenue}

Manually Simulated 6-Month Cashflow Curve:
${JSON.stringify(cashflow, null, 2)}

Provide a JSON object containing:
1. A brief summary analyzing their simulated cashflow curve.
2. 3 to 4 highly-actionable, specific recommendation steps the owner should take to optimize cash flow, prepare for deficits, or leverage surpluses based on this custom scenario.
3. A "consequence" field: 2-3 sentences describing what will specifically happen to THIS company if they remain on this exact cashflow trajectory for 3 months with no corrective action. Be specific about financial deterioration, liquidity risks, or missed opportunities based on their industry, headcount, and revenue.

Return ONLY a JSON object in this format:
{
  "summary": "analysis of the curve",
  "actions": [
    "action step 1 with specific reasoning",
    "action step 2 with specific reasoning",
    "action step 3 with specific reasoning"
  ],
  "consequence": "2-3 sentence description of what happens if this trajectory continues unchanged for 3 months"
}

Only return the JSON, no other text.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const text = response.text || '{}';
      const jsonMatch = text.match(/\{.*\}/s);
      const advice = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      if (!advice || !advice.summary) throw new Error("Invalid AI JSON");
      return NextResponse.json({ success: true, ...advice });
    } catch (aiErr) {
      console.warn("Custom prediction AI failed, returning local rule-based recommendations:", aiErr.message);

      // Heuristic advisor
      let totalIncome = 0;
      let totalExpenses = 0;
      let lowestNet = Infinity;
      let lowestMonth = '';
      let deficitMonths = [];
      let highestExp = 0;
      let highestExpMonth = '';

      cashflow.forEach(m => {
        totalIncome += m.projected_income;
        totalExpenses += m.projected_expenses;
        
        if (m.net_cashflow < lowestNet) {
          lowestNet = m.net_cashflow;
          lowestMonth = m.month;
        }
        if (m.net_cashflow < 0) {
          deficitMonths.push(m);
        }
        if (m.projected_expenses > highestExp) {
          highestExp = m.projected_expenses;
          highestExpMonth = m.month;
        }
      });

      const cumulativeNet = totalIncome - totalExpenses;
      
      let summary = `Your simulated 6-month forecast shows total income of RM ${totalIncome.toLocaleString()} and expenses of RM ${totalExpenses.toLocaleString()}, resulting in a cumulative net cash flow of RM ${cumulativeNet.toLocaleString()}. `;
      if (deficitMonths.length > 0) {
        summary += `We detected cash flow deficits in ${deficitMonths.length} month(s), with the lowest net cash flow point in ${lowestMonth} at RM ${lowestNet.toLocaleString()}.`;
      } else {
        summary += `Your cash flow remains positive throughout the entire period, with the lowest net cash flow point in ${lowestMonth} at RM ${lowestNet.toLocaleString()}.`;
      }

      const actions = [];
      
      if (deficitMonths.length > 0) {
        actions.push(`Secure a short-term ingredient financing facility or food-distributor credit line before deficit hits: You face a cash deficit in ${deficitMonths[0].month} (Net: RM ${deficitMonths[0].net_cashflow.toLocaleString()}). Approach your primary food distributor for 30-day credit terms on dry goods, and set up a standby overdraft facility with your business bank to cover payroll and rent during the low-cash period.`);
        actions.push(`Implement a food cost audit during high-outflow periods: In ${highestExpMonth || 'deficit months'}, your simulated expenses reach RM ${highestExp.toLocaleString()}. Conduct a full plate-costing review — target a food cost ratio of 28–35% of revenue. Eliminate low-margin menu items and renegotiate ingredient prices with Pasar Borong distributors to reduce COGS by at least 10–15%.`);
      } else {
        actions.push(`Deploy surplus capital into kitchen capacity and menu development: Since your simulated cash flow is consistently positive, allocate RM ${(cumulativeNet * 0.3).toFixed(0)} of cumulative surplus into upgrading high-utilisation kitchen equipment (e.g. commercial fryers, blast chillers) that reduce prep time and food waste, directly improving throughput per service.`);
        actions.push(`Lock in better ingredient pricing now: Use your healthy cash position to negotiate bulk prepayment deals with key food distributors (e.g. 3-month advance purchase of dry goods at a 10–15% discount), reducing future variable costs and protecting margins against ingredient price inflation.`);
      }

      actions.push(`Tighten delivery platform receivables: Ensure your GrabFood, Shopee Food, and Food Panda payout cycles are reconciled weekly — platform payouts can lag up to 14 days, creating a cash gap if not tracked. Set your internal cash forecast to account for this delivery-revenue delay when planning ingredient procurement and payroll schedules.`);

      // Heuristic consequence
      let consequence = '';
      if (deficitMonths.length >= 2) {
        const projectedLoss = Math.abs(deficitMonths.reduce((s, m) => s + m.net_cashflow, 0));
        consequence = `If this cashflow trajectory continues for 3 months without intervention, ${name} will face a cumulative cash shortfall of approximately RM ${projectedLoss.toLocaleString()}, making it increasingly difficult to meet weekly ingredient procurement costs and bi-monthly payroll obligations. F&B businesses operating at a cash deficit risk being placed on cash-on-delivery terms by food distributors, eliminating credit flexibility and forcing the kitchen to operate with reduced ingredient variety. Without corrective action — either through menu cost engineering, delivery platform promotion spend, or a credit facility — the outlet risks temporary closure or forced staff reduction.`;
      } else if (deficitMonths.length === 1) {
        consequence = `Sustaining this cashflow curve for 3 months will produce at least one cash-negative period, drawing down reserves by RM ${Math.abs(deficitMonths[0].net_cashflow).toLocaleString()}. If this deficit month aligns with a high-obligation week (e.g. month-end rent, quarterly equipment maintenance, or festive ingredient pre-ordering), the kitchen may be forced to delay supplier payments — jeopardising delivery priority and freshness of produce. Proactive action — such as running a targeted delivery platform promotion that month to boost order volume — can prevent this single dip from escalating.`;
      } else {
        consequence = `Maintaining this positive F&B cashflow curve for 3 months without reinvesting surplus capital means the business is leaving significant value on the table. Idle cash in an F&B context carries an opportunity cost — competitors investing in kitchen equipment upgrades, staff training, or platform marketing will compound their throughput and customer rating advantages. Redirecting even 30% of the projected surplus (RM ${Math.round(cumulativeNet * 0.3).toLocaleString()}) into menu R&D, a new outlet trial, or a delivery platform promotional fund would materially improve long-term revenue velocity.`;
      }

      return NextResponse.json({ success: true, summary, actions, consequence });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
