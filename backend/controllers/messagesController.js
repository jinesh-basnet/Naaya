const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Block = require('../models/Block');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Story = require('../models/Story');
const { validationResult } = require('express-validator');

exports.sendMessage = async (req, res) => {
  try {
    const {
      conversationId,
      content,
      messageType = 'text',
      replyTo,
      mentions,
      sharedContent,
      storyReply,
      clientId,
      iv,
      isEncrypted
    } = req.body;
    const senderId = req.user._id;

    if (clientId) {
      const alreadyThere = await Message.findOne({ clientId });
      if (alreadyThere) {
        console.log(`[Dedupe] Message with clientID ${clientId} already exists. Skipping.`);
        return res.status(200).json({
          message: 'Already sent!',
          messageData: alreadyThere
        });
      }
    }

    let actualConversationId = conversationId;
    let conversation;

    if (typeof conversationId === 'string' && conversationId.startsWith('direct_')) {
      const parts = conversationId.split('_');
      if (parts.length === 3) {
        let userA = parts[1];
        let userB = parts[2];

        if (!mongoose.Types.ObjectId.isValid(userA)) {
          const user = await User.findOne({ username: new RegExp(`^${userA}$`, 'i') });
          if (user) userA = user._id.toString();
        }
        if (!mongoose.Types.ObjectId.isValid(userB)) {
          const user = await User.findOne({ username: new RegExp(`^${userB}$`, 'i') });
          if (user) userB = user._id.toString();
        }

        if (userA !== senderId.toString() && userB !== senderId.toString()) {
          return res.status(403).json({ message: 'Unauthorized conversation ID' });
        }

        const targetUserId = userA === senderId.toString() ? userB : userA;
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
          return res.status(400).json({ message: 'Could not resolve target user ID' });
        }

        conversation = await Conversation.createDirectConversation(senderId, targetUserId);
        actualConversationId = conversation._id;
      }
    }

    if (!conversation) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID' });
      }

      conversation = await Conversation.findOne({
        _id: conversationId,
        participants: { $elemMatch: { user: senderId } },
        isActive: true
      });

      if (!conversation) {
        return res.status(403).json({
          message: 'You are not a participant in this conversation',
          code: 'NOT_PARTICIPANT'
        });
      }

      if (conversation.type === 'direct') {
        let dirty = false;
        conversation.participants.forEach(p => {
          if (!p.isActive) {
            p.isActive = true;
            dirty = true;
          }
        });
        if (dirty) {
          await conversation.save();
          console.log(`[Re-activated] Participants in DM ${conversationId} re-activated on sendMessage`);
        }
      }
    }

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

    const isEncryptedBool = isEncrypted === 'true' || isEncrypted === true;
    const resolvedContent = req.file ? `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${req.file.filename}` : content;

    const messageData = {
      sender: senderId,
      conversation: actualConversationId,
      content: isEncryptedBool ? undefined : resolvedContent,
      encryptedContent: isEncryptedBool ? resolvedContent : undefined,
      messageType: req.file ? (req.body.messageType || 'image') : messageType,
      clientId,
      iv,
      isEncrypted: isEncryptedBool
    };

    if (replyTo) messageData.replyTo = replyTo;
    if (Array.isArray(mentions) && mentions.length > 0) messageData.mentions = mentions;
    if (sharedContent) messageData.sharedContent = sharedContent;
    if (storyReply) messageData.storyReply = storyReply;

    messageData.seenBy = [senderId];

    messageData.deliveredTo = [{ user: senderId, deliveredAt: new Date() }];

    const message = new Message(messageData);
    await message.save();

    await conversation.updateLastMessage(message._id, message.createdAt);

    try {
      if (global.io) {
        global.io.to(`conversation:${actualConversationId.toString()}`).emit('receive_message', message);

        for (const p of conversation.participants) {
          if (p.isActive && p.user.toString() !== senderId.toString()) {
            global.io.to(`user:${p.user}`).emit('receive_message', message);
          }
        }
      }
    } catch (socketErr) {
      console.error('Socket error:', socketErr.message);
    }

    await message.populate('sender', 'username fullName profilePicture isVerified');

    if (global.notificationService) {
      for (const p of otherParticipants) {
        global.notificationService.message(p.user, senderId, message._id, content);
      }
    }


    res.status(201).json({
      message: 'Message sent!',
      messageData: message
    });

  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ message: 'Could not send the message' });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const blockedUserIds = await Block.getBlockedUserIds(userId);
    const blockerUserIds = await Block.getBlockerUserIds(userId);
    const allBlockedSet = new Set([...blockedUserIds, ...blockerUserIds].map(String));

    const [conversations, totalCount] = await Promise.all([
      Conversation.find({
        participants: { $elemMatch: { user: userId, isActive: true } },
        isActive: true
      })
        .populate('participants.user', 'username fullName profilePicture isVerified lastActive')
        .populate({
          path: 'lastMessage',
          select: 'content messageType createdAt isRead sender',
          populate: { path: 'sender', select: '_id username fullName' }
        })
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Conversation.countDocuments({
        participants: { $elemMatch: { user: userId, isActive: true } },
        isActive: true
      })
    ]);

    const convIds = conversations.map(c => c._id);
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversation: { $in: convIds },
          sender: { $ne: userId },
          seenBy: { $not: { $elemMatch: { $eq: userId } } }
        }
      },
      { $group: { _id: '$conversation', count: { $sum: 1 } } }
    ]);
    const unreadMap = {};
    unreadAgg.forEach(u => { unreadMap[u._id.toString()] = u.count; });

    const filtered = conversations
      .map(conv => {
        const unreadCount = unreadMap[conv._id.toString()] || 0;
        const lastMsg = conv.lastMessage || null;

        const latestMessage = lastMsg ? {
          _id: lastMsg._id,
          content: lastMsg.content ? lastMsg.content.substring(0, 100) : '',
          messageType: lastMsg.messageType,
          createdAt: lastMsg.createdAt,
          isRead: lastMsg.isRead,
          sender: lastMsg.sender || null
        } : null;

        const otherParticipant = conv.participants.find(p =>
          p.user && p.user._id && p.user._id.toString() !== userId.toString()
        );
        const partner = otherParticipant?.user || null;
        if (partner && allBlockedSet.has(partner._id.toString())) return null;

        return { _id: conv._id, type: 'direct', partner, latestMessage, unreadCount };
      })
      .filter(Boolean);

    res.json({
      conversations: filtered,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error fetching conversations', code: 'GET_CONVERSATIONS_ERROR' });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      if (typeof conversationId === 'string' && conversationId.startsWith('direct_')) {
        const parts = conversationId.split('_');
        if (parts.length === 3) {
          let userA = parts[1];
          let userB = parts[2];

          if (!mongoose.Types.ObjectId.isValid(userA)) {
            const user = await User.findOne({ username: new RegExp(`^${userA}$`, 'i') });
            if (user) userA = user._id.toString();
          }
          if (!mongoose.Types.ObjectId.isValid(userB)) {
            const user = await User.findOne({ username: new RegExp(`^${userB}$`, 'i') });
            if (user) userB = user._id.toString();
          }

          const conv = await Conversation.findDirectConversation(userA, userB);
          if (conv) {
            const messages = await Message.find({ conversation: conv._id })
              .populate('sender', 'username fullName profilePicture isVerified')
              .populate('replyTo', 'content sender')
              .populate('reactions.user', 'username fullName profilePicture')
              .sort({ createdAt: -1 }).skip(skip).limit(limit);
            return res.json({ messages });
          } else {
            return res.json({ messages: [] });
          }
        }
      }
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $elemMatch: { user: userId } },
      isActive: true
    });

    if (!conversation) {
      console.log(`[403 Forbidden] User ${userId} is not in conversation ${conversationId}`);
      const exists = await Conversation.findById(conversationId);
      if (exists) {
        console.log(`Conversation exists but user is not in participants:`, exists.participants.map(p => `${p.user} (active: ${p.isActive})`));
      } else {
        console.log(`Conversation ${conversationId} does not exist at all.`);
      }
      return res.status(403).json({
        message: 'You are not a participant in this conversation',
        code: 'NOT_PARTICIPANT'
      });
    }

    const participant = conversation.participants.find(p => p.user.toString() === userId.toString());
    if (participant && !participant.isActive) {
      participant.isActive = true;
      await conversation.save();
      console.log(`[Re-activated] User ${userId} re-activated in direct conversation ${conversationId}`);
    }

    const blockedUserIds = await Block.getBlockedUserIds(userId);
    const blockerUserIds = await Block.getBlockerUserIds(userId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])];

    const messages = await Message.find({
      conversation: conversationId,
      sender: { $nin: allBlockedIds }
    })
      .populate('sender', 'username fullName profilePicture isVerified')
      .populate('replyTo', 'content sender')
      .populate('reactions.user', 'username fullName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const undeliveredMessages = await Message.find({
      conversation: conversationId,
      sender: { $ne: userId },
      'deliveredTo.user': { $ne: userId }
    });

    if (undeliveredMessages.length > 0) {
      await Message.updateMany(
        { _id: { $in: undeliveredMessages.map(m => m._id) } },
        {
          $push: { deliveredTo: { user: userId, deliveredAt: new Date() } },
          $set: { isDelivered: true, deliveredAt: new Date() }
        }
      );

      try {
        if (global.io) {
          undeliveredMessages.forEach(msg => {
            global.io.to(`user:${msg.sender}`).emit('message_delivered', {
              messageId: msg._id,
              conversationId: msg.conversation,
              userId
            });
          });
        }
      } catch (err) { }
    }

    const unreadMessages = await Message.find({
      conversation: conversationId,
      sender: { $ne: userId },
      isRead: false
    });

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessages.map(m => m._id) } },
        { isRead: true, readAt: new Date(), $addToSet: { seenBy: userId } }
      );

      try {
        if (global.io) {
          global.io.to(`conversation:${conversationId}`).emit('messages_read', {
            conversationId,
            userId,
            messageIds: unreadMessages.map(m => m._id)
          });

          unreadMessages.forEach(msg => {
            global.io.to(`user:${msg.sender}`).emit('message_read', {
              messageId: msg._id,
              conversationId: msg.conversation,
              userId
            });
          });
        }
      } catch (err) {
        console.error('Socket emit error (mark messages read):', err);
      }
    }

    const totalCount = await Message.countDocuments({
      conversation: conversationId
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
};
exports.searchConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { q } = req.query;
    const userId = req.user._id;

    if (!q || q.trim() === '') {
      return res.json({ messages: [] });
    }

    let actualId = conversationId;
    if (typeof conversationId === 'string' && conversationId.startsWith('direct_')) {
      const parts = conversationId.split('_');
      if (parts.length === 3) {
        let userA = parts[1], userB = parts[2];
        if (!mongoose.Types.ObjectId.isValid(userA)) {
          const uA = await User.findOne({ username: new RegExp(`^${userA}$`, 'i') });
          if (uA) userA = uA._id.toString();
        }
        if (!mongoose.Types.ObjectId.isValid(userB)) {
          const uB = await User.findOne({ username: new RegExp(`^${userB}$`, 'i') });
          if (uB) userB = uB._id.toString();
        }
        const existing = await Conversation.findDirectConversation(userA, userB);
        if (!existing) return res.json({ messages: [] });
        actualId = existing._id;
      }
    }

    if (!mongoose.Types.ObjectId.isValid(actualId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findOne({
      _id: actualId,
      participants: { $elemMatch: { user: userId } },
      isActive: true
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    const participant = conversation.participants.find(p => p.user.toString() === userId.toString());
    if (participant && !participant.isActive) {
      participant.isActive = true;
      await conversation.save();
      console.log(`[Re-activated] User ${userId} re-activated in direct conversation ${actualId} via search`);
    }

    const blockedUserIds = await Block.getBlockedUserIds(userId);
    const blockerUserIds = await Block.getBlockerUserIds(userId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])];

    const messages = await Message.find({
      conversation: actualId,
      content: { $regex: q, $options: 'i' },
      messageType: 'text',
      isDeleted: { $ne: true },
      sender: { $nin: allBlockedIds }
    })
      .populate('sender', 'username fullName profilePicture isVerified')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ messages });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ message: 'Server error', code: 'SEARCH_ERROR' });
  }
};

