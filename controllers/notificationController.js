const Notification = require('../models/Notification');
const { sendSuccess, createError } = require('../utils/helpers');

/**
 * @desc  Get all notifications for logged-in user
 * @route GET /api/notifications
 * @access Admin, Agent
 */
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    return sendSuccess(res, 200, 'Notifications fetched', {
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Mark notifications as read (all or specific ids)
 * @route PUT /api/notifications/read
 * @access Admin, Agent
 */
const markAsRead = async (req, res, next) => {
  try {
    const { ids } = req.body; // optional array of notification IDs

    const filter = { userId: req.user._id, isRead: false };
    if (ids && Array.isArray(ids) && ids.length > 0) {
      filter._id = { $in: ids };
    }

    const result = await Notification.updateMany(filter, { isRead: true });

    return sendSuccess(res, 200, `${result.modifiedCount} notification(s) marked as read`);
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAsRead };
