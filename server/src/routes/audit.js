const router = require('express').Router();
const ctrl   = require('../controllers/auditController');
const { isAuthenticated, requireOrg, canAdmin } = require('../middleware/auth');

router.use(isAuthenticated, requireOrg, canAdmin);
router.get('/', ctrl.list);

module.exports = router;
