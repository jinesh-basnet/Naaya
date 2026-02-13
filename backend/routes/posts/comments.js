const express = require('express');
const { body, validationResult } = require('express-validator');
const Post = require('../../models/Post');
const { authenticateToken } = require('../../middleware/auth');
const { updateInteractionHistory } = require('../../utils/feedAlgorithm');
const { findCommentById, countTotalComments } = require('../../utils/postHelpers');

const router = express.Router();

// @route   POST /api/posts/:postId/comment
// @desc    Add a comment to a post
// @access  Private
router.post('/:postId/comment', authenticateToken, [
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

    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    const comment = {
      author: userId,
      content: content
    };

    post.comments.push(comment);
    await post.save();

    try {
      await updateInteractionHistory(userId, post.author._id, 'comment', post.media.length > 0 ? post.media[0].type : 'text', post.language, [...(post.hashtags || []), ...(post.tags || [])]);
    } catch (interactionError) {
      console.error('Error updating interaction history:', interactionError);
    }

    await post.populate('comments.author', 'username fullName profilePicture');

    const newComment = post.comments[post.comments.length - 1];

    if (global.notificationService && global.notificationService.io) {
      try {
        global.notificationService.io.to(`post:${postId}`).emit('comment_added', {
          postId: postId,
          comment: newComment,
          commentCount: countTotalComments(post.comments)
        });
      } catch (notificationError) {
        console.error('Error sending comment notification:', notificationError);
      }
    }

    if (userId.toString() !== post.author._id.toString()) {
      try {
        if (global.notificationService && global.notificationService.createCommentNotification) {
          await global.notificationService.createCommentNotification(
            post._id,
            userId,
            post.author._id,
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

// @route   GET /api/posts/:postId/comments
// @desc    Get comments for a post
// @access  Private
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    const comments = post.comments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice((page - 1) * limit, page * limit);

    await Post.populate(comments, [
      {
        path: 'author',
        select: 'username fullName profilePicture isVerified'
      },
      {
        path: 'replies.author',
        select: 'username fullName profilePicture isVerified'
      },
      {
        path: 'replies.replies.author',
        select: 'username fullName profilePicture isVerified'
      }
    ]);

    res.json({
      message: 'Comments retrieved successfully',
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: post.comments.length
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      message: 'Server error retrieving comments',
      code: 'GET_COMMENTS_ERROR'
    });
  }
});

// @route   POST /api/posts/:postId/comments/:commentId/like
// @desc    Like/unlike a comment
// @access  Private
router.post('/:postId/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    const existingLike = comment.likes.find(like => like.user.toString() === userId.toString());

    if (existingLike) {
      comment.likes.pull(existingLike._id);
      await post.save();

      res.json({
        message: 'Comment unliked successfully',
        isLiked: false,
        likesCount: comment.likes.length
      });
    } else {
      comment.likes.push({ user: userId });
      await post.save();

      res.json({
        message: 'Comment liked successfully',
        isLiked: true,
        likesCount: comment.likes.length
      });
    }

  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({
      message: 'Server error liking comment',
      code: 'LIKE_COMMENT_ERROR'
    });
  }
});

// @route   POST /api/posts/:postId/comments/:commentId/reply
// @desc    Reply to a comment
// @access  Private
router.post('/:postId/comments/:commentId/reply', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Reply must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    const reply = {
      author: userId,
      content: content
    };

    comment.replies.push(reply);
    await post.save();

    await post.populate('comments.replies.author', 'username fullName profilePicture');

    const newReply = comment.replies[comment.replies.length - 1];

    if (global.notificationService && global.notificationService.io) {
      try {
        global.notificationService.io.to(`post:${postId}`).emit('comment_reply_added', {
          postId: postId,
          commentId: commentId,
          reply: newReply,
          replyCount: comment.replies.length,
          commentCount: countTotalComments(post.comments) // Include total comment count including replies
        });
      } catch (notificationError) {
        console.error('Error sending reply notification:', notificationError);
      }
    }

    if (userId.toString() !== comment.author._id.toString()) {
      try {
        if (global.notificationService && global.notificationService.createCommentNotification) {
          await global.notificationService.createCommentNotification(
            post._id,
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
});

// @route   POST /api/posts/:postId/replies/:replyId/like
// @desc    Like/unlike a reply
// @access  Private
router.post('/:postId/replies/:replyId/like', authenticateToken, async (req, res) => {
  try {
    const { postId, replyId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    const reply = findCommentById(post.comments, replyId);
    if (!reply) {
      return res.status(404).json({
        message: 'Reply not found',
        code: 'REPLY_NOT_FOUND'
      });
    }

    const existingLike = reply.likes.find(like => like.user.toString() === userId.toString());

    if (existingLike) {
      reply.likes.pull(existingLike._id);
      await post.save();

      res.json({
        message: 'Reply unliked successfully',
        isLiked: false,
        likesCount: reply.likes.length
      });
    } else {
      reply.likes.push({ user: userId });
      await post.save();

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
});

// @route   POST /api/posts/:postId/replies/:replyId/reply
// @desc    Reply to a reply
// @access  Private
router.post('/:postId/replies/:replyId/reply', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 500 }).withMessage('Reply must be between 1 and 500 characters')
], async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/replies/:replyId/reply called');
    console.log('req.params:', req.params);
    console.log('req.body:', req.body);
    console.log('req.user:', req.user ? req.user._id : 'No user');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { postId, replyId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      console.log('Post not found:', postId);
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    const parentReply = findCommentById(post.comments, replyId);
    if (!parentReply) {
      console.log('Reply not found:', replyId);
      return res.status(404).json({
        message: 'Reply not found',
        code: 'REPLY_NOT_FOUND'
      });
    }

    const reply = {
      author: userId,
      content: content
    };

    parentReply.replies.push(reply);
    await post.save();

    await post.populate('comments.replies.author', 'username fullName profilePicture');

    const newReply = parentReply.replies[parentReply.replies.length - 1];

    if (global.notificationService && global.notificationService.io) {
      try {
        global.notificationService.io.to(`post:${postId}`).emit('comment_reply_added', {
          postId: postId,
          commentId: replyId,
          reply: newReply,
          replyCount: parentReply.replies.length,
          commentCount: countTotalComments(post.comments) // Include total comment count including replies
        });
      } catch (notificationError) {
        console.error('Error sending reply to reply notification:', notificationError);
      }
    }

    if (userId.toString() !== parentReply.author._id.toString()) {
      try {
        if (global.notificationService && global.notificationService.createCommentNotification) {
          await global.notificationService.createCommentNotification(
            post._id,
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
});

module.exports = router;
