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

module.exports = {
  findCommentById,
  countTotalComments
};
