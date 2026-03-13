const path = require('path');
const { validationResult } = require('express-validator');
const Reel = require('../models/Reel');
const User = require('../models/User');
const Follow = require('../models/Follow');
const BookmarkCollection = require('../models/BookmarkCollection');
const { findCommentById } = require('../utils/reelHelpers');

exports.createReel = async (req, res) => {
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
};

exports.getSavedReels = async (req, res) => {
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

    const Block = require('../models/Block');
    const blockedUserIds = await Block.getBlockedUserIds(userId);
    const blockerUserIds = await Block.getBlockerUserIds(userId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])];

    const savedReels = await Reel.aggregate([
      {
        $match: {
          'saves.user': userId,
          author: { $nin: allBlockedIds },
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

    const finalReels = savedReels.map(reel => {
      const mediaItem = {
        type: 'video',
        url: reel.video.url,
        width: reel.video.width,
        height: reel.video.height,
        duration: reel.video.duration,
        size: reel.video.size,
        format: reel.video.format
      };
      if (reel.video.thumbnail) {
        mediaItem.thumbnail = reel.video.thumbnail;
      }
      return {
        ...reel,
        media: [mediaItem],
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        sharesCount: reel.sharesCount,
        savesCount: reel.savesCount,
        viewsCount: reel.viewsCount
      };
    });

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
    res.status(500).json({
      message: 'Server error retrieving saved reels',
      code: 'GET_SAVED_REELS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const following = await Follow.find({ follower: userId }).select('following').lean();
    const followingIds = following.map(f => f.following.toString());

    // Get all blocked IDs (both who I blocked and who blocked me)
    const Block = require('../models/Block');
    const blockedUserIds = await Block.getBlockedUserIds(userId);
    const blockerUserIds = await Block.getBlockerUserIds(userId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());

    const authorIds = [...followingIds, userId.toString()].filter(id => !allBlockedIds.includes(id));

    const total = await Reel.countDocuments({
      author: { $in: authorIds, $nin: allBlockedIds },
      isDeleted: false,
      isArchived: false,
      'video.url': { $exists: true, $ne: '' }
    });

    const allReels = await Reel.find({
      author: { $in: authorIds, $nin: allBlockedIds },
      isDeleted: false,
      isArchived: false,
      'video.url': { $exists: true, $ne: '' }
    })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ createdAt: -1 })
      .limit(limit * 5)
      .skip((page - 1) * limit);

    console.log('Reels feed count:', allReels.length, 'total:', total);

    const finalReels = allReels.map(reel => {
      const mediaItem = {
        type: 'video',
        url: reel.video.url,
        width: reel.video.width,
        height: reel.video.height,
        duration: reel.video.duration,
        size: reel.video.size,
        format: reel.video.format
      };
      if (reel.video.thumbnail) {
        mediaItem.thumbnail = reel.video.thumbnail;
      }
      return {
        ...reel,
        media: [mediaItem],
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        sharesCount: reel.sharesCount,
        savesCount: reel.savesCount,
        viewsCount: reel.viewsCount
      };
    });

    res.json({
      message: 'Reels feed retrieved successfully',
      reels: finalReels,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get reels feed error:', error);
    res.status(500).json({
      message: 'Server error retrieving reels feed',
      code: 'REELS_FEED_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.searchReels = async (req, res) => {
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

    let allBlockedIds = [];
    if (req.user) {
        const Block = require('../models/Block');
        const blockedUserIds = await Block.getBlockedUserIds(req.user._id);
        const blockerUserIds = await Block.getBlockerUserIds(req.user._id);
        allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());
    }

    const reels = await Reel.find({
      $or: [
        { caption: { $regex: searchRegex } },
        { hashtags: { $in: [searchRegex] } },
        { 'author.username': { $regex: searchRegex } },
        { 'author.fullName': { $regex: searchRegex } }
      ],
      author: { $nin: allBlockedIds },
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

    const finalReels = reels.map(reel => {
      const reelObj = reel.toObject();
      const mediaItem = {
        type: 'video',
        url: reel.video.url,
        width: reel.video.width,
        height: reel.video.height,
        duration: reel.video.duration,
        size: reel.video.size,
        format: reel.video.format
      };
      if (reel.video.thumbnail) {
        mediaItem.thumbnail = reel.video.thumbnail;
      }
      return {
        ...reelObj,
        media: [mediaItem],
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        sharesCount: reel.sharesCount,
        savesCount: reel.savesCount,
        viewsCount: reel.viewsCount
      };
    });

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
};

exports.getReel = async (req, res) => {
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

    // Block check
    if (req.user) {
      const Block = require('../models/Block');
      const isBlocked = await Block.areBlocked(req.user._id, reel.author._id);
      if (isBlocked) {
        return res.status(403).json({
          message: 'Access denied due to blocking restrictions',
          code: 'BLOCK_RESTRICTION'
        });
      }
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
};

exports.likeReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findOne({
      _id: reelId,
      isDeleted: false,
      isArchived: false
    });
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
};

exports.commentOnReel = async (req, res) => {
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

    // Block check
    if (req.user) {
      const Block = require('../models/Block');
      const isBlocked = await Block.areBlocked(req.user._id, reel.author._id);
      if (isBlocked) {
        return res.status(403).json({
          message: 'Access denied due to blocking restrictions',
          code: 'BLOCK_RESTRICTION'
        });
      }
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
};

exports.shareReel = async (req, res) => {
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
};

exports.saveReel = async (req, res) => {
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

    let defaultCollection = await BookmarkCollection.findOne({
      user: userId,
      name: 'Saved Posts'
    });

    if (!defaultCollection) {
      defaultCollection = new BookmarkCollection({
        name: 'Saved Posts',
        description: 'Posts saved by you',
        isPublic: false,
        user: userId,
        posts: [],
        reels: []
      });
      await defaultCollection.save();
    }

    if (!defaultCollection.reels) {
      defaultCollection.reels = [];
    }

    const isInCollection = defaultCollection.reels.some(
      id => id.toString() === reelId
    );

    let wasSaved;
    if (isInCollection) {
      defaultCollection.reels = defaultCollection.reels.filter(
        id => id.toString() !== reelId
      );
      const existingSave = reel.saves.find(save => save.user.toString() === userId.toString());
      if (existingSave) {
        reel.saves.pull(existingSave._id);
        reel.savesCount = Math.max(0, reel.savesCount - 1);
      }
      wasSaved = false;
    } else {
      defaultCollection.reels.push(reelId);
      reel.saves.push({ user: userId });
      reel.savesCount += 1;
      wasSaved = true;
    }

    await defaultCollection.save();
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
};

exports.getUserReels = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Block check
    if (req.user) {
      const Block = require('../models/Block');
      const isBlocked = await Block.areBlocked(req.user._id, userId);
      if (isBlocked) {
        return res.status(403).json({
          message: 'Access denied due to blocking restrictions',
          code: 'BLOCK_RESTRICTION'
        });
      }
    }

    const reels = await Reel.find({
      author: userId,
      isDeleted: false,
      isArchived: false
    })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const finalReels = reels.map(reel => {
      const reelObj = reel.toObject();
      const mediaItem = {
        type: 'video',
        url: reel.video.url,
        width: reel.video.width,
        height: reel.video.height,
        duration: reel.video.duration,
        size: reel.video.size,
        format: reel.video.format
      };
      if (reel.video.thumbnail) {
        mediaItem.thumbnail = reel.video.thumbnail;
      }
      return {
        ...reelObj,
        media: [mediaItem],
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        sharesCount: reel.sharesCount,
        savesCount: reel.savesCount,
        viewsCount: reel.viewsCount
      };
    });

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
};

exports.deleteReel = async (req, res) => {
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
};

exports.getReelComments = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { page = 1, limit = 20, sort = 'recent' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const sortMode = sort === 'liked' ? 'liked' : 'recent';

    const reel = await Reel.findOne({
      _id: reelId,
      isDeleted: false,
      isArchived: false
    });
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    await reel.populate('comments.author', 'username fullName profilePicture isVerified');

    let comments = reel.comments ? reel.comments.slice() : [];

    if (sortMode === 'liked') {
      comments.sort((a, b) => (b.likes ? b.likes.length : 0) - (a.likes ? a.likes.length : 0));
    } else {
      comments.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
    }

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedComments = comments.slice(startIndex, endIndex);

    res.json({
      message: 'Comments retrieved successfully',
      comments: paginatedComments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: comments.length,
        totalPages: Math.ceil(comments.length / limitNum)
      }
    });

  } catch (error) {
    console.error('Get comments error:', error && error.message);
    res.status(500).json({
      message: 'Server error retrieving comments',
      code: 'GET_COMMENTS_ERROR',
      details: process.env.NODE_ENV === 'development' ? (error && error.message) : undefined
    });
  }
};

exports.replyToComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reelId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    const comment = reel.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    const reply = {
      author: userId,
      content: content,
      replyTo: commentId
    };

    reel.comments.push(reply);
    reel.commentsCount += 1;
    await reel.save();

    await reel.populate('comments.author', 'username fullName profilePicture isVerified');

    const newReply = reel.comments[reel.comments.length - 1];

    if (global.io) {
      try {
        global.io.to(`user:${reel.author._id}`).emit('reel_comment_reply_added', {
          reelId: reelId,
          commentId: commentId,
          reply: newReply,
          commentCount: reel.commentsCount
        });

        global.io.emit('feed_reel_comment_reply_added', {
          reelId: reelId,
          commentId: commentId,
          reply: newReply,
          commentCount: reel.commentsCount
        });
      } catch (socketError) {
        console.error('Error sending reply notification:', socketError);
      }
    }

    if (userId.toString() !== comment.author._id.toString()) {
      try {
        if (global.notificationService && global.notificationService.createCommentNotification) {
          await global.notificationService.createCommentNotification(
            reel._id,
            userId,
            comment.author._id,
            newReply._id
          );
        }
      } catch (error) {
        console.error('Error creating reply notification:', error);
      }
    }

    res.status(201).json({
      message: 'Reply added successfully',
      reply: newReply
    });

  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({
      message: 'Server error adding reply',
      code: 'ADD_REPLY_ERROR'
    });
  }
};

exports.likeReply = async (req, res) => {
  try {
    const { reelId, replyId } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    const reply = findCommentById(reel.comments, replyId);
    if (!reply) {
      return res.status(404).json({
        message: 'Reply not found',
        code: 'REPLY_NOT_FOUND'
      });
    }

    const existingLike = reply.likes.find(like => like.user.toString() === userId.toString());

    if (existingLike) {
      reply.likes.pull(existingLike._id);
      await reel.save();

      res.json({
        message: 'Reply unliked successfully',
        isLiked: false,
        likesCount: reply.likes.length
      });
    } else {
      reply.likes.push({ user: userId });
      await reel.save();

      res.json({
        message: 'Reply liked successfully',
        isLiked: true,
        likesCount: reply.likes.length
      });
    }

  } catch (error) {
    console.error('Like reply error:', error);
    res.status(500).json({
      message: 'Server error liking reply',
      code: 'LIKE_REPLY_ERROR'
    });
  }
};

exports.replyToReply = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reelId, replyId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    const parentReply = findCommentById(reel.comments, replyId);
    if (!parentReply) {
      return res.status(404).json({
        message: 'Reply not found',
        code: 'REPLY_NOT_FOUND'
      });
    }

    const reply = {
      author: userId,
      content: content,
      replyTo: replyId
    };

    reel.comments.push(reply);
    reel.commentsCount += 1;
    await reel.save();

    await reel.populate('comments.author', 'username fullName profilePicture isVerified');

    const newReply = reel.comments[reel.comments.length - 1];

    if (global.io) {
      try {
        global.io.to(`user:${reel.author._id}`).emit('reel_comment_reply_added', {
          reelId: reelId,
          commentId: replyId,
          reply: newReply,
          commentCount: reel.commentsCount
        });

        global.io.emit('feed_reel_comment_reply_added', {
          reelId: reelId,
          commentId: replyId,
          reply: newReply,
          commentCount: reel.commentsCount
        });
      } catch (socketError) {
        console.error('Error sending reply to reply notification:', socketError);
      }
    }

    if (userId.toString() !== parentReply.author._id.toString()) {
      try {
        if (global.notificationService && global.notificationService.createCommentNotification) {
          await global.notificationService.createCommentNotification(
            reel._id,
            userId,
            parentReply.author._id,
            newReply._id
          );
        }
      } catch (error) {
        console.error('Error creating reply to reply notification:', error);
      }
    }

    res.status(201).json({
      message: 'Reply added successfully',
      reply: newReply
    });

  } catch (error) {
    console.error('Add reply to reply error:', error);
    res.status(500).json({
      message: 'Server error adding reply',
      code: 'ADD_REPLY_ERROR'
    });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { reelId, commentId } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    const comment = reel.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    if (comment.author.toString() !== userId.toString() && reel.author.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You can only delete your own comments or comments on your reels',
        code: 'DELETE_COMMENT_PERMISSION_DENIED'
      });
    }

    reel.comments.pull(commentId);

    reel.comments = reel.comments.filter(c => c.replyTo?.toString() !== commentId.toString());

    reel.commentsCount = reel.comments.length;

    await reel.save();

    res.json({
      message: 'Comment deleted successfully',
      commentsCount: reel.commentsCount
    });

  } catch (error) {
    console.error('Delete reel comment error:', error);
    res.status(500).json({
      message: 'Server error deleting comment',
      code: 'DELETE_COMMENT_ERROR'
    });
  }
};
