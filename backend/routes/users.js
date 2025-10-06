const express = require('express');
const User = require('../models/User');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

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
      profile.isFollowing = user.followers.some(id => id.equals(req.user._id));
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
  try {
    const userIdToFollow = req.params.userId;
    const currentUserId = req.user._id;

    if (userIdToFollow === currentUserId.toString()) {
      return res.status(400).json({
        message: 'You cannot follow yourself',
        code: 'FOLLOW_SELF_ERROR'
      });
    }

    const userToFollow = await User.findById(userIdToFollow);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow) {
      return res.status(404).json({
        message: 'User to follow not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (userToFollow.followers.some(id => id.equals(currentUserId))) {
      return res.status(400).json({
        message: 'You are already following this user',
        code: 'ALREADY_FOLLOWING'
      });
    }

    userToFollow.followers.push(currentUserId);
    currentUser.following.push(userIdToFollow);

    await userToFollow.save();
    await currentUser.save();

    global.io.to(`user:${userIdToFollow}`).emit('user_followed', {
      follower: {
        _id: currentUserId,
        username: currentUser.username,
        fullName: currentUser.fullName,
        profilePicture: currentUser.profilePicture
      },
      followed: {
        _id: userIdToFollow,
        followersCount: userToFollow.followers.length
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
        followersCount: userToFollow.followers.length
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
    console.error('Follow user error:', error);
    res.status(500).json({
      message: 'Server error following user',
      code: 'FOLLOW_ERROR'
    });
  }
});

// @route   POST /api/users/:userId/unfollow
// @desc    Unfollow a user
// @access  Private
router.post('/:userId/unfollow', authenticateToken, async (req, res) => {
  try {
    const userIdToUnfollow = req.params.userId;
    const currentUserId = req.user._id;

    if (userIdToUnfollow === currentUserId.toString()) {
      return res.status(400).json({
        message: 'You cannot unfollow yourself',
        code: 'UNFOLLOW_SELF_ERROR'
      });
    }

    const userToUnfollow = await User.findById(userIdToUnfollow);
    const currentUser = await User.findById(currentUserId);

    if (!userToUnfollow) {
      return res.status(404).json({
        message: 'User to unfollow not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!userToUnfollow.followers.some(id => id.equals(currentUserId))) {
      return res.status(400).json({
        message: 'You are not following this user',
        code: 'NOT_FOLLOWING'
      });
    }

    userToUnfollow.followers.pull(currentUserId);
    currentUser.following.pull(userIdToUnfollow);

    await userToUnfollow.save();
    await currentUser.save();

    global.io.to(`user:${userIdToUnfollow}`).emit('user_unfollowed', {
      unfollower: {
        _id: currentUserId,
        username: currentUser.username,
        fullName: currentUser.fullName,
        profilePicture: currentUser.profilePicture
      },
      unfollowed: {
        _id: userIdToUnfollow,
        followersCount: userToUnfollow.followers.length
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
        followersCount: userToUnfollow.followers.length
      }
    });

    res.json({
      message: 'User unfollowed successfully'
    });

  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      message: 'Server error unfollowing user',
      code: 'UNFOLLOW_ERROR'
    });
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
    .sort({ followers: -1, createdAt: -1 }); 

    const total = await User.countDocuments({
      $or: [
        { username: { $regex: searchRegex } },
        { fullName: { $regex: searchRegex } }
      ],
      isDeleted: false
    });

    const usersWithFollowStatus = users.map(user => {
      const userObj = user.toObject();
      if (req.user) {
        userObj.isFollowing = user.followers.includes(req.user._id);
      }
      return userObj;
    });

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
// @access  Private
router.get('/followers/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findOne({ username }).select('followers');
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const followers = await User.find({ _id: { $in: user.followers } })
      .select('username fullName profilePicture isVerified bio')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const followersWithFollowStatus = await Promise.all(
      followers.map(async (follower) => {
        const followerObj = follower.toObject();
        followerObj.isFollowing = follower.followers.includes(req.user._id);
        return followerObj;
      })
    );

    res.json({
      message: 'Followers retrieved successfully',
      users: followersWithFollowStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: user.followers.length,
        pages: Math.ceil(user.followers.length / limit)
      }
    });

  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      message: 'Server error retrieving followers',
      code: 'FOLLOWERS_ERROR'
    });
  }
});

// @route   GET /api/users/following/:username
// @desc    Get users followed by a user
// @access  Private
router.get('/following/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findOne({ username }).select('following');
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const following = await User.find({ _id: { $in: user.following } })
      .select('username fullName profilePicture isVerified bio')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const followingWithFollowStatus = await Promise.all(
      following.map(async (followedUser) => {
        const followedObj = followedUser.toObject();
        followedObj.isFollowing = followedUser.followers.includes(req.user._id);
        return followedObj;
      })
    );

    res.json({
      message: 'Following retrieved successfully',
      users: followingWithFollowStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: user.following.length,
        pages: Math.ceil(user.following.length / limit)
      }
    });

  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      message: 'Server error retrieving following',
      code: 'FOLLOWING_ERROR'
    });
  }
});

module.exports = router;
