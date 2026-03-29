const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const usersController = require('../controllers/usersController');

const router = express.Router();

router.get('/profile/:username', optionalAuth, usersController.getUserProfile);
router.put('/profile', authenticateToken, uploadSingle('profilePicture'), usersController.updateProfile);
router.delete('/profile', authenticateToken, usersController.deleteProfile);

router.post('/:userId/follow', authenticateToken, usersController.followUser);
router.post('/:userId/unfollow', authenticateToken, usersController.unfollowUser);
router.get('/followers/:username', optionalAuth, usersController.getFollowers);
router.get('/following/:username', optionalAuth, usersController.getFollowing);

router.get('/search', authenticateToken, usersController.searchUsers);
router.get('/suggestions', authenticateToken, usersController.getSuggestions);

router.post('/keys', authenticateToken, usersController.updateKeys);

router.get('/:username', optionalAuth, usersController.getUserProfile);

module.exports = router;


