const Story = require('../models/Story');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

class CleanupService {
  /**
   * Clean up expired stories
   * @param {boolean} dryRun - If true, only count expired stories without deleting
   * @returns {Object} Cleanup results
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

      // Soft delete expired stories
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
   * Clean up old notifications (older than 30 days)
   * @param {boolean} dryRun - If true, only count old notifications without deleting
   * @returns {Object} Cleanup results
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
   * Clean up soft-deleted posts older than 30 days
   * @param {boolean} dryRun - If true, only count deleted posts without permanently deleting
   * @returns {Object} Cleanup results
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
   * Run all cleanup tasks
   * @param {boolean} dryRun - If true, only count items without deleting
   * @returns {Object} Complete cleanup results
   */
  async runAllCleanup(dryRun = false) {
    const results = {
      timestamp: new Date().toISOString(),
      dryRun,
      tasks: {}
    };

    // Clean up expired stories
    results.tasks.stories = await this.cleanupExpiredStories(dryRun);

    // Clean up old notifications
    results.tasks.notifications = await this.cleanupOldNotifications(dryRun);

    // Clean up deleted posts
    results.tasks.posts = await this.cleanupDeletedPosts(dryRun);

    // Calculate totals
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
   * Get cleanup statistics
   * @returns {Object} Current cleanup statistics
   */
  async getCleanupStats() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = await Promise.all([
        // Expired stories
        Story.countDocuments({
          expiresAt: { $lt: now },
          isDeleted: false
        }),
        
        // Old read notifications
        Notification.countDocuments({
          createdAt: { $lt: thirtyDaysAgo },
          isRead: true
        }),
        
        // Deleted posts ready for permanent deletion
        Post.countDocuments({
          isDeleted: true,
          deletedAt: { $lt: thirtyDaysAgo }
        }),
        
        // Total active stories
        Story.countDocuments({
          isDeleted: false,
          expiresAt: { $gt: now }
        }),
        
        // Total unread notifications
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
