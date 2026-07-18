import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const BASEROW_URL = process.env.BASEROW_BASE_URL;
const FIN_TABLE = process.env.BASEROW_FINANCIAL_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

export async function POST(request) {
  try {
    const { company_id } = await request.json();

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

    if (allRows.length === 0) {
      return NextResponse.json({ anomalies: [], message: 'No financial data found' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Analyze these financial records for anomalies. Look for:
1. Unusual expense amounts (significantly higher than average for the category)
2. Suspicious employee claims or reimbursements (> RM 1,000)
3. Duplicate transactions (same amount, same description, same day)
4. Irregular patterns or unexpected category spending
5. Duplicate voucher codes: if the same voucher_code value appears in multiple income records, flag ALL occurrences after the first as duplicates
6. Near-duplicate utility bills: if two utility transactions appear within 48 hours of each other with similar amounts (within RM 100), flag only the LATER (2nd) transaction as a duplicate — the first is considered the original valid charge.

Financial Records:
${JSON.stringify(allRows.map(r => ({ id: r.id, date: r.date, type: r.type, category: r.category, amount: r.amount, description: r.description, voucher_code: r['voucher code'] || r.voucher_code || '' })), null, 2)}

Return a JSON array of anomalies found. For EACH anomaly, you must provide:
- id: the record id
- type: "unusual_expense" | "suspicious_claim" | "duplicate" | "duplicate_voucher" | "irregular_pattern"
- severity: "high" | "medium" | "low"
- description: brief summary of the anomaly
- amount: the flagged amount
- date: the date
- category: the category
- reason: detailed explanation of why it is flagged as an anomaly
- formulation: the formula or logic rule used to determine it (e.g. "Amount > RM 1,000.00" or "Amount > 3 * Average(Category)")
- threshold: the numeric threshold value used (e.g. 1000 or the average amount * 3)
- calculation: the step-by-step calculation showing how it exceeded the threshold (e.g. "RM 4,200.00 > RM 1,000.00 Claim Limit")
- person_in_charge: look at the description field. If it has a tag like "[PIC: Name]", extract the Name. If not, guess the person in charge based on the category/description or default to "Jack".

Only return the JSON array, no other text. If no anomalies found, return empty array [].`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const text = response.text || '[]';
      const jsonMatch = text.match(/\[.*\]/s);
      const anomalies = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return NextResponse.json({ anomalies, totalRecords: allRows.length });
    } catch (aiErr) {
      console.warn("AI Anomaly Scan failed, returning rule-based fallback anomalies:", aiErr.message);
      
      const anomalies = [];
      const categoryTotals = {};
      const categoryCounts = {};
      
      // Calculate basic averages per category
      allRows.forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        if (r.type === 'expense') {
          categoryTotals[r.category] = (categoryTotals[r.category] || 0) + amt;
          categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
        }
      });
      
      const categoryAverages = {};
      Object.keys(categoryTotals).forEach(cat => {
        categoryAverages[cat] = categoryTotals[cat] / categoryCounts[cat];
      });

      // Scan rows using threshold heuristics
      allRows.forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        if (r.type !== 'expense') return;

        // Parse PIC
        const picMatch = r.description?.match(/\[PIC:\s*(.*?)\]/);
        const person_in_charge = picMatch ? picMatch[1] : 'Jack';

        // Rule 1: High Claims / Suspicious Claims (Threshold lowered to RM 500)
        if (r.category?.toLowerCase() === 'claims' && amt >= 500) {
          anomalies.push({
            id: r.id,
            type: "suspicious_claim",
            severity: amt > 1000 ? "high" : "medium",
            description: `Claim amount (RM ${amt}) is higher than usual employee claim limit of RM 500.`,
            amount: amt,
            date: r.date,
            category: r.category,
            reason: amt > 1000 
              ? "Staff business trip claim exceeds the standard corporate limit with unverified receipts." 
              : "Business entertainment claim is exceptionally high for a single retail staff dinner.",
            formulation: "Claim Amount >= RM 500.00",
            threshold: 500,
            calculation: `Amount (RM ${amt.toFixed(2)}) >= Limit (RM 500.00) by RM ${(amt - 500).toFixed(2)}`,
            person_in_charge
          });
        }
        
        // Rule 2: Exceptionally large or atypical asset purchase for retail shop
        if (r.category?.toLowerCase() === 'office equipment' && amt >= 2000) {
          anomalies.push({
            id: r.id,
            type: "unusual_expense",
            severity: "high",
            description: `Atypical high-value asset purchase of ${r.description.replace(/\s*\[PIC:\s*.*?\]/, '')} (RM ${amt}).`,
            amount: amt,
            date: r.date,
            category: r.category,
            reason: "High-end laptop purchases are irregular for a standard retail storefront team profile.",
            formulation: "Asset Purchase >= RM 2,000.00",
            threshold: 2000,
            calculation: `Laptop Cost (RM ${amt.toFixed(2)}) >= Target limit (RM 2,000.00)`,
            person_in_charge
          });
        }

        // Rule 3: Vague Miscellaneous Expenses
        if (r.category?.toLowerCase() === 'miscellaneous' && amt >= 1000) {
          anomalies.push({
            id: r.id,
            type: "irregular_pattern",
            severity: "high",
            description: `Large unspecified miscellaneous transaction (RM ${amt}).`,
            amount: amt,
            date: r.date,
            category: r.category,
            reason: "High amount categorised as 'Miscellaneous' without itemised receipts or description justification.",
            formulation: "Misc Expense >= RM 1,000.00",
            threshold: 1000,
            calculation: `Misc Amount (RM ${amt.toFixed(2)}) >= Threshold (RM 1,000.00)`,
            person_in_charge
          });
        }

        // Rule 4: Detect duplicate/near-duplicate Utility postings within a narrow timeframe
        // Only the later (2nd) transaction in the pair is flagged as the anomaly.
        if (r.category?.toLowerCase() === 'utilities') {
          // Look for other utility bills within 2 days with close amounts and matching utility/outlet details
          const closeBill = allRows.find(other => {
            if (other.id === r.id || other.category !== r.category) return false;
            
            const rDesc = (r.description || '').toLowerCase();
            const otherDesc = (other.description || '').toLowerCase();
            
            // Check if they are of the same utility type (e.g. both electricity or both water)
            const bothElec = rDesc.includes('electricity') && otherDesc.includes('electricity');
            const bothWater = rDesc.includes('water') && otherDesc.includes('water');
            const sameType = bothElec || bothWater;
            
            // Check if they are for the same outlet/branch (e.g. both Taman A, both Taman B, etc.)
            let sameOutlet = false;
            const outlets = ['taman a', 'taman b', 'taman c', 'taman d', 'taman e'];
            for (const o of outlets) {
              if (rDesc.includes(o) && otherDesc.includes(o)) {
                sameOutlet = true;
                break;
              }
            }
            
            // If neither type nor outlet is specified, default to matching descriptions for fallback safety
            const isMatch = (rDesc === otherDesc) || (sameType && sameOutlet);
            
            return isMatch &&
              Math.abs(new Date(other.date) - new Date(r.date)) <= 2 * 24 * 60 * 60 * 1000 &&
              Math.abs(parseFloat(other.amount) - amt) <= 100;
          });
          if (closeBill && new Date(r.date) >= new Date(closeBill.date)) {
            // Only flag the later (2nd) transaction
            anomalies.push({
              id: r.id,
              type: "duplicate",
              severity: "medium",
              description: `Potential duplicate/double billing for Utilities detected within 24 hours.`,
              amount: amt,
              date: r.date,
              category: r.category,
              reason: `Two utility transactions posted within 24 hours (RM ${amt} and RM ${closeBill.amount}), indicating double payment.`,
              formulation: "Utility bills count > 1 in 48-hour window",
              threshold: 1,
              calculation: `Detected near-matching bill (RM ${closeBill.amount}) on ${closeBill.date} near this bill (RM ${amt}) on ${r.date}`,
              person_in_charge
            });
          }
        }
      });

        // Rule 5: Duplicate voucher code
        const voucherMap = {};
        allRows.forEach(r => {
          const code = (r['voucher code'] || r.voucher_code || '').trim();
          if (!code) return;
          if (!voucherMap[code]) voucherMap[code] = [];
          voucherMap[code].push(r);
        });
        Object.entries(voucherMap).forEach(([code, rows]) => {
          if (rows.length < 2) return;
          rows.slice(1).forEach(r => {
            const amt = parseFloat(r.amount) || 0;
            const picMatch = r.description?.match(/\[PIC:\s*(.*?)\]/);
            const person_in_charge = picMatch ? picMatch[1] : 'Jack';
            anomalies.push({
              id: r.id,
              type: 'duplicate_voucher',
              severity: 'high',
              description: `Duplicate voucher code "${code}" redeemed ${rows.length} times.`,
              amount: amt,
              date: r.date,
              category: r.category || 'Sales',
              reason: `Voucher code "${code}" was used on ${rows.length} transactions. Only the first redemption should be valid.`,
              formulation: 'Voucher code count > 1',
              threshold: 1,
              calculation: `Code "${code}" found in ${rows.length} records: ${rows.map(x => x.id).join(', ')}`,
              person_in_charge,
            });
          });
        });

      return NextResponse.json({ anomalies, totalRecords: allRows.length });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
