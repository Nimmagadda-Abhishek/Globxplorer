const express = require('express');
const router = express.Router();

const { createLead, getAllLeads, getLeadById, updateLead, deleteLead } = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { leadValidators } = require('../validators/validators');
const validate = require('../middleware/validateMiddleware');

router.use(protect); // All lead routes require auth

router.post('/', authorize('admin', 'agent'), leadValidators.createLead, validate, createLead);
router.get('/', authorize('admin', 'agent'), getAllLeads);
router.get('/:id', authorize('admin', 'agent'), getLeadById);
router.put('/:id', authorize('admin', 'agent'), leadValidators.updateLead, validate, updateLead);
router.delete('/:id', authorize('admin'), deleteLead);

module.exports = router;