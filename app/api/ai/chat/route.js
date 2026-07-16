import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const BASEROW_URL = process.env.BASEROW_BASE_URL;
const FIN_TABLE = process.env.BASEROW_FINANCIAL_TABLE_ID;
const COMP_TABLE = process.env.BASEROW_COMPANY_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

export async function POST(request) {
  try {
    const { message, company_id, history = [] } = await request.json();

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

    // Fetch recent financial data
    const finRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${FIN_TABLE}/?user_field_names=true&filter__company_id__equal=${company_id}&size=100&order_by=-date`,
      { 
        headers: { 'Authorization': `Token ${TOKEN}` },
        cache: 'no-store'
      }
    );
    const finData = await finRes.json();

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemPrompt = `You are Kopi Assist AI, a financial advisor for small and medium enterprises. You have access to this company's data:

Company: ${company.company_name}
Industry: ${company.industry}
Headcount: ${company.headcount}
Avg Monthly Revenue: RM ${company.avg_monthly_revenue}

Recent Financial Records:
${JSON.stringify((finData.results || []).slice(0, 50).map(r => ({
  date: r.date, type: r.type, category: r.category, amount: r.amount, description: r.description
})), null, 2)}

Provide specific, actionable financial advice based on this data. Be concise. Use RM for currency. If asked about things outside financial management, politely redirect.`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I\'m Kopi Assist AI, ready to help with financial decisions based on your company data.' }] },
      ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message }] },
    ];

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
      });

      return NextResponse.json({ success: true, reply: response.text });
    } catch (aiErr) {
      console.warn("AI Chat generation failed, running dynamic rule engine fallback:", aiErr.message);
      
      const q = message.toLowerCase();
      const records = finData.results || [];
      
      // Calculate active metrics from the retrieved transactions
      let totalInc = 0;
      let totalExp = 0;
      const categories = {};
      const claims = [];
      const highExpenses = [];

      records.forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        if (r.type === 'income') {
          totalInc += amt;
        } else {
          totalExp += amt;
          categories[r.category] = (categories[r.category] || 0) + amt;
          
          if (r.category?.toLowerCase() === 'claims') {
            claims.push(r);
          }
          if (amt > 3000) {
            highExpenses.push(r);
          }
        }
      });

      const netFlow = totalInc - totalExp;
      const topExpenseCategory = Object.keys(categories).length > 0 
        ? Object.entries(categories).sort((a,b) => b[1] - a[1])[0][0]
        : "N/A";

      let reply = `I analyzed your last ${records.length} transactions:
- Total Income: RM ${totalInc.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
- Total Expenses: RM ${totalExp.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
- Net Position: RM ${netFlow.toLocaleString('en-MY', { minimumFractionDigits: 2 })} (${netFlow >= 0 ? 'Surplus' : 'Deficit'})

What specific details would you like me to extract?`;

      if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("who are you")) {
        reply = `Hello! I'm Kopi Assist AI. I see you are representing **${company.company_name}** in the **${company.industry || 'general retail'}** industry. 

I can summarize your revenue, analyze recent expenses, identify anomalous claims, or calculate your cash flow metrics. How can I help you?`;
      } 
      
      else if (q.includes("revenue") || q.includes("income") || q.includes("sales") || q.includes("earn")) {
        reply = `📊 **Revenue Analysis**
Based on your recent transaction ledger:
- Total Income: **RM ${totalInc.toLocaleString('en-MY', { minimumFractionDigits: 2 })}**
- Profile target monthly revenue: **RM ${parseFloat(company.avg_monthly_revenue || 0).toLocaleString()}**
- Income Transactions: ${records.filter(r => r.type === 'income').length} items.

*Advisor Tip:* Try to bundle related retail products during weekend promotional hours to bump your average purchase size.`;
      } 
      
      else if (q.includes("expense") || q.includes("cost") || q.includes("spent") || q.includes("pay")) {
        reply = `📉 **Expense Breakdown**
Based on your recent transaction ledger:
- Total Expenses: **RM ${totalExp.toLocaleString('en-MY', { minimumFractionDigits: 2 })}**
- Primary spending category: **${topExpenseCategory}**
- High transactions (> RM 3,000): ${highExpenses.length} items.

${highExpenses.length > 0 ? `*Largest Expense items:*
${highExpenses.slice(0, 3).map(e => `- RM ${parseFloat(e.amount).toLocaleString()} on ${e.date} (${e.description || e.category})`).join('\n')}` : '*No single transaction exceeded RM 3,000.*'}`;
      } 
      
      else if (q.includes("cash") || q.includes("flow") || q.includes("status") || q.includes("health")) {
        reply = `💸 **Cash Flow Health**
- Cash Inflows: RM ${totalInc.toLocaleString()}
- Cash Outflows: RM ${totalExp.toLocaleString()}
- Net Balance: **RM ${netFlow.toLocaleString()}**

*Verdict:* Your cash flow position is **${netFlow >= 0 ? 'HEALTHY (Positive flow)' : 'CRITICAL (Negative flow)'}**. 
*Recommendation:* Offer a 2% prompt-payment discount for outstanding invoices and pause non-essential supplies until net balance climbs.`;
      } 
      
      else if (q.includes("anomaly") || q.includes("anomalies") || q.includes("suspicious") || q.includes("claim") || q.includes("fraud")) {
        const potentialIssues = [];
        
        // Find high claims
        claims.forEach(c => {
          const amt = parseFloat(c.amount) || 0;
          if (amt > 1000) {
            potentialIssues.push(`Claim by employee of RM ${amt.toLocaleString()} on ${c.date} for "${c.description || 'travel'}"`);
          }
        });

        // Find duplicates
        const seen = {};
        records.forEach(r => {
          const key = `${r.date}_${r.amount}_${r.description}`;
          if (seen[key]) {
            potentialIssues.push(`Potential duplicate entry: RM ${parseFloat(r.amount).toLocaleString()} on ${r.date} ("${r.description}")`);
          } else {
            seen[key] = true;
          }
        });

        reply = `🔍 **Anomaly Check**
I scanned your transaction ledger for risks:
- Total employee claims checked: ${claims.length}
- Potential anomalies flagged: ${potentialIssues.length}

${potentialIssues.length > 0 ? `*Flagged Items:*
${potentialIssues.map((p, idx) => `${idx + 1}. ${p}`).join('\n')}` : '✅ No suspicious claims or duplicates were found in your recent transaction history.'}`;
      }

      else if (q.includes("advice") || q.includes("help") || q.includes("recommend")) {
        reply = `💡 **Strategic Advice for ${company.company_name}**
1. **Reduce Overhead**: Your primary expense is in **${topExpenseCategory}**. Monitor this category closely next month.
2. **Cap Travel & Claims**: Restrict employee outstation expenses to a maximum of RM 1,000 per claim.
3. **Festive Inventory**: Since you are in the **${company.industry || 'Retail'}** sector, ensure you hold 30% higher stock buffer in the month preceding Hari Raya or CNY.
4. **Liquidity**: Keep 3 months of basic payroll (RM ${(company.headcount * 3000 || 15000).toLocaleString()}) in a liquid deposit.`;
      }

      return NextResponse.json({ success: true, reply });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
