const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const feedController = require('../../controllers/feedController');

const router = express.Router();

router.get('/', authenticateToken, feedController.getDefaultFeed);

router.get('/feed', authenticateToken, feedController.getPersonalizedFeed);

router.get('/explore-overview', authenticateToken, feedController.getExploreOverview);

module.exports = router;

