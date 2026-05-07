// Generic multi-tenant CRUD factory + specialised accounting operations
const {
  Account, JournalEntry, Customer, Invoice, ARPayment,
  Vendor, Bill, PurchaseOrder, APPayment, FixedAsset,
  TaxConfig, TaxReturn, Department, Employee,
  ExpenseCategory, ExpenseClaim, Project, ProjectCost, TimeEntry
} = require('../models/accounting');

// ── Generic helpers ───────────────────────────────────
const list  = (Model, populate = '') => async (req, res, next) => {
  try {
    const query = Model.find({ org: req.orgId });
    if (populate) query.populate(populate);
    const data = await query.sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.create({ ...req.body, org: req.orgId });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};

const update = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.findOneAndUpdate({ _id: req.params.id, org: req.orgId }, req.body, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
};

const remove = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.findOneAndDelete({ _id: req.params.id, org: req.orgId });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};

// ── Finance ───────────────────────────────────────────
exports.listAccounts   = list(Account);
exports.createAccount  = create(Account);
exports.updateAccount  = update(Account);
exports.deleteAccount  = remove(Account);

exports.listJournals   = list(JournalEntry);
exports.createJournal  = async (req, res, next) => {
  try {
    const { lines = [] } = req.body;
    const totalDebit  = lines.reduce((s, l) => s + (l.debit  || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01)
      return res.status(400).json({ success: false, message: `Journal not balanced: debits ${totalDebit} ≠ credits ${totalCredit}` });
    const count = await JournalEntry.countDocuments({ org: req.orgId });
    const entryNumber = `JNL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const doc = await JournalEntry.create({ ...req.body, org: req.orgId, entryNumber, createdBy: req.user._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};
exports.postJournal    = update(JournalEntry); // PUT with status:'posted'
exports.getTrialBalance = async (req, res, next) => {
  try {
    const accounts = await Account.find({ org: req.orgId }).lean();
    res.json({ success: true, data: accounts });
  } catch (err) { next(err); }
};
exports.getProfitLoss = async (req, res, next) => {
  try {
    const accounts = await Account.find({ org: req.orgId }).lean();
    const revenue  = accounts.filter(a => a.accountType === 'revenue');
    const expenses = accounts.filter(a => a.accountType === 'expense');
    const totalRevenue  = revenue.reduce((s, a) => s + (a.balance || 0), 0);
    const totalExpenses = expenses.reduce((s, a) => s + (a.balance || 0), 0);
    res.json({ success: true, data: { revenue, expenses, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses } });
  } catch (err) { next(err); }
};
exports.getBalanceSheet = async (req, res, next) => {
  try {
    const accounts = await Account.find({ org: req.orgId }).lean();
    const byType = (t) => accounts.filter(a => a.accountType === t);
    const sum    = (arr) => arr.reduce((s, a) => s + (a.balance || 0), 0);
    const assets      = byType('asset'),    liabilities = byType('liability'), equity = byType('equity');
    res.json({ success: true, data: {
      currentAssets: assets, fixedAssets: [], currentLiabilities: liabilities, longTermLiabilities: [],
      equity, totalAssets: sum(assets), totalLiabilities: sum(liabilities), totalEquity: sum(equity)
    }});
  } catch (err) { next(err); }
};

// ── AR ────────────────────────────────────────────────
exports.listCustomers  = list(Customer);
exports.createCustomer = create(Customer);
exports.updateCustomer = update(Customer);
exports.deleteCustomer = remove(Customer);

exports.listInvoices   = list(Invoice, 'customer');
exports.createInvoice  = async (req, res, next) => {
  try {
    const count = await Invoice.countDocuments({ org: req.orgId });
    // Plan limit check
    if (req.org.plan === 'free' && count >= req.org.planLimits.maxInvoices)
      return res.status(403).json({ success: false, message: `Free plan limit: ${req.org.planLimits.maxInvoices} invoices. Upgrade to Pro.` });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const { lines = [] } = req.body;
    const subtotal = lines.reduce((s, l) => s + (l.amount || 0), 0);
    const taxAmount = lines.reduce((s, l) => s + (l.amount || 0) * ((l.taxRate || 0) / 100), 0);
    const totalAmount = subtotal + taxAmount;
    const doc = await Invoice.create({ ...req.body, org: req.orgId, invoiceNumber, subtotal, taxAmount, totalAmount, amountDue: totalAmount, createdBy: req.user._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};
exports.updateInvoice  = update(Invoice);
exports.deleteInvoice  = remove(Invoice);

exports.listARPayments  = list(ARPayment);
exports.createARPayment = create(ARPayment);

exports.getAgingReport = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ org: req.orgId, status: { $in: ['sent','overdue','partially-paid'] } })
      .populate('customer', 'customerName').lean();
    const now = Date.now();
    const customers = {};
    invoices.forEach(inv => {
      const name = inv.customer?.customerName || inv.customerName || 'Unknown';
      if (!customers[name]) customers[name] = { customerName: name, current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
      const days = Math.floor((now - new Date(inv.dueDate)) / 86400000);
      const bucket = days <= 0 ? 'current' : days <= 30 ? '1-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
      customers[name][bucket] += inv.amountDue || 0;
      customers[name].total   += inv.amountDue || 0;
    });
    res.json({ success: true, data: { customers: Object.values(customers) } });
  } catch (err) { next(err); }
};

// ── AP ────────────────────────────────────────────────
exports.listVendors    = list(Vendor);
exports.createVendor   = create(Vendor);
exports.updateVendor   = update(Vendor);
exports.deleteVendor   = remove(Vendor);
exports.listBills      = list(Bill, 'vendor');
exports.createBill     = create(Bill);
exports.updateBill     = update(Bill);
exports.listPOs        = list(PurchaseOrder, 'vendor');
exports.createPO       = create(PurchaseOrder);
exports.listAPPayments = list(APPayment);
exports.createAPPayment = create(APPayment);

// ── Fixed Assets ──────────────────────────────────────
exports.listAssets   = list(FixedAsset);
exports.createAsset  = create(FixedAsset);
exports.updateAsset  = update(FixedAsset);
exports.deleteAsset  = remove(FixedAsset);
exports.disposeAsset = async (req, res, next) => {
  try {
    const asset = await FixedAsset.findOneAndUpdate({ _id: req.params.id, org: req.orgId },
      { status: 'disposed', ...req.body }, { new: true });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: asset });
  } catch (err) { next(err); }
};

// ── Tax ───────────────────────────────────────────────
exports.listTaxConfigs   = list(TaxConfig);
exports.createTaxConfig  = create(TaxConfig);
exports.updateTaxConfig  = update(TaxConfig);
exports.listTaxReturns   = list(TaxReturn);
exports.createTaxReturn  = create(TaxReturn);
exports.updateTaxReturn  = update(TaxReturn);
exports.fileTaxReturn    = async (req, res, next) => {
  try {
    const doc = await TaxReturn.findOneAndUpdate({ _id: req.params.id, org: req.orgId }, { status: 'filed' }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Return not found' });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
};

// ── HR ────────────────────────────────────────────────
exports.listDepartments   = list(Department);
exports.createDepartment  = create(Department);
exports.updateDepartment  = update(Department);
exports.deleteDepartment  = remove(Department);
exports.listEmployees     = list(Employee, 'department');
exports.createEmployee    = create(Employee);
exports.updateEmployee    = update(Employee);
exports.deleteEmployee    = remove(Employee);

// ── Expenses ──────────────────────────────────────────
exports.listExpenseCategories  = list(ExpenseCategory);
exports.createExpenseCategory  = create(ExpenseCategory);
exports.updateExpenseCategory  = update(ExpenseCategory);
exports.listExpenseClaims      = list(ExpenseClaim);
exports.createExpenseClaim     = async (req, res, next) => {
  try {
    const doc = await ExpenseClaim.create({ ...req.body, org: req.orgId, submittedBy: req.user._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};
exports.updateExpenseClaim = update(ExpenseClaim);

const claimAction = (status, extraFields = {}) => async (req, res, next) => {
  try {
    const update = { status, reviewedBy: req.user._id, reviewedDate: new Date(), ...extraFields };
    if (req.body.reviewNotes) update.reviewNotes = req.body.reviewNotes;
    const doc = await ExpenseClaim.findOneAndUpdate({ _id: req.params.id, org: req.orgId }, update, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Claim not found' });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
};
exports.submitClaim    = claimAction('submitted');
exports.approveClaim   = claimAction('approved');
exports.rejectClaim    = claimAction('rejected');
exports.reimbursClaim  = claimAction('reimbursed');

// ── Projects ──────────────────────────────────────────
exports.listProjects  = list(Project);
exports.createProject = async (req, res, next) => {
  try {
    const count = await Project.countDocuments({ org: req.orgId });
    if (req.org.plan === 'free' && count >= req.org.planLimits.maxProjects)
      return res.status(403).json({ success: false, message: `Free plan limit: ${req.org.planLimits.maxProjects} projects. Upgrade to Pro.` });
    const projectCode = `PRJ-${String(count + 1).padStart(3, '0')}`;
    const doc = await Project.create({ ...req.body, org: req.orgId, projectCode, projectManager: req.user._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};
exports.updateProject = update(Project);
exports.deleteProject = async (req, res, next) => {
  try {
    const doc = await Project.findOneAndDelete({ _id: req.params.id, org: req.orgId });
    if (!doc) return res.status(404).json({ success: false, message: 'Project not found' });
    await Promise.all([
      ProjectCost.deleteMany({ project: req.params.id }),
      TimeEntry.deleteMany({ project: req.params.id })
    ]);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
};
exports.getProjectSummary = async (req, res, next) => {
  try {
    const [project, costs, entries] = await Promise.all([
      Project.findOne({ _id: req.params.id, org: req.orgId }),
      ProjectCost.find({ project: req.params.id, org: req.orgId }),
      TimeEntry.find({ project: req.params.id, org: req.orgId })
    ]);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const totalCosts    = costs.reduce((s, c) => s + (c.amount || 0), 0);
    const billableHours = entries.filter(e => e.billable).reduce((s, e) => s + (e.hours || 0), 0);
    const timeAmount    = entries.filter(e => e.billable).reduce((s, e) => s + (e.amount || 0), 0);
    const budgetUsed    = project.budget ? ((totalCosts / project.budget) * 100).toFixed(1) : 0;
    res.json({ success: true, data: { project, totalCosts, billableHours, timeAmount, budgetRemaining: (project.budget || 0) - totalCosts, budgetUsedPercent: Number(budgetUsed) } });
  } catch (err) { next(err); }
};
exports.listCosts      = async (req, res, next) => {
  try { res.json({ success: true, data: await ProjectCost.find({ project: req.params.id, org: req.orgId }).lean() }); }
  catch (err) { next(err); }
};
exports.addCost        = async (req, res, next) => {
  try {
    const doc = await ProjectCost.create({ ...req.body, org: req.orgId, project: req.params.id, costRef: 'COST-' + Date.now() });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};
exports.listTimeEntries = async (req, res, next) => {
  try { res.json({ success: true, data: await TimeEntry.find({ project: req.params.id, org: req.orgId }).lean() }); }
  catch (err) { next(err); }
};
exports.addTimeEntry    = async (req, res, next) => {
  try {
    const doc = await TimeEntry.create({ ...req.body, org: req.orgId, project: req.params.id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};
