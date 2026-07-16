import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    // Return invoice data for client-side PDF generation with jsPDF
    return NextResponse.json({
      success: true,
      invoice: {
        invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
        date: new Date().toISOString().split('T')[0],
        ...body,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
