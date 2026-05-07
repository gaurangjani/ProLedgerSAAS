const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/register',        ctrl.register);
router.post('/login',           ctrl.login);
router.post('/logout',          ctrl.logout);
router.get('/me',               isAuthenticated, ctrl.me);
router.post('/switch-org',      isAuthenticated, ctrl.switchOrg);
router.post('/accept-invite',   ctrl.acceptInvite);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);

module.exports = router;
