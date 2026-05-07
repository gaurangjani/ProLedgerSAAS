// All accounting models — every schema has orgId for multi-tenant isolation
const mongoose = require('mongoose');
const { Schema } = mongoose;
const org = { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true };

// ── Chart of Accounts ────────────────────────────────
const accountSchema = new Schema({
  org, accountCode: { type: String, required: true },
  accountName: { type: String, required: true },
  accountType: { type: String, enum: ['asset','liability','equity','revenue','expense'], required: true },
  category: String, description: String,
  balance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
accountSchema.index({ org: 1, accountCode: 1 }, { unique: true });

// ── Journal Entry ────────────────────────────────────
const journalLineSchema = new Schema({
  account: { type: Schema.Types.ObjectId, ref: 'Account' },
  accountCode: String, description: String,
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 }
});
const journalEntrySchema = new Schema({
  org, entryNumber: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  lines: [journalLineSchema],
  status: { type: String, enum: ['draft','posted','reversed'], default: 'draft' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
journalEntrySchema.index({ org: 1, entryNumber: 1 }, { unique: true });

// ── Customer ─────────────────────────────────────────
const customerSchema = new Schema({
  org, customerCode: String, customerName: { type: String, required: true },
  email: String, phone: String, address: String,
  creditLimit: { type: Number, default: 0 },
  paymentTerms: { type: Number, default: 30 },
  status: { type: String, enum: ['active','inactive'], default: 'active' }
}, { timestamps: true });

// ── Invoice ──────────────────────────────────────────
const invoiceLineSchema = new Schema({ description: String, quantity: Number, unitPrice: Number, amount: Number, taxRate: { type: Number, default: 0 } });
const invoiceSchema = new Schema({
  org, invoiceNumber: { type: String, required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String, invoiceDate: Date, dueDate: Date,
  lines: [invoiceLineSchema],
  subtotal: Number, taxAmount: Number, totalAmount: Number,
  amountPaid: { type: Number, default: 0 }, amountDue: Number,
  status: { type: String, enum: ['draft','sent','paid','overdue','cancelled','partially-paid'], default: 'draft' },
  notes: String, createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
invoiceSchema.index({ org: 1, invoiceNumber: 1 }, { unique: true });

// ── Payment (AR) ─────────────────────────────────────
const arPaymentSchema = new Schema({
  org, paymentRef: String, customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  invoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  paymentDate: Date, amount: Number, paymentMethod: String, notes: String
}, { timestamps: true });

// ── Vendor ───────────────────────────────────────────
const vendorSchema = new Schema({
  org, vendorCode: String, vendorName: { type: String, required: true },
  email: String, phone: String, address: String,
  paymentTerms: { type: Number, default: 30 },
  status: { type: String, enum: ['active','inactive'], default: 'active' }
}, { timestamps: true });

// ── Bill ─────────────────────────────────────────────
const billLineSchema = new Schema({ description: String, quantity: Number, unitPrice: Number, amount: Number });
const billSchema = new Schema({
  org, billNumber: { type: String, required: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' }, vendorName: String,
  billDate: Date, dueDate: Date, lines: [billLineSchema],
  totalAmount: Number, amountPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['draft','received','paid','overdue','cancelled'], default: 'draft' }
}, { timestamps: true });
billSchema.index({ org: 1, billNumber: 1 }, { unique: true });

// ── Purchase Order ────────────────────────────────────
const poSchema = new Schema({
  org, poNumber: { type: String, required: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' }, vendorName: String,
  orderDate: Date, expectedDelivery: Date, lines: [billLineSchema],
  totalAmount: Number,
  status: { type: String, enum: ['draft','sent','received','cancelled'], default: 'draft' }
}, { timestamps: true });

// ── AP Payment ────────────────────────────────────────
const apPaymentSchema = new Schema({
  org, paymentRef: String, vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  bill: { type: Schema.Types.ObjectId, ref: 'Bill' },
  paymentDate: Date, amount: Number, paymentMethod: String
}, { timestamps: true });

// ── Fixed Asset ───────────────────────────────────────
const fixedAssetSchema = new Schema({
  org, assetCode: String, assetName: { type: String, required: true },
  category: String, acquisitionDate: Date, acquisitionCost: Number,
  depreciationMethod: { type: String, enum: ['straight-line','declining-balance','units-of-production'], default: 'straight-line' },
  usefulLifeYears: Number, residualValue: { type: Number, default: 0 },
  accumulatedDepreciation: { type: Number, default: 0 },
  netBookValue: Number,
  status: { type: String, enum: ['active','disposed','fully-depreciated','under-maintenance'], default: 'active' }
}, { timestamps: true });

// ── Tax Config ────────────────────────────────────────
const taxConfigSchema = new Schema({
  org, taxCode: String, taxName: String,
  taxType: { type: String, enum: ['vat','sales-tax','income-tax','corporate-tax'] },
  rate: Number, isActive: { type: Boolean, default: true }
}, { timestamps: true });

// ── Tax Return ────────────────────────────────────────
const taxReturnSchema = new Schema({
  org, returnRef: String,
  taxType: String, periodStart: Date, periodEnd: Date, dueDate: Date,
  taxableAmount: Number, taxDue: Number,
  status: { type: String, enum: ['draft','submitted','filed','paid'], default: 'draft' }
}, { timestamps: true });

// ── Department ────────────────────────────────────────
const departmentSchema = new Schema({
  org, departmentCode: String, departmentName: { type: String, required: true },
  manager: { type: Schema.Types.ObjectId, ref: 'Employee' },
  description: String, isActive: { type: Boolean, default: true }
}, { timestamps: true });

// ── Employee ─────────────────────────────────────────
const employeeSchema = new Schema({
  org, employeeCode: String,
  firstName: { type: String, required: true }, lastName: { type: String, required: true },
  email: String, phone: String,
  department: { type: Schema.Types.ObjectId, ref: 'Department' },
  jobTitle: String,
  employmentType: { type: String, enum: ['full-time','part-time','contract','intern'], default: 'full-time' },
  startDate: Date, endDate: Date,
  status: { type: String, enum: ['active','on-leave','terminated','probation'], default: 'probation' },
  emergencyContact: { name: String, phone: String, relationship: String },
  notes: String
}, { timestamps: true });

// ── Expense Category ──────────────────────────────────
const expenseCategorySchema = new Schema({
  org, categoryCode: String, categoryName: { type: String, required: true },
  glAccountCode: String, requiresReceipt: { type: Boolean, default: true },
  maxAmount: Number, isActive: { type: Boolean, default: true }
}, { timestamps: true });

// ── Expense Claim ─────────────────────────────────────
const expenseItemSchema = new Schema({
  category: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory' },
  date: Date, description: String, amount: Number,
  currency: { type: String, default: 'GBP' }, hasReceipt: { type: Boolean, default: false }
});
const expenseClaimSchema = new Schema({
  org, claimNumber: String, claimDate: Date,
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  description: String, items: [expenseItemSchema],
  totalAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft','submitted','approved','rejected','reimbursed'], default: 'draft' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedDate: Date, reviewNotes: String
}, { timestamps: true });
expenseClaimSchema.pre('save', function(next) {
  this.totalAmount = (this.items || []).reduce((s, i) => s + (i.amount || 0), 0);
  if (!this.claimNumber) this.claimNumber = 'EXP-' + Date.now();
  next();
});

// ── Project ───────────────────────────────────────────
const projectSchema = new Schema({
  org, projectCode: String, projectName: { type: String, required: true },
  description: String, clientName: String,
  startDate: Date, endDate: Date,
  status: { type: String, enum: ['planning','active','on-hold','completed','cancelled'], default: 'planning' },
  budget: Number, currency: { type: String, default: 'GBP' },
  projectManager: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ── Project Cost ──────────────────────────────────────
const projectCostSchema = new Schema({
  org, project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  costRef: String, date: Date, description: String,
  costType: { type: String, enum: ['materials','subcontractor','equipment','travel','other'] },
  amount: Number, vendor: String
}, { timestamps: true });

// ── Time Entry ────────────────────────────────────────
const timeEntrySchema = new Schema({
  org, project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  entryRef: String, employee: String, date: Date, hours: Number,
  description: String, billable: { type: Boolean, default: true },
  hourlyRate: Number, amount: Number
}, { timestamps: true });
timeEntrySchema.pre('save', function(next) {
  if (!this.entryRef) this.entryRef = 'TIME-' + Date.now();
  this.amount = this.billable ? (this.hours || 0) * (this.hourlyRate || 0) : 0;
  next();
});

module.exports = {
  Account:        mongoose.model('Account',        accountSchema),
  JournalEntry:   mongoose.model('JournalEntry',   journalEntrySchema),
  Customer:       mongoose.model('Customer',        customerSchema),
  Invoice:        mongoose.model('Invoice',         invoiceSchema),
  ARPayment:      mongoose.model('ARPayment',       arPaymentSchema),
  Vendor:         mongoose.model('Vendor',          vendorSchema),
  Bill:           mongoose.model('Bill',            billSchema),
  PurchaseOrder:  mongoose.model('PurchaseOrder',   poSchema),
  APPayment:      mongoose.model('APPayment',       apPaymentSchema),
  FixedAsset:     mongoose.model('FixedAsset',      fixedAssetSchema),
  TaxConfig:      mongoose.model('TaxConfig',       taxConfigSchema),
  TaxReturn:      mongoose.model('TaxReturn',       taxReturnSchema),
  Department:     mongoose.model('Department',      departmentSchema),
  Employee:       mongoose.model('Employee',         employeeSchema),
  ExpenseCategory:mongoose.model('ExpenseCategory', expenseCategorySchema),
  ExpenseClaim:   mongoose.model('ExpenseClaim',    expenseClaimSchema),
  Project:        mongoose.model('Project',         projectSchema),
  ProjectCost:    mongoose.model('ProjectCost',     projectCostSchema),
  TimeEntry:      mongoose.model('TimeEntry',       timeEntrySchema)
};
