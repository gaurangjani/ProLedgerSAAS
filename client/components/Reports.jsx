// LedgerPro Reports & Analytics Module

(function () {
  const { useState, useEffect } = React;

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

  window.ReportsModule = function () {
    const [activeTab, setActiveTab] = useState('pl');
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [authRequired, setAuthRequired] = useState(false);

    const checkAuth = async () => {
      try { await window.API.auth.me(); return true; }
      catch { setAuthRequired(true); return false; }
    };

    const loaders = {
      pl:          () => window.API.finance.getProfitLoss(),
      bs:          () => window.API.finance.getBalanceSheet(),
      'fa-schedule': () => window.API.finance.getFixedAssetsSchedule(),
      'ar-aging':  () => window.API.ar.getAgingReport()
    };

    const load = async () => {
      setLoading(true); setError(null);
      try { const r = await loaders[activeTab](); setData(d => ({ ...d, [activeTab]: r.data || r })); }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };

    useEffect(() => { checkAuth().then(ok => ok && load()); }, [activeTab]);
    if (authRequired) return <window.LoginModal onSuccess={() => setAuthRequired(false)} />;

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
              {(pl.revenue||[]).map((r,i)=><tr key={i}><td style={{paddingLeft:32}}>{r.accountName||r.name}</td><td>{window.formatCurrency(r.balance||r.amount)}</td></tr>)}
              <tr style={{fontWeight:700}}><td>Total Revenue</td><td>{window.formatCurrency(pl.totalRevenue)}</td></tr>
              <tr style={{background:'#f5f5f5',fontWeight:700}}><td colSpan={2}>Expenses</td></tr>
              {(pl.expenses||[]).map((e,i)=><tr key={i}><td style={{paddingLeft:32}}>{e.accountName||e.name}</td><td>{window.formatCurrency(e.balance||e.amount)}</td></tr>)}
              <tr style={{fontWeight:700}}><td>Total Expenses</td><td>{window.formatCurrency(pl.totalExpenses)}</td></tr>
              <tr style={{fontWeight:700,background:'#2c3e50',color:'white'}}><td>Net Profit / (Loss)</td><td>{window.formatCurrency(pl.netProfit||pl.netIncome)}</td></tr>
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
        {(items||[]).map((r,i)=><tr key={i}><td style={{paddingLeft:32}}>{r.accountName||r.name}</td><td>{window.formatCurrency(r.balance||r.amount)}</td></tr>)}
        <tr style={{fontWeight:700}}><td>Total {title}</td><td>{window.formatCurrency(total)}</td></tr>
      </>);
      return (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Line Item</th><th>Amount</th></tr></thead>
            <tbody>
              <Section title="Assets" items={[...(bs.currentAssets||[]), ...(bs.fixedAssets||[])]} total={bs.totalAssets} />
              <Section title="Liabilities" items={[...(bs.currentLiabilities||[]), ...(bs.longTermLiabilities||[])]} total={bs.totalLiabilities} />
              <Section title="Equity" items={bs.equity||[]} total={bs.totalEquity} />
              <tr style={{fontWeight:700,background:'#2c3e50',color:'white'}}><td>Total Liabilities + Equity</td><td>{window.formatCurrency((bs.totalLiabilities||0)+(bs.totalEquity||0))}</td></tr>
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
                  <td>{window.formatCurrency(a.acquisitionCost)}</td>
                  <td>{window.formatCurrency(a.accumulatedDepreciation)}</td>
                  <td>{window.formatCurrency(a.netBookValue)}</td>
                  <td><window.StatusBadge status={a.status}/></td>
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
                  <td>{window.formatCurrency(c.current)}</td>
                  <td>{window.formatCurrency(c['1-30'])}</td>
                  <td>{window.formatCurrency(c['31-60'])}</td>
                  <td>{window.formatCurrency(c['61-90'])}</td>
                  <td>{window.formatCurrency(c['90+'])}</td>
                  <td><strong>{window.formatCurrency(c.total)}</strong></td>
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
        <window.Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="module-toolbar">
          <h3>{{pl:'Profit & Loss', bs:'Balance Sheet', 'fa-schedule':'Fixed Assets Schedule', 'ar-aging':'AR Aging Report'}[activeTab]}</h3>
          <button className="btn-secondary" onClick={load}>Refresh</button>
        </div>

        {error && <window.ErrorBanner message={error} onRetry={load} />}
        {loading && <window.LoadingSpinner text="Generating report..." />}
        {!loading && !current && !error && <div className="empty-state"><h3>No data available</h3><p>This report requires posted journal entries in the system.</p></div>}
        {!loading && current && activeTab==='pl'          && <PLReport />}
        {!loading && current && activeTab==='bs'          && <BSReport />}
        {!loading && current && activeTab==='fa-schedule' && <FAReport />}
        {!loading && current && activeTab==='ar-aging'    && <AgingReport />}
      </div>
    );
  };

})();
