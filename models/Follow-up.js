const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    note: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    // Track sent reminder intervals (e.g., '12h', '1h', '30m', '5m', 'due')
    remindersSent: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Indexes for performance
followUpSchema.index({ leadId: 1, scheduledDate: 1 });
followUpSchema.index({ status: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);