const express = require('express');
const { body } = require('express-validator');
const { uploadSingle } = require('../middleware/upload');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const reelsController = require('../controllers/reelsController');

const router = express.Router();

router.post('/', authenticateToken, uploadSingle('video'), (req, res, next) => {
  ['hashtags', 'mentions', 'location', 'audio', 'effects'].forEach(field => {
    if (req.body[field]) {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (e) {
        return res.status(400).json({
          message: `Invalid ${field} format`,
          code: `INVALID_${field.toUpperCase()}`
        });
      }
    }
  });

  if (req.body.brightness) {
    req.body.brightness = parseInt(req.body.brightness, 10);
  }
  if (req.body.contrast) {
    req.body.contrast = parseInt(req.body.contrast, 10);
  }

  next();
}, [
  body('caption').optional().isString().isLength({ max: 2200 }),
  body('hashtags').optional().isArray(),
  body('mentions').optional().isArray(),
  body('location').optional(),
  body('language').optional().isIn(['nepali', 'english', 'mixed']),
  body('visibility').optional().isIn(['public', 'followers', 'private']),
  body('audio').optional(),
  body('effects').optional().isArray(),
  body('filter').optional().isIn(['none', 'clarendon', 'gingham', 'moon', 'lark', 'reyes', 'juno', 'slumber', 'crema', 'ludwig', 'aden', 'perpetua', 'sepia', 'grayscale', 'vintage', 'bright', 'contrast', 'warm', 'cool']),
  body('brightness').optional().isInt({ min: -100, max: 100 }),
  body('contrast').optional().isInt({ min: -100, max: 100 })
], reelsController.createReel);

router.get('/saved', authenticateToken, reelsController.getSavedReels);

router.get('/feed', authenticateToken, reelsController.getFeed);

router.get('/search', authenticateToken, reelsController.searchReels);

router.get('/:reelId', optionalAuth, reelsController.getReel);

router.post('/:reelId/like', authenticateToken, reelsController.likeReel);

router.post('/:reelId/comment', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters')
], reelsController.commentOnReel);

router.post('/:reelId/share', authenticateToken, reelsController.shareReel);

router.post('/:reelId/save', authenticateToken, reelsController.saveReel);

router.get('/user/:userId', authenticateToken, reelsController.getUserReels);

router.delete('/:reelId', authenticateToken, reelsController.deleteReel);

// @route   GET /api/reels/:reelId/comments
// @desc    Get comments for a reel
// @access  Public (optional auth)
router.get('/:reelId/comments', optionalAuth, reelsController.getReelComments);

// @route   POST /api/reels/:reelId/comments/:commentId/reply
// @desc    Reply to a comment on a reel (flat structure)
// @access  Private
router.post('/:reelId/comments/:commentId/reply', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Reply must be between 1 and 500 characters')
], reelsController.replyToComment);

// @route   POST /api/reels/:reelId/replies/:replyId/like
// @desc    Like/unlike a reply on a reel
// @access  Private
router.post('/:reelId/replies/:replyId/like', authenticateToken, reelsController.likeReply);

// @route   POST /api/reels/:reelId/replies/:replyId/reply
// @desc    Reply to a reply on a reel (flat structure)
// @access  Private
router.post('/:reelId/replies/:replyId/reply', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Reply must be between 1 and 500 characters')
], reelsController.replyToReply);

// @route   DELETE /api/reels/:reelId/comments/:commentId
// @desc    Delete a reel comment
// @access  Private
router.delete('/:reelId/comments/:commentId', authenticateToken, reelsController.deleteComment);

module.exports = router;
