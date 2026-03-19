const express = require('express');
const router  = express.Router();

const { uploadDocument, getDocumentsByStudent, deleteDocument, getAllDocuments } = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect, authorize('admin', 'agent'));

router.get('/',                 getAllDocuments);
router.post('/upload',          upload.single('file'), uploadDocument);
router.get('/student/:id',      getDocumentsByStudent);
router.delete('/:id',           deleteDocument);

module.exports = router;
