const router = require('express').Router();
const ctrl   = require('../controllers/billingController');
const { isAuthenticated, requireOrg, ownerOnly } = require('../middleware/auth');

// Stripe webhook — raw body, no auth
router.post('/webhook', ctrl.handleWebhook);

// All other billing routes need auth + org context
router.use(isAuthenticated, requireOrg);
router.get('/status',          ctrl.getStatus);
router.post('/checkout',       ownerOnly, ctrl.createCheckoutSession);
router.post('/portal',         ownerOnly, ctrl.createPortalSession);

module.exports = router;
