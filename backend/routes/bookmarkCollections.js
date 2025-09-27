const express = require('express');
const { body, validationResult } = require('express-validator');
const BookmarkCollection = require('../models/BookmarkCollection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/bookmark-collections
// @desc    Get user's bookmark collections
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const collections = await BookmarkCollection.getUserCollections(req.user._id);

    res.json({
      message: 'Collections retrieved successfully',
      collections
    });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({
      message: 'Server error retrieving collections',
      code: 'GET_COLLECTIONS_ERROR'
    });
  }
});

// @route   POST /api/bookmark-collections
// @desc    Create a new bookmark collection
// @access  Private
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Collection name must be 1-50 characters'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
  body('isPublic').optional().isBoolean(),
  body('coverImage').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, isPublic, coverImage } = req.body;

    // Check for duplicate collection name
    const existingCollection = await BookmarkCollection.findOne({
      user: req.user._id,
      name: name
    });

    if (existingCollection) {
      return res.status(400).json({
        message: 'Collection name already exists',
        code: 'DUPLICATE_COLLECTION_NAME'
      });
    }

    const collection = new BookmarkCollection({
      name,
      description: description || '',
      isPublic: isPublic || false,
      coverImage,
      user: req.user._id,
      posts: []
    });

    await collection.save();

    res.status(201).json({
      message: 'Collection created successfully',
      collection
    });
  } catch (error) {
    console.error('Create collection error:', error);

    if (error.code === 'DUPLICATE_COLLECTION_NAME') {
      return res.status(400).json({
        message: 'Collection name already exists',
        code: 'DUPLICATE_COLLECTION_NAME'
      });
    }

    res.status(500).json({
      message: 'Server error creating collection',
      code: 'CREATE_COLLECTION_ERROR'
    });
  }
});

// @route   PUT /api/bookmark-collections/:collectionId
// @desc    Update a bookmark collection
// @access  Private
router.put('/:collectionId', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Collection name must be 1-50 characters'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
  body('isPublic').optional().isBoolean(),
  body('coverImage').optional().isURL()
], async (req, res) => {
  try {
    const { collectionId } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const collection = await BookmarkCollection.findOne({
      _id: collectionId,
      user: req.user._id
    });

    if (!collection) {
      return res.status(404).json({
        message: 'Collection not found',
        code: 'COLLECTION_NOT_FOUND'
      });
    }

    const { name, description, isPublic, coverImage } = req.body;

    if (name && name !== collection.name) {
      // Check if new name conflicts with existing collection
      const existingCollection = await BookmarkCollection.findOne({
        user: req.user._id,
        name,
        _id: { $ne: collectionId }
      });

      if (existingCollection) {
        return res.status(400).json({
          message: 'Collection name already exists',
          code: 'DUPLICATE_COLLECTION_NAME'
        });
      }
    }

    // Update fields
    if (name !== undefined) collection.name = name;
    if (description !== undefined) collection.description = description;
    if (isPublic !== undefined) collection.isPublic = isPublic;
    if (coverImage !== undefined) collection.coverImage = coverImage;

    await collection.save();

    res.json({
      message: 'Collection updated successfully',
      collection
    });
  } catch (error) {
    console.error('Update collection error:', error);
    res.status(500).json({
      message: 'Server error updating collection',
      code: 'UPDATE_COLLECTION_ERROR'
    });
  }
});

// @route   DELETE /api/bookmark-collections/:collectionId
// @desc    Delete a bookmark collection
// @access  Private
router.delete('/:collectionId', authenticateToken, async (req, res) => {
  try {
    const { collectionId } = req.params;

    const collection = await BookmarkCollection.findOneAndDelete({
      _id: collectionId,
      user: req.user._id
    });

    if (!collection) {
      return res.status(404).json({
        message: 'Collection not found',
        code: 'COLLECTION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Collection deleted successfully'
    });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({
      message: 'Server error deleting collection',
      code: 'DELETE_COLLECTION_ERROR'
    });
  }
});

// @route   POST /api/bookmark-collections/:collectionId/posts/:postId
// @desc    Add post to collection
// @access  Private
router.post('/:collectionId/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { collectionId, postId } = req.params;

    const collection = await BookmarkCollection.findOne({
      _id: collectionId,
      user: req.user._id
    });

    if (!collection) {
      return res.status(404).json({
        message: 'Collection not found',
        code: 'COLLECTION_NOT_FOUND'
      });
    }

    // Check if post is already in collection
    if (collection.posts.includes(postId)) {
      return res.status(400).json({
        message: 'Post already in collection',
        code: 'POST_ALREADY_IN_COLLECTION'
      });
    }

    collection.posts.push(postId);
    await collection.save();

    res.json({
      message: 'Post added to collection successfully',
      collection
    });
  } catch (error) {
    console.error('Add post to collection error:', error);
    res.status(500).json({
      message: 'Server error adding post to collection',
      code: 'ADD_POST_TO_COLLECTION_ERROR'
    });
  }
});

// @route   DELETE /api/bookmark-collections/:collectionId/posts/:postId
// @desc    Remove post from collection
// @access  Private
router.delete('/:collectionId/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { collectionId, postId } = req.params;

    const collection = await BookmarkCollection.findOne({
      _id: collectionId,
      user: req.user._id
    });

    if (!collection) {
      return res.status(404).json({
        message: 'Collection not found',
        code: 'COLLECTION_NOT_FOUND'
      });
    }

    // Remove post from collection
    collection.posts = collection.posts.filter(id => id.toString() !== postId);
    await collection.save();

    res.json({
      message: 'Post removed from collection successfully',
      collection
    });
  } catch (error) {
    console.error('Remove post from collection error:', error);
    res.status(500).json({
      message: 'Server error removing post from collection',
      code: 'REMOVE_POST_FROM_COLLECTION_ERROR'
    });
  }
});

// @route   GET /api/bookmark-collections/:collectionId/posts
// @desc    Get posts in a collection
// @access  Private
router.get('/:collectionId/posts', authenticateToken, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const collection = await BookmarkCollection.findOne({
      _id: collectionId,
      user: req.user._id
    }).populate({ 
      path: 'posts',
      populate: {
        path: 'author',
        select: 'username fullName profilePicture isVerified'
      },
      options: {
        sort: { createdAt: -1 },
        skip: (parseInt(page) - 1) * parseInt(limit),
        limit: parseInt(limit)
      }
    });

    if (!collection) {
      return res.status(404).json({
        message: 'Collection not found',
        code: 'COLLECTION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Collection posts retrieved successfully',
      collection: {
        _id: collection._id,
        name: collection.name,
        description: collection.description,
        posts: collection.posts,
        postCount: collection.posts.length
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: collection.posts.length
      }
    });
  } catch (error) {
    console.error('Get collection posts error:', error);
    res.status(500).json({
      message: 'Server error retrieving collection posts',
      code: 'GET_COLLECTION_POSTS_ERROR'
    });
  }
});

module.exports = router;
