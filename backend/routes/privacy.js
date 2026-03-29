const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const privacyController = require('../controllers/privacyController');

router.get('/', authenticateToken, privacyController.getPrivacySettings);

router.put('/', authenticateToken, privacyController.updatePrivacySettings);

router.put('/comments', authenticateToken, privacyController.updateCommentPrivacy);

module.exports = router;

