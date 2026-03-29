const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');

async function getFriendSuggestions(userId, limit = 10) {
  try {
    const [following, blocked, blockers] = await Promise.all([
      Follow.find({ follower: userId }).distinct('following'),
      Block.getBlockedUserIds(userId),
      Block.getBlockerUserIds(userId)
    ]);

    const excludeIds = [userId, ...following, ...blocked, ...blockers];

    const pool = await User.find({
      _id: { $nin: excludeIds },
      isActive: true,
      isBanned: false,
      isDeleted: false,
      followersCount: { $gt: 0 }
    })
      .select('username fullName profilePicture isVerified followersCount location interests')
      .limit(500)
      .lean();

    if (!pool.length) return { users: [], total: 0 };

    const totalWeight = pool.reduce((sum, u) => sum + (u.followersCount || 0), 0);

    const suggestions = [];
    const poolSize = pool.length;

    while (suggestions.length < Math.min(limit, poolSize)) {
      const currentPoolWeight = pool.reduce((sum, u) => sum + (u.followersCount || 0), 0);
      let threshold = Math.random() * currentPoolWeight;

      for (let i = 0; i < pool.length; i++) {
        threshold -= (pool[i].followersCount || 0);
        if (threshold <= 0) {
          const [selected] = pool.splice(i, 1);
          selected.suggestionScore = selected.followersCount / totalWeight;
          suggestions.push(selected);
          break;
        }
      }
    }

    console.log(`[suggestions] generated ${suggestions.length} pure suggestions for user: ${userId}`);

    return {
      users: suggestions,
      total: poolSize
    };

  } catch (error) {
    console.error('[suggestions] pure algorithm failed:', error.message);
    return { users: [], total: 0, error: 'Internal logic error' };
  }
}

module.exports = { getFriendSuggestions };

