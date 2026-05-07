const AuditLog = require('../models/AuditLog');

// Wraps a route to log the action after a successful response.
// Usage: router.post('/foo', canWrite, auditLog('CREATE', 'Invoice'), ctrl.createInvoice)
const auditLog = (action, resource) => (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (body?.success && req.user?._id && req.orgId) {
      AuditLog.create({
        org:        req.orgId,
        user:       req.user._id,
        action,
        resource,
        resourceId: body.data?._id || undefined,
        ip:         req.ip
      }).catch(() => {});
    }
    return originalJson(body);
  };
  next();
};

module.exports = auditLog;
