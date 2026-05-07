const mongoose = require('mongoose');

// Roles: owner > admin > accountant > viewer
const ROLES = ['owner', 'admin', 'accountant', 'viewer'];

const membershipSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  role:         { type: String, enum: ROLES, default: 'viewer' },
  invitedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedAt:   { type: Date }
}, { timestamps: true });

membershipSchema.index({ user: 1, organization: 1 }, { unique: true });

membershipSchema.statics.ROLES = ROLES;

membershipSchema.methods.canWrite = function() {
  return ['owner', 'admin', 'accountant'].includes(this.role);
};
membershipSchema.methods.canAdmin = function() {
  return ['owner', 'admin'].includes(this.role);
};

module.exports = mongoose.model('Membership', membershipSchema);
