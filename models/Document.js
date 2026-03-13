const mongoose = require('mongoose');

const DOCUMENT_TYPES = [
  'Passport',
  '10th Marksheet',
  '12th Marksheet',
  'Degree Certificate',
  'Transcripts',
  'Resume',
  'SOP',
  'LOR',
];

const documentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    documentType: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String, // Cloudinary public_id for future deletion
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: { createdAt: 'uploadedAt', updatedAt: false } }
);

module.exports = mongoose.model('Document', documentSchema);
