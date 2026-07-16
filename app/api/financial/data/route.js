import { NextResponse } from 'next/server';

const BASEROW_URL = process.env.BASEROW_BASE_URL;
const TABLE_ID = process.env.BASEROW_FINANCIAL_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    if (!companyId) return NextResponse.json({ error: 'company_id required' }, { status: 400 });

    let allRows = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&filter__company_id__equal=${companyId}&size=200&page=${page}`,
        { 
          headers: { 'Authorization': `Token ${TOKEN}` },
          cache: 'no-store'
        }
      );
      const data = await res.json();
      allRows = allRows.concat(data.results || []);
      hasMore = data.next !== null;
      page++;
    }

    return NextResponse.json({ results: allRows, count: allRows.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { company_id, records } = body;

    if (!company_id || !records || !records.length) {
      return NextResponse.json({ error: 'company_id and records required' }, { status: 400 });
    }

    const results = [];
    for (const record of records) {
      const res = await fetch(
        `${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: parseInt(company_id),
            date: record.date || new Date().toISOString().split('T')[0],
            type: record.type || '',
            category: record.category || '',
            amount: parseFloat(record.amount) || 0,
            description: record.description || '',
            source: record.source || 'manual',
            voucher_code: record.voucher_code || '',
          }),
        }
      );
      if (res.ok) {
        results.push(await res.json());
      }
    }

    return NextResponse.json({ success: true, count: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
