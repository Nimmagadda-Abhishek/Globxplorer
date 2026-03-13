const express  = require('express');
const router   = express.Router();

const { getNotifications, markAsRead } = require('../controllers/notificationController');
const { protect, authorize }           = require('../middleware/authMiddleware');

router.use(protect, authorize('admin', 'agent'));

router.get('/',        getNotifications);
router.put('/read',    markAsRead);

module.exports = router;
