const User = require('../models/User');
const Following = require('../models/Following');

class RichGetRicherAlgorithm {
  /**
   * @param {string} currentUserId 
   * @param {number} limit 
   * @returns {Object} 
   */
  async getSuggestions(currentUserId, limit = 10) {
    const followingDoc = await Following.findOne({ user: currentUserId }).select('following').lean();
    const followingIds = followingDoc ? followingDoc.following : [];
    const excludeIds = [currentUserId.toString(), ...followingIds.map(id => id.toString())];

    const friendOfFriends = await Following.find({ user: { $in: followingIds } }).select('following').lean();

    const connectionCount = {};
    friendOfFriends.forEach(doc => {
      doc.following.forEach(id => {
        const idStr = id.toString();
        if (!excludeIds.includes(idStr)) {
          connectionCount[idStr] = (connectionCount[idStr] || 0) + 1;
        }
      });
    });

    const sortedIds = Object.keys(connectionCount)
      .sort((a, b) => connectionCount[b] - connectionCount[a])
      .slice(0, limit);

    const suggestions = await User.find({
      _id: { $in: sortedIds },
      isActive: true,
      isBanned: false,
      isDeleted: false
    })
    .select('username fullName profilePicture isVerified')
    .lean();

    const suggestionsWithCount = suggestions.map(user => ({
      ...user,
      mutualConnections: connectionCount[user._id.toString()] || 0
    }));

    return {
      message: 'Rich-get-richer through mutual connections retrieved successfully',
      users: suggestionsWithCount,
      algorithm: 'rich_get_richer_mutual',
      factors: ['mutual_connections'],
      metadata: { totalSuggestions: suggestionsWithCount.length }
    };
  }
}

module.exports = RichGetRicherAlgorithm;
