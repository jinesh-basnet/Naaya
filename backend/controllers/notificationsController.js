const Notification = require('../models/Notification');
const User = require('../models/User');

exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('notificationPreferences');
    res.json({
      preferences: user.notificationPreferences || {
        emailNotifications: true,
        pushNotifications: true,
        soundEffects: true,
      }
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ message: 'Server error retrieving preferences' });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { preferences } = req.body;
    await User.findByIdAndUpdate(userId, { notificationPreferences: preferences });
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ message: 'Server error updating preferences' });
  }
};

exports.saveSubscription = async (req, res) => {
  try {
    const subscription = req.body;
    const userId = req.user._id;
    const userAgent = req.get('User-Agent') || 'Unknown';

    if (!subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ message: 'Invalid subscription object' });
    }

    const existingSubscription = await User.findOne({
      _id: userId,
      'pushSubscriptions.endpoint': subscription.endpoint
    });

    if (existingSubscription) {
      return res.status(200).json({ message: 'Subscription already exists' });
    }

    await User.findByIdAndUpdate(userId, {
      $push: {
        pushSubscriptions: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          },
          userAgent: userAgent
        }
      }
    });

    console.log(`Saved push subscription for user ${userId}`);

    res.status(201).json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Failed to save subscription' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const result = await Notification.getUserNotifications(userId, parseInt(page), parseInt(limit));

    res.json({
      message: 'Notifications retrieved successfully',
      ...result
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      message: 'Server error retrieving notifications',
      code: 'GET_NOTIFICATIONS_ERROR'
    });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.markAsRead(notificationId, userId);

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found or already read',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      message: 'Server error marking notification as read',
      code: 'MARK_NOTIFICATION_READ_ERROR'
    });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.markAllAsRead(userId);

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      message: 'Server error marking all notifications as read',
      code: 'MARK_ALL_NOTIFICATIONS_READ_ERROR'
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      message: 'Unread count retrieved successfully',
      unreadCount
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      message: 'Server error retrieving unread count',
      code: 'GET_UNREAD_COUNT_ERROR'
    });
  }
};

exports.clearAll = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ recipient: userId });

    res.json({
      message: 'All notifications cleared successfully'
    });

  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({
      message: 'Server error clearing notifications',
      code: 'CLEAR_NOTIFICATIONS_ERROR'
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      message: 'Server error deleting notification',
      code: 'DELETE_NOTIFICATION_ERROR'
    });
  }
};
