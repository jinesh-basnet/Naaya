const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Story = require('../models/Story');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const storyService = require('../services/storyService');

exports.uploadMedia = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const file = req.file;
  const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
  const mediaUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
  res.status(201).json({
    message: 'Media uploaded successfully',
    media: {
      type: mediaType,
      url: mediaUrl
    }
  });
};

exports.createStory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Story data is incomplete or has errors.',
        errors: errors.array()
      });
    }

    const storyData = {
      author: req.user._id,
      content: req.body.content || '',
      expiresAt: req.body.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      visibility: req.body.visibility || 'public'
    };

    if (req.body.media) {
      storyData.media = req.body.media;
    }

    if (req.body.closeFriends && req.body.closeFriends.length > 0) {
      storyData.closeFriends = req.body.closeFriends;
    }

    const story = new Story(storyData);
    await story.save();

    await story.populate('author', 'username fullName profilePicture');

    res.status(201).json({
      message: 'Story created successfully',
      story
    });

  } catch (err) {
    console.error('Failed to post story:', err.message);
    res.status(500).json({
      message: 'Internal error while posting your story.'
    });
  }
};

exports.getActiveStories = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sort, include_view_status } = req.query;

    const result = await storyService.organizeStoriesForUser(userId, {
      sort: sort || 'createdAt',
      includeViewStatus: include_view_status === 'true'
    });

    res.json({
      message: 'Stories retrieved successfully',
      stories: result.stories,
      unseenCount: result.unseenCount
    });

  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({
      message: 'Server error retrieving stories',
      code: 'GET_STORIES_ERROR'
    });
  }
};

exports.getHighlights = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Get highlights - userId:', userId);

    if (!userId) {
      console.error('Get highlights error: userId is undefined');
      return res.status(400).json({
        message: 'User ID is required',
        code: 'USER_ID_MISSING'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Get highlights error: Invalid userId');
      return res.status(400).json({
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    const user = await User.findById(userId).select('highlights').populate({
      path: 'highlights.coverStory',
      select: 'media'
    }).lean();

    const highlights = user.highlights.filter(h => !h.isArchived).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log('Get highlights - highlights count:', highlights.length);

    res.json({
      message: 'Highlights retrieved successfully',
      highlights
    });

  } catch (error) {
    console.error('Get highlights error:', error.stack || error);
    res.status(500).json({
      message: 'Server error retrieving highlights',
      code: 'GET_HIGHLIGHTS_ERROR'
    });
  }
};

exports.getUserHighlightsById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    if (req.user) {
      const isBlocked = await Block.areBlocked(req.user._id, userId);
      if (isBlocked) {
        return res.status(403).json({
          message: 'Access denied due to blocking restrictions',
          code: 'BLOCK_RESTRICTION'
        });
      }
    }

    const user = await User.findById(userId).select('highlights').populate({
      path: 'highlights.coverStory',
      select: 'media'
    }).lean();

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const isSameUser = req.user && req.user._id.toString() === userId.toString();

    const highlights = user.highlights
      .filter(h => !h.isArchived && (isSameUser || h.isPublic !== false))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      message: 'Highlights retrieved successfully',
      highlights
    });

  } catch (error) {
    console.error('Get user highlights error:', error);
    res.status(500).json({
      message: 'Server error retrieving user highlights',
      code: 'GET_USER_HIGHLIGHTS_ERROR'
    });
  }
};

exports.getUserStories = async (req, res) => {
  try {
    const { username } = req.params;
    const now = new Date();

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Block check
    if (req.user) {
      const isBlocked = await Block.areBlocked(req.user._id, user._id);
      if (isBlocked) {
        return res.status(403).json({
          message: 'Access denied due to blocking restrictions',
          code: 'BLOCK_RESTRICTION'
        });
      }
    }

    const stories = await Story.find({
      author: user._id,
      expiresAt: { $gt: now },
      isDeleted: false
    })
    .populate('author', 'username fullName profilePicture')
    .sort({ createdAt: -1 });

    res.json({
      message: 'User stories retrieved successfully',
      stories
    });

  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({
      message: 'Server error retrieving user stories',
      code: 'GET_USER_STORIES_ERROR'
    });
  }
};

