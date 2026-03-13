const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const BookmarkCollection = require('../models/BookmarkCollection');
const Post = require('../models/Post');

exports.getCollections = async (req, res) => {
  try {
    const collections = await BookmarkCollection.getUserCollections(req.user._id);

    // Block Feature Integration: Filter out items from blocked users
    const Block = require('../models/Block');
    const blockedUserIds = await Block.getBlockedUserIds(req.user._id);
    const blockerUserIds = await Block.getBlockerUserIds(req.user._id);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());

    const filteredCollections = collections.map(collection => {
      const collectionObj = collection.toObject();
      collectionObj.posts = (collectionObj.posts || []).filter(post => 
        post.author && !allBlockedIds.includes(post.author._id?.toString())
      );
      collectionObj.reels = (collectionObj.reels || []).filter(reel => 
        reel.author && !allBlockedIds.includes(reel.author._id?.toString())
      );
      return collectionObj;
    });

    res.json({
      message: 'Collections retrieved successfully',
      collections: filteredCollections
    });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({
      message: 'Server error retrieving collections',
      code: 'GET_COLLECTIONS_ERROR'
    });
  }
};

exports.createCollection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, visibility, coverImage } = req.body;

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
      visibility: visibility || 'private',
      coverImage,
      user: req.user._id,
      posts: [],
      reels: []
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
};

exports.updateCollection = async (req, res) => {
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

    const { name, description, visibility, coverImage } = req.body;

    if (name && name !== collection.name) {
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

    if (name !== undefined) collection.name = name;
    if (description !== undefined) collection.description = description;
    if (visibility !== undefined) collection.visibility = visibility;
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
};

exports.deleteCollection = async (req, res) => {
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
};

exports.addPostToCollection = async (req, res) => {
  try {
    const { collectionId, postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        message: 'Invalid post ID',
        code: 'INVALID_POST_ID'
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

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    // Block check
    const Block = require('../models/Block');
    const isBlocked = await Block.areBlocked(req.user._id, post.author._id);
    if (isBlocked) {
      return res.status(403).json({
        message: 'Access denied due to blocking restrictions',
        code: 'BLOCK_RESTRICTION'
      });
    }

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
};

exports.removePostFromCollection = async (req, res) => {
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
};

exports.addReelToCollection = async (req, res) => {
  try {
    const { collectionId, reelId } = req.params;
    const Reel = require('../models/Reel');

    if (!mongoose.Types.ObjectId.isValid(reelId)) {
      return res.status(400).json({
        message: 'Invalid reel ID',
        code: 'INVALID_REEL_ID'
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

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    // Block check
    const Block = require('../models/Block');
    const isBlocked = await Block.areBlocked(req.user._id, reel.author._id);
    if (isBlocked) {
      return res.status(403).json({
        message: 'Access denied due to blocking restrictions',
        code: 'BLOCK_RESTRICTION'
      });
    }

    if (collection.reels && collection.reels.includes(reelId)) {
      return res.status(400).json({
        message: 'Reel already in collection',
        code: 'REEL_ALREADY_IN_COLLECTION'
      });
    }

    if (!collection.reels) collection.reels = [];
    collection.reels.push(reelId);
    await collection.save();

    res.json({
      message: 'Reel added to collection successfully',
      collection
    });
  } catch (error) {
    console.error('Add reel to collection error:', error);
    res.status(500).json({
      message: 'Server error adding reel to collection',
      code: 'ADD_REEL_TO_COLLECTION_ERROR'
    });
  }
};

exports.removeReelFromCollection = async (req, res) => {
  try {
    const { collectionId, reelId } = req.params;

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

    if (collection.reels) {
      collection.reels = collection.reels.filter(id => id.toString() !== reelId);
    }
    await collection.save();

    res.json({
      message: 'Reel removed from collection successfully',
      collection
    });
  } catch (error) {
    console.error('Remove reel from collection error:', error);
    res.status(500).json({
      message: 'Server error removing reel from collection',
      code: 'REMOVE_REEL_FROM_COLLECTION_ERROR'
    });
  }
};
