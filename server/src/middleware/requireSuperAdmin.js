function requireSuperAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (!req.user.isSuperAdmin) return res.status(403).json({ success: false, message: 'Super-admin access required' });
  next();
}

module.exports = requireSuperAdmin;
