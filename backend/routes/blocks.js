const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const blocksController = require('../controllers/blocksController');

router.post('/:userId', authenticateToken, blocksController.blockUser);

router.delete('/:userId', authenticateToken, blocksController.unblockUser);

router.put('/:userId/reactivate', authenticateToken, blocksController.reactivateBlock);

router.get('/', authenticateToken, blocksController.getBlockedUsers);

router.get('/check/:userId', authenticateToken, blocksController.checkBlockStatus);

router.get('/stats', authenticateToken, blocksController.getBlockStats);

router.post('/filter', authenticateToken, blocksController.filterBlockedUsers);

router.post('/bulk-check', authenticateToken, blocksController.bulkCheckBlocked);

module.exports = router;

