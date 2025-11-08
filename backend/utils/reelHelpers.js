/**
 * Find a comment or reply by ID in nested reel comments structure
 * @param {Array} comments - Array of comments
 * @param {string} id - Comment or reply ID to find
 * @returns {Object|null} - Found comment/reply or null
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
 * Count total comments including all nested replies
 * @param {Array} comments - Array of comments
 * @returns {number} - Total count of comments and replies
 */
function countTotalComments(comments) {
  let count = 0;
  for (let comment of comments) {
    count += 1;

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
