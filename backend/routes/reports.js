const express = require('express');
const { body, validationResult } = require('express-validator');
const Report = require('../models/Report');
const Post = require('../models/Post');
const Story = require('../models/Story');
const User = require('../models/User');
const { authenticateToken, requireOffice } = require('../middleware/auth');

const router = express.Router();

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
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { postId } = req.params;
    const { reason, description = '', evidence = [] } = req.body;
    const reporterId = req.user._id;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    // Create report
    const report = await Report.createReport({
      reporter: reporterId,
      contentType: 'post',
      contentId: postId,
      contentAuthor: post.author,
      reason,
      description,
      evidence
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });

  } catch (error) {
    console.error('Report post error:', error);
    if (error.message === 'You have already reported this content') {
      return res.status(400).json({
        message: error.message,
        code: 'DUPLICATE_REPORT'
      });
    }
    res.status(500).json({
      message: 'Server error submitting report',
      code: 'REPORT_POST_ERROR'
    });
  }
});

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
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { commentId } = req.params;
    const { reason, description = '', evidence = [] } = req.body;
    const reporterId = req.user._id;

    const post = await Post.findOne({ 'comments._id': commentId });
    if (!post) {
      return res.status(404).json({
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    const report = await Report.createReport({
      reporter: reporterId,
      contentType: 'comment',
      contentId: commentId,
      contentAuthor: comment.author,
      reason,
      description,
      evidence
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });

  } catch (error) {
    console.error('Report comment error:', error);
    if (error.message === 'You have already reported this content') {
      return res.status(400).json({
        message: error.message,
        code: 'DUPLICATE_REPORT'
      });
    }
    res.status(500).json({
      message: 'Server error submitting report',
      code: 'REPORT_COMMENT_ERROR'
    });
  }
});

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
    const { reason, description = '', evidence = [] } = req.body;
    const reporterId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        message: 'Story not found',
        code: 'STORY_NOT_FOUND'
      });
    }

    const report = await Report.createReport({
      reporter: reporterId,
      contentType: 'story',
      contentId: storyId,
      contentAuthor: story.author,
      reason,
      description,
      evidence
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });

  } catch (error) {
    console.error('Report story error:', error);
    if (error.message === 'You have already reported this content') {
      return res.status(400).json({
        message: error.message,
        code: 'DUPLICATE_REPORT'
      });
    }
    res.status(500).json({
      message: 'Server error submitting report',
      code: 'REPORT_STORY_ERROR'
    });
  }
});

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
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { reason, description = '', evidence = [] } = req.body;
    const reporterId = req.user._id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (userId === reporterId) {
      return res.status(400).json({
        message: 'Cannot report yourself',
        code: 'CANNOT_REPORT_SELF'
      });
    }

    const report = await Report.createReport({
      reporter: reporterId,
      contentType: 'user',
      contentId: userId,
      contentAuthor: userId,
      reason,
      description,
      evidence
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });

  } catch (error) {
    console.error('Report user error:', error);
    if (error.message === 'You have already reported this content') {
      return res.status(400).json({
        message: error.message,
        code: 'DUPLICATE_REPORT'
      });
    }
    res.status(500).json({
      message: 'Server error submitting report',
      code: 'REPORT_USER_ERROR'
    });
  }
});

// @route   GET /api/reports/my
// @desc    Get user's submitted reports
// @access  Private
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const userId = req.user._id;

    const filters = { reporter: userId };
    if (status) {
      filters.status = status;
    }

    const result = await Report.getReports(filters, parseInt(page), parseInt(limit));

    res.json({
      message: 'Reports retrieved successfully',
      ...result
    });

  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      message: 'Server error retrieving reports',
      code: 'GET_MY_REPORTS_ERROR'
    });
  }
});

const adminAuth = [authenticateToken, requireOffice];

// @route   GET /api/reports
// @desc    Get all reports (Admin only)
// @access  Private (Admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      contentType, 
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (contentType) filters.contentType = contentType;
    if (assignedTo) filters.assignedTo = assignedTo;

    const result = await Report.getReports(filters, parseInt(page), parseInt(limit));

    res.json({
      message: 'Reports retrieved successfully',
      ...result
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      message: 'Server error retrieving reports',
      code: 'GET_REPORTS_ERROR'
    });
  }
});

// @route   PUT /api/reports/:reportId/assign
// @desc    Assign report to moderator
// @access  Private (Admin only)
router.put('/:reportId/assign', adminAuth, [
  body('moderatorId').isMongoId().withMessage('Invalid moderator ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reportId } = req.params;
    const { moderatorId } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        message: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    await report.assignToModerator(moderatorId);

    res.json({
      message: 'Report assigned successfully',
      report
    });

  } catch (error) {
    console.error('Assign report error:', error);
    res.status(500).json({
      message: 'Server error assigning report',
      code: 'ASSIGN_REPORT_ERROR'
    });
  }
});

// @route   POST /api/reports/:reportId/note
// @desc    Add moderator note
// @access  Private (Admin only)
router.post('/:reportId/note', adminAuth, [
  body('note').isString().isLength({ min: 1, max: 500 }).withMessage('Note must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reportId } = req.params;
    const { note } = req.body;
    const moderatorId = req.user._id;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        message: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    await report.addModeratorNote(moderatorId, note);

    res.json({
      message: 'Note added successfully',
      report
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      message: 'Server error adding note',
      code: 'ADD_NOTE_ERROR'
    });
  }
});

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
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reportId } = req.params;
    const { action, reason, duration } = req.body;
    const resolvedBy = req.user._id;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        message: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    await report.resolve({ action, reason, duration }, resolvedBy);

    res.json({
      message: 'Report resolved successfully',
      report
    });

  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({
      message: 'Server error resolving report',
      code: 'RESOLVE_REPORT_ERROR'
    });
  }
});

// @route   PUT /api/reports/:reportId/dismiss
// @desc    Dismiss report
// @access  Private (Admin only)
router.put('/:reportId/dismiss', adminAuth, [
  body('reason').optional().isString().isLength({ max: 500 })
], async (req, res) => {
  try {
    const { reportId } = req.params;
    const { reason = 'No violation found' } = req.body;
    const dismissedBy = req.user._id;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        message: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    await report.dismiss(reason, dismissedBy);

    res.json({
      message: 'Report dismissed successfully',
      report
    });

  } catch (error) {
    console.error('Dismiss report error:', error);
    res.status(500).json({
      message: 'Server error dismissing report',
      code: 'DISMISS_REPORT_ERROR'
    });
  }
});

module.exports = router;
