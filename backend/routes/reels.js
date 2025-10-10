const express = require('express');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { uploadSingle } = require('../middleware/upload');
const Reel = require('../models/Reel');
const User = require('../models/User');
const { authenticateToken, optionalAuth } = require('../middleware/auth');


const router = express.Router();

router.post('/', authenticateToken, uploadSingle('video'), (req, res, next) => {
  ['hashtags', 'mentions', 'location', 'audio', 'effects'].forEach(field => {
    if (req.body[field]) {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (e) {
        return res.status(400).json({
          message: `Invalid ${field} format`,
          code: `INVALID_${field.toUpperCase()}`
        });
      }
    }
  });

  if (req.body.brightness) {
    req.body.brightness = parseInt(req.body.brightness, 10);
  }
  if (req.body.contrast) {
    req.body.contrast = parseInt(req.body.contrast, 10);
  }

  next();
}, [
  body('caption').optional().isString().isLength({ max: 2200 }),
  body('hashtags').optional().isArray(),
  body('mentions').optional().isArray(),
  body('location').optional(),
  body('language').optional().isIn(['nepali', 'english', 'mixed']),
  body('visibility').optional().isIn(['public', 'followers', 'private']),
  body('audio').optional(),
  body('effects').optional().isArray(),
  body('filter').optional().isIn(['none', 'clarendon', 'gingham', 'moon', 'lark', 'reyes', 'juno', 'slumber', 'crema', 'ludwig', 'aden', 'perpetua', 'sepia', 'grayscale', 'vintage', 'bright', 'contrast', 'warm', 'cool']),
  body('brightness').optional().isInt({ min: -100, max: 100 }),
  body('contrast').optional().isInt({ min: -100, max: 100 })
], async (req, res) => {
  try {
    console.log('Reel creation request body:', req.body);
    console.log('Reel creation request file:', req.file ? { originalname: req.file.originalname, size: req.file.size } : 'No file');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Reel creation validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      console.error('No video file provided in reel creation');
      return res.status(400).json({
        message: 'Video file is required',
        code: 'VIDEO_REQUIRED'
      });
    }

    const filename = path.basename(req.file.path);

    const reelData = {
      ...req.body,
      author: req.user._id,
      video: {
        url: `/uploads/${filename}`, 
        publicId: filename,
        duration: 0,
        size: req.file.size,
        width: 0,
        height: 0,
        format: path.extname(req.file.originalname).slice(1)
      }
    };

    const reel = new Reel(reelData);
    await reel.save();

    await reel.populate('author', 'username fullName profilePicture isVerified location languagePreference');

    res.status(201).json({
      message: 'Reel created successfully',
      reel
    });

  } catch (error) {
    console.error('Create reel error:', error);
    res.status(500).json({
      message: 'Server error creating reel',
      code: 'CREATE_REEL_ERROR'
    });
  }
});

