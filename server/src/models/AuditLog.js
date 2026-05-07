const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  org:        { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:     { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'INVITE_SENT', 'PLAN_CHANGED'], required: true },
  resource:   { type: String, required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  meta:       { type: mongoose.Schema.Types.Mixed },
  ip:         { type: String }
}, { timestamps: true });

schema.index({ org: 1, createdAt: -1 });
schema.index({ org: 1, user: 1 });

module.exports = mongoose.model('AuditLog', schema);
