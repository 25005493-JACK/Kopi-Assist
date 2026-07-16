'use client';
import { useState, useRef } from 'react';
import { useI18n } from '../context/i18nContext';

export default function FileUploader({ companyId, onUploadComplete }) {
  const { t } = useI18n();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  // Manual entry states on rate limits
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    date: '',
    type: 'expense',
    category: 'Uncategorized',
    amount: 0,
    description: '',
    person_in_charge: 'Jack'
  });
  const [savingManual, setSavingManual] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setShowManual(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId);

    try {
      const res = await fetch('/api/financial/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        if (data.needsManual) {
          setResult({ success: true, message: `⚠️ ${data.warning}` });
          const rec = data.records[0] || {};
          setManualForm({
            date: rec.date || new Date().toISOString().split('T')[0],
            type: rec.type || 'expense',
            category: rec.category || 'Uncategorized',
            amount: rec.amount || 0,
            description: rec.description || '',
            person_in_charge: rec.person_in_charge || 'Jack'
          });
          setShowManual(true);
        } else {
          if (data.warning) {
            setResult({ success: true, message: `⚠️ ${data.warning}` });
          } else {
            setResult({ success: true, message: `Successfully extracted and saved ${data.count} records from ${file.name}` });
          }
          onUploadComplete?.();
        }
      } else {
        setResult({ success: false, message: data.error || 'Upload failed' });
      }
    } catch (err) {
      setResult({ success: false, message: err.message });
    }
    setUploading(false);
  };

  const handleSaveManual = async () => {
    setSavingManual(true);
    try {
      const pic = manualForm.person_in_charge;
      const description = manualForm.description;
      const finalDesc = description.includes('[PIC:') ? description : `${description} [PIC: ${pic}]`.trim();

      const res = await fetch('/api/financial/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          records: [{
            ...manualForm,
            description: finalDesc,
            source: 'Manual entry (API fallback)'
          }]
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: 'Successfully saved verified transaction!' });
        setShowManual(false);
        onUploadComplete?.();
      } else {
        alert('Failed to save record: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Error saving record: ' + e.message);
    }
    setSavingManual(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleUpload(file);
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <div className="upload-icon">{uploading ? '⏳' : '📤'}</div>
        {uploading ? (
          <p>{t('processingFile')}</p>
        ) : (
          <>
            <p dangerouslySetInnerHTML={{ __html: t('dragDropText') }} />
            <p className="upload-hint">{t('uploadHint')}</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".csv,.txt,.png,.jpg,.jpeg,.gif,.webp,.pdf"
          onChange={e => handleUpload(e.target.files[0])}
        />
      </div>

      {result && (
        <div className={result.success ? 'success-msg' : 'error-msg'} style={{ marginTop: '16px' }}>
          {result.message}
        </div>
      )}

      {showManual && (
        <div className="card" style={{ marginTop: '24px', padding: '24px', border: '1px solid var(--accent-blue)', background: 'rgba(0,230,118,0.02)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--accent-blue)', fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📝 Verify and Save Transaction
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px' }}>
            We've pre-populated this form with metadata scanned from your filename. Please review the details below, correct the amount from your receipt, and hit Save.
          </p>
          
          <div className="grid-2" style={{ marginBottom: '12px' }}>
            <div className="form-group">
              <label className="form-group" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={manualForm.date} 
                onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))} 
              />
            </div>
            <div className="form-group">
              <label className="form-group" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Type</label>
              <select 
                className="form-input" 
                value={manualForm.type} 
                onChange={e => setManualForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '12px' }}>
            <div className="form-group">
              <label className="form-group" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Category</label>
              <select 
                className="form-input" 
                value={manualForm.category} 
                onChange={e => setManualForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="Sales">Sales</option>
                <option value="Utilities">Utilities</option>
                <option value="Salaries">Salaries</option>
                <option value="Rent">Rent</option>
                <option value="Marketing">Marketing</option>
                <option value="Claims">Claims</option>
                <option value="Inventory">Inventory</option>
                <option value="Office Equipment">Office Equipment</option>
                <option value="Uncategorized">Uncategorized</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-group" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Amount (RM)</label>
              <input 
                type="number" 
                step="0.01"
                className="form-input" 
                value={manualForm.amount} 
                onChange={e => setManualForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} 
              />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-group" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Description</label>
              <input 
                type="text" 
                className="form-input" 
                value={manualForm.description} 
                onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))} 
                placeholder="e.g. Supplier payment"
              />
            </div>
            <div className="form-group">
              <label className="form-group" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Person In Charge</label>
              <select 
                className="form-input" 
                value={manualForm.person_in_charge} 
                onChange={e => setManualForm(f => ({ ...f, person_in_charge: e.target.value }))}
              >
                <option value="Jack">Jack</option>
                <option value="Ali (Procurement)">Ali (Procurement)</option>
                <option value="Sarah (Finance)">Sarah (Finance)</option>
                <option value="Tan (HR)">Tan (HR)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowManual(false)} disabled={savingManual}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveManual} disabled={savingManual}>
              {savingManual ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