router.get('/saved', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    console.log('Getting saved reels for user:', userId, 'page:', page, 'limit:', limit);

    const totalCount = await Reel.countDocuments({
      'saves.user': userId,
      isDeleted: false,
      isArchived: false,
      'video.url': { $exists: true, $ne: '' }
    });

    console.log('Total saved reels count:', totalCount);

    if (totalCount === 0) {
      return res.json({
        message: 'Saved reels retrieved successfully',
        reels: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }

    const savedReels = await Reel.aggregate([
      {
        $match: {
          'saves.user': userId,
          isDeleted: false,
          isArchived: false,
          'video.url': { $exists: true, $ne: '' }
        }
      },
      {
        $addFields: {
          userSave: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$saves',
                  cond: { $eq: ['$$this.user', userId] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $sort: { 'userSave.savedAt': -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit * 1
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $unwind: {
          path: '$author',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $project: {
          'author.password': 0,
          'author.email': 0,
          'author.emailVerified': 0,
          'author.verificationToken': 0,
          'author.resetPasswordToken': 0,
          'author.resetPasswordExpires': 0,
          'author.twoFactorSecret': 0,
          'author.twoFactorEnabled': 0,
          'author.loginAttempts': 0,
          'author.lockUntil': 0,
          'author.createdAt': 0,
          'author.updatedAt': 0
        }
      }
    ]);

    console.log('Aggregation completed, found', savedReels.length, 'saved reels');

    const finalReels = savedReels.map(reel => ({
      ...reel,
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      sharesCount: reel.sharesCount,
      savesCount: reel.savesCount,
      viewsCount: reel.viewsCount
    }));

    res.json({
      message: 'Saved reels retrieved successfully',
      reels: finalReels,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get saved reels error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Server error retrieving saved reels',
      code: 'GET_SAVED_REELS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;
    const user = await User.findById(userId).populate('following');

    const followingIds = user.following ? user.following.map(f => f._id) : [];
    const authorIds = [...followingIds, userId];

    const allReels = await Reel.find({
      author: { $in: authorIds },
      isDeleted: false,
      isArchived: false,
      'video.url': { $exists: true, $ne: '' }
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .lean()
    .sort({ createdAt: -1 })
    .limit(limit * 5)
    .skip((page - 1) * limit);

    console.log('Reels feed count:', allReels.length);

    const finalReels = allReels.map(reel => ({
      ...reel,
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      sharesCount: reel.sharesCount,
      savesCount: reel.savesCount,
      viewsCount: reel.viewsCount
    }));

    console.log('Final reels count:', finalReels.length);

    res.json({
      message: 'Reels feed retrieved successfully',
      reels: finalReels,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: finalReels.length
      }
    });

  } catch (error) {
    console.error('Get reels feed error:', error);
    res.status(500).json({
      message: 'Server error retrieving reels feed',
      code: 'REELS_FEED_ERROR'
    });
  }
});

router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, page = 1, limit = 20 } = req.query;
    console.log('Search reels called by user:', req.user ? req.user._id : null, 'query:', query, 'page:', page, 'limit:', limit);

    if (!query || query.trim().length < 1) {
      return res.status(400).json({
        message: 'Search query must be at least 1 character long',
        code: 'INVALID_SEARCH_QUERY'
      });
    }

    const escapeRegex = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const searchRegex = new RegExp(escapeRegex(query.trim()), 'i');

    const reels = await Reel.find({
      $or: [
        { caption: { $regex: searchRegex } },
        { hashtags: { $in: [searchRegex] } },
        { 'author.username': { $regex: searchRegex } },
        { 'author.fullName': { $regex: searchRegex } }
      ],
      isDeleted: false,
      isArchived: false,
      visibility: 'public'
    })
    .populate('author', 'username fullName profilePicture isVerified')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Reel.countDocuments({
      $or: [
        { caption: { $regex: searchRegex } },
        { hashtags: { $in: [searchRegex] } },
        { 'author.username': { $regex: searchRegex } },
        { 'author.fullName': { $regex: searchRegex } }
      ],
      isDeleted: false,
      isArchived: false,
      visibility: 'public'
    });

    const finalReels = reels.map(reel => ({
      ...reel.toObject(),
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      sharesCount: reel.sharesCount,
      savesCount: reel.savesCount,
      viewsCount: reel.viewsCount
    }));

    res.json({
      message: 'Reels searched successfully',
      reels: finalReels,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Search reels error:', error);
    res.status(500).json({
      message: 'Server error searching reels',
      code: 'SEARCH_REELS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/:reelId', optionalAuth, async (req, res) => {
  try {
    const { reelId } = req.params;

    const reel = await Reel.findOne({
      _id: reelId,
      isDeleted: false,
      isArchived: false
    }).populate('author', 'username fullName profilePicture isVerified location languagePreference');

    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    if (req.user && !reel.views.some(view => view.user.toString() === req.user._id.toString())) {
      reel.addView(req.user._id);
      await reel.save();
    }

    res.json({
      message: 'Reel retrieved successfully',
      reel
    });

  } catch (error) {
    console.error('Get reel error:', error);
    res.status(500).json({
      message: 'Server error retrieving reel',
      code: 'GET_REEL_ERROR'
    });
  }
});

router.post('/:reelId/like', authenticateToken, async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    const wasLiked = reel.addLike(userId);
    await reel.save();

    if (global.io) {
      try {
        const eventType = wasLiked ? 'reel_liked' : 'reel_unliked';

        global.io.to(`user:${reel.author._id}`).emit(eventType, {
          reelId: reel._id,
          userId: userId,
          likesCount: reel.likesCount,
          isLiked: wasLiked
        });

        global.io.emit('feed_reel_liked', {
          reelId: reel._id,
          userId: userId,
          likesCount: reel.likesCount,
          isLiked: wasLiked
        });
      } catch (socketError) {
        console.error('Error sending real-time like update:', socketError);
      }
    }

    if (wasLiked && userId.toString() !== reel.author._id.toString()) {
      try {
        if (global.notificationService && global.notificationService.createLikeNotification) {
          await global.notificationService.createLikeNotification(
            reel._id,
            userId,
            reel.author._id
          );
        }
      } catch (error) {
        console.error('Error creating like notification:', error);
      }
    }

    res.json({
      message: wasLiked ? 'Reel liked successfully' : 'Reel unliked successfully',
      isLiked: wasLiked,
      likesCount: reel.likesCount
    });

  } catch (error) {
    console.error('Like reel error:', error);
    res.status(500).json({
      message: 'Server error liking reel',
      code: 'LIKE_REEL_ERROR'
    });
  }
});

router.post('/:reelId/comment', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reelId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    const comment = reel.addComment(userId, content);
    await reel.save();

    await reel.populate('comments.author', 'username fullName profilePicture');

    const newComment = reel.comments[reel.comments.length - 1];

    if (global.io) {
      try {
        global.io.to(`user:${reel.author._id}`).emit('reel_commented', {
          reelId: reel._id,
          userId: userId,
          commentId: newComment._id,
          commentsCount: reel.commentsCount
        });

        global.io.emit('feed_reel_commented', {
          reelId: reel._id,
          userId: userId,
          commentId: newComment._id,
          commentsCount: reel.commentsCount
        });
      } catch (socketError) {
        console.error('Error sending real-time comment update:', socketError);
      }
    }

    if (userId.toString() !== reel.author._id.toString()) {
      try {
        if (global.notificationService && global.notificationService.createCommentNotification) {
          await global.notificationService.createCommentNotification(
            reel._id,
            userId,
            reel.author._id,
            newComment._id
          );
        }
      } catch (error) {
        console.error('Error creating comment notification:', error);
      }
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      message: 'Server error adding comment',
      code: 'ADD_COMMENT_ERROR'
    });
  }
});

router.post('/:reelId/share', authenticateToken, async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    reel.addShare(userId);
    await reel.save();

    if (global.io) {
      try {
        global.io.to(`user:${reel.author._id}`).emit('reel_shared', {
          reelId: reel._id,
          userId: userId,
          sharesCount: reel.sharesCount
        });

        global.io.emit('feed_reel_shared', {
          reelId: reel._id,
          userId: userId,
          sharesCount: reel.sharesCount
        });
      } catch (socketError) {
        console.error('Error sending real-time share update:', socketError);
      }
    }

    if (userId.toString() !== reel.author._id.toString()) {
      try {
        if (global.notificationService && global.notificationService.createShareNotification) {
          await global.notificationService.createShareNotification(
            reel._id,
            userId,
            reel.author._id
          );
        }
      } catch (error) {
        console.error('Error creating share notification:', error);
      }
    }

    res.json({
      message: 'Reel shared successfully',
      sharesCount: reel.sharesCount
    });

  } catch (error) {
    console.error('Share reel error:', error);
    res.status(500).json({
      message: 'Server error sharing reel',
      code: 'SHARE_REEL_ERROR'
    });
  }
});

router.post('/:reelId/save', authenticateToken, async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    const wasSaved = reel.addSave(userId);
    await reel.save();

    if (global.io) {
      try {
        const eventType = wasSaved ? 'reel_saved' : 'reel_unsaved';

        global.io.to(`user:${reel.author._id}`).emit(eventType, {
          reelId: reel._id,
          userId: userId,
          savesCount: reel.savesCount,
          isSaved: wasSaved
        });

        global.io.emit('feed_reel_saved', {
          reelId: reel._id,
          userId: userId,
          savesCount: reel.savesCount,
          isSaved: wasSaved
        });
      } catch (socketError) {
        console.error('Error sending real-time save update:', socketError);
      }
    }

    if (wasSaved && userId.toString() !== reel.author._id.toString()) {
      try {
        if (global.notificationService && global.notificationService.createSaveNotification) {
          await global.notificationService.createSaveNotification(
            reel._id,
            userId,
            reel.author._id
          );
        }
      } catch (error) {
        console.error('Error creating save notification:', error);
      }
    }

    res.json({
      message: wasSaved ? 'Reel saved successfully' : 'Reel unsaved successfully',
      isSaved: wasSaved,
      savesCount: reel.savesCount
    });

  } catch (error) {
    console.error('Save reel error:', error);
    res.status(500).json({
      message: 'Server error saving reel',
      code: 'SAVE_REEL_ERROR'
    });
  }
});

