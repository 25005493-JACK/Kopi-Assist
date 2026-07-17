import fs from 'fs';
import path from 'path';

const outDir = 'e:/Hack Attack 3 fnb/Kopi Assist/Data/Oriental Tea FnB';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const OUTLETS = ['Taman A', 'Taman B', 'Taman C', 'Taman D', 'Taman E'];
const PICS = ['Jack', 'Sarah', 'Ali', 'Tan', 'Lim', 'Ahmad'];

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// 1. General transactions (Rent, Inventory/Purchases, In-store sales, Claims, Utilities)
function generateGeneral() {
  const records = [['Date', 'Type', 'Category', 'Amount', 'Description', 'Source', 'Person_in_Charge', 'Voucher_Code']];

  // 12 months in 2026
  for (let month = 0; month < 12; month++) {
    const monthStr = String(month + 1).padStart(2, '0');
    
    // Rent for 5 outlets (e.g. posted on the 1st of each month)
    // Vary PIC for each outlet's rent record
    OUTLETS.forEach((outlet, index) => {
      const pic = PICS[index % PICS.length];
      records.push([
        `2026-${monthStr}-01`,
        'expense',
        'Rent',
        '4500.00',
        `Monthly rental for outlet ${outlet}`,
        'Manual',
        pic,
        ''
      ]);
    });

    // Utilities for 5 outlets (spaced out to avoid false duplicates)
    // Taman A (10th), Taman B (12th), Taman C (15th), Taman D (18th), Taman E (21st)
    const UTILITY_DAYS = ['10', '12', '15', '18', '21'];
    OUTLETS.forEach((outlet, index) => {
      const elec = (300 + Math.random() * 200).toFixed(2);
      const water = (50 + Math.random() * 50).toFixed(2);
      const pic = PICS[(index + 1) % PICS.length];
      const day = UTILITY_DAYS[index];
      records.push([
        `2026-${monthStr}-${day}`,
        'expense',
        'Utilities',
        elec,
        `Electricity bill for ${outlet}`,
        'Manual',
        pic,
        ''
      ]);
      records.push([
        `2026-${monthStr}-${day}`,
        'expense',
        'Utilities',
        water,
        `Water bill for ${outlet}`,
        'Manual',
        pic,
        ''
      ]);
    });

    // Deliberate duplicate utility bill for demo in March (Month 2)
    if (month === 2) {
      records.push([
        `2026-03-10`,
        'expense',
        'Utilities',
        '350.00',
        `Duplicate Electricity bill for Taman A`,
        'Manual',
        'Sarah',
        ''
      ]);
      records.push([
        `2026-03-11`,
        'expense',
        'Utilities',
        '350.00',
        `Duplicate Electricity bill for Taman A`,
        'Manual',
        'Sarah',
        ''
      ]);
    }

    // Inventory Purchases (twice a month - F&B COGS)
    records.push([
      `2026-${monthStr}-05`,
      'expense',
      'Inventory',
      (22000 + Math.random() * 4000).toFixed(2),
      'Bulk tea leaves, cups and packaging materials from supplier',
      'Manual',
      'Sarah',
      ''
    ]);
    records.push([
      `2026-${monthStr}-20`,
      'expense',
      'Inventory',
      (18000 + Math.random() * 3000).toFixed(2),
      'Milk, syrup and fresh pastry supplies from vendor',
      'Manual',
      'Ahmad',
      ''
    ]);

    // Marketing Expenses (posted on the 10th)
    records.push([
      `2026-${monthStr}-10`,
      'expense',
      'Marketing',
      (5000 + Math.random() * 1500).toFixed(2),
      'Social media ads and local influencer campaigns payout',
      'Manual',
      'Tan',
      ''
    ]);

    // Staff Salaries (posted on the 28th)
    records.push([
      `2026-${monthStr}-28`,
      'expense',
      'Salaries',
      (70000 + Math.random() * 4000).toFixed(2),
      'Monthly staff salaries and EPF contributions compiled',
      'Manual',
      'Lim',
      ''
    ]);

    // Office claims
    records.push([
      `2026-${monthStr}-28`,
      'expense',
      'Claims',
      (150 + Math.random() * 100).toFixed(2),
      `Petrol and travel claim [PIC: Ali]`,
      'Manual',
      'Ali',
      ''
    ]);

    // Daily Sales (combining in-store Cash, Card, QR)
    // To make it look realistic, we generate random daily transactions
    const daysInMonth = new Date(2026, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const date = `2026-${monthStr}-${dayStr}`;

      // In-store sales with randomized PICs
      const cashAmt = (800 + Math.random() * 400).toFixed(2);
      const cardAmt = (1200 + Math.random() * 600).toFixed(2);
      const qrAmt = (1500 + Math.random() * 800).toFixed(2);

      const cashPic = PICS[day % PICS.length];
      const cardPic = PICS[(day + 1) % PICS.length];
      const qrPic = PICS[(day + 2) % PICS.length];

      records.push([date, 'income', 'Sales', cashAmt, `Daily cash sales compiled for all outlets`, 'POS-Cash', cashPic, '']);
      records.push([date, 'income', 'Sales', cardAmt, `Daily card sales compiled for all outlets`, 'POS-Card', cardPic, '']);
      records.push([date, 'income', 'Sales', qrAmt, `Daily QR / DuitNow sales compiled for all outlets`, 'POS-QR', qrPic, '']);
    }

    // Add some duplicate voucher code anomalies to general to test step 4
    if (month === 5) {
      // June 2026: duplicate vouchers
      records.push([`2026-06-15`, 'income', 'Sales', '50.00', `B2C Receipt RCP-JXE9K | Pay: QR | Voucher: FREE_TEA_50`, 'B2C Receipt', 'Jack', 'FREE_TEA_50']);
      records.push([`2026-06-15`, 'income', 'Sales', '45.00', `B2C Receipt RCP-JXE9L | Pay: Cash | Voucher: FREE_TEA_50`, 'B2C Receipt', 'Sarah', 'FREE_TEA_50']);
    }
  }

  const csvContent = records.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  fs.writeFileSync(path.join(outDir, 'Oriental_Tea_General_2026.csv'), csvContent);
  console.log('Generated Oriental_Tea_General_2026.csv with diverse PICs');
}

