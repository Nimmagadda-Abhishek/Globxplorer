const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    senderId: {
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
      enum: ['text', 'template', 'media'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed'],
      default: 'sent',
    },
    whatsappMessageId: {
      type: String,
      default: null,
    },
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

module.exports = mongoose.model('Message', messageSchema);
