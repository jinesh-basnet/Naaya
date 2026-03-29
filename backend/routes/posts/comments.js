const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const commentsController = require('../../controllers/commentsController');

const router = express.Router();

router.post('/:postId/comment', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters')
], commentsController.addComment);

router.get('/:postId/comments', commentsController.getComments);

router.post('/:postId/comments/:commentId/like', authenticateToken, commentsController.likeComment);

router.post('/:postId/comments/:commentId/reply', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Reply must be between 1 and 500 characters')
], commentsController.replyToComment);

router.post('/:postId/replies/:replyId/like', authenticateToken, commentsController.likeReply);

router.post('/:postId/replies/:replyId/reply', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Reply must be between 1 and 500 characters')
], commentsController.replyToReply);

router.delete('/:postId/comments/:commentId', authenticateToken, commentsController.deleteCommentOrReply);

module.exports = router;

