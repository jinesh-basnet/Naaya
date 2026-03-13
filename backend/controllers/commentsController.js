const Post = require('../models/Post');
const { updateInteractionHistory } = require('../utils/feedAlgorithm');
const { findCommentById, countTotalComments } = require('../utils/postHelpers');
const { validationResult } = require('express-validator');

exports.addComment = async (req, res) => {
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
};

exports.getComments = async (req, res) => {
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
};

exports.likeComment = async (req, res) => {
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
};

exports.likeReply = async (req, res) => {
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
};

exports.replyToReply = async (req, res) => {
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
          commentCount: countTotalComments(post.comments) 
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
};

exports.deleteCommentOrReply = async (req, res) => {
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

    const removeComment = (commentsArray, id) => {
      for (let i = 0; i < commentsArray.length; i++) {
        const comment = commentsArray[i];
        if (comment._id.toString() === id.toString()) {
          if (comment.author.toString() !== userId.toString() && post.author.toString() !== userId.toString()) {
            return { error: 'Permission denied', status: 403 };
          }
          commentsArray.splice(i, 1);
          return { success: true };
        }
        if (comment.replies && comment.replies.length > 0) {
          const result = removeComment(comment.replies, id);
          if (result) return result;
        }
      }
      return null;
    };

    const result = removeComment(post.comments, commentId);

    if (!result) {
      return res.status(404).json({
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    if (result.error) {
      return res.status(result.status).json({
        message: result.error,
        code: 'DELETE_COMMENT_PERMISSION_DENIED'
      });
    }

    await post.save();

    res.json({
      message: 'Comment deleted successfully',
      commentCount: countTotalComments(post.comments)
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      message: 'Server error deleting comment',
      code: 'DELETE_COMMENT_ERROR'
    });
  }
};
