const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Following = require('../models/Following');
const Followers = require('../models/Followers');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const RichGetRicherAlgorithm = require('../utils/friendSuggestionAlgorithm');

const router = express.Router();

// @route   GET /api/users/profile/:username
// @desc    Get user profile by username
// @access  Public
router.get('/profile/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select('-password -email -phone');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const profile = user.toObject();

    if (req.user) {
      const followingDoc = await Following.findOne({ user: req.user._id }).select('following').lean();
      profile.isFollowing = followingDoc ? followingDoc.following.includes(user._id) : false;
    }

    res.json({
      message: 'User profile retrieved successfully',
      user: profile
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      message: 'Server error retrieving user profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    const allowedFields = [
      'fullName', 'bio', 'location', 'interests', 'privacySettings'
    ];

    const invalidFields = Object.keys(updates).filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: `Invalid fields: ${invalidFields.join(', ')}`,
        code: 'INVALID_UPDATE_FIELDS'
      });
    }

    if (updates.bio && updates.bio.length > 150) {
      return res.status(400).json({
        message: 'Bio must be less than 150 characters',
        code: 'BIO_TOO_LONG'
      });
    }

    if (updates.fullName && updates.fullName.length > 50) {
      return res.status(400).json({
        message: 'Full name must be less than 50 characters',
        code: 'NAME_TOO_LONG'
      });
    }

    if (updates.location) {
      const { city, district, province } = updates.location;
      if (city && city.length > 50) {
        return res.status(400).json({
          message: 'City name must be less than 50 characters',
          code: 'CITY_TOO_LONG'
        });
      }
      if (district && district.length > 50) {
        return res.status(400).json({
          message: 'District name must be less than 50 characters',
          code: 'DISTRICT_TOO_LONG'
        });
      }
      if (province && province.length > 50) {
        return res.status(400).json({
          message: 'Province name must be less than 50 characters',
          code: 'PROVINCE_TOO_LONG'
        });
      }
    }

    if (updates.interests) {
      const validInterests = [
        'technology', 'music', 'sports', 'food', 'travel', 'fashion',
        'photography', 'art', 'education', 'news', 'entertainment',
        'health', 'fitness', 'gaming', 'books', 'movies', 'politics',
        'religion', 'culture', 'festivals', 'tourism', 'agriculture'
      ];

      const invalidInterests = updates.interests.filter(interest =>
        !validInterests.includes(interest)
      );

      if (invalidInterests.length > 0) {
        return res.status(400).json({
          message: `Invalid interests: ${invalidInterests.join(', ')}`,
          code: 'INVALID_INTERESTS'
        });
      }
    }

    if (updates.privacySettings) {
      const { profileVisibility, showOnlineStatus, allowMessagesFrom } = updates.privacySettings;

      const validVisibilities = ['public', 'followers', 'private'];
      const validMessageSettings = ['everyone', 'followers', 'none'];

      if (profileVisibility && !validVisibilities.includes(profileVisibility)) {
        return res.status(400).json({
          message: 'Invalid profile visibility setting',
          code: 'INVALID_PROFILE_VISIBILITY'
        });
      }

      if (allowMessagesFrom && !validMessageSettings.includes(allowMessagesFrom)) {
        return res.status(400).json({
          message: 'Invalid message setting',
          code: 'INVALID_MESSAGE_SETTING'
        });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field)) {
        user[field] = updates[field];
      }
    });

    await user.save();

    const updatedUser = await User.findById(userId).select('-password -email -phone');

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Server error updating profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

// @route   POST /api/users/:userId/follow
// @desc    Follow a user
// @access  Private
router.post('/:userId/follow', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userIdToFollow = req.params.userId;
    const currentUserId = req.user._id;

    if (userIdToFollow === currentUserId.toString()) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'You cannot follow yourself',
        code: 'FOLLOW_SELF_ERROR'
      });
    }

    // Check if already following using Following model
    const followingDoc = await Following.findOne({ user: currentUserId }).select('following').session(session);
    const isAlreadyFollowing = followingDoc && followingDoc.following.includes(userIdToFollow);

    if (isAlreadyFollowing) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'You are already following this user',
        code: 'ALREADY_FOLLOWING'
      });
    }

    // Update Following model
    await Following.findOneAndUpdate(
      { user: currentUserId },
      { $addToSet: { following: userIdToFollow } },
      { upsert: true, session }
    );

    // Update Followers model
    await Followers.findOneAndUpdate(
      { user: userIdToFollow },
      { $addToSet: { followers: currentUserId } },
      { upsert: true, session }
    );

    // Update user counts
    await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: 1 } }, { session });
    await User.findByIdAndUpdate(userIdToFollow, { $inc: { followersCount: 1 } }, { session });

    await session.commitTransaction();

    const [currentUser, userToFollow] = await Promise.all([
      User.findById(currentUserId).select('username fullName profilePicture'),
      User.findById(userIdToFollow).select('followersCount')
    ]);

    global.io.to(`user:${userIdToFollow}`).emit('user_followed', {
      follower: {
        _id: currentUserId,
        username: currentUser.username,
        fullName: currentUser.fullName,
        profilePicture: currentUser.profilePicture
      },
      followed: {
        _id: userIdToFollow,
        followersCount: userToFollow.followersCount
      }
    });

    global.io.to(`user:${currentUserId}`).emit('user_followed', {
      follower: {
        _id: currentUserId,
        username: currentUser.username,
        fullName: currentUser.fullName,
        profilePicture: currentUser.profilePicture
      },
      followed: {
        _id: userIdToFollow,
        followersCount: userToFollow.followersCount
      }
    });

    try {
      await global.notificationService.createFollowNotification(currentUserId, userIdToFollow);
    } catch (error) {
      console.error('Error creating follow notification:', error);
    }

    res.json({
      message: 'User followed successfully'
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Follow user error:', error);
    res.status(500).json({
      message: 'Server error following user',
      code: 'FOLLOW_ERROR'
    });
  } finally {
    session.endSession();
  }
});

