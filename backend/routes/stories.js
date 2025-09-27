const express = require('express');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');


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
  body('media.type').isIn(['image', 'video']).withMessage('Media type must be image or video'),
  body('media.url').isString().withMessage('Media url must be a string'),
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

    const storyData = {
      author: req.user._id,
      content: req.body.content || '',
      media: req.body.media,
      expiresAt: req.body.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000) // default 24 hours
    };

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
    const now = new Date();
    const userId = req.user._id;

    // Get user's following
    const user = await User.findById(userId).populate('following', '_id');
    const userFollowing = user.following.map(f => f._id.toString());
    const userCloseFriends = []; // Close friends logic is handled in Story.canView method

    // Fetch stories that are not expired and not deleted
    const allStories = await Story.find({
      expiresAt: { $gt: now },
      isDeleted: false
    })
    .populate('author', 'username fullName profilePicture')
    .populate('closeFriends', '_id')
    .sort({ createdAt: -1 });

    // Filter stories based on visibility
    const visibleStories = allStories.filter(story =>
      story.canView(userId.toString(), userFollowing, story.closeFriends.map(cf => cf._id.toString()))
    );

    res.json({
      message: 'Stories retrieved successfully',
      stories: visibleStories
    });

  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({
      message: 'Server error retrieving stories',
      code: 'GET_STORIES_ERROR'
    });
  }
});

// @route   GET /api/stories/user/:username
// @desc    Get active stories by a specific user
// @access  Private
router.get('/user/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const now = new Date();

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Fetch stories by user that are not expired and not deleted
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

module.exports = router;
