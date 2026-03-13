const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const { upload, uploadMultiple } = require('../../middleware/upload');
const createController = require('../../controllers/createController');

const router = express.Router();

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', authenticateToken, upload.any(), [
  body('content').optional().isString().isLength({ max: 2200 }),
  body('tags').optional().isString(),
  body('location').optional().isString(),
  body('postType').optional().isString(),
  body('visibility').optional().isString(),
  body('language').optional().isIn(['nepali', 'english', 'mixed']).withMessage('Invalid language')
], createController.createPost);

// @route   PUT /api/posts/:postId
// @desc    Update a post
// @access  Private
router.put('/:postId', authenticateToken, uploadMultiple('media'), [
  body('content').optional().isString().isLength({ max: 2200 }),
  body('tags').optional().isString(),
  body('location').optional().isString(),
  body('postType').optional().isString(),
  body('visibility').optional().isString(),
  body('language').optional().isIn(['nepali', 'english', 'mixed']).withMessage('Invalid language')
], createController.updatePost);

// @route   DELETE /api/posts/:postId
// @desc    Delete a post
// @access  Private
router.delete('/:postId', authenticateToken, createController.deletePost);

module.exports = router;
