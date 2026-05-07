// SaaS Dashboard — org-aware, live stats, plan usage bar, compliance reminders
import { useState, useEffect } from 'react';
import API from '../api';

const COMPLIANCE = [
  { id:1, type:'VAT',        title:'VAT Return Due',   description:'Q1 2026 VAT return must be submitted', dueDate:'2026-04-30', priority:'high' },
  { id:2, type:'PAYE',       title:'PAYE Submission',  description:'Submit monthly PAYE to HMRC',          dueDate:'2026-04-19', priority:'medium' },
  { id:3, type:'Income Tax', title:'Self Assessment',  description:'Submit 2025/26 tax return',            dueDate:'2027-01-31', priority:'medium' },
];

const QUICK_LINKS = [
  { module:'finance',      icon:'💰', label:'Finance'              },
  { module:'ar',           icon:'📥', label:'Accounts Receivable'  },
  { module:'ap',           icon:'📤', label:'Accounts Payable'     },
  { module:'fixed-assets', icon:'🏢', label:'Fixed Assets'         },
  { module:'tax',          icon:'📋', label:'Tax'                  },
  { module:'hr',           icon:'👥', label:'HR'                   },
  { module:'expenses',     icon:'🧾', label:'Expenses'             },
  { module:'projects',     icon:'📁', label:'Projects'             },
  { module:'reports',      icon:'📊', label:'Reports & Analytics'  },
  { module:'settings',     icon:'⚙️', label:'Settings'             }
];

export default function Dashboard({ navigate, user, org }) {
  const [plan,    setPlan]    = useState(null);
  const [liveData, setLive]  = useState(false);

  useEffect(() => {
    API.orgs.getPlan()
      .then(r => { setPlan(r.data); setLive(true); })
      .catch(() => {});
  }, []);

  const daysUntil = (s) => Math.ceil((new Date(s) - new Date()) / 86400000);
  const fmtDate   = (s) => s ? new Date(s).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';

  const usePct = (used, max) => Math.min(100, Math.round((used / max) * 100));

  return (
    <div className="module-container">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <h2>Dashboard</h2>
        <span className={`data-source-badge ${liveData ? 'live' : 'sample'}`}>
          {liveData ? '🟢 Live Data' : '🟡 Loading…'}
        </span>
      </div>
      <p className="subtitle">
        Welcome back, <strong>{user?.name}</strong> — <strong>{org?.name}</strong>
        {org?.plan && <span style={{marginLeft:8,padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:org.plan==='pro'?'#e3f2fd':'#f0f0f0',color:org.plan==='pro'?'#1565c0':'#666'}}>
          {org.plan === 'pro' ? '⭐ Pro' : org.plan === 'enterprise' ? '🏢 Enterprise' : '🆓 Free'}
        </span>}
      </p>

      {/* Plan usage (free only) */}
      {plan && plan.plan === 'free' && (
        <div style={{background:'white',borderRadius:10,padding:18,boxShadow:'0 2px 8px rgba(0,0,0,.07)',marginBottom:24,borderLeft:'4px solid #f39c12'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <strong style={{fontSize:14}}>🆓 Free Plan Usage</strong>
            <button className="btn-primary btn-sm" onClick={() => navigate('settings')}>Upgrade to Pro →</button>
          </div>
          {[
            { label:'Team Members', used: plan.usage.members,  max: plan.limits.maxUsers    },
            { label:'Invoices',     used: plan.usage.invoices, max: plan.limits.maxInvoices },
            { label:'Projects',     used: plan.usage.projects, max: plan.limits.maxProjects }
          ].map(({ label, used, max }) => (
            <div key={label} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#555',marginBottom:3}}>
                <span>{label}</span><span>{used} / {max}</span>
              </div>
              <div style={{background:'#ecf0f1',borderRadius:4,height:6}}>
                <div style={{background: usePct(used,max) >= 90 ? '#e74c3c' : '#3498db', borderRadius:4, height:6, width: usePct(used,max)+'%', transition:'width .3s'}} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compliance */}
      <div className="dashboard-section">
        <h3 className="section-title">UK Compliance Reminders</h3>
        <div className="compliance-grid">
          {COMPLIANCE.map(r => {
            const days = daysUntil(r.dueDate);
            const isOverdue = days < 0;
            const isUrgent  = days <= 14 && !isOverdue;
            return (
              <div key={r.id} className={`compliance-card ${r.priority} ${isOverdue ? 'overdue' : ''}`}>
                <div className="compliance-header">
                  <span className={`compliance-badge ${r.type.toLowerCase().replace(' ','-')}`}>{r.type}</span>
                  <span className={`days-until ${isUrgent?'urgent':''} ${isOverdue?'overdue':''}`}>
                    {isOverdue ? `${Math.abs(days)} days overdue` : `${days} days`}
                  </span>
                </div>
                <h4>{r.title}</h4>
                <p>{r.description}</p>
                <div className="compliance-footer">
                  <span className="due-date">Due: {fmtDate(r.dueDate)}</span>
                  <span className={`priority-indicator ${r.priority}`}>{r.priority === 'high' ? '⚠ High' : '📌 Medium'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="dashboard-section">
        <h3 className="section-title">Quick Access</h3>
        <div className="quick-links-grid">
          {QUICK_LINKS.map(({ module, icon, label }) => (
            <button key={module} className="quick-link-card" onClick={() => navigate(module)}>
              <span className="link-icon">{icon}</span>
              <span className="link-text">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
