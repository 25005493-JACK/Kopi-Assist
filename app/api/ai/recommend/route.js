import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const BASEROW_URL = process.env.BASEROW_BASE_URL;
const FIN_TABLE = process.env.BASEROW_FINANCIAL_TABLE_ID;
const COMP_TABLE = process.env.BASEROW_COMPANY_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

export async function POST(request) {
  try {
    const { company_id } = await request.json();

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

    let allRows = [];
    let pg = 1;
    let more = true;
    while (more) {
      const res = await fetch(
        `${BASEROW_URL}/api/database/rows/table/${FIN_TABLE}/?user_field_names=true&filter__company_id__equal=${company_id}&size=200&page=${pg}`,
        { 
          headers: { 'Authorization': `Token ${TOKEN}` },
          cache: 'no-store'
        }
      );
      const d = await res.json();
      allRows = allRows.concat(d.results || []);
      more = d.next !== null;
      pg++;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `As a financial advisor for SMEs, analyze this company's data and provide 5 specific, actionable recommendations to improve their financial health.

Company: ${company.company_name}
Industry: ${company.industry}
Headcount: ${company.headcount}
Avg Monthly Revenue: RM ${company.avg_monthly_revenue}

Financial Records:
${JSON.stringify(allRows.slice(0, 80).map(r => ({ date: r.date, type: r.type, category: r.category, amount: r.amount })), null, 2)}

Return a JSON array of 5 recommendation objects:
[
  {
    "title": "short title",
    "description": "2-3 sentence specific advice",
    "impact": "high" | "medium" | "low",
    "category": "cost_reduction" | "revenue_growth" | "cash_flow" | "risk_management" | "efficiency"
  }
]

Only return the JSON array.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const text = response.text || '[]';
      const jsonMatch = text.match(/\[.*\]/s);
      const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return NextResponse.json({ recommendations });
    } catch (aiErr) {
      console.warn("AI Generation failed, returning fallback recommendations:", aiErr.message);
      
      // Fallback Recommendations Heuristics based on company size and revenue
      const fallbacks = [
        {
          title: "Optimize Rental and Overhead Costs",
          description: `Given your average monthly revenue of RM ${company.avg_monthly_revenue || '25,000'} and headcount of ${company.headcount || '10'}, overhead rental expenses should not exceed 15% of monthly revenue. Consider renegotiating terms or sharing space if rent is high.`,
          impact: "high",
          category: "cost_reduction"
        },
        {
          title: "Review Supplier Terms & Inventory Levels",
          description: "Implement Just-In-Time (JIT) inventory management. Restock inventory only as needed to prevent capital lockup in slow-moving stock.",
          impact: "high",
          category: "cash_flow"
        },
        {
          title: "Establish a 3-Month Cash Buffer",
          description: "Set aside 10% of monthly income until you have at least 3 months of basic operating expenses saved to cover unexpected downturns or MCO-style incidents.",
          impact: "medium",
          category: "risk_management"
        },
        {
          title: "Promote Digital Payment Options",
          description: "Introduce QR/e-wallet checkout discounts or faster bank transfers for B2B transactions to shorten cash collection cycles from clients.",
          impact: "medium",
          category: "efficiency"
        },
        {
          title: "Focus on High-Margin Categories",
          description: "Analyze POS sales logs to identify the top 20% highest margin retail items. Allocate 60% of marketing budgets to push these specific products.",
          impact: "high",
          category: "revenue_growth"
        }
      ];
      
      return NextResponse.json({ recommendations: fallbacks });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
