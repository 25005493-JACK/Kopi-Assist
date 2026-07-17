import { NextResponse } from 'next/server';

const BASE_URL = process.env.BASEROW_BASE_URL;
const TABLE_ID = process.env.BASEROW_MENU_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    let items = [];
    let page = 1;
    while (true) {
      let url = `${BASE_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&size=200&page=${page}`;
      if (companyId) {
        url += `&filter__company_id__equal=${encodeURIComponent(companyId)}`;
      }
      const res = await fetch(
        url,
        { headers: { Authorization: `Token ${TOKEN}` }, cache: 'no-store' }
      );
      const data = await res.json();
      const results = (data.results || []).map(item => ({
        ...item,
        Active: item.price // Map 'price' to 'Active' for compatibility
      }));
      items = items.concat(results);
      if (!data.next) break;
      page++;
    }
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
