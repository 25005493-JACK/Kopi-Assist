const BASE_URL = 'https://api.baserow.io';
const TOKEN = 'Jv9EYjwcK3TLhr6qJnCfH6HdtgiMgshj';
const TABLE_ID = 1082484; // Menu

async function getMenuItems() {
  const res = await fetch(`${BASE_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true`, {
    headers: { Authorization: `Token ${TOKEN}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to fetch menu: ${txt}`);
  }
  const data = await res.json();
  return data.results || [];
}

async function writeMockMenu() {
  const mockItems = [
    { 'Item_Name': 'Signature Milk Tea', 'Active': '9.90' },
    { 'Item_Name': 'Oriental Pearl Milk Tea', 'Active': '11.90' },
    { 'Item_Name': 'Jasmine Green Tea', 'Active': '7.90' },
    { 'Item_Name': 'Brown Sugar Milk Tea', 'Active': '12.90' },
    { 'Item_Name': 'Oolong Milk Tea', 'Active': '9.90' },
    { 'Item_Name': 'Matcha Latte', 'Active': '13.90' },
    { 'Item_Name': 'Butter Croissant', 'Active': '6.90' },
    { 'Item_Name': 'Portuguese Egg Tart', 'Active': '4.50' },
    { 'Item_Name': 'Oriental Nasi Lemak', 'Active': '15.90' },
    { 'Item_Name': 'Mee Siam', 'Active': '13.90' }
  ];

  for (const item of mockItems) {
    await fetch(`${BASE_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item)
    });
  }
  console.log('Populated 10 mock menu items.');
}

async function main() {
  let items = await getMenuItems();
  if (items.length === 0) {
    console.log('Menu table is empty. Pre-populating mock items first...');
    await writeMockMenu();
    items = await getMenuItems();
  }

  console.log(`Found ${items.length} menu items. Exporting to CSV...`);
  
  // Format CSV with clear headers: "Item_Name", "Price"
  const csvLines = [['Item_Name', 'Price']];
  items.forEach(item => {
    // If the item has Item_Name, export it. If it was empty mock, fallback.
    const name = item['Item_Name'] || item['item_name'] || '';
    const price = item['Active'] || item['price'] || '0.00';
    if (name) {
      csvLines.push([name, parseFloat(price).toFixed(2)]);
    }
  });

  const csvContent = csvLines.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  
  const destDir = 'e:/Hack Attack 3 fnb/SME-Assist-main/Data/Oriental Tea FnB';
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, 'Oriental_Tea_Menu.csv'), csvContent);
  console.log(`✅ Menu successfully exported to ${path.join(destDir, 'Oriental_Tea_Menu.csv')}`);
}

import fs from 'fs';
import path from 'path';

main().catch(console.error);
