const express = require('express');
const Post = require('../../models/Post');
const Reel = require('../../models/Reel');
const User = require('../../models/User');
const Follow = require('../../models/Follow');
const { authenticateToken } = require('../../middleware/auth');

const { findCommentById, countTotalComments } = require('../../utils/postHelpers');

const router = express.Router();

// @route   GET /api/posts
// @desc    Get default feed (fyp)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const posts = await Post.find({
      author: userId,
      postType: 'post',
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .populate('originalAuthor', 'username fullName profilePicture isVerified')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      message: 'Feed retrieved successfully',
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: posts.length
      },
      feedType: 'user_posts'
    });

  } catch (error) {
    console.error('Get feed error:', {
      message: error.message,
      stack: error.stack,
      userId: req.user ? req.user._id : 'unknown',
      query: req.query,
      feedType: feedType,
      page: page,
      limit: limit
    });
    res.status(500).json({
      message: 'Server error retrieving feed',
      code: 'FEED_ERROR'
    });
  }
});

// @route   GET /api/posts/feed
// @desc    Get personalized feed
// @access  Private
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, feedType = 'fyp' } = req.query;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    let posts = [];

    if (feedType === 'following') {
      const following = await Follow.find({ follower: userId }).select('following').lean();
      const followingIds = following.map(f => f.following);
      const authorIds = [...followingIds, userId];

      posts = await Post.find({
        author: { $in: authorIds },
        postType: 'post',
        isDeleted: false,
        isArchived: false
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      posts = posts.map(post => ({
        ...post,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        savesCount: post.savesCount
      }));

    } else if (feedType === 'fyp') {
      console.log(`[DEBUG] FYP feed requested for user ${userId}, page ${page}, limit ${limit}`);

      try {
        posts = await Post.find({
          postType: 'post',
          isDeleted: false,
          isArchived: false,
          visibility: 'public'
        })
        .populate('author', 'username fullName profilePicture isVerified location languagePreference')
        .lean()
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        posts = posts.map(post => ({
          ...post,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          savesCount: post.savesCount
        }));

        console.log(`[DEBUG] FYP posts returned: ${posts.length}`);
      } catch (queryError) {
        console.error('[DEBUG] FYP query error:', {
          message: queryError.message,
          stack: queryError.stack
        });
        throw queryError;
      }

    } else if (feedType === 'nearby') {
      posts = await Post.find({
        postType: 'post',
        isDeleted: false,
        isArchived: false,
        'location.city': user.location.city
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      posts = posts.map(post => ({
        ...post,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        savesCount: post.savesCount
      }));
    }
    else if (feedType === 'explore') {
      posts = await Post.find({
        postType: 'post',
        isDeleted: false,
        isArchived: false,
        visibility: 'public'
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      posts = posts.map(post => ({
        ...post,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        savesCount: post.savesCount
      }));
    } else if (feedType === 'trending') {
      posts = await Post.find({
        isDeleted: false,
        isArchived: false,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      posts = posts.map(post => ({
        ...post,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        savesCount: post.savesCount
      }));
    }

    res.json({
      message: 'Feed retrieved successfully',
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: posts.length
      },
      feedType
    });

  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({
      message: 'Server error retrieving feed',
      code: 'FEED_ERROR'
    });
  }
});

module.exports = router;
