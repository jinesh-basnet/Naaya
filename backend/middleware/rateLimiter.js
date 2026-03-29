const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: 'Too many tries! Please wait a while before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, 
  message: {
    message: 'Slow down! Too many login attempts.'
  }
});

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    message: 'You have reached the limit for creating accounts today.'
  }
});

const suggestionsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    message: 'Easy there! Searching too fast.'
  }
});

const messagingRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 60,
  message: {
    message: 'Chill out with the messages. You are talking too fast!'
  },
  keyGenerator: (req) => req.user?._id || req.ip
});

module.exports = {
  authRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  suggestionsRateLimiter,
  messagingRateLimiter
};
