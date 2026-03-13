const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const blocksController = require('../controllers/blocksController');

// @route   POST /api/blocks/:userId
// @desc    Block a user
// @access  Private
router.post('/:userId', protect, blocksController.blockUser);

// @route   DELETE /api/blocks/:userId
// @desc    Unblock a user
// @access  Private
router.delete('/:userId', protect, blocksController.unblockUser);

// @route   PUT /api/blocks/:userId/reactivate
// @desc    Reactivate a previously blocked user
// @access  Private
router.put('/:userId/reactivate', protect, blocksController.reactivateBlock);

// @route   GET /api/blocks
// @desc    Get list of blocked users
// @access  Private
router.get('/', protect, blocksController.getBlockedUsers);

// @route   GET /api/blocks/check/:userId
// @desc    Check if a user is blocked
// @access  Private
router.get('/check/:userId', protect, blocksController.checkBlockStatus);

// @route   GET /api/blocks/stats
// @desc    Get block statistics for current user
// @access  Private
router.get('/stats', protect, blocksController.getBlockStats);

// @route   POST /api/blocks/filter
// @desc    Filter out blocked users from a list of user IDs
// @access  Private
router.post('/filter', protect, blocksController.filterBlockedUsers);

// @route   POST /api/blocks/bulk-check
// @desc    Check block status for multiple users at once
// @access  Private
router.post('/bulk-check', protect, blocksController.bulkCheckBlocked);

module.exports = router;
