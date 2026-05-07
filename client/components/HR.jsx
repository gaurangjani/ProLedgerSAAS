// LedgerPro HR Module

(function () {
  const { useState, useEffect } = React;

  const TABS = [
    { id: 'departments', label: 'Departments' },
    { id: 'employees',   label: 'Employees'   }
  ];

  const EMPLOYMENT_TYPES = ['full-time','part-time','contract','intern'];
  const EMPLOYEE_STATUSES = ['active','on-leave','terminated','probation'];

  const emptyDept = () => ({ departmentCode:'', departmentName:'', description:'', isActive:true });
  const emptyEmployee = () => ({ employeeCode:'', firstName:'', lastName:'', email:'', phone:'', department:'', jobTitle:'', employmentType:'full-time', startDate: new Date().toISOString().split('T')[0], status:'active', address:'', notes:'' });

  window.HRModule = function () {
    const [activeTab, setActiveTab] = useState('departments');
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState(emptyDept());
    const [confirmTarget, setConfirmTarget] = useState(null);
    const [authRequired, setAuthRequired] = useState(false);
    const [formError, setFormError] = useState(null);

    const checkAuth = async () => {
      try { await window.API.auth.me(); return true; }
      catch { setAuthRequired(true); return false; }
    };

    const loadDepts = async () => { const r = await window.API.hr.getDepartments(); setDepartments(r.data||[]); };
    const loadEmps  = async () => { const r = await window.API.hr.getEmployees();   setEmployees(r.data||[]); };

    const load = async () => {
      setLoading(true); setError(null);
      try { if (activeTab === 'departments') await loadDepts(); else { await loadDepts(); await loadEmps(); } }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };

    useEffect(() => { checkAuth().then(ok => ok && load()); }, [activeTab]);
    if (authRequired) return <window.LoginModal onSuccess={() => setAuthRequired(false)} />;

    const closeModal = () => { setShowModal(false); setEditItem(null); setFormError(null); };
    const openAdd = () => { setEditItem(null); setFormError(null); setFormData(activeTab === 'departments' ? emptyDept() : emptyEmployee()); setShowModal(true); };
    const openEdit = (item) => { setEditItem(item); setFormData({...item, department: item.department?._id || item.department || ''}); setFormError(null); setShowModal(true); };

    const saveDept = async (e) => {
      e.preventDefault(); setFormError(null);
      try {
        if (editItem) await window.API.hr.updateDepartment(editItem._id, formData);
        else await window.API.hr.createDepartment(formData);
        closeModal(); load();
      } catch (err) { setFormError(err.message); }
    };

    const deleteDept = async () => {
      try { await window.API.hr.deleteDepartment(confirmTarget._id); setConfirmTarget(null); load(); }
      catch (err) { setError(err.message); setConfirmTarget(null); }
    };

    const saveEmployee = async (e) => {
      e.preventDefault(); setFormError(null);
      try {
        if (editItem) await window.API.hr.updateEmployee(editItem._id, formData);
        else await window.API.hr.createEmployee(formData);
        closeModal(); load();
      } catch (err) { setFormError(err.message); }
    };

    const deleteEmployee = async () => {
      try { await window.API.hr.deleteEmployee(confirmTarget._id); setConfirmTarget(null); load(); }
      catch (err) { setError(err.message); setConfirmTarget(null); }
    };

    return (
      <div className="module-container">
        <h2>Human Resources</h2>
        <p className="subtitle">Employee records and department management</p>
        <window.Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Departments */}
        {activeTab === 'departments' && (<>
          <div className="module-toolbar"><h3>Departments ({departments.length})</h3><button className="btn-primary" onClick={openAdd}>+ Add Department</button></div>
          {error && <window.ErrorBanner message={error} onRetry={load} />}
          <window.DataTable loading={loading} emptyText="No departments yet."
            columns={[
              {key:'departmentCode',label:'Code'},{key:'departmentName',label:'Name'},{key:'description',label:'Description'},
              {key:'isActive',label:'Status',render:v=><window.StatusBadge status={v?'active':'inactive'}/>}
            ]}
            data={departments}
            actions={row=>(<><button className="btn-secondary btn-sm" onClick={()=>openEdit(row)}>Edit</button><button className="btn-danger btn-sm" onClick={()=>setConfirmTarget(row)}>Delete</button></>)}
          />
        </>)}

        {/* Employees */}
        {activeTab === 'employees' && (<>
          <div className="module-toolbar"><h3>Employees ({employees.length})</h3><button className="btn-primary" onClick={openAdd}>+ Add Employee</button></div>
          {error && <window.ErrorBanner message={error} onRetry={load} />}
          <window.DataTable loading={loading} emptyText="No employees yet."
            columns={[
              {key:'employeeCode',label:'Code'},
              {key:'firstName',label:'First Name'},{key:'lastName',label:'Last Name'},
              {key:'department',label:'Department',render:(v,r)=>r.department?.departmentName||'—'},
              {key:'jobTitle',label:'Job Title'},
              {key:'employmentType',label:'Type',render:v=><window.StatusBadge status={v}/>},
              {key:'status',label:'Status',render:v=><window.StatusBadge status={v}/>}
            ]}
            data={employees}
            actions={row=>(<><button className="btn-secondary btn-sm" onClick={()=>openEdit(row)}>Edit</button><button className="btn-danger btn-sm" onClick={()=>setConfirmTarget(row)}>Delete</button></>)}
          />
        </>)}

        {/* Department Modal */}
        {showModal && activeTab==='departments' && (
          <window.Modal title={editItem?'Edit Department':'Add Department'} onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveDept}>Save</button></>}>
            {formError && <window.ErrorBanner message={formError}/>}
            <form onSubmit={saveDept}>
              <div className="form-row">
                <window.FormField label="Department Code *"><input className="form-input" value={formData.departmentCode||''} onChange={e=>setFormData(f=>({...f,departmentCode:e.target.value}))} required /></window.FormField>
                <window.FormField label="Department Name *"><input className="form-input" value={formData.departmentName||''} onChange={e=>setFormData(f=>({...f,departmentName:e.target.value}))} required /></window.FormField>
              </div>
              <window.FormField label="Description"><input className="form-input" value={formData.description||''} onChange={e=>setFormData(f=>({...f,description:e.target.value}))} /></window.FormField>
            </form>
          </window.Modal>
        )}

        {/* Employee Modal */}
        {showModal && activeTab==='employees' && (
          <window.Modal title={editItem?'Edit Employee':'Add Employee'} onClose={closeModal} footer={<><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={saveEmployee}>Save</button></>}>
            {formError && <window.ErrorBanner message={formError}/>}
            <form onSubmit={saveEmployee}>
              <div className="form-row">
                <window.FormField label="Employee Code *"><input className="form-input" value={formData.employeeCode||''} onChange={e=>setFormData(f=>({...f,employeeCode:e.target.value}))} required /></window.FormField>
                <window.FormField label="Department">
                  <select className="form-select" value={formData.department||''} onChange={e=>setFormData(f=>({...f,department:e.target.value}))}>
                    <option value="">Select department...</option>
                    {departments.map(d=><option key={d._id} value={d._id}>{d.departmentName}</option>)}
                  </select>
                </window.FormField>
              </div>
              <div className="form-row">
                <window.FormField label="First Name *"><input className="form-input" value={formData.firstName||''} onChange={e=>setFormData(f=>({...f,firstName:e.target.value}))} required /></window.FormField>
                <window.FormField label="Last Name *"><input className="form-input" value={formData.lastName||''} onChange={e=>setFormData(f=>({...f,lastName:e.target.value}))} required /></window.FormField>
              </div>
              <div className="form-row">
                <window.FormField label="Email *"><input className="form-input" type="email" value={formData.email||''} onChange={e=>setFormData(f=>({...f,email:e.target.value}))} required /></window.FormField>
                <window.FormField label="Phone"><input className="form-input" value={formData.phone||''} onChange={e=>setFormData(f=>({...f,phone:e.target.value}))} /></window.FormField>
              </div>
              <div className="form-row">
                <window.FormField label="Job Title"><input className="form-input" value={formData.jobTitle||''} onChange={e=>setFormData(f=>({...f,jobTitle:e.target.value}))} /></window.FormField>
                <window.FormField label="Employment Type">
                  <select className="form-select" value={formData.employmentType||'full-time'} onChange={e=>setFormData(f=>({...f,employmentType:e.target.value}))}>
                    {EMPLOYMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </window.FormField>
              </div>
              <div className="form-row">
                <window.FormField label="Start Date"><input className="form-input" type="date" value={formData.startDate||''} onChange={e=>setFormData(f=>({...f,startDate:e.target.value}))} /></window.FormField>
                <window.FormField label="Status">
                  <select className="form-select" value={formData.status||'active'} onChange={e=>setFormData(f=>({...f,status:e.target.value}))}>
                    {EMPLOYEE_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </window.FormField>
              </div>
              <window.FormField label="Address"><input className="form-input" value={formData.address||''} onChange={e=>setFormData(f=>({...f,address:e.target.value}))} /></window.FormField>
              <window.FormField label="Notes"><textarea className="form-textarea" rows={2} value={formData.notes||''} onChange={e=>setFormData(f=>({...f,notes:e.target.value}))} /></window.FormField>
            </form>
          </window.Modal>
        )}

        {confirmTarget && <window.ConfirmDialog
          message={activeTab==='departments' ? `Delete department "${confirmTarget.departmentName}"?` : `Delete employee "${confirmTarget.firstName} ${confirmTarget.lastName}"?`}
          onConfirm={activeTab==='departments' ? deleteDept : deleteEmployee}
          onCancel={()=>setConfirmTarget(null)}
        />}
      </div>
    );
  };

})();
