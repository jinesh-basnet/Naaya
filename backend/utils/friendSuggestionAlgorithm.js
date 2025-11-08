const User = require('../models/User');
const Following = require('../models/Following');

/**
 * Rich-Get-Richer Algorithm for friend suggestions based on mutual connections.
 * This algorithm suggests users who have the most mutual friends ,
 * following the principle that popular users  are more likely to be suggested.
 */
class RichGetRicherAlgorithm {
  /**
   * Generates friend suggestions using the rich-get-richer principle.
   * @param {string} currentUserId - The ID of the current user.
   * @param {number} limit - The maximum number of suggestions to return.
   * @returns {Object} An object containing the suggestions, algorithm info, and metadata.
   */
  async getSuggestions(currentUserId, limit = 10) {
    // Fetch the list of users that the current user is following
    const followingDoc = await Following.findOne({ user: currentUserId }).select('following').lean();
    const followingIds = followingDoc ? followingDoc.following : [];
    // Exclude the current user and their direct follows from suggestions
    const excludeIds = [currentUserId, ...followingIds];

    // Find the following lists of the user's friends 
    const friendOfFriends = await Following.find({ user: { $in: followingIds } }).select('following').lean();

    // Count mutual connections: for each friend of friend, increment the count if not excluded
    const connectionCount = {};
    friendOfFriends.forEach(doc => {
      doc.following.forEach(id => {
        const idStr = id.toString();
        if (!excludeIds.includes(idStr)) {
          connectionCount[idStr] = (connectionCount[idStr] || 0) + 1;
        }
      });
    });

    // Sort user IDs by the number of mutual connections in descending order and take the top 'limit'
    const sortedIds = Object.keys(connectionCount)
      .sort((a, b) => connectionCount[b] - connectionCount[a])
      .slice(0, limit);

    // Fetch user details for the top suggested IDs, ensuring they are active and notdeleted
    const suggestions = await User.find({
      _id: { $in: sortedIds },
      isActive: true,
      isBanned: false,
      isDeleted: false
    })
    .select('username fullName profilePicture isVerified')
    .lean();

    // Add the mutual connections count to each user suggestion
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
