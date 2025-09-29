const express = require('express');
const { body, validationResult } = require('express-validator');
const { uploadSingle } = require('../middleware/upload');
const Reel = require('../models/Reel');
const User = require('../models/User');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { generatePersonalizedFeed, updateInteractionHistory } = require('../utils/feedAlgorithm');

const router = express.Router();

router.post('/', authenticateToken, uploadSingle('video'), [
  body('caption').optional().isString().isLength({ max: 2200 }),
  body('hashtags').optional().isArray(),
  body('mentions').optional().isArray(),
  body('location').optional(),
  body('language').optional().isIn(['nepali', 'english', 'mixed']),
  body('visibility').optional().isIn(['public', 'followers', 'private']),
  body('audio').optional(),
  body('effects').optional().isArray(),
  body('filter').optional().isIn(['none', 'sepia', 'grayscale', 'vintage', 'bright', 'contrast', 'warm', 'cool']),
  body('brightness').optional().isInt({ min: -100, max: 100 }),
  body('contrast').optional().isInt({ min: -100, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'Video file is required',
        code: 'VIDEO_REQUIRED'
      });
    }

    const reelData = {
      ...req.body,
      author: req.user._id
    };

    reelData.video = {
      url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`, // Absolute URL
      publicId: req.file.filename, 
      duration: req.file.duration || 0, 
      size: req.file.size,
      width: req.file.width,
      height: req.file.height,
      format: req.file.format
    };

    if (req.body.hashtags) {
      try {
        reelData.hashtags = JSON.parse(req.body.hashtags);
      } catch (e) {
        return res.status(400).json({
          message: 'Invalid hashtags format',
          code: 'INVALID_HASHTAGS'
        });
      }
    }

    if (req.body.mentions) {
      try {
        reelData.mentions = JSON.parse(req.body.mentions);
      } catch (e) {
        return res.status(400).json({
          message: 'Invalid mentions format',
          code: 'INVALID_MENTIONS'
        });
      }
    }

    if (req.body.location) {
      try {
        reelData.location = JSON.parse(req.body.location);
      } catch (e) {
        return res.status(400).json({
          message: 'Invalid location format',
          code: 'INVALID_LOCATION'
        });
      }
    }

    if (req.body.audio) {
      try {
        reelData.audio = JSON.parse(req.body.audio);
      } catch (e) {
        return res.status(400).json({
          message: 'Invalid audio format',
          code: 'INVALID_AUDIO'
        });
      }
    }

    if (req.body.effects) {
      try {
        reelData.effects = JSON.parse(req.body.effects);
      } catch (e) {
        return res.status(400).json({
          message: 'Invalid effects format',
          code: 'INVALID_EFFECTS'
        });
      }
    }

    if (req.body.filter) {
      reelData.filter = req.body.filter;
    }
    if (req.body.brightness) {
      reelData.brightness = parseInt(req.body.brightness, 10);
    }
    if (req.body.contrast) {
      reelData.contrast = parseInt(req.body.contrast, 10);
    }

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

router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;
    const user = await User.findById(userId).populate('following');

    const userReels = await Reel.find({
      author: userId,
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .sort({ createdAt: -1 })
    .lean();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const candidateReels = await Reel.find({
      createdAt: { $gte: thirtyDaysAgo },
      author: { $ne: userId }, 
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .lean()
    .limit(limit * 5); 

    const scoredReels = candidateReels.map(reel => {
      const scoreData = reel.calculateFinalScore(
        user.location,
        user.languagePreference,
        userId,
        user.following.map(f => f._id)
      );

      return {
        reel,
        score: scoreData
      };
    });

    const sortedOtherReels = scoredReels
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2); 

    const allReels = [
      ...userReels.map(reel => ({ reel, score: 9999 })), 
      ...sortedOtherReels
    ];

    const finalReels = allReels
      .sort((a, b) => b.score - a.score)
      .slice((page - 1) * limit, page * limit)
      .map(item => {
        const reel = item.reel;
        return {
          ...reel,
          likesCount: reel.likes.length,
          commentsCount: reel.comments.length,
          sharesCount: reel.shares.length,
          savesCount: reel.saves.length,
          viewsCount: reel.views.length
        };
      });

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

    if (wasLiked) {
      await updateInteractionHistory(userId, reel.author._id, 'like');
    }

    res.json({
      message: wasLiked ? 'Reel liked successfully' : 'Reel unliked successfully',
      isLiked: wasLiked,
      likesCount: reel.likes.length
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

    await updateInteractionHistory(userId, reel.author._id, 'comment');

    await reel.populate('comments.author', 'username fullName profilePicture');

    const newComment = reel.comments[reel.comments.length - 1];

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

    await updateInteractionHistory(userId, reel.author._id, 'share');

    res.json({
      message: 'Reel shared successfully',
      sharesCount: reel.shares.length
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

    if (wasSaved) {
      await updateInteractionHistory(userId, reel.author._id, 'save');
    }

    res.json({
      message: wasSaved ? 'Reel saved successfully' : 'Reel unsaved successfully',
      isSaved: wasSaved,
      savesCount: reel.saves.length
    });

  } catch (error) {
    console.error('Save reel error:', error);
    res.status(500).json({
      message: 'Server error saving reel',
      code: 'SAVE_REEL_ERROR'
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

    res.json({
      message: 'User reels retrieved successfully',
      reels,
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
