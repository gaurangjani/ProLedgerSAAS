const Organization = require('../models/Organization');
const Membership   = require('../models/Membership');
const Invite       = require('../models/Invite');
const User         = require('../models/User');
const crypto       = require('crypto');

// GET /orgs/current
exports.getCurrent = async (req, res) => {
  const memberCount = await Membership.countDocuments({ organization: req.orgId });
  res.json({ success: true, data: { ...req.org.toObject(), memberCount } });
};

// PUT /orgs/current
exports.update = async (req, res, next) => {
  try {
    const { name, address, phone, website, vatNumber, currency, fiscalYearEnd } = req.body;
    Object.assign(req.org, { name, address, phone, website, vatNumber, currency, fiscalYearEnd });
    await req.org.save();
    res.json({ success: true, data: req.org });
  } catch (err) { next(err); }
};

// GET /orgs/current/members
exports.getMembers = async (req, res) => {
  const members = await Membership.find({ organization: req.orgId })
    .populate('user', 'name email lastLoginAt createdAt').lean();
  res.json({ success: true, data: members });
};

// PUT /orgs/current/members/:userId  — change role
exports.updateMember = async (req, res, next) => {
  try {
    const { role } = req.body;
    const m = await Membership.findOne({ organization: req.orgId, user: req.params.userId });
    if (!m) return res.status(404).json({ success: false, message: 'Member not found' });
    if (m.role === 'owner') return res.status(400).json({ success: false, message: 'Cannot change owner role' });
    m.role = role;
    await m.save();
    res.json({ success: true, data: m });
  } catch (err) { next(err); }
};

// DELETE /orgs/current/members/:userId
exports.removeMember = async (req, res, next) => {
  try {
    const m = await Membership.findOne({ organization: req.orgId, user: req.params.userId });
    if (!m) return res.status(404).json({ success: false, message: 'Member not found' });
    if (m.role === 'owner') return res.status(400).json({ success: false, message: 'Cannot remove the owner' });
    await m.deleteOne();
    res.json({ success: true, message: 'Member removed' });
  } catch (err) { next(err); }
};

// POST /orgs/current/invites
exports.createInvite = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    // Check plan limit
    const memberCount = await Membership.countDocuments({ organization: req.orgId });
    const limit = req.org.planLimits.maxUsers;
    if (memberCount >= limit)
      return res.status(403).json({ success: false, message: `Plan limit reached (${limit} users). Upgrade to add more members.` });

    const token = crypto.randomBytes(32).toString('hex');
    const invite = await Invite.create({
      organization: req.orgId, email: email.toLowerCase(), role,
      token, invitedBy: req.user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000)
    });
    // In production, send email here with invite link
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:8080'}/accept-invite?token=${token}`;
    res.status(201).json({ success: true, data: { invite, inviteUrl } });
  } catch (err) { next(err); }
};

// POST /orgs/accept-invite
exports.acceptInvite = async (req, res, next) => {
  try {
    const { token, name, password } = req.body;
    const invite = await Invite.findOne({ token }).populate('organization');
    if (!invite || invite.isExpired() || invite.acceptedAt)
      return res.status(400).json({ success: false, message: 'Invalid or expired invite' });

    let user = await User.findOne({ email: invite.email });
    if (!user) {
      if (!name || !password) return res.status(400).json({ success: false, message: 'name and password required for new accounts' });
      user = await User.create({ name, email: invite.email, password });
    }

    await Membership.findOneAndUpdate(
      { user: user._id, organization: invite.organization._id },
      { role: invite.role, invitedBy: invite.invitedBy, acceptedAt: new Date() },
      { upsert: true, new: true }
    );

    if (!user.activeOrg) { user.activeOrg = invite.organization._id; await user.save(); }
    invite.acceptedAt = new Date();
    await invite.save();

    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ success: true, data: { user: user.toSafeObject(), org: invite.organization } });
    });
  } catch (err) { next(err); }
};

// GET /orgs/current/invites
exports.getInvites = async (req, res) => {
  const invites = await Invite.find({ organization: req.orgId, acceptedAt: null })
    .populate('invitedBy', 'name').lean();
  res.json({ success: true, data: invites });
};

// DELETE /orgs/current/invites/:id
exports.revokeInvite = async (req, res, next) => {
  try {
    await Invite.findOneAndDelete({ _id: req.params.id, organization: req.orgId });
    res.json({ success: true, message: 'Invite revoked' });
  } catch (err) { next(err); }
};

// GET /orgs/current/plan
exports.getPlan = async (req, res) => {
  const memberCount   = await Membership.countDocuments({ organization: req.orgId });
  const { Account, Invoice, Project } = require('../models/accounting');
  const [invoiceCount, projectCount] = await Promise.all([
    Invoice.countDocuments({ org: req.orgId }),
    Project.countDocuments({ org: req.orgId })
  ]);
  res.json({
    success: true,
    data: {
      plan: req.org.plan,
      limits: req.org.planLimits,
      usage: { members: memberCount, invoices: invoiceCount, projects: projectCount }
    }
  });
};
