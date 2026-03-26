const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const reportsController = require('../controllers/reportsController');

const router = express.Router();

// User Reporting Routes
router.post('/post/:postId', authenticateToken, reportsController.reportPost);
router.post('/comment/:commentId', authenticateToken, reportsController.reportComment);
router.post('/story/:storyId', authenticateToken, reportsController.reportStory);
router.post('/user/:userId', authenticateToken, reportsController.reportUser);
router.get('/my', authenticateToken, reportsController.getMyReports);

// Admin/Mod Routes (simplified adminAuth for now)
const adminAuth = authenticateToken; 

router.get('/', adminAuth, reportsController.getAllReports);
router.put('/:reportId/assign', adminAuth, reportsController.assignReport);
router.post('/:reportId/note', adminAuth, reportsController.addNote);
router.put('/:reportId/resolve', adminAuth, reportsController.resolveReport);
router.put('/:reportId/dismiss', adminAuth, reportsController.dismissReport);

module.exports = router;


