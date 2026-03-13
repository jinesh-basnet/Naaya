const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const usersController = require('../controllers/usersController');

const router = express.Router();

// @route   GET /api/users/profile/:username
// @desc    Get user profile by username
// @access  Public
router.get('/profile/:username', optionalAuth, usersController.getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, uploadSingle('profilePicture'), usersController.updateProfile);

// @route   POST /api/users/:userId/follow
// @desc    Follow a user
// @access  Private
router.post('/:userId/follow', authenticateToken, usersController.followUser);

// @route   POST /api/users/:userId/unfollow
// @desc    Unfollow a user
// @access  Private
router.post('/:userId/unfollow', authenticateToken, usersController.unfollowUser);

// @route   GET /api/users/search
// @desc    Search users by username or fullName
// @access  Private
router.get('/search', authenticateToken, usersController.searchUsers);

// @route   GET /api/users/followers/:username
// @desc    Get followers of a user
// @access  Public
router.get('/followers/:username', optionalAuth, usersController.getFollowers);

// @route   GET /api/users/following/:username
// @desc    Get users followed by a user
// @access  Public
router.get('/following/:username', optionalAuth, usersController.getFollowing);

// @route   GET /api/users/suggestions
// @desc    Get user suggestions
// @access  Private
router.get('/suggestions', authenticateToken, usersController.getSuggestions);

// @route   POST /api/users/keys
// @desc    Update user E2EE keys
// @access  Private
router.post('/keys', authenticateToken, usersController.updateKeys);

// @route   DELETE /api/users/profile
// @desc    Delete user account
// @access  Private
router.delete('/profile', authenticateToken, usersController.deleteProfile);

module.exports = router;
