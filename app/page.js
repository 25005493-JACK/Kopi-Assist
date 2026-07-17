'use client';
import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';
import { useI18n } from './context/i18nContext';
import Papa from 'papaparse';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ company_name: '', password: '', headcount: '', industry: 'F&B', avg_monthly_revenue: '', outlets: '5' });
  const [menuFile, setMenuFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, company } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (company) router.push('/dashboard');
  }, [company, router]);

  const parseMenuCSV = (text) => {
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (parsed.errors && parsed.errors.length > 0) {
      console.warn("CSV parsing errors:", parsed.errors);
    }
    const rows = parsed.data || [];
    if (rows.length === 0) return [];
    
    // Find column names case-insensitively
    const sample = rows[0];
    const keys = Object.keys(sample);
    const nameKey = keys.find(k => k.toLowerCase().includes('name'));
    const priceKey = keys.find(k => k.toLowerCase().includes('price') || k.toLowerCase().includes('active'));

    if (!nameKey || !priceKey) {
      throw new Error('Menu CSV must contain "Item_Name" and "Price" columns');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);

    try {
      let parsedMenu = null;
      if (!isLogin) {
        if (!menuFile) {
          throw new Error('Please upload a Menu file (CSV, Image, PDF, etc.) to register.');
        }
        
        const formData = new FormData();
        formData.append('file', menuFile);
        
        const parseRes = await fetch('/api/menu/parse', {
          method: 'POST',
          body: formData,
        });
        
        if (!parseRes.ok) {
          const parseErr = await parseRes.json();
          throw new Error(parseErr.error || 'Failed to parse the menu file');
        }
        
        const parseResult = await parseRes.json();
        parsedMenu = parseResult.items;
        if (!parsedMenu || parsedMenu.length === 0) {
          throw new Error('No menu items could be extracted from the uploaded file. Please verify and try again.');
        }
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin
        ? { company_name: form.company_name, password: form.password }
        : { 
            ...form, 
            industry: `${form.industry}|${form.outlets || '5'}`,
            headcount: parseInt(form.headcount) || 0, 
            avg_monthly_revenue: parseFloat(form.avg_monthly_revenue) || 0,
            menu: parsedMenu
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else if (isLogin) {
        login(data.company);
      } else {
        setSuccess('Registration successful! You can now login.');
        setIsLogin(true);
        setForm(f => ({ ...f, password: '' }));
        setMenuFile(null);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-large">💼</div>
            <h1>Kopi Assist</h1>
            <p>Financial Management Platform</p>
          </div>

          <div className="login-toggle">
            <button className={isLogin ? 'active' : ''} onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}>{t('signIn')}</button>
            <button className={!isLogin ? 'active' : ''} onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}>{t('register')}</button>
          </div>

          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('companyPlaceholder')}</label>
              <input className="form-input" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder={t('companyPlaceholder')} required />
            </div>

            <div className="form-group">
              <label className="form-label">{t('passwordPlaceholder')}</label>
              <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={t('passwordPlaceholder')} required />
            </div>

            {!isLogin && (
              <>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">{t('headcountLabel')}</label>
                    <input className="form-input" type="number" value={form.headcount} onChange={e => setForm(f => ({ ...f, headcount: e.target.value }))} placeholder="e.g. 25" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('numOutletsLabel')}</label>
                    <input className="form-input" type="number" min="1" value={form.outlets} onChange={e => setForm(f => ({ ...f, outlets: e.target.value }))} placeholder="e.g. 5" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('avgRevenueLabel')}</label>
                  <input className="form-input" type="number" value={form.avg_monthly_revenue} onChange={e => setForm(f => ({ ...f, avg_monthly_revenue: e.target.value }))} placeholder="e.g. 50000" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('menuUploadLabel')}</label>
                  <input className="form-input" type="file" accept=".csv,.txt,.png,.jpg,.jpeg,.gif,.webp,.pdf" onChange={e => setMenuFile(e.target.files[0] || null)} required />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('menuUploadHint')}</span>
                </div>
              </>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
              {loading ? <><div className="spinner" /> {t('processingAuth')}</> : (isLogin ? t('signIn') : t('createAccount'))}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
