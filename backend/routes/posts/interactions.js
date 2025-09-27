const express = require('express');
const { body, validationResult } = require('express-validator');
const Post = require('../../models/Post');
const { authenticateToken } = require('../../middleware/auth');
const { updateInteractionHistory } = require('../../utils/feedAlgorithm');
const { findCommentById, countTotalComments } = require('../../utils/postHelpers');

const router = express.Router();

// @route   POST /api/posts/:postId/like
// @desc    Like/unlike a post
// @access  Private
router.post('/:postId/like', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    const existingLike = post.likes.find(like => like.user.toString() === userId.toString());

    if (existingLike) {
      // Unlike
      post.likes.pull(existingLike._id);
      await post.save();

      // Emit socket event for unlike with proper error handling
      if (global.notificationService && global.notificationService.io) {
        try {
          global.notificationService.io.to(`user:${post.author._id}`).emit('post_unliked', {
            postId: post._id,
            userId: userId,
            likesCount: post.likes.length,
            isLiked: false
          });
        } catch (notificationError) {
          console.error('Error sending unlike notification:', notificationError);
          // Don't fail the request if notification fails
        }
      }

      res.json({
        message: 'Post unliked successfully',
        isLiked: false,
        likesCount: post.likes.length
      });
    } else {
      // Like
      post.likes.push({ user: userId });
      await post.save();

      // Emit socket event for like with proper error handling
      if (global.notificationService && global.notificationService.io) {
        try {
          global.notificationService.io.to(`user:${post.author._id}`).emit('post_liked', {
            postId: post._id,
            userId: userId,
            likesCount: post.likes.length,
            isLiked: true
          });
        } catch (notificationError) {
          console.error('Error sending like notification:', notificationError);
          // Don't fail the request if notification fails
        }
      }

      // Update interaction history for algorithm
      try {
        await updateInteractionHistory(userId, post.author._id, 'like', post.media.length > 0 ? post.media[0].type : 'text', post.language, [...(post.hashtags || []), ...(post.tags || [])]);
      } catch (interactionError) {
        console.error('Error updating interaction history:', interactionError);
        // Don't fail the request if interaction update fails
      }

      // Send notification if not liking own post
      if (userId.toString() !== post.author._id.toString()) {
        try {
          if (global.notificationService && global.notificationService.createLikeNotification) {
            await global.notificationService.createLikeNotification(
              post._id,
              userId,
              post.author._id
            );
          }
        } catch (error) {
          console.error('Error creating like notification:', error);
          // Don't fail the request if notification creation fails
        }
      }

      res.json({
        message: 'Post liked successfully',
        isLiked: true,
        likesCount: post.likes.length
      });
    }

  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      message: 'Server error liking post',
      code: 'LIKE_POST_ERROR'
    });
  }
});

// @route   POST /api/posts/:postId/save
// @desc    Save/unsave a post
// @access  Private
router.post('/:postId/save', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    const existingSave = post.saves.find(save => save.user.toString() === userId.toString());

    if (existingSave) {
      // Unsave
      post.saves.pull(existingSave._id);
      await post.save();

      res.json({
        message: 'Post unsaved successfully',
        isSaved: false,
        savesCount: post.saves.length
      });
    } else {
      // Save
      post.saves.push({ user: userId });
      await post.save();

      // Update interaction history for algorithm
      try {
        await updateInteractionHistory(userId, post.author._id, 'save', post.media.length > 0 ? post.media[0].type : 'text', post.language, [...(post.hashtags || []), ...(post.tags || [])]);
      } catch (interactionError) {
        console.error('Error updating interaction history:', interactionError);
        // Don't fail the request if interaction update fails
      }

      res.json({
        message: 'Post saved successfully',
        isSaved: true,
        savesCount: post.saves.length
      });
    }

  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({
      message: 'Server error saving post',
      code: 'SAVE_POST_ERROR'
    });
  }
});

// @route   POST /api/posts/:postId/share
// @desc    Share/unshare a post
// @access  Private
router.post('/:postId/share', authenticateToken, [
  body('caption').optional().isString().isLength({ max: 2200 }),
  body('tags').optional(),
  body('location').optional(),
], async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const existingShare = post.shares.find(share => share.user.toString() === userId.toString());

    if (existingShare) {
      // Unshare - remove the shared post and decrement shares count
      const sharedPost = await Post.findOne({
        author: userId,
        sharedFrom: postId,
        isDeleted: false
      });

      if (sharedPost) {
        sharedPost.isDeleted = true;
        sharedPost.deletedAt = new Date();
        await sharedPost.save();
      }

      post.shares.pull(existingShare._id);
      await post.save();

      res.json({
        message: 'Post unshared successfully',
        isShared: false,
        sharesCount: post.shares.length
      });
    } else {
      // Share - create a new post and increment shares count
      const sharedPostData = {
        author: userId,
        content: req.body.caption || '', // Sharing user's caption (empty if not provided)
        media: [], // No media for shared posts - original media will be shown separately
        location: req.body.location ? JSON.parse(req.body.location) : post.location,
        language: post.language,
        postType: post.postType,
        visibility: post.visibility,
        tags: req.body.tags ? JSON.parse(req.body.tags) : post.tags,
        mentions: post.mentions,
        hashtags: post.hashtags,
        sharedFrom: post._id,
        // Store original post data for display
        originalContent: post.content,
        originalMedia: post.media,
        originalAuthor: post.author,
        originalLocation: post.location,
        originalCreatedAt: post.createdAt
      };

      const sharedPost = new Post(sharedPostData);
      await sharedPost.save();

      post.shares.push({ user: userId });
      await post.save();

      // Update interaction history for algorithm
      try {
        await updateInteractionHistory(userId, post.author._id, 'share', post.media.length > 0 ? post.media[0].type : 'text', post.language, [...(post.hashtags || []), ...(post.tags || [])]);
      } catch (interactionError) {
        console.error('Error updating interaction history:', interactionError);
        // Don't fail the request if interaction update fails
      }

      // Populate the shared post for response
      await sharedPost.populate('author', 'username fullName profilePicture isVerified location languagePreference');
      await sharedPost.populate('originalAuthor', 'username fullName profilePicture isVerified');

      res.json({
        message: 'Post shared successfully',
        isShared: true,
        sharesCount: post.shares.length,
        sharedPost
      });
    }

  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({
      message: 'Server error sharing post',
      code: 'SHARE_POST_ERROR'
    });
  }
});

module.exports = router;
