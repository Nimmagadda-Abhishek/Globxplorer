const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
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
      unique: true,
    },

    // Current Education
    presentCourse:        { type: String, trim: true },
    presentYear:          { type: String, trim: true },
    presentCGPA:          { type: Number, min: 0, max: 10 },
    backlogHistory:       { type: Number, default: 0 },

    // Past Education
    tenthPercentage:      { type: Number, min: 0, max: 100 },
    twelfthPercentage:    { type: Number, min: 0, max: 100 },
    undergraduateCGPA:    { type: Number, min: 0, max: 10 },

    // English Test
    englishTest: {
      type: { type: String, enum: ['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'None'] },
      score: Number,
    },

    // Study Abroad Preferences
    preferredCountry:  { type: String, trim: true },
    preferredCourse:   { type: String, trim: true },
    preferredIntake:   { type: String, trim: true },

    // Application Status
    visaStatus: {
      type: String,
      enum: ['Not Applied', 'Applied', 'Approved', 'Rejected'],
      default: 'Not Applied',
    },
    applicationStatus: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Submitted', 'Accepted', 'Rejected'],
      default: 'Not Started',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);