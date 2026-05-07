const Membership = require('../models/Membership');
const Organization = require('../models/Organization');

// Must be logged in
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({ success: false, message: 'Authentication required' });
}

// Attach req.org and req.membership from the user's activeOrg
async function requireOrg(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const orgId = req.headers['x-org-id'] || req.user.activeOrg;
    if (!orgId) return res.status(403).json({ success: false, message: 'No active organisation. Please complete onboarding.' });

    const [org, membership] = await Promise.all([
      Organization.findById(orgId),
      Membership.findOne({ user: req.user._id, organization: orgId })
    ]);

    if (!org || !org.isActive)  return res.status(404).json({ success: false, message: 'Organisation not found' });
    if (!membership)            return res.status(403).json({ success: false, message: 'You are not a member of this organisation' });

    req.org        = org;
    req.orgId      = org._id;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

// Role guard factory — requireRole('admin') or requireRole('accountant', 'admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.membership) return res.status(403).json({ success: false, message: 'Organisation context missing' });
    if (!roles.includes(req.membership.role)) {
      return res.status(403).json({ success: false, message: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

// Shorthand guards
const canWrite = requireRole('owner', 'admin', 'accountant');
const canAdmin = requireRole('owner', 'admin');
const ownerOnly = requireRole('owner');

module.exports = { isAuthenticated, requireOrg, requireRole, canWrite, canAdmin, ownerOnly };