exports.welcome = (req, res) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  res.json({ message: 'Welcome to the Stories API Service!' });
};

exports.markStoryViewed = async (req, res) => {
  try {
    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
    }

    if (!req.user) {
      return res.json({ message: 'Story viewed anonymously' });
    }

    const userId = req.user._id;

    const following = await Follow.find({ follower: userId }).select('following').lean();
    const userFollowing = following.map(f => f.following.toString());

    const user = await User.findById(userId).populate('closeFriends', '_id');
    const userCloseFriends = user.closeFriends.map(f => f._id.toString());

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        message: 'Story not found',
        code: 'STORY_NOT_FOUND'
      });
    }

    if (!story.canView(userId.toString(), userFollowing, userCloseFriends)) {
      return res.status(403).json({
        message: 'You do not have permission to view this story',
        code: 'STORY_ACCESS_DENIED'
      });
    }

    story.addView(userId);
    await story.save();

    storyService.markStoryAsViewed(userId, storyId);

    if (global.io) {
      global.io.to(`user:${story.author}`).emit('story_viewed', {
        storyId,
        viewerId: userId,
        viewCount: story.viewsCount
      });
    }

    res.json({
      message: 'Story marked as viewed successfully'
    });

  } catch (error) {
    console.error('Mark story viewed error:', error);
    res.status(500).json({
      message: 'Server error marking story as viewed',
      code: 'MARK_VIEWED_ERROR'
    });
  }
};

exports.getStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
    }
    const userId = req.user._id;

    const following = await Follow.find({ follower: userId }).select('following').lean();
    const userFollowing = following.map(f => f.following.toString());

    const user = await User.findById(userId).populate('closeFriends', '_id');
    const userCloseFriends = user.closeFriends.map(f => f._id.toString());

    const story = await Story.findById(storyId)
      .populate('author', 'username fullName profilePicture closeFriends')
      .populate('views.user', '_id')
      .populate('reactions.user', '_id')
      .populate('replies.author', 'username fullName profilePicture');

    if (!story) {
      return res.status(404).json({
        message: 'Story not found',
        code: 'STORY_NOT_FOUND'
      });
    }

    // Block check
    if (req.user) {
      const isBlocked = await Block.areBlocked(req.user._id, story.author._id);
      if (isBlocked) {
        return res.status(403).json({
          message: 'Access denied due to blocking restrictions',
          code: 'BLOCK_RESTRICTION'
        });
      }
    }

    if (!story.canView(userId.toString(), userFollowing, userCloseFriends)) {
      return res.status(403).json({
        message: 'You do not have permission to view this story',
        code: 'STORY_ACCESS_DENIED'
      });
    }

    story.addView(userId);
    await story.save();

    storyService.markStoryAsViewed(userId, storyId);

    res.json({
      message: 'Story retrieved successfully',
      story
    });

  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({
      message: 'Server error retrieving story',
      code: 'GET_STORY_ERROR'
    });
  }
};

exports.addReaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
    }
    const { type } = req.body;
    const userId = req.user._id;

    const following = await Follow.find({ follower: userId }).select('following').lean();
    const userFollowing = following.map(f => f.following.toString());
    const userCloseFriends = [];

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        message: 'Story not found',
        code: 'STORY_NOT_FOUND'
      });
    }

    if (!story.canView(userId.toString(), userFollowing, userCloseFriends)) {
      return res.status(403).json({
        message: 'You do not have permission to react to this story',
        code: 'STORY_ACCESS_DENIED'
      });
    }

    story.addReaction(userId, type);
    await story.save();

    res.json({
      message: 'Reaction added successfully',
      story
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      message: 'Server error adding reaction',
      code: 'ADD_REACTION_ERROR'
    });
  }
};

