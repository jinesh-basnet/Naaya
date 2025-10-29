const Story = require('../models/Story');
const User = require('../models/User');
const Follow = require('../models/Follow');

/**
 *
 * @param {string} userId 
 * @param {object} options 
 * @param {string} options.sort 
 * @param {boolean} options.includeViewStatus 
 * @param {Set} viewedStoriesSet 
 * @returns {object}
 */
async function organizeStoriesForUser(userId, options = {}, viewedStoriesSet) {
  try {
    const { sort = 'createdAt', includeViewStatus = false } = options;

    const following = await Follow.find({ follower: userId }).select('following').lean();
    const userFollowing = following.map(f => f.following.toString());

    const user = await User.findById(userId).populate('closeFriends', '_id');
    const userCloseFriends = user.closeFriends.map(f => f._id.toString());

    const now = new Date();

    const allStories = await Story.find({
      expiresAt: { $gt: now },
      isDeleted: false
    })
    .populate('author', 'username fullName profilePicture closeFriends')
    .populate('closeFriends', '_id')
    .sort({ createdAt: -1 });

    const visibleStories = allStories.filter(story =>
      story.canView(userId.toString(), userFollowing, userCloseFriends)
    );

    const storiesWithStatus = visibleStories.map(story => {
      const storyObj = story.toObject();
      if (includeViewStatus) {
        storyObj.hasViewed = viewedStoriesSet.has(story._id.toString());
      }
      storyObj.viewsCount = story.viewsCount;
      return storyObj;
    });

    if (sort === 'unseen_first' && includeViewStatus) {
      storiesWithStatus.sort((a, b) => {
        const aUnseen = !a.hasViewed;
        const bUnseen = !b.hasViewed;

        if (aUnseen && !bUnseen) return -1; 
        if (!aUnseen && bUnseen) return 1; 

        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    const authorUnseenCount = {};
    if (includeViewStatus) {
      storiesWithStatus.forEach(story => {
        const authorId = story.author._id.toString();
        if (!authorUnseenCount[authorId]) {
          authorUnseenCount[authorId] = 0;
        }
        if (!story.hasViewed) {
          authorUnseenCount[authorId]++;
        }
      });
    }

    return {
      stories: storiesWithStatus,
      unseenCount: includeViewStatus ? authorUnseenCount : undefined
    };
  } catch (error) {
    console.error('Error organizing stories for user:', error);
    throw error;
  }
}

module.exports = {
  organizeStoriesForUser
};