// 2. Shopee Food sales (daily income transactions)
function generateShopeeFood() {
  const records = [['Date', 'Type', 'Category', 'Amount', 'Description', 'Source', 'Person_in_Charge', 'Voucher_Code']];
  
  for (let month = 0; month < 12; month++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const daysInMonth = new Date(2026, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const date = `2026-${monthStr}-${dayStr}`;
      
      const amount = (400 + Math.random() * 300).toFixed(2);
      const pic = PICS[day % PICS.length];
      records.push([
        date,
        'income',
        'Sales',
        amount,
        `Shopee Food daily settlement payout`,
        'Shopee Food platform',
        pic,
        ''
      ]);
    }
  }
  
  const csvContent = records.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  fs.writeFileSync(path.join(outDir, 'Oriental_Tea_ShopeeFood_2026.csv'), csvContent);
  console.log('Generated Oriental_Tea_ShopeeFood_2026.csv');
}

// 3. Food Panda sales (daily income transactions)
function generateFoodPanda() {
  const records = [['Date', 'Type', 'Category', 'Amount', 'Description', 'Source', 'Person_in_Charge', 'Voucher_Code']];
  
  for (let month = 0; month < 12; month++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const daysInMonth = new Date(2026, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const date = `2026-${monthStr}-${dayStr}`;
      
      const amount = (500 + Math.random() * 400).toFixed(2);
      const pic = PICS[(day + 3) % PICS.length];
      records.push([
        date,
        'income',
        'Sales',
        amount,
        `Food Panda daily settlement payout`,
        'Food Panda platform',
        pic,
        ''
      ]);
    }
  }
  
  const csvContent = records.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  fs.writeFileSync(path.join(outDir, 'Oriental_Tea_FoodPanda_2026.csv'), csvContent);
  console.log('Generated Oriental_Tea_FoodPanda_2026.csv');
}

generateGeneral();
generateShopeeFood();
generateFoodPanda();
console.log('All Oriental Tea 2026 datasets generated successfully with diverse PICs!');
