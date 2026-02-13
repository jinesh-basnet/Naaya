const Story = require('../models/Story');
const User = require('../models/User');
const Follow = require('../models/Follow');

class StoryService {
  async organizeStoriesForUser(userId, options = {}) {
    try {
      const { sort = 'createdAt', includeViewStatus = false } = options;

      // Get users that the current user is following
      const following = await Follow.find({ follower: userId }).select('following');
      const followingIds = following.map(f => f.following);

      // Include the user's own stories
      followingIds.push(userId);

      // Get active stories from followed users and self
      const now = new Date();
      const stories = await Story.find({
        author: { $in: followingIds },
        expiresAt: { $gt: now },
        isDeleted: false
      })
        .populate('author', 'username fullName profilePicture')
        .sort({ [sort]: -1 });

      // Group stories by author
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

        // Check if user has viewed this story
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

      // Convert to array, sort stories within each author group by oldest first
      const organizedStories = Object.values(storiesByAuthor).map(authorGroup => {
        // Sort stories within group: oldest first
        authorGroup.stories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return authorGroup;
      }).sort((a, b) => {
        // Sort authors: those with unseen stories first, then by latest story date
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
    } catch (error) {
      console.error('Error organizing stories for user:', error);
      throw error;
    }
  }

  async markStoryAsViewed(userId, storyId) {
    try {
      // This method could be used to track view history or analytics
      // For now, we'll just log it or store in a separate collection if needed
      // The actual view marking is done in the Story model via addView method

      console.log(`Story ${storyId} viewed by user ${userId}`);

      // Could implement additional logic here, like updating user preferences
      // or tracking story engagement metrics

    } catch (error) {
      console.error('Error marking story as viewed:', error);
      throw error;
    }
  }
}

module.exports = new StoryService();
