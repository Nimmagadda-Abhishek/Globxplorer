const Notification = require('../models/Notification');
const User = require('../models/User'); // Need User model for email
const { sendEmail } = require('./emailService');

/**
 * Create a notification and emit it via Socket.io if the user is connected.
 *
 * @param {object} params
 * @param {string} params.userId        - Recipient user ID
 * @param {string} params.message       - Notification message
 * @param {string} params.type          - Notification type enum
 * @param {object} [params.relatedEntity] - { entityType, entityId }
 * @param {object} [params.io]          - Socket.io server instance
 * @param {object} [params.organizationId]
 * @param {boolean} [params.sendEmailNotification] - Whether to also send an email
 */
const createNotification = async ({
  userId,
  message,
  type,
  relatedEntity = {},
  io = null,
  organizationId = null,
  sendEmailNotification = true,
}) => {
  try {
    const notification = await Notification.create({
      userId,
      message,
      type,
      relatedEntity,
      organizationId,
    });

    // Emit real-time event if Socket.io is available
    if (io) {
      io.to(userId.toString()).emit('notification', notification);
    }

    // Send email if requested
    if (sendEmailNotification) {
      const user = await User.findById(userId).select('email name');
      if (user && user.email) {
        try {
          await sendEmail({
            email: user.email,
            subject: `[${type}] ${message.substring(0, 50)}...`,
            message: message,
            html: `<h3>Notification</h3><p>${message}</p>`
          });
        } catch (emailError) {
          console.error('❌  Notification email error:', emailError.message);
        }
      }
    }

    return notification;
  } catch (error) {
    console.error('Notification service error:', error.message);
  }
};

module.exports = { createNotification };
