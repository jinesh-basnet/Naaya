const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const conversationsController = require('../controllers/conversationsController');

const router = express.Router();

// @route   POST /api/conversations
// @desc    Create a new conversation (direct or group)
// @access  Private
router.post('/', authenticateToken, conversationsController.createConversation);

// @route   GET /api/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/', authenticateToken, conversationsController.getConversations);

// @route   GET /api/conversations/user/:userId
// @desc    Get or create direct conversation with a user
// @access  Private
router.get('/user/:userId', authenticateToken, conversationsController.getOrCreateConversationWithUser);

// @route   GET /api/conversations/:conversationId
// @desc    Get conversation details
// @access  Private
router.get('/:conversationId', authenticateToken, conversationsController.getConversationById);

// @route   PUT /api/conversations/:conversationId
// @desc    Update group conversation
// @access  Private
router.put('/:conversationId', authenticateToken, conversationsController.updateConversation);

// @route   POST /api/conversations/:conversationId/participants
// @desc    Add participant to group
// @access  Private
router.post('/:conversationId/participants', authenticateToken, conversationsController.addParticipant);

// @route   DELETE /api/conversations/:conversationId/participants/:userId
// @desc    Remove participant from group
// @access  Private
router.delete('/:conversationId/participants/:userId', authenticateToken, conversationsController.removeParticipant);

// @route   DELETE /api/conversations/:conversationId
// @desc    Leave or delete group conversation
// @access  Private
router.delete('/:conversationId', authenticateToken, conversationsController.leaveConversation);

module.exports = router;
