import fs from 'fs';
import Papa from 'papaparse';

function parseCSVText(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data || [];
  const records = [];

  for (const row of rows) {
    const normalisedRow = {};
    Object.keys(row).forEach(key => {
      normalisedRow[key.trim().toLowerCase().replace(/["']/g, '')] = row[key];
    });

    if (Object.keys(normalisedRow).length < 2) continue;

    const pic = normalisedRow.person_in_charge || normalisedRow.pic || 'Jack';

    records.push({
      date: normalisedRow.date || new Date().toISOString().split('T')[0],
      type: (normalisedRow.type || 'expense').toLowerCase(),
      category: normalisedRow.category || 'Uncategorized',
      amount: parseFloat(normalisedRow.amount) || 0,
      description: normalisedRow.description || normalisedRow.desc || '',
      person_in_charge: pic,
      voucher_code: normalisedRow.voucher_code || normalisedRow.voucher || '',
    });
  }

  return records;
}

const csvPath = 'e:/Hack Attack 3 fnb/Kopi Assist/Data/Oriental Tea FnB/Oriental_Tea_FoodPanda_2026.csv';
const text = fs.readFileSync(csvPath, 'utf-8');
const records = parseCSVText(text);
console.log(`Parsed ${records.length} records.`);
console.log('First record:', records[0]);
console.log('Last record:', records[records.length - 1]);
