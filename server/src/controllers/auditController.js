const AuditLog = require('../models/AuditLog');

exports.list = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const filter = { org: req.orgId };
    if (req.query.action)   filter.action   = req.query.action;
    if (req.query.resource) filter.resource = req.query.resource;
    if (req.query.userId)   filter.user     = req.query.userId;

    const [data, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};
