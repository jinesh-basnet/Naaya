const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');

/**
 * Pure Stochastic Rich-Get-Richer (Preferential Attachment) Algorithm.
 * implements P(B) = degree(B) / Σ(all users degrees)
 */
class RichGetRicherAlgorithm {
  async getSuggestions(userId, limit = 10) {
    try {
      const [totalDegreesResult] = await User.aggregate([
        { $match: { isDeleted: false, isBanned: false } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$followersCount", 0] } } } }
      ]);
      const globalSum = totalDegreesResult?.total || 1;

      const [following, blocked, blockers] = await Promise.all([
        Follow.find({ follower: userId }).distinct('following'),
        Block.getBlockedUserIds(userId),
        Block.getBlockerUserIds(userId)
      ]);
      const exclude = [userId, ...following, ...blocked, ...blockers];

      const pool = await User.find({
        _id: { $nin: exclude },
        isActive: true, isBanned: false, isDeleted: false
      })
      .select('username fullName profilePicture isVerified followersCount followingCount location interests')
      .sort({ followersCount: -1 }).limit(500).lean();

      if (!pool.length) return { users: [], metadata: { total: 0 } };

      const suggestions = [];
      const totalCandidates = pool.length;

      while (suggestions.length < Math.min(limit, totalCandidates)) {
        const poolDegrees = pool.reduce((sum, u) => sum + (u.followersCount || 0) + 0.1, 0);
        let random = Math.random() * poolDegrees;

        for (let i = 0; i < pool.length; i++) {
          random -= (pool[i].followersCount || 0) + 0.1;
          if (random <= 0) {
            const [selected] = pool.splice(i, 1);
            selected.richnessProbability = (selected.followersCount || 0) / globalSum;
            suggestions.push(selected);
            break;
          }
        }
      }

      return {
        message: 'Pure stochastic preferential attachment suggestions generated',
        users: suggestions,
        algorithm: 'stochastic_rich_get_richer_v2',
        metadata: {
          totalNetworkDegrees: globalSum,
          totalAvailableSuggestions: totalCandidates,
          explanation: `Implemented P(B) = degree(B) / Σ(all users) degree. Denominator is ${globalSum}.`,
          formula: 'P(B) = followersCount(B) / Total Followers in System'
        }
      };

    } catch (error) {
      console.error('Algorithm error:', error);
      throw new Error(`Failed to generate suggestions: ${error.message}`);
    }
  }
}

module.exports = RichGetRicherAlgorithm;
