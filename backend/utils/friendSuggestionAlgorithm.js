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
      isDeleted: false
    })
      .select('username fullName profilePicture isVerified followersCount location interests')
      .limit(500)
      .lean();

    if (!pool.length) return { users: [], total: 0 };

    const totalWeight = pool.reduce((sum, u) => sum + (u.followersCount || 0), 0);
    const poolSize = pool.length;
    const suggestions = [];

    while (suggestions.length < Math.min(limit, poolSize)) {
      const currentPoolWeight = pool.reduce((sum, u) => sum + (u.followersCount || 0), 0);

      if (currentPoolWeight === 0) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        const [selected] = pool.splice(randomIndex, 1);
        selected.suggestionScore = 0;
        suggestions.push(selected);
        continue;
      }

      let threshold = Math.random() * currentPoolWeight;
      let picked = false;

      for (let i = 0; i < pool.length; i++) {
        threshold -= (pool[i].followersCount || 0);
        if (threshold <= 0) {
          const [selected] = pool.splice(i, 1);
          selected.suggestionScore = selected.followersCount / totalWeight;
          suggestions.push(selected);
          picked = true;
          break;
        }
      }

      if (!picked && pool.length > 0) {
        const [selected] = pool.splice(pool.length - 1, 1);
        selected.suggestionScore = selected.followersCount / (totalWeight || 1);
        suggestions.push(selected);
      }
    }

    const followingSet = new Set(following.map(id => id.toString()));
    suggestions.forEach(u => {
      u.isFollowing = followingSet.has(u._id.toString());
    });

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
