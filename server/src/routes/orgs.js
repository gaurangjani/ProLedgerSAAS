const router   = require('express').Router();
const ctrl     = require('../controllers/orgController');
const validate = require('../middleware/validate');
const s        = require('../validation/schemas');
const { isAuthenticated, requireOrg, canAdmin } = require('../middleware/auth');

router.use(isAuthenticated, requireOrg);

router.get('/',                             ctrl.getCurrent);
router.put('/',          canAdmin, validate(s.updateOrg), ctrl.update);

router.get('/members',                      ctrl.getMembers);
router.put('/members/:userId',   canAdmin,  ctrl.updateMember);
router.delete('/members/:userId', canAdmin, ctrl.removeMember);

router.get('/invites',                                          ctrl.getInvites);
router.post('/invites',  canAdmin, validate(s.createInvite),   ctrl.createInvite);
router.delete('/invites/:id',     canAdmin,                    ctrl.revokeInvite);

router.get('/plan',                         ctrl.getPlan);

module.exports = router;
