import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import Papa from 'papaparse';

const BASEROW_URL = process.env.BASEROW_BASE_URL;
const TABLE_ID = process.env.BASEROW_FINANCIAL_TABLE_ID;
const TOKEN = process.env.BASEROW_API_TOKEN;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const companyId = formData.get('company_id');

    if (!file || !companyId) {
      return NextResponse.json({ error: 'File and company_id required' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    let records = [];
    let warning = null;

    try {
      if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const text = await file.text();
        records = parseCSVText(text);
      } else if (fileName.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/)) {
        try {
          records = await extractFromImage(file);
        } catch (imageErr) {
          console.warn("AI Image OCR failed, falling back to filename parsing:", imageErr.message);
          records = [extractFromFilename(file.name)];
          warning = "Gemini AI API rate limit reached. Please verify and enter transaction details manually.";
          return NextResponse.json({ success: true, needsManual: true, records, warning });
        }
      } else {
        try {
          const text = await file.text();
          records = await extractWithAI(text);
        } catch (aiErr) {
          console.warn("AI text extraction failed, falling back to filename parsing:", aiErr.message);
          records = [extractFromFilename(file.name)];
          warning = "Gemini AI API rate limit reached. Please verify and enter transaction details manually.";
          return NextResponse.json({ success: true, needsManual: true, records, warning });
        }
      }
    } catch (parseErr) {
      return NextResponse.json({ error: parseErr.message }, { status: 500 });
    }

    // Save to Baserow in batches of 200
    const saved = [];
    const itemsToSave = records.map(record => {
      const pic = record.person_in_charge || 'Jack';
      const description = record.description || '';
      const finalDesc = description.includes('[PIC:') ? description : `${description} [PIC: ${pic}]`.trim();
      return {
        company_id: parseInt(companyId),
        date: record.date || new Date().toISOString().split('T')[0],
        type: record.type || 'expense',
        category: record.category || 'Uncategorized',
        amount: Math.round((parseFloat(record.amount) || 0) * 100) / 100,
        description: finalDesc,
        source: file.name,
        "voucher code": record.voucher_code || record['voucher code'] || '',
      };
    });

    for (let i = 0; i < itemsToSave.length; i += 200) {
      const batch = itemsToSave.slice(i, i + 200);
      const res = await fetch(
        `${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/batch/?user_field_names=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items: batch }),
        }
      );
      if (res.ok) {
        const resData = await res.json();
        saved.push(...(resData.items || []));
      } else {
        const errText = await res.text();
        console.error('Batch insert failed:', errText);
        throw new Error(`Baserow batch insertion failed: ${errText}`);
      }
    }

    return NextResponse.json({ success: true, count: saved.length, records: saved, warning });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function normalizeDate(dateStr) {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) {
    return clean.replace(/\//g, '-');
  }

  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (parts[2].length === 4) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
  }

  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}

  return clean;
}

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
      date: normalizeDate(normalisedRow.date) || new Date().toISOString().split('T')[0],
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

async function extractFromImage(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/png';

    // Try gemini-2.0-flash first
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: 'Extract all financial transaction data from this image. Return a JSON array of objects with fields: date (YYYY-MM-DD), type (income or expense), category, amount (number), description, person_in_charge (e.g. employee name if mentioned, default to Jack). Only return the JSON array, no other text.' },
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (err20) {
      console.warn("Gemini 2.0-flash failed, trying gemini-1.5-flash fallback:", err20.message);
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: 'Extract all financial transaction data from this image. Return a JSON array of objects with fields: date (YYYY-MM-DD), type (income or expense), category, amount (number), description, person_in_charge (e.g. employee name if mentioned, default to Jack). Only return the JSON array, no other text.' },
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (e) {
    console.error("All Gemini Image OCR attempts failed:", e.message);
    throw e; // Bubble up to POST handler for filename fallback
  }
}

async function extractWithAI(text) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Try gemini-2.0-flash first
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Extract financial transaction data from this text. Return a JSON array of objects with fields: date (YYYY-MM-DD), type (income or expense), category, amount (number), description, person_in_charge (e.g. employee name if mentioned, default to Jack). Only return the JSON array, no other text.\n\nText:\n${text}`,
      });

      const result = response.text || '';
      const jsonMatch = result.match(/\[.*\]/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (err20) {
      console.warn("Gemini 2.0-flash failed, trying gemini-1.5-flash fallback:", err20.message);
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Extract financial transaction data from this text. Return a JSON array of objects with fields: date (YYYY-MM-DD), type (income or expense), category, amount (number), description, person_in_charge (e.g. employee name if mentioned, default to Jack). Only return the JSON array, no other text.\n\nText:\n${text}`,
      });

      const result = response.text || '';
      const jsonMatch = result.match(/\[.*\]/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (e) {
    console.warn("All Gemini Text AI extraction attempts failed, running local regex parser:", e.message);
    const localRecords = extractWithRegex(text);
    if (localRecords.length > 0) {
      return localRecords;
    }
    handleAIError(e, "text extraction");
  }
}

function handleAIError(e, context) {
  console.error(`AI ${context} error:`, e);
  const msg = e.message || '';
  if (e.status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('limit') || msg.includes('exhausted')) {
    throw new Error("Gemini AI API rate limit reached. Please wait 15 seconds before trying again, or upload a standard formatted CSV file.");
  }
  throw new Error(`AI extraction failed: ${e.message}`);
}

function extractFromFilename(filename) {
  const cleanName = filename.replace(/\.[^/.]+$/, ""); // strip extension
  
  // Try to find a date
  const dateRegex = /(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})/;
  const dateMatch = cleanName.match(dateRegex);
  let date = dateMatch ? dateMatch[0].replace(/\//g, '-') : new Date().toISOString().split('T')[0];
  if (date.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const parts = date.split('-');
    date = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // Try to find amount
  const amountRegex = /(?:rm|usd|\$)?\s*(\d+(?:\.\d{2})?)/i;
  const amtMatch = cleanName.match(amountRegex);
  let amount = 0;
  if (amtMatch) {
    amount = parseFloat(amtMatch[1]) || 0;
  }

  // Try to find category
  let category = 'Uncategorized';
  const lowercaseName = cleanName.toLowerCase();
  if (lowercaseName.includes('rent')) category = 'Rent';
  else if (lowercaseName.includes('utility') || lowercaseName.includes('electric') || lowercaseName.includes('water')) category = 'Utilities';
  else if (lowercaseName.includes('salary') || lowercaseName.includes('wage')) category = 'Salaries';
  else if (lowercaseName.includes('inventory') || lowercaseName.includes('supplier')) category = 'Inventory';
  else if (lowercaseName.includes('marketing') || lowercaseName.includes('ad')) category = 'Marketing';
  else if (lowercaseName.includes('claim')) category = 'Claims';

  // PIC guess
  let person_in_charge = 'Jack';
  const picNames = ['ali', 'sarah', 'tan', 'jack'];
  for (const name of picNames) {
    if (lowercaseName.includes(name)) {
      person_in_charge = name.charAt(0).toUpperCase() + name.slice(1);
      break;
    }
  }

  return {
    date,
    type: 'expense',
    category,
    amount,
    description: `OCR Fallback (Filename): ${cleanName}`,
    person_in_charge
  };
}

function extractWithRegex(text) {
  const lines = text.split('\n');
  const records = [];
  const dateRegex = /(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})/;
  const amountRegex = /(?:RM|USD|\$)\s*(\d+(?:\.\d{2})?)|(\d+\.\d{2})/;
  
  lines.forEach(line => {
    const amtMatch = line.match(amountRegex);
    if (amtMatch) {
      const amount = parseFloat(amtMatch[1] || amtMatch[2]);
      if (amount > 0) {
        const dateMatch = line.match(dateRegex);
        let date = dateMatch ? dateMatch[0].replace(/\//g, '-') : new Date().toISOString().split('T')[0];
        
        // Handle formats like DD-MM-YYYY to YYYY-MM-DD
        if (date.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const parts = date.split('-');
          date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        let type = 'expense';
        if (line.toLowerCase().includes('sale') || line.toLowerCase().includes('income') || line.toLowerCase().includes('revenue')) {
          type = 'income';
        }
        
        let category = 'Uncategorized';
        if (line.toLowerCase().includes('rent')) category = 'Rent';
        else if (line.toLowerCase().includes('utility') || line.toLowerCase().includes('electric') || line.toLowerCase().includes('water')) category = 'Utilities';
        else if (line.toLowerCase().includes('salary') || line.toLowerCase().includes('wage')) category = 'Salaries';
        else if (line.toLowerCase().includes('inventory') || line.toLowerCase().includes('supplier')) category = 'Inventory';
        else if (line.toLowerCase().includes('marketing') || line.toLowerCase().includes('ad')) category = 'Marketing';
        else if (line.toLowerCase().includes('claim')) category = 'Claims';

        let person_in_charge = 'Jack';
        const picMatch = line.match(/(?:pic|incharge|by|person):\s*(\w+)/i);
        if (picMatch) {
          person_in_charge = picMatch[1];
        }

        records.push({
          date,
          type,
          category,
          amount,
          description: line.trim().slice(0, 100),
          person_in_charge
        });
      }
    }
  });
  return records;
}
