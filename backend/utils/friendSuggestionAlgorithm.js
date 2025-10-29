const User = require('../models/User');
const Follow = require('../models/Follow');
const UserInteraction = require('../models/UserInteraction');

const USER_SELECT = 'username fullName profilePicture isVerified bio lastActive interests location followersCount';

class FriendSuggestionAlgorithm {
  /**
   *
   * @param {string} currentUserId
   * @param {number} limit
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  async getSuggestions(currentUserId, limit = 10, filters = {}) {
    try {
      const currentUser = await this.getCurrentUser(currentUserId);
      const weights = this.calculateDynamicWeights(currentUser);

      const suggestions = await this.fetchAllSuggestions(currentUser, weights, limit);
      const uniqueSuggestions = this.processAndDeduplicate(suggestions, limit);

      return this.formatResponse(uniqueSuggestions, weights, filters);
    } catch (error) {
      console.error('Enhanced friend suggestion service error:', error);
      throw error;
    }
  }

  async getCurrentUser(userId) {
    const user = await User.findById(userId)
      .select('followersCount lastActive interests location.city location.district isActive');

    if (!user) throw new Error('User not found');

    const following = await Follow.find({ follower: userId }).select('following').lean();
    user.following = following.map(f => f.following);

    return user;
  }

  calculateDynamicWeights(user) {
    const count = user.following.length;
    return count < 10
      ? { mutual: 0.5, interests: 0.2, location: 0.15, interaction: 0.1, activity: 0.05, popular: 0.1 }
      : { mutual: 0.3, interests: 0.25, location: 0.2, interaction: 0.15, activity: 0.1, popular: 0 };
  }

  async fetchUsers(query, limit, reason, sort = { lastActive: -1 }) {
    const users = await User.find(query).select(USER_SELECT).sort(sort).limit(limit);
    return users.map(u => ({ ...u.toObject(), suggestionReason: reason }));
  }

  async fetchAllSuggestions(currentUser, weights, limit) {
    const followingIds = currentUser.following.map(String);
    const excludeIds = [currentUser._id.toString(), ...followingIds];
    const baseQuery = { _id: { $nin: excludeIds }, isActive: true, isBanned: false, isDeleted: false };

    const suggestions = [];

    if (weights.interaction > 0) {
      const interactionLimit = Math.ceil(limit * weights.interaction);
      const interactions = await UserInteraction.find({ viewer: currentUser._id, totalInteractions: { $gt: 5 } })
        .sort({ totalInteractions: -1, lastInteraction: -1 }).limit(interactionLimit * 4);

      const now = Date.now();
      const halfLifeDays = 7;

      const authorScores = interactions.reduce((acc, doc) => {
        const authorId = doc.author.toString();
        if (excludeIds.includes(authorId)) return acc;
        const last = doc.lastInteraction ? doc.lastInteraction.getTime() : doc.updatedAt?.getTime?.() || now;
        const daysSince = Math.max(0, (now - last) / (1000 * 60 * 60 * 24));
        const decay = Math.pow(0.5, daysSince / halfLifeDays);
        const score = (doc.totalInteractions || 0) * decay;
        acc[authorId] = Math.max(acc[authorId] || 0, score);
        return acc;
      }, {});

      const authorIds = Object.keys(authorScores);
      if (authorIds.length > 0) {
        const users = await User.find({ ...baseQuery, _id: { $in: authorIds } }).select(USER_SELECT).limit(interactionLimit);
        users.forEach(u => {
          const id = u._id.toString();
          const s = u.toObject();
          s.suggestionReason = 'high_engagement';
          s.interactionScore = authorScores[id] || 0;
          suggestions.push(s);
        });
      }
    }

    const queries = [];
    if (weights.mutual > 0) {
      const mutualUserIds = await Follow.find({ follower: { $in: followingIds } }).distinct('following');
      queries.push({ query: { ...baseQuery, _id: { $in: mutualUserIds } }, limit: Math.ceil(limit * weights.mutual), reason: 'mutual_connections' });
    }
    if (weights.interests > 0 && currentUser.interests?.length) {
      queries.push({ query: { ...baseQuery, interests: { $in: currentUser.interests } }, limit: Math.ceil(limit * weights.interests), reason: 'shared_interests' });
    }
    if (weights.location > 0 && (currentUser.location?.city || currentUser.location?.district)) {
      const locQuery = {};
      if (currentUser.location.city) locQuery['location.city'] = currentUser.location.city;
      if (currentUser.location.district) locQuery['location.district'] = currentUser.location.district;
      queries.push({ query: { ...baseQuery, ...locQuery }, limit: Math.ceil(limit * weights.location), reason: 'nearby_location' });
    }
    if (weights.activity > 0) {
      queries.push({ query: { ...baseQuery, lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, limit: Math.ceil(limit * weights.activity), reason: 'recently_active' });
    }

  const results = await Promise.all(queries.map(q => this.fetchUsers(q.query, q.limit, q.reason)));
  suggestions.push(...results.flat());

  const remaining = limit - suggestions.length;
    if (remaining > 0 && weights.popular > 0) {
      const popular = await this.fetchUsers({ ...baseQuery }, remaining, 'popular_user', { followersCount: -1 });
      suggestions.push(...popular);
    }

    if (suggestions.length === 0) {
      const fallbackUsers = await this.fetchUsers({ ...baseQuery }, limit, 'new_user', { createdAt: -1 });
      suggestions.push(...fallbackUsers);
    }

    return suggestions;
  }

  processAndDeduplicate(suggestions, limit) {
    const deduped = [];
    const seen = new Map();

    suggestions.forEach(s => {
      const id = s._id.toString();
      if (!seen.has(id)) {
        seen.set(id, { user: { ...s, followersCount: s.followersCount || 0 }, score: 0, reasons: new Set([s.suggestionReason]) });
      } else {
        const entry = seen.get(id);
        entry.reasons.add(s.suggestionReason);
      }
    });

    seen.forEach((val, id) => {
      const reasonBoost = val.reasons.size * 10;
      const followersBoost = (val.user.followersCount || 0);
      const interactionBoost = (val.user.interactionScore || 0);
      val.score = reasonBoost + followersBoost + Math.round(interactionBoost);
      const u = val.user;
      delete u.followers;
      deduped.push({ ...u, _score: val.score, _reasons: Array.from(val.reasons) });
    });

    deduped.sort((a, b) => b._score - a._score);

    return deduped.slice(0, limit).map(u => {
      const copy = { ...u };
      copy.suggestionReasons = u._reasons || [];
      copy.suggestionReason = (u._reasons && u._reasons.length > 0) ? u._reasons[0] : null;
      copy.suggestionScore = u._score || 0;
      delete copy._score;
      delete copy._reasons;
      return copy;
    });
  }

  formatResponse(suggestions, weights, filters) {
    return {
      message: 'Enhanced suggestions retrieved successfully',
      users: suggestions,
      algorithm: 'enhanced_social',
      factors: ['mutual_connections', 'shared_interests', 'nearby_location', 'high_engagement', 'recently_active', 'popular_users'],
      metadata: { totalSuggestions: suggestions.length, weights, filters }
    };
  }



  removeDuplicates(users) {
    const seen = new Set();
    return users.filter(user => {
      const id = user._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  /**
   *
   * @param {string} currentUserId
   * @param {number} limit
   */
  async getAdvancedSuggestions(currentUserId, limit = 10) {
    return this.getSuggestions(currentUserId, limit);
  }
}

module.exports = FriendSuggestionAlgorithm;