exports.getMessagesByUser = async (req, res) => {
  try {
    let { userId } = req.params;
    const currentUserId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const targetUser = await User.findOne({
        $or: [
          { username: userId },
          { username: new RegExp(`^${userId}$`, 'i') }
        ]
      });

      if (!targetUser) {
        return res.status(404).json({
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      userId = targetUser._id.toString();
    }

    const conversation = await Conversation.createDirectConversation(currentUserId, userId);

    const blockedUserIds = await Block.getBlockedUserIds(currentUserId);
    const blockerUserIds = await Block.getBlockerUserIds(currentUserId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])];

    const messages = await Message.find({
      conversation: conversation._id,
      sender: { $nin: allBlockedIds }
    })
      .populate('sender', 'username fullName profilePicture isVerified')
      .populate('replyTo', 'content sender')
      .populate('reactions.user', 'username fullName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const unreadMessages = await Message.find({
      conversation: conversation._id,
      sender: { $ne: currentUserId },
      isRead: false
    });

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessages.map(m => m._id) } },
        { isRead: true, readAt: new Date(), $addToSet: { seenBy: currentUserId } }
      );

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
      conversation: conversation._id
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
};

exports.markMessageRead = async (req, res) => {
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

    await message.populate('conversation');

    if (!message.conversation || !message.conversation.participants) {
      console.error(`🚨 Message ${messageId} conversation is null or missing participants!`, message.conversation);
    }

    const isAnyParticipant = message.conversation && message.conversation.participants && message.conversation.participants.some(p =>
      p.user.toString() === userId.toString()
    );

    if (!isAnyParticipant) {
      console.log(`[403 Forbidden] userId ${userId} not a participant in conv ${message.conversation?._id}. Participants:`, message.conversation?.participants?.map(p => `${p.user} (active: ${p.isActive})`));
      return res.status(403).json({
        message: 'You can only mark messages as read in your conversations',
        code: 'MARK_READ_PERMISSION_DENIED'
      });
    }

    const participant = message.conversation.participants.find(p => p.user.toString() === userId.toString());
    if (participant && !participant.isActive) {
      participant.isActive = true;
      await Conversation.updateOne({ _id: message.conversation._id, 'participants.user': userId }, { $set: { 'participants.$.isActive': true } });
      console.log(`[Re-activated] User ${userId} re-activated in direct conversation ${message.conversation._id} via markRead`);
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
          global.io.to(`conversation:${message.conversation._id || message.conversation}`).emit('message_read', {
            messageId: message._id,
            userId,
            conversationId: message.conversation._id || message.conversation
          });
          global.io.to(`user:${message.sender}`).emit('message_read', {
            messageId: message._id,
            userId,
            conversationId: message.conversation._id || message.conversation
          });
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
};

exports.markAllMessagesRead = async (req, res) => {
  try {
    let actualConversationId = conversationId;
    let conversation;

    if (typeof conversationId === 'string' && conversationId.startsWith('direct_')) {
      const parts = conversationId.split('_');
      if (parts.length === 3) {
        let userA = parts[1];
        let userB = parts[2];

        if (!mongoose.Types.ObjectId.isValid(userA)) {
          const user = await User.findOne({ username: new RegExp(`^${userA}$`, 'i') });
          if (user) userA = user._id.toString();
        }
        if (!mongoose.Types.ObjectId.isValid(userB)) {
          const user = await User.findOne({ username: new RegExp(`^${userB}$`, 'i') });
          if (user) userB = user._id.toString();
        }

        conversation = await Conversation.findDirectConversation(userA, userB);
        if (conversation) actualConversationId = conversation._id;
      }
    }

    if (!conversation) {
      if (!mongoose.Types.ObjectId.isValid(actualConversationId)) {
        return res.json({ message: 'No conversation found for read-all (success)', count: 0 });
      }

      conversation = await Conversation.findOne({
        _id: actualConversationId,
        participants: { $elemMatch: { user: userId } },
        isActive: true
      });
    }

    if (!conversation) {
      return res.status(403).json({ message: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    const participant = conversation.participants.find(p => p.user.toString() === userId.toString());
    if (participant && !participant.isActive) {
      participant.isActive = true;
      await conversation.save();
      console.log(`[Re-activated] User ${userId} re-activated in DM ${actualConversationId} via markAllRead`);
    }

    const unreadMessages = await Message.find({
      conversation: conversation._id,
      sender: { $ne: userId },
      seenBy: { $ne: userId }
    });

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessages.map(m => m._id) } },
        { isRead: true, readAt: new Date(), $addToSet: { seenBy: userId } }
      );

      if (global.io) {
        global.io.to(`conversation:${conversation._id}`).emit('messages_read', {
          conversationId: conversation._id,
          userId,
          messageIds: unreadMessages.map(m => m._id)
        });
      }
    }

    res.json({ message: 'All messages marked as read', count: unreadMessages.length });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Server error', code: 'MARK_READ_ALL_ERROR' });
  }
};

