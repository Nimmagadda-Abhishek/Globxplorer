const express  = require('express');
const router   = express.Router();

const { createStudent, getStudentById, updateStudent, getStudents, getStudentByLeadId } = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin', 'agent'));

router.get('/',               getStudents);
router.post('/',              createStudent);
router.get('/lead/:leadId',   getStudentByLeadId);
router.get('/:id',            getStudentById);
router.put('/:id',            updateStudent);

module.exports = router;
