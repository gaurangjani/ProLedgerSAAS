const router         = require('express').Router();
const c              = require('../controllers/adminController');
const { isAuthenticated } = require('../middleware/auth');
const requireSuperAdmin   = require('../middleware/requireSuperAdmin');

router.use(isAuthenticated, requireSuperAdmin);

// Platform stats
router.get('/stats',                   c.getStats);

// Organisations
router.get('/orgs',                    c.listOrgs);
router.get('/orgs/:id',                c.getOrg);
router.put('/orgs/:id',                c.updateOrg);
router.post('/orgs/:id/suspend',       c.suspendOrg);

// Users
router.get('/users',                   c.listUsers);
router.get('/users/:id',               c.getUser);
router.post('/users/:id/verify-email', c.forceVerifyEmail);
router.post('/users/:id/super-admin',  c.toggleSuperAdmin);
router.post('/users/:id/deactivate',   c.deactivateUser);

// Platform audit log
router.get('/audit',                   c.getPlatformAuditLog);

module.exports = router;
