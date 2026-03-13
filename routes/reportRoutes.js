const express  = require('express');
const router   = express.Router();

const { getDashboard, getAgentDashboard } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard',       authorize('admin'), getDashboard);
router.get('/agent-dashboard', authorize('agent', 'admin'), getAgentDashboard);

module.exports = router;
