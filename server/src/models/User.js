const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },

  // The org the user is currently "active" in (switchable)
  activeOrg: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

  // Super-admin flag (platform-level, not org-level)
  isSuperAdmin: { type: Boolean, default: false },

  isEmailVerified: { type: Boolean, default: false },
  isActive:        { type: Boolean, default: true },
  lastLoginAt:     { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function() {
  const { password, ...obj } = this.toObject();
  return obj;
};

module.exports = mongoose.model('User', userSchema);
