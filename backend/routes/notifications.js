const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const webpush = require('web-push');
const notificationsController = require('../controllers/notificationsController');

const router = express.Router();

// @route   GET /api/notifications/preferences
// @desc    Get notification preferences for user
// @access  Private
router.get('/preferences', authenticateToken, notificationsController.getPreferences);

// @route   PUT /api/notifications/preferences
// @desc    Update notification preferences for user
// @access  Private
router.put('/preferences', authenticateToken, notificationsController.updatePreferences);

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BO29u1ck5VdSsN-rk_DadjWdFxy5eYo6oZkmXNiLQBCiboGK3WAXMiFn0V_m3bttKbJaivWTYJgQOzX1CsOM3AI',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'z6Iln9uBGGwNDIHVms2VPHrtTer3m3p7dZmg5jjoGE8'
};

if (vapidKeys.publicKey !== 'YOUR_PUBLIC_VAPID_KEY_HERE' && vapidKeys.privateKey !== 'YOUR_PRIVATE_VAPID_KEY_HERE') {
  try {
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

router.post('/subscribe', authenticateToken, (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

router.post('/subscription', authenticateToken, notificationsController.saveSubscription);

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', authenticateToken, notificationsController.getNotifications);

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.put('/:notificationId/read', authenticateToken, notificationsController.markRead);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', authenticateToken, notificationsController.markAllRead);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', authenticateToken, notificationsController.getUnreadCount);

// @route   DELETE /api/notifications/clear-all
// @desc    Delete all notifications for user
// @access  Private
router.delete('/clear-all', authenticateToken, notificationsController.clearAll);

// @route   DELETE /api/notifications/:notificationId
// @desc    Delete a notification
// @access  Private
router.delete('/:notificationId', authenticateToken, notificationsController.deleteNotification);

module.exports = router;
