const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const feedController = require('../controllers/feedController');

const router = express.Router();

// @route   GET /api/feed/simple
// @desc    Get simple combined feed of posts and reels
// @access  Private
router.get('/simple', authenticateToken, feedController.getSimpleFeed);

module.exports = router;
