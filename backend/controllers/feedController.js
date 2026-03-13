const Post = require('../models/Post');
const Reel = require('../models/Reel');
const User = require('../models/User');
const Follow = require('../models/Follow');

exports.getSimpleFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const following = await Follow.find({ follower: userId }).select('following').lean();
    const followingIds = following.map(f => f.following.toString());

    // Get all blocked IDs (both who I blocked and who blocked me)
    const Block = require('../models/Block');
    const blockedUserIds = await Block.getBlockedUserIds(userId);
    const blockerUserIds = await Block.getBlockerUserIds(userId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());

    // Filter out blocked users from following list for the feed query
    const filteredFollowingIds = followingIds.filter(id => !allBlockedIds.includes(id));

    const posts = await Post.find({
      author: { $in: [...filteredFollowingIds, userId], $nin: allBlockedIds },
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .lean();

    const reels = await Reel.find({
      author: { $in: [...filteredFollowingIds, userId], $nin: allBlockedIds },
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
};

exports.getDefaultFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const posts = await Post.find({
      author: userId,
      postType: 'post',
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .populate('originalAuthor', 'username fullName profilePicture isVerified')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      message: 'Feed retrieved successfully',
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: posts.length
      },
      feedType: 'user_posts'
    });

  } catch (error) {
    console.error('Get feed error:', {
      message: error.message,
      stack: error.stack,
      userId: req.user ? req.user._id : 'unknown',
      query: req.query,
      feedType: req.query.feedType,
      page: req.query.page,
      limit: req.query.limit
    });
    res.status(500).json({
      message: 'Server error retrieving feed',
      code: 'FEED_ERROR'
    });
  }
};

exports.getPersonalizedFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20, feedType = 'fyp' } = req.query;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const Block = require('../models/Block');
    const blockedUserIds = await Block.getBlockedUserIds(userId);
    const blockerUserIds = await Block.getBlockerUserIds(userId);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());

    let posts = [];

    if (feedType === 'following') {
      const following = await Follow.find({ follower: userId }).select('following').lean();
      const followingIds = following.map(f => f.following.toString());
      // Combine following and user themselves, then subtract blocked users
      const authorIds = [...followingIds, userId.toString()].filter(id => !allBlockedIds.includes(id));

      posts = await Post.find({
        author: { $in: authorIds },
        postType: 'post',
        isDeleted: false,
        isArchived: false
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      posts = posts.map(post => ({
        ...post,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        savesCount: post.savesCount
      }));

    } else if (feedType === 'fyp') {
      console.log(`[DEBUG] FYP feed requested for user ${userId}, page ${page}, limit ${limit}`);

      try {
        posts = await Post.find({
          author: { $nin: allBlockedIds },
          postType: 'post',
          isDeleted: false,
          isArchived: false,
          visibility: 'public'
        })
        .populate('author', 'username fullName profilePicture isVerified location languagePreference')
        .lean()
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        posts = posts.map(post => ({
          ...post,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          savesCount: post.savesCount
        }));

        console.log(`[DEBUG] FYP posts returned: ${posts.length}`);
      } catch (queryError) {
        console.error('[DEBUG] FYP query error:', {
          message: queryError.message,
          stack: queryError.stack
        });
        throw queryError;
      }

    } else if (feedType === 'nearby') {
      posts = await Post.find({
        author: { $nin: allBlockedIds },
        postType: 'post',
        isDeleted: false,
        isArchived: false,
        'location.city': user.location.city
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      posts = posts.map(post => ({
        ...post,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        savesCount: post.savesCount
      }));
    }
    else if (feedType === 'explore') {
      posts = await Post.find({
        author: { $nin: allBlockedIds },
        postType: 'post',
        isDeleted: false,
        isArchived: false,
        visibility: 'public'
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      posts = posts.map(post => ({
        ...post,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        savesCount: post.savesCount
      }));
    } else if (feedType === 'trending') {
      posts = await Post.find({
        author: { $nin: allBlockedIds },
        isDeleted: false,
        isArchived: false,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .lean()
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      posts = posts.map(post => ({
        ...post,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        savesCount: post.savesCount
      }));
    }

    res.json({
      message: 'Feed retrieved successfully',
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: posts.length
      },
      feedType
    });

  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({
      message: 'Server error retrieving feed',
      code: 'FEED_ERROR'
    });
  }
};
