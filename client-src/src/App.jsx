import { useState, useEffect } from 'react';
import API from './api';
import LoginModal from './components/Login';
import Dashboard from './components/Dashboard';
import FinanceModule from './components/Finance';
import ARModule from './components/AccountsReceivable';
import APModule from './components/AccountsPayable';
import FixedAssetsModule from './components/FixedAssets';
import TaxModule from './components/Tax';
import HRModule from './components/HR';
import ExpensesModule from './components/Expenses';
import ProjectsModule from './components/Projects';
import ReportsModule from './components/Reports';
import SettingsModule from './components/Settings';

const MODULES = {
  home: Dashboard,
  finance: FinanceModule,
  ar: ARModule,
  ap: APModule,
  'fixed-assets': FixedAssetsModule,
  tax: TaxModule,
  hr: HRModule,
  expenses: ExpensesModule,
  projects: ProjectsModule,
  reports: ReportsModule,
  settings: SettingsModule,
};

const NAV = [
  { id: 'home', label: 'Dashboard' },
  { section: 'Core Accounting' },
  { id: 'finance', label: 'Finance' },
  { id: 'ar', label: 'Accounts Receivable' },
  { id: 'ap', label: 'Accounts Payable' },
  { id: 'fixed-assets', label: 'Fixed Assets' },
  { id: 'tax', label: 'Tax' },
  { section: 'Operations' },
  { id: 'hr', label: 'HR' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'projects', label: 'Projects' },
  { section: 'Insights' },
  { id: 'reports', label: 'Reports & Analytics' },
  { section: 'Account' },
  { id: 'settings', label: '⚙️ Settings & Team' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [module, setModule] = useState('home');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.auth.me()
      .then(r => { setUser(r.data.user); setOrg(r.data.org); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const navigate = (mod) => setModule(mod);

  const handleLogout = async () => {
    try { await API.auth.logout(); } catch {}
    setUser(null); setOrg(null); setModule('home');
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:16}}>Loading…</div>;

  if (!user) {
    return (
      <LoginModal onSuccess={(u, o) => { setUser(u); setOrg(o); setModule('home'); }} />
    );
  }

  const ActiveComponent = MODULES[module] || Dashboard;
  const planLabel = { free: '🆓 Free Plan', pro: '⭐ Pro Plan', enterprise: '🏢 Enterprise' }[org?.plan] || '';

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="logo">
          <h1>LedgerPro</h1>
          <p className="tagline">Accounting Software</p>
        </div>

        {org && (
          <div className="org-switcher">
            <span className="org-name">{org.name}</span>
            <span className="org-plan">{planLabel}</span>
          </div>
        )}

        <ul className="nav-menu">
          {NAV.map((item, i) =>
            item.section
              ? <li key={i} className="nav-section-label">{item.section}</li>
              : <li key={item.id}>
                  <a href="#" className={'nav-link' + (module === item.id ? ' active' : '')}
                    onClick={e => { e.preventDefault(); navigate(item.id); }}>
                    {item.label}
                  </a>
                </li>
          )}
          <li className="nav-logout-item">
            <a href="#" onClick={e => { e.preventDefault(); handleLogout(); }}>Sign Out</a>
          </li>
        </ul>

        {org?.plan === 'free' && (
          <div className="sidebar-upgrade">
            <p>You're on the Free plan</p>
            <button onClick={() => navigate('settings')}>Upgrade to Pro ⭐</button>
          </div>
        )}
      </nav>

      <main className="main-content">
        {user && !user.isEmailVerified && (
          <div style={{background:'#fff3cd',borderBottom:'1px solid #ffc107',padding:'10px 20px',fontSize:13,display:'flex',alignItems:'center',gap:12}}>
            <span>⚠️ Please verify your email address to unlock all features.</span>
            <button onClick={() => API.auth.resendVerification().then(()=>alert('Verification email sent!')).catch(e=>alert(e.message))}
              style={{background:'#ffc107',border:'none',padding:'4px 12px',borderRadius:4,cursor:'pointer',fontSize:12,fontWeight:600}}>
              Resend Email
            </button>
          </div>
        )}
        <div id="content-area">
          <ActiveComponent navigate={navigate} user={user} org={org} />
        </div>
      </main>
    </div>
  );
}
