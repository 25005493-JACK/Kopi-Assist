import { NextResponse } from 'next/server';

const BASE_URL = process.env.BASEROW_BASE_URL;
const TABLE_ID = process.env.BASEROW_MENU_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

export async function GET() {
  try {
    let items = [];
    let page = 1;
    while (true) {
      const res = await fetch(
        `${BASE_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&size=200&page=${page}`,
        { headers: { Authorization: `Token ${TOKEN}` }, cache: 'no-store' }
      );
      const data = await res.json();
      items = items.concat(data.results || []);
      if (!data.next) break;
      page++;
    }
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
