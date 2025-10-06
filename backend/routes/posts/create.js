const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { upload, uploadMultiple } = require('../../middleware/upload');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const Post = require('../../models/Post');

const router = express.Router();

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', authenticateToken, upload.any(), [
  body('content').optional().isString().isLength({ max: 2200 }),
  body('tags').optional(),
  body('location').optional(),
  body('postType').optional().isString(),
  body('visibility').optional().isString(),
  body('language').optional().isIn(['nepali', 'english', 'mixed']).withMessage('Invalid language')
], async (req, res) => {
  try {
    console.log('Received POST /api/posts');
    console.log('req.body:', req.body);
    console.log('req.files:', req.files ? req.files.length : 0);

    if (req.body.content) req.body.content = req.body.content.substring(0, 2200);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    delete req.body.media;
    const postData = {
      ...req.body,
      author: req.user._id
    };

    if (req.body.content) {
      postData.content = req.body.content;
    }

    const mediaFiles = req.files ? req.files.filter(f => f.fieldname === 'media') : [];
    if (mediaFiles.length > 0) {
      try {
        postData.media = mediaFiles.map(file => {
          const filename = path.basename(file.path);

          return {
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            url: `${req.protocol}://${req.get('host')}/uploads/${filename}`,
            size: file.size || 0,
            width: 0,
            height: 0,
            format: path.extname(file.originalname).slice(1)
          };
        });
      } catch (fileError) {
        console.error('File processing error:', fileError);
        return res.status(400).json({
          message: 'Error processing uploaded files',
          code: 'FILE_PROCESSING_ERROR',
          error: fileError.message
        });
      }
    } else {
      postData.media = [];
    }

    if (req.body.location && req.body.location.trim()) {
      try {
        const parsed = JSON.parse(req.body.location);
        if (typeof parsed === 'string') {
          postData.location = { name: parsed };
        } else {
          postData.location = parsed;
        }
      } catch (e) {
        console.error('Location parsing error:', e);
        return res.status(400).json({
          message: 'Invalid location format',
          code: 'INVALID_LOCATION'
        });
      }
    }

    if (req.body.tags) {
      try {
        if (typeof req.body.tags === 'string') {
          postData.tags = JSON.parse(req.body.tags);
        } else {
          postData.tags = req.body.tags;
        }
      } catch (e) {
        console.error('Tags parsing error:', e);
        return res.status(400).json({
          message: 'Invalid tags format',
          code: 'INVALID_TAGS'
        });
      }
    }

    if (!postData.media || postData.media.length === 0) {
      return res.status(400).json({
        message: 'Media is required',
        code: 'MISSING_MEDIA'
      });
    }

    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected, readyState:', mongoose.connection.readyState);
      return res.status(500).json({
        message: 'Database connection error',
        code: 'DATABASE_ERROR'
      });
    }

    console.log('postData before saving:', postData);

    const post = new Post(postData);
    await post.save();

    await post.populate('author', 'username fullName profilePicture isVerified location languagePreference');

    console.log('Post created successfully:', post._id);
    res.status(201).json({
      message: 'Post created successfully',
      post
    });

  } catch (error) {
    console.error('Create post error:', error);
    console.error('Error stack:', error.stack);
    console.error('Database readyState:', mongoose.connection.readyState);
    res.status(500).json({
      message: 'Server error creating post',
      code: 'CREATE_POST_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

 // @route   PUT /api/posts/:postId
 // @desc    Update a post
 // @access  Private
 router.put('/:postId', authenticateToken, uploadMultiple('media'), [
  body('content').optional().isString().isLength({ max: 2200 }),
  body('tags').optional(),
  body('location').optional(),
  body('postType').optional().isString(),
  body('visibility').optional().isString(),
  body('language').optional().isIn(['nepali', 'english', 'mixed']).withMessage('Invalid language')
], async (req, res) => {
  try {
    const { postId } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const post = await Post.findOne({
      _id: postId,
      author: req.user._id,
      isDeleted: false
    });

    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    const { content, tags, location, postType, visibility, language } = req.body;

    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = tags;
    if (location !== undefined) post.location = location;
    if (postType !== undefined) post.postType = postType;
    if (visibility !== undefined) post.visibility = visibility;
    if (language !== undefined) post.language = language;

    await post.save();

    res.json({
      message: 'Post updated successfully',
      post
    });

  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      message: 'Server error updating post',
      code: 'UPDATE_POST_ERROR'
    });
  }
});

module.exports = router;
