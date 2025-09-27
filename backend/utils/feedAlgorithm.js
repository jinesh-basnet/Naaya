const User = require('../models/User');
const Post = require('../models/Post');
const UserInteraction = require('../models/UserInteraction');

// In-memory cache for user preferences (simple LRU-like cache)
const userPreferencesCache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// Cache management functions
function getCachedUserPreferences(userId) {
  const cached = userPreferencesCache.get(userId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.preferences;
  }
  if (cached) {
    userPreferencesCache.delete(userId); // Remove expired cache
  }
  return null;
}

function setCachedUserPreferences(userId, preferences) {
  userPreferencesCache.set(userId, {
    preferences,
    timestamp: Date.now()
  });

  // Simple LRU: remove oldest entries if cache gets too large
  if (userPreferencesCache.size > 1000) {
    const oldestKey = userPreferencesCache.keys().next().value;
    userPreferencesCache.delete(oldestKey);
  }
}

/**
 * Enforce content diversity by preventing author spam
 * @param {Array} scoredPosts - Array of scored posts
 * @param {number} limit - Maximum posts to return
 * @param {string} userId - Current user ID
 * @returns {Array} Diverse set of posts
 */
function enforceContentDiversity(scoredPosts, limit, userId) {
  const authorPostCounts = new Map();
  const diversePosts = [];
  const userPosts = [];

  // Separate user's own posts
  for (const item of scoredPosts) {
    const authorId = item.post.author._id.toString();
    if (authorId === userId) {
      userPosts.push(item);
    } else {
      if (diversePosts.length < limit) {
        // Check if we've already included too many posts from this author
        const authorCount = authorPostCounts.get(authorId) || 0;
        if (authorCount < 2) { // Max 2 posts per author
          diversePosts.push(item);
          authorPostCounts.set(authorId, authorCount + 1);
        }
      }
    }
  }

  // If we don't have enough diverse posts, add more from authors we haven't limited
  if (diversePosts.length < limit) {
    const remainingSlots = limit - diversePosts.length;

    for (const item of scoredPosts) {
      const authorId = item.post.author._id.toString();
      if (authorId !== userId && !diversePosts.includes(item)) {
        const authorCount = authorPostCounts.get(authorId) || 0;
        if (authorCount < 3) { // Allow up to 3 posts per author if needed
          diversePosts.push(item);
          authorPostCounts.set(authorId, authorCount + 1);
          if (diversePosts.length >= limit) break;
        }
      }
    }
  }

  return diversePosts;
}

/**
 * Balance content types in the feed to ensure variety
 * @param {Array} posts - Array of posts to balance
 * @param {number} limit - Maximum posts to return
 * @param {Object} userPreferences - User's content type preferences
 * @returns {Array} Balanced set of posts
 */
