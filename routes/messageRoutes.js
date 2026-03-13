const express  = require('express');
const router   = express.Router();

const { sendMessage, getMessages } = require('../controllers/messageController');
const { protect, authorize }       = require('../middleware/authMiddleware');
const { messageValidators }        = require('../validators/validators');
const validate                     = require('../middleware/validateMiddleware');

router.use(protect, authorize('admin', 'agent'));

router.post('/send',        messageValidators.sendMessage, validate, sendMessage);
router.get('/:leadId',      getMessages);

module.exports = router;