// @route   POST /api/users/:userId/unfollow
// @desc    Unfollow a user
// @access  Private
router.post('/:userId/unfollow', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userIdToUnfollow = req.params.userId;
    const currentUserId = req.user._id;

    if (userIdToUnfollow === currentUserId.toString()) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'You cannot unfollow yourself',
        code: 'UNFOLLOW_SELF_ERROR'
      });
    }

    // Check if following using Following model
    const followingDoc = await Following.findOne({ user: currentUserId }).select('following').session(session);
    const isFollowing = followingDoc && followingDoc.following.includes(userIdToUnfollow);

    if (!isFollowing) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'You are not following this user',
        code: 'NOT_FOLLOWING'
      });
    }

    // Update Following model
    await Following.findOneAndUpdate(
      { user: currentUserId },
      { $pull: { following: userIdToUnfollow } },
      { session }
    );

    // Update Followers model
    await Followers.findOneAndUpdate(
      { user: userIdToUnfollow },
      { $pull: { followers: currentUserId } },
      { session }
    );

    // Update user counts
    await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: -1 } }, { session });
    await User.findByIdAndUpdate(userIdToUnfollow, { $inc: { followersCount: -1 } }, { session });

    await session.commitTransaction();

    const [currentUser, userToUnfollow] = await Promise.all([
      User.findById(currentUserId).select('username fullName profilePicture'),
      User.findById(userIdToUnfollow).select('followersCount')
    ]);

    global.io.to(`user:${userIdToUnfollow}`).emit('user_unfollowed', {
      unfollower: {
        _id: currentUserId,
        username: currentUser.username,
        fullName: currentUser.fullName,
        profilePicture: currentUser.profilePicture
      },
      unfollowed: {
        _id: userIdToUnfollow,
        followersCount: userToUnfollow.followersCount
      }
    });

    global.io.to(`user:${currentUserId}`).emit('user_unfollowed', {
      unfollower: {
        _id: currentUserId,
        username: currentUser.username,
        fullName: currentUser.fullName,
        profilePicture: currentUser.profilePicture
      },
      unfollowed: {
        _id: userIdToUnfollow,
        followersCount: userToUnfollow.followersCount
      }
    });

    res.json({
      message: 'User unfollowed successfully'
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Unfollow user error:', error);
    res.status(500).json({
      message: 'Server error unfollowing user',
      code: 'UNFOLLOW_ERROR'
    });
  } finally {
    session.endSession();
  }
});

// @route   GET /api/users/search
// @desc    Search users by username or fullName
// @access  Private
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, page = 1, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        message: 'Search query must be at least 2 characters long',
        code: 'INVALID_SEARCH_QUERY'
      });
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    const users = await User.find({
      $or: [
        { username: { $regex: searchRegex } },
        { fullName: { $regex: searchRegex } }
      ],
      isDeleted: false
    })
    .select('username fullName profilePicture isVerified bio location followers')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ followersCount: -1, createdAt: -1 });

    const total = await User.countDocuments({
      $or: [
        { username: { $regex: searchRegex } },
        { fullName: { $regex: searchRegex } }
      ],
      isDeleted: false
    });

    const usersWithFollowStatus = await Promise.all(users.map(async user => {
      const userObj = user.toObject();
      if (req.user) {
        const followingDoc = await Following.findOne({ user: req.user._id }).select('following').lean();
        userObj.isFollowing = followingDoc ? followingDoc.following.includes(user._id) : false;
      }
      return userObj;
    }));

    res.json({
      message: 'Users searched successfully',
      users: usersWithFollowStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      message: 'Server error searching users',
      code: 'SEARCH_USERS_ERROR'
    });
  }
});

