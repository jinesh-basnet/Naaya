const express = require('express');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const retrievalController = require('../../controllers/retrievalController');

const router = express.Router();

router.get('/saved', authenticateToken, retrievalController.getSavedPosts);

router.get('/user/:username', authenticateToken, retrievalController.getUserPosts);

router.get('/search', authenticateToken, retrievalController.searchPosts);

router.get('/:postId', optionalAuth, retrievalController.getPost);

module.exports = router;