exports.addReaction = async (req, res) => {
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
};

exports.removeReaction = async (req, res) => {
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
        global.io.to(`conversation:${message.conversation.toString()}`).emit('reaction_removed', {
          messageId: message._id,
          userId,
          conversationId: message.conversation
        });
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
};

exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, iv, isEncrypted } = req.body;
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

    message.editMessage(content, iv, isEncrypted);
    message.seenBy = message.seenBy || [];
    if (!message.seenBy.find(id => id.toString() === userId.toString())) {
      message.seenBy.push(userId);
    }
    await message.save();

    try {
      if (global.io) {
        global.io.to(`conversation:${message.conversation.toString()}`).emit('message_edited', {
          messageId: message._id,
          messageData: message,
          conversationId: message.conversation
        });
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
};

exports.deleteMessage = async (req, res) => {
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
        global.io.to(`conversation:${message.conversation.toString()}`).emit('message_deleted', {
          messageId: message._id,
          conversationId: message.conversation
        });
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
};

exports.forwardMessage = async (req, res) => {
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

    let targetConversation = await Conversation.findDirectConversation(userId, receiverId);
    if (!targetConversation) {
      targetConversation = await Conversation.createDirectConversation(userId, receiverId);
    }

    const forwardedMessage = originalMessage.forwardMessage(receiverId, userId);
    forwardedMessage.conversation = targetConversation._id;
    await forwardedMessage.save();

    await targetConversation.updateLastMessage(forwardedMessage._id, forwardedMessage.createdAt);

    await forwardedMessage.populate('sender', 'username fullName profilePicture isVerified');
    await forwardedMessage.populate('receiver', 'username fullName profilePicture isVerified');

    try {
      if (global.io) {
        global.io.to(`conversation:${targetConversation._id.toString()}`).emit('receive_message', forwardedMessage);
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
};

exports.markMessageSeen = async (req, res) => {
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
};
