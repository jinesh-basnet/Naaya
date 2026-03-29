const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const bookmarkCollectionsController = require('../controllers/bookmarkCollectionsController');

const router = express.Router();

router.get('/', authenticateToken, bookmarkCollectionsController.getCollections);

router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Collection name must be 1-50 characters'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
  body('isPublic').optional().isBoolean(),
  body('coverImage').optional().isURL()
], bookmarkCollectionsController.createCollection);

router.put('/:collectionId', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Collection name must be 1-50 characters'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
  body('isPublic').optional().isBoolean(),
  body('coverImage').optional().isURL()
], bookmarkCollectionsController.updateCollection);

router.delete('/:collectionId', authenticateToken, bookmarkCollectionsController.deleteCollection);

router.post('/:collectionId/posts/:postId', authenticateToken, bookmarkCollectionsController.addPostToCollection);

router.delete('/:collectionId/posts/:postId', authenticateToken, bookmarkCollectionsController.removePostFromCollection);

router.post('/:collectionId/reels/:reelId', authenticateToken, bookmarkCollectionsController.addReelToCollection);

router.delete('/:collectionId/reels/:reelId', authenticateToken, bookmarkCollectionsController.removeReelFromCollection);

module.exports = router;

