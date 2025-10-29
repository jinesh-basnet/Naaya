const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const StoryHighlight = require('../models/StoryHighlight');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const storyService = require('../services/storyService');

const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/stories/upload
// @desc    Upload media for story
// @access  Private
router.post('/upload', authenticateToken, uploadSingle('media'), (req, res) => {
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
});

// @route   POST /api/stories
// @desc    Create a new story
// @access  Private
router.post('/', authenticateToken, [
  body('content').optional().isString().isLength({ max: 500 }).withMessage('Content must be a string with max 500 characters'),
  body('media').optional().custom((value) => {
    if (value && typeof value !== 'object') {
      throw new Error('Media must be an object if provided');
    }
    return true;
  }),
  body('media.type').if(body('media').exists()).isIn(['image', 'video']).withMessage('Media type is required and must be image or video'),
  body('media.url').if(body('media').exists()).isString().withMessage('Media url is required and must be a string'),
  body('expiresAt').optional().isISO8601().toDate().withMessage('ExpiresAt must be a valid date'),
  body('visibility').optional().isIn(['public', 'followers', 'close_friends', 'private']).withMessage('Visibility must be public, followers, close_friends, or private'),
  body('closeFriends').optional().isArray().withMessage('Close friends must be an array'),
  body('closeFriends.*').if(body('closeFriends').exists()).isMongoId().withMessage('Each close friend must be a valid user ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
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

  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({
      message: 'Server error creating story',
      code: 'CREATE_STORY_ERROR'
    });
  }
});

// @route   GET /api/stories
// @desc    Get active stories feed
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
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
});

router.get('/highlights', authenticateToken, async (req, res) => {
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

    const highlights = await StoryHighlight.getUserHighlights(userId);
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
});

router.get('/user/:username', authenticateToken, async (req, res) => {
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
});

// @route   GET /api/stories/welcome
// @desc    Welcome message
// @access  Public
router.get('/welcome', (req, res) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  res.json({ message: 'Welcome to the Stories API Service!' });
});

// @route   POST /api/stories/:storyId/view
// @desc    Mark a story as viewed
// @access  Private
router.post('/:storyId/view', optionalAuth, async (req, res) => {
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
});

// @route   GET /api/stories/:storyId
// @desc    Get a specific story and mark as viewed
// @access  Private
router.get('/:storyId', authenticateToken, async (req, res) => {
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
});

// @route   POST /api/stories/:storyId/reaction
// @desc    Add or update reaction to a story
// @access  Private
router.post('/:storyId/reaction', authenticateToken, [
  body('type').isIn(['like', 'love', 'laugh', 'wow', 'sad', 'angry']).withMessage('Invalid reaction type'),
], async (req, res) => {
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
});

// @route   DELETE /api/stories/:storyId/reaction
// @desc    Remove reaction from a story
// @access  Private
router.delete('/:storyId/reaction', authenticateToken, async (req, res) => {
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
});

// @route   POST /api/stories/:storyId/reply
// @desc    Add reply to a story
// @access  Private
router.post('/:storyId/reply', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 200 }).withMessage('Reply content must be 1-200 characters'),
], async (req, res) => {
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
});

// @route   POST /api/stories/poll
// @desc    Create a story with poll
// @access  Private
router.post('/poll', authenticateToken, [
  body('question').isString().isLength({ min: 1, max: 100 }).withMessage('Poll question must be 1-100 characters'),
  body('options').isArray({ min: 2, max: 4 }).withMessage('Poll must have 2-4 options'),
  body('options.*').isString().isLength({ min: 1, max: 50 }).withMessage('Each option must be 1-50 characters'),
  body('expiresAt').optional().isISO8601().toDate().withMessage('ExpiresAt must be a valid date'),
], async (req, res) => {
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
});

// @route   POST /api/stories/:storyId/vote
// @desc    Vote on a poll story
// @access  Private
router.post('/:storyId/vote', authenticateToken, [
  body('option').isInt({ min: 0 }).withMessage('Option index must be a non-negative integer'),
], async (req, res) => {
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

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        message: 'Story not found',
        code: 'STORY_NOT_FOUND'
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
});

