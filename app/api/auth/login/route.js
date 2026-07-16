import { NextResponse } from 'next/server';

const BASEROW_URL = process.env.BASEROW_BASE_URL;
const TABLE_ID = process.env.BASEROW_COMPANY_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'kopi-assist-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request) {
  try {
    const { company_name, password } = await request.json();

    if (!company_name || !password) {
      return NextResponse.json({ error: 'Company name and password required' }, { status: 400 });
    }

    const res = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&filter__company_name__equal=${encodeURIComponent(company_name)}`,
      { headers: { 'Authorization': `Token ${TOKEN}` } }
    );
    const data = await res.json();

    if (data.count === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = data.results[0];
    const inputHash = await hashPassword(password);

    if (inputHash !== company.password_hash) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        company_name: company.company_name,
        headcount: company.headcount,
        industry: company.industry,
        avg_monthly_revenue: company.avg_monthly_revenue,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
