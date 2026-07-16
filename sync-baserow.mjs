// sync-baserow.mjs
// Clears all existing financial records for company_id=3 and re-uploads from CSV
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASEROW_URL = 'https://api.baserow.io';
const TABLE_ID = '1079437';
const TOKEN = 'FAILUYrwpomEGDga1unyEBEQbx5xRkyh';
const COMPANY_ID = 3;

const CSV_PATH = path.join(__dirname, 'Data', 'Jack Enterprise', 'jack_enterprise_mock_financial_data.csv');

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\r/g, ''));
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/\r/g, ''));
    if (values.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    const pic = row.person_in_charge || 'Jack';
    const description = row.description || '';
    const finalDesc = `${description} [PIC: ${pic}]`.trim();
    records.push({
      date: row.date,
      type: row.type.toLowerCase(),
      category: row.category,
      amount: parseFloat(row.amount) || 0,
      description: finalDesc,
    });
  }
  return records;
}

async function getAllRows() {
  let allRows = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&filter__company_id__equal=${COMPANY_ID}&size=200&page=${page}`,
      { headers: { Authorization: `Token ${TOKEN}` } }
    );
    const data = await res.json();
    allRows = allRows.concat(data.results || []);
    hasMore = data.next !== null;
    page++;
  }
  return allRows;
}

async function deleteRow(id) {
  await fetch(`${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Token ${TOKEN}` },
  });
}

async function insertRow(record) {
  const res = await fetch(`${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true`, {
    method: 'POST',
    headers: { Authorization: `Token ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: COMPANY_ID, ...record, source: 'jack_enterprise_mock_financial_data.csv' }),
  });
  return res.ok;
}

async function main() {
  console.log('🔍 Fetching existing records for company_id=' + COMPANY_ID + '...');
  const existing = await getAllRows();
  console.log(`🗑️  Deleting ${existing.length} existing records...`);
  for (const row of existing) {
    await deleteRow(row.id);
    process.stdout.write('.');
  }
  console.log('\n✅ All existing records deleted.');

  console.log('📂 Reading CSV...');
  const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(csvText);
  console.log(`📤 Inserting ${records.length} new records...`);
  let inserted = 0;
  for (const record of records) {
    const ok = await insertRow(record);
    if (ok) { inserted++; process.stdout.write('.'); }
    else process.stdout.write('x');
  }
  console.log(`\n✅ Done! Inserted ${inserted}/${records.length} records.`);

  // Summary
  const months = {};
  const csvLines = csvText.trim().split('\n').slice(1);
  csvLines.forEach(line => {
    const [date, type, , amountStr] = line.split(',');
    if (!date) return;
    const key = date.slice(0, 7);
    if (!months[key]) months[key] = { income: 0, expenses: 0 };
    const amount = parseFloat(amountStr) || 0;
    if (type === 'income') months[key].income += amount;
    else months[key].expenses += amount;
  });
  console.log('\n📊 Monthly Cashflow Summary:');
  Object.entries(months).sort().forEach(([m, v]) => {
    const net = v.income - v.expenses;
    const sign = net >= 0 ? '✅ +' : '❌ ';
    console.log(`  ${m}: Income RM${v.income.toLocaleString()} | Expenses RM${v.expenses.toLocaleString()} | Net ${sign}RM${Math.abs(net).toLocaleString()}`);
  });
}

main().catch(console.error);
