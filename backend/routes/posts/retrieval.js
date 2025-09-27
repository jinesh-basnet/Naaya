const express = require('express');
const Post = require('../../models/Post');
const User = require('../../models/User');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const { findCommentById, countTotalComments } = require('../../utils/postHelpers');

const router = express.Router();

// @route   GET /api/posts/:postId
// @desc    Get a specific post
// @access  Public
router.get('/:postId', optionalAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    console.log('GET /api/posts/:postId called with postId:', postId);

    const post = await Post.findOne({
      _id: postId,
      isDeleted: false,
      isArchived: false
    }).populate('author', 'username fullName profilePicture isVerified');

    console.log('Post found:', !!post);
    if (post) {
      console.log('Post details:', { _id: post._id, isDeleted: post.isDeleted, isArchived: post.isArchived });
    } else {
      console.log('Post not found in database');
    }

    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    // Add view if user is authenticated
    if (req.user && !post.views.some(view => view.user.toString() === req.user._id.toString())) {
      post.views.push({ user: req.user._id });
      await post.save();
    }

    res.json({
      message: 'Post retrieved successfully',
      post
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      message: 'Server error retrieving post',
      code: 'GET_POST_ERROR'
    });
  }
});

// @route   GET /api/posts/user/:username
// @desc    Get user's posts
// @access  Private
router.get('/user/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const posts = await Post.find({
      author: user._id,
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    res.json({
      message: 'User posts retrieved successfully',
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: posts.length
      }
    });

  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      message: 'Server error retrieving user posts',
      code: 'GET_USER_POSTS_ERROR'
    });
  }
});

// @route   GET /api/posts/saved
// @desc    Get user's saved posts
// @access  Private
router.get('/saved', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const posts = await Post.find({
      'saves.user': userId,
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .sort({ 'saves.savedAt': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    res.json({
      message: 'Saved posts retrieved successfully',
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: posts.length
      }
    });

  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({
      message: 'Server error retrieving saved posts',
      code: 'GET_SAVED_POSTS_ERROR'
    });
  }
});

module.exports = router;
