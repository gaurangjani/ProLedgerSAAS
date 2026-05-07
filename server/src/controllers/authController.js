const User         = require('../models/User');
const Organization = require('../models/Organization');
const Membership   = require('../models/Membership');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, orgName } = req.body;
    if (!name || !email || !password || !orgName)
      return res.status(400).json({ success: false, message: 'name, email, password and orgName are required' });

    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ success: false, message: 'Email already registered' });

    // Create user
    const user = await User.create({ name, email, password });

    // Create organisation
    let slug = Organization.generateSlug(orgName);
    // Ensure slug uniqueness
    const existing = await Organization.findOne({ slug });
    if (existing) slug = slug + '-' + Date.now();

    const org = await Organization.create({ name: orgName, slug, owner: user._id });

    // Create owner membership
    await Membership.create({ user: user._id, organization: org._id, role: 'owner', acceptedAt: new Date() });

    // Set active org
    user.activeOrg = org._id;
    await user.save();

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json({ success: true, data: { user: user.toSafeObject(), org } });
    });
  } catch (err) { next(err); }
};

exports.login = (req, res, next) => {
  const passport = require('../config/passport');
  passport.authenticate('local', async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ success: false, message: info?.message || 'Invalid credentials' });
    req.login(user, async (err2) => {
      if (err2) return next(err2);
      // Load active org info
      let org = null;
      if (user.activeOrg) org = await Organization.findById(user.activeOrg).lean();
      res.json({ success: true, data: { user: user.toSafeObject(), org } });
    });
  })(req, res, next);
};

exports.logout = (req, res) => {
  req.logout(() => res.json({ success: true, message: 'Logged out' }));
};

exports.me = async (req, res) => {
  const org = req.user.activeOrg
    ? await Organization.findById(req.user.activeOrg).lean()
    : null;
  const memberships = await Membership.find({ user: req.user._id })
    .populate('organization', 'name slug plan').lean();
  res.json({ success: true, data: { user: req.user.toSafeObject(), org, memberships } });
};

exports.switchOrg = async (req, res, next) => {
  try {
    const { orgId } = req.body;
    const membership = await Membership.findOne({ user: req.user._id, organization: orgId });
    if (!membership) return res.status(403).json({ success: false, message: 'Not a member of this organisation' });
    req.user.activeOrg = orgId;
    await req.user.save();
    const org = await Organization.findById(orgId).lean();
    res.json({ success: true, data: { org } });
  } catch (err) { next(err); }
};

exports.acceptInvite = async (req, res, next) => {
  try {
    const { token, name, password } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

    const Invite = require('../models/Invite');
    const invite = await Invite.findOne({ token });
    if (!invite) return res.status(404).json({ success: false, message: 'Invalid or expired invite' });
    if (invite.isExpired()) return res.status(400).json({ success: false, message: 'Invite has expired' });
    if (invite.acceptedAt) return res.status(400).json({ success: false, message: 'Invite has already been used' });

    let user = await User.findOne({ email: invite.email });
    if (!user) {
      if (!name || !password) return res.status(400).json({ success: false, message: 'name and password are required for new accounts' });
      if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      user = await User.create({ name, email: invite.email, password });
    }

    const existing = await Membership.findOne({ user: user._id, organization: invite.organization });
    if (!existing) {
      await Membership.create({ user: user._id, organization: invite.organization, role: invite.role, acceptedAt: new Date() });
    }

    invite.acceptedAt = new Date();
    await invite.save();

    user.activeOrg = invite.organization;
    await user.save();

    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ success: true, message: 'Invite accepted. You are now logged in.' });
    });
  } catch (err) { next(err); }
};

const crypto = require('crypto');

// In-memory store for reset tokens (use Redis/DB in production)
const resetTokens = new Map();

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return 200 to prevent email enumeration
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, { userId: user._id.toString(), expiresAt: Date.now() + 3600000 });

    const resetUrl = `${process.env.APP_URL || 'http://localhost:8080'}/reset-password?token=${token}`;
    // In production: send email here
    console.log(`Password reset link for ${email}: ${resetUrl}`);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.', _devResetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const record = resetTokens.get(token);
    if (!record || Date.now() > record.expiresAt) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    const user = await User.findById(record.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = password;
    await user.save();
    resetTokens.delete(token);

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) { next(err); }
};
