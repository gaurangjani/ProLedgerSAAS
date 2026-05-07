// LedgerPro Tax Management Module
import { useState, useEffect } from 'react';
import API from '../api';
import { Tabs, StatusBadge, ErrorBanner, DataTable, Modal, FormField, formatCurrency, formatDate } from './ui';

const TABS = [
  { id: 'configs',       label: 'Tax Configurations' },
  { id: 'returns',       label: 'Tax Returns'        },
  { id: 'transactions',  label: 'Transactions'       }
];

const TAX_TYPES = ['vat','sales-tax','income-tax','corporate-tax','withholding-tax','other'];

const emptyConfig = () => ({ taxCode:'', taxName:'', taxType:'vat', rate:20, jurisdiction:'UK', effectiveFrom: new Date().toISOString().split('T')[0], description:'', isActive:true });
const emptyReturn = () => ({ taxType:'vat', taxPeriod:{ startDate:'', endDate:'' }, filingDueDate:'', totalSales:0, totalPurchases:0, outputTax:0, inputTax:0, notes:'' });

export default function TaxModule({ navigate }) {
  const [activeTab, setActiveTab] = useState('configs');
  const [configs, setConfigs] = useState([]);
  const [returns, setReturns] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyConfig());
  const [returnForm, setReturnForm] = useState(emptyReturn());
  const [formError, setFormError] = useState(null);

  const loaders = {
    configs:      async () => { const r = await API.tax.getConfigs();       setConfigs(r.data||[]); },
    returns:      async () => { const r = await API.tax.getReturns();       setReturns(r.data||[]); },
    transactions: async () => { const r = await API.tax.getTransactions();  setTransactions(r.data||[]); }
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
    if (activeTab === 'configs')  setFormData(emptyConfig());
    else if (activeTab === 'returns') setReturnForm(emptyReturn());
    setShowModal(true);
  };
  const openEdit = (item) => { setEditItem(item); setFormData({...item}); setFormError(null); setShowModal(true); };

  const saveConfig = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      const payload = { ...formData, rate: parseFloat(formData.rate)||0 };
      if (editItem) await API.tax.updateConfig(editItem._id, payload);
      else await API.tax.createConfig(payload);
      closeModal(); load();
    } catch (err) { setFormError(err.message); }
  };

  const saveReturn = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      const payload = { ...returnForm, totalSales:parseFloat(returnForm.totalSales)||0, totalPurchases:parseFloat(returnForm.totalPurchases)||0, outputTax:parseFloat(returnForm.outputTax)||0, inputTax:parseFloat(returnForm.inputTax)||0 };
      await API.tax.createReturn(payload);
      closeModal(); load();
    } catch (err) { setFormError(err.message); }
  };

  const fileReturn = async (ret) => {
    try { await API.tax.updateReturn(ret._id, { status: 'filed', filedDate: new Date() }); load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="module-container">
      <h2>Tax Management</h2>
      <p className="subtitle">Tax configuration, returns, and transaction recording</p>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Configs */}
      {activeTab === 'configs' && (<>
        <div className="module-toolbar"><h3>Tax Configurations ({configs.length})</h3><button className="btn-primary" onClick={openAdd}>+ Add Config</button></div>
        {error && <ErrorBanner message={error} onRetry={load} />}
        <DataTable loading={loading} emptyText="No tax configurations yet."
          columns={[
            {key:'taxCode',label:'Code'},{key:'taxName',label:'Name'},
            {key:'taxType',label:'Type',render:v=><StatusBadge status={v}/>},
            {key:'rate',label:'Rate',render:v=>`${v}%`},
            {key:'jurisdiction',label:'Jurisdiction'},
            {key:'effectiveFrom',label:'Effective From',render:v=>formatDate(v)},
            {key:'isActive',label:'Status',render:v=><StatusBadge status={v?'active':'inactive'}/>}
          ]}
          data={configs}
          actions={row=>(<button className="btn-secondary btn-sm" onClick={()=>openEdit(row)}>Edit</button>)}
        />
      </>)}

      {/* Returns */}
      {activeTab === 'returns' && (<>
        <div className="module-toolbar"><h3>Tax Returns ({returns.length})</h3><button className="btn-primary" onClick={openAdd}>+ New Return</button></div>
        {error && <ErrorBanner message={error} onRetry={load} />}
        <DataTable loading={loading} emptyText="No tax returns yet."
          columns={[
            {key:'returnNumber',label:'Return #'},
            {key:'taxType',label:'Type',render:v=><StatusBadge status={v}/>},
            {key:'taxPeriod',label:'Period',render:(v)=>v?`${formatDate(v.startDate)} – ${formatDate(v.endDate)}`:'—'},
            {key:'filingDueDate',label:'Due',render:v=>formatDate(v)},
            {key:'outputTax',label:'Output Tax',render:v=>formatCurrency(v)},
            {key:'inputTax',label:'Input Tax',render:v=>formatCurrency(v)},
            {key:'status',label:'Status',render:v=><StatusBadge status={v}/>}
          ]}
          data={returns}
          actions={row=>row.status==='draft'?(<button className="btn-secondary btn-sm" onClick={()=>fileReturn(row)}>File</button>):null}
        />
      </>)}

      {/* Transactions */}
      {activeTab === 'transactions' && (<>
        <div className="module-toolbar"><h3>Tax Transactions ({transactions.length})</h3><button className="btn-secondary" onClick={load}>Refresh</button></div>
        {error && <ErrorBanner message={error} onRetry={load} />}
        <DataTable loading={loading} emptyText="No tax transactions recorded yet."
          columns={[
            {key:'transactionNumber',label:'Ref #'},
            {key:'transactionDate',label:'Date',render:v=>formatDate(v)},
            {key:'taxType',label:'Type'},
            {key:'taxCode',label:'Tax Code'},
            {key:'baseAmount',label:'Base Amount',render:v=>formatCurrency(v)},
            {key:'taxAmount',label:'Tax Amount',render:v=>formatCurrency(v)},
            {key:'transactionType',label:'Direction',render:v=><StatusBadge status={v}/>},
            {key:'status',label:'Status',render:v=><StatusBadge status={v}/>}
          ]}
          data={transactions}
        />
      </>)}

      {/* Config Modal */}
      {showModal && activeTab==='configs' && (
        <Modal title={editItem?'Edit Tax Config':'New Tax Config'} onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveConfig}>Save</button></>}>
          {formError && <ErrorBanner message={formError}/>}
          <form onSubmit={saveConfig}>
            <div className="form-row">
              <FormField label="Tax Code *"><input className="form-input" value={formData.taxCode||''} onChange={e=>setFormData(f=>({...f,taxCode:e.target.value}))} required /></FormField>
              <FormField label="Tax Name *"><input className="form-input" value={formData.taxName||''} onChange={e=>setFormData(f=>({...f,taxName:e.target.value}))} required /></FormField>
            </div>
            <div className="form-row">
              <FormField label="Tax Type">
                <select className="form-select" value={formData.taxType||'vat'} onChange={e=>setFormData(f=>({...f,taxType:e.target.value}))}>
                  {TAX_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Rate (%)"><input className="form-input" type="number" min="0" max="100" step="0.01" value={formData.rate||0} onChange={e=>setFormData(f=>({...f,rate:e.target.value}))} required /></FormField>
            </div>
            <div className="form-row">
              <FormField label="Jurisdiction"><input className="form-input" value={formData.jurisdiction||'UK'} onChange={e=>setFormData(f=>({...f,jurisdiction:e.target.value}))} /></FormField>
              <FormField label="Effective From *"><input className="form-input" type="date" value={formData.effectiveFrom||''} onChange={e=>setFormData(f=>({...f,effectiveFrom:e.target.value}))} required /></FormField>
            </div>
            <FormField label="Description"><input className="form-input" value={formData.description||''} onChange={e=>setFormData(f=>({...f,description:e.target.value}))} /></FormField>
          </form>
        </Modal>
      )}

      {/* Return Modal */}
      {showModal && activeTab==='returns' && (
        <Modal title="New Tax Return" onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveReturn}>Create Return</button></>}>
          {formError && <ErrorBanner message={formError}/>}
          <div className="form-row">
            <FormField label="Tax Type">
              <select className="form-select" value={returnForm.taxType||'vat'} onChange={e=>setReturnForm(f=>({...f,taxType:e.target.value}))}>
                {TAX_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Filing Due Date *"><input className="form-input" type="date" value={returnForm.filingDueDate||''} onChange={e=>setReturnForm(f=>({...f,filingDueDate:e.target.value}))} required /></FormField>
          </div>
          <div className="form-row">
            <FormField label="Period Start *"><input className="form-input" type="date" value={returnForm.taxPeriod?.startDate||''} onChange={e=>setReturnForm(f=>({...f,taxPeriod:{...f.taxPeriod,startDate:e.target.value}}))} required /></FormField>
            <FormField label="Period End *"><input className="form-input" type="date" value={returnForm.taxPeriod?.endDate||''} onChange={e=>setReturnForm(f=>({...f,taxPeriod:{...f.taxPeriod,endDate:e.target.value}}))} required /></FormField>
          </div>
          <div className="form-row">
            <FormField label="Total Sales (£)"><input className="form-input" type="number" min="0" step="0.01" value={returnForm.totalSales||0} onChange={e=>setReturnForm(f=>({...f,totalSales:e.target.value}))} /></FormField>
            <FormField label="Total Purchases (£)"><input className="form-input" type="number" min="0" step="0.01" value={returnForm.totalPurchases||0} onChange={e=>setReturnForm(f=>({...f,totalPurchases:e.target.value}))} /></FormField>
          </div>
          <div className="form-row">
            <FormField label="Output Tax (£)"><input className="form-input" type="number" min="0" step="0.01" value={returnForm.outputTax||0} onChange={e=>setReturnForm(f=>({...f,outputTax:e.target.value}))} /></FormField>
            <FormField label="Input Tax (£)"><input className="form-input" type="number" min="0" step="0.01" value={returnForm.inputTax||0} onChange={e=>setReturnForm(f=>({...f,inputTax:e.target.value}))} /></FormField>
          </div>
          <p style={{color:'#555',fontSize:13}}>Tax Payable: <strong>{formatCurrency(Math.max(0,(parseFloat(returnForm.outputTax)||0)-(parseFloat(returnForm.inputTax)||0)))}</strong></p>
          <FormField label="Notes"><textarea className="form-textarea" rows={2} value={returnForm.notes||''} onChange={e=>setReturnForm(f=>({...f,notes:e.target.value}))} /></FormField>
        </Modal>
      )}
    </div>
  );
}
