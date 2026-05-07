const router   = require('express').Router();
const c        = require('../controllers/accountingController');
const validate = require('../middleware/validate');
const s        = require('../validation/schemas');
const { isAuthenticated, requireOrg, canWrite } = require('../middleware/auth');

router.use(isAuthenticated, requireOrg);

// ── Finance ───────────────────────────────────────────
router.get('/finance/accounts',                                        c.listAccounts);
router.post('/finance/accounts',   canWrite, validate(s.createAccount), c.createAccount);
router.put('/finance/accounts/:id', canWrite,                          c.updateAccount);
router.delete('/finance/accounts/:id', canWrite,                       c.deleteAccount);

router.get('/finance/journal-entries',                                            c.listJournals);
router.post('/finance/journal-entries', canWrite, validate(s.createJournalEntry), c.createJournal);
router.put('/finance/journal-entries/:id', canWrite,                              c.postJournal);

router.get('/finance/reports/trial-balance',    c.getTrialBalance);
router.get('/finance/reports/profit-loss',      c.getProfitLoss);
router.get('/finance/reports/balance-sheet',    c.getBalanceSheet);

// ── AR ────────────────────────────────────────────────
router.get('/ar/customers',          c.listCustomers);
router.post('/ar/customers', canWrite, c.createCustomer);
router.put('/ar/customers/:id', canWrite, c.updateCustomer);
router.delete('/ar/customers/:id', canWrite, c.deleteCustomer);

router.get('/ar/invoices',                                          c.listInvoices);
router.post('/ar/invoices', canWrite, validate(s.createInvoice), c.createInvoice);
router.put('/ar/invoices/:id', canWrite, c.updateInvoice);
router.delete('/ar/invoices/:id', canWrite, c.deleteInvoice);

router.get('/ar/payments',            c.listARPayments);
router.post('/ar/payments', canWrite,  c.createARPayment);
router.get('/ar/reports/aging',       c.getAgingReport);

// ── AP ────────────────────────────────────────────────
router.get('/ap/vendors',            c.listVendors);
router.post('/ap/vendors', canWrite,  c.createVendor);
router.put('/ap/vendors/:id', canWrite, c.updateVendor);
router.delete('/ap/vendors/:id', canWrite, c.deleteVendor);

router.get('/ap/bills',              c.listBills);
router.post('/ap/bills', canWrite,   c.createBill);
router.put('/ap/bills/:id', canWrite, c.updateBill);

router.get('/ap/purchase-orders',    c.listPOs);
router.post('/ap/purchase-orders', canWrite, c.createPO);

router.get('/ap/payments',           c.listAPPayments);
router.post('/ap/payments', canWrite, c.createAPPayment);

// ── Fixed Assets ──────────────────────────────────────
router.get('/fixed-assets',          c.listAssets);
router.post('/fixed-assets', canWrite, c.createAsset);
router.put('/fixed-assets/:id', canWrite, c.updateAsset);
router.delete('/fixed-assets/:id', canWrite, c.deleteAsset);
router.post('/fixed-assets/:id/dispose', canWrite, c.disposeAsset);

// ── Tax ───────────────────────────────────────────────
router.get('/tax/configurations',    c.listTaxConfigs);
router.post('/tax/configurations', canWrite, c.createTaxConfig);
router.put('/tax/configurations/:id', canWrite, c.updateTaxConfig);

router.get('/tax/returns',           c.listTaxReturns);
router.post('/tax/returns', canWrite, c.createTaxReturn);
router.put('/tax/returns/:id', canWrite, c.updateTaxReturn);
router.post('/tax/returns/:id/file', canWrite, c.fileTaxReturn);

// ── HR ────────────────────────────────────────────────
router.get('/hr/departments',        c.listDepartments);
router.post('/hr/departments', canWrite, c.createDepartment);
router.put('/hr/departments/:id', canWrite, c.updateDepartment);
router.delete('/hr/departments/:id', canWrite, c.deleteDepartment);

router.get('/hr/employees',          c.listEmployees);
router.post('/hr/employees', canWrite, c.createEmployee);
router.put('/hr/employees/:id', canWrite, c.updateEmployee);
router.delete('/hr/employees/:id', canWrite, c.deleteEmployee);

// ── Expenses ──────────────────────────────────────────
router.get('/expenses/categories',   c.listExpenseCategories);
router.post('/expenses/categories', canWrite, c.createExpenseCategory);
router.put('/expenses/categories/:id', canWrite, c.updateExpenseCategory);

router.get('/expenses/claims',       c.listExpenseClaims);
router.post('/expenses/claims', canWrite, c.createExpenseClaim);
router.put('/expenses/claims/:id', canWrite, c.updateExpenseClaim);
router.post('/expenses/claims/:id/submit',    canWrite, c.submitClaim);
router.post('/expenses/claims/:id/approve',   canWrite, c.approveClaim);
router.post('/expenses/claims/:id/reject',    canWrite, c.rejectClaim);
router.post('/expenses/claims/:id/reimburse', canWrite, c.reimbursClaim);

// ── Projects ──────────────────────────────────────────
router.get('/projects',              c.listProjects);
router.post('/projects', canWrite,   c.createProject);
router.put('/projects/:id', canWrite, c.updateProject);
router.delete('/projects/:id', canWrite, c.deleteProject);
router.get('/projects/:id/summary',  c.getProjectSummary);
router.get('/projects/:id/costs',    c.listCosts);
router.post('/projects/:id/costs', canWrite, c.addCost);
router.get('/projects/:id/time-entries',  c.listTimeEntries);
router.post('/projects/:id/time-entries', canWrite, c.addTimeEntry);

module.exports = router;