exports.removeReaction = async (req, res) => {
  try {
    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
    }
    const userId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        message: 'Story not found',
        code: 'STORY_NOT_FOUND'
      });
    }

    story.removeReaction(userId);
    await story.save();

    res.json({
      message: 'Reaction removed successfully',
      story
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      message: 'Server error removing reaction',
      code: 'REMOVE_REACTION_ERROR'
    });
  }
};

exports.replyToStory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
    }
    const { content } = req.body;
    const userId = req.user._id;

    const following = await Follow.find({ follower: userId }).select('following').lean();
    const userFollowing = following.map(f => f.following.toString());
    const userCloseFriends = [];

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        message: 'Story not found',
        code: 'STORY_NOT_FOUND'
      });
    }

    if (!story.canView(userId.toString(), userFollowing, userCloseFriends)) {
      return res.status(403).json({
        message: 'You do not have permission to reply to this story',
        code: 'STORY_ACCESS_DENIED'
      });
    }

    story.addReply(userId, content);
    await story.save();

    await story.populate('replies.author', 'username fullName profilePicture');

    res.json({
      message: 'Reply added successfully',
      story
    });

  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({
      message: 'Server error adding reply',
      code: 'ADD_REPLY_ERROR'
    });
  }
};

exports.createPollStory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { question, options, expiresAt } = req.body;
    const userId = req.user._id;

    const storyData = {
      author: userId,
      poll: {
        question,
        options,
        expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    const story = new Story(storyData);
    await story.save();

    await story.populate('author', 'username fullName profilePicture');

    res.status(201).json({
      message: 'Poll story created successfully',
      story
    });

  } catch (error) {
    console.error('Create poll story error:', error);
    res.status(500).json({
      message: 'Server error creating poll story',
      code: 'CREATE_POLL_STORY_ERROR'
    });
  }
};

exports.votePollStory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
    }
    const { option } = req.body;
    const userId = req.user._id;

    const following = await Follow.find({ follower: userId }).select('following').lean();
    const userFollowing = following.map(f => f.following.toString());
    const userCloseFriends = [];

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        message: 'Story not found',
        code: 'STORY_NOT_FOUND'
      });
    }

    if (!story.canView(userId.toString(), userFollowing, userCloseFriends)) {
      return res.status(403).json({
        message: 'You do not have permission to vote on this story',
        code: 'STORY_ACCESS_DENIED'
      });
    }

    if (!story.poll) {
      return res.status(400).json({
        message: 'This story does not have a poll',
        code: 'NO_POLL_IN_STORY'
      });
    }

    if (option >= story.poll.options.length) {
      return res.status(400).json({
        message: 'Invalid option index',
        code: 'INVALID_POLL_OPTION'
      });
    }

    const existingVote = story.poll.votes.find(vote => vote.user.toString() === userId.toString());
    if (existingVote) {
      return res.status(400).json({
        message: 'You have already voted on this poll',
        code: 'ALREADY_VOTED'
      });
    }

    story.poll.votes.push({ user: userId, option });
    await story.save();

    res.json({
      message: 'Vote recorded successfully',
      story
    });

  } catch (error) {
    console.error('Vote on poll error:', error);
    res.status(500).json({
      message: 'Server error recording vote',
      code: 'VOTE_ERROR'
    });
  }
};

exports.deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
    }
    const userId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        message: 'Story not found',
        code: 'STORY_NOT_FOUND'
      });
    }

    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You can only delete your own stories',
        code: 'DELETE_PERMISSION_DENIED'
      });
    }

    story.isDeleted = true;
    story.deletedAt = new Date();
    await story.save();

    res.json({
      message: 'Story deleted successfully'
    });

  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({
      message: 'Server error deleting story',
      code: 'DELETE_STORY_ERROR'
    });
  }
};

