const Story = require('../models/Story');
const Notification = require('../models/Notification');
const Post = require('../models/Post');

const cleanupService = {
  async getStats() {
    try {
      const now = new Date();
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const expiredStories = await Story.countDocuments({ expiresAt: { $lt: now }, isDeleted: false });
      const oldNotifications = await Notification.countDocuments({ createdAt: { $lt: monthAgo }, isRead: true });
      const deletedPosts = await Post.countDocuments({ isDeleted: true, deletedAt: { $lt: weekAgo } });

      return { expiredStories, oldNotifications, deletedPosts };
    } catch (err) {
      console.error('[cleanup] stat error:', err.message);
      return {};
    }
  },

  async run() {
    console.log('[cleanup] starting periodic maintenance...');
    try {
      const stats = await this.getStats();
      
      await Story.updateMany(
        { expiresAt: { $lt: new Date() }, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() }
      );

      await Notification.deleteMany({
        createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        isRead: true
      });

      await Post.deleteMany({
        isDeleted: true,
        deletedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      console.log(`[cleanup] done. items removed: ${stats.expiredStories || 0} stories, ${stats.oldNotifications || 0} notifications, ${stats.deletedPosts || 0} posts`);
    } catch (err) {
      console.error('[cleanup] failed:', err.message);
    }
  }
};

module.exports = cleanupService;

