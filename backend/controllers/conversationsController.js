const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Block = require('../models/Block');
const Message = require('../models/Message');

exports.createConversation = async (req, res) => {
  try {
    const { type, participants, name, description } = req.body;
    const userId = req.user._id;

    if (type !== 'direct') {
      return res.status(400).json({
        message: 'Invalid conversation type. Only direct messages are supported.',
        code: 'INVALID_TYPE'
      });
    }

    if (!participants || participants.length !== 1) {
      return res.status(400).json({
        message: 'Direct conversations must have exactly one other participant',
        code: 'INVALID_PARTICIPANTS'
      });
    }

    const existingConversation = await Conversation.findDirectConversation(userId, participants[0]);
    if (existingConversation) {
      return res.status(200).json({
        message: 'Direct conversation already exists',
        conversation: existingConversation
      });
    }

    const conversation = await Conversation.createDirectConversation(userId, participants[0]);
    await conversation.populate('participants.user', 'username fullName profilePicture isVerified');

    res.status(201).json({
      message: 'Direct conversation created successfully',
      conversation
    });

  } catch (error) {
    console.error('Failed to create new chat:', error.message);
    res.status(500).json({
      message: 'Internal error while starting the chat'
    });
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
    console.error('Failed to list chats:', error.message);
    res.status(500).json({ message: 'Error getting your conversations' });
  }
};

exports.getOrCreateConversationWithUser = async (req, res) => {
  try {
    let { userId } = req.params;
    const currentUserId = req.user._id;
    let targetUser;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      targetUser = await User.findOne({
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
    } else {
      targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
    }

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        message: 'You cannot talk to yourself!',
        code: 'INVALID_PARTICIPANT'
      });
    }

    const conversation = await Conversation.createDirectConversation(currentUserId, userId);

    await conversation.populate('participants.user', 'username fullName profilePicture isVerified lastActive');

    res.json({ conversation });

  } catch (error) {
    console.error('Get conversation by user error:', error);
    res.status(500).json({
      message: 'Server error fetching conversation',
      code: 'GET_CONVERSATION_ERROR'
    });
  }
};

exports.getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        message: 'Invalid conversation ID',
        code: 'INVALID_CONVERSATION_ID'
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $elemMatch: { user: userId } },
      isActive: true
    })
      .populate('participants.user', 'username fullName profilePicture isVerified lastActive')
      .populate('createdBy', 'username fullName');

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    const participant = conversation.participants.find(p => p.user && p.user._id && p.user._id.toString() === userId.toString());
    if (participant && !participant.isActive) {
      await Conversation.updateOne({ _id: conversationId, 'participants.user': userId }, { $set: { 'participants.$.isActive': true } });
      participant.isActive = true;
      console.log(`[Re-activated] User ${userId} re-activated in direct conversation ${conversationId}`);
    }

    res.json({ conversation });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      message: 'Server error fetching conversation',
      code: 'GET_CONVERSATION_ERROR'
    });
  }
};


exports.leaveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: {
        $elemMatch: { user: userId, isActive: true }
      },
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    conversation.participants = conversation.participants.map(p =>
      p.user.toString() === userId.toString() ? { ...p, isActive: false } : p
    );
    await conversation.save();

    res.json({
      message: 'Conversation left successfully'
    });

  } catch (error) {
    console.error('Leave conversation error:', error);
    res.status(500).json({
      message: 'Server error leaving conversation',
      code: 'LEAVE_CONVERSATION_ERROR'
    });
  }
};