// @route   GET /api/users/followers/:username
// @desc    Get followers of a user
// @access  Public
router.get('/followers/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    let user = await User.findOne({ username: new RegExp('^' + username + '$', 'i'), isDeleted: false })
      .select('_id followersCount')
      .lean();

    if (!user && /^[0-9a-fA-F]{24}$/.test(username)) {
      user = await User.findById(username).select('_id followersCount').lean();
    }

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.followersCount === 0) {
      return res.json({
        message: 'Followers retrieved successfully',
        users: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    }

    const sanitizedPage = Math.max(1, parseInt(page) || 1);
    const sanitizedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const followersDoc = await Followers.findOne({ user: user._id }).select('followers').populate({
      path: 'followers',
      select: 'username fullName profilePicture isVerified bio',
      options: { limit: sanitizedLimit, skip: skip, sort: { createdAt: -1 } }
    }).lean();

    const followersWithFollowStatus = (followersDoc?.followers || []).map(follower => {
      const followerObj = { ...follower };
      if (req.user) {
        followerObj.isFollowing = false;
      }
      return followerObj;
    });

    if (req.user) {
      const followingDoc = await Following.findOne({ user: req.user._id }).select('following').lean();
      const followingSet = new Set(followingDoc ? followingDoc.following.map(id => id.toString()) : []);

      followersWithFollowStatus.forEach(follower => {
        follower.isFollowing = followingSet.has(follower._id.toString());
      });
    }

    res.json({
      message: 'Followers retrieved successfully',
      users: followersWithFollowStatus,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total: user.followersCount,
        pages: Math.ceil(user.followersCount / sanitizedLimit)
      }
    });

  } catch (error) {
    console.error('Get followers error:', error);
    console.error('Error stack:', error && error.stack ? error.stack : error);
    const safeContext = {
      username: typeof username !== 'undefined' ? username : null,
      page: typeof page !== 'undefined' ? page : null,
      limit: typeof limit !== 'undefined' ? limit : null,
      requestUser: req.user ? req.user._id : null,
      followersCount: user ? user.followersCount : null,
      fetchedFollowersCount: (typeof follows !== 'undefined' && Array.isArray(follows)) ? follows.length : null
    };
    console.error('Error context:', safeContext);

    res.status(500).json({
      message: 'Server error retrieving followers',
      code: 'FOLLOWERS_ERROR',
      details: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        type: error.name,
        path: error.path
      } : undefined
    });
  }
});

// @route   GET /api/users/following/:username
// @desc    Get users followed by a user
// @access  Public
router.get('/following/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    let user = await User.findOne({ username: new RegExp('^' + username + '$', 'i'), isDeleted: false })
      .select('_id followingCount')
      .lean();
    if (!user && /^[0-9a-fA-F]{24}$/.test(username)) {
      user = await User.findById(username).select('_id followingCount').lean();
    }
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.followingCount === 0) {
      return res.json({
        message: 'Following retrieved successfully',
        users: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    }

    const sanitizedPage = Math.max(1, parseInt(page) || 1);
    const sanitizedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const followingDoc = await Following.findOne({ user: user._id }).select('following').populate({
      path: 'following',
      select: 'username fullName profilePicture isVerified bio',
      options: { limit: sanitizedLimit, skip: skip, sort: { createdAt: -1 } }
    }).lean();

    const followingWithFollowStatus = (followingDoc?.following || []).map(followed => {
      const followingObj = { ...followed };
      if (req.user) {
        followingObj.isFollowing = false;
      }
      return followingObj;
    });

    if (req.user) {
      const followingDoc = await Following.findOne({ user: req.user._id }).select('following').lean();
      const followingSet = new Set(followingDoc ? followingDoc.following.map(id => id.toString()) : []);

      followingWithFollowStatus.forEach(followed => {
        followed.isFollowing = followingSet.has(followed._id.toString());
      });
    }

    res.json({
      message: 'Following retrieved successfully',
      users: followingWithFollowStatus,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total: user.followingCount,
        pages: Math.ceil(user.followingCount / sanitizedLimit)
      }
    });

  } catch (error) {
    console.error('Get following error:', error);
    console.error('Error stack:', error && error.stack ? error.stack : error);
    const safeContext = {
      username: typeof username !== 'undefined' ? username : null,
      page: typeof page !== 'undefined' ? page : null,
      limit: typeof limit !== 'undefined' ? limit : null,
      userId: user ? user._id : null,
      followingCount: user ? user.followingCount : null,
      fetchedFollowing: (typeof follows !== 'undefined' && Array.isArray(follows)) ? follows.length : null
    };
    console.error('Error context:', safeContext);

    res.status(500).json({
      message: 'Server error retrieving following',
      code: 'FOLLOWING_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/suggestions
// @desc    Get user suggestions
// @access  Private
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const currentUserId = req.user._id;

    const suggestionAlgorithm = new RichGetRicherAlgorithm();
    const suggestions = await suggestionAlgorithm.getSuggestions(currentUserId, parseInt(limit));

    res.json(suggestions);
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({
      message: 'Server error retrieving suggestions',
      code: 'SUGGESTIONS_ERROR'
    });
  }
});

module.exports = router;
