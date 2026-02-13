const Story = require('../models/Story');
const Notification = require('../models/Notification');
const Post = require('../models/Post');

class CleanupService {
  async getCleanupStats() {
    try {
      const now = new Date();

      const expiredStories = await Story.countDocuments({
        expiresAt: { $lt: now },
        isDeleted: false
      });

      const oldNotifications = await Notification.countDocuments({
        createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
        isRead: true
      });

      const deletedPosts = await Post.countDocuments({
        isDeleted: true,
        deletedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days old deleted posts
      });

      return {
        expiredStories,
        oldNotifications,
        deletedPosts,
        totalItems: expiredStories + oldNotifications + deletedPosts
      };
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      throw error;
    }
  }

  async cleanupExpiredStories(dryRun = false) {
    try {
      const now = new Date();

      const query = {
        expiresAt: { $lt: now },
        isDeleted: false
      };

      if (dryRun) {
        const count = await Story.countDocuments(query);
        return { count, dryRun: true };
      }

      const result = await Story.updateMany(query, {
        isDeleted: true,
        deletedAt: now
      });

      return { count: result.modifiedCount, dryRun: false };
    } catch (error) {
      console.error('Error cleaning up expired stories:', error);
      throw error;
    }
  }

  async cleanupOldNotifications(dryRun = false) {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const query = {
        createdAt: { $lt: cutoffDate },
        isRead: true
      };

      if (dryRun) {
        const count = await Notification.countDocuments(query);
        return { count, dryRun: true };
      }

      const result = await Notification.deleteMany(query);
      return { count: result.deletedCount, dryRun: false };
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  async cleanupDeletedPosts(dryRun = false) {
    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const query = {
        isDeleted: true,
        deletedAt: { $lt: cutoffDate }
      };

      if (dryRun) {
        const count = await Post.countDocuments(query);
        return { count, dryRun: true };
      }

      const result = await Post.deleteMany(query);
      return { count: result.deletedCount, dryRun: false };
    } catch (error) {
      console.error('Error cleaning up deleted posts:', error);
      throw error;
    }
  }
}

module.exports = CleanupService;
