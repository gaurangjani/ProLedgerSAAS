// LedgerPro Accounts Receivable Module

(function () {
  const { useState, useEffect } = React;

  const TABS = [
    { id: 'customers', label: 'Customers'     },
    { id: 'invoices',  label: 'Invoices'      },
    { id: 'payments',  label: 'Payments'      },
    { id: 'aging',     label: 'Aging Report'  }
  ];

  const PAYMENT_TERMS = ['net-7','net-15','net-30','net-60','net-90','due-on-receipt'];
  const PAYMENT_METHODS = ['cash','cheque','bank-transfer','card','online'];
  const INVOICE_STATUSES = ['draft','sent','partially-paid','paid','overdue','cancelled'];

  const emptyCustomer = () => ({ customerCode:'', customerName:'', email:'', phone:'', paymentTerms:'net-30', creditLimit:0, billingAddress:'', isActive:true });
  const emptyInvoice = () => ({ customer:'', invoiceDate: new Date().toISOString().split('T')[0], notes:'', lineItems:[{ description:'', quantity:1, unitPrice:0, taxRate:0 }] });
  const emptyPayment = () => ({ invoice:'', customer:'', paymentDate: new Date().toISOString().split('T')[0], amount:0, paymentMethod:'bank-transfer', reference:'', notes:'' });

  window.ARModule = function () {
    const [activeTab, setActiveTab] = useState('customers');
    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [payments, setPayments] = useState([]);
    const [aging, setAging] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState(emptyCustomer());
    const [invoiceForm, setInvoiceForm] = useState(emptyInvoice());
    const [paymentForm, setPaymentForm] = useState(emptyPayment());
    const [confirmTarget, setConfirmTarget] = useState(null);
    const [authRequired, setAuthRequired] = useState(false);
    const [formError, setFormError] = useState(null);

    const checkAuth = async () => {
      try { await window.API.auth.me(); return true; }
      catch { setAuthRequired(true); return false; }
    };

    const loaders = {
      customers: async () => { const r = await window.API.ar.getCustomers(); setCustomers(r.data || []); },
      invoices:  async () => { const r = await window.API.ar.getInvoices();  setInvoices(r.data || []); },
      payments:  async () => { const r = await window.API.ar.getPayments();  setPayments(r.data || []); },
      aging:     async () => { const r = await window.API.ar.getAgingReport(); setAging(r.data || r); }
    };

    const load = async () => {
      setLoading(true); setError(null);
      try { await loaders[activeTab](); }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };

    useEffect(() => { checkAuth().then(ok => ok && load()); }, [activeTab]);

    if (authRequired) return <window.LoginModal onSuccess={() => setAuthRequired(false)} />;

    const closeModal = () => { setShowModal(false); setEditItem(null); setFormError(null); };

    // ── Customers ─────────────────────────────────────────────────────────────
    const saveCustomer = async (e) => {
      e.preventDefault(); setFormError(null);
      try {
        if (editItem) await window.API.ar.updateCustomer(editItem._id, formData);
        else await window.API.ar.createCustomer(formData);
        closeModal(); load();
      } catch (err) { setFormError(err.message); }
    };

    const deleteCustomer = async () => {
      try { await window.API.ar.deleteCustomer(confirmTarget._id); setConfirmTarget(null); load(); }
      catch (err) { setError(err.message); setConfirmTarget(null); }
    };

    // ── Invoices ──────────────────────────────────────────────────────────────
    const updateLineItem = (idx, field, val) => {
      const items = [...invoiceForm.lineItems];
      items[idx] = { ...items[idx], [field]: val };
      setInvoiceForm(f => ({ ...f, lineItems: items }));
    };
    const addLineItem = () => setInvoiceForm(f => ({ ...f, lineItems: [...f.lineItems, { description:'', quantity:1, unitPrice:0, taxRate:0 }] }));
    const removeLineItem = (idx) => setInvoiceForm(f => ({ ...f, lineItems: f.lineItems.filter((_,i) => i !== idx) }));
    const invSubtotal = invoiceForm.lineItems.reduce((s, l) => s + (parseFloat(l.quantity)||0) * (parseFloat(l.unitPrice)||0), 0);
    const invTax = invoiceForm.lineItems.reduce((s, l) => s + (parseFloat(l.quantity)||0) * (parseFloat(l.unitPrice)||0) * ((parseFloat(l.taxRate)||0)/100), 0);

    const saveInvoice = async (e) => {
      e.preventDefault(); setFormError(null);
      try {
        await window.API.ar.createInvoice({ ...invoiceForm, lineItems: invoiceForm.lineItems.map(l => ({ ...l, quantity: parseFloat(l.quantity)||1, unitPrice: parseFloat(l.unitPrice)||0, taxRate: parseFloat(l.taxRate)||0 })) });
        closeModal(); load();
      } catch (err) { setFormError(err.message); }
    };

    // ── Payments ──────────────────────────────────────────────────────────────
    const savePayment = async (e) => {
      e.preventDefault(); setFormError(null);
      try {
        await window.API.ar.createPayment({ ...paymentForm, amount: parseFloat(paymentForm.amount)||0 });
        closeModal(); load();
      } catch (err) { setFormError(err.message); }
    };

    const openAdd = () => {
      setEditItem(null); setFormError(null);
      if (activeTab === 'customers') { setFormData(emptyCustomer()); }
      else if (activeTab === 'invoices') { setInvoiceForm(emptyInvoice()); }
      else if (activeTab === 'payments') { setPaymentForm(emptyPayment()); }
      setShowModal(true);
    };
    const openEdit = (item) => { setEditItem(item); setFormData({...item}); setFormError(null); setShowModal(true); };

    return (
      <div className="module-container">
        <h2>Accounts Receivable</h2>
        <p className="subtitle">Customer invoices, payments, and aging analysis</p>
        <window.Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Customers Tab */}
        {activeTab === 'customers' && (<>
          <div className="module-toolbar">
            <h3>Customers ({customers.length})</h3>
            <button className="btn-primary" onClick={openAdd}>+ Add Customer</button>
          </div>
          {error && <window.ErrorBanner message={error} onRetry={load} />}
          <window.DataTable loading={loading} emptyText="No customers yet."
            columns={[
              { key:'customerCode', label:'Code' },
              { key:'customerName', label:'Name' },
              { key:'email', label:'Email' },
              { key:'paymentTerms', label:'Terms' },
              { key:'creditLimit', label:'Credit Limit', render: v => window.formatCurrency(v) },
              { key:'isActive', label:'Status', render: v => <window.StatusBadge status={v?'active':'inactive'} /> }
            ]}
            data={customers}
            actions={row => (<>
              <button className="btn-secondary btn-sm" onClick={() => openEdit(row)}>Edit</button>
              <button className="btn-danger btn-sm" onClick={() => setConfirmTarget(row)}>Delete</button>
            </>)}
          />
        </>)}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (<>
          <div className="module-toolbar">
            <h3>Invoices ({invoices.length})</h3>
            <button className="btn-primary" onClick={openAdd}>+ New Invoice</button>
          </div>
          {error && <window.ErrorBanner message={error} onRetry={load} />}
          <window.DataTable loading={loading} emptyText="No invoices yet."
            columns={[
              { key:'invoiceNumber', label:'Invoice #' },
              { key:'customer', label:'Customer', render: (v,r) => r.customer?.customerName || v },
              { key:'invoiceDate', label:'Date', render: v => window.formatDate(v) },
              { key:'dueDate', label:'Due', render: v => window.formatDate(v) },
              { key:'total', label:'Total', render: v => window.formatCurrency(v) },
              { key:'amountDue', label:'Outstanding', render: v => window.formatCurrency(v) },
              { key:'status', label:'Status', render: v => <window.StatusBadge status={v} /> }
            ]}
            data={invoices}
          />
        </>)}

        {/* Payments Tab */}
        {activeTab === 'payments' && (<>
          <div className="module-toolbar">
            <h3>Payments ({payments.length})</h3>
            <button className="btn-primary" onClick={openAdd}>+ Record Payment</button>
          </div>
          {error && <window.ErrorBanner message={error} onRetry={load} />}
          <window.DataTable loading={loading} emptyText="No payments yet."
            columns={[
              { key:'paymentNumber', label:'Payment #' },
              { key:'customer', label:'Customer', render: (v,r) => r.customer?.customerName || '—' },
              { key:'paymentDate', label:'Date', render: v => window.formatDate(v) },
              { key:'amount', label:'Amount', render: v => window.formatCurrency(v) },
              { key:'paymentMethod', label:'Method' },
              { key:'status', label:'Status', render: v => <window.StatusBadge status={v} /> }
            ]}
            data={payments}
          />
        </>)}

        {/* Aging Report Tab */}
        {activeTab === 'aging' && (<>
          <div className="module-toolbar">
            <h3>Aging Report</h3>
            <button className="btn-secondary" onClick={load}>Refresh</button>
          </div>
          {error && <window.ErrorBanner message={error} onRetry={load} />}
          {loading && <window.LoadingSpinner text="Generating aging report..." />}
          {!loading && aging && (
            <div className="data-table-container">
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Current</th><th>1–30 days</th><th>31–60 days</th><th>61–90 days</th><th>90+ days</th><th>Total</th></tr></thead>
                <tbody>
                  {(aging.customers || []).map((c, i) => (
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
          )}
        </>)}

        {/* Customer Modal */}
        {showModal && activeTab === 'customers' && (
          <window.Modal title={editItem ? 'Edit Customer' : 'Add Customer'} onClose={closeModal} footer={<>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={saveCustomer}>Save</button>
          </>}>
            {formError && <window.ErrorBanner message={formError} />}
            <form onSubmit={saveCustomer}>
              <div className="form-row">
                <window.FormField label="Customer Code *"><input className="form-input" value={formData.customerCode||''} onChange={e=>setFormData(f=>({...f,customerCode:e.target.value}))} required /></window.FormField>
                <window.FormField label="Customer Name *"><input className="form-input" value={formData.customerName||''} onChange={e=>setFormData(f=>({...f,customerName:e.target.value}))} required /></window.FormField>
              </div>
              <div className="form-row">
                <window.FormField label="Email"><input className="form-input" type="email" value={formData.email||''} onChange={e=>setFormData(f=>({...f,email:e.target.value}))} /></window.FormField>
                <window.FormField label="Phone"><input className="form-input" value={formData.phone||''} onChange={e=>setFormData(f=>({...f,phone:e.target.value}))} /></window.FormField>
              </div>
              <div className="form-row">
                <window.FormField label="Payment Terms">
                  <select className="form-select" value={formData.paymentTerms||'net-30'} onChange={e=>setFormData(f=>({...f,paymentTerms:e.target.value}))}>
                    {PAYMENT_TERMS.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </window.FormField>
                <window.FormField label="Credit Limit (£)"><input className="form-input" type="number" min="0" step="0.01" value={formData.creditLimit||0} onChange={e=>setFormData(f=>({...f,creditLimit:e.target.value}))} /></window.FormField>
              </div>
              <window.FormField label="Billing Address"><input className="form-input" value={formData.billingAddress||''} onChange={e=>setFormData(f=>({...f,billingAddress:e.target.value}))} /></window.FormField>
            </form>
          </window.Modal>
        )}

        {/* Invoice Modal */}
        {showModal && activeTab === 'invoices' && (
          <window.Modal title="New Invoice" onClose={closeModal} footer={<>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={saveInvoice}>Create Invoice</button>
          </>}>
            {formError && <window.ErrorBanner message={formError} />}
            <div className="form-row">
              <window.FormField label="Customer *">
                <select className="form-select" value={invoiceForm.customer} onChange={e=>setInvoiceForm(f=>({...f,customer:e.target.value}))} required>
                  <option value="">Select customer...</option>
                  {customers.map(c=><option key={c._id} value={c._id}>{c.customerName}</option>)}
                </select>
              </window.FormField>
              <window.FormField label="Invoice Date *"><input className="form-input" type="date" value={invoiceForm.invoiceDate} onChange={e=>setInvoiceForm(f=>({...f,invoiceDate:e.target.value}))} required /></window.FormField>
            </div>
            <window.FormField label="Notes"><input className="form-input" value={invoiceForm.notes||''} onChange={e=>setInvoiceForm(f=>({...f,notes:e.target.value}))} /></window.FormField>
            <div style={{marginBottom:8,fontWeight:600,fontSize:13,color:'#555'}}>Line Items</div>
            <table className="line-items-table">
              <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Tax %</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {invoiceForm.lineItems.map((l,idx)=>{
                  const amt = (parseFloat(l.quantity)||0)*(parseFloat(l.unitPrice)||0);
                  return (
                    <tr key={idx}>
                      <td><input className="form-input" style={{fontSize:13}} value={l.description} onChange={e=>updateLineItem(idx,'description',e.target.value)} /></td>
                      <td><input className="form-input" style={{fontSize:13,width:60}} type="number" min="1" value={l.quantity} onChange={e=>updateLineItem(idx,'quantity',e.target.value)} /></td>
                      <td><input className="form-input" style={{fontSize:13,width:90}} type="number" min="0" step="0.01" value={l.unitPrice} onChange={e=>updateLineItem(idx,'unitPrice',e.target.value)} /></td>
                      <td><input className="form-input" style={{fontSize:13,width:60}} type="number" min="0" max="100" value={l.taxRate} onChange={e=>updateLineItem(idx,'taxRate',e.target.value)} /></td>
                      <td style={{fontWeight:600}}>{window.formatCurrency(amt)}</td>
                      <td><button className="btn-danger btn-sm" onClick={()=>removeLineItem(idx)} disabled={invoiceForm.lineItems.length===1}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
              <button className="btn-secondary btn-sm" onClick={addLineItem}>+ Add Line</button>
              <div className="line-items-totals">Subtotal: {window.formatCurrency(invSubtotal)} | Tax: {window.formatCurrency(invTax)} | <strong>Total: {window.formatCurrency(invSubtotal+invTax)}</strong></div>
            </div>
          </window.Modal>
        )}

        {/* Payment Modal */}
        {showModal && activeTab === 'payments' && (
          <window.Modal title="Record Payment" onClose={closeModal} footer={<>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={savePayment}>Record</button>
          </>}>
            {formError && <window.ErrorBanner message={formError} />}
            <div className="form-row">
              <window.FormField label="Invoice *">
                <select className="form-select" value={paymentForm.invoice} onChange={e=>{const inv=invoices.find(i=>i._id===e.target.value); setPaymentForm(f=>({...f,invoice:e.target.value,customer:inv?.customer?._id||inv?.customer||'',amount:inv?.amountDue||0}));}} required>
                  <option value="">Select invoice...</option>
                  {invoices.filter(i=>['sent','partially-paid','overdue'].includes(i.status)).map(i=><option key={i._id} value={i._id}>{i.invoiceNumber} — {window.formatCurrency(i.amountDue)} due</option>)}
                </select>
              </window.FormField>
              <window.FormField label="Payment Date *"><input className="form-input" type="date" value={paymentForm.paymentDate} onChange={e=>setPaymentForm(f=>({...f,paymentDate:e.target.value}))} required /></window.FormField>
            </div>
            <div className="form-row">
              <window.FormField label="Amount (£) *"><input className="form-input" type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={e=>setPaymentForm(f=>({...f,amount:e.target.value}))} required /></window.FormField>
              <window.FormField label="Method">
                <select className="form-select" value={paymentForm.paymentMethod} onChange={e=>setPaymentForm(f=>({...f,paymentMethod:e.target.value}))}>
                  {PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </window.FormField>
            </div>
            <window.FormField label="Reference"><input className="form-input" value={paymentForm.reference||''} onChange={e=>setPaymentForm(f=>({...f,reference:e.target.value}))} /></window.FormField>
          </window.Modal>
        )}

        {confirmTarget && <window.ConfirmDialog message={`Delete customer "${confirmTarget.customerName}"?`} onConfirm={deleteCustomer} onCancel={()=>setConfirmTarget(null)} />}
      </div>
    );
  };

})();
