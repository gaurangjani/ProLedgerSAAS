// LedgerPro Finance Module
import { useState, useEffect } from 'react';
import API from '../api';
import { Tabs, StatusBadge, ErrorBanner, LoadingSpinner, DataTable, Modal, ConfirmDialog, FormField, formatCurrency, formatDate } from './ui';

const TABS = [
  { id: 'accounts', label: 'Chart of Accounts' },
  { id: 'journal',  label: 'Journal Entries'   },
  { id: 'trial',    label: 'Trial Balance'      }
];

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const ACCOUNT_CATEGORIES = ['current-asset', 'fixed-asset', 'current-liability', 'long-term-liability', 'equity', 'revenue', 'cogs', 'operating-expense', 'other-income', 'other-expense'];
const ENTRY_TYPES = ['journal', 'adjustment', 'closing', 'opening'];

const emptyAccount = () => ({ accountCode: '', accountName: '', accountType: 'asset', accountCategory: 'current-asset', description: '', currency: 'GBP', isActive: true });
const emptyEntry = () => ({ date: new Date().toISOString().split('T')[0], description: '', type: 'journal', fiscalYear: new Date().getFullYear(), fiscalPeriod: new Date().getMonth() + 1, lines: [{ accountCode: '', accountName: '', debit: '', credit: '', description: '' }] });

