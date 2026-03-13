const { body } = require('express-validator');

const authValidators = {
  login: [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  register: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
};

const userValidators = {
  createAgent: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  updateAgent: [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('status')
      .optional()
      .isIn(['active', 'inactive'])
      .withMessage('Status must be active or inactive'),
  ],
};

const leadValidators = {
  createLead: [
    body('name').trim().notEmpty().withMessage('Lead name is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('leadSource')
      .optional()
      .isIn(['Website', 'Referral', 'Social Media', 'Walk-in', 'Advertisement', 'Other'])
      .withMessage('Invalid lead source'),
  ],
  updateLead: [
    body('status')
      .optional()
      .isIn([
        'New Lead', 'Contacted', 'Interested', 'Documents Pending',
        'Application Submitted', 'Visa Process', 'Converted', 'Rejected',
      ])
      .withMessage('Invalid status value'),
    body('followUpDate')
      .optional()
      .isISO8601()
      .withMessage('followUpDate must be a valid ISO date'),
  ],
};

const messageValidators = {
  sendMessage: [
    body('leadId').isMongoId().withMessage('Valid leadId is required'),
    body('message').trim().notEmpty().withMessage('Message content is required'),
    body('type')
      .optional()
      .isIn(['text', 'template', 'media'])
      .withMessage('Invalid message type'),
  ],
};

module.exports = { authValidators, userValidators, leadValidators, messageValidators };
