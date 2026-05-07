// LedgerPro Accounts Payable Module
import { useState, useEffect } from 'react';
import API from '../api';
import { Tabs, StatusBadge, ErrorBanner, DataTable, Modal, ConfirmDialog, FormField, formatCurrency, formatDate } from './ui';

const TABS = [
  { id: 'vendors', label: 'Vendors'         },
  { id: 'bills',   label: 'Bills'           },
  { id: 'po',      label: 'Purchase Orders' },
  { id: 'payments',label: 'Vendor Payments' }
];

const PAYMENT_TERMS = ['net-7','net-15','net-30','net-60','net-90','due-on-receipt'];
const PAYMENT_METHODS = ['cash','cheque','bank-transfer','card'];

const emptyVendor = () => ({ vendorCode:'', vendorName:'', email:'', phone:'', paymentTerms:'net-30', address:'', taxId:'', isActive:true });
const emptyBill = () => ({ vendor:'', billDate: new Date().toISOString().split('T')[0], notes:'', lineItems:[{description:'',quantity:1,unitPrice:0,taxRate:0}] });
const emptyPO = () => ({ vendor:'', orderDate: new Date().toISOString().split('T')[0], expectedDeliveryDate:'', notes:'', lineItems:[{description:'',quantity:1,unitPrice:0}] });
const emptyPayment = () => ({ bill:'', vendor:'', paymentDate: new Date().toISOString().split('T')[0], amount:0, paymentMethod:'bank-transfer', reference:'' });

