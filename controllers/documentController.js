const Document = require('../models/Document');
const Student  = require('../models/Student');
const { deleteFromCloudinary } = require('../services/cloudinaryService');
const { createNotification }   = require('../services/notificationService');
const { sendSuccess, createError } = require('../utils/helpers');

const getIo = (req) => req.app.get('io');

/**
 * @desc  Upload a document for a student
 * @route POST /api/documents/upload
 * @access Admin, Agent
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return next(createError('No file uploaded', 400));

    const { studentId, documentType } = req.body;
    if (!studentId)    return next(createError('studentId is required', 400));
    if (!documentType) return next(createError('documentType is required', 400));

    const student = await Student.findById(studentId).populate('leadId');
    if (!student) return next(createError('Student not found', 404));

    const doc = await Document.create({
      studentId,
      documentType,
      fileUrl:    req.file.path,          // Cloudinary URL
      publicId:   req.file.filename,      // Cloudinary public_id
      uploadedBy: req.user._id,
      organizationId: req.user.organizationId,
    });

    // Notify assigned agent
    const assignedAgent = student.leadId?.assignedAgent;
    if (assignedAgent) {
      await createNotification({
        userId:  assignedAgent,
        message: `A new document (${documentType}) was uploaded for student ${studentId}`,
        type:    'Document Uploaded',
        relatedEntity: { entityType: 'Document', entityId: doc._id },
        io:      getIo(req),
        organizationId: req.user.organizationId,
      });
    }

    return sendSuccess(res, 201, 'Document uploaded successfully', { document: doc });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get all documents for a student
 * @route GET /api/documents/student/:id
 * @access Admin, Agent
 */
const getDocumentsByStudent = async (req, res, next) => {
  try {
    const docs = await Document.find({ studentId: req.params.id })
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 });

    return sendSuccess(res, 200, 'Documents fetched', { documents: docs, count: docs.length });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete a document
 * @route DELETE /api/documents/:id
 * @access Admin, Agent
 */
const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return next(createError('Document not found', 404));

    // Delete from Cloudinary
    await deleteFromCloudinary(doc.publicId);

    await doc.deleteOne();

    return sendSuccess(res, 200, 'Document deleted', { document: doc });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadDocument, getDocumentsByStudent, deleteDocument };
