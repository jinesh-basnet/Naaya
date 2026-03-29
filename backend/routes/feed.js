const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const feedController = require('../controllers/feedController');

const router = express.Router();

router.get('/simple', authenticateToken, feedController.getSimpleFeed);

module.exports = router;

