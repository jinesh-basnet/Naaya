const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const interactionsController = require('../../controllers/interactionsController');

const router = express.Router();

router.post('/:postId/like', authenticateToken, interactionsController.likePost);

router.post('/:postId/save', authenticateToken, interactionsController.savePost);

router.post('/:postId/share', authenticateToken, [
  body('caption').optional().isString().isLength({ max: 2200 }),
  body('tags').optional(),
  body('location').optional(),
], interactionsController.sharePost);

router.post('/:postId/view', authenticateToken, interactionsController.viewPost);

module.exports = router;


