import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import Papa from 'papaparse';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    let items = [];

    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const text = await file.text();
      items = parseCSVText(text);
    } else if (fileName.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/)) {
      items = await extractFromImage(file);
    } else {
      const text = await file.text();
      items = await extractWithAI(text);
    }

    return NextResponse.json({ success: true, items });
  } catch (err) {
    console.error("Menu parsing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function parseCSVText(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data || [];
  if (rows.length === 0) return [];
  
  const sample = rows[0];
  const keys = Object.keys(sample);
  const nameKey = keys.find(k => k.toLowerCase().includes('name'));
  const priceKey = keys.find(k => k.toLowerCase().includes('price') || k.toLowerCase().includes('active'));

  if (!nameKey || !priceKey) {
    // Try without headers (fallback)
    const rawParsed = Papa.parse(text, { header: false, skipEmptyLines: true });
    const rawRows = rawParsed.data || [];
    const items = [];
    for (const row of rawRows) {
      if (row.length >= 2) {
        const name = row[0]?.trim();
        const price = parseFloat(row[1]) || 0;
        if (name && !isNaN(price)) {
          items.push({ Item_Name: name, Price: price });
        }
      }
    }
    return items;
  }

  const items = [];
  for (const row of rows) {
    const name = row[nameKey]?.trim();
    const price = parseFloat(row[priceKey]) || 0;
    if (name) {
      items.push({ Item_Name: name, Price: price });
    }
  }
  return items;
}

async function extractFromImage(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/png';

    const promptText = 'Extract all menu items and their prices from this image. Return a JSON array of objects with fields: Item_Name (string, e.g. "Caffè Americano"), Price (number, e.g. 3.45). Only return the JSON array, no other text.';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: promptText },
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (err20) {
      console.warn("Gemini 2.0-flash failed for menu image, trying 1.5-flash:", err20.message);
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: promptText },
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
    console.error("All Gemini Image OCR attempts failed for menu:", e.message);
    throw e;
  }
}

async function extractWithAI(text) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const promptText = `Extract all menu items and their prices from this text. Return a JSON array of objects with fields: Item_Name (string, e.g. "Caffè Americano"), Price (number, e.g. 3.45). Only return the JSON array, no other text.\n\nText:\n${text}`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: promptText,
      });

      const result = response.text || '';
      const jsonMatch = result.match(/\[.*\]/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (err20) {
      console.warn("Gemini 2.0-flash failed for menu text, trying 1.5-flash:", err20.message);
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: promptText,
      });

      const result = response.text || '';
      const jsonMatch = result.match(/\[.*\]/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (e) {
    console.error("All Gemini AI attempts failed for menu text:", e.message);
    throw e;
  }
}
