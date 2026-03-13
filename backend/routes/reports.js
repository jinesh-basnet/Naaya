const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const reportsController = require('../controllers/reportsController');

const router = express.Router();

const adminAuth = [authenticateToken];

// @route   POST /api/report/post/:postId
// @desc    Report a post
// @access  Private
router.post('/post/:postId', authenticateToken, [
  body('reason').isIn([
    'spam', 'harassment', 'hate_speech', 'violence', 'nudity', 
    'fake_news', 'copyright', 'impersonation', 'underage', 
    'self_harm', 'terrorism', 'other'
  ]).withMessage('Invalid report reason'),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('evidence').optional().isArray()
], reportsController.reportPost);

// @route   POST /api/report/comment/:commentId
// @desc    Report a comment
// @access  Private
router.post('/comment/:commentId', authenticateToken, [
  body('reason').isIn([
    'spam', 'harassment', 'hate_speech', 'violence', 'nudity', 
    'fake_news', 'copyright', 'impersonation', 'underage', 
    'self_harm', 'terrorism', 'other'
  ]).withMessage('Invalid report reason'),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('evidence').optional().isArray()
], reportsController.reportComment);

// @route   POST /api/report/story/:storyId
// @desc    Report a story
// @access  Private
router.post('/story/:storyId', authenticateToken, [
  body('reason').isIn([
    'spam', 'harassment', 'hate_speech', 'violence', 'nudity', 
    'fake_news', 'copyright', 'impersonation', 'underage', 
    'self_harm', 'terrorism', 'other'
  ]).withMessage('Invalid report reason'),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('evidence').optional().isArray()
], reportsController.reportStory);

// @route   POST /api/report/user/:userId
// @desc    Report a user
// @access  Private
router.post('/user/:userId', authenticateToken, [
  body('reason').isIn([
    'spam', 'harassment', 'hate_speech', 'violence', 'nudity', 
    'fake_news', 'copyright', 'impersonation', 'underage', 
    'self_harm', 'terrorism', 'other'
  ]).withMessage('Invalid report reason'),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('evidence').optional().isArray()
], reportsController.reportUser);

// @route   GET /api/reports/my
// @desc    Get user's submitted reports
// @access  Private
router.get('/my', authenticateToken, reportsController.getMyReports);

// @route   GET /api/reports
// @desc    Get all reports (Admin only)
// @access  Private (Admin only)
router.get('/', adminAuth, reportsController.getAllReports);

// @route   PUT /api/reports/:reportId/assign
// @desc    Assign report to moderator
// @access  Private (Admin only)
router.put('/:reportId/assign', adminAuth, [
  body('moderatorId').isMongoId().withMessage('Invalid moderator ID')
], reportsController.assignReport);

// @route   POST /api/reports/:reportId/note
// @desc    Add moderator note
// @access  Private (Admin only)
router.post('/:reportId/note', adminAuth, [
  body('note').isString().isLength({ min: 1, max: 500 }).withMessage('Note must be between 1 and 500 characters')
], reportsController.addNote);

// @route   PUT /api/reports/:reportId/resolve
// @desc    Resolve report
// @access  Private (Admin only)
router.put('/:reportId/resolve', adminAuth, [
  body('action').isIn([
    'no_action', 'content_removed', 'content_hidden', 'user_warned',
    'user_suspended', 'user_banned', 'account_restricted'
  ]).withMessage('Invalid resolution action'),
  body('reason').optional().isString().isLength({ max: 500 }),
  body('duration').optional().isNumeric()
], reportsController.resolveReport);

// @route   PUT /api/reports/:reportId/dismiss
// @desc    Dismiss report
// @access  Private (Admin only)
router.put('/:reportId/dismiss', adminAuth, [
  body('reason').optional().isString().isLength({ max: 500 })
], reportsController.dismissReport);

module.exports = router;
