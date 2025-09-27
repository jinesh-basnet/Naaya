const Notification = require('../models/Notification');
const User = require('../models/User');
const webpush = require('web-push');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Create and send a notification
   * @param {Object} notificationData - Notification data
   * @param {string} notificationData.recipientId - Recipient user ID
   * @param {string} notificationData.senderId - Sender user ID
   * @param {string} notificationData.type - Notification type
   * @param {string} notificationData.title - Notification title
   * @param {string} notificationData.message - Notification message
   * @param {Object} notificationData.data - Additional data
   */
  async createNotification(notificationData) {
    try {
      const { recipientId, senderId, type, title, message, data = {} } = notificationData;

      // Don't send notification to self
      if (recipientId === senderId) {
        return null;
      }

      // Check if recipient exists and is active
      const recipient = await User.findById(recipientId);
      if (!recipient || !recipient.isActive) {
        return null;
      }

      // Create notification
      const notification = await Notification.createNotification({
        recipient: recipientId,
        sender: senderId,
        type,
        title,
        message,
        data
      });

      // Send real-time notification
      this.sendRealtimeNotification(recipientId, notification);

      // Send push notification
      this.sendPushNotification(recipientId, notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send real-time notification via Socket.io
   * @param {string} userId - User ID to send notification to
   * @param {Object} notification - Notification object
   */
  sendRealtimeNotification(userId, notification) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification', notification);
    }
  }

  /**
   * Send push notification to user
   * @param {string} userId - User ID to send push notification to
   * @param {Object} notification - Notification object
   */
  async sendPushNotification(userId, notification) {
    try {
      const user = await User.findById(userId).select('pushSubscriptions notificationPreferences');

      if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
        return;
      }

      // Check notification preferences
      const preferences = user.notificationPreferences || {
        emailNotifications: true,
        pushNotifications: true,
        soundEffects: true
      };

      if (!preferences.pushNotifications) {
        return;
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        data: {
          type: notification.type,
          postId: notification.data?.postId,
          commentId: notification.data?.commentId,
          storyId: notification.data?.storyId,
          messageId: notification.data?.messageId,
          notificationId: notification._id
        },
        requireInteraction: true,
        silent: false,
        tag: `naaya-${notification.type}-${notification._id}`
      });

      // Send push notification to all user's subscriptions
      const promises = user.pushSubscriptions.map(subscription => {
        return webpush.sendNotification(subscription, payload).catch(error => {
          console.error('Error sending push notification:', error);
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 400) {
            User.findByIdAndUpdate(userId, {
              $pull: { pushSubscriptions: subscription }
            }).catch(err => console.error('Error removing invalid subscription:', err));
          }
        });
      });

      await Promise.all(promises);
      console.log(`Push notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  /**
   * Create like notification
   * @param {string} postId - Post ID
   * @param {string} likerId - User who liked the post
   * @param {string} postAuthorId - Post author ID
   */
  async createLikeNotification(postId, likerId, postAuthorId) {
    const liker = await User.findById(likerId).select('username fullName');
    
    return this.createNotification({
      recipientId: postAuthorId,
      senderId: likerId,
      type: 'like',
      title: 'New Like',
      message: `${liker.fullName} liked your post`,
      data: { postId }
    });
  }

  /**
   * Create comment notification
   * @param {string} postId - Post ID
   * @param {string} commenterId - User who commented
   * @param {string} postAuthorId - Post author ID
   * @param {string} commentId - Comment ID
   */
  async createCommentNotification(postId, commenterId, postAuthorId, commentId) {
    const commenter = await User.findById(commenterId).select('username fullName');
    
    return this.createNotification({
      recipientId: postAuthorId,
      senderId: commenterId,
      type: 'comment',
      title: 'New Comment',
      message: `${commenter.fullName} commented on your post`,
      data: { postId, commentId }
    });
  }

  /**
   * Create follow notification
   * @param {string} followerId - User who followed
   * @param {string} followingId - User being followed
   */
  async createFollowNotification(followerId, followingId) {
    const follower = await User.findById(followerId).select('username fullName');
    
    return this.createNotification({
      recipientId: followingId,
      senderId: followerId,
      type: 'follow',
      title: 'New Follower',
      message: `${follower.fullName} started following you`,
      data: {}
    });
  }

  /**
   * Create mention notification
   * @param {string} mentionedUserId - User who was mentioned
   * @param {string} mentionerId - User who mentioned
   * @param {string} postId - Post ID where mention occurred
   * @param {string} commentId - Comment ID (if mentioned in comment)
   */
  async createMentionNotification(mentionedUserId, mentionerId, postId, commentId = null) {
    const mentioner = await User.findById(mentionerId).select('username fullName');
    
    return this.createNotification({
      recipientId: mentionedUserId,
      senderId: mentionerId,
      type: 'mention',
      title: 'You were mentioned',
      message: `${mentioner.fullName} mentioned you in a ${commentId ? 'comment' : 'post'}`,
      data: { postId, commentId }
    });
  }

  /**
   * Create message notification
   * @param {string} recipientId - Message recipient
   * @param {string} senderId - Message sender
   * @param {string} messageId - Message ID
   * @param {string} messagePreview - Preview of the message
   */
  async createMessageNotification(recipientId, senderId, messageId, messagePreview) {
    const sender = await User.findById(senderId).select('username fullName');
    
    return this.createNotification({
      recipientId,
      senderId,
      type: 'message',
      title: 'New Message',
      message: `${sender.fullName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      data: { messageId }
    });
  }

  /**
   * Create story reply notification
   * @param {string} storyAuthorId - Story author ID
   * @param {string} replierId - User who replied to story
   * @param {string} storyId - Story ID
   */
  async createStoryReplyNotification(storyAuthorId, replierId, storyId) {
    const replier = await User.findById(replierId).select('username fullName');
    
    return this.createNotification({
      recipientId: storyAuthorId,
      senderId: replierId,
      type: 'story_reply',
      title: 'Story Reply',
      message: `${replier.fullName} replied to your story`,
      data: { storyId }
    });
  }

  /**
   * Create system notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} data - Additional data
   */
  async createSystemNotification(recipientId, title, message, data = {}) {
    return this.createNotification({
      recipientId,
      senderId: recipientId, // System notifications have same sender and recipient
      type: 'system',
      title,
      message,
      data
    });
  }

  /**
   * Bulk create notifications for multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notificationData - Notification data
   */
  async createBulkNotification(userIds, notificationData) {
    const notifications = [];
    
    for (const userId of userIds) {
      try {
        const notification = await this.createNotification({
          ...notificationData,
          recipientId: userId
        });
        if (notification) {
          notifications.push(notification);
        }
      } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
      }
    }
    
    return notifications;
  }
}

module.exports = NotificationService;
