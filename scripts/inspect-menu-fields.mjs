const BASE_URL = 'https://api.baserow.io';
const TOKEN = 'Jv9EYjwcK3TLhr6qJnCfH6HdtgiMgshj';
const TABLE_ID = 1082484; // Menu

async function main() {
  const res = await fetch(`${BASE_URL}/api/database/fields/table/${TABLE_ID}/`, {
    headers: { Authorization: `Token ${TOKEN}` },
  });
  const data = await res.json();
  console.log('Menu fields list:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
