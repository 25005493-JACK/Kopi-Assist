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
    const body = await request.json();
    const { company_name, password, headcount, industry, avg_monthly_revenue } = body;

    if (!company_name || !password) {
      return NextResponse.json({ error: 'Company name and password required' }, { status: 400 });
    }

    // Check if company already exists
    const checkRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&filter__company_name__equal=${encodeURIComponent(company_name)}`,
      { headers: { 'Authorization': `Token ${TOKEN}` } }
    );
    const checkData = await checkRes.json();
    if (checkData.count > 0) {
      return NextResponse.json({ error: 'Company already registered' }, { status: 409 });
    }

    const password_hash = await hashPassword(password);

    // Create the company row
    const createRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name,
          password_hash,
          headcount: parseInt(headcount) || 0,
          industry: industry || '',
          avg_monthly_revenue: parseFloat(avg_monthly_revenue) || 0,
        }),
      }
    );

    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json({ error: 'Failed to register: ' + err }, { status: 500 });
    }

    const newCompany = await createRes.json();

    // Update the company_id field to match the row id
    await fetch(
      `${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/${newCompany.id}/?user_field_names=true`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company_id: newCompany.id }),
      }
    );

    // Clean and Populate Menu Table
    if (body.menu && Array.isArray(body.menu)) {
      const MENU_TABLE_ID = process.env.BASEROW_MENU_TABLE_ID;
      try {
        const getRes = await fetch(`${BASEROW_URL}/api/database/rows/table/${MENU_TABLE_ID}/?user_field_names=true&filter__company_id__equal=${newCompany.id}&size=200`, {
          headers: { 'Authorization': `Token ${TOKEN}` }
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          const ids = (getData.results || []).map(r => r.id);
          if (ids.length > 0) {
            await fetch(`${BASEROW_URL}/api/database/rows/table/${MENU_TABLE_ID}/batch-delete/`, {
              method: 'POST',
              headers: {
                'Authorization': `Token ${TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ items: ids })
            });
          }
        }

        // Insert new menu items
        for (const item of body.menu) {
          if (item.Item_Name) {
            await fetch(`${BASEROW_URL}/api/database/rows/table/${MENU_TABLE_ID}/?user_field_names=true`, {
              method: 'POST',
              headers: {
                'Authorization': `Token ${TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                Item_Name: item.Item_Name,
                price: parseFloat(item.Price || item.Active || item.price || 0),
                company_id: newCompany.id
              })
            });
          }
        }
      } catch (menuErr) {
        console.error('Menu registration upload failed:', menuErr);
      }
    }

    return NextResponse.json({
      success: true,
      company: {
        id: newCompany.id,
        company_name: newCompany.company_name,
        headcount: newCompany.headcount,
        industry: newCompany.industry,
        avg_monthly_revenue: newCompany.avg_monthly_revenue,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