export default function APModule({ navigate }) {
  const [activeTab, setActiveTab] = useState('vendors');
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [pos, setPos] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyVendor());
  const [billForm, setBillForm] = useState(emptyBill());
  const [poForm, setPoForm] = useState(emptyPO());
  const [paymentForm, setPaymentForm] = useState(emptyPayment());
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [formError, setFormError] = useState(null);

  const loaders = {
    vendors:  async () => { const r = await API.ap.getVendors();         setVendors(r.data||[]); },
    bills:    async () => { const r = await API.ap.getBills();           setBills(r.data||[]); },
    po:       async () => { const r = await API.ap.getPurchaseOrders();  setPos(r.data||[]); },
    payments: async () => { const r = await API.ap.getPayments();        setPayments(r.data||[]); }
  };

  const load = async () => {
    setLoading(true); setError(null);
    try { await loaders[activeTab](); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeTab]);

  const closeModal = () => { setShowModal(false); setEditItem(null); setFormError(null); };

  const openAdd = () => {
    setEditItem(null); setFormError(null);
    if (activeTab === 'vendors')   setFormData(emptyVendor());
    else if (activeTab === 'bills') setBillForm(emptyBill());
    else if (activeTab === 'po')    setPoForm(emptyPO());
    else if (activeTab === 'payments') setPaymentForm(emptyPayment());
    setShowModal(true);
  };
  const openEdit = (item) => { setEditItem(item); setFormData({...item}); setFormError(null); setShowModal(true); };

  const saveVendor = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      if (editItem) await API.ap.updateVendor(editItem._id, formData);
      else await API.ap.createVendor(formData);
      closeModal(); load();
    } catch (err) { setFormError(err.message); }
  };

  const deleteVendor = async () => {
    try { await API.ap.deleteVendor(confirmTarget._id); setConfirmTarget(null); load(); }
    catch (err) { setError(err.message); setConfirmTarget(null); }
  };

  // Bill line items
  const updateBillLine = (idx,field,val) => { const items=[...billForm.lineItems]; items[idx]={...items[idx],[field]:val}; setBillForm(f=>({...f,lineItems:items})); };
  const addBillLine = () => setBillForm(f=>({...f,lineItems:[...f.lineItems,{description:'',quantity:1,unitPrice:0,taxRate:0}]}));
  const removeBillLine = (idx) => setBillForm(f=>({...f,lineItems:f.lineItems.filter((_,i)=>i!==idx)}));
  const billSubtotal = billForm.lineItems.reduce((s,l)=>s+(parseFloat(l.quantity)||0)*(parseFloat(l.unitPrice)||0),0);
  const billTax = billForm.lineItems.reduce((s,l)=>s+(parseFloat(l.quantity)||0)*(parseFloat(l.unitPrice)||0)*((parseFloat(l.taxRate)||0)/100),0);

  const saveBill = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      await API.ap.createBill({...billForm, lineItems: billForm.lineItems.map(l=>({...l,quantity:parseFloat(l.quantity)||1,unitPrice:parseFloat(l.unitPrice)||0,taxRate:parseFloat(l.taxRate)||0}))});
      closeModal(); load();
    } catch (err) { setFormError(err.message); }
  };

  // PO line items
  const updatePoLine = (idx,field,val) => { const items=[...poForm.lineItems]; items[idx]={...items[idx],[field]:val}; setPoForm(f=>({...f,lineItems:items})); };
  const addPoLine = () => setPoForm(f=>({...f,lineItems:[...f.lineItems,{description:'',quantity:1,unitPrice:0}]}));
  const removePoLine = (idx) => setPoForm(f=>({...f,lineItems:f.lineItems.filter((_,i)=>i!==idx)}));
  const poTotal = poForm.lineItems.reduce((s,l)=>s+(parseFloat(l.quantity)||0)*(parseFloat(l.unitPrice)||0),0);

  const savePO = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      await API.ap.createPurchaseOrder({...poForm, lineItems: poForm.lineItems.map(l=>({...l,quantity:parseFloat(l.quantity)||1,unitPrice:parseFloat(l.unitPrice)||0}))});
      closeModal(); load();
    } catch (err) { setFormError(err.message); }
  };

  const savePayment = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      await API.ap.createPayment({...paymentForm, amount:parseFloat(paymentForm.amount)||0});
      closeModal(); load();
    } catch (err) { setFormError(err.message); }
  };

  return (
    <div className="module-container">
      <h2>Accounts Payable</h2>
      <p className="subtitle">Vendor bills, purchase orders, and payment management</p>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Vendors */}
      {activeTab === 'vendors' && (<>
        <div className="module-toolbar"><h3>Vendors ({vendors.length})</h3><button className="btn-primary" onClick={openAdd}>+ Add Vendor</button></div>
        {error && <ErrorBanner message={error} onRetry={load} />}
        <DataTable loading={loading} emptyText="No vendors yet."
          columns={[
            {key:'vendorCode',label:'Code'},{key:'vendorName',label:'Name'},{key:'email',label:'Email'},
            {key:'paymentTerms',label:'Terms'},{key:'taxId',label:'Tax ID'},
            {key:'isActive',label:'Status',render:v=><StatusBadge status={v?'active':'inactive'}/>}
          ]}
          data={vendors}
          actions={row=>(<><button className="btn-secondary btn-sm" onClick={()=>openEdit(row)}>Edit</button><button className="btn-danger btn-sm" onClick={()=>setConfirmTarget(row)}>Delete</button></>)}
        />
      </>)}

      {/* Bills */}
      {activeTab === 'bills' && (<>
        <div className="module-toolbar"><h3>Bills ({bills.length})</h3><button className="btn-primary" onClick={openAdd}>+ New Bill</button></div>
        {error && <ErrorBanner message={error} onRetry={load} />}
        <DataTable loading={loading} emptyText="No bills yet."
          columns={[
            {key:'billNumber',label:'Bill #'},{key:'vendor',label:'Vendor',render:(v,r)=>r.vendor?.vendorName||'—'},
            {key:'billDate',label:'Date',render:v=>formatDate(v)},{key:'dueDate',label:'Due',render:v=>formatDate(v)},
            {key:'total',label:'Total',render:v=>formatCurrency(v)},{key:'amountDue',label:'Outstanding',render:v=>formatCurrency(v)},
            {key:'status',label:'Status',render:v=><StatusBadge status={v}/>}
          ]}
          data={bills}
        />
      </>)}

      {/* Purchase Orders */}
      {activeTab === 'po' && (<>
        <div className="module-toolbar"><h3>Purchase Orders ({pos.length})</h3><button className="btn-primary" onClick={openAdd}>+ New PO</button></div>
        {error && <ErrorBanner message={error} onRetry={load} />}
        <DataTable loading={loading} emptyText="No purchase orders yet."
          columns={[
            {key:'poNumber',label:'PO #'},{key:'vendor',label:'Vendor',render:(v,r)=>r.vendor?.vendorName||'—'},
            {key:'orderDate',label:'Order Date',render:v=>formatDate(v)},
            {key:'expectedDeliveryDate',label:'Expected Delivery',render:v=>formatDate(v)},
            {key:'total',label:'Total',render:v=>formatCurrency(v)},
            {key:'status',label:'Status',render:v=><StatusBadge status={v}/>}
          ]}
          data={pos}
        />
      </>)}

      {/* Vendor Payments */}
      {activeTab === 'payments' && (<>
        <div className="module-toolbar"><h3>Vendor Payments ({payments.length})</h3><button className="btn-primary" onClick={openAdd}>+ Record Payment</button></div>
        {error && <ErrorBanner message={error} onRetry={load} />}
        <DataTable loading={loading} emptyText="No vendor payments yet."
          columns={[
            {key:'paymentNumber',label:'Payment #'},{key:'vendor',label:'Vendor',render:(v,r)=>r.vendor?.vendorName||'—'},
            {key:'paymentDate',label:'Date',render:v=>formatDate(v)},
            {key:'amount',label:'Amount',render:v=>formatCurrency(v)},
            {key:'paymentMethod',label:'Method'},{key:'status',label:'Status',render:v=><StatusBadge status={v}/>}
          ]}
          data={payments}
        />
      </>)}

      {/* Vendor Modal */}
      {showModal && activeTab==='vendors' && (
        <Modal title={editItem?'Edit Vendor':'Add Vendor'} onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveVendor}>Save</button></>}>
          {formError && <ErrorBanner message={formError}/>}
          <form onSubmit={saveVendor}>
            <div className="form-row">
              <FormField label="Vendor Code *"><input className="form-input" value={formData.vendorCode||''} onChange={e=>setFormData(f=>({...f,vendorCode:e.target.value}))} required /></FormField>
              <FormField label="Vendor Name *"><input className="form-input" value={formData.vendorName||''} onChange={e=>setFormData(f=>({...f,vendorName:e.target.value}))} required /></FormField>
            </div>
            <div className="form-row">
              <FormField label="Email"><input className="form-input" type="email" value={formData.email||''} onChange={e=>setFormData(f=>({...f,email:e.target.value}))} /></FormField>
              <FormField label="Phone"><input className="form-input" value={formData.phone||''} onChange={e=>setFormData(f=>({...f,phone:e.target.value}))} /></FormField>
            </div>
            <div className="form-row">
              <FormField label="Payment Terms">
                <select className="form-select" value={formData.paymentTerms||'net-30'} onChange={e=>setFormData(f=>({...f,paymentTerms:e.target.value}))}>
                  {PAYMENT_TERMS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Tax ID"><input className="form-input" value={formData.taxId||''} onChange={e=>setFormData(f=>({...f,taxId:e.target.value}))} /></FormField>
            </div>
            <FormField label="Address"><input className="form-input" value={formData.address||''} onChange={e=>setFormData(f=>({...f,address:e.target.value}))} /></FormField>
          </form>
        </Modal>
      )}

      {/* Bill Modal */}
      {showModal && activeTab==='bills' && (
        <Modal title="New Bill" onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveBill}>Create Bill</button></>}>
          {formError && <ErrorBanner message={formError}/>}
          <div className="form-row">
            <FormField label="Vendor *">
              <select className="form-select" value={billForm.vendor} onChange={e=>setBillForm(f=>({...f,vendor:e.target.value}))} required>
                <option value="">Select vendor...</option>
                {vendors.map(v=><option key={v._id} value={v._id}>{v.vendorName}</option>)}
              </select>
            </FormField>
            <FormField label="Bill Date *"><input className="form-input" type="date" value={billForm.billDate} onChange={e=>setBillForm(f=>({...f,billDate:e.target.value}))} required /></FormField>
          </div>
          <FormField label="Notes"><input className="form-input" value={billForm.notes||''} onChange={e=>setBillForm(f=>({...f,notes:e.target.value}))} /></FormField>
          <table className="line-items-table">
            <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Tax %</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {billForm.lineItems.map((l,idx)=>{
                const amt=(parseFloat(l.quantity)||0)*(parseFloat(l.unitPrice)||0);
                return (<tr key={idx}>
                  <td><input className="form-input" style={{fontSize:13}} value={l.description} onChange={e=>updateBillLine(idx,'description',e.target.value)}/></td>
                  <td><input className="form-input" style={{fontSize:13,width:60}} type="number" min="1" value={l.quantity} onChange={e=>updateBillLine(idx,'quantity',e.target.value)}/></td>
                  <td><input className="form-input" style={{fontSize:13,width:90}} type="number" min="0" step="0.01" value={l.unitPrice} onChange={e=>updateBillLine(idx,'unitPrice',e.target.value)}/></td>
                  <td><input className="form-input" style={{fontSize:13,width:60}} type="number" min="0" max="100" value={l.taxRate} onChange={e=>updateBillLine(idx,'taxRate',e.target.value)}/></td>
                  <td style={{fontWeight:600}}>{formatCurrency(amt)}</td>
                  <td><button className="btn-danger btn-sm" onClick={()=>removeBillLine(idx)} disabled={billForm.lineItems.length===1}>×</button></td>
                </tr>);
              })}
            </tbody>
          </table>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
            <button className="btn-secondary btn-sm" onClick={addBillLine}>+ Add Line</button>
            <div className="line-items-totals">Subtotal: {formatCurrency(billSubtotal)} | Tax: {formatCurrency(billTax)} | <strong>Total: {formatCurrency(billSubtotal+billTax)}</strong></div>
          </div>
        </Modal>
      )}

      {/* PO Modal */}
      {showModal && activeTab==='po' && (
        <Modal title="New Purchase Order" onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={savePO}>Create PO</button></>}>
          {formError && <ErrorBanner message={formError}/>}
          <div className="form-row">
            <FormField label="Vendor *">
              <select className="form-select" value={poForm.vendor} onChange={e=>setPoForm(f=>({...f,vendor:e.target.value}))} required>
                <option value="">Select vendor...</option>
                {vendors.map(v=><option key={v._id} value={v._id}>{v.vendorName}</option>)}
              </select>
            </FormField>
            <FormField label="Order Date *"><input className="form-input" type="date" value={poForm.orderDate} onChange={e=>setPoForm(f=>({...f,orderDate:e.target.value}))} required /></FormField>
          </div>
          <FormField label="Expected Delivery"><input className="form-input" type="date" value={poForm.expectedDeliveryDate||''} onChange={e=>setPoForm(f=>({...f,expectedDeliveryDate:e.target.value}))} /></FormField>
          <table className="line-items-table">
            <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {poForm.lineItems.map((l,idx)=>{
                const amt=(parseFloat(l.quantity)||0)*(parseFloat(l.unitPrice)||0);
                return (<tr key={idx}>
                  <td><input className="form-input" style={{fontSize:13}} value={l.description} onChange={e=>updatePoLine(idx,'description',e.target.value)}/></td>
                  <td><input className="form-input" style={{fontSize:13,width:60}} type="number" min="1" value={l.quantity} onChange={e=>updatePoLine(idx,'quantity',e.target.value)}/></td>
                  <td><input className="form-input" style={{fontSize:13,width:90}} type="number" min="0" step="0.01" value={l.unitPrice} onChange={e=>updatePoLine(idx,'unitPrice',e.target.value)}/></td>
                  <td style={{fontWeight:600}}>{formatCurrency(amt)}</td>
                  <td><button className="btn-danger btn-sm" onClick={()=>removePoLine(idx)} disabled={poForm.lineItems.length===1}>×</button></td>
                </tr>);
              })}
            </tbody>
          </table>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
            <button className="btn-secondary btn-sm" onClick={addPoLine}>+ Add Line</button>
            <div className="line-items-totals"><strong>Total: {formatCurrency(poTotal)}</strong></div>
          </div>
        </Modal>
      )}

      {/* Vendor Payment Modal */}
      {showModal && activeTab==='payments' && (
        <Modal title="Record Vendor Payment" onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={savePayment}>Record</button></>}>
          {formError && <ErrorBanner message={formError}/>}
          <div className="form-row">
            <FormField label="Bill *">
              <select className="form-select" value={paymentForm.bill} onChange={e=>{const b=bills.find(x=>x._id===e.target.value);setPaymentForm(f=>({...f,bill:e.target.value,vendor:b?.vendor?._id||b?.vendor||'',amount:b?.amountDue||0}));}} required>
                <option value="">Select bill...</option>
                {bills.filter(b=>['pending','partially-paid','overdue'].includes(b.status)).map(b=><option key={b._id} value={b._id}>{b.billNumber} — {formatCurrency(b.amountDue)} due</option>)}
              </select>
            </FormField>
            <FormField label="Payment Date *"><input className="form-input" type="date" value={paymentForm.paymentDate} onChange={e=>setPaymentForm(f=>({...f,paymentDate:e.target.value}))} required /></FormField>
          </div>
          <div className="form-row">
            <FormField label="Amount (£) *"><input className="form-input" type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={e=>setPaymentForm(f=>({...f,amount:e.target.value}))} required /></FormField>
            <FormField label="Method">
              <select className="form-select" value={paymentForm.paymentMethod} onChange={e=>setPaymentForm(f=>({...f,paymentMethod:e.target.value}))}>
                {PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Reference"><input className="form-input" value={paymentForm.reference||''} onChange={e=>setPaymentForm(f=>({...f,reference:e.target.value}))} /></FormField>
        </Modal>
      )}

      {confirmTarget && <ConfirmDialog message={`Delete vendor "${confirmTarget.vendorName}"?`} onConfirm={deleteVendor} onCancel={()=>setConfirmTarget(null)}/>}
    </div>
  );
}
