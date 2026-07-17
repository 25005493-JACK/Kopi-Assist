'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatBot from '../components/ChatBot';
import { useI18n } from '../context/i18nContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

export default function AnomalyPage() {
  const { company, logout, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('anomaly');
  const [anomalies, setAnomalies] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [anomalyRun, setAnomalyRun] = useState(false);
  const [predictionRun, setPredictionRun] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);

  // Operation failure prediction states
  const [opFailureRun, setOpFailureRun] = useState(false);
  const [opFailureData, setOpFailureData] = useState(null);

  // Custom manual simulation states
  const [predictionSubTab, setPredictionSubTab] = useState('presets'); // presets or custom
  const [customCashflow, setCustomCashflow] = useState([]);
  const [customAdvice, setCustomAdvice] = useState(null);
  const [loadingCustomAdvice, setLoadingCustomAdvice] = useState(false);

  useEffect(() => {
    if (company) {
      const rev = Math.round(parseFloat(company.avg_monthly_revenue) || 25000);
      const exp = Math.round(rev * 0.75);
      const initial = Array.from({ length: 6 }, (_, i) => ({
        month: `Month ${i + 1}`,
        projected_income: rev,
        projected_expenses: exp,
        net_cashflow: rev - exp
      }));
      setCustomCashflow(initial);
    }
  }, [company]);

  const handleCustomSliderChange = (index, field, value) => {
    setCustomCashflow(prev => {
      const next = [...prev];
      const val = parseInt(value) || 0;
      const updatedItem = { ...next[index], [field]: val };
      updatedItem.net_cashflow = updatedItem.projected_income - updatedItem.projected_expenses;
      next[index] = updatedItem;
      return next;
    });
  };

  const fetchCustomAdvice = async () => {
    if (!company) return;
    setLoadingCustomAdvice(true);
    setCustomAdvice(null);
    try {
      const res = await fetch('/api/ai/predict/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id, cashflow: customCashflow })
      });
      const data = await res.json();
      if (data.success) {
        setCustomAdvice({ summary: data.summary, actions: data.actions });
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingCustomAdvice(false);
  };

  useEffect(() => {
    if (!authLoading && !company) router.push('/');
  }, [company, authLoading, router]);

  const runAnomalyDetection = async () => {
    setLoadingAnomalies(true);
    setAnomalyRun(true);
    try {
      const res = await fetch('/api/ai/anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      });
      const data = await res.json();
      setAnomalies(data.anomalies || []);
    } catch (e) { console.error(e); }
    setLoadingAnomalies(false);
  };

  const runPredictions = async () => {
    setLoadingPredictions(true);
    setPredictionRun(true);
    try {
      const res = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      });
      const data = await res.json();
      // Filter out OPERATION_FAILURE since we display it in its own section
      setScenarios((data.scenarios || []).filter(s => s.id !== 'OPERATION_FAILURE'));
    } catch (e) { console.error(e); }
    setLoadingPredictions(false);
  };

  const runOpFailure = async () => {
    setOpFailureRun(true);
    try {
      const res = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      });
      const data = await res.json();
      const scenario = (data.scenarios || []).find(s => s.id === 'OPERATION_FAILURE');
      setOpFailureData(scenario || null);
    } catch (e) { console.error(e); }
    setOpFailureRun(false);
  };

  if (authLoading || !company) return null;

  const severityColors = { high: 'var(--accent-red)', medium: 'var(--accent-orange)', low: 'var(--accent-blue)' };
  const scenarioIcons = { 
    FESTIVE_SEASON: '🎉', 
    MCO_LOCKDOWN: '🔒', 
    ECONOMIC_DOWNTURN: '📉',
    SUPPLY_CHAIN_STUN: '⛓️',
    PLATFORM_SHUTDOWN: '🔌',
    SYSTEM_OUTAGE: '🖥️',
    OPERATION_FAILURE: '⚡',
  };
  const scenarioBadgeColors = {
    FESTIVE_SEASON: { bg: 'rgba(0, 230, 118, 0.12)', color: 'var(--accent-green)' },
    MCO_LOCKDOWN: { bg: 'rgba(255, 61, 113, 0.12)', color: 'var(--accent-red)' },
    ECONOMIC_DOWNTURN: { bg: 'rgba(255, 170, 0, 0.12)', color: 'var(--accent-orange)' },
    SUPPLY_CHAIN_STUN: { bg: 'rgba(255, 61, 113, 0.12)', color: 'var(--accent-red)' },
    PLATFORM_SHUTDOWN: { bg: 'rgba(124, 77, 255, 0.12)', color: 'var(--accent-purple)' },
    SYSTEM_OUTAGE: { bg: 'rgba(255, 61, 113, 0.12)', color: 'var(--accent-red)' },
    OPERATION_FAILURE: { bg: 'rgba(124, 77, 255, 0.12)', color: 'var(--accent-purple)' },
  };

  return (
    <div className="app-layout">
      <Sidebar company={company} onLogout={logout} />
      <main className="main-content">
        <div className="page-header">
          <h2>🔍 {t('anomalyHeaderTitle')}</h2>
          <p>{t('anomalyHeaderDesc')}</p>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === 'anomaly' ? 'active' : ''}`} onClick={() => setActiveTab('anomaly')}>⚠️ {t('tabAnomaly')}</button>
          <button className={`tab ${activeTab === 'prediction' ? 'active' : ''}`} onClick={() => setActiveTab('prediction')}>🔮 {t('tabPrediction')}</button>
        </div>

        {activeTab === 'anomaly' && (
          <div>
            <div className="card section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: 0 }}>⚠️ {t('tabAnomaly')}</div>
                <button className="btn btn-primary" onClick={runAnomalyDetection} disabled={loadingAnomalies}>
                  {loadingAnomalies ? <><div className="spinner" /> {t('scanningBtn')}</> : `🔍 ${t('runAnalysisBtn')}`}
                </button>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.88rem' }}>{t('anomalyDesc')}</p>

              {loadingAnomalies && (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto', width: '32px', height: '32px' }} />
                  <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>{t('analyzingData')}</p>
                </div>
              )}

              {!loadingAnomalies && anomalyRun && anomalies.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', background: 'rgba(0,230,118,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,230,118,0.2)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                  <p style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{t('scanSuccess')}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('scanSuccessDesc')}</p>
                </div>
              )}

              {anomalies.map((a, i) => (
                <div className="anomaly-item" key={i} onClick={() => setSelectedAnomaly(a)} style={{ cursor: 'pointer', transition: 'all 0.2s hover' }}>
                  <div className="anomaly-icon" style={{ background: `${severityColors[a.type === 'duplicate_voucher' ? 'high' : a.severity]}20`, color: severityColors[a.type === 'duplicate_voucher' ? 'high' : a.severity] }}>⚠️</div>
                  <div className="anomaly-details">
                    <h4>{a.description?.replace(/\s*\[PIC:\s*.*?\]/, '')}</h4>
                    <p>{a.date} • {a.category} • <span className={`badge ${a.type === 'duplicate_voucher' ? 'danger' : (a.severity === 'high' ? 'danger' : a.severity === 'medium' ? 'warning' : 'info')}`}>{a.type === 'duplicate_voucher' ? 'Duplicate Voucher' : a.severity}</span></p>
                  </div>
                  <div className="anomaly-amount">RM {parseFloat(a.amount || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'prediction' && (
          <div>
            <div className="card section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: 0 }}>🔮 {t('tabPrediction')}</div>
                <div className="button-group" style={{ display: 'flex', gap: '8px' }}>
                  <button className={`btn ${predictionSubTab === 'presets' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPredictionSubTab('presets')}>
                    Presets
                  </button>
                  <button className={`btn ${predictionSubTab === 'custom' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPredictionSubTab('custom')}>
                    Manual Sandbox
                  </button>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.88rem' }}>{t('predictDesc')}</p>
            </div>

            {predictionSubTab === 'presets' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={runPredictions}
                    disabled={loadingPredictions}
                    style={{ minWidth: '180px', justifyContent: 'center' }}
                  >
                    {loadingPredictions ? <><div className="spinner" /> {t('predictingBtn')}</> : `🔮 ${t('runPredictionsBtn')}`}
                  </button>
                </div>

                {loadingPredictions && (
                  <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto', width: '32px', height: '32px' }} />
                    <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>{t('analyzingData')}</p>
                  </div>
                )}

                {!loadingPredictions && predictionRun && scenarios.length === 0 && (
                  <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>{t('noDataYet')}</p>
                  </div>
                )}

                {scenarios.map((scenario, i) => {
                  const badgeStyle = scenarioBadgeColors[scenario.id] || { bg: 'rgba(0,168,255,0.12)', color: 'var(--accent-blue)' };
                  return (
                    <div className="scenario-card section" key={i}>
                      <span className="scenario-badge" style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
                        {scenarioIcons[scenario.id] || '📊'} {scenario.id?.replace(/_/g, ' ')}
                      </span>
                      <h3>{scenario.title}</h3>
                      <p>{scenario.impact}</p>

                      <div className="section-title" style={{ fontSize: '0.85rem', marginTop: '16px' }}>📋 {t('recommendedActions')}</div>
                      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
                        {(scenario.actions || []).map((action, j) => (
                          <li key={j} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '4px 0' }}>{action}</li>
                        ))}
                      </ul>

                      {scenario.consequence && (
                        <div style={{
                          background: 'rgba(255, 61, 113, 0.07)',
                          border: '1px solid rgba(255, 61, 113, 0.3)',
                          borderLeft: '4px solid var(--accent-red)',
                          borderRadius: '8px',
                          padding: '14px 16px',
                          marginBottom: '20px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1rem' }}>⏳</span>
                            <strong style={{ color: 'var(--accent-red)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>If No Action Taken — 3 Month Consequence</strong>
                          </div>
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6', fontStyle: 'italic' }}>
                            {scenario.consequence}
                          </p>
                        </div>
                      )}

                      {scenario.cashflow && scenario.cashflow.length > 0 && (
                        <div>
                          <div className="section-title" style={{ fontSize: '0.85rem' }}>📈 {t('projectedCashFlow')}</div>
                          <div style={{ height: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={scenario.cashflow}>
                                <defs>
                                  <linearGradient id={`grad-inc-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id={`grad-exp-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff3d71" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ff3d71" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,168,255,0.1)" />
                                <XAxis dataKey="month" stroke="#5a6a82" fontSize={11} />
                                <YAxis stroke="#5a6a82" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(0,168,255,0.3)', borderRadius: '8px', color: '#e8edf5' }} formatter={v => [`RM ${v.toLocaleString()}`, '']} />
                                <Legend />
                                <Area type="monotone" dataKey="projected_income" name="Income" stroke="#00e676" fill={`url(#grad-inc-${i})`} />
                                <Area type="monotone" dataKey="projected_expenses" name="Expenses" stroke="#ff3d71" fill={`url(#grad-exp-${i})`} />
                                <Line type="monotone" dataKey="net_cashflow" name="Net Flow" stroke="#00a8ff" strokeWidth={2} dot={{ fill: '#00a8ff' }} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {predictionSubTab === 'custom' && (
              <div>
                <div className="card section" style={{ padding: '24px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '8px' }}>🎮 Interactive Cashflow Sandbox</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Drag the sliders below to adjust monthly Income and Expenses. The graph will update in real-time. Once you're done, request AI consultant recommendations on your custom curve!
                  </p>

                  {customCashflow.length > 0 && (
                    <div style={{ height: '300px', marginBottom: '24px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={customCashflow}>
                          <defs>
                            <linearGradient id="grad-custom-inc" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="grad-custom-exp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ff3d71" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ff3d71" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,168,255,0.1)" />
                          <XAxis dataKey="month" stroke="#5a6a82" fontSize={11} />
                          <YAxis stroke="#5a6a82" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(0,168,255,0.3)', borderRadius: '8px', color: '#e8edf5' }} formatter={v => [`RM ${v.toLocaleString()}`, '']} />
                          <Legend />
                          <Area type="monotone" dataKey="projected_income" name="Income" stroke="#00e676" fill="url(#grad-custom-inc)" />
                          <Area type="monotone" dataKey="projected_expenses" name="Expenses" stroke="#ff3d71" fill="url(#grad-custom-exp)" />
                          <Line type="monotone" dataKey="net_cashflow" name="Net Flow" stroke="#00a8ff" strokeWidth={2.5} dot={{ fill: '#00a8ff' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {customCashflow.map((m, idx) => {
                      const maxVal = Math.round((parseFloat(company.avg_monthly_revenue) || 25000) * 3.5);
                      return (
                        <div key={idx} className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-blue)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>📅 {m.month}</span>
                            <span style={{ fontSize: '0.78rem', color: m.net_cashflow >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              Net: RM {m.net_cashflow.toLocaleString()}
                            </span>
                          </h4>
                          
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                              <span>Inflow (Income)</span>
                              <strong>RM {m.projected_income.toLocaleString()}</strong>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={maxVal}
                              step="500"
                              value={m.projected_income}
                              onChange={e => handleCustomSliderChange(idx, 'projected_income', e.target.value)}
                              style={{ width: '100%', accentColor: 'var(--accent-green)' }}
                            />
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                              <span>Outflow (Expenses)</span>
                              <strong>RM {m.projected_expenses.toLocaleString()}</strong>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={maxVal}
                              step="500"
                              value={m.projected_expenses}
                              onChange={e => handleCustomSliderChange(idx, 'projected_expenses', e.target.value)}
                              style={{ width: '100%', accentColor: 'var(--accent-red)' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={fetchCustomAdvice} disabled={loadingCustomAdvice} style={{ padding: '12px 28px', fontSize: '1rem' }}>
                      {loadingCustomAdvice ? <><div className="spinner" /> Analyzing Cashflow...</> : '🧠 Ask AI for Advice on this Custom Curve'}
                    </button>
                  </div>
                </div>

                {customAdvice && (
                  <div className="card section" style={{ padding: '24px', background: 'rgba(0,168,255,0.03)', border: '1px solid rgba(0,168,255,0.2)' }}>
                    <h3 style={{ marginTop: 0, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>💡 AI Consultant Analysis</h3>
                    <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{customAdvice.summary}</p>
                    
                    <div className="section-title" style={{ fontSize: '0.9rem', marginTop: '20px' }}>📋 Strategic Action Steps</div>
                    <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {customAdvice.actions.map((act, idx) => (
                        <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{act}</li>
                      ))}
                    </ul>

                    {customAdvice.consequence && (
                      <div style={{
                        background: 'rgba(255, 61, 113, 0.07)',
                        border: '1px solid rgba(255, 61, 113, 0.3)',
                        borderLeft: '4px solid var(--accent-red)',
                        borderRadius: '8px',
                        padding: '14px 16px',
                        marginTop: '20px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '1rem' }}>⏳</span>
                          <strong style={{ color: 'var(--accent-red)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>If This Trajectory Continues — 3 Month Consequence</strong>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6', fontStyle: 'italic' }}>
                          {customAdvice.consequence}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Operation Failure Prediction ── */}
            <div style={{ marginTop: '32px' }}>
              <div className="scenario-card section" style={{ marginTop: '0' }}>
                <div className="section-title" style={{ marginBottom: '16px' }}>
                  ⚡ Operation Failure Prediction
                </div>

                {!opFailureData && !opFailureRun && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                    See what your data tells you and may cause your business operation to stuck
                  </p>
                )}

                {opFailureRun && (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto', width: '32px', height: '32px', borderColor: 'var(--accent-purple) transparent transparent transparent' }} />
                    <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Analyzing load levels...</p>
                  </div>
                )}

                {opFailureData && !opFailureRun && (
                  <div>
                    <h3>{opFailureData.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>{opFailureData.impact}</p>

                    <div className="section-title" style={{ fontSize: '0.85rem', marginTop: '16px' }}>📋 Recommended Actions</div>
                    <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
                      {(opFailureData.actions || []).map((a, i) => (
                        <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '4px 0' }}>{a}</li>
                      ))}
                    </ul>

                    {opFailureData.system_load?.length > 0 && (
                      <div>
                        <div className="section-title" style={{ fontSize: '0.85rem' }}>📊 System Down & Stock Insufficient Risk vs Transaction Load</div>
                        <div style={{ height: '250px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={opFailureData.system_load}>
                              <defs>
                                <linearGradient id="grad-op-sys-risk" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="grad-op-stock-risk" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.1)" />
                              <XAxis dataKey="label" stroke="#5a826a" fontSize={10} />
                              <YAxis stroke="#5a826a" fontSize={10} tickFormatter={v => `${v}%`} />
                              <Tooltip contentStyle={{ background: '#020a05', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#e6f4ea' }} formatter={(v, name) => [`${v}%`, name]} />
                              <Legend />
                              <Area type="monotone" dataKey="system_down_risk" name="System Down Risk" stroke="var(--accent-red)" strokeWidth={2.5} fill="url(#grad-op-sys-risk)" />
                              <Area type="monotone" dataKey="stock_depletion_risk" name="Stock Insufficient Risk" stroke="var(--accent-purple)" strokeWidth={2.5} fill="url(#grad-op-stock-risk)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Button below the box */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  className="btn btn-primary"
                  onClick={runOpFailure}
                  disabled={opFailureRun}
                  style={{ minWidth: '180px', justifyContent: 'center' }}
                >
                  {opFailureRun ? (
                    <>
                      <div className="spinner" style={{ display: 'inline-block', marginRight: '8px', width: '12px', height: '12px', borderColor: 'var(--text-primary) transparent transparent transparent' }} />
                      Predicting...
                    </>
                  ) : (
                    '⚡ Run Predictions'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <ChatBot companyId={company.id} />

      {selectedAnomaly && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setSelectedAnomaly(null)}>
          <div style={{
            background: '#0a2012',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '550px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <button style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.25rem',
              cursor: 'pointer'
            }} onClick={() => setSelectedAnomaly(null)}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                background: 'rgba(255, 61, 113, 0.15)',
                color: 'var(--accent-red)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}>⚠️</div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>Anomaly Details</h3>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', marginBottom: '20px', borderLeft: `4px solid ${severityColors[selectedAnomaly.type === 'duplicate_voucher' ? 'high' : selectedAnomaly.severity] || 'var(--accent-orange)'}` }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flagged Transaction</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
                {selectedAnomaly.description?.replace(/\s*\[PIC:\s*.*?\]/, '')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.9rem' }}>
                <span>Date: <strong>{selectedAnomaly.date}</strong></span>
                <span>Category: <strong>{selectedAnomaly.category}</strong></span>
                <span>Amount: <strong style={{ color: 'var(--accent-red)' }}>RM {parseFloat(selectedAnomaly.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem', lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>🔎 Reason for Flagging</strong>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{selectedAnomaly.reason || selectedAnomaly.description || 'N/A'}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>📐 Formulation Rule</strong>
                  <code style={{ display: 'block', background: 'rgba(0,168,255,0.1)', color: 'var(--accent-blue)', padding: '6px 10px', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {selectedAnomaly.formulation || 'N/A'}
                  </code>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>🛑 Anomaly Threshold</strong>
                  <code style={{ display: 'block', background: 'rgba(255,61,113,0.1)', color: 'var(--accent-red)', padding: '6px 10px', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {selectedAnomaly.type === 'duplicate' || selectedAnomaly.type === 'duplicate_voucher'
                      ? `> ${selectedAnomaly.threshold} occurrence`
                      : `> RM ${typeof selectedAnomaly.threshold === 'number' ? selectedAnomaly.threshold.toLocaleString(undefined, {minimumFractionDigits: 2}) : selectedAnomaly.threshold || 'N/A'}`
                    }
                  </code>
                </div>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>🧮 How It Was Determined (Calculation)</strong>
                <p style={{ margin: 0, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
                  {selectedAnomaly.calculation || 'N/A'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Person in Charge (PIC)</span>
                  <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '1.05rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    👤 {selectedAnomaly.person_in_charge || 'Jack'}
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAnomaly(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
