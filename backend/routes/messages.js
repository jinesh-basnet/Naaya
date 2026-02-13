const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Block = require('../models/Block');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { conversationId, content, messageType = 'text', replyTo, mentions, sharedContent, storyReply } = req.body;
    const senderId = req.user._id;

    let actualConversationId = conversationId;
    let conversation;

    // Handle virtual direct conversation IDs (e.g., direct_userA_userB)
    if (typeof conversationId === 'string' && conversationId.startsWith('direct_')) {
      const parts = conversationId.split('_');
      if (parts.length === 3) {
        const userA = parts[1];
        const userB = parts[2];

        // Ensure sender is one of the users in the virtual ID
        if (userA !== senderId.toString() && userB !== senderId.toString()) {
          return res.status(403).json({ message: 'Unauthorized conversation ID' });
        }

        const targetUserId = userA === senderId.toString() ? userB : userA;
        conversation = await Conversation.createDirectConversation(senderId, targetUserId);
        actualConversationId = conversation._id;
      }
    }

    // Verify user is participant in conversation if not already found/created
    if (!conversation) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID' });
      }

      conversation = await Conversation.findOne({
        _id: conversationId,
        participants: {
          $elemMatch: { user: senderId, isActive: true }
        },
        isActive: true
      });
    }

    if (!conversation) {
      return res.status(403).json({
        message: 'You are not a participant in this conversation',
        code: 'NOT_PARTICIPANT'
      });
    }

    // Check for blocking: prevent sending messages if sender is blocked by any participant or has blocked any participant
    const otherParticipants = conversation.participants.filter(p =>
      p.isActive && p.user.toString() !== senderId.toString()
    );

    for (const participant of otherParticipants) {
      const isBlocked = await Block.areBlocked(senderId, participant.user);
      if (isBlocked) {
        return res.status(403).json({
          message: 'You cannot send messages to this conversation due to blocking restrictions',
          code: 'BLOCKING_RESTRICTION'
        });
      }
    }

    const messageData = {
      sender: senderId,
      conversation: actualConversationId,
      content,
      messageType
    };

    if (replyTo) messageData.replyTo = replyTo;
    if (Array.isArray(mentions) && mentions.length > 0) messageData.mentions = mentions;
    if (sharedContent) messageData.sharedContent = sharedContent;
    if (storyReply) messageData.storyReply = storyReply;

    messageData.seenBy = [senderId];

    const message = new Message(messageData);
    await message.save();

    // Update conversation's last message
    await conversation.updateLastMessage(message._id, message.createdAt);

    try {
      if (global.io) {
        // Emit to conversation room
        global.io.to(`conversation:${actualConversationId.toString()}`).emit('receive_message', message);
        // Also emit to individual user rooms for participants
        conversation.participants.forEach(participant => {
          if (participant.isActive && participant.user.toString() !== senderId.toString()) {
            global.io.to(`user:${participant.user}`).emit('receive_message', message);
          }
        });
      }
    } catch (err) {
      console.error('Socket emit error (send message):', err);
    }

    await message.populate('sender', 'username fullName profilePicture isVerified');

    try {
      // Send notifications to other participants
      const otherParticipants = conversation.participants.filter(p =>
        p.isActive && p.user.toString() !== senderId.toString()
      );

      for (const participant of otherParticipants) {
        await global.notificationService.createMessageNotification(
          participant.user,
          senderId,
          message._id,
          content,
          actualConversationId
        );
      }
    } catch (error) {
      console.error('Error creating message notifications:', error);
    }

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: message,
      conversationId: actualConversationId
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      message: 'Server error sending message',
      code: 'SEND_MESSAGE_ERROR'
    });
  }
});

