const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  email:        { type: String, required: true, lowercase: true },
  role:         { type: String, enum: ['admin', 'accountant', 'viewer'], default: 'accountant' },
  token:        { type: String, required: true, unique: true },
  invitedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt:    { type: Date, required: true },
  acceptedAt:   { type: Date }
}, { timestamps: true });

inviteSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('Invite', inviteSchema);
