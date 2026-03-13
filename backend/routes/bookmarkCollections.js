const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const bookmarkCollectionsController = require('../controllers/bookmarkCollectionsController');

const router = express.Router();

// @route   GET /api/bookmark-collections
// @desc    Get user's bookmark collections
// @access  Private
router.get('/', authenticateToken, bookmarkCollectionsController.getCollections);

// @route   POST /api/bookmark-collections
// @desc    Create a new bookmark collection
// @access  Private
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Collection name must be 1-50 characters'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
  body('isPublic').optional().isBoolean(),
  body('coverImage').optional().isURL()
], bookmarkCollectionsController.createCollection);

// @route   PUT /api/bookmark-collections/:collectionId
// @desc    Update a bookmark collection
// @access  Private
router.put('/:collectionId', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Collection name must be 1-50 characters'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
  body('isPublic').optional().isBoolean(),
  body('coverImage').optional().isURL()
], bookmarkCollectionsController.updateCollection);

// @route   DELETE /api/bookmark-collections/:collectionId
// @desc    Delete a bookmark collection
// @access  Private
router.delete('/:collectionId', authenticateToken, bookmarkCollectionsController.deleteCollection);

// @route   POST /api/bookmark-collections/:collectionId/posts/:postId
// @desc    Add post to collection
// @access  Private
router.post('/:collectionId/posts/:postId', authenticateToken, bookmarkCollectionsController.addPostToCollection);

// @route   DELETE /api/bookmark-collections/:collectionId/posts/:postId
// @desc    Remove post from collection
// @access  Private
router.delete('/:collectionId/posts/:postId', authenticateToken, bookmarkCollectionsController.removePostFromCollection);

// @route   POST /api/bookmark-collections/:collectionId/reels/:reelId
// @desc    Add reel to collection
// @access  Private
router.post('/:collectionId/reels/:reelId', authenticateToken, bookmarkCollectionsController.addReelToCollection);

// @route   DELETE /api/bookmark-collections/:collectionId/reels/:reelId
// @desc    Remove reel from collection
// @access  Private
router.delete('/:collectionId/reels/:reelId', authenticateToken, bookmarkCollectionsController.removeReelFromCollection);

module.exports = router;
