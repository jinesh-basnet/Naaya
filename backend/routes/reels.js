const express = require('express');
const { uploadSingle } = require('../middleware/upload');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const reelsController = require('../controllers/reelsController');

const router = express.Router();

// Reel Core Actions
router.post('/', authenticateToken, uploadSingle('video'), reelsController.createReel);
router.get('/feed', authenticateToken, reelsController.getFeed);
router.get('/search', authenticateToken, reelsController.searchReels);
router.get('/saved', authenticateToken, reelsController.getSavedReels);
router.get('/user/:userId', authenticateToken, reelsController.getUserReels);

// Single Reel Interactions
router.get('/:reelId', optionalAuth, reelsController.getReel);
router.post('/:reelId/like', authenticateToken, reelsController.likeReel);
router.post('/:reelId/share', authenticateToken, reelsController.shareReel);
router.post('/:reelId/save', authenticateToken, reelsController.saveReel);
router.delete('/:reelId', authenticateToken, reelsController.deleteReel);

// Comments & Replies
router.get('/:reelId/comments', optionalAuth, reelsController.getReelComments);
router.post('/:reelId/comment', authenticateToken, reelsController.commentOnReel);
router.post('/:reelId/comments/:commentId/reply', authenticateToken, reelsController.replyToComment);
router.post('/:reelId/replies/:replyId/like', authenticateToken, reelsController.likeReply);
router.post('/:reelId/replies/:replyId/reply', authenticateToken, reelsController.replyToReply);
router.delete('/:reelId/comments/:commentId', authenticateToken, reelsController.deleteComment);

module.exports = router;


