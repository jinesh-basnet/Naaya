const Story = require('../models/Story');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');

const storyService = {
  async organizeStoriesForUser(userId, options = {}) {
    const { sort = 'createdAt', includeViewStatus = false } = options;

    console.log(`[stories] getting feed for user: ${userId}`);

    const followingDocs = await Follow.find({ follower: userId }).select('following');
    const followingIds = followingDocs.map(f => f.following.toString());
    
    const blockedUserIds = await Block.getBlockedUserIds(userId);
    const blockerUserIds = await Block.getBlockerUserIds(userId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());

    const filteredAuthorIds = followingIds.filter(id => !allBlockedIds.includes(id));
    
    if (!filteredAuthorIds.includes(userId.toString())) {
      filteredAuthorIds.push(userId.toString());
    }

    const now = new Date();
    const stories = await Story.find({
      author: { $in: filteredAuthorIds },
      expiresAt: { $gt: now },
      isDeleted: false
    })
    .populate('author', 'username fullName profilePicture')
    .sort({ [sort]: -1 });

    const storiesByAuthor = {};
    let unseenCount = 0;

    for (const story of stories) {
      const authorId = story.author._id.toString();

      if (!storiesByAuthor[authorId]) {
        storiesByAuthor[authorId] = {
          author: story.author,
          stories: [],
          hasUnseen: false
        };
      }

      const hasViewed = story.views.some(view => view.user.toString() === userId.toString());

      if (includeViewStatus) {
        story._doc.hasViewed = hasViewed;
      }

      if (!hasViewed) {
        storiesByAuthor[authorId].hasUnseen = true;
        unseenCount++;
      }

      storiesByAuthor[authorId].stories.push(story);
    }

    const organizedStories = Object.values(storiesByAuthor).map(authorGroup => {
      authorGroup.stories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return authorGroup;
    }).sort((a, b) => {
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;

      const aLatest = Math.max(...a.stories.map(s => new Date(s.createdAt)));
      const bLatest = Math.max(...b.stories.map(s => new Date(s.createdAt)));
      return bLatest - aLatest;
    });

    return {
      stories: organizedStories,
      unseenCount
    };
  },

  async markStoryAsViewed(userId, storyId) {
    console.log(`[stories] ${userId} viewed story: ${storyId}`);
  }
};

module.exports = storyService;

