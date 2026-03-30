const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');

class RichGetRicherAlgorithm {
  constructor() {
    this.name = 'Rich Get Richer / Preferential Attachment';
  }

  async getSuggestions(userId, limit = 10) {
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

      if (!pool.length) return { users: [], algorithm: this.name };

      const poolSize = pool.length;
      const suggestions = [];
      const tempPool = [...pool];

      while (suggestions.length < Math.min(limit, poolSize)) {
        const currentPoolWeight = tempPool.reduce((sum, u) => sum + (u.followersCount || 0) + 1, 0);

        if (currentPoolWeight === 0) {
          const randomIndex = Math.floor(Math.random() * tempPool.length);
          const [selected] = tempPool.splice(randomIndex, 1);
          suggestions.push(selected);
          continue;
        }

        let threshold = Math.random() * currentPoolWeight;
        let picked = false;

        for (let i = 0; i < tempPool.length; i++) {
          const weight = (tempPool[i].followersCount || 0) + 1;
          threshold -= weight;
          if (threshold <= 0) {
            const [selected] = tempPool.splice(i, 1);
            selected.probability = weight / currentPoolWeight;
            suggestions.push(selected);
            picked = true;
            break;
          }
        }

        if (!picked && tempPool.length > 0) {
          const [selected] = tempPool.splice(tempPool.length - 1, 1);
          suggestions.push(selected);
        }
      }

      suggestions.forEach(u => {
        u.isFollowing = false;
      });

      return {
        users: suggestions,
        total: poolSize,
        algorithm: this.name
      };

    } catch (error) {
      console.error('[RichGetRicher] suggestions failed:', error.message);
      return { users: [], total: 0, error: 'Internal logic error', algorithm: this.name };
    }
  }
}

module.exports = RichGetRicherAlgorithm;

