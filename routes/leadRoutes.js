const express = require('express');
const router = express.Router();

const { createLead, getAllLeads, getLeadById, updateLead, deleteLead, bulkUploadLeads } = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { leadValidators } = require('../validators/validators');
const validate = require('../middleware/validateMiddleware');
const multer = require('multer');

// Configure multer for memory storage for bulk upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.use(protect); // All lead routes require auth

router.post('/', authorize('admin', 'agent'), leadValidators.createLead, validate, createLead);
router.post('/bulk-upload', authorize('admin', 'agent'), upload.single('file'), bulkUploadLeads);
router.get('/', authorize('admin', 'agent'), getAllLeads);
router.get('/:id', authorize('admin', 'agent'), getLeadById);
router.put('/:id', authorize('admin', 'agent'), leadValidators.updateLead, validate, updateLead);
router.delete('/:id', authorize('admin'), deleteLead);

module.exports = router;