function balanceContentTypes(posts, limit, userPreferences) {
  const contentTypeCounts = { image: 0, video: 0, text: 0 };
  const balancedPosts = [];
  const maxPerType = Math.ceil(limit / 3); // Distribute evenly across 3 types

  // First pass: prioritize user's preferred content types
  for (const post of posts) {
    if (balancedPosts.length >= limit) break;

    const contentType = post.media.length > 0 ? post.media[0].type : 'text';
    const currentCount = contentTypeCounts[contentType];

    // Check if we haven't exceeded the limit for this content type
    if (currentCount < maxPerType) {
      balancedPosts.push(post);
      contentTypeCounts[contentType]++;
    }
  }

  // Second pass: fill remaining slots with any content type
  if (balancedPosts.length < limit) {
    for (const post of posts) {
      if (balancedPosts.length >= limit) break;
      if (!balancedPosts.includes(post)) {
        balancedPosts.push(post);
      }
    }
  }

  return balancedPosts;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate location proximity score (30% weight)
 * @param {Object} viewerLocation - Viewer's location data
 * @param {Object} authorLocation - Author's location data
 * @returns {number} Location score (0-1)
 */
function calculateLocationScore(viewerLocation, authorLocation) {
  if (!viewerLocation || !authorLocation) return 0.2; // Default if missing
  
  // Score based on administrative boundaries (more relevant in Nepal)
  if (viewerLocation.city && authorLocation.city && 
      viewerLocation.city === authorLocation.city) {
    return 1.0;
  }
  
  if (viewerLocation.district && authorLocation.district && 
      viewerLocation.district === authorLocation.district) {
    return 0.8;
  }
  
  if (viewerLocation.province && authorLocation.province && 
      viewerLocation.province === authorLocation.province) {
    return 0.6;
  }
  
  // Score based on distance for same country
  if (viewerLocation.coordinates && authorLocation.coordinates) {
    const distance = calculateDistance(
      viewerLocation.coordinates.lat, viewerLocation.coordinates.lng,
      authorLocation.coordinates.lat, authorLocation.coordinates.lng
    );
    
    if (distance < 50) return 0.6; // Within 50 km
    if (distance < 200) return 0.4; // Within 200 km
    return 0.3;
  }
  
  return 0.1; // Different country or no location data
}

/**
 * Calculate language preference score (20% weight)
 * @param {string} viewerLanguagePref - Viewer's language preference
 * @param {string} postLanguage - Post's language
 * @returns {number} Language score (0-1)
 */
function calculateLanguageScore(viewerLanguagePref, postLanguage) {
  const languageMatrix = {
    'nepali': { 'nepali': 1.0, 'english': 0.7, 'mixed': 0.8, 'other': 0.3 },
    'english': { 'english': 1.0, 'nepali': 0.8, 'mixed': 0.9, 'other': 0.4 },
    'both': { 'nepali': 0.9, 'english': 0.9, 'mixed': 1.0, 'other': 0.3 }
  };
  
  return languageMatrix[viewerLanguagePref]?.[postLanguage] || 0.2;
}

/**
 * Calculate relationship score (20% weight)
 * @param {string} viewerId - Viewer's user ID
 * @param {string} authorId - Author's user ID
 * @param {Array} userFollowing - Array of user IDs the viewer follows
 * @param {Object} interactionHistory - Interaction history between users
 * @returns {number} Relationship score (0-1)
 */
function calculateRelationshipScore(viewerId, authorId, userFollowing, interactionHistory = {}) {
  if (viewerId === authorId) return 1; // Boost own posts

  const isFollowing = userFollowing.some(f => f._id.equals(authorId));
  let baseScore = isFollowing ? 0.7 : 0.3;

  // Boost score based on interaction history
  const totalInteractions = interactionHistory.totalInteractions || 0;
  const interactionScore = Math.min(totalInteractions / 50, 0.3);

  return Math.min(baseScore + interactionScore, 1.0);
}

/**
 * Calculate engagement velocity score (15% weight)
 * @param {Object} post - Post object
 * @returns {number} Engagement score (0-1)
 */
function calculateEngagementScore(post) {
  const hoursSinceCreation = (Date.now() - post.createdAt) / (1000 * 60 * 60);
  if (hoursSinceCreation === 0) return 1.0; // Brand new post
  
  const totalEngagements = post.likes.length + post.comments.length + post.shares.length;
  const engagementRate = totalEngagements / hoursSinceCreation;
  
  // Normalize to 0-1 scale with diminishing returns
  return Math.min(engagementRate / 5, 1.0);
}

/**
 * Calculate post recency score (10% weight)
 * @param {Date} createdAt - Post creation date
 * @returns {number} Recency score (0-1)
 */
function calculateRecencyScore(createdAt) {
  const hoursOld = (Date.now() - createdAt) / (1000 * 60 * 60);
  
  // Exponential decay: posts lose half their value every 24 hours
  return Math.exp(-hoursOld / 24);
}

/**
 * Calculate content type preference score (5% weight)
 * @param {string} postType - Type of post (image, video, text)
 * @returns {number} Content type score (0-1)
 */
function calculateContentTypeScore(postType) {
  // Placeholder for future ML-based personalization
  // For MVP, prioritize video content slightly
  const defaultScores = {
    'image': 1.0,
    'video': 1.1,
    'text': 0.9
  };
  
  return defaultScores[postType] || 1.0;
}

/**
 * Calculate dynamic weights based on user interaction patterns
 * @param {Object} viewer - Viewer user object
 * @param {Object} userPreferences - User's interaction preferences
 * @returns {Object} Dynamic weights
 */
function calculateDynamicWeights(viewer, userPreferences) {
  const baseWeights = {
    location: 0.3,
    language: 0.2,
    relationship: 0.2,
    engagement: 0.15,
    recency: 0.1,
    contentType: 0.05
  };

  // Adjust weights based on user behavior patterns
  const totalInteractions = userPreferences.totalInteractions || 0;
  if (totalInteractions > 10) {
    // If user has significant interaction history, adapt weights

    // Location weight: increase if user engages more with local content
    const localEngagement = (userPreferences.locationEngagement || 0) / totalInteractions;
    if (localEngagement > 0.6) {
      baseWeights.location += 0.1;
      baseWeights.relationship -= 0.05;
    }

    // Content type preferences
    const contentPrefs = userPreferences.contentType;
    const totalContent = contentPrefs.image + contentPrefs.video + contentPrefs.text;
    if (totalContent > 0) {
      if (contentPrefs.video / totalContent > 0.5) {
        baseWeights.contentType += 0.05;
        baseWeights.engagement -= 0.02;
      }
    }

    // Language preferences
    const langPrefs = userPreferences.language;
    const totalLang = langPrefs.nepali + langPrefs.english + langPrefs.mixed;
    if (totalLang > 0 && viewer.languagePreference !== 'both') {
      baseWeights.language += 0.05;
      baseWeights.location -= 0.02;
    }

    // Relationship vs discovery balance
    const relationshipEngagement = (userPreferences.relationshipEngagement || 0) / totalInteractions;
    if (relationshipEngagement > 0.7) {
      baseWeights.relationship += 0.05;
      baseWeights.engagement -= 0.02;
    }
  }

  // Normalize weights to sum to 1
  const totalWeight = Object.values(baseWeights).reduce((sum, w) => sum + w, 0);
  Object.keys(baseWeights).forEach(key => {
    baseWeights[key] = baseWeights[key] / totalWeight;
  });

  return baseWeights;
}

/**
 * Calculate interests matching score
 * @param {Array} userInterests - User's interests
 * @param {Object} post - Post object
 * @returns {number} Interests score (0-1)
 */
function calculateInterestsScore(userInterests, post) {
  if (!userInterests || userInterests.length === 0) return 0;

  const postTags = [...(post.hashtags || []), ...(post.tags || [])].map(tag => tag.toLowerCase());
  const postContent = (post.content || '').toLowerCase();

  let matchCount = 0;
  userInterests.forEach(interest => {
    const interestLower = interest.toLowerCase();
    if (postTags.some(tag => tag.includes(interestLower)) ||
        postContent.includes(interestLower)) {
      matchCount++;
    }
  });

  return Math.min(matchCount / userInterests.length, 1.0);
}

/**
 * Apply rule-based boosting heuristics
 * @param {number} baseScore - Base calculated score
 * @param {Object} viewer - Viewer user object
 * @param {Object} post - Post object
 * @param {Object} interactionHistory - Interaction history
 * @param {Object} userPreferences - User preferences
 * @returns {number} Boosted score
 */
function applyBoostingHeuristics(baseScore, viewer, post, interactionHistory, userPreferences) {
  let boostedScore = baseScore;

  // Boost posts from authors with frequent recent interactions
  const authorInteractions = interactionHistory.totalInteractions || 0;
  const lastInteraction = interactionHistory.lastInteraction;
  const daysSinceInteraction = lastInteraction ?
    (Date.now() - lastInteraction) / (1000 * 60 * 60 * 24) : 999;

  if (authorInteractions > 5 && daysSinceInteraction < 7) {
    boostedScore *= 1.2; // 20% boost
  }

  // Boost posts matching top user interests
  const interestsScore = calculateInterestsScore(viewer.interests, post);
  if (interestsScore > 0) {
    const topInterests = viewer.interests.slice(0, 3);
    const isTopInterest = topInterests.some(interest =>
      [...(post.hashtags || []), ...(post.tags || [])].some(tag =>
        tag.toLowerCase().includes(interest.toLowerCase())
      ) || (post.content || '').toLowerCase().includes(interest.toLowerCase())
    );
    if (isTopInterest) {
      boostedScore *= 1.15; // 15% boost
    }
  }

  // Boost based on content type preferences
  const contentType = post.media.length > 0 ? post.media[0].type : 'text';
  const contentPrefs = userPreferences.contentType;
  const totalContent = contentPrefs.image + contentPrefs.video + contentPrefs.text;
  if (totalContent > 0) {
    const prefRatio = contentPrefs[contentType] / totalContent;
    if (prefRatio > 0.6) {
      boostedScore *= 1.1; // 10% boost for preferred content type
    } else if (prefRatio < 0.2) {
      boostedScore *= 0.9; // 10% reduction for less preferred
    }
  }

  return boostedScore;
}

/**
 * Calculate final feed score for a post
 * @param {Object} viewer - Viewer user object
 * @param {Object} post - Post object
 * @param {Object} interactionHistory - Interaction history
 * @param {Object} userPreferences - User's interaction preferences
 * @returns {number} Final weighted score
 */
function calculateFeedScore(viewer, post, interactionHistory = {}, userPreferences = {}) {
  // Calculate dynamic weights based on user behavior
  const weights = calculateDynamicWeights(viewer, userPreferences);

  // Calculate base scores with user-specific adaptations
  const scores = {
    location: calculateLocationScore(viewer.location, post.location),
    language: calculateLanguageScore(viewer.languagePreference, post.language),
    relationship: calculateRelationshipScore(
      viewer._id,
      post.author._id,
      viewer.following,
      interactionHistory
    ),
    engagement: calculateEngagementScore(post),
    recency: calculateRecencyScore(post.createdAt),
    contentType: calculateContentTypeScore(post.media.length > 0 ? post.media[0].type : 'text')
  };

  // Adapt scores based on user preferences
  if (userPreferences.totalInteractions > 5) {
    // Language adaptation
    const langPrefs = userPreferences.language;
    const totalLang = langPrefs.nepali + langPrefs.english + langPrefs.mixed;
    if (totalLang > 0) {
      const langRatio = langPrefs[post.language] / totalLang;
      scores.language = Math.max(scores.language, langRatio);
    }

    // Content type adaptation
    const contentType = post.media.length > 0 ? post.media[0].type : 'text';
    const contentPrefs = userPreferences.contentType;
    const totalContent = contentPrefs.image + contentPrefs.video + contentPrefs.text;
    if (totalContent > 0) {
      const contentRatio = contentPrefs[contentType] / totalContent;
      scores.contentType = Math.max(scores.contentType, contentRatio);
    }
  }

  // Calculate weighted sum
  let finalScore = 0;
  for (const [factor, weight] of Object.entries(weights)) {
    finalScore += scores[factor] * weight;
  }

  // Apply rule-based boosting heuristics
  finalScore = applyBoostingHeuristics(finalScore, viewer, post, interactionHistory, userPreferences);

  return {
    finalScore,
    breakdown: {
      ...scores,
      weights: weights,
      boosted: finalScore > (Object.values(scores).reduce((sum, score, i) =>
        sum + score * Object.values(weights)[i], 0))
    }
  };
}

/**
 * Generate personalized feed for a user
 * @param {string} userId - User ID
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Posts per page (default: 20)
 * @returns {Array} Array of scored posts
 */
async function generatePersonalizedFeed(userId, page = 1, limit = 20) {
  try {
    const user = await User.findById(userId).populate('following');
    if (!user) {
      throw new Error('User not found');
    }

    // Get user preferences from cache first, then database
    let userPreferences = getCachedUserPreferences(userId);

    if (!userPreferences) {
      userPreferences = {
        contentType: { image: 0, video: 0, text: 0 },
        language: { nepali: 0, english: 0, mixed: 0 },
        tags: [],
        totalInteractions: 0
      };

      try {
        const preferences = await UserInteraction.getUserPreferences(userId);
        if (preferences) {
          userPreferences = preferences;
          setCachedUserPreferences(userId, preferences); // Cache the preferences
        } else {
          console.warn(`No user preferences found for user ${userId}, using defaults`);
        }
      } catch (error) {
        console.error(`Error getting user preferences for user ${userId}:`, error.message);
        console.log('Using default preferences as fallback');
      }
    }

    // Get candidate posts from last 7 days only - optimized to fetch exactly what we need
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const candidatePosts = await Post.find({
      createdAt: { $gte: sevenDaysAgo },
      isDeleted: false,
      isArchived: false
    })
    .populate('author', 'username fullName profilePicture isVerified location languagePreference')
    .limit(limit * 2) // Get 2x posts for better ranking without excessive overfetching
    .sort({ createdAt: -1 }); // Pre-sort by recency for better candidate selection

    // Get interaction history for relationship scoring
    const interactionHistory = await getInteractionHistory(userId, candidatePosts.map(p => p.author._id));

    // Score all posts
    const scoredPosts = candidatePosts.map(post => {
      const authorId = post.author._id.toString();
      const scoreData = calculateFeedScore(
        user,
        post,
        interactionHistory[authorId] || {},
        userPreferences
      );

      return {
        post,
        score: scoreData.finalScore,
        breakdown: scoreData.breakdown
      };
    });

    // Sort by score and return top results with diversity enforcement
    const sortedPosts = scoredPosts
      .sort((a, b) => b.score - a.score);

    // Apply content diversity enforcement
    const diversePosts = enforceContentDiversity(sortedPosts, limit, userId);

    let feedPosts = diversePosts.map(item => item.post);

    // Apply content type balancing
    feedPosts = balanceContentTypes(feedPosts, limit, userPreferences);

    // Always include user's own posts if not already included
    const userOwnPosts = candidatePosts.filter(post => post.author._id.toString() === userId);
    const includedPostIds = new Set(feedPosts.map(p => p._id.toString()));
    const additionalUserPosts = userOwnPosts.filter(post => !includedPostIds.has(post._id.toString()));

    feedPosts.push(...additionalUserPosts);
    feedPosts = feedPosts.slice(0, limit);

    return feedPosts;

  } catch (error) {
    console.error('Error generating personalized feed:', error);
    throw error;
  }
}

/**
 * Get interaction history between users
 * @param {string} viewerId - Viewer's user ID
 * @param {Array} authorIds - Array of author IDs
 * @returns {Object} Interaction history data
 */
async function getInteractionHistory(viewerId, authorIds) {
  try {
    const interactions = await UserInteraction.find({
      viewer: viewerId,
      author: { $in: authorIds }
    });

    const history = {};
    interactions.forEach(interaction => {
      history[interaction.author.toString()] = {
        totalInteractions: interaction.totalInteractions,
        interactions: interaction.interactions,
        contentTypeInteractions: interaction.contentTypeInteractions,
        languageInteractions: interaction.languageInteractions,
        tagInteractions: interaction.tagInteractions
      };
    });

    return history;
  } catch (error) {
    console.error('Error getting interaction history:', error);
    return {};
  }
}

/**
 * Update interaction history when user interacts with content
 * @param {string} viewerId - Viewer's user ID
 * @param {string} authorId - Author's user ID
 * @param {string} interactionType - Type of interaction (like, comment, share, save)
 * @param {string} contentType - Content type (image, video, text)
 * @param {string} language - Language of the post
 * @param {Array} tags - Tags or hashtags of the post
 */
async function updateInteractionHistory(viewerId, authorId, interactionType, contentType = null, language = null, tags = []) {
  try {
    const interactionValue = {
      'like': 1,
      'comment': 2,
      'share': 3,
      'save': 2,
      'view': 0.5
    };

    const interactionWeight = interactionValue[interactionType] || 1;

    const interaction = await UserInteraction.findOne({ viewer: viewerId, author: authorId });

    if (interaction) {
      await interaction.updateInteraction(interactionType, contentType, language, tags);
    } else {
      const newInteraction = new UserInteraction({
        viewer: viewerId,
        author: authorId
      });
      await newInteraction.updateInteraction(interactionType, contentType, language, tags);
    }

  } catch (error) {
    console.error('Error updating interaction history:', error);
  }
}

module.exports = {
  calculateFeedScore,
  generatePersonalizedFeed,
  updateInteractionHistory,
  getInteractionHistory,
  calculateLocationScore,
  calculateLanguageScore,
  calculateRelationshipScore,
  calculateEngagementScore,
  calculateRecencyScore,
  calculateContentTypeScore
};
