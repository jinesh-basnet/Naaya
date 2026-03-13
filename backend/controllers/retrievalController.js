const Post = require('../models/Post');
const User = require('../models/User');
const BookmarkCollection = require('../models/BookmarkCollection');

exports.getSavedPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const defaultCollection = await BookmarkCollection.findOne({
      user: userId,
      name: 'Saved Posts'
    });

    if (!defaultCollection || defaultCollection.posts.length === 0) {
      return res.json({
        message: 'Saved posts retrieved successfully',
        posts: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    }

    const total = defaultCollection.posts.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const postIdsPage = defaultCollection.posts.slice(skip, skip + parseInt(limit));

    const posts = await Post.find({
      _id: { $in: postIdsPage },
      isDeleted: false,
      isArchived: false
    })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference');

    // Block Feature Integration: Filter out posts from blocked users
    const Block = require('../models/Block');
    const blockedUserIds = await Block.getBlockedUserIds(req.user._id);
    const blockerUserIds = await Block.getBlockerUserIds(req.user._id);
    const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());

    const filteredPosts = posts.filter(post => 
      post.author && !allBlockedIds.includes(post.author._id?.toString())
    );

    const postsMap = new Map(filteredPosts.map(p => [p._id.toString(), p]));
    const sortedPosts = postIdsPage
      .map(id => postsMap.get(id.toString()))
      .filter(Boolean);

    res.json({
      message: 'Saved posts retrieved successfully',
      posts: sortedPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({
      message: 'Server error retrieving saved posts',
      code: 'GET_SAVED_POSTS_ERROR'
    });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Block check
    if (req.user) {
      const Block = require('../models/Block');
      const isBlocked = await Block.areBlocked(req.user._id, user._id);
      if (isBlocked) {
        return res.status(403).json({
          message: 'Access denied due to blocking restrictions',
          code: 'BLOCK_RESTRICTION'
        });
      }
    }

    const posts = await Post.find({
      author: user._id,
      isDeleted: false,
      isArchived: false
    })
      .populate('author', 'username fullName profilePicture isVerified location languagePreference')
      .populate('comments.author', 'username fullName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      message: 'User posts retrieved successfully',
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: posts.length
      }
    });

  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      message: 'Server error retrieving user posts',
      code: 'GET_USER_POSTS_ERROR'
    });
  }
};

exports.searchPosts = async (req, res) => {
  try {
    const { q: query, page = 1, limit = 20 } = req.query;
    console.log('Search posts called by user:', req.user ? req.user._id : null, 'query:', query, 'page:', page, 'limit:', limit);

    if (!query || query.trim().length < 1) {
      return res.status(400).json({
        message: 'Search query must be at least 1 character long',
        code: 'INVALID_SEARCH_QUERY'
      });
    }

    const escapeRegex = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const searchRegex = new RegExp(escapeRegex(query.trim()), 'i');

    let allBlockedIds = [];
    if (req.user) {
        const Block = require('../models/Block');
        const blockedUserIds = await Block.getBlockedUserIds(req.user._id);
        const blockerUserIds = await Block.getBlockerUserIds(req.user._id);
        allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());
    }

    const posts = await Post.find({
      $or: [
        { content: { $regex: searchRegex } },
        { 'author.username': { $regex: searchRegex } },
        { 'author.fullName': { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
        { hashtags: { $in: [searchRegex] } }
      ],
      author: { $nin: allBlockedIds },
      isDeleted: false,
      isArchived: false
    })
      .populate('author', 'username fullName profilePicture isVerified')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments({
      $or: [
        { content: { $regex: searchRegex } },
        { 'author.username': { $regex: searchRegex } },
        { 'author.fullName': { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
        { hashtags: { $in: [searchRegex] } }
      ],
      isDeleted: false,
      isArchived: false
    });

    res.json({
      message: 'Posts searched successfully',
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Search posts error:', error);
    res.status(500).json({
      message: 'Server error searching posts',
      code: 'SEARCH_POSTS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getPost = async (req, res) => {
  try {
    const { postId } = req.params;
    console.log('GET /api/posts/:postId called with postId:', postId);

    const post = await Post.findOne({
      _id: postId,
      isDeleted: false,
      isArchived: false
    })
      .populate('author', 'username fullName profilePicture isVerified')
      .populate({
        path: 'comments.author',
        select: 'username fullName profilePicture isVerified'
      })
      .populate({
        path: 'comments.replies.author',
        select: 'username fullName profilePicture isVerified'
      })
      .populate({
        path: 'comments.replies.replies.author',
        select: 'username fullName profilePicture isVerified'
      });

    console.log('Post found:', !!post);
    if (post) {
      console.log('Post details:', { _id: post._id, isDeleted: post.isDeleted, isArchived: post.isArchived });
    } else {
      console.log('Post not found in database');
    }

    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    // Block check
    if (req.user) {
      const Block = require('../models/Block');
      const isBlocked = await Block.areBlocked(req.user._id, post.author._id);
      if (isBlocked) {
        return res.status(403).json({
          message: 'Access denied due to blocking restrictions',
          code: 'BLOCK_RESTRICTION'
        });
      }
    }

    if (req.user && !post.views.some(view => view.user.toString() === req.user._id.toString())) {
      post.views.push({ user: req.user._id });
      await post.save();
    }

    res.json({
      message: 'Post retrieved successfully',
      post
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      message: 'Server error retrieving post',
      code: 'GET_POST_ERROR'
    });
  }
};
