const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const webpush = require('web-push');
const notificationsController = require('../controllers/notificationsController');

const router = express.Router();

router.get('/preferences', authenticateToken, notificationsController.getPreferences);

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

router.get('/', authenticateToken, notificationsController.getNotifications);

router.put('/:notificationId/read', authenticateToken, notificationsController.markRead);

router.put('/read-all', authenticateToken, notificationsController.markAllRead);

router.get('/unread-count', authenticateToken, notificationsController.getUnreadCount);

router.delete('/clear-all', authenticateToken, notificationsController.clearAll);

router.delete('/:notificationId', authenticateToken, notificationsController.deleteNotification);

module.exports = router;

