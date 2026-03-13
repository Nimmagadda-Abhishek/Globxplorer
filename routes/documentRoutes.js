const express = require('express');
const router  = express.Router();

const { uploadDocument, getDocumentsByStudent, deleteDocument } = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect, authorize('admin', 'agent'));

// Upload: multer is applied per-route so we can use studentId from body
router.post('/upload',          upload.single('file'), uploadDocument);
router.get('/student/:id',      getDocumentsByStudent);
router.delete('/:id',           deleteDocument);

module.exports = router;