exports.createHighlight = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, coverStory, stories, isPublic } = req.body;
    const userId = req.user._id;

    if (stories.length === 0) {
      return res.status(400).json({
        message: 'Stories array cannot be empty',
        code: 'EMPTY_STORIES'
      });
    }

    if (!stories.includes(coverStory)) {
      return res.status(400).json({
        message: 'Cover story must be included in the stories array',
        code: 'COVER_STORY_NOT_IN_STORIES'
      });
    }

    const userStories = await Story.find({
      _id: { $in: stories },
      author: userId,
      isDeleted: false
    });

    if (userStories.length !== stories.length) {
      return res.status(400).json({
        message: 'Some stories not found or do not belong to you',
        code: 'INVALID_STORIES'
      });
    }

    const coverStoryDoc = await Story.findOne({
      _id: coverStory,
      author: userId,
      isDeleted: false
    });

    if (!coverStoryDoc) {
      return res.status(400).json({
        message: 'Cover story not found or does not belong to you',
        code: 'INVALID_COVER_STORY'
      });
    }

    const highlightData = {
      title,
      coverStory,
      stories,
      isPublic: isPublic !== undefined ? isPublic : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const user = await User.findById(userId);
    user.highlights.push(highlightData);
    await user.save();

    const newHighlight = user.highlights[user.highlights.length - 1];

    res.status(201).json({
      message: 'Highlight created successfully',
      highlight: newHighlight
    });

  } catch (error) {
    console.error('Create highlight error:', error);
    res.status(500).json({
      message: 'Server error creating highlight',
      code: 'CREATE_HIGHLIGHT_ERROR'
    });
  }
};

exports.getHighlight = async (req, res) => {
  try {
    const { highlightId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId).populate({
      path: 'highlights.stories',
      match: { isDeleted: false },
      populate: {
        path: 'author',
        select: 'username fullName profilePicture'
      }
    }).populate('highlights.coverStory', 'media');

    const highlight = user.highlights.id(highlightId);

    if (!highlight) {
      return res.status(404).json({
        message: 'Highlight not found',
        code: 'HIGHLIGHT_NOT_FOUND'
      });
    }

    res.json({
      message: 'Highlight retrieved successfully',
      highlight
    });

  } catch (error) {
    console.error('Get highlight error:', error);
    res.status(500).json({
      message: 'Server error retrieving highlight',
      code: 'GET_HIGHLIGHT_ERROR'
    });
  }
};

exports.updateHighlight = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { highlightId } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const user = await User.findById(userId);
    const highlight = user.highlights.id(highlightId);

    if (!highlight) {
      return res.status(404).json({
        message: 'Highlight not found',
        code: 'HIGHLIGHT_NOT_FOUND'
      });
    }

    if (updateData.stories) {
      const userStories = await Story.find({
        _id: { $in: updateData.stories },
        author: userId,
        isDeleted: false
      });

      if (userStories.length !== updateData.stories.length) {
        return res.status(400).json({
          message: 'Some stories not found or do not belong to you',
          code: 'INVALID_STORIES'
        });
      }
    }

    if (updateData.coverStory) {
      const coverStoryDoc = await Story.findOne({
        _id: updateData.coverStory,
        author: userId,
        isDeleted: false
      });

      if (!coverStoryDoc) {
        return res.status(400).json({
          message: 'Cover story not found or does not belong to you',
          code: 'INVALID_COVER_STORY'
        });
      }
    }

    Object.assign(highlight, updateData);
    highlight.updatedAt = new Date();
    await user.save();

    res.json({
      message: 'Highlight updated successfully',
      highlight
    });

  } catch (error) {
    console.error('Update highlight error:', error);
    res.status(500).json({
      message: 'Server error updating highlight',
      code: 'UPDATE_HIGHLIGHT_ERROR'
    });
  }
};

exports.deleteHighlight = async (req, res) => {
  try {
    const { highlightId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const highlight = user.highlights.id(highlightId);

    if (!highlight) {
      return res.status(404).json({
        message: 'Highlight not found',
        code: 'HIGHLIGHT_NOT_FOUND'
      });
    }

    highlight.isArchived = true;
    highlight.updatedAt = new Date();
    await user.save();

    res.json({
      message: 'Highlight deleted successfully'
    });

  } catch (error) {
    console.error('Delete highlight error:', error);
    res.status(500).json({
      message: 'Server error deleting highlight',
      code: 'DELETE_HIGHLIGHT_ERROR'
    });
  }
};
