const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const webpush = require('web-push');

const router = express.Router();

// @route   GET /api/notifications/preferences
// @desc    Get notification preferences for user
// @access  Private
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('notificationPreferences');
    res.json({ preferences: user.notificationPreferences || {
      emailNotifications: true,
      pushNotifications: true,
      soundEffects: true,
    }});
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ message: 'Server error retrieving preferences' });
  }
});

// @route   PUT /api/notifications/preferences
// @desc    Update notification preferences for user
// @access  Private
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { preferences } = req.body;
    await User.findByIdAndUpdate(userId, { notificationPreferences: preferences });
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ message: 'Server error updating preferences' });
  }
});


// VAPID keys - generate your own keys and store in env variables
// To generate: npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BO29u1ck5VdSsN-rk_DadjWdFxy5eYo6oZkmXNiLQBCiboGK3WAXMiFn0V_m3bttKbJaivWTYJgQOzX1CsOM3AI',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'z6Iln9uBGGwNDIHVms2VPHrtTer3m3p7dZmg5jjoGE8'
};

// Only set VAPID details if valid keys are provided
if (vapidKeys.publicKey !== 'YOUR_PUBLIC_VAPID_KEY_HERE' && vapidKeys.privateKey !== 'YOUR_PRIVATE_VAPID_KEY_HERE') {
  try {
    // Validate key lengths (public key should be 88 chars base64url = 65 bytes decoded)
    const publicKeyLength = Buffer.from(vapidKeys.publicKey.replace(/-/g, '+').replace(/_/g, '/'), 'base64').length;
    if (publicKeyLength !== 65) {
      throw new Error(`Vapid public key should be 65 bytes long when decoded, got ${publicKeyLength} bytes`);
    }

    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    console.log('VAPID keys configured successfully for push notifications');
  } catch (error) {
    console.warn('Invalid VAPID keys provided, push notifications will not work:', error.message);
  }
} else {
  console.warn('VAPID keys not configured, push notifications will not work');
}

// POST /api/notifications/subscribe - return VAPID public key
router.post('/subscribe', authenticateToken, (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// POST /api/notifications/subscription - save subscription object
router.post('/subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = req.body;
    const userId = req.user._id;
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ message: 'Invalid subscription object' });
    }

    // Check if subscription already exists
    const existingSubscription = await User.findOne({
      _id: userId,
      'pushSubscriptions.endpoint': subscription.endpoint
    });

    if (existingSubscription) {
      return res.status(200).json({ message: 'Subscription already exists' });
    }

    // Add subscription to user
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
});

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
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
});

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
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
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', authenticateToken, async (req, res) => {
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
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', authenticateToken, async (req, res) => {
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
});

// @route   DELETE /api/notifications/:notificationId
// @desc    Delete a notification
// @access  Private
router.delete('/:notificationId', authenticateToken, async (req, res) => {
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
});

module.exports = router;
