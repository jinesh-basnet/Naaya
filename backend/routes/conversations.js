const express = require('express');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/conversations
// @desc    Create a new conversation (direct or group)
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, participants, name, description } = req.body;
    const userId = req.user._id;

    if (type === 'direct') {
      // For direct conversations, participants should be exactly 1 other user
      if (!participants || participants.length !== 1) {
        return res.status(400).json({
          message: 'Direct conversations must have exactly one other participant',
          code: 'INVALID_PARTICIPANTS'
        });
      }

      // Check if direct conversation already exists
      const existingConversation = await Conversation.findDirectConversation(userId, participants[0]);
      if (existingConversation) {
        return res.status(200).json({
          message: 'Direct conversation already exists',
          conversation: existingConversation
        });
      }

      // Create direct conversation
      const conversation = await Conversation.createDirectConversation(userId, participants[0]);
      await conversation.populate('participants.user', 'username fullName profilePicture isVerified');

      res.status(201).json({
        message: 'Direct conversation created successfully',
        conversation
      });

    } else if (type === 'group') {
      // For group conversations
      if (!participants || participants.length < 1) {
        return res.status(400).json({
          message: 'Group conversations must have at least one participant',
          code: 'INVALID_PARTICIPANTS'
        });
      }

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          message: 'Group name is required',
          code: 'NAME_REQUIRED'
        });
      }

      // Add creator to participants
      const allParticipants = [userId, ...participants];

      const conversation = new Conversation({
        type: 'group',
        participants: allParticipants.map(p => ({ user: p, role: p === userId ? 'admin' : 'member' })),
        name: name.trim(),
        description: description ? description.trim() : '',
        createdBy: userId
      });

      await conversation.save();
      await conversation.populate('participants.user', 'username fullName profilePicture isVerified');

      res.status(201).json({
        message: 'Group conversation created successfully',
        conversation
      });

    } else {
      return res.status(400).json({
        message: 'Invalid conversation type',
        code: 'INVALID_TYPE'
      });
    }

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      message: 'Server error creating conversation',
      code: 'CREATE_CONVERSATION_ERROR'
    });
  }
});

// @route   GET /api/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: {
        $elemMatch: { user: userId, isActive: true }
      },
      isActive: true
    })
      .populate('participants.user', 'username fullName profilePicture isVerified lastActive')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate unread counts
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await require('../models/Message').countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          isRead: false,
          seenBy: { $ne: userId }
        });

        return {
          ...conv.toObject(),
          unreadCount
        };
      })
    );

    const totalCount = await Conversation.countDocuments({
      participants: {
        $elemMatch: { user: userId, isActive: true }
      },
      isActive: true
    });

    res.json({
      conversations: conversationsWithUnread,
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

// @route   GET /api/conversations/user/:userId
// @desc    Get or create direct conversation with a user
// @access  Private
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    // Check if trying to chat with self
    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        message: 'Cannot create conversation with yourself',
        code: 'INVALID_PARTICIPANT'
      });
    }

    // Check if user exists
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    let conversation = await Conversation.findDirectConversation(currentUserId, userId);

    if (!conversation) {
      conversation = await Conversation.createDirectConversation(currentUserId, userId);
    }

    await conversation.populate('participants.user', 'username fullName profilePicture isVerified lastActive');

    res.json({ conversation });

  } catch (error) {
    console.error('Get conversation by user error:', error);
    res.status(500).json({
      message: 'Server error fetching conversation',
      code: 'GET_CONVERSATION_ERROR'
    });
  }
});

// @route   GET /api/conversations/:conversationId
// @desc    Get conversation details
// @access  Private
router.get('/:conversationId', authenticateToken, async (req, res) => {
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
      participants: {
        $elemMatch: { user: userId, isActive: true }
      },
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

    res.json({ conversation });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      message: 'Server error fetching conversation',
      code: 'GET_CONVERSATION_ERROR'
    });
  }
});

// @route   PUT /api/conversations/:conversationId
// @desc    Update group conversation
// @access  Private
router.put('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { name, description, avatar } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: {
        $elemMatch: { user: userId, role: 'admin', isActive: true }
      },
      type: 'group',
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        message: 'Group conversation not found or you are not an admin',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    if (name !== undefined) conversation.name = name.trim();
    if (description !== undefined) conversation.description = description ? description.trim() : '';
    if (avatar !== undefined) conversation.avatar = avatar;

    await conversation.save();

    res.json({
      message: 'Group conversation updated successfully',
      conversation
    });

  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({
      message: 'Server error updating conversation',
      code: 'UPDATE_CONVERSATION_ERROR'
    });
  }
});

// @route   POST /api/conversations/:conversationId/participants
// @desc    Add participant to group
// @access  Private
router.post('/:conversationId/participants', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: {
        $elemMatch: { user: currentUserId, role: 'admin', isActive: true }
      },
      type: 'group',
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        message: 'Group conversation not found or you are not an admin',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    await conversation.addParticipant(userId);
    await conversation.populate('participants.user', 'username fullName profilePicture isVerified');

    res.json({
      message: 'Participant added successfully',
      conversation
    });

  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      message: 'Server error adding participant',
      code: 'ADD_PARTICIPANT_ERROR'
    });
  }
});

// @route   DELETE /api/conversations/:conversationId/participants/:userId
// @desc    Remove participant from group
// @access  Private
router.delete('/:conversationId/participants/:userId', authenticateToken, async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: {
        $elemMatch: { user: currentUserId, role: 'admin', isActive: true }
      },
      type: 'group',
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        message: 'Group conversation not found or you are not an admin',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    await conversation.removeParticipant(userId);
    await conversation.populate('participants.user', 'username fullName profilePicture isVerified');

    res.json({
      message: 'Participant removed successfully',
      conversation
    });

  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      message: 'Server error removing participant',
      code: 'REMOVE_PARTICIPANT_ERROR'
    });
  }
});

// @route   DELETE /api/conversations/:conversationId
// @desc    Leave or delete group conversation
// @access  Private
router.delete('/:conversationId', authenticateToken, async (req, res) => {
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

    if (conversation.type === 'direct') {
      // For direct conversations, mark as inactive for this user
      conversation.participants = conversation.participants.map(p =>
        p.user.toString() === userId.toString() ? { ...p, isActive: false } : p
      );
      await conversation.save();
    } else {
      // For groups, remove participant
      await conversation.removeParticipant(userId);

      // If no active participants left, mark conversation as inactive
      const activeParticipants = conversation.participants.filter(p => p.isActive);
      if (activeParticipants.length === 0) {
        conversation.isActive = false;
        await conversation.save();
      }
    }

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
});

module.exports = router;
