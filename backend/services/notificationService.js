const Notification = require('../models/Notification');
const User = require('../models/User');
const webpush = require('web-push');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * 
   * @param {Object} notificationData 
   * @param {string} notificationData.recipientId 
   * @param {string} notificationData.senderId 
   * @param {string} notificationData.type 
   * @param {string} notificationData.title 
   * @param {string} notificationData.message 
   * @param {Object} notificationData.data 
   */
  async createNotification(notificationData) {
    try {
      const { recipientId, senderId, type, title, message, data = {} } = notificationData;

      if (recipientId === senderId) {
        return null;
      }

      const recipient = await User.findById(recipientId);
      if (!recipient || !recipient.isActive) {
        return null;
      }

      const notification = await Notification.createNotification({
        recipient: recipientId,
        sender: senderId,
        type,
        title,
        message,
        data
      });

      this.sendRealtimeNotification(recipientId, notification);

      this.sendPushNotification(recipientId, notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * 
   * @param {string} userId 
   * @param {Object} notification 
   */
  sendRealtimeNotification(userId, notification) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification', notification);
    }
  }

  /**
   * 
   * @param {string} userId 
   * @param {Object} notification 
   */
  async sendPushNotification(userId, notification) {
    try {
      const user = await User.findById(userId).select('pushSubscriptions notificationPreferences');

      if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
        return;
      }

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

      const promises = user.pushSubscriptions.map(subscription => {
        return webpush.sendNotification(subscription, payload).catch(error => {
          console.error('Error sending push notification:', error);
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
   *
   * @param {string} postId 
   * @param {string} likerId 
   * @param {string} postAuthorId 
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
   *
   * @param {string} postId
   * @param {string} commenterId
   * @param {string} postAuthorId
   * @param {string} commentId
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
   *
   * @param {string} postId
   * @param {string} sharerId
   * @param {string} postAuthorId
   */
  async createShareNotification(postId, sharerId, postAuthorId) {
    const sharer = await User.findById(sharerId).select('username fullName');

    return this.createNotification({
      recipientId: postAuthorId,
      senderId: sharerId,
      type: 'share',
      title: 'Post Shared',
      message: `${sharer.fullName} shared your post`,
      data: { postId }
    });
  }

  /**
   *
   * @param {string} postId
   * @param {string} saverId
   * @param {string} postAuthorId
   */
  async createSaveNotification(postId, saverId, postAuthorId) {
    const saver = await User.findById(saverId).select('username fullName');

    return this.createNotification({
      recipientId: postAuthorId,
      senderId: saverId,
      type: 'save',
      title: 'Post Saved',
      message: `${saver.fullName} saved your post`,
      data: { postId }
    });
  }

  /**
   * 
   * @param {string} followerId 
   * @param {string} followingId 
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
   * 
   * @param {string} mentionedUserId 
   * @param {string} mentionerId 
   * @param {string} postId 
   * @param {string} commentId 
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
   * 
   * @param {string} recipientId 
   * @param {string} senderId 
   * @param {string} messageId 
   * @param {string} messagePreview 
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
   * 
   * @param {string} storyAuthorId 
   * @param {string} replierId 
   * @param {string} storyId 
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
   * 
   * @param {string} recipientId 
   * @param {string} title 
   * @param {string} message 
   * @param {Object} data 
   */
  async createSystemNotification(recipientId, title, message, data = {}) {
    return this.createNotification({
      recipientId,
      senderId: recipientId, 
      type: 'system',
      title,
      message,
      data
    });
  }

  /**
   *
   * @param {Array} userIds 
   * @param {Object} notificationData 
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
