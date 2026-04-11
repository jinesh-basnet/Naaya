const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const conversationsController = require('../controllers/conversationsController');

const router = express.Router();

router.post('/', authenticateToken, conversationsController.createConversation);

router.get('/', authenticateToken, conversationsController.getConversations);

router.get('/user/:userId', authenticateToken, conversationsController.getOrCreateConversationWithUser);

router.get('/:conversationId', authenticateToken, conversationsController.getConversationById);

router.delete('/:conversationId', authenticateToken, conversationsController.leaveConversation);

module.exports = router;

