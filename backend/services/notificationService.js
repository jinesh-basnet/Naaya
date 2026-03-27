const Notification = require('../models/Notification');
const User = require('../models/User');
const webpush = require('web-push');

// we use this to identify our server to the push services
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@naaya.com.np',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// simplify notification logic
const notificationService = {
  // core trigger for notifications
  async trigger(data) {
    try {
      const { recipientId, senderId, type, title, message, extraData = {} } = data;

      // don't notify yourself
      if (recipientId === senderId) return null;

      const recipient = await User.findById(recipientId);
      if (!recipient || !recipient.isActive) return null;

      const notification = await Notification.createNotification({
        recipient: recipientId,
        sender: senderId,
        type,
        title,
        message,
        data: extraData
      });

      console.log(`[notifications] new ${type} for user: ${recipientId}`);

      // send via socket if connected
      if (global.io) {
        global.io.to(`user:${recipientId}`).emit('notification', notification);
      }

      // finally, send web-push notifications if the user has any subscriptions
      if (recipient.pushSubscriptions?.length > 0 && recipient.notificationPreferences?.pushNotifications) {
        const payload = JSON.stringify({
          title,
          body: message,
          icon: '/logo.png', // you can update this later
          data: { url: `/posts/${extraData.postId || ''}`, ...extraData }
        });

        // let's try pushing to all their registered devices
        recipient.pushSubscriptions.forEach(async (sub) => {
          try {
            await webpush.sendNotification(sub, payload);
          } catch (err) {
            // if the push failed (e.g. 410 Gone - subscription expired)
            // we should probably remove this subscription to keep things clean
            if (err.statusCode === 410 || err.statusCode === 404) {
              console.log(`[push] removing dead sub for user: ${recipientId}`);
              await User.findByIdAndUpdate(recipientId, {
                $pull: { pushSubscriptions: { endpoint: sub.endpoint } }
              });
            } else {
              console.error(`[push] error for user ${recipientId}:`, err.message);
            }
          }
        });
      }

      return notification;
    } catch (error) {
      console.error('[notifications] error:', error.message);
      return null;
    }
  },


  // helpers for common actions
  async like(postId, likerId, authorId) {
    return this.trigger({
      recipientId: authorId,
      senderId: likerId,
      type: 'like',
      title: 'New Like',
      message: 'Someone liked your post',
      extraData: { postId }
    });
  },

  async comment(postId, commenterId, authorId, commentId) {
    return this.trigger({
      recipientId: authorId,
      senderId: commenterId,
      type: 'comment',
      title: 'New Comment',
      message: 'Someone commented on your post',
      extraData: { postId, commentId }
    });
  },

  async follow(followerId, followingId) {
    return this.trigger({
      recipientId: followingId,
      senderId: followerId,
      type: 'follow',
      title: 'New Follower',
      message: 'Someone started following you'
    });
  },

  async message(recipientId, senderId, messageId, preview) {
    const shortPreview = preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
    return this.trigger({
      recipientId,
      senderId,
      type: 'message',
      title: 'New Message',
      message: shortPreview,
      extraData: { messageId }
    });
  }
};

module.exports = notificationService;

