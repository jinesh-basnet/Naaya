const express = require('express');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/feed/simple
// @desc    Get simple combined feed of posts and reels
// @access  Private
router.get('/simple', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const following = await Follow.find({ follower: userId }).select('following').lean();
    const followingIds = following.map(f => f.following.toString());

    const posts = await Post.find({
      author: { $in: [...followingIds, userId] },
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .lean();

    const reels = await Reel.find({
      author: { $in: [...followingIds, userId] },
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .lean();

    const reelsWithFlag = reels.map(reel => ({
      ...reel,
      isReel: true,
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      sharesCount: reel.sharesCount,
      savesCount: reel.savesCount,
      viewsCount: reel.viewsCount
    }));

    const combinedFeed = [
      ...posts.map(post => ({ ...post, isReel: false })),
      ...reelsWithFlag
    ];

    combinedFeed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedFeed = combinedFeed.slice(startIndex, endIndex);

    res.json({
      message: 'Combined feed retrieved successfully',
      posts: paginatedFeed,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: combinedFeed.length
      },
      feedType: 'combined'
    });

  } catch (error) {
    console.error('Get combined feed error:', error);
    res.status(500).json({
      message: 'Server error retrieving combined feed',
      code: 'COMBINED_FEED_ERROR'
    });
  }
});

module.exports = router;
