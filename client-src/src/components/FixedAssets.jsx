// LedgerPro Fixed Assets Module
import { useState, useEffect } from 'react';
import API from '../api';
import { Tabs, StatusBadge, ErrorBanner, LoadingSpinner, DataTable, Modal, ConfirmDialog, FormField, formatCurrency, formatDate } from './ui';

const TABS = [
  { id: 'register',     label: 'Asset Register'        },
  { id: 'depreciation', label: 'Depreciation'          },
  { id: 'disposals',    label: 'Disposals'             }
];

const CATEGORIES = ['building','land','machinery','equipment','vehicles','furniture','computers','other'];
const DEPRECIATION_METHODS = ['straight-line','declining-balance','double-declining-balance','units-of-production'];

const emptyAsset = () => ({
  assetCode:'', assetName:'', description:'', category:'equipment',
  acquisitionDate: new Date().toISOString().split('T')[0],
  acquisitionCost:0, residualValue:0, usefulLife:{value:5,unit:'years'},
  depreciationMethod:'straight-line', location:'', serialNumber:'', currency:'GBP'
});

export default function FixedAssetsModule({ navigate }) {
  const [activeTab, setActiveTab] = useState('register');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyAsset());
  const [disposeForm, setDisposeForm] = useState({ disposalDate: new Date().toISOString().split('T')[0], disposalAmount:0, notes:'' });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [depSchedule, setDepSchedule] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [formError, setFormError] = useState(null);

  const loadAssets = async () => {
    setLoading(true); setError(null);
    try { const r = await API.fixedAssets.getAll(); setAssets(r.data||[]); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAssets(); }, []);

  const closeModal = () => { setShowModal(false); setEditItem(null); setFormError(null); };

  const saveAsset = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      const payload = { ...formData, acquisitionCost: parseFloat(formData.acquisitionCost)||0, residualValue: parseFloat(formData.residualValue)||0, usefulLife: { value: parseInt(formData.usefulLife?.value)||5, unit: formData.usefulLife?.unit||'years' } };
      if (editItem) await API.fixedAssets.update(editItem._id, payload);
      else await API.fixedAssets.create(payload);
      closeModal(); loadAssets();
    } catch (err) { setFormError(err.message); }
  };

  const deleteAsset = async () => {
    try { await API.fixedAssets.delete(confirmTarget._id); setConfirmTarget(null); loadAssets(); }
    catch (err) { setError(err.message); setConfirmTarget(null); }
  };

  const loadDepreciation = async (asset) => {
    setSelectedAsset(asset); setDepSchedule(null); setLoading(true);
    try { const r = await API.fixedAssets.calculateDepreciation(asset._id); setDepSchedule(r.data||r); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const disposeAsset = async (e) => {
    e.preventDefault(); setFormError(null);
    try {
      await API.fixedAssets.dispose(selectedAsset._id, { ...disposeForm, disposalAmount: parseFloat(disposeForm.disposalAmount)||0 });
      setShowDisposeModal(false); setSelectedAsset(null); loadAssets();
    } catch (err) { setFormError(err.message); }
  };

  const activeAssets = assets.filter(a => a.status === 'active');

  return (
    <div className="module-container">
      <h2>Fixed Assets</h2>
      <p className="subtitle">Asset lifecycle, depreciation, and disposal management</p>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Asset Register */}
      {activeTab === 'register' && (<>
        <div className="module-toolbar">
          <h3>Asset Register ({assets.length})</h3>
          <button className="btn-primary" onClick={() => { setFormData(emptyAsset()); setEditItem(null); setFormError(null); setShowModal(true); }}>+ Add Asset</button>
        </div>
        {error && <ErrorBanner message={error} onRetry={loadAssets} />}
        <DataTable loading={loading} emptyText="No assets registered yet."
          columns={[
            {key:'assetCode',label:'Code'},{key:'assetName',label:'Name'},{key:'category',label:'Category'},
            {key:'acquisitionDate',label:'Acquired',render:v=>formatDate(v)},
            {key:'acquisitionCost',label:'Cost',render:v=>formatCurrency(v)},
            {key:'accumulatedDepreciation',label:'Acc. Dep.',render:v=>formatCurrency(v)},
            {key:'netBookValue',label:'Net Book Value',render:v=>formatCurrency(v)},
            {key:'status',label:'Status',render:v=><StatusBadge status={v}/>}
          ]}
          data={assets}
          actions={row=>(<>
            <button className="btn-secondary btn-sm" onClick={()=>{setEditItem(row);setFormData({...row,usefulLife:row.usefulLife||{value:5,unit:'years'}});setFormError(null);setShowModal(true);}}>Edit</button>
            <button className="btn-danger btn-sm" onClick={()=>setConfirmTarget(row)}>Delete</button>
          </>)}
        />
      </>)}

      {/* Depreciation */}
      {activeTab === 'depreciation' && (<>
        <div className="module-toolbar"><h3>Depreciation Schedule</h3></div>
        {error && <ErrorBanner message={error} />}
        <FormField label="Select Asset">
          <select className="form-select" style={{maxWidth:400}} value={selectedAsset?._id||''} onChange={e=>{const a=assets.find(x=>x._id===e.target.value);if(a)loadDepreciation(a);}}>
            <option value="">Choose an asset...</option>
            {assets.map(a=><option key={a._id} value={a._id}>{a.assetCode} — {a.assetName}</option>)}
          </select>
        </FormField>
        {loading && <LoadingSpinner text="Calculating depreciation..." />}
        {!loading && selectedAsset && depSchedule && (
          <div className="data-table-container" style={{marginTop:16}}>
            <table className="data-table">
              <thead><tr><th>Year</th><th>Opening NBV</th><th>Depreciation</th><th>Closing NBV</th><th>Acc. Depreciation</th></tr></thead>
              <tbody>
                {(depSchedule.schedule||[]).map((row,i)=>(
                  <tr key={i}>
                    <td>{row.year||i+1}</td>
                    <td>{formatCurrency(row.openingNBV||row.openingBookValue)}</td>
                    <td>{formatCurrency(row.depreciation||row.annualDepreciation)}</td>
                    <td>{formatCurrency(row.closingNBV||row.closingBookValue)}</td>
                    <td>{formatCurrency(row.accumulatedDepreciation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>)}

      {/* Disposals */}
      {activeTab === 'disposals' && (<>
        <div className="module-toolbar"><h3>Asset Disposals</h3></div>
        {error && <ErrorBanner message={error} />}
        <DataTable loading={loading} emptyText="No active assets available for disposal."
          columns={[
            {key:'assetCode',label:'Code'},{key:'assetName',label:'Name'},{key:'category',label:'Category'},
            {key:'netBookValue',label:'Net Book Value',render:v=>formatCurrency(v)},
            {key:'status',label:'Status',render:v=><StatusBadge status={v}/>}
          ]}
          data={activeAssets}
          actions={row=>(<button className="btn-danger btn-sm" onClick={()=>{setSelectedAsset(row);setDisposeForm({disposalDate:new Date().toISOString().split('T')[0],disposalAmount:row.netBookValue||0,notes:''});setFormError(null);setShowDisposeModal(true);}}>Dispose</button>)}
        />
      </>)}

      {/* Add/Edit Asset Modal */}
      {showModal && (
        <Modal title={editItem?'Edit Asset':'Add Asset'} onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveAsset}>Save Asset</button></>}>
          {formError && <ErrorBanner message={formError}/>}
          <form onSubmit={saveAsset}>
            <div className="form-row">
              <FormField label="Asset Code *"><input className="form-input" value={formData.assetCode||''} onChange={e=>setFormData(f=>({...f,assetCode:e.target.value}))} required /></FormField>
              <FormField label="Asset Name *"><input className="form-input" value={formData.assetName||''} onChange={e=>setFormData(f=>({...f,assetName:e.target.value}))} required /></FormField>
            </div>
            <div className="form-row">
              <FormField label="Category">
                <select className="form-select" value={formData.category||'equipment'} onChange={e=>setFormData(f=>({...f,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Acquisition Date *"><input className="form-input" type="date" value={formData.acquisitionDate||''} onChange={e=>setFormData(f=>({...f,acquisitionDate:e.target.value}))} required /></FormField>
            </div>
            <div className="form-row">
              <FormField label="Acquisition Cost (£) *"><input className="form-input" type="number" min="0" step="0.01" value={formData.acquisitionCost||0} onChange={e=>setFormData(f=>({...f,acquisitionCost:e.target.value}))} required /></FormField>
              <FormField label="Residual Value (£)"><input className="form-input" type="number" min="0" step="0.01" value={formData.residualValue||0} onChange={e=>setFormData(f=>({...f,residualValue:e.target.value}))} /></FormField>
            </div>
            <div className="form-row">
              <FormField label="Useful Life (years) *"><input className="form-input" type="number" min="1" value={formData.usefulLife?.value||5} onChange={e=>setFormData(f=>({...f,usefulLife:{...f.usefulLife,value:e.target.value}}))} required /></FormField>
              <FormField label="Depreciation Method">
                <select className="form-select" value={formData.depreciationMethod||'straight-line'} onChange={e=>setFormData(f=>({...f,depreciationMethod:e.target.value}))}>
                  {DEPRECIATION_METHODS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="Location"><input className="form-input" value={formData.location||''} onChange={e=>setFormData(f=>({...f,location:e.target.value}))} /></FormField>
              <FormField label="Serial Number"><input className="form-input" value={formData.serialNumber||''} onChange={e=>setFormData(f=>({...f,serialNumber:e.target.value}))} /></FormField>
            </div>
            <FormField label="Description"><input className="form-input" value={formData.description||''} onChange={e=>setFormData(f=>({...f,description:e.target.value}))} /></FormField>
          </form>
        </Modal>
      )}

      {/* Disposal Modal */}
      {showDisposeModal && selectedAsset && (
        <Modal title={`Dispose: ${selectedAsset.assetName}`} onClose={()=>setShowDisposeModal(false)} footer={<><button className="btn-secondary" onClick={()=>setShowDisposeModal(false)}>Cancel</button><button className="btn-danger" onClick={disposeAsset}>Confirm Disposal</button></>}>
          {formError && <ErrorBanner message={formError}/>}
          <p style={{color:'#555',marginBottom:16}}>Net Book Value: <strong>{formatCurrency(selectedAsset.netBookValue)}</strong></p>
          <div className="form-row">
            <FormField label="Disposal Date *"><input className="form-input" type="date" value={disposeForm.disposalDate} onChange={e=>setDisposeForm(f=>({...f,disposalDate:e.target.value}))} required /></FormField>
            <FormField label="Disposal Amount (£)"><input className="form-input" type="number" min="0" step="0.01" value={disposeForm.disposalAmount} onChange={e=>setDisposeForm(f=>({...f,disposalAmount:e.target.value}))} /></FormField>
          </div>
          <FormField label="Notes"><textarea className="form-textarea" rows={3} value={disposeForm.notes||''} onChange={e=>setDisposeForm(f=>({...f,notes:e.target.value}))} /></FormField>
        </Modal>
      )}

      {confirmTarget && <ConfirmDialog message={`Delete asset "${confirmTarget.assetName}"?`} onConfirm={deleteAsset} onCancel={()=>setConfirmTarget(null)}/>}
    </div>
  );
}