export default function FinanceModule({ navigate }) {
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [trialBalance, setTrialBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyAccount());
  const [entryForm, setEntryForm] = useState(emptyEntry());
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [formError, setFormError] = useState(null);

  const loadAccounts = async () => {
    setLoading(true); setError(null);
    try { const r = await API.finance.getAccounts(); setAccounts(r.data || []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadEntries = async () => {
    setLoading(true); setError(null);
    try { const r = await API.finance.getJournalEntries(); setEntries(r.data || []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadTrialBalance = async () => {
    setLoading(true); setError(null);
    try { const r = await API.finance.getTrialBalance(); setTrialBalance(r.data || r); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'accounts') loadAccounts();
    else if (activeTab === 'journal') loadEntries();
    else if (activeTab === 'trial') loadTrialBalance();
  }, [activeTab]);

  const openAdd = () => {
    if (activeTab === 'journal') { setEntryForm(emptyEntry()); setEditItem(null); setFormError(null); setShowModal(true); }
    else { setFormData(emptyAccount()); setEditItem(null); setFormError(null); setShowModal(true); }
  };
  const openEdit = (item) => { setEditItem(item); setFormData({ ...item }); setFormError(null); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditItem(null); setFormError(null); };

  const saveAccount = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      if (editItem) await API.finance.updateAccount(editItem._id, formData);
      else await API.finance.createAccount(formData);
      closeModal(); loadAccounts();
    } catch (err) { setFormError(err.message); }
  };

  const deleteAccount = async () => {
    try { await API.finance.deleteAccount(confirmTarget._id); setConfirmTarget(null); loadAccounts(); }
    catch (err) { setError(err.message); setConfirmTarget(null); }
  };

  // Line items helpers
  const updateLine = (idx, field, val) => {
    const lines = [...entryForm.lines];
    lines[idx] = { ...lines[idx], [field]: val };
    setEntryForm(f => ({ ...f, lines }));
  };
  const addLine = () => setEntryForm(f => ({ ...f, lines: [...f.lines, { accountCode: '', accountName: '', debit: '', credit: '', description: '' }] }));
  const removeLine = (idx) => setEntryForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  const totalDebit = entryForm.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = entryForm.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

  const saveEntry = async (e) => {
    e.preventDefault(); setFormError(null);
    if (Math.abs(totalDebit - totalCredit) > 0.01) { setFormError('Total debits must equal total credits'); return; }
    try {
      await API.finance.createJournalEntry({ ...entryForm, lines: entryForm.lines.map(l => ({ ...l, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0 })) });
      closeModal(); loadEntries();
    } catch (err) { setFormError(err.message); }
  };

  // ── Accounts tab ─────────────────────────────────────────────────────────
  const AccountsTab = () => (
    <>
      <div className="module-toolbar">
        <h3>Chart of Accounts ({accounts.length})</h3>
        <button className="btn-primary" onClick={openAdd}>+ Add Account</button>
      </div>
      {error && <ErrorBanner message={error} onRetry={loadAccounts} />}
      <DataTable
        columns={[
          { key: 'accountCode', label: 'Code' },
          { key: 'accountName', label: 'Name' },
          { key: 'accountType', label: 'Type', render: v => <StatusBadge status={v} /> },
          { key: 'accountCategory', label: 'Category' },
          { key: 'balance', label: 'Balance', render: v => formatCurrency(v) },
          { key: 'isActive', label: 'Status', render: v => <StatusBadge status={v ? 'active' : 'inactive'} /> }
        ]}
        data={accounts} loading={loading}
        emptyText="No accounts found. Add your first account."
        actions={row => (<>
          <button className="btn-secondary btn-sm" onClick={() => openEdit(row)}>Edit</button>
          <button className="btn-danger btn-sm" onClick={() => setConfirmTarget(row)}>Delete</button>
        </>)}
      />
    </>
  );

  // ── Journal Entries tab ───────────────────────────────────────────────────
  const JournalTab = () => (
    <>
      <div className="module-toolbar">
        <h3>Journal Entries ({entries.length})</h3>
        <button className="btn-primary" onClick={openAdd}>+ New Entry</button>
      </div>
      {error && <ErrorBanner message={error} onRetry={loadEntries} />}
      <DataTable
        columns={[
          { key: 'entryNumber', label: 'Entry #' },
          { key: 'date', label: 'Date', render: v => formatDate(v) },
          { key: 'description', label: 'Description' },
          { key: 'type', label: 'Type' },
          { key: 'totalDebit', label: 'Total Debit', render: v => formatCurrency(v) },
          { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> }
        ]}
        data={entries} loading={loading}
        emptyText="No journal entries found."
        actions={row => row.status === 'draft' ? (
          <button className="btn-secondary btn-sm" onClick={async () => { try { await API.finance.postJournalEntry(row._id); loadEntries(); } catch (e) { setError(e.message); } }}>Post</button>
        ) : null}
      />
    </>
  );

  // ── Trial Balance tab ─────────────────────────────────────────────────────
  const TrialTab = () => (
    <>
      <div className="module-toolbar">
        <h3>Trial Balance</h3>
        <button className="btn-secondary" onClick={loadTrialBalance}>Refresh</button>
      </div>
      {error && <ErrorBanner message={error} onRetry={loadTrialBalance} />}
      {loading && <LoadingSpinner text="Generating trial balance..." />}
      {!loading && trialBalance && (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Account Code</th><th>Account Name</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead>
            <tbody>
              {(trialBalance.accounts || []).map((a, i) => (
                <tr key={i}>
                  <td>{a.accountCode}</td>
                  <td>{a.accountName}</td>
                  <td>{a.accountType}</td>
                  <td>{a.debit > 0 ? formatCurrency(a.debit) : '—'}</td>
                  <td>{a.credit > 0 ? formatCurrency(a.credit) : '—'}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: '#f5f5f5' }}>
                <td colSpan={3}>TOTALS</td>
                <td>{formatCurrency(trialBalance.totalDebit)}</td>
                <td>{formatCurrency(trialBalance.totalCredit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <div className="module-container">
      <h2>Finance</h2>
      <p className="subtitle">General ledger, chart of accounts, and financial reporting</p>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'accounts' && <AccountsTab />}
      {activeTab === 'journal' && <JournalTab />}
      {activeTab === 'trial' && <TrialTab />}

      {/* Account modal */}
      {showModal && activeTab !== 'journal' && (
        <Modal title={editItem ? 'Edit Account' : 'Add Account'} onClose={closeModal} footer={<>
          <button className="btn-secondary" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={saveAccount}>Save</button>
        </>}>
          {formError && <ErrorBanner message={formError} />}
          <form id="account-form" onSubmit={saveAccount}>
            <div className="form-row">
              <FormField label="Account Code *">
                <input className="form-input" value={formData.accountCode} onChange={e => setFormData(f => ({ ...f, accountCode: e.target.value }))} required />
              </FormField>
              <FormField label="Account Name *">
                <input className="form-input" value={formData.accountName} onChange={e => setFormData(f => ({ ...f, accountName: e.target.value }))} required />
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="Account Type *">
                <select className="form-select" value={formData.accountType} onChange={e => setFormData(f => ({ ...f, accountType: e.target.value }))}>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Category *">
                <select className="form-select" value={formData.accountCategory} onChange={e => setFormData(f => ({ ...f, accountCategory: e.target.value }))}>
                  {ACCOUNT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Description">
              <input className="form-input" value={formData.description || ''} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} />
            </FormField>
          </form>
        </Modal>
      )}

      {/* Journal Entry modal */}
      {showModal && activeTab === 'journal' && (
        <Modal title="New Journal Entry" onClose={closeModal} footer={<>
          <button className="btn-secondary" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={saveEntry}>Save Entry</button>
        </>}>
          {formError && <ErrorBanner message={formError} />}
          <div className="form-row">
            <FormField label="Date *">
              <input className="form-input" type="date" value={entryForm.date} onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))} required />
            </FormField>
            <FormField label="Type">
              <select className="form-select" value={entryForm.type} onChange={e => setEntryForm(f => ({ ...f, type: e.target.value }))}>
                {ENTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Description *">
            <input className="form-input" value={entryForm.description} onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))} required />
          </FormField>
          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13, color: '#555' }}>Line Items</div>
          <table className="line-items-table">
            <thead><tr><th>Account Code</th><th>Account Name</th><th>Debit (£)</th><th>Credit (£)</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {entryForm.lines.map((line, idx) => (
                <tr key={idx}>
                  <td><input className="form-input" style={{ fontSize: 13 }} value={line.accountCode} onChange={e => updateLine(idx, 'accountCode', e.target.value)} /></td>
                  <td><input className="form-input" style={{ fontSize: 13 }} value={line.accountName} onChange={e => updateLine(idx, 'accountName', e.target.value)} /></td>
                  <td><input className="form-input" style={{ fontSize: 13 }} type="number" min="0" step="0.01" value={line.debit} onChange={e => updateLine(idx, 'debit', e.target.value)} /></td>
                  <td><input className="form-input" style={{ fontSize: 13 }} type="number" min="0" step="0.01" value={line.credit} onChange={e => updateLine(idx, 'credit', e.target.value)} /></td>
                  <td><input className="form-input" style={{ fontSize: 13 }} value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} /></td>
                  <td><button className="btn-danger btn-sm" onClick={() => removeLine(idx)} disabled={entryForm.lines.length === 1}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button className="btn-secondary btn-sm" onClick={addLine}>+ Add Line</button>
            <div className="line-items-totals">
              Debit: <strong style={{ color: Math.abs(totalDebit - totalCredit) < 0.01 ? '#27ae60' : '#e74c3c' }}>{formatCurrency(totalDebit)}</strong>
              &nbsp;|&nbsp;
              Credit: <strong>{formatCurrency(totalCredit)}</strong>
            </div>
          </div>
        </Modal>
      )}

      {confirmTarget && <ConfirmDialog message={`Delete account "${confirmTarget.accountName}"?`} onConfirm={deleteAccount} onCancel={() => setConfirmTarget(null)} />}
    </div>
  );
}
