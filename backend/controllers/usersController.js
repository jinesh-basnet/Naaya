const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Story = require('../models/Story');
const Follow = require('../models/Follow');

const RichGetRicherAlgorithm = require('../utils/friendSuggestionAlgorithm');

exports.getUserProfile = async (req, res) => {
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

    // Check if there is a block between the current user and this profile
    if (req.user) {
        const Block = require('../models/Block');
        const blockStatus = await Block.getBlockStatus(req.user._id, user._id);
        
        if (blockStatus.areBlocked) {
            // If they blocked me or I blocked them, we don't show the full profile
            return res.status(403).json({
                message: blockStatus.hasBlockedMe ? 'You have been blocked by this user' : 'You have blocked this user',
                code: 'BLOCK_RESTRICTION',
                user: {
                    _id: user._id,
                    username: user.username,
                    fullName: user.fullName,
                    profilePicture: user.profilePicture,
                    isBlocked: blockStatus.isBlocked,
                    hasBlockedMe: blockStatus.hasBlockedMe
                }
            });
        }

        const isFollowing = await Follow.exists({ follower: req.user._id, following: user._id });
        profile.isFollowing = !!isFollowing;

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
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = { ...req.body };

    if (updates['location[city]'] || updates['location[district]'] || updates['location[province]']) {
      updates.location = {
        city: updates['location[city]'] || '',
        district: updates['location[district]'] || '',
        province: updates['location[province]'] || ''
      };
      delete updates['location[city]'];
      delete updates['location[district]'];
      delete updates['location[province]'];
    }

    if (req.file) {
      updates.profilePicture = `/uploads/${req.file.filename}`;
    }

    const allowedFields = [
      'fullName', 'bio', 'location', 'interests', 'privacySettings', 'profilePicture', 'gender'
    ];

    const invalidFields = Object.keys(updates).filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: `Invalid fields: ${invalidFields.join(', ')}`,
        code: 'INVALID_UPDATE_FIELDS'
      });
    }

    if (updates.gender && !['male', 'female', 'other'].includes(updates.gender)) {
      return res.status(400).json({
        message: 'Invalid gender value',
        code: 'INVALID_GENDER'
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
      if (typeof updates.interests === 'string') {
        try {
          updates.interests = JSON.parse(updates.interests);
        } catch (e) {
          updates.interests = updates.interests.split(',').map(i => i.trim());
        }
      }

      if (Array.isArray(updates.interests)) {
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
    }

    if (typeof updates.privacySettings === 'string') {
      try {
        updates.privacySettings = JSON.parse(updates.privacySettings);
      } catch (e) {
      }
    }

    if (updates.privacySettings && typeof updates.privacySettings === 'object') {
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

    if (updates.profilePicture) {
      try {
        let pronoun = 'their';
        if (user.gender === 'male') pronoun = 'his';
        else if (user.gender === 'female') pronoun = 'her';

        const newPost = new Post({
          author: userId,
          content: `updated ${pronoun} profile picture.`,
          media: [{
            type: 'image',
            url: updates.profilePicture
          }],
          location: user.location,
          postType: 'post',
          visibility: updates.privacySettings?.profileVisibility || 'public'
        });
        await newPost.save();
      } catch (postError) {
        console.error('Error auto-creating profile update post:', postError);
      }
    }

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
};

exports.followUser = async (req, res) => {
  try {
    const userIdToFollow = req.params.userId;
    const currentUserId = req.user._id;

    if (userIdToFollow === currentUserId.toString()) {
      return res.status(400).json({
        message: 'You cannot follow yourself',
        code: 'FOLLOW_SELF_ERROR'
      });
    }

    const isAlreadyFollowing = await Follow.exists({ follower: currentUserId, following: userIdToFollow });

    if (isAlreadyFollowing) {
      return res.status(400).json({
        message: 'You are already following this user',
        code: 'ALREADY_FOLLOWING'
      });
    }

    const follow = new Follow({
      follower: currentUserId,
      following: userIdToFollow
    });
    await follow.save();


    await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(userIdToFollow, { $inc: { followersCount: 1 } });

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
    console.error('Follow user error:', error);
    res.status(500).json({
      message: 'Server error following user',
      code: 'FOLLOW_ERROR'
    });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const userIdToUnfollow = req.params.userId;
    const currentUserId = req.user._id;

    if (userIdToUnfollow === currentUserId.toString()) {
      return res.status(400).json({
        message: 'You cannot unfollow yourself',
        code: 'UNFOLLOW_SELF_ERROR'
      });
    }

    const follow = await Follow.findOneAndDelete({ follower: currentUserId, following: userIdToUnfollow });

    if (!follow) {
      return res.status(400).json({
        message: 'You are not following this user',
        code: 'NOT_FOLLOWING'
      });
    }


    await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(userIdToUnfollow, { $inc: { followersCount: -1 } });

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
    console.error('Unfollow user error:', error);
    res.status(500).json({
      message: 'Server error unfollowing user',
      code: 'UNFOLLOW_ERROR'
    });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q: query, page = 1, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        message: 'Search query must be at least 2 characters long',
        code: 'INVALID_SEARCH_QUERY'
      });
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    let allBlockedIds = [];
    if (req.user) {
        const Block = require('../models/Block');
        const blockedUserIds = await Block.getBlockedUserIds(req.user._id);
        const blockerUserIds = await Block.getBlockerUserIds(req.user._id);
        allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());
    }

    const users = await User.find({
      $or: [
        { username: { $regex: searchRegex } },
        { fullName: { $regex: searchRegex } }
      ],
      _id: { $nin: allBlockedIds },
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
        const isFollowing = await Follow.exists({ follower: req.user._id, following: user._id });
        userObj.isFollowing = !!isFollowing;

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
};

exports.getFollowers = async (req, res) => {
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

    // Get blocked users to filter them out
    let allBlockedIds = [];
    if (req.user) {
        const Block = require('../models/Block');
        const blockedUserIds = await Block.getBlockedUserIds(req.user._id);
        const blockerUserIds = await Block.getBlockerUserIds(req.user._id);
        allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());
    }

    const follows = await Follow.find({ following: user._id })
      .populate({
        path: 'follower',
        match: { _id: { $nin: allBlockedIds } },
        select: 'username fullName profilePicture isVerified bio'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(sanitizedLimit)
      .lean();

    const followersWithFollowStatus = follows
      .filter(f => f.follower) // Filter out blocked/null followers
      .map(f => {
        const followerObj = { ...f.follower };
        if (req.user) {
          followerObj.isFollowing = false;
        }
        return followerObj;
      });


    if (req.user) {
      const followingSet = new Set(
        (await Follow.find({ follower: req.user._id }).select('following').lean())
          .map(f => f.following.toString())
      );


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
      followersCount: null,
      fetchedFollowersCount: null
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
};

exports.getFollowing = async (req, res) => {
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

    // Get blocked users to filter them out
    let allBlockedIds = [];
    if (req.user) {
        const Block = require('../models/Block');
        const blockedUserIds = await Block.getBlockedUserIds(req.user._id);
        const blockerUserIds = await Block.getBlockerUserIds(req.user._id);
        allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());
    }

    const follows = await Follow.find({ follower: user._id })
      .populate({
        path: 'following',
        match: { _id: { $nin: allBlockedIds } },
        select: 'username fullName profilePicture isVerified bio'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(sanitizedLimit)
      .lean();

    const followingWithFollowStatus = follows
      .filter(f => f.following) // Filter out blocked/null followed users
      .map(f => {
        const followingObj = { ...f.following };
        if (req.user) {
          followingObj.isFollowing = false;
        }
        return followingObj;
      });


    if (req.user) {
      const followingSet = new Set(
        (await Follow.find({ follower: req.user._id }).select('following').lean())
          .map(f => f.following.toString())
      );


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
      userId: null,
      followingCount: null,
      fetchedFollowing: null
    };
    console.error('Error context:', safeContext);

    res.status(500).json({
      message: 'Server error retrieving following',
      code: 'FOLLOWING_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getSuggestions = async (req, res) => {
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
};

exports.updateKeys = async (req, res) => {
  try {
    const { publicKey, privateKeyEncrypted, salt } = req.body;
    const userId = req.user._id;

    if (!publicKey || !privateKeyEncrypted) {
      return res.status(400).json({ message: 'Public and private keys are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.encryption = {
      publicKey,
      privateKeyEncrypted,
      salt
    };

    await user.save();
    res.json({ message: 'Encryption keys updated successfully' });
  } catch (error) {
    console.error('Update keys error:', error);
    res.status(500).json({ message: 'Server error updating encryption keys' });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();

    const timestamp = Date.now();
    user.username = `deleted_user_${timestamp}`;
    user.email = `deleted_${timestamp}@deleted.com`;
    user.fullName = 'Deleted User';
    user.bio = '';
    user.profilePicture = '';
    user.password = `DELETED_${timestamp}_${Math.random()}`; // Scramble password
    user.refreshTokens = []; // Log out from all devices

    await user.save();

    const contentDeletedAt = new Date();

    await Post.updateMany(
      { author: userId },
      { isDeleted: true, deletedAt: contentDeletedAt }
    );

    await Reel.updateMany(
      { author: userId },
      { isDeleted: true, deletedAt: contentDeletedAt }
    );

    await Story.updateMany(
      { author: userId },
      { isDeleted: true, deletedAt: contentDeletedAt }
    );

    res.json({
      message: 'Account deleted successfully and all content has been hidden'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      message: 'Server error deleting account',
      code: 'ACCOUNT_DELETE_ERROR'
    });
  }
};
