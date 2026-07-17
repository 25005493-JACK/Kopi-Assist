import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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

    const prompt = `You are a strategic financial consultant for SMEs. The business owner has manually simulated a custom 6-month cashflow forecast by adjusting income and expenses. 

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
        actions.push(`Prepare working capital backup for deficit periods: You face a cash deficit in ${deficitMonths[0].month} (Net: RM ${deficitMonths[0].net_cashflow.toLocaleString()}). We advise establishing a short-term invoice financing facility or bank credit line at least 30 days prior.`);
        actions.push(`Implement strict overhead cost controls: In ${highestExpMonth || 'deficit months'}, your simulated expenses reach RM ${highestExp.toLocaleString()}. Audit discretionary operational spending (packaging, logistics, utilities) to trim expenses by at least 15% during high-outflow periods.`);
      } else {
        actions.push(`Capitalize on cash surpluses: Since your simulated cash flow is consistently positive, we recommend placing RM ${(cumulativeNet * 0.3).toFixed(0)} of your cumulative surplus into liquid cash deposits or interest-bearing flexi-accounts.`);
        actions.push(`Accelerate supplier settlements: Negotiate early-payment discounts (e.g. 2/10 Net 30) with key inventory vendors to reduce unit purchase costs, leveraging your healthy cash balances.`);
      }

      actions.push(`Synchronize receivables and payables: Ensure client payment terms are shorter than your supplier payment cycles (e.g., invoice clients on Net 15, while paying vendors on Net 30) to maintain a positive float.`);

      // Heuristic consequence
      let consequence = '';
      if (deficitMonths.length >= 2) {
        const projectedLoss = Math.abs(deficitMonths.reduce((s, m) => s + m.net_cashflow, 0));
        consequence = `If this trajectory continues for 3 months without intervention, the business will accumulate a cash shortfall of approximately RM ${projectedLoss.toLocaleString()}, exhausting operating reserves and likely triggering delayed supplier payments. Persistent deficits will damage the company's credit profile, making emergency financing more expensive or inaccessible when most needed. Without corrective action, the business risks entering a debt spiral that constrains operations even after the deficit period ends.`;
      } else if (deficitMonths.length === 1) {
        consequence = `Sustaining this cashflow curve for 3 months will result in at least one deficit period that draws down reserves by RM ${Math.abs(deficitMonths[0].net_cashflow).toLocaleString()}, creating pressure on operational liquidity. If the deficit month coincides with a high-obligation period (e.g. payroll, rent, supplier due dates), the business may face payment delays that damage vendor relationships. Proactive bridging financing or expense cuts can prevent this single weakness from escalating into a broader cash crisis.`;
      } else {
        consequence = `Maintaining this positive cashflow curve for 3 months without deploying surplus capital means RM ${Math.round(cumulativeNet * 0.5).toLocaleString()} or more will sit idle, generating no returns. Idle cash carries an opportunity cost — competitors investing in inventory, marketing, or equipment will compound their advantage over this period. Redirecting even 30% of the projected surplus into growth initiatives or high-yield instruments would materially improve the business's long-term position.`;
      }

      return NextResponse.json({ success: true, summary, actions, consequence });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
