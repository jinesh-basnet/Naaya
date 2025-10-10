const Story = require('../models/Story');
const User = require('../models/User');
const { organizeStoriesForUser: organizeStoriesAlgorithm } = require('../utils/storyAlgorithm');

const viewedStoriesCache = new Map();

class StoryService {
  async organizeStoriesForUser(userId, options = {}) {
    const { includeViewStatus = false } = options;

    let viewedStoriesSet;
    if (includeViewStatus) {
      await this.ensureUserViewedStoriesLoaded(userId);
      viewedStoriesSet = this.getUserViewedStories(userId);
    }

    return organizeStoriesAlgorithm(userId, options, viewedStoriesSet);
  }

  async ensureUserViewedStoriesLoaded(userId) {
    let userCache = viewedStoriesCache.get(userId);
    if (!userCache || !userCache.loaded) {
      await this.loadUserViewedStories(userId);
    }
  }

  async hasUserViewedStory(userId, storyId) {
    await this.ensureUserViewedStoriesLoaded(userId);
    return this.hasUserViewedStorySync(userId, storyId);
  }

  hasUserViewedStorySync(userId, storyId) {
    const userCache = viewedStoriesCache.get(userId);
    return userCache && userCache.stories.has(storyId);
  }

  async loadUserViewedStories(userId) {
    try {
      const now = new Date();
      const viewedStories = await Story.find({
        'views.user': userId,
        expiresAt: { $gt: now },
        isDeleted: false
      }, '_id');

      const storyIds = viewedStories.map(story => story._id.toString());
      viewedStoriesCache.set(userId, { loaded: true, stories: new Set(storyIds) });
    } catch (error) {
      console.error('Error loading viewed stories for user:', error);
      viewedStoriesCache.set(userId, { loaded: true, stories: new Set() });
    }
  }

  markStoryAsViewed(userId, storyId) {
    let userCache = viewedStoriesCache.get(userId);
    if (!userCache) {
      userCache = { loaded: false, stories: new Set() };
      viewedStoriesCache.set(userId, userCache);
    }
    userCache.stories.add(storyId);
  }

  clearUserCache(userId) {
    viewedStoriesCache.delete(userId);
  }

  getUserViewedStories(userId) {
    const userCache = viewedStoriesCache.get(userId);
    return userCache ? userCache.stories : new Set();
  }
}

module.exports = new StoryService();
