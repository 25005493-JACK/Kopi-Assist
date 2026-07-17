'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatBot from '../components/ChatBot';
import { useI18n } from '../context/i18nContext';
import {
  ComposedChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Line
} from 'recharts';

// Industry benchmark: net margin ratio vs avg monthly revenue
// Values represent typical SME net cashflow as a % of revenue in Malaysia
const INDUSTRY_BENCHMARKS = [
  { keywords: ['retail'],          netRatio: 0.08,  label: 'Retail' },
  { keywords: ['f&b', 'food', 'beverage', 'restaurant', 'cafe'],  netRatio: 0.12, label: 'F&B' },
  { keywords: ['manufactur'],      netRatio: 0.11,  label: 'Manufacturing' },
  { keywords: ['tech', 'software', 'it ', 'digital'], netRatio: 0.22, label: 'Technology' },
  { keywords: ['logistic', 'transport', 'courier', 'supply'], netRatio: 0.10, label: 'Logistics' },
  { keywords: ['health', 'clinic', 'medical', 'pharma'], netRatio: 0.18, label: 'Healthcare' },
  { keywords: ['education', 'tutor', 'school', 'training'], netRatio: 0.20, label: 'Education' },
  { keywords: ['construct', 'contractor', 'property', 'real estate'], netRatio: 0.09, label: 'Construction' },
  { keywords: ['e-commerce', 'ecommerce', 'online shop', 'shopee', 'lazada'], netRatio: 0.14, label: 'E-Commerce' },
  { keywords: ['service', 'consult', 'agency', 'marketing'], netRatio: 0.25, label: 'Services' },
];
const DEFAULT_NET_RATIO = 0.13; // generic SME

function getIndustryBenchmark(industryStr) {
  if (!industryStr) return { netRatio: DEFAULT_NET_RATIO, label: 'SME Average' };
  const lower = industryStr.toLowerCase();
  for (const b of INDUSTRY_BENCHMARKS) {
    if (b.keywords.some(k => lower.includes(k))) return b;
  }
  return { netRatio: DEFAULT_NET_RATIO, label: 'SME Average' };
}

