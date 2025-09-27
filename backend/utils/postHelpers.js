/**
 * Shared utility functions for posts routes
 * Consolidates duplicate helper functions used across multiple post route files
 */

/**
 * Helper function to find a comment by ID recursively in the comment tree
 * @param {Array} comments - Array of comments to search in
 * @param {string} id - Comment ID to find
 * @returns {Object|null} - Found comment object or null if not found
 */
function findCommentById(comments, id) {
  for (let comment of comments) {
    if (comment._id.toString() === id.toString()) return comment;
    if (comment.replies && comment.replies.length > 0) {
      let found = findCommentById(comment.replies, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Helper function to count total comments including replies recursively
 * @param {Array} comments - Array of comments to count
 * @returns {number} - Total count of comments including all replies
 */
function countTotalComments(comments) {
  let count = 0;
  for (let comment of comments) {
    count += 1; // count the comment itself
    if (comment.replies && comment.replies.length > 0) {
      count += countTotalComments(comment.replies);
    }
  }
  return count;
}

/**
 * Helper function to validate post content
 * @param {Object} data - Post data to validate
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
function validatePostData(data) {
  const errors = [];

  if (data.content && data.content.length > 2200) {
    errors.push('Content must be less than 2200 characters');
  }

  if (data.caption && data.caption.length > 2200) {
    errors.push('Caption must be less than 2200 characters');
  }

  if (!data.content && (!data.media || data.media.length === 0)) {
    errors.push('Post must have either content or media');
  }

  if (data.tags && data.tags.length > 50) {
    errors.push('Cannot have more than 50 tags');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to process uploaded media files
 * @param {Array} files - Array of uploaded files
 * @param {Object} req - Request object for host/protocol info
 * @returns {Array} - Processed media array
 */
function processMediaFiles(files, req) {
  if (!files || files.length === 0) return [];

  const path = require('path');

  return files.map(file => {
    if (!file.mimetype || !file.path) {
      throw new Error('Invalid file data');
    }
    return {
      type: file.mimetype.startsWith('image/') ? 'image' : 'video',
      url: `${req.protocol}://${req.get('host')}/uploads/${path.basename(file.path)}`,
      size: file.size || 0,
      width: file.width || 0,
      height: file.height || 0
    };
  });
}

module.exports = {
  findCommentById,
  countTotalComments,
  validatePostData,
  processMediaFiles
};
