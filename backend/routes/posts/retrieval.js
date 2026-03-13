const express = require('express');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const retrievalController = require('../../controllers/retrievalController');

const router = express.Router();

// @route   GET /api/posts/saved
// @desc    Get user's saved posts from BookmarkCollection
// @access  Private
router.get('/saved', authenticateToken, retrievalController.getSavedPosts);

// @route   GET /api/posts/user/:username
// @desc    Get user's posts
// @access  Private
router.get('/user/:username', authenticateToken, retrievalController.getUserPosts);

// @route   GET /api/posts/search
// @desc    Search posts by caption or content
// @access  Private
router.get('/search', authenticateToken, retrievalController.searchPosts);

// @route   GET /api/posts/:postId
// @desc    Get a specific post
// @access  Public
router.get('/:postId', optionalAuth, retrievalController.getPost);

module.exports = router;