const CustomTooltip = ({ active, payload, label, industryLabel }) => {
  if (active && payload && payload.length) {
    const isProj = label && label.includes('(Proj)');
    const inc = payload.find(p => p.dataKey === 'income')?.value || 0;
    const exp = payload.find(p => p.dataKey === 'expenses')?.value || 0;
    const net = inc - exp;
    const avgNet = payload.find(p => p.dataKey === 'industryAvg')?.value;
    return (
      <div style={{ background: '#0a2012', border: '1px solid rgba(0,230,118,0.3)', borderRadius: '8px', padding: '12px', color: '#e8f5ed', minWidth: '190px' }}>
        <p style={{ margin: 0, fontWeight: 700, color: isProj ? 'var(--accent-blue)' : '#e8f5ed' }}>{label}</p>
        <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#00e676' }}>Income: RM {inc.toLocaleString()}</p>
        <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#ff3d71' }}>Expenses: RM {exp.toLocaleString()}</p>
        <p style={{ margin: '4px 0', fontSize: '0.82rem', color: net >= 0 ? '#00e676' : '#ffaa00', fontWeight: 700 }}>
          Net Flow: {net >= 0 ? '+' : ''}RM {net.toLocaleString()}
        </p>
        {avgNet !== undefined && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#00a8ff', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
            {industryLabel} Avg Net: RM {Math.round(avgNet).toLocaleString()}
          </p>
        )}
        {isProj && (
          <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: 'var(--accent-orange)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', maxWidth: '200px', lineHeight: '1.3' }}>
            ℹ️ Projected 1-month forecast calculated from the 3-month moving average of current historical records.
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { company, logout, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [financialData, setFinancialData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    if (!authLoading && !company) router.push('/');
  }, [company, authLoading, router]);

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

  const fetchRecs = useCallback(async () => {
    if (!company?.id) return;
    setLoadingRecs(true);
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (e) { console.error(e); }
    setLoadingRecs(false);
  }, [company?.id]);

  useEffect(() => {
    if (company?.id) {
      fetchData();
      fetchRecs();
    }
  }, [company?.id, fetchData, fetchRecs]);

  if (authLoading || !company) return null;

  // Process financial data
  let activeMonth = new Date().getMonth();
  let activeYear = new Date().getFullYear();

  if (financialData.length > 0) {
    const dates = financialData
      .map(r => r.date ? new Date(r.date) : null)
      .filter(Boolean);
    if (dates.length > 0) {
      const maxDate = new Date(Math.max(...dates));
      activeMonth = maxDate.getMonth();
      activeYear = maxDate.getFullYear();
    }
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const activeMonthName = monthNames[activeMonth];

  const currentMonthData = financialData.filter(r => {
    if (!r.date) return false;
    const d = new Date(r.date);
    return d.getMonth() === activeMonth && d.getFullYear() === activeYear;
  });

  const totalIncome = currentMonthData.filter(r => r.type === 'income').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalExpenses = currentMonthData.filter(r => r.type === 'expense').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const netFlow = totalIncome - totalExpenses;

  // Annual data calculations
  const currentYearData = financialData.filter(r => {
    if (!r.date) return false;
    const d = new Date(r.date);
    return d.getFullYear() === activeYear;
  });

  const annualIncome = currentYearData.filter(r => r.type === 'income').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const annualExpenses = currentYearData.filter(r => r.type === 'expense').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const annualNetFlow = annualIncome - annualExpenses;

  // Monthly chart data
  const monthlyMap = {};
  financialData.forEach(r => {
    if (!r.date) return;
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, expenses: 0 };
    if (r.type === 'income') monthlyMap[key].income += parseFloat(r.amount) || 0;
    else monthlyMap[key].expenses += parseFloat(r.amount) || 0;
  });
  const chartData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  chartData.forEach(d => { d.net = d.income - d.expenses; });

  // Append 1-month future cashflow prediction
  if (chartData.length > 0) {
    const lastEntry = chartData[chartData.length - 1];
    const [yearStr, monthStr] = lastEntry.month.split('-');
    let year = parseInt(yearStr);
    let month = parseInt(monthStr);

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }

    const nextMonthKey = `${year}-${String(month).padStart(2, '00')} (Proj)`;
    
    // Average of last 3 months
    const last3 = chartData.slice(-3);
    const avgIncome = Math.round(last3.reduce((s, d) => s + d.income, 0) / last3.length) || 0;
    const avgExpenses = Math.round(last3.reduce((s, d) => s + d.expenses, 0) / last3.length) || 0;

    chartData.push({
      month: nextMonthKey,
      income: avgIncome,
      expenses: avgExpenses,
      net: avgIncome - avgExpenses,
      isProjected: true
    });
  }

  // Industry benchmark overlay
  const benchmark = getIndustryBenchmark(company.industry?.split('|')[0]);
  const avgMonthlyRevenue = parseFloat(company.avg_monthly_revenue) || 25000;
  const industryAvgNet = Math.round(avgMonthlyRevenue * benchmark.netRatio);
  chartData.forEach(d => { d.industryAvg = industryAvgNet; });

  const impactIcons = { cost_reduction: '💰', revenue_growth: '📈', cash_flow: '💸', risk_management: '🛡️', efficiency: '⚡' };

  return (
    <div className="app-layout">
      <Sidebar company={company} onLogout={logout} />
      <main className="main-content">
        <div className="page-header">
          <h2>📊 {t('dashboard')}</h2>
          <p>{t('welcomeBack')}, {company.company_name} — {t('snapshot')}</p>
        </div>

        {/* Annual Summary Section */}
        <div className="section" style={{ marginBottom: '24px' }}>
          <div className="section-title" style={{ fontSize: '1.2rem', fontWeight: '800' }}>📅 {t('annualSummary')} (Year {activeYear})</div>
          <div className="stats-grid">
            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('annualIncome')}</span>
                <div className="card-icon green">📈</div>
              </div>
              <div className="card-value positive">RM {annualIncome.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{currentYearData.filter(r => r.type === 'income').length} {t('transactionsCount')}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('annualExpenses')}</span>
                <div className="card-icon red">📉</div>
              </div>
              <div className="card-value negative">RM {annualExpenses.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{currentYearData.filter(r => r.type === 'expense').length} {t('transactionsCount')}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('annualNetFlow')}</span>
                <div className="card-icon blue">💰</div>
              </div>
              <div className={`card-value ${annualNetFlow >= 0 ? 'positive' : 'negative'}`}>RM {annualNetFlow.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{annualNetFlow >= 0 ? t('positiveFlow') : t('negativeFlow')}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('allTimeTransactions')}</span>
                <div className="card-icon purple">📊</div>
              </div>
              <div className="card-value neutral">{financialData.length}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{t('allTimeEntries')}</div>
            </div>
          </div>
        </div>

        {/* Monthly Summary Section */}
        <div className="section" style={{ marginBottom: '32px' }}>
          <div className="section-title" style={{ fontSize: '1.2rem', fontWeight: '800' }}>📊 {t('monthlySummary')} ({activeMonthName} {activeYear})</div>
          <div className="stats-grid">
            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('monthlyIncome')}</span>
                <div className="card-icon green">📈</div>
              </div>
              <div className="card-value positive">RM {totalIncome.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{currentMonthData.filter(r => r.type === 'income').length} {t('transactionsCount')}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('monthlyExpenses')}</span>
                <div className="card-icon red">📉</div>
              </div>
              <div className="card-value negative">RM {totalExpenses.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{currentMonthData.filter(r => r.type === 'expense').length} {t('transactionsCount')}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('monthlyNetFlow')}</span>
                <div className="card-icon blue">💰</div>
              </div>
              <div className={`card-value ${netFlow >= 0 ? 'positive' : 'negative'}`}>RM {netFlow.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{netFlow >= 0 ? t('positiveFlow') : t('negativeFlow')}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('monthlyTransactions')}</span>
                <div className="card-icon purple">📊</div>
              </div>
              <div className="card-value neutral">{currentMonthData.length}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{t('entriesThisMonth')}</div>
            </div>
          </div>
        </div>

        {/* Cash Flow Chart */}
        <div className="card section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>📈 {t('cashFlowChartTitle')}</div>
            {company.industry && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(0, 168, 255, 0.08)',
                border: '1px solid rgba(0, 168, 255, 0.25)',
                borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem'
              }}>
                <span style={{ display: 'inline-block', width: '24px', borderTop: '2px dashed #00a8ff' }} />
                <span style={{ color: '#00a8ff' }}>
                  {benchmark.label} Industry Avg Net — RM {industryAvgNet.toLocaleString()}/mo
                </span>
              </div>
            )}
          </div>
          {loadingData ? (
            <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : chartData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,230,118,0.1)" />
                  <XAxis dataKey="month" stroke="#5a826a" fontSize={12} />
                  <YAxis stroke="#5a826a" fontSize={12} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip industryLabel={benchmark.label} />} />
                  <Legend />
                  <Bar dataKey="expenses" name="Expenses" fill="#ff3d71" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-exp-${index}`}
                        fill={entry.isProjected ? 'rgba(255, 61, 113, 0.45)' : '#ff3d71'}
                        stroke={entry.isProjected ? '#ff3d71' : 'none'}
                        strokeWidth={entry.isProjected ? 1.5 : 0}
                        strokeDasharray={entry.isProjected ? '3 3' : 'none'}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="income" name="Income" fill="#00e676" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-inc-${index}`}
                        fill={entry.isProjected ? 'rgba(0, 230, 118, 0.45)' : '#00e676'}
                        stroke={entry.isProjected ? '#00e676' : 'none'}
                        strokeWidth={entry.isProjected ? 1.5 : 0}
                        strokeDasharray={entry.isProjected ? '3 3' : 'none'}
                      />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net Flow"
                    stroke="#00a8ff"
                    strokeWidth={2.5}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          key={`dot-net-${cx}`}
                          cx={cx} cy={cy} r={4}
                          fill={payload.net >= 0 ? '#00a8ff' : '#007bc0'}
                          stroke="none"
                        />
                      );
                    }}
                    activeDot={{ r: 6, fill: '#00a8ff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="industryAvg"
                    name="Average Industry Net Flow"
                    stroke="#00a8ff"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    activeDot={{ r: 4, fill: '#00a8ff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>{t('noDataYet')}</p>
          )}
        </div>

        {/* Recommendations */}
        <div className="card section">
          <div className="section-title">💡 {t('aiRecommendationsTitle')}</div>
          {loadingRecs ? (
            <div style={{ padding: '24px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /> <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>{t('analyzingData')}</p></div>
          ) : recommendations.length > 0 ? (
            <ul className="rec-list">
              {recommendations.map((rec, i) => (
                <li key={i}>
                  <span className="rec-icon">{impactIcons[rec.category] || '💡'}</span>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{rec.title}</strong>
                    <span className={`badge ${rec.impact === 'high' ? 'income' : rec.impact === 'medium' ? 'warning' : 'info'}`} style={{ marginLeft: '8px' }}>{rec.impact}</span>
                    <p style={{ marginTop: '4px' }}>{rec.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-muted)', padding: '16px' }}>{t('noRecsYet')}</p>
          )}
        </div>
      </main>
      <ChatBot companyId={company.id} />
    </div>
  );
}
