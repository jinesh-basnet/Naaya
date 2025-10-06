const Story = require('../models/Story');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

class CleanupService {
  /**
   * 
   * @param {boolean} dryRun 
   * @returns {Object} 
   */
  async cleanupExpiredStories(dryRun = false) {
    try {
      const expiredStories = await Story.find({
        expiresAt: { $lt: new Date() },
        isDeleted: false
      });

      if (dryRun) {
        return {
          success: true,
          expiredCount: expiredStories.length,
          message: `Found ${expiredStories.length} expired stories`
        };
      }

      const result = await Story.updateMany(
        {
          expiresAt: { $lt: new Date() },
          isDeleted: false
        },
        {
          isDeleted: true,
          deletedAt: new Date()
        }
      );

      return {
        success: true,
        deletedCount: result.modifiedCount,
        message: `Cleaned up ${result.modifiedCount} expired stories`
      };

    } catch (error) {
      console.error('Error cleaning up expired stories:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to clean up expired stories'
      };
    }
  }

  /**
   * 
   * @param {boolean} dryRun 
   * @returns {Object} 
   */
  async cleanupOldNotifications(dryRun = false) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const oldNotifications = await Notification.find({
        createdAt: { $lt: thirtyDaysAgo },
        isRead: true
      });

      if (dryRun) {
        return {
          success: true,
          oldCount: oldNotifications.length,
          message: `Found ${oldNotifications.length} old read notifications`
        };
      }

      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        isRead: true
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
        message: `Cleaned up ${result.deletedCount} old notifications`
      };

    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to clean up old notifications'
      };
    }
  }

  /**
   * 
   * @param {boolean} dryRun 
   * 
   * @returns {Object} 
   */
  async cleanupDeletedPosts(dryRun = false) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const deletedPosts = await Post.find({
        isDeleted: true,
        deletedAt: { $lt: thirtyDaysAgo }
      });

      if (dryRun) {
        return {
          success: true,
          deletedCount: deletedPosts.length,
          message: `Found ${deletedPosts.length} posts ready for permanent deletion`
        };
      }

      const result = await Post.deleteMany({
        isDeleted: true,
        deletedAt: { $lt: thirtyDaysAgo }
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
        message: `Permanently deleted ${result.deletedCount} posts`
      };

    } catch (error) {
      console.error('Error cleaning up deleted posts:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to clean up deleted posts'
      };
    }
  }

  /**
   * 
   * @param {boolean} dryRun 
   * @returns {Object} 
   */
  async runAllCleanup(dryRun = false) {
    const results = {
      timestamp: new Date().toISOString(),
      dryRun,
      tasks: {}
    };

    results.tasks.stories = await this.cleanupExpiredStories(dryRun);

    results.tasks.notifications = await this.cleanupOldNotifications(dryRun);

    results.tasks.posts = await this.cleanupDeletedPosts(dryRun);

    results.summary = {
      totalDeleted: Object.values(results.tasks).reduce((sum, task) => 
        sum + (task.deletedCount || 0), 0
      ),
      totalFound: Object.values(results.tasks).reduce((sum, task) => 
        sum + (task.expiredCount || task.oldCount || task.deletedCount || 0), 0
      ),
      allSuccessful: Object.values(results.tasks).every(task => task.success)
    };

    return results;
  }

  /**
   * 
   * @returns {Object} 
   */
  async getCleanupStats() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = await Promise.all([
        Story.countDocuments({
          expiresAt: { $lt: now },
          isDeleted: false
        }),
        
        Notification.countDocuments({
          createdAt: { $lt: thirtyDaysAgo },
          isRead: true
        }),
        
        Post.countDocuments({
          isDeleted: true,
          deletedAt: { $lt: thirtyDaysAgo }
        }),
        
        Story.countDocuments({
          isDeleted: false,
          expiresAt: { $gt: now }
        }),
        
        Notification.countDocuments({
          isRead: false
        })
      ]);

      return {
        expiredStories: stats[0],
        oldNotifications: stats[1],
        deletedPostsReadyForCleanup: stats[2],
        activeStories: stats[3],
        unreadNotifications: stats[4],
        lastChecked: now.toISOString()
      };

    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      throw error;
    }
  }
}

module.exports = CleanupService;
