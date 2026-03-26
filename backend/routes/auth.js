const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { loginRateLimiter, registerRateLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

const router = express.Router();

// User Registration & Login
router.post('/register', registerRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);

router.get('/me', authenticateToken, authController.getMe);

// Verification & Tokens
router.post('/send-verification', authenticateToken, authController.sendVerification);
router.post('/verify-email', authController.verifyEmail);
router.post('/refresh', loginRateLimiter, authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;


