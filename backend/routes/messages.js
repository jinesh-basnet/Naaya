const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const { messagingRateLimiter } = require('../middleware/rateLimiter');
const { uploadSingle } = require('../middleware/upload');
const { body, query, param, validationResult } = require('express-validator');
const messagesController = require('../controllers/messagesController');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', authenticateToken, messagingRateLimiter, uploadSingle('file'), [
  body('conversationId').optional().custom(value => {
    if (typeof value === 'string' && value.startsWith('direct_')) return true;
    return mongoose.Types.ObjectId.isValid(value);
  }).withMessage('Invalid conversation ID'),
  body('content').if(body('messageType').equals('text')).notEmpty().withMessage('Message content is required'),
  body('messageType').optional().isIn(['text', 'image', 'video', 'file', 'contact', 'shared_post', 'shared_reel', 'story_reply']),
  body('clientId').optional().isString().withMessage('ClientId must be a string'),
  validate
], messagesController.sendMessage);

// @route   GET /api/messages/conversations
// @desc    Get user conversations with pagination
// @access  Private
router.get('/conversations', authenticateToken, messagesController.getConversations);

// @route   GET /api/messages/conversation/:conversationId
// @desc    Get messages in a conversation
// @access  Private
router.get('/conversation/:conversationId', authenticateToken, messagesController.getConversationMessages);

// @route   GET /api/messages/conversation/:conversationId/search
// @desc    Search messages in a conversation
// @access  Private
router.get('/conversation/:conversationId/search', authenticateToken, [
  param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
  query('q').notEmpty().withMessage('Search query is required'),
  validate
], messagesController.searchConversationMessages);

// @route   GET /api/messages/:userId
// @desc    Get messages by user
// @access  Private
router.get('/:userId', authenticateToken, messagesController.getMessagesByUser);

// @route   PUT /api/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put('/:messageId/read', authenticateToken, messagesController.markMessageRead);

// @route   PUT /api/messages/conversation/:conversationId/read-all
// @desc    Mark all messages in a conversation as read
// @access  Private
router.put('/conversation/:conversationId/read-all', authenticateToken, [
  param('conversationId').custom(value => {
    if (typeof value === 'string' && value.startsWith('direct_')) return true;
    return mongoose.Types.ObjectId.isValid(value);
  }).withMessage('Invalid conversation ID'),
  validate
], messagesController.markAllMessagesRead);

// @route   POST /api/messages/:messageId/reaction
// @desc    Add or update reaction to a message
// @access  Private
router.post('/:messageId/reaction', authenticateToken, [
  param('messageId').isMongoId().withMessage('Invalid message ID'),
  body('emoji').notEmpty().withMessage('Emoji is required').isLength({ min: 1, max: 10 }),
  validate
], messagesController.addReaction);

// @route   DELETE /api/messages/:messageId/reaction
// @desc    Remove reaction from a message
// @access  Private
router.delete('/:messageId/reaction', authenticateToken, [
  param('messageId').isMongoId().withMessage('Invalid message ID'),
  validate
], messagesController.removeReaction);

// @route   PUT /api/messages/:messageId
// @desc    Edit a message
// @access  Private
router.put('/:messageId', authenticateToken, [
  param('messageId').isMongoId().withMessage('Invalid message ID'),
  body('content').notEmpty().withMessage('Content is required').isLength({ max: 1000 }),
  validate
], messagesController.editMessage);

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete('/:messageId', authenticateToken, messagesController.deleteMessage);

// @route   POST /api/messages/:messageId/forward
// @desc    Forward a message to another user
// @access  Private
router.post('/:messageId/forward', authenticateToken, messagesController.forwardMessage);

// @route   PUT /api/messages/:messageId/seen
// @desc    Add current user to seenBy for the message (idempotent)
// @access  Private
router.put('/:messageId/seen', authenticateToken, messagesController.markMessageSeen);

// @route   POST /api/messages/groups
// @desc    Create a group conversation
// @access  Private
router.post('/groups', authenticateToken, messagesController.createGroup);

// @route   PUT /api/messages/conversations/:conversationId/participants
// @desc    Add participants to a group
// @access  Private
router.put('/conversations/:conversationId/participants', authenticateToken, messagesController.addGroupParticipants);

// @route   DELETE /api/messages/conversations/:conversationId/leave
// @desc    Leave a group conversation
// @access  Private
router.delete('/conversations/:conversationId/leave', authenticateToken, messagesController.leaveGroup);

// @route   PUT /api/messages/conversations/:conversationId
// @desc    Update group details
// @access  Private
router.put('/conversations/:conversationId', authenticateToken, messagesController.updateGroup);

// @route   DELETE /api/messages/conversations/:conversationId/participants/:targetUserId
// @desc    Remove a participant from a group
// @access  Private
router.delete('/conversations/:conversationId/participants/:targetUserId', authenticateToken, messagesController.removeGroupParticipant);

// @route   PUT /api/messages/conversations/:conversationId/participants/:targetUserId/role
// @desc    Change participant role (promote/demote)
// @access  Private
router.put('/conversations/:conversationId/participants/:targetUserId/role', authenticateToken, messagesController.changeGroupParticipantRole);

module.exports = router;
