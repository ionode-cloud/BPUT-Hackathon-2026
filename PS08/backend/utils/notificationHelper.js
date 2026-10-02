const Notification = require('../models/Notification');

/**
 * Create a notification
 */
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  relatedRecord,
  triggeredBy,
  organization,
}) => {
  try {
    await Notification.create({
      recipient,
      type,
      title,
      message,
      relatedRecord,
      triggeredBy,
      organization,
    });
  } catch (err) {
    console.error('Notification creation error:', err.message);
    // Non-blocking
  }
};

/**
 * Create notifications for multiple recipients
 */
const createBulkNotifications = async (recipients, notificationData) => {
  try {
    const notifications = recipients.map((recipient) => ({
      ...notificationData,
      recipient,
    }));
    await Notification.insertMany(notifications);
  } catch (err) {
    console.error('Bulk notification error:', err.message);
  }
};

module.exports = { createNotification, createBulkNotifications };
