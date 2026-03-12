const User = require('../models/User');
const Follow = require('../models/Follow');
const UserInteraction = require('../models/UserInteraction');

class RichGetRicherAlgorithm {
  async getSuggestions(currentUserId, limit = 10) {
    try {
      const currentUser = await User.findById(currentUserId).select('interests location followersCount followingCount lastActive').lean();
      
      const followingDocs = await Follow.find({ follower: currentUserId }).select('following').lean();
      const followingIds = followingDocs.map(f => f.following.toString());
      
      const Block = require('../models/Block');
      const blockedUserIds = await Block.getBlockedUserIds(currentUserId);
      const blockerUserIds = await Block.getBlockerUserIds(currentUserId);
      const allBlockedIds = [...new Set([...blockedUserIds, ...blockerUserIds])].map(id => id.toString());

      const excludeIds = [currentUserId.toString(), ...followingIds, ...allBlockedIds];

      const friendsDocs = await Follow.find({ follower: { $in: followingIds } })
        .select('following')
        .lean();

      const mutualFrequency = {};
      friendsDocs.forEach(doc => {
        if (doc.following) {
          const idStr = doc.following.toString();
          if (!excludeIds.includes(idStr)) {
            mutualFrequency[idStr] = (mutualFrequency[idStr] || 0) + 1;
          }
        }
      });

      const mutualIds = Object.keys(mutualFrequency);

      const userPreferences = await UserInteraction.getUserPreferences(currentUserId);
      const preferredTags = userPreferences.tags.slice(0, 10).map(t => t.tag);
      const preferredContentTypes = Object.entries(userPreferences.contentType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([type]) => type);

      const [mutualCandidates, popularCandidates] = await Promise.all([
        User.find({
          _id: { $in: mutualIds },
          isActive: true,
          isBanned: false,
          isDeleted: false
        })
          .select('username fullName profilePicture isVerified followersCount followingCount interests location lastActive createdAt')
          .limit(100)
          .lean(),

        User.find({
          _id: { $nin: [...excludeIds, ...mutualIds] },
          isActive: true,
          isBanned: false,
          isDeleted: false,
          followersCount: { $gte: 1 },
          lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
          .select('username fullName profilePicture isVerified followersCount followingCount interests location lastActive createdAt')
          .sort({ followersCount: -1 })
          .limit(200)
          .lean()
      ]);

      const candidates = [...mutualCandidates, ...popularCandidates];

      const scoredCandidates = await Promise.all(
        candidates.map(async (user) => {
          let score = 0;
          const factors = [];

          const mutualCount = mutualFrequency[user._id.toString()] || 0;
          const mutualScore = Math.min(10, mutualCount * 2);
          score += mutualScore * 0.30;
          if (mutualScore > 0) factors.push(`mutuals:${mutualCount}`);

          const followerScore = Math.log(user.followersCount + 1) * 10;
          score += followerScore * 0.30;
          factors.push(`followers:${followerScore.toFixed(1)}`);

          const daysSinceActive = (Date.now() - new Date(user.lastActive)) / (1000 * 60 * 60 * 24);
          const activityScore = Math.max(0, 10 - daysSinceActive);
          score += activityScore * 0.15;
          factors.push(`activity:${activityScore.toFixed(1)}`);

          const engagementRatio = user.followingCount > 0 ? user.followersCount / user.followingCount : 0;
          const ratioScore = Math.min(10, engagementRatio * 2);
          score += ratioScore * 0.10;
          factors.push(`ratio:${ratioScore.toFixed(1)}`);

          const sharedInterests = user.interests?.filter(interest =>
            currentUser.interests?.includes(interest)
          ).length || 0;
          const interestScore = sharedInterests * 2;
          score += interestScore * 0.10;
          if (interestScore > 0) factors.push(`interests:${interestScore.toFixed(1)}`);

          let locationScore = 0;
          if (currentUser.location?.city && user.location?.city === currentUser.location.city) {
            locationScore = 5;
          } else if (currentUser.location?.district && user.location?.district === currentUser.location.district) {
            locationScore = 3;
          } else if (currentUser.location?.province && user.location?.province === currentUser.location.province) {
            locationScore = 1;
          }
          score += locationScore * 0.05;
          if (locationScore > 0) factors.push(`location:${locationScore.toFixed(1)}`);

          return {
            ...user,
            score: Math.round(score * 100) / 100,
            factors: factors.join(', '),
            mutualConnections: mutualCount
          };
        })
      );

      const topSuggestions = scoredCandidates
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      const suggestions = topSuggestions.map(({ score, factors, ...user }) => user);

      return {
        message: 'Advanced rich-get-richer suggestions retrieved successfully',
        users: suggestions,
        algorithm: 'rich_get_richer_advanced_v2',
        factors: [
          'mutual_connections',
          'follower_count',
          'recent_activity',
          'engagement_ratio',
          'shared_interests',
          'geographic_proximity'
        ],
        metadata: {
          totalSuggestions: suggestions.length,
          totalCandidates: candidates.length,
          explanation: 'Advanced preferential attachment algorithm considering mutual connections and engagement factors',
          scoring_weights: {
            mutual_connections: '30%',
            followers: '30%',
            activity: '15%',
            engagement_ratio: '10%',
            shared_interests: '10%',
            location: '5%'
          }
        }
      };

    } catch (error) {
      console.error('Rich-get-richer algorithm error:', error);
      throw new Error('Failed to generate suggestions');
    }
  }
}

module.exports = RichGetRicherAlgorithm;