// @route   DELETE /api/stories/:storyId
// @desc    Delete a story
// @access  Private
router.delete('/:storyId', authenticateToken, async (req, res) => {
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
});

// @route   POST /api/stories/highlights
// @desc    Create a new story highlight
// @access  Private
router.post('/highlights', authenticateToken, [
  body('title').isString().isLength({ min: 1, max: 30 }).withMessage('Title must be 1-30 characters'),
  body('coverStory').isMongoId().withMessage('Cover story must be a valid story ID'),
  body('stories').isArray().withMessage('Stories must be an array'),
  body('stories.*').isMongoId().withMessage('Each story must be a valid story ID'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
], async (req, res) => {
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
      author: userId,
      title,
      coverStory,
      stories,
      isPublic: isPublic !== undefined ? isPublic : true
    };

    const highlight = await StoryHighlight.createHighlight(highlightData);

    await highlight.populate('coverStory', 'media');
    await highlight.populate('stories', '_id');

    res.status(201).json({
      message: 'Highlight created successfully',
      highlight
    });

  } catch (error) {
    console.error('Create highlight error:', error);
    res.status(500).json({
      message: 'Server error creating highlight',
      code: 'CREATE_HIGHLIGHT_ERROR'
    });
  }
});

// @route   GET /api/stories/highlights/:highlightId
// @desc    Get a specific highlight with stories
// @access  Private
router.get('/highlights/:highlightId', authenticateToken, async (req, res) => {
  try {
    const { highlightId } = req.params;
    const userId = req.user._id;

    const highlight = await StoryHighlight.findById(highlightId)
      .populate('author', 'username fullName profilePicture')
      .populate({
        path: 'stories',
        match: { isDeleted: false },
        populate: {
          path: 'author',
          select: 'username fullName profilePicture'
        }
      })
      .populate('coverStory', 'media');

    if (!highlight) {
      return res.status(404).json({
        message: 'Highlight not found',
        code: 'HIGHLIGHT_NOT_FOUND'
      });
    }

    if (highlight.author._id.toString() !== userId.toString() && !highlight.isPublic) {
      return res.status(403).json({
        message: 'You do not have permission to view this highlight',
        code: 'HIGHLIGHT_ACCESS_DENIED'
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
});

// @route   PUT /api/stories/highlights/:highlightId
// @desc    Update a story highlight
// @access  Private
router.put('/highlights/:highlightId', authenticateToken, [
  body('title').optional().isString().isLength({ min: 1, max: 30 }).withMessage('Title must be 1-30 characters'),
  body('coverStory').optional().isMongoId().withMessage('Cover story must be a valid story ID'),
  body('stories').optional().isArray().withMessage('Stories must be an array'),
  body('stories.*').optional().isMongoId().withMessage('Each story must be a valid story ID'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
], async (req, res) => {
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

    const highlight = await StoryHighlight.findById(highlightId);
    if (!highlight) {
      return res.status(404).json({
        message: 'Highlight not found',
        code: 'HIGHLIGHT_NOT_FOUND'
      });
    }

    if (highlight.author.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You can only update your own highlights',
        code: 'UPDATE_PERMISSION_DENIED'
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
    await highlight.save();

    await highlight.populate('coverStory', 'media');
    await highlight.populate('stories', '_id');

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
});

// @route   DELETE /api/stories/highlights/:highlightId
// @desc    Delete a story highlight
// @access  Private
router.delete('/highlights/:highlightId', authenticateToken, async (req, res) => {
  try {
    const { highlightId } = req.params;
    const userId = req.user._id;

    const highlight = await StoryHighlight.findById(highlightId);
    if (!highlight) {
      return res.status(404).json({
        message: 'Highlight not found',
        code: 'HIGHLIGHT_NOT_FOUND'
      });
    }

    if (highlight.author.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You can only delete your own highlights',
        code: 'DELETE_PERMISSION_DENIED'
      });
    }

    highlight.isArchived = true;
    await highlight.save();

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
});

module.exports = router;
