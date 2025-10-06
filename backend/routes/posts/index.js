const express = require('express');
const router = express.Router();

const createRouter = require('./create');
const interactionsRouter = require('./interactions');
const commentsRouter = require('./comments');
const retrievalRouter = require('./retrieval');
const feedRouter = require('./feed');

router.use('/', feedRouter);          
router.use('/', createRouter);
router.use('/', interactionsRouter);
router.use('/', commentsRouter);
router.use('/', retrievalRouter);  

module.exports = router;
