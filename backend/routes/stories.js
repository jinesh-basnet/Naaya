const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const storiesController = require('../controllers/storiesController');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

router.post('/upload', authenticateToken, uploadSingle('media'), storiesController.uploadMedia);

router.post('/', authenticateToken, storiesController.createStory);
router.get('/', authenticateToken, storiesController.getActiveStories);
router.get('/feed', authenticateToken, storiesController.getActiveStories);
router.get('/highlights', authenticateToken, storiesController.getHighlights);
router.get('/user/:username', authenticateToken, storiesController.getUserStories);
router.get('/user/:userId/highlights', authenticateToken, storiesController.getUserHighlightsById);
router.get('/welcome', storiesController.welcome);

router.get('/:storyId', authenticateToken, storiesController.getStory);
router.delete('/:storyId', authenticateToken, storiesController.deleteStory);
router.post('/:storyId/view', optionalAuth, storiesController.markStoryViewed);

router.post('/:storyId/reaction', authenticateToken, storiesController.addReaction);
router.delete('/:storyId/reaction', authenticateToken, storiesController.removeReaction);
router.post('/:storyId/reply', authenticateToken, storiesController.replyToStory);

router.post('/poll', authenticateToken, storiesController.createPollStory);
router.post('/:storyId/vote', authenticateToken, storiesController.votePollStory);

router.post('/highlights', authenticateToken, storiesController.createHighlight);
router.get('/highlights/:highlightId', authenticateToken, storiesController.getHighlight);
router.put('/highlights/:highlightId', authenticateToken, storiesController.updateHighlight);
router.delete('/highlights/:highlightId', authenticateToken, storiesController.deleteHighlight);

module.exports = router;


