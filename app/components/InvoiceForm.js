'use client';
import { useState, useEffect } from 'react';
import { useI18n } from '../context/i18nContext';

const OUTLETS = ['Taman A', 'Taman B', 'Taman C', 'Taman D', 'Taman E'];
const PAYMENT_METHODS = ['Cash', 'Card', 'QR / DuitNow', 'Touch \'n Go'];

export default function InvoiceForm({ company, onInvoiceGenerated }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('b2b'); // 'b2b' | 'b2c'

  // Parse custom outlet count from industry
  const baseOutlets = ['Taman A', 'Taman B', 'Taman C', 'Taman D', 'Taman E'];
  let numOutlets = 5;
  if (company?.industry && company.industry.includes('|')) {
    const parts = company.industry.split('|');
    const parsed = parseInt(parts[1]);
    if (!isNaN(parsed) && parsed > 0) {
      numOutlets = parsed;
    }
  }

  const outletsList = [];
  for (let i = 0; i < numOutlets; i++) {
    if (i < baseOutlets.length) {
      outletsList.push(baseOutlets[i]);
    } else {
      outletsList.push(`Outlet ${String.fromCharCode(65 + i)}`); // Outlet F, G, H, etc.
    }
  }

  // ── B2B state ──────────────────────────────────────────────
  const [b2bForm, setB2bForm] = useState({
    clientName: '', clientAddress: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    notes: '', tax: 6,
  });

  // ── B2C state ──────────────────────────────────────────────
  const [b2cForm, setB2cForm] = useState({
    outlet: outletsList[0] || 'Taman A',
    pax: 1,
    items: [],       // { menuItem: {Item_Name, Active}, quantity }
    voucherCode: '',
    voucherDiscount: 0, // RM discount
    serviceCharge: 10,  // % service charge
    tax: 6,             // % SST
    paymentMethod: 'Cash',
  });
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load menu items once
  useEffect(() => {
    if (mode !== 'b2c' || !company?.id) return;
    setMenuLoading(true);
    fetch(`/api/menu?company_id=${company.id}`)
      .then(r => r.json())
      .then(d => setMenuItems(d.results || d.items || []))
      .catch(() => {})
      .finally(() => setMenuLoading(false));
  }, [mode, company?.id]);

  // ── B2B helpers ────────────────────────────────────────────
  const addB2bItem = () => setB2bForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unitPrice: 0 }] }));
  const updateB2bItem = (i, field, value) => setB2bForm(f => {
    const items = [...f.items]; items[i] = { ...items[i], [field]: value }; return { ...f, items };
  });
  const removeB2bItem = (i) => setB2bForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const b2bSubtotal = b2bForm.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const b2bTax = b2bSubtotal * (b2bForm.tax / 100);
  const b2bTotal = b2bSubtotal + b2bTax;

  // ── B2C helpers ────────────────────────────────────────────
  const addB2cItem = (menuItem) => {
    setB2cForm(f => {
      const existing = f.items.findIndex(it => it.menuItem.Item_Name === menuItem.Item_Name);
      if (existing >= 0) {
        const items = [...f.items]; items[existing] = { ...items[existing], quantity: items[existing].quantity + 1 };
        return { ...f, items };
      }
      return { ...f, items: [...f.items, { menuItem, quantity: 1 }] };
    });
  };
  const updateB2cQty = (i, qty) => setB2cForm(f => {
    const items = [...f.items]; items[i] = { ...items[i], quantity: Math.max(1, parseInt(qty) || 1) }; return { ...f, items };
  });
  const removeB2cItem = (i) => setB2cForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const b2cSubtotal = b2cForm.items.reduce((s, it) => s + parseFloat(it.menuItem.Active || 0) * it.quantity, 0);
  const b2cService = b2cSubtotal * (b2cForm.serviceCharge / 100);
  const b2cAfterService = b2cSubtotal + b2cService;
  const b2cTaxAmt = b2cAfterService * (b2cForm.tax / 100);
  const b2cDiscount = Math.min(parseFloat(b2cForm.voucherDiscount) || 0, b2cAfterService + b2cTaxAmt);
  const b2cTotal = b2cAfterService + b2cTaxAmt - b2cDiscount;

  // ── Generate B2B Invoice PDF ───────────────────────────────
  const generateB2B = async () => {
    setGenerating(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      const invoiceNo = `INV-${Date.now().toString(36).toUpperCase()}`;
      const today = new Date().toLocaleDateString('en-MY');

      doc.setFillColor(0, 20, 50);
      doc.rect(0, 0, 210, 45, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22); doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 20, 25);
      doc.setFontSize(10);
      doc.text(invoiceNo, 20, 35);
      doc.text(`Date: ${today}`, 150, 25);

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('From:', 20, 60);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(company?.company_name || 'Your Company', 20, 68);
      doc.text(`Industry: ${company?.industry || 'N/A'}`, 20, 75);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Bill To:', 120, 60);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(b2bForm.clientName || 'Client', 120, 68);
      doc.text(doc.splitTextToSize(b2bForm.clientAddress || '', 70), 120, 75);

      autoTable(doc, {
        startY: 95,
        head: [['#', 'Description', 'Qty', 'Unit Price (RM)', 'Total (RM)']],
        body: b2bForm.items.map((item, i) => [i + 1, item.description, item.quantity, parseFloat(item.unitPrice).toFixed(2), (item.quantity * item.unitPrice).toFixed(2)]),
        headStyles: { fillColor: [0, 20, 50], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 9 },
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Subtotal: RM ${b2bSubtotal.toFixed(2)}`, 140, finalY);
      doc.text(`Tax (${b2bForm.tax}%): RM ${b2bTax.toFixed(2)}`, 140, finalY + 8);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text(`Total: RM ${b2bTotal.toFixed(2)}`, 140, finalY + 20);

      const notesToPrint = b2bForm.notes || 'other payment methods';
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text('Notes:', 20, finalY);
      doc.text(doc.splitTextToSize(notesToPrint, 100), 20, finalY + 8);
      doc.save(`${invoiceNo}.pdf`);

      await fetch('/api/financial/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id, records: [{ date: new Date().toISOString().split('T')[0], type: 'income', category: 'Sales', amount: parseFloat(b2bTotal.toFixed(2)), description: `E-Invoice B2B: ${invoiceNo} to ${b2bForm.clientName || 'Client'}`, source: 'E-Invoice B2B' }] }),
      });

      // Clear B2B form state after generation
      setB2bForm({
        clientName: '',
        clientAddress: '',
        paymentTerms: 'COD',
        tax: 6,
        notes: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }],
      });

      if (onInvoiceGenerated) onInvoiceGenerated();
    } catch (err) { alert('Error: ' + err.message); }
    setGenerating(false);
  };

  // ── Generate B2C Receipt PDF ───────────────────────────────
  const generateB2C = async () => {
    if (b2cForm.items.length === 0) { alert('Please add at least one item.'); return; }
    setGenerating(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ format: [80, 200], unit: 'mm' }); // receipt width
      const receiptNo = `RCP-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-MY');
      const timeStr = now.toLocaleTimeString('en-MY');

      // Header
      doc.setFillColor(0, 20, 50);
      doc.rect(0, 0, 80, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(company?.company_name || 'Oriental Tea', 40, 8, { align: 'center' });
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(b2cForm.outlet, 40, 13, { align: 'center' });
      doc.text(`${dateStr}  ${timeStr}`, 40, 18, { align: 'center' });
      doc.text(`Receipt: ${receiptNo}`, 40, 23, { align: 'center' });

      // Pax
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(7);
      doc.text(`No. of Pax: ${b2cForm.pax}`, 4, 31);

      autoTable(doc, {
        startY: 34,
        head: [['Item', 'Qty', 'RM']],
        body: b2cForm.items.map(it => [
          it.menuItem.Item_Name,
          it.quantity,
          (parseFloat(it.menuItem.Active || 0) * it.quantity).toFixed(2),
        ]),
        headStyles: { fillColor: [0, 20, 50], textColor: [255, 255, 255], fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 20, halign: 'right' } },
        margin: { left: 4, right: 4 },
      });

      let y = doc.lastAutoTable.finalY + 3;
      const line = (label, val, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(bold ? 8 : 7);
        doc.text(label, 4, y);
        doc.text(`RM ${val}`, 76, y, { align: 'right' });
        y += 5;
      };

      doc.setDrawColor(180, 180, 180);
      doc.line(4, y - 1, 76, y - 1); y += 1;
      line('Subtotal', b2cSubtotal.toFixed(2));
      line(`Service Charge (${b2cForm.serviceCharge}%)`, b2cService.toFixed(2));
      line(`SST (${b2cForm.tax}%)`, b2cTaxAmt.toFixed(2));
      if (b2cDiscount > 0) line(`Voucher Discount`, `-${b2cDiscount.toFixed(2)}`);
      doc.line(4, y - 1, 76, y - 1); y += 1;
      line('TOTAL', b2cTotal.toFixed(2), true);

      y += 2;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text(`Payment: ${b2cForm.paymentMethod}`, 4, y); y += 5;
      if (b2cForm.voucherCode) { doc.text(`Voucher: ${b2cForm.voucherCode}`, 4, y); y += 5; }

      doc.line(4, y, 76, y); y += 5;
      doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
      doc.text('Thank you for visiting!', 40, y, { align: 'center' });

      doc.save(`${receiptNo}.pdf`);

      await fetch('/api/financial/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company.id,
          records: [{
            date: now.toISOString().split('T')[0],
            type: 'income',
            category: 'Sales',
            amount: parseFloat(b2cTotal.toFixed(2)),
            description: `B2C Receipt ${receiptNo} | Outlet: ${b2cForm.outlet} | Pax: ${b2cForm.pax} | Pay: ${b2cForm.paymentMethod}${b2cForm.voucherCode ? ' | Voucher: ' + b2cForm.voucherCode : ''}`,
            source: `B2C Receipt - ${b2cForm.outlet}`,
            voucher_code: b2cForm.voucherCode || '',
          }],
        }),
      });

      // Clear B2C form state after generation
      setB2cForm({
        outlet: outletsList[0] || 'Taman A',
        pax: 1,
        items: [],
        voucherCode: '',
        voucherDiscount: 0,
        serviceCharge: 10,
        tax: 6,
        paymentMethod: 'Cash',
      });

      if (onInvoiceGenerated) onInvoiceGenerated();
    } catch (err) { alert('Error: ' + err.message); }
    setGenerating(false);
  };

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          className={`btn ${mode === 'b2b' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('b2b')}
        >🏢 B2B Invoice</button>
        <button
          className={`btn ${mode === 'b2c' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('b2c')}
        >🧋 B2C Receipt (FnB)</button>
      </div>

      {/* ── B2B ─────────────────────────────────────────────── */}
      {mode === 'b2b' && (
        <div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('clientName')}</label>
              <input className="form-input" value={b2bForm.clientName} onChange={e => setB2bForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Client company name" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('clientAddress')}</label>
              <input className="form-input" value={b2bForm.clientAddress} onChange={e => setB2bForm(f => ({ ...f, clientAddress: e.target.value }))} placeholder="Client address" />
            </div>
          </div>

          <div className="section-title" style={{ marginTop: '16px' }}>📦 {t('lineItems')}</div>
          {b2bForm.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 3 }}>
                <label className="form-label">{t('itemDesc')}</label>
                <input className="form-input" value={item.description} onChange={e => updateB2bItem(i, 'description', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('itemQty')}</label>
                <input className="form-input" type="number" min="1" value={item.quantity} onChange={e => updateB2bItem(i, 'quantity', parseInt(e.target.value) || 1)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('itemPrice')}</label>
                <input className="form-input" type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateB2bItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('itemTotal')}</label>
                <div className="form-input" style={{ background: 'transparent', border: '1px solid transparent' }}>RM {(item.quantity * item.unitPrice).toFixed(2)}</div>
              </div>
              {b2bForm.items.length > 1 && (
                <button className="btn btn-danger btn-sm" onClick={() => removeB2bItem(i)} style={{ marginBottom: '4px' }}>✕</button>
              )}
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={addB2bItem}>{t('addItemBtn')}</button>

          <div className="grid-2" style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label className="form-label">{t('taxRate')}</label>
              <input className="form-input" type="number" min="0" max="100" value={b2bForm.tax} onChange={e => setB2bForm(f => ({ ...f, tax: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('invoiceNotes')}</label>
              <input className="form-input" value={b2bForm.notes} onChange={e => setB2bForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('invoiceNotesPlaceholder')} />
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Subtotal: RM {b2bSubtotal.toFixed(2)} | Tax: RM {b2bTax.toFixed(2)}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '4px' }}>Total: RM {b2bTotal.toFixed(2)}</div>
            </div>
            <button className="btn btn-primary" onClick={generateB2B} disabled={generating}>
              {generating ? `⏳ ${t('generatingPdfBtn')}` : `📄 ${t('generatePdfBtn')}`}
            </button>
          </div>
        </div>
      )}

      {/* ── B2C ─────────────────────────────────────────────── */}
      {mode === 'b2c' && (
        <div>
          {/* Top row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">🏪 Outlet</label>
              <select className="form-input" value={b2cForm.outlet} onChange={e => setB2cForm(f => ({ ...f, outlet: e.target.value }))}>
                {outletsList.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">👥 No. of Pax</label>
              <input className="form-input" type="number" min="1" value={b2cForm.pax} onChange={e => setB2cForm(f => ({ ...f, pax: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">💳 Payment Method</label>
              <select className="form-input" value={b2cForm.paymentMethod} onChange={e => setB2cForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Menu picker */}
          <div className="section-title" style={{ marginBottom: '10px' }}>🧋 Add Items from Menu</div>
          {menuLoading ? (
            <div style={{ padding: '12px', color: 'var(--text-muted)' }}>Loading menu...</div>
          ) : menuItems.length === 0 ? (
            <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No menu items found. Add items to the Menu table in Baserow first.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '16px' }}>
              {menuItems.map((item, i) => (
                <button key={i} className="btn btn-secondary btn-sm" onClick={() => addB2cItem(item)}
                  style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 600 }}>{item.Item_Name}</span>
                  <span style={{ color: 'var(--accent-green)' }}>RM {parseFloat(item.Active || 0).toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Order summary */}
          {b2cForm.items.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div className="section-title" style={{ marginBottom: '8px' }}>🛒 Order</div>
              {b2cForm.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ flex: 3, fontSize: '0.88rem' }}>{it.menuItem.Item_Name}</span>
                  <input className="form-input" type="number" min="1" value={it.quantity} onChange={e => updateB2cQty(i, e.target.value)} style={{ width: '60px', flex: 'none' }} />
                  <span style={{ flex: 1, textAlign: 'right', fontSize: '0.88rem', color: 'var(--accent-green)' }}>
                    RM {(parseFloat(it.menuItem.Active || 0) * it.quantity).toFixed(2)}
                  </span>
                  <button className="btn btn-danger btn-sm" onClick={() => removeB2cItem(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Charges & voucher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">🏷️ Service Charge (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={b2cForm.serviceCharge} onChange={e => setB2cForm(f => ({ ...f, serviceCharge: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">🧾 SST / Tax (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={b2cForm.tax} onChange={e => setB2cForm(f => ({ ...f, tax: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">🎟️ Voucher Code</label>
              <input className="form-input" value={b2cForm.voucherCode} onChange={e => setB2cForm(f => ({ ...f, voucherCode: e.target.value }))} placeholder="e.g. SAVE10" />
            </div>
            <div className="form-group">
              <label className="form-label">💸 Voucher Discount (RM)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={b2cForm.voucherDiscount} onChange={e => setB2cForm(f => ({ ...f, voucherDiscount: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Total summary */}
          <div className="card" style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.9 }}>
              <div>Subtotal: RM {b2cSubtotal.toFixed(2)}</div>
              <div>Service ({b2cForm.serviceCharge}%): RM {b2cService.toFixed(2)}</div>
              <div>SST ({b2cForm.tax}%): RM {b2cTaxAmt.toFixed(2)}</div>
              {b2cDiscount > 0 && <div style={{ color: 'var(--accent-orange)' }}>Voucher: −RM {b2cDiscount.toFixed(2)}</div>}
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '4px' }}>Total: RM {b2cTotal.toFixed(2)}</div>
            </div>
            <button className="btn btn-primary" onClick={generateB2C} disabled={generating}>
              {generating ? '⏳ Generating...' : '🧾 Print Receipt'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
