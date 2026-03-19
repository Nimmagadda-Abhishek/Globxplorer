const express = require('express');
const router = express.Router();

const { 
  createFollowUp, 
  getAllFollowUps,
  getFollowUpsByLead, 
  updateFollowUp, 
  deleteFollowUp 
} = require('../controllers/followUpController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { followUpValidators } = require('../validators/validators');
const validate = require('../middleware/validateMiddleware');

router.use(protect); // All follow-up routes require auth

router.post('/', authorize('admin', 'agent'), followUpValidators.createFollowUp, validate, createFollowUp);
router.get('/', authorize('admin', 'agent'), getAllFollowUps);
router.get('/lead/:leadId', authorize('admin', 'agent'), getFollowUpsByLead);
router.put('/:id', authorize('admin', 'agent'), followUpValidators.updateFollowUp, validate, updateFollowUp);
router.delete('/:id', authorize('admin'), deleteFollowUp);

module.exports = router;
