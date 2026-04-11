const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { messagingRateLimiter } = require('../middleware/rateLimiter');
const { uploadSingle } = require('../middleware/upload');
const messagesController = require('../controllers/messagesController');

const router = express.Router();

// Sending messages
router.post('/', authenticateToken, messagingRateLimiter, uploadSingle('file'), messagesController.sendMessage);

// Retrieval
router.get('/conversation/:conversationId', authenticateToken, messagesController.getConversationMessages);
router.get('/conversation/:conversationId/search', authenticateToken, messagesController.searchConversationMessages);
router.get('/:userId', authenticateToken, messagesController.getMessagesByUser);

// Actions (Read, Delete, Edit, Seen)
router.put('/:messageId/read', authenticateToken, messagesController.markMessageRead);
router.put('/conversation/:conversationId/read-all', authenticateToken, messagesController.markAllMessagesRead);
router.post('/:messageId/reaction', authenticateToken, messagesController.addReaction);
router.delete('/:messageId/reaction', authenticateToken, messagesController.removeReaction);
router.put('/:messageId', authenticateToken, messagesController.editMessage);
router.delete('/:messageId', authenticateToken, messagesController.deleteMessage);
router.put('/:messageId/seen', authenticateToken, messagesController.markMessageSeen);


module.exports = router;


