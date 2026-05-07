// LedgerPro Expense Management Module
import { useState, useEffect, useRef } from 'react';
import API from '../api';
import { Tabs, StatusBadge, ErrorBanner, DataTable, Modal, FormField, formatCurrency, formatDate } from './ui';

const TABS = [
  { id: 'categories', label: 'Categories'     },
  { id: 'claims',     label: 'Expense Claims' }
];

const emptyCategory = () => ({ categoryCode:'', categoryName:'', description:'', glAccountCode:'', requiresReceipt:true, maxAmount:'', isActive:true });
const emptyItem = () => ({ category:'', date: new Date().toISOString().split('T')[0], description:'', amount:0, currency:'GBP', hasReceipt:false });
const emptyClaim = () => ({ description:'', claimDate: new Date().toISOString().split('T')[0], items:[emptyItem()] });

export default function ExpensesModule({ navigate }) {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyCategory());
  const [claimForm, setClaimForm] = useState(emptyClaim());
  const [formError, setFormError] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null); // { claim, itemIndex }
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileInputRef = useRef(null);

  const loadCats   = async () => { const r = await API.expenses.getCategories(); setCategories(r.data||[]); };
  const loadClaims = async () => { const r = await API.expenses.getClaims();     setClaims(r.data||[]); };

  const load = async () => {
    setLoading(true); setError(null);
    try { await loadCats(); if (activeTab === 'claims') await loadClaims(); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeTab]);

  const closeModal = () => { setShowModal(false); setEditItem(null); setFormError(null); };
  const openAdd = () => { setEditItem(null); setFormError(null); if (activeTab==='categories') setFormData(emptyCategory()); else setClaimForm(emptyClaim()); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setFormData({...item}); setFormError(null); setShowModal(true); };

  const saveCategory = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      const payload = { ...formData, maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : undefined };
      if (editItem) await API.expenses.updateCategory(editItem._id, payload);
      else await API.expenses.createCategory(payload);
      closeModal(); load();
    } catch (err) { setFormError(err.message); }
  };

  // Claim line items
  const updateItem = (idx, field, val) => { const items=[...claimForm.items]; items[idx]={...items[idx],[field]:val}; setClaimForm(f=>({...f,items})); };
  const addItem = () => setClaimForm(f=>({...f,items:[...f.items,emptyItem()]}));
  const removeItem = (idx) => setClaimForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}));
  const claimTotal = claimForm.items.reduce((s,i)=>s+(parseFloat(i.amount)||0),0);

  const saveClaim = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      await API.expenses.createClaim({ ...claimForm, items: claimForm.items.map(i=>({...i,amount:parseFloat(i.amount)||0})) });
      closeModal(); load();
    } catch (err) { setFormError(err.message); }
  };

  const handleReceiptUpload = async (file) => {
    if (!file || !receiptModal) return;
    setUploadingReceipt(true); setError(null);
    try {
      const res = await API.expenses.uploadReceipt(receiptModal.claim._id, receiptModal.itemIndex, file);
      if (!res.success) throw new Error(res.message || 'Upload failed');
      setReceiptModal(null);
      load();
    } catch (err) { setError(err.message); }
    finally { setUploadingReceipt(false); }
  };

  const workflowAction = async (action, claim) => {
    setError(null);
    try {
      if (action === 'submit') await API.expenses.submitClaim(claim._id);
      else if (action === 'approve') await API.expenses.approveClaim(claim._id);
      else if (action === 'reject') await API.expenses.rejectClaim(claim._id, { reviewNotes: 'Rejected' });
      else if (action === 'reimburse') await API.expenses.markReimbursed(claim._id);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="module-container">
      <h2>Expense Management</h2>
      <p className="subtitle">Employee expense claims, categories, and approval workflow</p>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Categories */}
      {activeTab === 'categories' && (<>
        <div className="module-toolbar"><h3>Expense Categories ({categories.length})</h3><button className="btn-primary" onClick={openAdd}>+ Add Category</button></div>
        {error && <ErrorBanner message={error} onRetry={load} />}
        <DataTable loading={loading} emptyText="No expense categories yet."
          columns={[
            {key:'categoryCode',label:'Code'},{key:'categoryName',label:'Name'},
            {key:'glAccountCode',label:'GL Account'},{key:'requiresReceipt',label:'Receipt Required',render:v=>v?'Yes':'No'},
            {key:'maxAmount',label:'Max Amount',render:v=>v?formatCurrency(v):'No limit'},
            {key:'isActive',label:'Status',render:v=><StatusBadge status={v?'active':'inactive'}/>}
          ]}
          data={categories}
          actions={row=>(<button className="btn-secondary btn-sm" onClick={()=>openEdit(row)}>Edit</button>)}
        />
      </>)}

      {/* Claims */}
      {activeTab === 'claims' && (<>
        <div className="module-toolbar"><h3>Expense Claims ({claims.length})</h3><button className="btn-primary" onClick={openAdd}>+ New Claim</button></div>
        {error && <ErrorBanner message={error} onRetry={load} />}
        <DataTable loading={loading} emptyText="No expense claims yet."
          columns={[
            {key:'claimNumber',label:'Claim #'},
            {key:'claimDate',label:'Date',render:v=>formatDate(v)},
            {key:'submittedBy',label:'Submitted By',render:(v,r)=>r.submittedBy?.username||r.submittedBy?.email||'—'},
            {key:'description',label:'Description'},
            {key:'totalAmount',label:'Total',render:v=>formatCurrency(v)},
            {key:'status',label:'Status',render:v=><StatusBadge status={v}/>}
          ]}
          data={claims}
          actions={row=>(
            <div className="table-actions">
              {row.status==='draft' && <button className="btn-secondary btn-sm" onClick={()=>workflowAction('submit',row)}>Submit</button>}
              {row.status==='submitted' && <button className="btn-secondary btn-sm" onClick={()=>workflowAction('approve',row)}>Approve</button>}
              {row.status==='submitted' && <button className="btn-danger btn-sm" onClick={()=>workflowAction('reject',row)}>Reject</button>}
              {row.status==='approved' && <button className="btn-primary btn-sm" onClick={()=>workflowAction('reimburse',row)}>Reimburse</button>}
              {(row.items||[]).length > 0 && (
                <button className="btn-sm" style={{background:'#8e44ad',color:'white',border:'none',borderRadius:4,padding:'3px 8px',cursor:'pointer',fontSize:12}}
                  onClick={()=>setReceiptModal({ claim: row, itemIndex: 0 })}>Receipts</button>
              )}
            </div>
          )}
        />
      </>)}

      {/* Category Modal */}
      {showModal && activeTab==='categories' && (
        <Modal title={editItem?'Edit Category':'Add Category'} onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveCategory}>Save</button></>}>
          {formError && <ErrorBanner message={formError}/>}
          <form onSubmit={saveCategory}>
            <div className="form-row">
              <FormField label="Category Code *"><input className="form-input" value={formData.categoryCode||''} onChange={e=>setFormData(f=>({...f,categoryCode:e.target.value}))} required /></FormField>
              <FormField label="Category Name *"><input className="form-input" value={formData.categoryName||''} onChange={e=>setFormData(f=>({...f,categoryName:e.target.value}))} required /></FormField>
            </div>
            <div className="form-row">
              <FormField label="GL Account Code"><input className="form-input" value={formData.glAccountCode||''} onChange={e=>setFormData(f=>({...f,glAccountCode:e.target.value}))} /></FormField>
              <FormField label="Max Amount (£)"><input className="form-input" type="number" min="0" step="0.01" value={formData.maxAmount||''} placeholder="No limit" onChange={e=>setFormData(f=>({...f,maxAmount:e.target.value}))} /></FormField>
            </div>
            <div className="form-row">
              <FormField label="Requires Receipt">
                <select className="form-select" value={formData.requiresReceipt?'yes':'no'} onChange={e=>setFormData(f=>({...f,requiresReceipt:e.target.value==='yes'}))}>
                  <option value="yes">Yes</option><option value="no">No</option>
                </select>
              </FormField>
            </div>
            <FormField label="Description"><input className="form-input" value={formData.description||''} onChange={e=>setFormData(f=>({...f,description:e.target.value}))} /></FormField>
          </form>
        </Modal>
      )}

      {/* Receipt Modal */}
      {receiptModal && (
        <Modal title="Expense Receipts" onClose={()=>setReceiptModal(null)} footer={<button className="btn-secondary" onClick={()=>setReceiptModal(null)}>Close</button>}>
          <div>
            {(receiptModal.claim.items||[]).map((item, idx) => (
              <div key={idx} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f0f0f0'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{item.description || `Item ${idx+1}`}</div>
                  <div style={{fontSize:12,color:'#888'}}>{formatCurrency(item.amount)} — {item.date ? formatDate(item.date) : ''}</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {item.hasReceipt
                    ? <button className="btn-sm" style={{background:'#27ae60',color:'white',border:'none',borderRadius:4,padding:'3px 10px',cursor:'pointer',fontSize:12}}
                        onClick={()=>API.expenses.downloadReceipt(receiptModal.claim._id, idx)}>Download</button>
                    : <span style={{fontSize:12,color:'#aaa'}}>No receipt</span>
                  }
                  <label style={{background:'#3498db',color:'white',borderRadius:4,padding:'3px 10px',fontSize:12,cursor:'pointer'}}>
                    {uploadingReceipt ? 'Uploading…' : 'Upload'}
                    <input type="file" accept="image/*,application/pdf" style={{display:'none'}} disabled={uploadingReceipt}
                      onChange={e => { if (e.target.files[0]) { setReceiptModal(m=>({...m,itemIndex:idx})); handleReceiptUpload(e.target.files[0]); } }} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Claim Modal */}
      {showModal && activeTab==='claims' && (
        <Modal title="New Expense Claim" onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveClaim}>Submit Claim</button></>}>
          {formError && <ErrorBanner message={formError}/>}
          <div className="form-row">
            <FormField label="Description *"><input className="form-input" value={claimForm.description||''} onChange={e=>setClaimForm(f=>({...f,description:e.target.value}))} required /></FormField>
            <FormField label="Claim Date *"><input className="form-input" type="date" value={claimForm.claimDate||''} onChange={e=>setClaimForm(f=>({...f,claimDate:e.target.value}))} required /></FormField>
          </div>
          <div style={{marginBottom:8,fontWeight:600,fontSize:13,color:'#555'}}>Expense Items</div>
          <table className="line-items-table">
            <thead><tr><th>Category</th><th>Date</th><th>Description</th><th>Amount (£)</th><th>Receipt</th><th></th></tr></thead>
            <tbody>
              {claimForm.items.map((item,idx)=>(
                <tr key={idx}>
                  <td>
                    <select style={{width:'100%',fontSize:13,padding:'4px 6px',border:'1px solid #ddd',borderRadius:4}} value={item.category||''} onChange={e=>updateItem(idx,'category',e.target.value)}>
                      <option value="">Select...</option>
                      {categories.map(c=><option key={c._id} value={c._id}>{c.categoryName}</option>)}
                    </select>
                  </td>
                  <td><input type="date" style={{fontSize:13,border:'1px solid #ddd',padding:'4px',borderRadius:4}} value={item.date||''} onChange={e=>updateItem(idx,'date',e.target.value)}/></td>
                  <td><input className="form-input" style={{fontSize:13}} value={item.description||''} onChange={e=>updateItem(idx,'description',e.target.value)}/></td>
                  <td><input className="form-input" style={{fontSize:13,width:80}} type="number" min="0" step="0.01" value={item.amount||0} onChange={e=>updateItem(idx,'amount',e.target.value)}/></td>
                  <td style={{textAlign:'center'}}><input type="checkbox" checked={!!item.hasReceipt} onChange={e=>updateItem(idx,'hasReceipt',e.target.checked)}/></td>
                  <td><button className="btn-danger btn-sm" onClick={()=>removeItem(idx)} disabled={claimForm.items.length===1}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
            <button className="btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
            <div className="line-items-totals"><strong>Total: {formatCurrency(claimTotal)}</strong></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
