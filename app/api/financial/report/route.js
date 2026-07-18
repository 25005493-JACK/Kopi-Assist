import { NextResponse } from 'next/server';
import { GoogleGenAI } from '../../ai/openai-fallback';

const BASEROW_URL = process.env.BASEROW_BASE_URL;
const FIN_TABLE = process.env.BASEROW_FINANCIAL_TABLE_ID;
const COMP_TABLE = process.env.BASEROW_COMPANY_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

export async function POST(request) {
  try {
    const { company_id } = await request.json();

    // Fetch company info
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

    // Fetch all financial data
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

    const prompt = `You are a professional financial analyst. Generate a comprehensive annual financial report for this F&B company.

Company Info:
- Name: ${company.company_name}
- Industry: ${company.industry}
- Headcount: ${company.headcount}
- Average Monthly Revenue: RM ${company.avg_monthly_revenue}

Financial Records (${allRows.length} entries):
${JSON.stringify(allRows.map(r => ({ date: r.date, type: r.type, category: r.category, amount: r.amount, description: r.description, source: r.source })), null, 2)}

Generate a professional report with:
1. Executive Summary
2. Revenue Analysis (by month, by category)
3. Expense Analysis (by month, by category)
4. Profit & Loss Summary
5. Cash Flow Analysis
6. Key Financial Ratios
7. Payment Method & Platform Preference Analysis (group income records by source/platform: Shopee Food, Food Panda, GrabFood, Cash, Card, QR/DuitNow, E-Invoice, etc. Show volume and % share per platform. Identify the most preferred payment platform by customers.)
8. Recommendations for Improvement
9. Risk Assessment

Format as a clean professional report with sections and bullet points. Use RM for currency.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      return NextResponse.json({
        success: true,
        report: response.text,
        company: {
          name: company.company_name,
          industry: company.industry,
        },
        dataPoints: allRows.length,
      });
    } catch (aiErr) {
      console.warn("AI Report generation failed, generating structured fallback report:", aiErr.message);

      // Perform calculations for a high-quality structured financial report
      let totalIncome = 0;
      let totalExpense = 0;
      const incomeCategories = {};
      const expenseCategories = {};
      const monthlySummary = {};

      allRows.forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        if (!r.date) return;
        const monthKey = r.date.substring(0, 7); // YYYY-MM
        
        if (!monthlySummary[monthKey]) {
          monthlySummary[monthKey] = { income: 0, expenses: 0 };
        }

        if (r.type === 'income') {
          totalIncome += amt;
          incomeCategories[r.category] = (incomeCategories[r.category] || 0) + amt;
          monthlySummary[monthKey].income += amt;
        } else {
          totalExpense += amt;
          expenseCategories[r.category] = (expenseCategories[r.category] || 0) + amt;
          monthlySummary[monthKey].expenses += amt;
        }
      });

      const netProfit = totalIncome - totalExpense;
      const expenseRatio = totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 'N/A';
      const monthlyActiveCount = Object.keys(monthlySummary).length || 1;
      const avgMonthlyIncome = (totalIncome / monthlyActiveCount).toFixed(2);
      const avgMonthlyExpense = (totalExpense / monthlyActiveCount).toFixed(2);

      // Construct a highly detailed text report
      let reportText = `========================================================================
ANNUAL FINANCIAL PERFORMANCE REPORT
========================================================================
Company Profile:
- Company Name: ${company.company_name}
- Industry Sector: ${company.industry || 'General Business'}
- Active Headcount: ${company.headcount || 'N/A'} Employees
- Target Monthly Revenue: RM ${parseFloat(company.avg_monthly_revenue || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
- Data Scanned: ${allRows.length} transactions across ${monthlyActiveCount} active months

------------------------------------------------------------------------
1. EXECUTIVE SUMMARY
------------------------------------------------------------------------
This report presents a comprehensive financial performance review for ${company.company_name}. 
Based on the financial transactions uploaded into the system:
- Total Accumulated Revenue: RM ${totalIncome.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
- Total Accumulated Expenses: RM ${totalExpense.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
- Net Profit/Loss Position: RM ${netProfit.toLocaleString('en-MY', { minimumFractionDigits: 2 })} (${netProfit >= 0 ? 'Surplus' : 'Deficit'})
- Operating Efficiency Ratio: ${expenseRatio}% (Expenses as a % of Income)

The business is operating in a ${netProfit >= 0 ? 'profitable' : 'loss-making'} state. Average monthly revenue stands at RM ${parseFloat(avgMonthlyIncome).toLocaleString()} against average monthly expenses of RM ${parseFloat(avgMonthlyExpense).toLocaleString()}.

------------------------------------------------------------------------
2. MONTHLY CASH FLOW ANALYSIS
------------------------------------------------------------------------
A breakdown of monthly performance highlights the consistency of business cash inflows and outflows:

`;

      Object.keys(monthlySummary).sort().forEach(m => {
        const mInc = monthlySummary[m].income;
        const mExp = monthlySummary[m].expenses;
        const mNet = mInc - mExp;
        reportText += `* Month [${m}]:
  - Revenue:   RM ${mInc.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
  - Expenses:  RM ${mExp.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
  - Net Flow:  RM ${mNet.toLocaleString('en-MY', { minimumFractionDigits: 2 })} (${mNet >= 0 ? 'POSITIVE' : 'NEGATIVE'})\n\n`;
      });

      reportText += `------------------------------------------------------------------------
3. CATEGORICAL REVENUE & EXPENSE breakdown
------------------------------------------------------------------------
A. REVENUE SOURCE STREAMS:
`;

      Object.keys(incomeCategories).forEach(cat => {
        const val = incomeCategories[cat];
        const pct = totalIncome > 0 ? ((val / totalIncome) * 100).toFixed(1) : 0;
        reportText += `- ${cat}: RM ${val.toLocaleString('en-MY', { minimumFractionDigits: 2 })} (${pct}%)\n`;
      });

      reportText += `\nB. MAJOR OPERATIONAL OUTFLOWS:\n`;
      Object.keys(expenseCategories).forEach(cat => {
        const val = expenseCategories[cat];
        const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : 0;
        reportText += `- ${cat}: RM ${val.toLocaleString('en-MY', { minimumFractionDigits: 2 })} (${pct}%)\n`;
      });

      // Payment method/platform breakdown
      const platformTotals = {};
      allRows.forEach(r => {
        if (r.type !== 'income') return;
        const amt = parseFloat(r.amount) || 0;
        let platform = 'Other';
        const src = (r.source || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        if (src.includes('shopee') || desc.includes('shopee')) platform = 'Shopee Food';
        else if (src.includes('food panda') || src.includes('foodpanda') || desc.includes('foodpanda') || desc.includes('food panda')) platform = 'Food Panda';
        else if (src.includes('grab') || desc.includes('grabfood') || desc.includes('grab food')) platform = 'GrabFood';
        else if (src.includes('b2c receipt') || desc.includes('b2c')) {
          const payMatch = (r.description || '').match(/Pay:\s*([^|]+)/);
          platform = payMatch ? payMatch[1].trim() : 'In-Store (B2C)';
        }
        else if (src.includes('e-invoice') || src.includes('b2b')) platform = 'E-Invoice (B2B)';
        else if (src.includes('cash') || desc.includes('cash')) platform = 'Cash';
        else if (src.includes('card') || desc.includes('card')) platform = 'Card';
        else if (src.includes('qr') || src.includes('duitnow') || desc.includes('duitnow')) platform = 'QR / DuitNow';
        platformTotals[platform] = (platformTotals[platform] || 0) + amt;
      });
      const totalPlatformIncome = Object.values(platformTotals).reduce((s, v) => s + v, 0);
      const platformRanked = Object.entries(platformTotals).sort((a, b) => b[1] - a[1]);

      let platformSection = `
------------------------------------------------------------------------
6. PAYMENT METHOD & PLATFORM PREFERENCE ANALYSIS
------------------------------------------------------------------------
Breakdown of income by collection platform/payment method:
`;
      platformRanked.forEach(([plat, val]) => {
        const pct = totalPlatformIncome > 0 ? ((val / totalPlatformIncome) * 100).toFixed(1) : 0;
        platformSection += `- ${plat}: RM ${val.toLocaleString('en-MY', { minimumFractionDigits: 2 })} (${pct}%)\n`;
      });
      if (platformRanked.length > 0) {
        platformSection += `\n⭐ Most Preferred Platform: ${platformRanked[0][0]} (${((platformRanked[0][1] / totalPlatformIncome) * 100).toFixed(1)}% of revenue)\n`;
      }

      reportText += platformSection;

      reportText += `
------------------------------------------------------------------------
7. KEY FINANCIAL HEALTH RATIOS
------------------------------------------------------------------------
- Profit Margin: ${totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0'}%
  (Percentage of sales turned into profit. A margin above 15% is healthy for F&B companies; typical F&B net margins range from 10–15%.)
- Expense Coverage Multiplier: ${totalExpense > 0 ? (totalIncome / totalExpense).toFixed(2) : 'N/A'}x
  (Ability of income streams to cover current operational costs.)
- Employee Efficiency Index: RM ${(company.headcount > 0 ? totalIncome / company.headcount : totalIncome).toLocaleString(undefined, { maximumFractionDigits: 0 })} revenue generated per headcount.

------------------------------------------------------------------------
8. RECOMMENDATIONS FOR IMPROVEMENT
------------------------------------------------------------------------
Based on calculated operational indicators, we advise the company to:
1. ${expenseRatio > 80 ? 'CRITICAL: Your expense ratio is high at ' + expenseRatio + '%. Implement cost-control audits across discretionary categories (e.g. claims, office equipment).' : 'Maintain your healthy expense buffer and reinvest capital into high-margin segments.'}
2. Restructure supplier accounts and review credit terms to stretch payable periods, matching cash collection terms.
3. Audit and cap employee claims and travel expense ceilings to prevent minor cash leaks from scaling.
4. Establish cash flow buffers by setting aside 5% of monthly positive flows into interest-earning business savings deposits.
5. ${platformRanked.length > 0 ? `Strengthen your presence on ${platformRanked[0][0]} — your top revenue platform — through promotions and exclusive deals to capture more market share.` : 'Diversify payment collection platforms to reduce single-platform dependency.'}`;

      return NextResponse.json({
        success: true,
        report: reportText,
        company: {
          name: company.company_name,
          industry: company.industry,
        },
        dataPoints: allRows.length,
      });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
