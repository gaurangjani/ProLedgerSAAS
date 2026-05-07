// SaaS Settings — Org Profile, Team Members, Invites, Plan & Billing
import { useState, useEffect } from 'react';
import API from '../api';
import { Tabs, StatusBadge, ErrorBanner } from './ui';

const PLAN_LABELS = { free: '🆓 Free', pro: '⭐ Pro', enterprise: '🏢 Enterprise' };
const PLAN_COLORS = { free: '#7f8c8d', pro: '#3498db', enterprise: '#9b59b6' };

export default function SettingsModule({ navigate, org: orgProp }) {
  const [tab, setTab]           = useState('org');
  const [org, setOrg]           = useState(orgProp || {});
  const [members, setMembers]   = useState([]);
  const [invites, setInvites]   = useState([]);
  const [plan, setPlan]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState('accountant');
  const [inviteUrl, setInviteUrl]     = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [mRes, iRes, pRes] = await Promise.all([
        API.orgs.getMembers(),
        API.orgs.getInvites(),
        API.orgs.getPlan()
      ]);
      setMembers(mRes.data || []);
      setInvites(iRes.data || []);
      setPlan(pRes.data);
    } catch (err) { setError(err.message); }
  };

  const saveOrg = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await API.orgs.update(org);
      setOrg(res.data);
      setSuccess('Organisation settings saved.');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const sendInvite = async () => {
    setError(''); setInviteUrl('');
    try {
      const res = await API.orgs.createInvite({ email: inviteEmail, role: inviteRole });
      setInviteUrl(res.data.inviteUrl);
      setInviteEmail('');
      await loadAll();
      setSuccess('Invite created! Share the link below.');
    } catch (err) { setError(err.message); }
  };

  const changeRole = async (uid, role) => {
    try { await API.orgs.updateMember(uid, { role }); await loadAll(); }
    catch (err) { setError(err.message); }
  };

  const removeMember = async (uid) => {
    if (!confirm('Remove this member?')) return;
    try { await API.orgs.removeMember(uid); await loadAll(); }
    catch (err) { setError(err.message); }
  };

  const revokeInvite = async (id) => {
    try { await API.orgs.revokeInvite(id); await loadAll(); }
    catch (err) { setError(err.message); }
  };

  const tabs = [
    { id:'org',     label:'Organisation' },
    { id:'members', label:'Team Members' },
    { id:'invites', label:'Invites'      },
    { id:'plan',    label:'Plan & Usage' }
  ];

  return (
    <div className="module-container">
      <h2>Settings</h2>
      <p className="subtitle">Manage your organisation, team, and billing</p>
      <Tabs tabs={tabs} activeTab={tab} onTabChange={setTab} />

      {error   && <ErrorBanner message={error} onDismiss={() => setError('')} />}
      {success && <div style={{background:'#e8f5e9',color:'#1b5e20',border:'1px solid #a5d6a7',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:14}}>{success}</div>}

      {/* ── Org Profile ── */}
      {tab === 'org' && (
        <div className="data-table-container" style={{padding:24}}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Organisation Name</label>
              <input className="form-input" value={org.name || ''} onChange={e => setOrg(o => ({...o, name:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={org.currency || 'GBP'} onChange={e => setOrg(o => ({...o, currency:e.target.value}))}>
                <option value="GBP">GBP — British Pound</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">VAT Number</label>
              <input className="form-input" value={org.vatNumber || ''} onChange={e => setOrg(o => ({...o, vatNumber:e.target.value}))} placeholder="GB123456789" />
            </div>
            <div className="form-group">
              <label className="form-label">Fiscal Year End (MM-DD)</label>
              <input className="form-input" value={org.fiscalYearEnd || '03-31'} onChange={e => setOrg(o => ({...o, fiscalYearEnd:e.target.value}))} placeholder="03-31" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Website</label>
            <input className="form-input" value={org.website || ''} onChange={e => setOrg(o => ({...o, website:e.target.value}))} placeholder="https://yourcompany.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={org.phone || ''} onChange={e => setOrg(o => ({...o, phone:e.target.value}))} placeholder="+44 20 1234 5678" />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-textarea" value={org.address || ''} onChange={e => setOrg(o => ({...o, address:e.target.value}))} />
          </div>
          <div style={{marginTop:16}}>
            <button className="btn-primary" onClick={saveOrg} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      )}

      {/* ── Members ── */}
      {tab === 'members' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {members.map(m => (
                <tr key={m._id}>
                  <td><strong>{m.user?.name || '—'}</strong></td>
                  <td>{m.user?.email}</td>
                  <td>
                    {m.role === 'owner' ? <StatusBadge status="owner" /> : (
                      <select className="form-select" style={{width:130,padding:'4px 8px',fontSize:12}} value={m.role}
                        onChange={e => changeRole(m.user._id, e.target.value)}>
                        <option value="admin">Admin</option>
                        <option value="accountant">Accountant</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                  </td>
                  <td>{m.acceptedAt ? new Date(m.acceptedAt).toLocaleDateString('en-GB') : '—'}</td>
                  <td>
                    {m.role !== 'owner' && (
                      <button className="btn-sm btn-danger" onClick={() => removeMember(m.user._id)}>Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Invites ── */}
      {tab === 'invites' && (
        <>
          <div className="data-table-container" style={{padding:20,marginBottom:20}}>
            <h3 style={{marginBottom:14,fontSize:15,fontWeight:700}}>Invite Team Member</h3>
            <div className="form-row" style={{alignItems:'flex-end',gap:12}}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="accountant">Accountant</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div style={{paddingBottom:2}}>
                <button className="btn-primary" onClick={sendInvite}>Send Invite</button>
              </div>
            </div>
            {inviteUrl && (
              <div style={{background:'#e8f5e9',border:'1px solid #a5d6a7',borderRadius:6,padding:'10px 14px',marginTop:12,fontSize:13}}>
                <strong>Invite link (share this):</strong><br/>
                <code style={{wordBreak:'break-all',fontSize:12}}>{inviteUrl}</code>
              </div>
            )}
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Email</th><th>Role</th><th>Invited By</th><th>Expires</th><th>Actions</th></tr></thead>
              <tbody>
                {invites.length === 0 && <tr><td colSpan={5} className="empty-state-cell">No pending invites</td></tr>}
                {invites.map(inv => (
                  <tr key={inv._id}>
                    <td>{inv.email}</td>
                    <td><StatusBadge status={inv.role} /></td>
                    <td>{inv.invitedBy?.name || '—'}</td>
                    <td>{new Date(inv.expiresAt).toLocaleDateString('en-GB')}</td>
                    <td><button className="btn-sm btn-danger" onClick={() => revokeInvite(inv._id)}>Revoke</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Plan ── */}
      {tab === 'plan' && plan && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:24}}>
            {[
              { label:'Current Plan', value: PLAN_LABELS[plan.plan] || plan.plan, color: PLAN_COLORS[plan.plan] },
              { label:'Members',      value: `${plan.usage.members} / ${plan.limits.maxUsers}` },
              { label:'Invoices',     value: `${plan.usage.invoices} / ${plan.limits.maxInvoices}` },
              { label:'Projects',     value: `${plan.usage.projects} / ${plan.limits.maxProjects}` }
            ].map(c => (
              <div key={c.label} style={{background:'white',borderRadius:10,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,.07)',borderLeft:`4px solid ${c.color||'#3498db'}`}}>
                <div style={{fontSize:11,fontWeight:700,color:'#7f8c8d',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>{c.label}</div>
                <div style={{fontSize:22,fontWeight:800,color: c.color || '#2c3e50'}}>{c.value}</div>
              </div>
            ))}
          </div>

          {plan.plan === 'free' && (
            <div style={{background:'linear-gradient(135deg,#3498db,#2980b9)',borderRadius:12,padding:24,color:'white',textAlign:'center'}}>
              <h3 style={{marginBottom:8,fontSize:20}}>Upgrade to Pro</h3>
              <p style={{marginBottom:16,opacity:.9}}>Unlimited users, invoices, and projects — plus priority support.</p>
              <div style={{display:'flex',justifyContent:'center',gap:24,marginBottom:20,fontSize:14}}>
                {['Unlimited users','Unlimited invoices','Unlimited projects','Priority support','Advanced reports'].map(f => (
                  <span key={f}>✓ {f}</span>
                ))}
              </div>
              <button className="btn-primary" style={{background:'white',color:'#3498db',fontSize:16,padding:'12px 32px'}}
                onClick={async () => {
                  try {
                    const r = await API.billing.checkout({ plan: 'pro' });
                    if (r.data?.url) window.location.href = r.data.url;
                  } catch (e) { setError(e.message); }
                }}>
                Upgrade to Pro — £29/month
              </button>
            </div>
          )}

          {plan.plan !== 'free' && (
            <div style={{background:'white',borderRadius:12,padding:24,boxShadow:'0 2px 8px rgba(0,0,0,.07)',textAlign:'center'}}>
              <h3 style={{marginBottom:8,fontSize:18}}>Manage Subscription</h3>
              <p style={{marginBottom:16,color:'#666'}}>Update payment method, view invoices, or cancel your subscription.</p>
              <button className="btn-primary"
                onClick={async () => {
                  try {
                    const r = await API.billing.portal();
                    if (r.data?.url) window.location.href = r.data.url;
                  } catch (e) { setError(e.message); }
                }}>
                Open Billing Portal
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