router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, page = 1, limit = 20 } = req.query;
    console.log('Search reels called by user:', req.user ? req.user._id : null, 'query:', query, 'page:', page, 'limit:', limit);

    if (!query || query.trim().length < 1) {
      return res.status(400).json({
        message: 'Search query must be at least 1 character long',
        code: 'INVALID_SEARCH_QUERY'
      });
    }

    const escapeRegex = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const searchRegex = new RegExp(escapeRegex(query.trim()), 'i');

    const reels = await Reel.find({
      $or: [
        { caption: { $regex: searchRegex } },
        { hashtags: { $in: [searchRegex] } }
      ],
      isDeleted: false,
      isArchived: false,
      visibility: 'public'
    })
    .populate('author', 'username fullName profilePicture isVerified')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Reel.countDocuments({
      $or: [
        { caption: { $regex: searchRegex } },
        { hashtags: { $in: [searchRegex] } }
      ],
      isDeleted: false,
      isArchived: false,
      visibility: 'public'
    });

    const finalReels = reels.map(reel => ({
      ...reel.toObject(),
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      sharesCount: reel.sharesCount,
      savesCount: reel.savesCount,
      viewsCount: reel.viewsCount
    }));

    res.json({
      message: 'Reels searched successfully',
      reels: finalReels,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Search reels error:', error);
    res.status(500).json({
      message: 'Server error searching reels',
      code: 'SEARCH_REELS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const reels = await Reel.find({
      author: userId,
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const finalReels = reels.map(reel => ({
      ...reel.toObject(),
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      sharesCount: reel.sharesCount,
      savesCount: reel.savesCount,
      viewsCount: reel.viewsCount
    }));

    res.json({
      message: 'User reels retrieved successfully',
      reels: finalReels,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: reels.length
      }
    });

  } catch (error) {
    console.error('Get user reels error:', error);
    res.status(500).json({
      message: 'Server error retrieving user reels',
      code: 'GET_USER_REELS_ERROR'
    });
  }
});

router.delete('/:reelId', authenticateToken, async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findOne({
      _id: reelId,
      author: userId
    });

    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found or you do not have permission to delete it',
        code: 'REEL_NOT_FOUND'
      });
    }

    reel.isDeleted = true;
    reel.deletedAt = new Date();
    await reel.save();

    res.json({
      message: 'Reel deleted successfully'
    });

  } catch (error) {
    console.error('Delete reel error:', error);
    res.status(500).json({
      message: 'Server error deleting reel',
      code: 'DELETE_REEL_ERROR'
    });
  }
});

module.exports = router;
