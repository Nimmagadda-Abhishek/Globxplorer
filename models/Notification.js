const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'New Lead Assigned',
  'Follow-up Reminder',
  'Document Uploaded',
  'Lead Status Updated',
  'Agent Registration',
];

const notificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedEntity: {
      entityType: { type: String }, // 'Lead', 'Student', 'Document'
      entityId:   { type: mongoose.Schema.Types.ObjectId },
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
