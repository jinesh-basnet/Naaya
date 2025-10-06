/**
 * 
 * @param {Array} comments 
 * @param {string} id 
 * @returns {Object|null} 
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
 * 
 * @param {Array} comments 
 * @returns {number} 
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
