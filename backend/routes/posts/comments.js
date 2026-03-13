const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const commentsController = require('../../controllers/commentsController');

const router = express.Router();

// @route   POST /api/posts/:postId/comment
// @desc    Add a comment to a post
// @access  Private
router.post('/:postId/comment', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters')
], commentsController.addComment);

// @route   GET /api/posts/:postId/comments
// @desc    Get comments for a post
// @access  Private
router.get('/:postId/comments', commentsController.getComments);

// @route   POST /api/posts/:postId/comments/:commentId/like
// @desc    Like/unlike a comment
// @access  Private
router.post('/:postId/comments/:commentId/like', authenticateToken, commentsController.likeComment);

// @route   POST /api/posts/:postId/comments/:commentId/reply
// @desc    Reply to a comment
// @access  Private
router.post('/:postId/comments/:commentId/reply', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Reply must be between 1 and 500 characters')
], commentsController.replyToComment);

// @route   POST /api/posts/:postId/replies/:replyId/like
// @desc    Like/unlike a reply
// @access  Private
router.post('/:postId/replies/:replyId/like', authenticateToken, commentsController.likeReply);

// @route   POST /api/posts/:postId/replies/:replyId/reply
// @desc    Reply to a reply
// @access  Private
router.post('/:postId/replies/:replyId/reply', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Reply must be between 1 and 500 characters')
], commentsController.replyToReply);

// @route   DELETE /api/posts/:postId/comments/:commentId
// @desc    Delete a comment or reply
// @access  Private
router.delete('/:postId/comments/:commentId', authenticateToken, commentsController.deleteCommentOrReply);

module.exports = router;
