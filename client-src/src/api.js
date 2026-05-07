// LedgerPro SaaS API Client
const isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:');
const BASE_URL = isLocal ? 'http://localhost:3000/api/v1' : '/api/v1';
const TIMEOUT  = 10000;

async function request(method, path, body) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const opts = { method, credentials: 'include', signal: ctrl.signal, headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    // Send active org header
    if (API?.currentOrg?._id) opts.headers['x-org-id'] = API.currentOrg._id;
    const res  = await fetch(BASE_URL + path, opts);
    let json;
    try { json = await res.json(); } catch { json = {}; }
    if (!res.ok) throw new Error(json.message || res.statusText || 'Request failed');
    return json;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out — is the backend running?');
    throw err;
  } finally { clearTimeout(timer); }
}

const q = (params) => {
  if (!params) return '';
  const s = Object.entries(params).filter(([,v]) => v != null && v !== '').map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return s ? '?' + s : '';
};

const API = {
  currentUser: null,
  currentOrg:  null,
  currentRole: null,

  auth: {
    register:           (d)     => request('POST', '/auth/register', d),
    login:              (d)     => request('POST', '/auth/login', d),
    logout:             ()      => request('POST', '/auth/logout'),
    me:                 ()      => request('GET',  '/auth/me'),
    switchOrg:          (orgId) => request('POST', '/auth/switch-org', { orgId }),
    acceptInvite:       (d)     => request('POST', '/auth/accept-invite', d),
    forgotPassword:     (d)     => request('POST', '/auth/forgot-password', d),
    resetPassword:      (d)     => request('POST', '/auth/reset-password', d),
    verifyEmail:        (token) => request('GET',  `/auth/verify-email?token=${token}`),
    resendVerification: ()      => request('POST', '/auth/resend-verification')
  },

  orgs: {
    get:            ()       => request('GET',    '/orgs'),
    update:         (d)      => request('PUT',    '/orgs', d),
    getMembers:     ()       => request('GET',    '/orgs/members'),
    updateMember:   (uid, d) => request('PUT',    `/orgs/members/${uid}`, d),
    removeMember:   (uid)    => request('DELETE', `/orgs/members/${uid}`),
    getInvites:     ()       => request('GET',    '/orgs/invites'),
    createInvite:   (d)      => request('POST',   '/orgs/invites', d),
    revokeInvite:   (id)     => request('DELETE', `/orgs/invites/${id}`),
    getPlan:        ()       => request('GET',    '/orgs/plan')
  },

  finance: {
    getAccounts:    (p) => request('GET', '/finance/accounts' + q(p)),
    createAccount:  (d) => request('POST', '/finance/accounts', d),
    updateAccount:  (id,d) => request('PUT', `/finance/accounts/${id}`, d),
    deleteAccount:  (id)   => request('DELETE', `/finance/accounts/${id}`),
    getJournalEntries: (p) => request('GET', '/finance/journal-entries' + q(p)),
    createJournalEntry:(d) => request('POST', '/finance/journal-entries', d),
    postJournalEntry:  (id,d) => request('PUT', `/finance/journal-entries/${id}`, d),
    getTrialBalance: ()  => request('GET', '/finance/reports/trial-balance'),
    getProfitLoss:  ()   => request('GET', '/finance/reports/profit-loss'),
    getBalanceSheet: ()  => request('GET', '/finance/reports/balance-sheet'),
    getFixedAssetsSchedule: () => request('GET', '/finance/reports/fixed-assets-schedule')
  },

  ar: {
    getCustomers:  (p) => request('GET', '/ar/customers' + q(p)),
    createCustomer: (d) => request('POST', '/ar/customers', d),
    updateCustomer: (id,d) => request('PUT', `/ar/customers/${id}`, d),
    deleteCustomer: (id)   => request('DELETE', `/ar/customers/${id}`),
    getInvoices:    (p)     => request('GET', '/ar/invoices' + q(p)),
    createInvoice:  (d)     => request('POST', '/ar/invoices', d),
    updateInvoice:  (id,d)  => request('PUT', `/ar/invoices/${id}`, d),
    deleteInvoice:  (id)    => request('DELETE', `/ar/invoices/${id}`),
    downloadPdf:    (id)    => { window.open(BASE_URL + `/ar/invoices/${id}/pdf`, '_blank'); },
    emailInvoice:   (id, d) => request('POST', `/ar/invoices/${id}/email`, d),
    getPayments:    (p)     => request('GET', '/ar/payments' + q(p)),
    createPayment:  (d)     => request('POST', '/ar/payments', d),
    getAgingReport: ()      => request('GET', '/ar/reports/aging')
  },

  ap: {
    getVendors:    (p) => request('GET', '/ap/vendors' + q(p)),
    createVendor:   (d) => request('POST', '/ap/vendors', d),
    updateVendor:  (id,d) => request('PUT', `/ap/vendors/${id}`, d),
    deleteVendor:  (id)   => request('DELETE', `/ap/vendors/${id}`),
    getBills:      (p) => request('GET', '/ap/bills' + q(p)),
    createBill:     (d) => request('POST', '/ap/bills', d),
    updateBill:    (id,d) => request('PUT', `/ap/bills/${id}`, d),
    getPurchaseOrders: (p) => request('GET', '/ap/purchase-orders' + q(p)),
    createPurchaseOrder: (d) => request('POST', '/ap/purchase-orders', d),
    getPayments:   (p) => request('GET', '/ap/payments' + q(p)),
    createPayment:  (d) => request('POST', '/ap/payments', d)
  },

  fixedAssets: {
    getAll:   (p) => request('GET', '/fixed-assets' + q(p)),
    create:    (d) => request('POST', '/fixed-assets', d),
    update:   (id,d) => request('PUT', `/fixed-assets/${id}`, d),
    delete:   (id)   => request('DELETE', `/fixed-assets/${id}`),
    dispose:  (id,d) => request('POST', `/fixed-assets/${id}/dispose`, d),
    calculateDepreciation: (id) => request('GET', `/fixed-assets/${id}/depreciation`)
  },

  tax: {
    getConfigs:   () => request('GET', '/tax/configurations'),
    createConfig:  (d) => request('POST', '/tax/configurations', d),
    updateConfig: (id,d) => request('PUT', `/tax/configurations/${id}`, d),
    getReturns:   () => request('GET', '/tax/returns'),
    createReturn:  (d) => request('POST', '/tax/returns', d),
    updateReturn: (id,d) => request('PUT', `/tax/returns/${id}`, d),
    fileReturn:   (id)   => request('POST', `/tax/returns/${id}/file`),
    getTransactions: () => request('GET', '/tax/transactions')
  },

  hr: {
    getDepartments:   () => request('GET', '/hr/departments'),
    createDepartment:  (d) => request('POST', '/hr/departments', d),
    updateDepartment: (id,d) => request('PUT', `/hr/departments/${id}`, d),
    deleteDepartment: (id)   => request('DELETE', `/hr/departments/${id}`),
    getEmployees:     (p) => request('GET', '/hr/employees' + q(p)),
    createEmployee:    (d) => request('POST', '/hr/employees', d),
    updateEmployee:   (id,d) => request('PUT', `/hr/employees/${id}`, d),
    deleteEmployee:   (id)   => request('DELETE', `/hr/employees/${id}`)
  },

  expenses: {
    getCategories:   () => request('GET', '/expenses/categories'),
    createCategory:   (d) => request('POST', '/expenses/categories', d),
    updateCategory:  (id,d) => request('PUT', `/expenses/categories/${id}`, d),
    getClaims:       (p) => request('GET', '/expenses/claims' + q(p)),
    createClaim:      (d) => request('POST', '/expenses/claims', d),
    updateClaim:     (id,d) => request('PUT', `/expenses/claims/${id}`, d),
    submitClaim:     (id)   => request('POST', `/expenses/claims/${id}/submit`),
    approveClaim:    (id)   => request('POST', `/expenses/claims/${id}/approve`),
    rejectClaim:     (id,d) => request('POST', `/expenses/claims/${id}/reject`, d),
    markReimbursed:  (id)   => request('POST', `/expenses/claims/${id}/reimburse`)
  },

  projects: {
    getAll:    (p) => request('GET', '/projects' + q(p)),
    create:     (d) => request('POST', '/projects', d),
    update:    (id,d) => request('PUT', `/projects/${id}`, d),
    delete:    (id)   => request('DELETE', `/projects/${id}`),
    getSummary: (id)  => request('GET', `/projects/${id}/summary`),
    getCosts:   (id)  => request('GET', `/projects/${id}/costs`),
    addCost:   (id,d) => request('POST', `/projects/${id}/costs`, d),
    getTimeEntries: (id)  => request('GET', `/projects/${id}/time-entries`),
    addTimeEntry:  (id,d) => request('POST', `/projects/${id}/time-entries`, d)
  },

  billing: {
    getStatus:  ()  => request('GET',  '/billing/status'),
    checkout:   (d) => request('POST', '/billing/checkout', d),
    portal:     ()  => request('POST', '/billing/portal')
  },
};

export default API;
