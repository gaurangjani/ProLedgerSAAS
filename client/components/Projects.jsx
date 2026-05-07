// LedgerPro Project Accounting Module

(function () {
  const { useState, useEffect } = React;

  const TABS = [
    { id: 'projects',     label: 'Projects'      },
    { id: 'costs',        label: 'Project Costs' },
    { id: 'time',         label: 'Time Entries'  },
    { id: 'summary',      label: 'Summary'       }
  ];

  const PROJECT_STATUSES = ['planning','active','on-hold','completed','cancelled'];
  const COST_TYPES = ['materials','subcontractor','equipment','travel','other'];

  const emptyProject = () => ({ projectCode:'', projectName:'', description:'', clientName:'', startDate: new Date().toISOString().split('T')[0], endDate:'', status:'planning', budget:0, currency:'GBP' });
  const emptyCost = () => ({ date: new Date().toISOString().split('T')[0], description:'', costType:'other', amount:0, vendor:'', billRef:'' });
  const emptyTime = () => ({ date: new Date().toISOString().split('T')[0], employeeName:'', hours:1, description:'', billable:true, hourlyRate:0 });

  window.ProjectsModule = function () {
    const [activeTab, setActiveTab] = useState('projects');
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [costs, setCosts] = useState([]);
    const [timeEntries, setTimeEntries] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState(emptyProject());
    const [costForm, setCostForm] = useState(emptyCost());
    const [timeForm, setTimeForm] = useState(emptyTime());
    const [confirmTarget, setConfirmTarget] = useState(null);
    const [authRequired, setAuthRequired] = useState(false);
    const [formError, setFormError] = useState(null);

    const checkAuth = async () => {
      try { await window.API.auth.me(); return true; }
      catch { setAuthRequired(true); return false; }
    };

    const loadProjects = async () => { const r = await window.API.projects.getAll(); setProjects(r.data||[]); };

    const loadProjectData = async (projectId) => {
      if (!projectId) return;
      if (activeTab==='costs') { const r = await window.API.projects.getCosts(projectId); setCosts(r.data||[]); }
      else if (activeTab==='time') { const r = await window.API.projects.getTimeEntries(projectId); setTimeEntries(r.data||[]); }
      else if (activeTab==='summary') { const r = await window.API.projects.getSummary(projectId); setSummary(r.data||r); }
    };

    const load = async () => {
      setLoading(true); setError(null);
      try { await loadProjects(); if (selectedProject && activeTab!=='projects') await loadProjectData(selectedProject._id); }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };

    useEffect(() => { checkAuth().then(ok => ok && load()); }, [activeTab]);
    if (authRequired) return <window.LoginModal onSuccess={() => setAuthRequired(false)} />;

    const onProjectSelect = async (projectId) => {
      const p = projects.find(x=>x._id===projectId);
      setSelectedProject(p||null);
      if (!p) return;
      setLoading(true); setError(null);
      try { await loadProjectData(p._id); }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };

    const closeModal = () => { setShowModal(false); setEditItem(null); setFormError(null); };

    const saveProject = async (e) => {
      e.preventDefault(); setFormError(null);
      try {
        const payload = { ...formData, budget: parseFloat(formData.budget)||0 };
        if (editItem) await window.API.projects.update(editItem._id, payload);
        else await window.API.projects.create(payload);
        closeModal(); load();
      } catch (err) { setFormError(err.message); }
    };

    const deleteProject = async () => {
      try { await window.API.projects.delete(confirmTarget._id); setConfirmTarget(null); if (selectedProject?._id===confirmTarget._id) setSelectedProject(null); load(); }
      catch (err) { setError(err.message); setConfirmTarget(null); }
    };

    const saveCost = async (e) => {
      e.preventDefault(); setFormError(null);
      try { await window.API.projects.addCost(selectedProject._id, {...costForm, amount: parseFloat(costForm.amount)||0}); closeModal(); onProjectSelect(selectedProject._id); }
      catch (err) { setFormError(err.message); }
    };

    const saveTime = async (e) => {
      e.preventDefault(); setFormError(null);
      try { await window.API.projects.addTimeEntry(selectedProject._id, {...timeForm, hours:parseFloat(timeForm.hours)||0, hourlyRate:parseFloat(timeForm.hourlyRate)||0}); closeModal(); onProjectSelect(selectedProject._id); }
      catch (err) { setFormError(err.message); }
    };

    const ProjectSelector = () => (
      <window.FormField label="Select Project">
        <select className="form-select" style={{maxWidth:400}} value={selectedProject?._id||''} onChange={e=>onProjectSelect(e.target.value)}>
          <option value="">Choose a project...</option>
          {projects.map(p=><option key={p._id} value={p._id}>{p.projectCode} — {p.projectName}</option>)}
        </select>
      </window.FormField>
    );

    return (
      <div className="module-container">
        <h2>Project Accounting</h2>
        <p className="subtitle">Project budgets, costs, and time tracking</p>
        <window.Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Projects */}
        {activeTab === 'projects' && (<>
          <div className="module-toolbar"><h3>Projects ({projects.length})</h3><button className="btn-primary" onClick={()=>{setEditItem(null);setFormData(emptyProject());setFormError(null);setShowModal(true);}}>+ New Project</button></div>
          {error && <window.ErrorBanner message={error} onRetry={load} />}
          <window.DataTable loading={loading} emptyText="No projects yet."
            columns={[
              {key:'projectCode',label:'Code'},{key:'projectName',label:'Name'},{key:'clientName',label:'Client'},
              {key:'startDate',label:'Start',render:v=>window.formatDate(v)},
              {key:'budget',label:'Budget',render:v=>window.formatCurrency(v)},
              {key:'totalCost',label:'Actual Cost',render:v=>window.formatCurrency(v)},
              {key:'status',label:'Status',render:v=><window.StatusBadge status={v}/>}
            ]}
            data={projects}
            actions={row=>(<><button className="btn-secondary btn-sm" onClick={()=>{setEditItem(row);setFormData({...row});setFormError(null);setShowModal(true);}}>Edit</button><button className="btn-danger btn-sm" onClick={()=>setConfirmTarget(row)}>Delete</button></>)}
          />
        </>)}

        {/* Project Costs */}
        {activeTab === 'costs' && (<>
          <ProjectSelector />
          {selectedProject && (<>
            <div className="module-toolbar"><h3>Costs for {selectedProject.projectName}</h3><button className="btn-primary" onClick={()=>{setCostForm(emptyCost());setFormError(null);setShowModal(true);}}>+ Add Cost</button></div>
            {error && <window.ErrorBanner message={error} onRetry={()=>onProjectSelect(selectedProject._id)} />}
            <window.DataTable loading={loading} emptyText="No costs recorded for this project."
              columns={[
                {key:'costRef',label:'Ref'},{key:'date',label:'Date',render:v=>window.formatDate(v)},
                {key:'description',label:'Description'},{key:'costType',label:'Type'},
                {key:'amount',label:'Amount',render:v=>window.formatCurrency(v)},{key:'vendor',label:'Vendor'}
              ]}
              data={costs}
            />
          </>)}
        </>)}

        {/* Time Entries */}
        {activeTab === 'time' && (<>
          <ProjectSelector />
          {selectedProject && (<>
            <div className="module-toolbar"><h3>Time Entries for {selectedProject.projectName}</h3><button className="btn-primary" onClick={()=>{setTimeForm(emptyTime());setFormError(null);setShowModal(true);}}>+ Log Time</button></div>
            {error && <window.ErrorBanner message={error} onRetry={()=>onProjectSelect(selectedProject._id)} />}
            <window.DataTable loading={loading} emptyText="No time entries for this project."
              columns={[
                {key:'entryRef',label:'Ref'},{key:'date',label:'Date',render:v=>window.formatDate(v)},
                {key:'employeeName',label:'Employee'},{key:'hours',label:'Hours'},
                {key:'billable',label:'Billable',render:v=>v?'Yes':'No'},
                {key:'hourlyRate',label:'Rate',render:v=>window.formatCurrency(v)},
                {key:'amount',label:'Amount',render:v=>window.formatCurrency(v)}
              ]}
              data={timeEntries}
            />
            {timeEntries.length>0 && (
              <div style={{textAlign:'right',padding:'12px 16px',background:'white',borderTop:'1px solid #ecf0f1'}}>
                Total Hours: <strong>{timeEntries.reduce((s,t)=>s+t.hours,0)}</strong> &nbsp;|&nbsp;
                Billable: <strong>{timeEntries.filter(t=>t.billable).reduce((s,t)=>s+t.hours,0)}</strong> hrs &nbsp;|&nbsp;
                Total: <strong>{window.formatCurrency(timeEntries.reduce((s,t)=>s+t.amount,0))}</strong>
              </div>
            )}
          </>)}
        </>)}

        {/* Summary */}
        {activeTab === 'summary' && (<>
          <ProjectSelector />
          {loading && <window.LoadingSpinner text="Calculating summary..." />}
          {!loading && selectedProject && summary && (
            <div className="project-summary-grid" style={{marginTop:16}}>
              {[
                {label:'Budget',value:window.formatCurrency(summary.budget),color:'#3498db'},
                {label:'Total Actual Cost',value:window.formatCurrency(summary.totalActualCost),color:'#e74c3c'},
                {label:'Budget Remaining',value:window.formatCurrency(summary.budgetRemaining),color:summary.budgetRemaining>=0?'#27ae60':'#e74c3c'},
                {label:'Budget Used',value:`${summary.budgetUsedPercent||0}%`,color:'#f39c12'},
                {label:'Direct Costs',value:window.formatCurrency(summary.totalCosts),color:'#9b59b6'},
                {label:'Time Cost',value:window.formatCurrency(summary.timeAmount),color:'#1abc9c'},
                {label:'Total Hours',value:`${summary.totalHours||0} hrs`,color:'#2c3e50'},
                {label:'Billable Hours',value:`${summary.billableHours||0} hrs`,color:'#27ae60'}
              ].map(({label,value,color}) => (
                <div key={label} className="summary-card" style={{borderLeftColor:color}}>
                  <div className="summary-label">{label}</div>
                  <div className="summary-value" style={{color}}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* Project Modal */}
        {showModal && (activeTab==='projects') && (
          <window.Modal title={editItem?'Edit Project':'New Project'} onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveProject}>Save</button></>}>
            {formError && <window.ErrorBanner message={formError}/>}
            <form onSubmit={saveProject}>
              <div className="form-row">
                <window.FormField label="Project Code *"><input className="form-input" value={formData.projectCode||''} onChange={e=>setFormData(f=>({...f,projectCode:e.target.value}))} required /></window.FormField>
                <window.FormField label="Project Name *"><input className="form-input" value={formData.projectName||''} onChange={e=>setFormData(f=>({...f,projectName:e.target.value}))} required /></window.FormField>
              </div>
              <div className="form-row">
                <window.FormField label="Client Name"><input className="form-input" value={formData.clientName||''} onChange={e=>setFormData(f=>({...f,clientName:e.target.value}))} /></window.FormField>
                <window.FormField label="Status">
                  <select className="form-select" value={formData.status||'planning'} onChange={e=>setFormData(f=>({...f,status:e.target.value}))}>
                    {PROJECT_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </window.FormField>
              </div>
              <div className="form-row">
                <window.FormField label="Start Date"><input className="form-input" type="date" value={formData.startDate||''} onChange={e=>setFormData(f=>({...f,startDate:e.target.value}))} /></window.FormField>
                <window.FormField label="End Date"><input className="form-input" type="date" value={formData.endDate||''} onChange={e=>setFormData(f=>({...f,endDate:e.target.value}))} /></window.FormField>
              </div>
              <window.FormField label="Budget (£)"><input className="form-input" type="number" min="0" step="0.01" value={formData.budget||0} onChange={e=>setFormData(f=>({...f,budget:e.target.value}))} /></window.FormField>
              <window.FormField label="Description"><textarea className="form-textarea" rows={2} value={formData.description||''} onChange={e=>setFormData(f=>({...f,description:e.target.value}))} /></window.FormField>
            </form>
          </window.Modal>
        )}

        {/* Cost Modal */}
        {showModal && activeTab==='costs' && (
          <window.Modal title="Add Project Cost" onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveCost}>Add Cost</button></>}>
            {formError && <window.ErrorBanner message={formError}/>}
            <div className="form-row">
              <window.FormField label="Date *"><input className="form-input" type="date" value={costForm.date||''} onChange={e=>setCostForm(f=>({...f,date:e.target.value}))} required /></window.FormField>
              <window.FormField label="Cost Type">
                <select className="form-select" value={costForm.costType||'other'} onChange={e=>setCostForm(f=>({...f,costType:e.target.value}))}>
                  {COST_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </window.FormField>
            </div>
            <window.FormField label="Description *"><input className="form-input" value={costForm.description||''} onChange={e=>setCostForm(f=>({...f,description:e.target.value}))} required /></window.FormField>
            <div className="form-row">
              <window.FormField label="Amount (£) *"><input className="form-input" type="number" min="0" step="0.01" value={costForm.amount||0} onChange={e=>setCostForm(f=>({...f,amount:e.target.value}))} required /></window.FormField>
              <window.FormField label="Vendor"><input className="form-input" value={costForm.vendor||''} onChange={e=>setCostForm(f=>({...f,vendor:e.target.value}))} /></window.FormField>
            </div>
          </window.Modal>
        )}

        {/* Time Modal */}
        {showModal && activeTab==='time' && (
          <window.Modal title="Log Time" onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveTime}>Log Time</button></>}>
            {formError && <window.ErrorBanner message={formError}/>}
            <div className="form-row">
              <window.FormField label="Date *"><input className="form-input" type="date" value={timeForm.date||''} onChange={e=>setTimeForm(f=>({...f,date:e.target.value}))} required /></window.FormField>
              <window.FormField label="Employee Name"><input className="form-input" value={timeForm.employeeName||''} onChange={e=>setTimeForm(f=>({...f,employeeName:e.target.value}))} /></window.FormField>
            </div>
            <div className="form-row">
              <window.FormField label="Hours *"><input className="form-input" type="number" min="0.25" step="0.25" value={timeForm.hours||1} onChange={e=>setTimeForm(f=>({...f,hours:e.target.value}))} required /></window.FormField>
              <window.FormField label="Hourly Rate (£)"><input className="form-input" type="number" min="0" step="0.01" value={timeForm.hourlyRate||0} onChange={e=>setTimeForm(f=>({...f,hourlyRate:e.target.value}))} /></window.FormField>
            </div>
            <window.FormField label="Description"><input className="form-input" value={timeForm.description||''} onChange={e=>setTimeForm(f=>({...f,description:e.target.value}))} /></window.FormField>
            <window.FormField label="Billable">
              <select className="form-select" value={timeForm.billable?'yes':'no'} onChange={e=>setTimeForm(f=>({...f,billable:e.target.value==='yes'}))}>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </window.FormField>
          </window.Modal>
        )}

        {confirmTarget && <window.ConfirmDialog message={`Delete project "${confirmTarget.projectName}"?`} onConfirm={deleteProject} onCancel={()=>setConfirmTarget(null)}/>}
      </div>
    );
  };

})();
