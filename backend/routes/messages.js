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

    // Create message notification
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

    // Get total count for pagination
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

module.exports = router;
