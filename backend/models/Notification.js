const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'like',
      'comment',
      'follow',
      'mention',
      'message',
      'story_reply',
      'post_shared',
      'post_saved',
      'system'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    postId: mongoose.Schema.Types.ObjectId,
    commentId: mongoose.Schema.Types.ObjectId,
    storyId: mongoose.Schema.Types.ObjectId,
    messageId: mongoose.Schema.Types.ObjectId,
    metadata: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  pushSent: {
    type: Boolean,
    default: false
  },
  pushSentAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// Static method to handle creation and population in one go
notificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    await notification.save();
    
    // We usually want the sender's info for the UI
    await notification.populate('sender', 'username fullName profilePicture');
    
    return notification;
  } catch (err) {
    console.error('Failed to save notification:', err.message);
    return null; // Don't crash the whole process
  }
};

// Get notifications for a user with some basic pagination
notificationSchema.statics.getUserNotifications = async function(userId, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;
    
    const notifications = await this.find({ recipient: userId })
      .populate('sender', 'username fullName profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await this.countDocuments({ recipient: userId });
    const unread = await this.countDocuments({ recipient: userId, isRead: false });

    return {
      notifications,
      total,
      unreadCount: unread,
      pages: Math.ceil(total / limit)
    };
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    return { notifications: [], total: 0, unreadCount: 0, pages: 0 };
  }
};

notificationSchema.statics.markAsRead = async function(notificationId, userId) {
  try {
    const notification = await this.findOneAndUpdate(
      { 
        _id: notificationId, 
        recipient: userId,
        isRead: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  try {
    const result = await this.updateMany(
      { 
        recipient: userId,
        isRead: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  try {
    return await this.countDocuments({ 
      recipient: userId, 
      isRead: false 
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
