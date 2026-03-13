const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const interactionsController = require('../../controllers/interactionsController');

const router = express.Router();

// @route   POST /api/posts/:postId/like
// @desc    Like/unlike a post
// @access  Private
router.post('/:postId/like', authenticateToken, interactionsController.likePost);

// @route   POST /api/posts/:postId/save
// @desc    Save/unsave a post 
// @access  Private
router.post('/:postId/save', authenticateToken, interactionsController.savePost);

// @route   POST /api/posts/:postId/share
// @desc    Share/unshare a post
// @access  Private
router.post('/:postId/share', authenticateToken, [
  body('caption').optional().isString().isLength({ max: 2200 }),
  body('tags').optional(),
  body('location').optional(),
], interactionsController.sharePost);

module.exports = router;
