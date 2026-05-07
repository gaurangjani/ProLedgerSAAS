const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  slug:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  plan:     { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  planLimits: {
    maxUsers:    { type: Number, default: 3 },
    maxInvoices: { type: Number, default: 50 },
    maxProjects: { type: Number, default: 5 }
  },

  // Stripe billing
  stripeCustomerId:     { type: String },
  stripeSubscriptionId: { type: String },
  billingCycleEnd:      { type: Date },

  // Company profile
  address:     { type: String },
  phone:       { type: String },
  website:     { type: String },
  vatNumber:   { type: String },
  currency:    { type: String, default: 'GBP' },
  fiscalYearEnd: { type: String, default: '03-31' }, // MM-DD

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

organizationSchema.statics.generateSlug = function(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
};

module.exports = mongoose.model('Organization', organizationSchema);
