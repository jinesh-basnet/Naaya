const express = require('express');
const path = require('path');
const { uploadMultiple } = require('../../middleware/upload');
const { body, validationResult } = require('express-validator');
const Post = require('../../models/Post');
const { findCommentById, countTotalComments, validatePostData, processMediaFiles } = require('../../utils/postHelpers');

const router = express.Router();

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', uploadMultiple('media'), [
  body('caption').optional().isString().isLength({ max: 2200 }),
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

    // Trim content and caption to max length
    if (req.body.content) req.body.content = req.body.content.substring(0, 2200);
    if (req.body.caption) req.body.caption = req.body.caption.substring(0, 2200);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const postData = {
      ...req.body,
      author: req.user._id
    };

    // Map caption to content if provided
    if (req.body.caption) {
      postData.content = req.body.caption;
    }

    // Handle uploaded media files with proper error handling
    if (req.files && req.files.length > 0) {
      try {
        postData.media = req.files.map(file => {
          if (!file.mimetype || !file.path) {
            throw new Error('Invalid file data');
          }
          return {
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            url: `${req.protocol}://${req.get('host')}/uploads/${path.basename(file.path)}`,
            size: file.size || 0,
            width: file.width || 0,
            height: file.height || 0
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
    }

    // Parse location if provided with proper error handling
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

    // Parse tags if provided with proper error handling
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

    // Validate required fields
    if (!postData.content && (!postData.media || postData.media.length === 0)) {
      return res.status(400).json({
        message: 'Post must have either content or media',
        code: 'MISSING_CONTENT_OR_MEDIA'
      });
    }

    const post = new Post(postData);
    await post.save();

    // Populate author details
    await post.populate('author', 'username fullName profilePicture isVerified location languagePreference');

    console.log('Post created successfully:', post._id);
    res.status(201).json({
      message: 'Post created successfully',
      post
    });

  } catch (error) {
    console.error('Create post error:', error);
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
router.put('/:postId', uploadMultiple('media'), [
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

    // Update fields if provided
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
