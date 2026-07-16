'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatBot from '../components/ChatBot';
import FileUploader from '../components/FileUploader';
import InvoiceForm from '../components/InvoiceForm';
import { useI18n } from '../context/i18nContext';

export default function DataManagementWrapper() {
  return (
    <Suspense fallback={<div style={{ background: '#000', minHeight: '100vh' }} />}>
      <DataManagementPage />
    </Suspense>
  );
}

function DataManagementPage() {
  const { company, logout, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('upload');
  const [financialData, setFinancialData] = useState([]);
  const [report, setReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !company) router.push('/');
  }, [company, authLoading, router]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['upload', 'invoice', 'report'].includes(tab)) setActiveTab(tab);
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoadingData(true);
    try {
      const res = await fetch(`/api/financial/data?company_id=${company.id}&t=${Date.now()}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      setFinancialData(data.results || []);
    } catch (e) { console.error(e); }
    setLoadingData(false);
  }, [company?.id]);

  useEffect(() => {
    if (company?.id) fetchData();
  }, [company?.id, fetchData]);

  const generateReport = async () => {
    setGeneratingReport(true);
    setReport(null);
    try {
      const res = await fetch('/api/financial/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      });
      const data = await res.json();
      setReport(data.report || 'Failed to generate report.');
    } catch (e) {
      setReport('Error: ' + e.message);
    }
    setGeneratingReport(false);
  };

  const downloadReportPDF = async () => {
    if (!report) return;
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      const title = `${company?.company_name || 'Company'} - Annual Financial Report`;
      const dateStr = `Generated on: ${new Date().toLocaleDateString('en-MY')}`;

      // Title header banner
      doc.setFillColor(10, 22, 40);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title.toUpperCase(), 15, 15);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(dateStr, 15, 23);

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      
      const splitText = doc.splitTextToSize(report, 180);
      let cursorY = 40;
      const pageHeight = doc.internal.pageSize.height;

      splitText.forEach(line => {
        if (cursorY > pageHeight - 20) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(line, 15, cursorY);
        cursorY += 6;
      });

      doc.save(`${company?.company_name?.replace(/\s+/g, '_')}_Financial_Report.pdf`);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  if (authLoading || !company) return null;

  return (
    <div className="app-layout">
      <Sidebar company={company} onLogout={logout} />
      <main className="main-content">
        <div className="page-header">
          <h2>📁 {t('opFinDataTitle')}</h2>
          <p>{t('opFinDataDesc')}</p>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>📤 {t('uploadData')}</button>
          <button className={`tab ${activeTab === 'invoice' ? 'active' : ''}`} onClick={() => setActiveTab('invoice')}>🧾 {t('eInvoice')}</button>
          <button className={`tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>📋 {t('annualReport')}</button>
        </div>

        {activeTab === 'upload' && (
          <div>
            <div className="card section">
              <div className="section-title">📤 {t('uploadFinDataTitle')}</div>
              <FileUploader companyId={company.id} onUploadComplete={fetchData} />
            </div>

            <div className="card section">
              <div className="section-title">📊 {t('financialRecordsTitle')} ({financialData.length})</div>
              {loadingData ? (
                <div style={{ padding: '24px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : financialData.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('tblDate')}</th>
                        <th>{t('tblType')}</th>
                        <th>{t('tblCategory')}</th>
                        <th>{t('tblAmount')}</th>
                        <th>{t('tblDescription')}</th>
                        <th>{t('tblSource')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialData.slice().reverse().slice(0, 50).map((r, i) => (
                        <tr key={i}>
                          <td>{r.date || '-'}</td>
                          <td><span className={`badge ${r.type === 'income' ? 'income' : 'expense'}`}>{r.type === 'income' ? t('tblTypeIncome' || 'income') : t('tblTypeExpense' || 'expense')}</span></td>
                          <td>{r.category}</td>
                          <td style={{ fontWeight: 600, color: r.type === 'income' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {r.type === 'income' ? '+' : '-'} {parseFloat(r.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                          </td>
                          <td>{r.description || '-'}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{r.source || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {financialData.length > 50 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '12px', fontSize: '0.8rem' }}>
                      {t('showingLatest', { count: financialData.length })}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>{t('noRecordsYet')}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'invoice' && (
          <div className="card">
            <div className="section-title">🧾 {t('eInvoiceTitle')}</div>
            <InvoiceForm company={company} onInvoiceGenerated={fetchData} />
          </div>
        )}

        {activeTab === 'report' && (
          <div className="card">
            <div className="section-title">📋 {t('annualReportTitle')}</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{t('annualReportDesc')}</p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={generateReport} disabled={generatingReport}>
                {generatingReport ? <><div className="spinner" /> {t('generatingReportBtn')}</> : `🔄 ${t('generateReportBtn')}`}
              </button>
              {report && (
                <button className="btn btn-secondary" onClick={downloadReportPDF}>
                  📥 {t('downloadPdfReportBtn')}
                </button>
              )}
            </div>

            {report && (
              <div style={{ marginTop: '24px', padding: '24px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap', fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                {report}
              </div>
            )}
          </div>
        )}
      </main>
      <ChatBot companyId={company.id} />
    </div>
  );
}
