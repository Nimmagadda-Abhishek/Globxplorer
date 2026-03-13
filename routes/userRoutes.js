const express  = require('express');
const router   = express.Router();

const { createAgent, getAgents, updateAgent, deactivateAgent } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { userValidators }     = require('../validators/validators');
const validate               = require('../middleware/validateMiddleware');

router.use(protect, authorize('admin')); // All user routes: admin only

router.post('/create-agent', userValidators.createAgent, validate, createAgent);
router.get('/',              getAgents);
router.put('/:id',           userValidators.updateAgent, validate, updateAgent);
router.delete('/:id',        deactivateAgent);

module.exports = router;