// @route   GET /api/messages/conversations
// @desc    Get user conversations with pagination
// @access  Private
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const Conversation = require('../models/Conversation');
    const conversations = await Conversation.find({
      participants: {
        $elemMatch: { user: userId, isActive: true }
      },
      isActive: true
    })
      .populate('participants.user', 'username fullName profilePicture isVerified lastActive')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username fullName'
        }
      })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get blocked user IDs for filtering conversations
    const blockedUserIds = await Block.getBlockedUserIds(userId);
    const blockerUserIds = await Block.getBlockerUserIds(userId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])];

    // Calculate unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          isRead: false,
          seenBy: { $ne: userId }
        });

        // Format for backward compatibility with old aggregation structure
        if (conv.type === 'direct') {
          const otherParticipant = conv.participants.find(p =>
            p.user._id.toString() !== userId.toString()
          );

          // Filter out direct conversations with blocked users
          if (otherParticipant && allBlockedIds.includes(otherParticipant.user._id.toString())) {
            return null; // Skip this conversation
          }

          return {
            partner: otherParticipant ? otherParticipant.user : null,
            latestMessage: conv.lastMessage ? {
              _id: conv.lastMessage._id,
              content: conv.lastMessage.content ? conv.lastMessage.content.substring(0, 100) : '',
              messageType: conv.lastMessage.messageType,
              createdAt: conv.lastMessage.createdAt,
              isRead: conv.lastMessage.isRead
            } : null,
            unreadCount
          };
        } else {
          // For group chats, we might want to filter based on group participants, but for now keep them
          return {
            _id: conv._id,
            type: 'group',
            name: conv.name,
            avatar: conv.avatar,
            participants: conv.participants,
            latestMessage: conv.lastMessage ? {
              _id: conv.lastMessage._id,
              content: conv.lastMessage.content ? conv.lastMessage.content.substring(0, 100) : '',
              messageType: conv.lastMessage.messageType,
              createdAt: conv.lastMessage.createdAt,
              isRead: conv.lastMessage.isRead
            } : null,
            unreadCount
          };
        }
      })
    );

    // Filter out null conversations (blocked direct chats)
    const filteredConversations = conversationsWithUnread.filter(conv => conv !== null);

    const totalCount = await Conversation.countDocuments({
      participants: {
        $elemMatch: { user: userId, isActive: true }
      },
      isActive: true
    });

    res.json({
      conversations: filteredConversations,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      message: 'Server error fetching conversations',
      code: 'GET_CONVERSATIONS_ERROR'
    });
  }
});

// @route   GET /api/messages/conversation/:conversationId
// @desc    Get messages in a conversation
// @access  Private
router.get('/conversation/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Handle virtual IDs or invalid IDs
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      if (typeof conversationId === 'string' && conversationId.startsWith('direct_')) {
        // Find the actual conversation for this virtual ID
        const parts = conversationId.split('_');
        if (parts.length === 3) {
          const userA = parts[1];
          const userB = parts[2];
          const conv = await Conversation.findDirectConversation(userA, userB);
          if (conv) {
            // Continue with actual ID
            const messages = await Message.find({ conversation: conv._id, isDeleted: { $ne: true } })
              .populate('sender', 'username fullName profilePicture isVerified')
              .populate('replyTo', 'content sender')
              .populate('reactions.user', 'username fullName profilePicture')
              .sort({ createdAt: -1 }).skip(skip).limit(limit);
            return res.json({ messages });
          } else {
            // No conversation exists yet for this virtual ID, return empty array
            return res.json({ messages: [] });
          }
        }
      }
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: {
        $elemMatch: { user: userId, isActive: true }
      },
      isActive: true
    });

    if (!conversation) {
      return res.status(403).json({
        message: 'You are not a participant in this conversation',
        code: 'NOT_PARTICIPANT'
      });
    }

    // Get blocked user IDs for filtering messages
    const blockedUserIds = await Block.getBlockedUserIds(userId);
    const blockerUserIds = await Block.getBlockerUserIds(userId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])];

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: { $ne: true },
      sender: { $nin: allBlockedIds }
    })
      .populate('sender', 'username fullName profilePicture isVerified')
      .populate('replyTo', 'content sender')
      .populate('reactions.user', 'username fullName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Find unread messages from others
    const unreadMessages = await Message.find({
      conversation: conversationId,
      sender: { $ne: userId },
      isRead: false
    });

    if (unreadMessages.length > 0) {
      // Mark messages as read for current user
      await Message.updateMany(
        { _id: { $in: unreadMessages.map(m => m._id) } },
        { isRead: true, readAt: new Date(), $addToSet: { seenBy: userId } }
      );

      // Emit socket events
      try {
        if (global.io) {
          unreadMessages.forEach(msg => {
            // Emit to sender's personal room and conversation room (if needed)
            // Ideally avoid broadcasting to everyone if not necessary, but here we notify sender
            global.io.to(`user:${msg.sender}`).emit('message_read', {
              messageId: msg._id,
              conversationId: msg.conversation,
              userId
            });
            global.io.to(`conversation:${conversationId}`).emit('messages_read', {
              conversationId,
              userId,
              messageIds: [msg._id]
            });
          });
        }
      } catch (err) {
        console.error('Socket emit error (mark messages read):', err);
      }
    }

    const totalCount = await Message.countDocuments({
      conversation: conversationId,
      isDeleted: { $ne: true }
    });

    res.json({
      messages: messages.reverse(),
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({
      message: 'Server error fetching messages',
      code: 'GET_MESSAGES_ERROR'
    });
  }
});

