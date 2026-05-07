// Super-admin portal — platform-wide management
import { useState, useEffect } from 'react';
import API from '../api';
import { Tabs, StatusBadge, ErrorBanner, LoadingSpinner, DataTable, formatCurrency, formatDate } from './ui';

const TABS = [
  { id: 'dashboard',  label: 'Dashboard'        },
  { id: 'orgs',       label: 'Organisations'    },
  { id: 'users',      label: 'Users'            },
  { id: 'audit',      label: 'Platform Audit'   }
];

const PLAN_COLORS = { free: '#7f8c8d', pro: '#3498db', enterprise: '#9b59b6' };

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'white', borderRadius:10, padding:20, boxShadow:'0 2px 8px rgba(0,0,0,.07)', borderLeft:`4px solid ${color||'#3498db'}` }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#7f8c8d', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color: color||'#2c3e50' }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'#aaa', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export default function AdminPortal({ navigate }) {
  const [tab, setTab]         = useState('dashboard');
  const [stats, setStats]     = useState(null);
  const [orgs, setOrgs]       = useState([]);
  const [users, setUsers]     = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [orgSearch, setOrgSearch]   = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selectedOrg, setSelectedOrg]   = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [orgEditForm, setOrgEditForm]   = useState(null);

  const flash = (msg, isErr = false) => {
    if (isErr) { setError(msg); setSuccess(''); }
    else       { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const loadStats = async () => {
    const r = await API.admin.getStats();
    setStats(r.data);
  };

  const loadOrgs = async () => {
    const r = await API.admin.listOrgs({ search: orgSearch || undefined, plan: planFilter || undefined });
    setOrgs(r.data || []);
  };

  const loadUsers = async () => {
    const r = await API.admin.listUsers({ search: userSearch || undefined });
    setUsers(r.data || []);
  };

  const loadAudit = async () => {
    const r = await API.admin.getPlatformAudit({ limit: 100 });
    setAuditLogs(r.data || []);
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'dashboard') await loadStats();
      else if (tab === 'orgs')  await loadOrgs();
      else if (tab === 'users') await loadUsers();
      else if (tab === 'audit') await loadAudit();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  const handleSuspendOrg = async (org) => {
    if (!confirm(`${org.isActive ? 'Suspend' : 'Activate'} "${org.name}"?`)) return;
    try {
      const r = await API.admin.suspendOrg(org._id);
      flash(r.message);
      loadOrgs();
    } catch (e) { flash(e.message, true); }
  };

  const handleSaveOrgPlan = async () => {
    try {
      await API.admin.updateOrg(orgEditForm._id, {
        plan: orgEditForm.plan,
        planLimits: {
          maxUsers:    parseInt(orgEditForm.maxUsers)    || 3,
          maxInvoices: parseInt(orgEditForm.maxInvoices) || 50,
          maxProjects: parseInt(orgEditForm.maxProjects) || 5
        }
      });
      flash('Organisation updated');
      setOrgEditForm(null);
      loadOrgs();
    } catch (e) { flash(e.message, true); }
  };

  const handleForceVerify = async (user) => {
    try {
      await API.admin.forceVerifyEmail(user._id);
      flash(`Email verified for ${user.email}`);
      loadUsers();
    } catch (e) { flash(e.message, true); }
  };

  const handleToggleSuperAdmin = async (user) => {
    if (!confirm(`${user.isSuperAdmin ? 'Revoke' : 'Grant'} super-admin for "${user.name}"?`)) return;
    try {
      const r = await API.admin.toggleSuperAdmin(user._id);
      flash(r.message);
      loadUsers();
    } catch (e) { flash(e.message, true); }
  };

  const handleDeactivateUser = async (user) => {
    if (!confirm(`${user.isActive ? 'Deactivate' : 'Activate'} "${user.name}"?`)) return;
    try {
      const r = await API.admin.deactivateUser(user._id);
      flash(r.message);
      loadUsers();
    } catch (e) { flash(e.message, true); }
  };

  return (
    <div className="module-container">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
        <h2 style={{ margin:0 }}>⚡ Admin Portal</h2>
        <span style={{ background:'#e74c3c', color:'white', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, letterSpacing:1 }}>SUPER-ADMIN</span>
      </div>
      <p className="subtitle">Platform-wide management — organisations, users, audit trail</p>

      <Tabs tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {error   && <ErrorBanner message={error} onDismiss={() => setError('')} />}
      {success && <div style={{ background:'#e8f5e9', color:'#1b5e20', border:'1px solid #a5d6a7', borderRadius:8, padding:'10px 16px', marginBottom:16, fontSize:14 }}>{success}</div>}

      {/* ── Dashboard ── */}
      {tab === 'dashboard' && (
        loading ? <LoadingSpinner text="Loading platform stats…" /> : stats ? (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
              <StatCard label="Total Organisations" value={stats.orgs.total}      color="#3498db" sub={`${stats.orgs.active} active`} />
              <StatCard label="Free Plan"            value={stats.orgs.free}       color={PLAN_COLORS.free} />
              <StatCard label="Pro Plan"             value={stats.orgs.pro}        color={PLAN_COLORS.pro} />
              <StatCard label="Enterprise"           value={stats.orgs.enterprise} color={PLAN_COLORS.enterprise} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
              <StatCard label="Total Users"     value={stats.users.total}      color="#27ae60" sub={`${stats.users.verified} verified`} />
              <StatCard label="Super Admins"    value={stats.users.superAdmins} color="#e74c3c" />
              <StatCard label="Total Invoices"  value={stats.content.invoices}  color="#f39c12" />
              <StatCard label="Total Projects"  value={stats.content.projects}  color="#9b59b6" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16 }}>
              <StatCard label="Expense Claims"  value={stats.content.expenseClaims} color="#1abc9c" />
            </div>
          </>
        ) : null
      )}

      {/* ── Organisations ── */}
      {tab === 'orgs' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            <input className="form-input" style={{ flex:1, minWidth:200 }} placeholder="Search by name…"
              value={orgSearch} onChange={e => setOrgSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadOrgs()} />
            <select className="form-select" style={{ width:150 }} value={planFilter} onChange={e => { setPlanFilter(e.target.value); }}>
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button className="btn-primary" onClick={loadOrgs}>Search</button>
          </div>

          {/* Org edit inline panel */}
          {orgEditForm && (
            <div style={{ background:'#f8f9fa', border:'1px solid #dee2e6', borderRadius:8, padding:20, marginBottom:16 }}>
              <h4 style={{ marginTop:0 }}>Edit: {orgEditForm.name}</h4>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Plan</label>
                  <select className="form-select" value={orgEditForm.plan} onChange={e => setOrgEditForm(f => ({ ...f, plan: e.target.value }))}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Max Users</label>
                  <input className="form-input" type="number" min="1" value={orgEditForm.maxUsers} onChange={e => setOrgEditForm(f => ({ ...f, maxUsers: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Invoices</label>
                  <input className="form-input" type="number" min="1" value={orgEditForm.maxInvoices} onChange={e => setOrgEditForm(f => ({ ...f, maxInvoices: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Projects</label>
                  <input className="form-input" type="number" min="1" value={orgEditForm.maxProjects} onChange={e => setOrgEditForm(f => ({ ...f, maxProjects: e.target.value }))} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button className="btn-primary" onClick={handleSaveOrgPlan}>Save</button>
                <button className="btn-secondary" onClick={() => setOrgEditForm(null)}>Cancel</button>
              </div>
            </div>
          )}

          <DataTable loading={loading} emptyText="No organisations found."
            columns={[
              { key:'name',         label:'Name',    render:(v,r) => <><strong>{v}</strong><br/><span style={{fontSize:11,color:'#aaa'}}>{r.slug}</span></> },
              { key:'owner',        label:'Owner',   render:v => v?.email || '—' },
              { key:'plan',         label:'Plan',    render:v => <StatusBadge status={v} /> },
              { key:'memberCount',  label:'Members'  },
              { key:'invoiceCount', label:'Invoices' },
              { key:'isActive',     label:'Status',  render:v => <StatusBadge status={v?'active':'suspended'} /> },
              { key:'createdAt',    label:'Created', render:v => formatDate(v) }
            ]}
            data={orgs}
            actions={row => (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <button className="btn-sm btn-secondary"
                  onClick={() => setOrgEditForm({ _id: row._id, name: row.name, plan: row.plan, maxUsers: row.planLimits?.maxUsers||3, maxInvoices: row.planLimits?.maxInvoices||50, maxProjects: row.planLimits?.maxProjects||5 })}>
                  Edit Plan
                </button>
                <button className="btn-sm" style={{ background: row.isActive?'#e67e22':'#27ae60', color:'white', border:'none', borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:12 }}
                  onClick={() => handleSuspendOrg(row)}>
                  {row.isActive ? 'Suspend' : 'Activate'}
                </button>
              </div>
            )}
          />
        </>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <input className="form-input" style={{ flex:1 }} placeholder="Search by name or email…"
              value={userSearch} onChange={e => setUserSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadUsers()} />
            <button className="btn-primary" onClick={loadUsers}>Search</button>
          </div>

          <DataTable loading={loading} emptyText="No users found."
            columns={[
              { key:'name',            label:'Name' },
              { key:'email',           label:'Email' },
              { key:'isEmailVerified', label:'Verified',   render:v => <StatusBadge status={v?'verified':'unverified'} /> },
              { key:'isSuperAdmin',    label:'Super Admin', render:v => v ? <StatusBadge status="super-admin" /> : '—' },
              { key:'isActive',        label:'Status',     render:v => <StatusBadge status={v?'active':'inactive'} /> },
              { key:'orgCount',        label:'Orgs'        },
              { key:'createdAt',       label:'Joined',     render:v => formatDate(v) }
            ]}
            data={users}
            actions={row => (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {!row.isEmailVerified && (
                  <button className="btn-sm" style={{ background:'#27ae60', color:'white', border:'none', borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:12 }}
                    onClick={() => handleForceVerify(row)}>
                    Verify Email
                  </button>
                )}
                <button className="btn-sm btn-secondary"
                  onClick={() => handleToggleSuperAdmin(row)}>
                  {row.isSuperAdmin ? 'Revoke Admin' : 'Make Admin'}
                </button>
                <button className="btn-sm" style={{ background: row.isActive?'#e74c3c':'#27ae60', color:'white', border:'none', borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:12 }}
                  onClick={() => handleDeactivateUser(row)}>
                  {row.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            )}
          />
        </>
      )}

      {/* ── Platform Audit ── */}
      {tab === 'audit' && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:13, color:'#7f8c8d' }}>Last {auditLogs.length} events across all organisations</span>
            <button className="btn-sm btn-secondary" onClick={loadAudit}>Refresh</button>
          </div>
          {loading ? <LoadingSpinner text="Loading audit log…" /> : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr><th>When</th><th>Org</th><th>User</th><th>Action</th><th>Resource</th></tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 && <tr><td colSpan={5} className="empty-state-cell">No audit events yet</td></tr>}
                  {auditLogs.map(log => (
                    <tr key={log._id}>
                      <td style={{ fontSize:12, color:'#7f8c8d', whiteSpace:'nowrap' }}>{new Date(log.createdAt).toLocaleString('en-GB')}</td>
                      <td><span style={{ fontSize:12, fontWeight:600 }}>{log.org?.name || '—'}</span><br/><span style={{ fontSize:10, color:'#aaa' }}>{log.org?.plan}</span></td>
                      <td><strong>{log.user?.name || '—'}</strong><br/><span style={{ fontSize:11, color:'#aaa' }}>{log.user?.email}</span></td>
                      <td><StatusBadge status={log.action} /></td>
                      <td>{log.resource}{log.resourceId ? <span style={{ fontSize:11, color:'#aaa', marginLeft:4 }}>#{String(log.resourceId).slice(-6)}</span> : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
