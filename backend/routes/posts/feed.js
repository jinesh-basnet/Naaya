const express = require('express');
const Post = require('../../models/Post');
const User = require('../../models/User');
const { authenticateToken } = require('../../middleware/auth');
const { generatePersonalizedFeed } = require('../../utils/feedAlgorithm');
const { findCommentById, countTotalComments } = require('../../utils/postHelpers');

const router = express.Router();

// @route   GET /api/posts
// @desc    Get default feed (fyp)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    // Fetch user's own posts by default
    const posts = await Post.find({
      author: userId,
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
    console.error('Get feed error:', error);
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

    let posts = [];

    if (feedType === 'following') {
      // Following feed - chronological posts from followed users and own posts
      posts = await Post.find({
        author: { $in: [...user.following, userId] },
        isDeleted: false,
        isArchived: false
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    } else if (feedType === 'fyp') {
      // For You Page - algorithmically curated using advanced algorithm
      posts = await generatePersonalizedFeed(userId, parseInt(page), parseInt(limit));

    } else if (feedType === 'nearby') {
      // Nearby feed - posts from users in the same area
      posts = await Post.find({
        isDeleted: false,
        isArchived: false,
        'location.city': user.location.city
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    } else if (feedType === 'explore') {
      // Explore feed - algorithmically curated content for discovery
      posts = await generatePersonalizedFeed(userId, parseInt(page), parseInt(limit));
    } else if (feedType === 'trending') {
      // Trending feed - posts with most engagement in recent time
      posts = await Post.find({
        isDeleted: false,
        isArchived: false,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // last 7 days
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
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
