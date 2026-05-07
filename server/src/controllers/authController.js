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
