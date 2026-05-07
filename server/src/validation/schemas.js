const Joi = require('joi');

const password = Joi.string().min(8).max(128).required().messages({
  'string.min': 'Password must be at least 8 characters',
  'any.required': 'Password is required'
});

exports.register = Joi.object({
  name:    Joi.string().min(2).max(100).trim().required(),
  email:   Joi.string().email().lowercase().required(),
  password,
  orgName: Joi.string().min(2).max(100).trim().required()
});

exports.login = Joi.object({
  email:    Joi.string().email().lowercase().required(),
  password: Joi.string().required()
});

exports.forgotPassword = Joi.object({
  email: Joi.string().email().lowercase().required()
});

exports.resetPassword = Joi.object({
  token:    Joi.string().required(),
  password
});

exports.acceptInvite = Joi.object({
  token:    Joi.string().required(),
  name:     Joi.string().min(2).max(100).trim().optional(),
  password: Joi.string().min(8).max(128).optional()
});

exports.createInvite = Joi.object({
  email: Joi.string().email().lowercase().required(),
  role:  Joi.string().valid('admin', 'accountant', 'viewer').required()
});

exports.updateOrg = Joi.object({
  name:          Joi.string().min(2).max(100).trim().optional(),
  address:       Joi.string().max(500).allow('').optional(),
  phone:         Joi.string().max(30).allow('').optional(),
  website:       Joi.string().uri().allow('').optional(),
  vatNumber:     Joi.string().max(30).allow('').optional(),
  currency:      Joi.string().length(3).uppercase().optional(),
  fiscalYearEnd: Joi.string().pattern(/^\d{2}-\d{2}$/).optional()
});

exports.createAccount = Joi.object({
  accountCode: Joi.string().max(20).required(),
  accountName: Joi.string().max(100).required(),
  accountType: Joi.string().valid('asset', 'liability', 'equity', 'revenue', 'expense').required(),
  category:    Joi.string().max(100).allow('').optional(),
  description: Joi.string().max(500).allow('').optional(),
  balance:     Joi.number().optional(),
  isActive:    Joi.boolean().optional()
});

exports.createInvoice = Joi.object({
  customer:     Joi.string().optional(),
  customerName: Joi.string().max(100).optional(),
  invoiceDate:  Joi.date().required(),
  dueDate:      Joi.date().required(),
  lines:        Joi.array().items(Joi.object({
    description: Joi.string().max(500).optional(),
    quantity:    Joi.number().positive().required(),
    unitPrice:   Joi.number().min(0).required(),
    amount:      Joi.number().min(0).optional(),
    taxRate:     Joi.number().min(0).max(100).default(0)
  })).min(1).required(),
  notes:  Joi.string().max(1000).allow('').optional(),
  status: Joi.string().valid('draft', 'sent').default('draft')
}).unknown(true);

exports.createJournalEntry = Joi.object({
  date:        Joi.date().required(),
  description: Joi.string().max(500).required(),
  lines:       Joi.array().items(Joi.object({
    accountCode: Joi.string().optional(),
    description: Joi.string().max(500).optional(),
    debit:       Joi.number().min(0).default(0),
    credit:      Joi.number().min(0).default(0)
  })).min(2).required(),
  status: Joi.string().valid('draft', 'posted').default('draft')
}).unknown(true);
