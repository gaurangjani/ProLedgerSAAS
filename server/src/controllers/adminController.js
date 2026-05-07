const User         = require('../models/User');
const Organization = require('../models/Organization');
const Membership   = require('../models/Membership');
const AuditLog     = require('../models/AuditLog');
const {
  Invoice, Bill, Project, ExpenseClaim
} = require('../models/accounting');

// ── Platform Stats ────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalOrgs, activeOrgs, freeOrgs, proOrgs, enterpriseOrgs,
      totalUsers, verifiedUsers, superAdmins,
      totalInvoices, totalProjects, totalClaims
    ] = await Promise.all([
      Organization.countDocuments({}),
      Organization.countDocuments({ isActive: true }),
      Organization.countDocuments({ plan: 'free' }),
      Organization.countDocuments({ plan: 'pro' }),
      Organization.countDocuments({ plan: 'enterprise' }),
      User.countDocuments({}),
      User.countDocuments({ isEmailVerified: true }),
      User.countDocuments({ isSuperAdmin: true }),
      Invoice.countDocuments({}),
      Project.countDocuments({}),
      ExpenseClaim.countDocuments({})
    ]);

    res.json({
      success: true,
      data: {
        orgs:    { total: totalOrgs, active: activeOrgs, free: freeOrgs, pro: proOrgs, enterprise: enterpriseOrgs },
        users:   { total: totalUsers, verified: verifiedUsers, superAdmins },
        content: { invoices: totalInvoices, projects: totalProjects, expenseClaims: totalClaims }
      }
    });
  } catch (err) { next(err); }
};

// ── Organisations ─────────────────────────────────────
exports.listOrgs = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip  = (page - 1) * limit;
    const filter = {};
    if (req.query.plan) filter.plan = req.query.plan;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const [orgs, total] = await Promise.all([
      Organization.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('owner', 'name email').lean(),
      Organization.countDocuments(filter)
    ]);

    const memberCounts = await Promise.all(
      orgs.map(o => Membership.countDocuments({ organization: o._id }))
    );
    const invoiceCounts = await Promise.all(
      orgs.map(o => Invoice.countDocuments({ org: o._id }))
    );

    const data = orgs.map((o, i) => ({
      ...o,
      memberCount:  memberCounts[i],
      invoiceCount: invoiceCounts[i]
    }));

    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.getOrg = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id).populate('owner', 'name email').lean();
    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });
    const [members, invoiceCount, projectCount] = await Promise.all([
      Membership.find({ organization: org._id }).populate('user', 'name email isEmailVerified').lean(),
      Invoice.countDocuments({ org: org._id }),
      Project.countDocuments({ org: org._id })
    ]);
    res.json({ success: true, data: { ...org, members, invoiceCount, projectCount } });
  } catch (err) { next(err); }
};

exports.updateOrg = async (req, res, next) => {
  try {
    const allowed = ['plan', 'planLimits', 'isActive'];
    const update = {};
    for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
    const org = await Organization.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
};

exports.suspendOrg = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });
    org.isActive = !org.isActive;
    await org.save();
    res.json({ success: true, data: org, message: `Organisation ${org.isActive ? 'activated' : 'suspended'}` });
  } catch (err) { next(err); }
};

// ── Users ─────────────────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip  = (page - 1) * limit;
    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { name:  { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.verified === 'true')  filter.isEmailVerified = true;
    if (req.query.verified === 'false') filter.isEmailVerified = false;

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter)
    ]);

    const orgCounts = await Promise.all(
      users.map(u => Membership.countDocuments({ user: u._id }))
    );
    const data = users.map((u, i) => ({ ...u, orgCount: orgCounts[i] }));

    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const memberships = await Membership.find({ user: user._id })
      .populate('organization', 'name plan isActive').lean();
    res.json({ success: true, data: { ...user, memberships } });
  } catch (err) { next(err); }
};

exports.forceVerifyEmail = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isEmailVerified: true }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user, message: 'Email verified' });
  } catch (err) { next(err); }
};

exports.toggleSuperAdmin = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot modify your own super-admin status' });
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isSuperAdmin = !user.isSuperAdmin;
    await user.save();
    res.json({ success: true, data: user, message: `Super-admin ${user.isSuperAdmin ? 'granted' : 'revoked'}` });
  } catch (err) { next(err); }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot deactivate yourself' });
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: user, message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
  } catch (err) { next(err); }
};

// ── Platform Audit Log ────────────────────────────────
exports.getPlatformAuditLog = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;
    const filter = {};
    if (req.query.action)   filter.action   = req.query.action;
    if (req.query.resource) filter.resource = req.query.resource;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'name email')
        .populate('org', 'name plan')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({ success: true, data: logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};
