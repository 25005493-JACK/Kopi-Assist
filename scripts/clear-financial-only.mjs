const BASE_URL = 'https://api.baserow.io';
const TOKEN = 'Jv9EYjwcK3TLhr6qJnCfH6HdtgiMgshj';
const TABLE_ID = 1082482; // Financial_Data only

async function getAllRowIds(tableId) {
  let ids = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${BASE_URL}/api/database/rows/table/${tableId}/?size=200&page=${page}`, {
      headers: { Authorization: `Token ${TOKEN}` },
    });
    const data = await res.json();
    ids = ids.concat((data.results || []).map(r => r.id));
    if (!data.next) break;
    page++;
  }
  return ids;
}

async function deleteRows(tableId, ids) {
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const res = await fetch(`${BASE_URL}/api/database/rows/table/${tableId}/batch-delete/`, {
      method: 'POST',
      headers: { Authorization: `Token ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: batch }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`Failed batch delete on table ${tableId}:`, txt);
    } else {
      console.log(`Deleted ${batch.length} rows from table ${tableId}`);
    }
  }
}

async function main() {
  console.log(`Fetching rows from table ${TABLE_ID} (Financial Data)...`);
  const ids = await getAllRowIds(TABLE_ID);
  console.log(`Found ${ids.length} rows.`);
  if (ids.length > 0) {
    await deleteRows(TABLE_ID, ids);
  } else {
    console.log('Nothing to delete.');
  }
  console.log('✅ Financial Data table cleared successfully.');
}

main().catch(console.error);
