const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Post = require('../models/Post');
const { authenticateToken, requireOffice } = require('../middleware/auth');
const CleanupService = require('../services/cleanupService');

const router = express.Router();

// Admin middleware - check if user is office (Naayaa office admin)
const adminAuth = [authenticateToken, requireOffice];

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private (Admin only)
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalPosts = await Post.countDocuments({ isDeleted: false });
    const reportedPosts = await Post.countDocuments({ 
      'reports.0': { $exists: true },
      isDeleted: false 
    });

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newSignups = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get posts from last 7 days
    const recentPosts = await Post.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      isDeleted: false
    });

    res.json({
      message: 'Dashboard stats retrieved successfully',
      stats: {
        totalUsers,
        activeUsers,
        totalPosts,
        reportedPosts,
        newSignups,
        recentPosts
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      message: 'Server error retrieving dashboard stats',
      code: 'DASHBOARD_ERROR'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Private (Admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'banned') {
      query.isBanned = true;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-password -passwordResetToken -emailVerificationToken')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      message: 'Users retrieved successfully',
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Server error retrieving users',
      code: 'GET_USERS_ERROR'
    });
  }
});

// @route   PUT /api/admin/users/:userId
// @desc    Update user status (suspend, ban, activate)
// @access  Private (Admin only)
router.put('/users/:userId', adminAuth, [
  body('isActive').optional().isBoolean(),
  body('isBanned').optional().isBoolean(),
  body('role').optional().isIn(['user', 'moderator', 'office']),
  body('reason').optional().isString().isLength({ max: 500 })
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
    const { isActive, isBanned, role, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent office from modifying other office users
    if (user.role === 'office' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        message: 'Cannot modify other office users',
        code: 'OFFICE_PROTECTION'
      });
    }

    // Update user
    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isBanned !== undefined) updateData.isBanned = isBanned;
    if (role) updateData.role = role;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -emailVerificationToken');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      message: 'Server error updating user',
      code: 'UPDATE_USER_ERROR'
    });
  }
});

// @route   GET /api/admin/reported-content
// @desc    Get reported content for moderation
// @access  Private (Admin only)
router.get('/reported-content', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query;

    let query = {
      'reports.0': { $exists: true },
      isDeleted: false
    };

    if (type === 'posts') {
      query.postType = 'post';
    } else if (type === 'stories') {
      query.postType = 'story';
    }

    const posts = await Post.find(query)
      .populate('author', 'username fullName profilePicture')
      .populate('reports.reportedBy', 'username fullName')
      .sort({ 'reports.reportedAt': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments(query);

    res.json({
      message: 'Reported content retrieved successfully',
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get reported content error:', error);
    res.status(500).json({
      message: 'Server error retrieving reported content',
      code: 'GET_REPORTED_CONTENT_ERROR'
    });
  }
});

// @route   DELETE /api/admin/content/:contentId
// @desc    Remove content (soft delete)
// @access  Private (Admin only)
router.delete('/content/:contentId', adminAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { reason } = req.body;

    const post = await Post.findById(contentId);
    if (!post) {
      return res.status(404).json({
        message: 'Content not found',
        code: 'CONTENT_NOT_FOUND'
      });
    }

    // Soft delete
    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = req.user._id;
    post.deletionReason = reason || 'Removed by admin';
    await post.save();

    res.json({
      message: 'Content removed successfully'
    });

  } catch (error) {
    console.error('Remove content error:', error);
    res.status(500).json({
      message: 'Server error removing content',
      code: 'REMOVE_CONTENT_ERROR'
    });
  }
});

// @route   POST /api/admin/content/:contentId/dismiss-report
// @desc    Dismiss content report
// @access  Private (Admin only)
router.post('/content/:contentId/dismiss-report', adminAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { reportId } = req.body;

    const post = await Post.findById(contentId);
    if (!post) {
      return res.status(404).json({
        message: 'Content not found',
        code: 'CONTENT_NOT_FOUND'
      });
    }

    // Remove specific report or all reports
    if (reportId) {
      post.reports.pull(reportId);
    } else {
      post.reports = [];
    }

    await post.save();

    res.json({
      message: 'Report dismissed successfully'
    });

  } catch (error) {
    console.error('Dismiss report error:', error);
    res.status(500).json({
      message: 'Server error dismissing report',
      code: 'DISMISS_REPORT_ERROR'
    });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get platform analytics
// @access  Private (Admin only)
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // User analytics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    const activeUsers = await User.countDocuments({ 
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Content analytics
    const totalPosts = await Post.countDocuments({ isDeleted: false });
    const newPosts = await Post.countDocuments({ 
      createdAt: { $gte: startDate },
      isDeleted: false 
    });

    // Engagement analytics
    const totalLikes = await Post.aggregate([
      { $match: { isDeleted: false } },
      { $project: { likesCount: { $size: '$likes' } } },
      { $group: { _id: null, total: { $sum: '$likesCount' } } }
    ]);

    const totalComments = await Post.aggregate([
      { $match: { isDeleted: false } },
      { $project: { commentsCount: { $size: '$comments' } } },
      { $group: { _id: null, total: { $sum: '$commentsCount' } } }
    ]);

    res.json({
      message: 'Analytics retrieved successfully',
      analytics: {
        users: {
          total: totalUsers,
          new: newUsers,
          active: activeUsers
        },
        content: {
          totalPosts,
          newPosts
        },
        engagement: {
          totalLikes: totalLikes[0]?.total || 0,
          totalComments: totalComments[0]?.total || 0
        },
        period
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      message: 'Server error retrieving analytics',
      code: 'ANALYTICS_ERROR'
    });
  }
});

// @route   GET /api/admin/cleanup/stats
// @desc    Get cleanup statistics
// @access  Private (Admin only)
router.get('/cleanup/stats', adminAuth, async (req, res) => {
  try {
    const cleanupService = new CleanupService();
    const stats = await cleanupService.getCleanupStats();

    res.json({
      message: 'Cleanup statistics retrieved successfully',
      stats
    });

  } catch (error) {
    console.error('Get cleanup stats error:', error);
    res.status(500).json({
      message: 'Server error retrieving cleanup statistics',
      code: 'GET_CLEANUP_STATS_ERROR'
    });
  }
});

// @route   POST /api/admin/cleanup/run
// @desc    Run cleanup tasks
// @access  Private (Admin only)
router.post('/cleanup/run', adminAuth, [
  body('dryRun').optional().isBoolean(),
  body('tasks').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { dryRun = false, tasks = ['stories', 'notifications', 'posts'] } = req.body;
    const cleanupService = new CleanupService();

    let results = {};

    if (tasks.includes('stories')) {
      results.stories = await cleanupService.cleanupExpiredStories(dryRun);
    }

    if (tasks.includes('notifications')) {
      results.notifications = await cleanupService.cleanupOldNotifications(dryRun);
    }

    if (tasks.includes('posts')) {
      results.posts = await cleanupService.cleanupDeletedPosts(dryRun);
    }

    res.json({
      message: dryRun ? 'Cleanup preview completed' : 'Cleanup completed successfully',
      results,
      dryRun
    });

  } catch (error) {
    console.error('Run cleanup error:', error);
    res.status(500).json({
      message: 'Server error running cleanup',
      code: 'RUN_CLEANUP_ERROR'
    });
  }
});

module.exports = router;