// @route   GET /api/messages/:userId
// @desc    Get messages between current user and another user (backward compatibility)
// @access  Private
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    // Try to find existing direct conversation
    const Conversation = require('../models/Conversation');
    let conversation = await Conversation.findDirectConversation(currentUserId, userId);

    if (!conversation) {
      // Create conversation if it doesn't exist
      conversation = await Conversation.createDirectConversation(currentUserId, userId);
    }

    // Get blocked user IDs for filtering messages
    const blockedUserIds = await Block.getBlockedUserIds(currentUserId);
    const blockerUserIds = await Block.getBlockerUserIds(currentUserId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])];

    // Get messages from the conversation
    const messages = await Message.find({
      conversation: conversation._id,
      isDeleted: { $ne: true },
      sender: { $nin: allBlockedIds }
    })
      .populate('sender', 'username fullName profilePicture isVerified')
      .populate('replyTo', 'content sender')
      .populate('reactions.user', 'username fullName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Check for unread messages
    const unreadMessages = await Message.find({
      conversation: conversation._id,
      sender: { $ne: currentUserId },
      isRead: false
    });

    if (unreadMessages.length > 0) {
      // Mark messages as read for current user
      await Message.updateMany(
        { _id: { $in: unreadMessages.map(m => m._id) } },
        { isRead: true, readAt: new Date(), $addToSet: { seenBy: currentUserId } }
      );

      // Emit socket events
      try {
        if (global.io) {
          unreadMessages.forEach(msg => {
            global.io.to(`user:${msg.sender}`).emit('message_read', {
              messageId: msg._id,
              conversationId: msg.conversation,
              userId: currentUserId
            });
            global.io.to(`conversation:${conversation._id}`).emit('messages_read', {
              conversationId: conversation._id,
              userId: currentUserId,
              messageIds: [msg._id]
            });
          });
        }
      } catch (err) {
        console.error('Socket emit error (mark messages read):', err);
      }
    }

    const totalCount = await Message.countDocuments({
      conversation: conversation._id,
      isDeleted: { $ne: true }
    });

    res.json({
      messages: messages.reverse(),
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      message: 'Server error fetching messages',
      code: 'GET_MESSAGES_ERROR'
    });
  }
});

// @route   PUT /api/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put('/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // Check if user is participant in the conversation
    await message.populate('conversation');
    const isParticipant = message.conversation.participants.some(p =>
      p.user.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: 'You can only mark messages as read in your conversations',
        code: 'MARK_READ_PERMISSION_DENIED'
      });
    }

    const wasUpdated = message.markAsRead();
    if (wasUpdated) {
      const alreadySeen = message.seenBy && message.seenBy.find(id => id.toString() === userId.toString());
      if (!alreadySeen) {
        message.seenBy = message.seenBy || [];
        message.seenBy.push(userId);
      }
      await message.save();
      try {
        if (global.io) {
          global.io.to(`conversation:${message.sender}`).emit('message_read', { messageId: message._id, userId });
          global.io.to(`user:${message.sender}`).emit('message_read', { messageId: message._id, userId });
        }
      } catch (err) {
        console.error('Socket emit error (mark read):', err);
      }
    }

    res.json({
      message: 'Message marked as read',
      messageData: message
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      message: 'Server error marking message as read',
      code: 'MARK_READ_ERROR'
    });
  }
});

