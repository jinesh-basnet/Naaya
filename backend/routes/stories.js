const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const storiesController = require('../controllers/storiesController');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/stories/upload
// @desc    Upload media for story
// @access  Private
router.post('/upload', authenticateToken, uploadSingle('media'), storiesController.uploadMedia);

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
], storiesController.createStory);

// @route   GET /api/stories
// @desc    Get active stories feed
// @access  Private
router.get('/', authenticateToken, storiesController.getActiveStories);

router.get('/highlights', authenticateToken, storiesController.getHighlights);

router.get('/user/:username', authenticateToken, storiesController.getUserStories);

// @route   GET /api/stories/welcome
// @desc    Welcome message
// @access  Public
router.get('/welcome', storiesController.welcome);

// @route   POST /api/stories/:storyId/view
// @desc    Mark a story as viewed
// @access  Private
router.post('/:storyId/view', optionalAuth, storiesController.markStoryViewed);

// @route   GET /api/stories/:storyId
// @desc    Get a specific story and mark as viewed
// @access  Private
router.get('/:storyId', authenticateToken, storiesController.getStory);

// @route   POST /api/stories/:storyId/reaction
// @desc    Add or update reaction to a story
// @access  Private
router.post('/:storyId/reaction', authenticateToken, [
  body('type').isIn(['like', 'love', 'laugh', 'wow', 'sad', 'angry']).withMessage('Invalid reaction type'),
], storiesController.addReaction);

// @route   DELETE /api/stories/:storyId/reaction
// @desc    Remove reaction from a story
// @access  Private
router.delete('/:storyId/reaction', authenticateToken, storiesController.removeReaction);

// @route   POST /api/stories/:storyId/reply
// @desc    Add reply to a story
// @access  Private
router.post('/:storyId/reply', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 200 }).withMessage('Reply content must be 1-200 characters'),
], storiesController.replyToStory);

// @route   POST /api/stories/poll
// @desc    Create a story with poll
// @access  Private
router.post('/poll', authenticateToken, [
  body('question').isString().isLength({ min: 1, max: 100 }).withMessage('Poll question must be 1-100 characters'),
  body('options').isArray({ min: 2, max: 4 }).withMessage('Poll must have 2-4 options'),
  body('options.*').isString().isLength({ min: 1, max: 50 }).withMessage('Each option must be 1-50 characters'),
  body('expiresAt').optional().isISO8601().toDate().withMessage('ExpiresAt must be a valid date'),
], storiesController.createPollStory);

// @route   POST /api/stories/:storyId/vote
// @desc    Vote on a poll story
// @access  Private
router.post('/:storyId/vote', authenticateToken, [
  body('option').isInt({ min: 0 }).withMessage('Option index must be a non-negative integer'),
], storiesController.votePollStory);

// @route   DELETE /api/stories/:storyId
// @desc    Delete a story
// @access  Private
router.delete('/:storyId', authenticateToken, storiesController.deleteStory);

// @route   POST /api/stories/highlights
// @desc    Create a new story highlight
// @access  Private
router.post('/highlights', authenticateToken, [
  body('title').isString().isLength({ min: 1, max: 30 }).withMessage('Title must be 1-30 characters'),
  body('coverStory').isMongoId().withMessage('Cover story must be a valid story ID'),
  body('stories').isArray().withMessage('Stories must be an array'),
  body('stories.*').isMongoId().withMessage('Each story must be a valid story ID'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
], storiesController.createHighlight);

// @route   GET /api/stories/highlights/:highlightId
// @desc    Get a specific highlight with stories
// @access  Private
router.get('/highlights/:highlightId', authenticateToken, storiesController.getHighlight);

// @route   PUT /api/stories/highlights/:highlightId
// @desc    Update a story highlight
// @access  Private
router.put('/highlights/:highlightId', authenticateToken, [
  body('title').optional().isString().isLength({ min: 1, max: 30 }).withMessage('Title must be 1-30 characters'),
  body('coverStory').optional().isMongoId().withMessage('Cover story must be a valid story ID'),
  body('stories').optional().isArray().withMessage('Stories must be an array'),
  body('stories.*').optional().isMongoId().withMessage('Each story must be a valid story ID'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
], storiesController.updateHighlight);

// @route   DELETE /api/stories/highlights/:highlightId
// @desc    Delete a story highlight
// @access  Private
router.delete('/highlights/:highlightId', authenticateToken, storiesController.deleteHighlight);

module.exports = router;
