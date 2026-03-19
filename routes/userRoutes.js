const express  = require('express');
const router   = express.Router();

const { createAgent, getAgents, updateAgent, deactivateAgent, getAgentDetails, getReferralEarnings } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { userValidators }     = require('../validators/validators');
const validate               = require('../middleware/validateMiddleware');

router.post('/create-agent',      protect, authorize('admin', 'agent'), userValidators.createAgent, validate, createAgent);
router.get('/',                   protect, authorize('admin', 'agent'), getAgents);
router.get('/referral-earnings',  protect, authorize('agent'),          getReferralEarnings);
router.get('/:id/stats',          protect, authorize('admin'),          getAgentDetails);
router.put('/:id',                protect, authorize('admin'),          userValidators.updateAgent, validate, updateAgent);
router.delete('/:id',             protect, authorize('admin'),          deactivateAgent);

module.exports = router;
