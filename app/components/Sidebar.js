'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '../context/i18nContext';

export default function Sidebar({ company, onLogout }) {
  const pathname = usePathname();
  const { lang, changeLang, t } = useI18n();

  const navItems = [
    { href: '/dashboard', icon: '📊', label: t('dashboard') },
    { href: '/data-management', icon: '📁', label: t('dataManagement') },
    { href: '/anomaly', icon: '🔍', label: t('anomalyPrediction') },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">💼</div>
        <h1>Kopi Assist</h1>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">{t('mainMenu')}</div>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'active' : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: '16px' }}>{t('quickActions')}</div>
        <Link href="/data-management?tab=upload" className={(pathname === '/data-management' && 'active') || ''}>
          <span className="nav-icon">📤</span>
          {t('uploadData')}
        </Link>
        <Link href="/data-management?tab=invoice">
          <span className="nav-icon">🧾</span>
          {t('eInvoice')}
        </Link>
        <Link href="/data-management?tab=report">
          <span className="nav-icon">📋</span>
          {t('annualReport')}
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px' }}>
          <button onClick={() => changeLang('en')} style={{ background: lang === 'en' ? 'var(--accent-blue)' : 'none', color: '#fff', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>EN</button>
          <button onClick={() => changeLang('bm')} style={{ background: lang === 'bm' ? 'var(--accent-blue)' : 'none', color: '#fff', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>BM</button>
          <button onClick={() => changeLang('zh')} style={{ background: lang === 'zh' ? 'var(--accent-blue)' : 'none', color: '#fff', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>中文</button>
        </div>
        <div className="company-info">
          <div className="company-avatar">
            {company?.company_name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <div>
            <div className="company-name">{company?.company_name || 'Company'}</div>
            <div className="company-industry">{company?.industry || 'Industry'}</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }} onClick={onLogout}>
          🚪 {t('logout')}
        </button>
      </div>
    </aside>
  );
}