// @route   POST /api/messages/:messageId/reaction
// @desc    Add or update reaction to a message
// @access  Private
router.post('/:messageId/reaction', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({
        message: 'Emoji is required',
        code: 'EMOJI_REQUIRED'
      });
    }

    const message = await Message.findById(messageId).populate('conversation');
    if (!message) {
      return res.status(404).json({
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // Check if user is participant in the conversation
    const isParticipant = message.conversation.participants.some(p =>
      p.user.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: 'You can only react to messages in your conversations',
        code: 'REACTION_PERMISSION_DENIED'
      });
    }

    message.addReaction(userId, emoji);
    message.seenBy = message.seenBy || [];
    if (!message.seenBy.find(id => id.toString() === userId.toString())) {
      message.seenBy.push(userId);
    }
    await message.save();

    await message.populate('reactions.user', 'username fullName profilePicture');

    try {
      if (global.io) {
        // Emit to conversation room and participant user rooms
        global.io.to(`conversation:${message.conversation._id}`).emit('reaction_added', { messageId: message._id, reaction: message.reactions });
        message.conversation.participants.forEach(participant => {
          if (participant.isActive) {
            global.io.to(`user:${participant.user}`).emit('reaction_added', { messageId: message._id, reaction: message.reactions });
          }
        });
      }
    } catch (err) {
      console.error('Socket emit error (reaction added):', err);
    }

    res.json({
      message: 'Reaction added successfully',
      messageData: message
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      message: 'Server error adding reaction',
      code: 'ADD_REACTION_ERROR'
    });
  }
});

// @route   DELETE /api/messages/:messageId/reaction
// @desc    Remove reaction from a message
// @access  Private
router.delete('/:messageId/reaction', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    if (message.sender.toString() !== userId.toString() && message.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You can only remove reactions from messages in your conversations',
        code: 'REACTION_PERMISSION_DENIED'
      });
    }

    message.removeReaction(userId);
    message.seenBy = message.seenBy || [];
    if (!message.seenBy.find(id => id.toString() === userId.toString())) {
      message.seenBy.push(userId);
    }
    await message.save();

    try {
      if (global.io) {
        global.io.to(`conversation:${message.receiver}`).emit('reaction_removed', { messageId: message._id, userId });
        global.io.to(`conversation:${message.sender}`).emit('reaction_removed', { messageId: message._id, userId });
        global.io.to(`user:${message.receiver}`).emit('reaction_removed', { messageId: message._id, userId });
      }
    } catch (err) {
      console.error('Socket emit error (reaction removed):', err);
    }

    res.json({
      message: 'Reaction removed successfully',
      messageData: message
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      message: 'Server error removing reaction',
      code: 'REMOVE_REACTION_ERROR'
    });
  }
});

// @route   PUT /api/messages/:messageId
// @desc    Edit a message
// @access  Private
router.put('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({
        message: 'Content is required',
        code: 'CONTENT_REQUIRED'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You can only edit your own messages',
        code: 'EDIT_PERMISSION_DENIED'
      });
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({
        message: 'Messages can only be edited within 15 minutes of sending',
        code: 'EDIT_TIME_EXPIRED'
      });
    }

    message.editMessage(content);
    message.seenBy = message.seenBy || [];
    if (!message.seenBy.find(id => id.toString() === userId.toString())) {
      message.seenBy.push(userId);
    }
    await message.save();

    try {
      if (global.io) {
        global.io.to(`conversation:${message.receiver}`).emit('message_edited', { messageId: message._id, messageData: message });
        global.io.to(`conversation:${message.sender}`).emit('message_edited', { messageId: message._id, messageData: message });
        global.io.to(`user:${message.receiver}`).emit('message_edited', { messageId: message._id, messageData: message });
      }
    } catch (err) {
      console.error('Socket emit error (message edited):', err);
    }

    res.json({
      message: 'Message edited successfully',
      messageData: message
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      message: 'Server error editing message',
      code: 'EDIT_MESSAGE_ERROR'
    });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You can only delete your own messages',
        code: 'DELETE_PERMISSION_DENIED'
      });
    }

    message.deleteMessage();
    message.seenBy = message.seenBy || [];
    if (!message.seenBy.find(id => id.toString() === userId.toString())) {
      message.seenBy.push(userId);
    }
    await message.save();

    try {
      if (global.io) {
        global.io.to(`conversation:${message.receiver}`).emit('message_deleted', { messageId: message._id });
        global.io.to(`conversation:${message.sender}`).emit('message_deleted', { messageId: message._id });
        global.io.to(`user:${message.receiver}`).emit('message_deleted', { messageId: message._id });
      }
    } catch (err) {
      console.error('Socket emit error (message deleted):', err);
    }

    res.json({
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      message: 'Server error deleting message',
      code: 'DELETE_MESSAGE_ERROR'
    });
  }
});

