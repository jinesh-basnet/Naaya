const express = require('express');
const { body, validationResult } = require('express-validator');
const Post = require('../../models/Post');
const BookmarkCollection = require('../../models/BookmarkCollection');
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

    const wasLiked = post.addLike(userId);
    await post.save();

    if (global.io) {
      try {
        const eventType = wasLiked ? 'post_liked' : 'post_unliked';

        global.io.to(`user:${post.author._id}`).emit(eventType, {
          postId: post._id,
          userId: userId,
          likesCount: post.likesCount,
          isLiked: wasLiked
        });

        global.io.emit('feed_post_liked', {
          postId: post._id,
          userId: userId,
          likesCount: post.likesCount,
          isLiked: wasLiked
        });
      } catch (socketError) {
        console.error('Error sending real-time like update:', socketError);
      }
    }

    if (wasLiked) {
      try {
        await updateInteractionHistory(userId, post.author._id, 'like', post.media.length > 0 ? post.media[0].type : 'text', post.language, [...(post.hashtags || []), ...(post.tags || [])]);
      } catch (interactionError) {
        console.error('Error updating interaction history:', interactionError);
      }

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
        }
      }
    }

    res.json({
      message: wasLiked ? 'Post liked successfully' : 'Post unliked successfully',
      isLiked: wasLiked,
      likesCount: post.likesCount
    });

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
        posts: []
      });
    }

    const wasSaved = post.addSave(userId);
    await post.save();

    if (wasSaved) {
      if (!defaultCollection.posts.includes(postId)) {
        defaultCollection.posts.push(postId);
        await defaultCollection.save();
      }

      try {
        await updateInteractionHistory(userId, post.author._id, 'save', post.media.length > 0 ? post.media[0].type : 'text', post.language, [...(post.hashtags || []), ...(post.tags || [])]);
      } catch (interactionError) {
        console.error('Error updating interaction history:', interactionError);
      }
    } else {
      defaultCollection.posts = defaultCollection.posts.filter(id => id.toString() !== postId);
      await defaultCollection.save();
    }

      if (global.io) {
        try {
          global.io.emit('feed_post_saved', {
            postId: post._id,
            userId: userId,
            savesCount: post.savesCount,
            isSaved: wasSaved
          });
        } catch (socketError) {
          console.error('Error sending real-time save update:', socketError);
        }
      }

      if (wasSaved && userId.toString() !== post.author._id.toString()) {
        try {
          if (global.notificationService && global.notificationService.createSaveNotification) {
            await global.notificationService.createSaveNotification(
              post._id,
              userId,
              post.author._id
            );
          }
        } catch (error) {
          console.error('Error creating save notification:', error);
        }
      }

      res.json({
        message: wasSaved ? 'Post saved successfully' : 'Post unsaved successfully',
        isSaved: wasSaved,
        savesCount: post.savesCount
      });

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
      post.sharesCount = Math.max(0, post.sharesCount - 1);
      await post.save();

      if (global.io) {
        try {
          global.io.emit('feed_post_shared', {
            postId: post._id,
            userId: userId,
            sharesCount: post.sharesCount,
            isShared: false
          });
        } catch (socketError) {
          console.error('Error sending real-time unshare update:', socketError);
        }
      }

      res.json({
        message: 'Post unshared successfully',
        isShared: false,
        sharesCount: post.sharesCount
      });
    } else {
      const sharedPostData = {
        author: userId,
        content: req.body.caption || '',
        media: [],
        location: req.body.location ? JSON.parse(req.body.location) : post.location,
        language: post.language,
        postType: post.postType,
        visibility: post.visibility,
        tags: req.body.tags ? JSON.parse(req.body.tags) : post.tags,
        mentions: post.mentions,
        hashtags: post.hashtags,
        sharedFrom: post._id,
        originalContent: post.content,
        originalMedia: post.media,
        originalAuthor: post.author,
        originalLocation: post.location,
        originalCreatedAt: post.createdAt
      };

      const sharedPost = new Post(sharedPostData);
      await sharedPost.save();

      post.addShare(userId);
      await post.save();

      try {
        await updateInteractionHistory(userId, post.author._id, 'share', post.media.length > 0 ? post.media[0].type : 'text', post.language, [...(post.hashtags || []), ...(post.tags || [])]);
      } catch (interactionError) {
        console.error('Error updating interaction history:', interactionError);
      }

      await sharedPost.populate('author', 'username fullName profilePicture isVerified location languagePreference');
      await sharedPost.populate('originalAuthor', 'username fullName profilePicture isVerified');

      if (global.io) {
        try {
          global.io.emit('feed_post_shared', {
            postId: post._id,
            userId: userId,
            sharesCount: post.sharesCount,
            isShared: true
          });
        } catch (socketError) {
          console.error('Error sending real-time share update:', socketError);
        }
      }

      if (userId.toString() !== post.author._id.toString()) {
        try {
          if (global.notificationService && global.notificationService.createShareNotification) {
            await global.notificationService.createShareNotification(
              post._id,
              userId,
              post.author._id
            );
          }
        } catch (error) {
          console.error('Error creating share notification:', error);
        }
      }

      res.json({
        message: 'Post shared successfully',
        isShared: true,
        sharesCount: post.sharesCount,
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
