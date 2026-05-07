// SaaS Login — supports login, register (with org name), and accept-invite flow
import { useState } from 'react';
import API from '../api';

export default function LoginModal({ onSuccess }) {
  const [mode, setMode]       = useState('login'); // login | register | invite
  const [form, setForm]       = useState({ name:'', email:'', password:'', orgName:'', token:'' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await API.auth.login({ email: form.email, password: form.password });
      } else if (mode === 'register') {
        if (!form.orgName) { setError('Organisation name is required'); setLoading(false); return; }
        res = await API.auth.register({ name: form.name, email: form.email, password: form.password, orgName: form.orgName });
      } else {
        res = await API.auth.acceptInvite({ token: form.token, name: form.name, password: form.password });
      }
      onSuccess(res.data.user, res.data.org);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>LedgerPro</h1>
          <p>Professional Accounting Software</p>
        </div>

        <div className="auth-title">
          {mode === 'login' ? 'Sign in to your account' : mode === 'register' ? 'Create your account' : 'Accept Invitation'}
        </div>

        {error && <div className="auth-error">{error}</div>}

        {(mode === 'register' || mode === 'invite') && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={set('name')} placeholder="Your full name" />
          </div>
        )}

        {mode !== 'invite' && (
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" />
          </div>
        )}

        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Organisation Name</label>
            <input className="form-input" value={form.orgName} onChange={set('orgName')} placeholder="Your company name" />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
        </div>

        {mode === 'invite' && (
          <div className="form-group">
            <label className="form-label">Invite Token</label>
            <input className="form-input" value={form.token} onChange={set('token')} placeholder="Paste your invite token" />
          </div>
        )}

        <button className="btn-primary auth-submit" onClick={submit} disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account & Organisation' : 'Accept Invite'}
        </button>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => { setMode('register'); setError(''); }}>Register free</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(''); }}>Sign in</button></>
          )}
        </div>
        {mode !== 'invite' && (
          <div className="auth-toggle" style={{marginTop:6}}>
            Have an invite? <button onClick={() => { setMode('invite'); setError(''); }}>Accept invitation</button>
          </div>
        )}
      </div>
    </div>
  );
}
