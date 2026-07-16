// clear-baserow.mjs
// Deletes ALL financial records from the financial table (without filtering by company_id) using .env.local and default mock credentials
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read .env.local manually
let env = {};
try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  });
} catch (e) {
  console.log('⚠️ Could not read .env.local, using defaults.');
}

const targets = [
  // 1. Table from sync-baserow.mjs (Mock Table)
  {
    name: 'Default Mock Table',
    baserowUrl: 'https://api.baserow.io',
    tableId: '1079437',
    token: 'FAILUYrwpomEGDga1unyEBEQbx5xRkyh'
  }
];

// 2. Table from .env.local (if exists)
if (env.BASEROW_FINANCIAL_TABLE_ID && env.BASEROW_API_TOKEN) {
  targets.push({
    name: '.env.local Financial Table',
    baserowUrl: env.BASEROW_BASE_URL || 'https://api.baserow.io',
    tableId: env.BASEROW_FINANCIAL_TABLE_ID,
    token: env.BASEROW_API_TOKEN
  });
}

async function getAllRows(target) {
  let allRows = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    // No filter by company_id to get ALL rows in the table
    const url = `${target.baserowUrl}/api/database/rows/table/${target.tableId}/?user_field_names=true&size=200&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Token ${target.token}` }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Baserow error: ${res.status} - ${errText}`);
    }
    const data = await res.json();
    allRows = allRows.concat(data.results || []);
    hasMore = data.next !== null;
    page++;
  }
  return allRows;
}

async function deleteRow(target, id) {
  await fetch(`${target.baserowUrl}/api/database/rows/table/${target.tableId}/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Token ${target.token}` },
  });
}

async function main() {
  for (const target of targets) {
    console.log(`\n----------------------------------------`);
    console.log(`📦 Target: ${target.name} (Table ID: ${target.tableId})`);
    try {
      console.log(`🔍 Fetching ALL records from table...`);
      const existing = await getAllRows(target);
      console.log(`🗑️ Deleting ${existing.length} records...`);
      
      let deletedCount = 0;
      for (const row of existing) {
        try {
          await deleteRow(target, row.id);
          deletedCount++;
          process.stdout.write('.');
        } catch (e) {
          process.stdout.write('x');
        }
      }
      console.log(`\n✅ Done! Successfully deleted ${deletedCount}/${existing.length} records.`);
    } catch (e) {
      console.error(`❌ Failed to clear table ${target.tableId}:`, e.message);
    }
  }
}

main().catch(console.error);
