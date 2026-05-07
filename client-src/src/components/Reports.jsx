// LedgerPro Reports & Analytics Module
import { useState, useEffect } from 'react';
import API from '../api';
import { Tabs, StatusBadge, ErrorBanner, LoadingSpinner, formatCurrency } from './ui';

const TABS = [
  { id: 'pl',           label: 'Profit & Loss'        },
  { id: 'bs',           label: 'Balance Sheet'        },
  { id: 'fa-schedule',  label: 'Fixed Assets Schedule'},
  { id: 'ar-aging',     label: 'AR Aging'             }
];

function exportCSV(filename, headers, rows) {
  const lines = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsModule({ navigate }) {
  const [activeTab, setActiveTab] = useState('pl');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loaders = {
    pl:          () => API.finance.getProfitLoss(),
    bs:          () => API.finance.getBalanceSheet(),
    'fa-schedule': () => API.finance.getFixedAssetsSchedule(),
    'ar-aging':  () => API.ar.getAgingReport()
  };

  const load = async () => {
    setLoading(true); setError(null);
    try { const r = await loaders[activeTab](); setData(d => ({ ...d, [activeTab]: r.data || r })); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeTab]);

  const current = data[activeTab];

  // ── P&L ──────────────────────────────────────────────────────────────────
  const PLReport = () => {
    const pl = current;
    if (!pl) return null;
    return (
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Category</th><th>Amount</th></tr></thead>
          <tbody>
            <tr style={{background:'#f5f5f5',fontWeight:700}}><td colSpan={2}>Revenue</td></tr>
            {(pl.revenue||[]).map((r,i)=><tr key={i}><td style={{paddingLeft:32}}>{r.accountName||r.name}</td><td>{formatCurrency(r.balance||r.amount)}</td></tr>)}
            <tr style={{fontWeight:700}}><td>Total Revenue</td><td>{formatCurrency(pl.totalRevenue)}</td></tr>
            <tr style={{background:'#f5f5f5',fontWeight:700}}><td colSpan={2}>Expenses</td></tr>
            {(pl.expenses||[]).map((e,i)=><tr key={i}><td style={{paddingLeft:32}}>{e.accountName||e.name}</td><td>{formatCurrency(e.balance||e.amount)}</td></tr>)}
            <tr style={{fontWeight:700}}><td>Total Expenses</td><td>{formatCurrency(pl.totalExpenses)}</td></tr>
            <tr style={{fontWeight:700,background:'#2c3e50',color:'white'}}><td>Net Profit / (Loss)</td><td>{formatCurrency(pl.netProfit||pl.netIncome)}</td></tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ── Balance Sheet ─────────────────────────────────────────────────────────
  const BSReport = () => {
    const bs = current;
    if (!bs) return null;
    const Section = ({ title, items, total }) => (<>
      <tr style={{background:'#f5f5f5',fontWeight:700}}><td colSpan={2}>{title}</td></tr>
      {(items||[]).map((r,i)=><tr key={i}><td style={{paddingLeft:32}}>{r.accountName||r.name}</td><td>{formatCurrency(r.balance||r.amount)}</td></tr>)}
      <tr style={{fontWeight:700}}><td>Total {title}</td><td>{formatCurrency(total)}</td></tr>
    </>);
    return (
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Line Item</th><th>Amount</th></tr></thead>
          <tbody>
            <Section title="Assets" items={[...(bs.currentAssets||[]), ...(bs.fixedAssets||[])]} total={bs.totalAssets} />
            <Section title="Liabilities" items={[...(bs.currentLiabilities||[]), ...(bs.longTermLiabilities||[])]} total={bs.totalLiabilities} />
            <Section title="Equity" items={bs.equity||[]} total={bs.totalEquity} />
            <tr style={{fontWeight:700,background:'#2c3e50',color:'white'}}><td>Total Liabilities + Equity</td><td>{formatCurrency((bs.totalLiabilities||0)+(bs.totalEquity||0))}</td></tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ── FA Schedule ───────────────────────────────────────────────────────────
  const FAReport = () => {
    const fa = current;
    if (!fa) return null;
    const assets = fa.assets || fa || [];
    return (
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Cost</th><th>Acc. Dep.</th><th>Net Book Value</th><th>Status</th></tr></thead>
          <tbody>
            {(Array.isArray(assets)?assets:[]).map((a,i)=>(
              <tr key={i}>
                <td>{a.assetCode}</td><td>{a.assetName}</td><td>{a.category}</td>
                <td>{formatCurrency(a.acquisitionCost)}</td>
                <td>{formatCurrency(a.accumulatedDepreciation)}</td>
                <td>{formatCurrency(a.netBookValue)}</td>
                <td><StatusBadge status={a.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── AR Aging ──────────────────────────────────────────────────────────────
  const AgingReport = () => {
    const aging = current;
    if (!aging) return null;
    const customers = aging.customers || [];
    return (
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Customer</th><th>Current</th><th>1–30 days</th><th>31–60 days</th><th>61–90 days</th><th>90+ days</th><th>Total</th></tr></thead>
          <tbody>
            {customers.map((c,i)=>(
              <tr key={i}>
                <td>{c.customerName}</td>
                <td>{formatCurrency(c.current)}</td>
                <td>{formatCurrency(c['1-30'])}</td>
                <td>{formatCurrency(c['31-60'])}</td>
                <td>{formatCurrency(c['61-90'])}</td>
                <td>{formatCurrency(c['90+'])}</td>
                <td><strong>{formatCurrency(c.total)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="module-container">
      <h2>Reports & Analytics</h2>
      <p className="subtitle">Financial statements and management reports</p>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="module-toolbar">
        <h3>{{pl:'Profit & Loss', bs:'Balance Sheet', 'fa-schedule':'Fixed Assets Schedule', 'ar-aging':'AR Aging Report'}[activeTab]}</h3>
        <button className="btn-secondary" onClick={load}>Refresh</button>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading && <LoadingSpinner text="Generating report..." />}
      {!loading && !current && !error && <div className="empty-state"><h3>No data available</h3><p>This report requires posted journal entries in the system.</p></div>}
      {!loading && current && activeTab==='pl'          && <PLReport />}
      {!loading && current && activeTab==='bs'          && <BSReport />}
      {!loading && current && activeTab==='fa-schedule' && <FAReport />}
      {!loading && current && activeTab==='ar-aging'    && <AgingReport />}
    </div>
  );
}