// @route   POST /api/messages/:messageId/forward
// @desc    Forward a message to another user
// @access  Private
router.post('/:messageId/forward', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { receiverId } = req.body;
    const userId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({
        message: 'Receiver ID is required',
        code: 'RECEIVER_ID_REQUIRED'
      });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // Verify user is participant in the original conversation
    const Conversation = require('../models/Conversation');
    const originalConversation = await Conversation.findOne({
      _id: originalMessage.conversation,
      participants: { $elemMatch: { user: userId, isActive: true } }
    });

    if (!originalConversation) {
      return res.status(403).json({
        message: 'You can only forward messages from your conversations',
        code: 'FORWARD_PERMISSION_DENIED'
      });
    }

    // Find or create target conversation with receiver
    let targetConversation = await Conversation.findDirectConversation(userId, receiverId);
    if (!targetConversation) {
      targetConversation = await Conversation.createDirectConversation(userId, receiverId);
    }

    // Create forwarded message
    const forwardedMessage = originalMessage.forwardMessage(receiverId, userId);
    forwardedMessage.conversation = targetConversation._id;
    await forwardedMessage.save();

    // Update target conversation
    await targetConversation.updateLastMessage(forwardedMessage._id, forwardedMessage.createdAt);

    await forwardedMessage.populate('sender', 'username fullName profilePicture isVerified');
    await forwardedMessage.populate('receiver', 'username fullName profilePicture isVerified');

    try {
      if (global.io) {
        global.io.to(`conversation:${receiverId}`).emit('receive_message', forwardedMessage);
        global.io.to(`user:${receiverId}`).emit('receive_message', forwardedMessage);
      }
    } catch (err) {
      console.error('Socket emit error (forward message):', err);
    }

    res.status(201).json({
      message: 'Message forwarded successfully',
      messageData: forwardedMessage
    });

  } catch (error) {
    console.error('Forward message error:', error);
    res.status(500).json({
      message: 'Server error forwarding message',
      code: 'FORWARD_MESSAGE_ERROR'
    });
  }
});

// @route   PUT /api/messages/:messageId/seen
// @desc    Add current user to seenBy for the message (idempotent)
// @access  Private
router.put('/:messageId/seen', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId).populate('conversation');
    if (!message) {
      return res.status(404).json({
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // Check if user is participant in the conversation
    const isParticipant = message.conversation.participants.some(p =>
      p.user.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: 'You can only mark messages as seen in your conversations',
        code: 'SEEN_PERMISSION_DENIED'
      });
    }

    message.seenBy = message.seenBy || [];
    if (!message.seenBy.find(id => id.toString() === userId.toString())) {
      message.seenBy.push(userId);
      if (!message.isRead) {
        message.isRead = true;
        message.readAt = new Date();
      }
      await message.save();
    }

    res.json({
      message: 'Marked as seen',
      messageData: message
    });

  } catch (error) {
    console.error('Mark seen error:', error);
    res.status(500).json({
      message: 'Server error marking message as seen',
      code: 'MARK_SEEN_ERROR'
    });
  }
});

module.exports = router;
