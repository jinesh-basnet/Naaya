const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const privacyController = require('../controllers/privacyController');

// @route   GET /api/privacy
// @desc    Get current user's privacy settings
// @access  Private
router.get('/', protect, privacyController.getPrivacySettings);

// @route   PUT /api/privacy
// @desc    Update privacy settings
// @access  Private
router.put('/', protect, privacyController.updatePrivacySettings);

// @route   PUT /api/privacy/comments
// @desc    Update comment privacy setting
// @access  Private
router.put('/comments', protect, privacyController.updateCommentPrivacy);

module.exports = router;
