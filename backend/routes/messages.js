const express = require('express');
const Message = require('../models/Message');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiver, content, messageType = 'text' } = req.body;
    const senderId = req.user._id;

    const messageData = {
      sender: senderId,
      receiver,
      content,
      messageType
    };

    const message = new Message(messageData);
    await message.save();

    await message.populate('sender', 'username fullName profilePicture isVerified');

    try {
      await global.notificationService.createMessageNotification(
        receiver,
        senderId,
        message._id,
        content
      );
    } catch (error) {
      console.error('Error creating message notification:', error);
    }

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: message
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

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
          isDeleted: { $ne: true }
        }
      },
      {
        $addFields: {
          conversationId: {
            $cond: {
              if: { $lt: ["$sender", "$receiver"] },
              then: { $concat: [{ $toString: "$sender" }, "_", { $toString: "$receiver" }] },
              else: { $concat: [{ $toString: "$receiver" }, "_", { $toString: "$sender" }] }
            }
          },
          partnerId: {
            $cond: {
              if: { $eq: ["$sender", userId] },
              then: "$receiver",
              else: "$sender"
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: "$conversationId",
          latestMessage: { $first: "$$ROOT" },
          partnerId: { $first: "$partnerId" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiver", userId] }, { $eq: ["$isRead", false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "partnerId",
          foreignField: "_id",
          as: "partner"
        }
      },
      {
        $unwind: "$partner"
      },
      {
        $project: {
          _id: 0,
          partner: {
            _id: 1,
            username: 1,
            fullName: 1,
            profilePicture: 1,
            isVerified: 1,
            lastActive: 1
          },
          latestMessage: {
            _id: 1,
            content: { $substr: ["$latestMessage.content", 0, 100] },
            messageType: 1,
            createdAt: 1,
            isRead: 1
          },
          unreadCount: 1
        }
      },
      {
        $sort: { "latestMessage.createdAt": -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]);

    const totalAgg = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
          isDeleted: { $ne: true }
        }
      },
      {
        $addFields: {
          conversationId: {
            $cond: {
              if: { $lt: ["$sender", "$receiver"] },
              then: { $concat: [{ $toString: "$sender" }, "_", { $toString: "$receiver" }] },
              else: { $concat: [{ $toString: "$receiver" }, "_", { $toString: "$sender" }] }
            }
          }
        }
      },
      {
        $group: {
          _id: "$conversationId"
        }
      },
      {
        $count: "total"
      }
    ]);

    const totalCount = totalAgg.length > 0 ? totalAgg[0].total : 0;

    res.json({
      conversations,
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

// @route   GET /api/messages/:userId
// @desc    Get messages between current user and another user
// @access  Private
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ],
      isDeleted: { $ne: true }
    })
    .populate('sender', 'username fullName profilePicture isVerified')
    .populate('receiver', 'username fullName profilePicture isVerified')
    .populate('replyTo', 'content sender')
    .populate('reactions.user', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    await Message.updateMany(
      { sender: userId, receiver: currentUserId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    await Message.updateMany(
      { sender: userId, receiver: currentUserId, isDelivered: false },
      { isDelivered: true, deliveredAt: new Date() }
    );

    const totalCount = await Message.countDocuments({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ],
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

    if (message.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You can only mark your own messages as read',
        code: 'MARK_READ_PERMISSION_DENIED'
      });
    }

    const wasUpdated = message.markAsRead();
    if (wasUpdated) {
      await message.save();
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

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    if (message.sender.toString() !== userId.toString() && message.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You can only react to messages in your conversations',
        code: 'REACTION_PERMISSION_DENIED'
      });
    }

    message.addReaction(userId, emoji);
    await message.save();

    await message.populate('reactions.user', 'username fullName profilePicture');

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
    await message.save();

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
    await message.save();

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
    await message.save();

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

    if (originalMessage.sender.toString() !== userId.toString() && originalMessage.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You can only forward messages from your conversations',
        code: 'FORWARD_PERMISSION_DENIED'
      });
    }

    const forwardedMessage = originalMessage.forwardMessage(receiverId, userId);
    await forwardedMessage.save();

    await forwardedMessage.populate('sender', 'username fullName profilePicture isVerified');
    await forwardedMessage.populate('receiver', 'username fullName profilePicture isVerified');

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

module.exports = router;
