const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const feedController = require('../../controllers/feedController');

const router = express.Router();

// @route   GET /api/posts
// @desc    Get default feed (fyp)
// @access  Private
router.get('/', authenticateToken, feedController.getDefaultFeed);

// @route   GET /api/posts/feed
// @desc    Get personalized feed
// @access  Private
// @route   GET /api/posts/feed
// @desc    Get personalized feed
// @access  Private
router.get('/feed', authenticateToken, feedController.getPersonalizedFeed);

// @route   GET /api/posts/feed/explore-overview
// @desc    Get explore overview (suggested users and tags)
// @access  Private
router.get('/explore-overview', authenticateToken, feedController.getExploreOverview);

module.exports = router;
