const express = require('express');
const router = express.Router();

// Import sub-routers
const createRouter = require('./create');
const interactionsRouter = require('./interactions');
const commentsRouter = require('./comments');
const retrievalRouter = require('./retrieval');
const feedRouter = require('./feed');

// Mount sub-routers in correct order (specific routes before generic ones)
router.use('/', feedRouter);          // GET /api/posts, GET /api/posts/feed (must be first)
router.use('/', createRouter);        // POST /api/posts, PUT /api/posts/:postId
router.use('/', interactionsRouter);  // POST /api/posts/:postId/like, save, share
router.use('/', commentsRouter);      // POST /api/posts/:postId/comment, GET /api/posts/:postId/comments, etc.
router.use('/', retrievalRouter);     // GET /api/posts/:postId, GET /api/posts/user/:username, etc. (must be last)

module.exports = router;
