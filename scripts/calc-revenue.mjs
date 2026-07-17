import fs from 'fs';
import path from 'path';

const outDir = 'e:/Hack Attack 3 fnb/Kopi Assist/Data/Oriental Tea FnB';
const files = [
  'Oriental_Tea_General_2026.csv',
  'Oriental_Tea_ShopeeFood_2026.csv',
  'Oriental_Tea_FoodPanda_2026.csv'
];

const monthlyRevenue = {};
// Initialize months
for (let i = 1; i <= 12; i++) {
  const m = String(i).padStart(2, '0');
  monthlyRevenue[`2026-${m}`] = { general: 0, shopee: 0, panda: 0, total: 0 };
}

function parseCSV(filePath, type) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length < 2) return;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/["']/g, ''));
    if (values.length < 4) continue;
    const date = values[0];
    const recType = values[1];
    const amount = parseFloat(values[3]) || 0;

    if (recType === 'income') {
      const monthKey = date.substring(0, 7); // YYYY-MM
      if (monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey][type] += amount;
        monthlyRevenue[monthKey].total += amount;
      }
    }
  }
}

parseCSV(path.join(outDir, files[0]), 'general');
parseCSV(path.join(outDir, files[1]), 'shopee');
parseCSV(path.join(outDir, files[2]), 'panda');

console.log('Monthly Revenue Breakdown for 2026:');
console.log('Month   | In-Store Sales (RM) | Shopee Food (RM) | Food Panda (RM) | Total Revenue (RM)');
console.log('--------|---------------------|------------------|-----------------|-------------------');
Object.entries(monthlyRevenue).sort().forEach(([month, data]) => {
  console.log(
    `${month} | ` +
    `${data.general.toFixed(2).padStart(19)} | ` +
    `${data.shopee.toFixed(2).padStart(16)} | ` +
    `${data.panda.toFixed(2).padStart(15)} | ` +
    `${data.total.toFixed(2).padStart(18)}`
  );
});

const grandTotal = Object.values(monthlyRevenue).reduce((s, d) => s + d.total, 0);
console.log('--------|---------------------|------------------|-----------------|-------------------');
console.log(`GRAND TOTAL REVENUE FOR 2026: RM ${grandTotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`);
