const User = require('../models/User');
const Following = require('../models/Following');
const UserInteraction = require('../models/UserInteraction');

class RichGetRicherAlgorithm {
  /**
   * Implements a sophisticated rich-get-richer algorithm for friend suggestions.
   * Combines multiple factors to identify users who are likely to gain more followers,
   * creating a self-reinforcing popularity cycle.
   *
   * Scoring factors:
   * - Mutual Connections (Friends of Friends) - New Primary Factor
   * - Follower count (base popularity)
   * - Recent activity (engagement momentum)
   * - Interaction history (personalized relevance)
   * - Shared interests (content alignment)
   * - Geographic proximity (local relevance)
   *
   * @param {string} currentUserId
   * @param {number} limit
   * @returns {Object}
   */
  async getSuggestions(currentUserId, limit = 10) {
    try {
      // Get current user's profile and following list
      const [currentUser, followingDoc] = await Promise.all([
        User.findById(currentUserId).select('interests location followersCount followingCount lastActive').lean(),
        Following.findOne({ user: currentUserId }).select('following').lean()
      ]);

      const followingIds = followingDoc ? followingDoc.following.map(id => id.toString()) : [];
      const excludeIds = [currentUserId.toString(), ...followingIds];

      // 1. Get mutual friends (Friends of Friends)
      // Find all users that the current user follows
      const friendsDocs = await Following.find({ user: { $in: followingIds } })
        .select('following')
        .lean();

      // Calculate mutual friend frequency
      const mutualFrequency = {};
      friendsDocs.forEach(doc => {
        if (doc.following && Array.isArray(doc.following)) {
          doc.following.forEach(friendId => {
            const idStr = friendId.toString();
            // Only count if not already followed and not self
            if (!excludeIds.includes(idStr)) {
              mutualFrequency[idStr] = (mutualFrequency[idStr] || 0) + 1;
            }
          });
        }
      });

      // Get IDs of mutual contacts
      const mutualIds = Object.keys(mutualFrequency);

      // Get user's interaction preferences for personalization
      const userPreferences = await UserInteraction.getUserPreferences(currentUserId);
      const preferredTags = userPreferences.tags.slice(0, 10).map(t => t.tag);
      const preferredContentTypes = Object.entries(userPreferences.contentType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([type]) => type);

      // Get potential suggestion candidates
      // Strategy: 
      // 1. Fetch candidates with mutual connections (up to 100)
      // 2. Fetch popular candidates (up to 100) to ensure variety if mutuals are scarce

      const [mutualCandidates, popularCandidates] = await Promise.all([
        // Query 1: Mutual candidates
        User.find({
          _id: { $in: mutualIds },
          isActive: true,
          isBanned: false,
          isDeleted: false
        })
          .select('username fullName profilePicture isVerified followersCount followingCount interests location lastActive createdAt')
          .limit(100)
          .lean(),

        // Query 2: Popular candidates (excluding mutuals to avoid duplicates)
        User.find({
          _id: { $nin: [...excludeIds, ...mutualIds] }, // Exclude already followed and mutuals
          isActive: true,
          isBanned: false,
          isDeleted: false,
          followersCount: { $gte: 1 },
          lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Active in last 30 days
        })
          .select('username fullName profilePicture isVerified followersCount followingCount interests location lastActive createdAt')
          .sort({ followersCount: -1 }) // Sort by popularity for "Rich Get Richer"
          .limit(200)
          .lean()
      ]);

      const candidates = [...mutualCandidates, ...popularCandidates];

      // Calculate rich-get-richer scores for each candidate
      const scoredCandidates = await Promise.all(
        candidates.map(async (user) => {
          let score = 0;
          const factors = [];

          // 1. Mutual Friends Score (30% weight or additive bonus)
          // 2 points per mutual friend, capped at 10
          const mutualCount = mutualFrequency[user._id.toString()] || 0;
          const mutualScore = Math.min(10, mutualCount * 2);
          score += mutualScore * 0.30;
          if (mutualScore > 0) factors.push(`mutuals:${mutualCount}`);

          // 2. Follower Count Score (30% weight) - Reduced from 40%
          const followerScore = Math.log(user.followersCount + 1) * 10; // Logarithmic scaling
          score += followerScore * 0.30;
          factors.push(`followers:${followerScore.toFixed(1)}`);

          // 3. Recent Activity Score (15% weight) - Reduced from 20%
          const daysSinceActive = (Date.now() - new Date(user.lastActive)) / (1000 * 60 * 60 * 24);
          const activityScore = Math.max(0, 10 - daysSinceActive); // Higher for recently active
          score += activityScore * 0.15;
          factors.push(`activity:${activityScore.toFixed(1)}`);

          // 4. Engagement Ratio Score (10% weight) - Reduced from 15%
          const engagementRatio = user.followingCount > 0 ? user.followersCount / user.followingCount : 0;
          const ratioScore = Math.min(10, engagementRatio * 2); // Cap at 10
          score += ratioScore * 0.10;
          factors.push(`ratio:${ratioScore.toFixed(1)}`);

          // 5. Shared Interests Score (10% weight) - Reduced from 15%
          const sharedInterests = user.interests?.filter(interest =>
            currentUser.interests?.includes(interest)
          ).length || 0;
          const interestScore = sharedInterests * 2; // 2 points per shared interest
          score += interestScore * 0.10;
          if (interestScore > 0) factors.push(`interests:${interestScore.toFixed(1)}`);

          // 6. Geographic Proximity Score (5% weight) - Reduced from 10%
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
            score: Math.round(score * 100) / 100, // Round to 2 decimal places
            factors: factors.join(', '),
            mutualConnections: mutualCount
          };
        })
      );

      // Sort by score descending and take top suggestions
      const topSuggestions = scoredCandidates
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Remove internal scoring data from final response
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
