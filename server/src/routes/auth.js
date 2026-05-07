const router   = require('express').Router();
const ctrl     = require('../controllers/authController');
const validate = require('../middleware/validate');
const s        = require('../validation/schemas');
const { isAuthenticated } = require('../middleware/auth');

router.post('/register',        validate(s.register),        ctrl.register);
router.post('/login',           validate(s.login),           ctrl.login);
router.post('/logout',                                        ctrl.logout);
router.get('/me',               isAuthenticated,             ctrl.me);
router.post('/switch-org',      isAuthenticated,             ctrl.switchOrg);
router.post('/accept-invite',   validate(s.acceptInvite),    ctrl.acceptInvite);
router.post('/forgot-password',    validate(s.forgotPassword),  ctrl.forgotPassword);
router.post('/reset-password',     validate(s.resetPassword),   ctrl.resetPassword);
router.get('/verify-email',                                      ctrl.verifyEmail);
router.post('/resend-verification', isAuthenticated,             ctrl.resendVerification);

module.exports = router;
