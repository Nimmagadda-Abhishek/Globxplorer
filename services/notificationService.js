const Notification = require('../models/Notification');

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
 */
const createNotification = async ({
  userId,
  message,
  type,
  relatedEntity = {},
  io = null,
  organizationId = null,
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

    return notification;
  } catch (error) {
    console.error('Notification service error:', error.message);
  }
};

module.exports = { createNotification };
