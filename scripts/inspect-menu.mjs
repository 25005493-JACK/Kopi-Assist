const BASE_URL = 'https://api.baserow.io';
const TOKEN = 'Jv9EYjwcK3TLhr6qJnCfH6HdtgiMgshj';
const TABLE_ID = 1082484; // Menu

async function main() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&size=1`, {
    headers: { Authorization: `Token ${TOKEN}` },
  });
  const data = await res.json();
  console.log('Sample item structure:', JSON.stringify(data.results?.[0], null, 2));
}

main().catch(console.error);
