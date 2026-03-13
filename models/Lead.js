const mongoose = require('mongoose');

const LEAD_STATUSES = [
  'New Lead',
  'Contacted',
  'Interested',
  'Documents Pending',
  'Application Submitted',
  'Visa Process',
  'Converted',
  'Rejected',
];

const noteSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
    },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    leadSource: {
      type: String,
      enum: ['Website', 'Referral', 'Social Media', 'Walk-in', 'Advertisement', 'Other'],
      default: 'Other',
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: 'New Lead',
    },
    followUpDate: { type: Date, default: null },
    notes: [noteSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

leadSchema.index({ organizationId: 1, status: 1 });
leadSchema.index({ assignedAgent: 1 });

module.exports = mongoose.model('Lead', leadSchema);