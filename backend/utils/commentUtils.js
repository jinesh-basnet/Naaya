
function findCommentById(comments = [], id) {
  if (!id) return null;
  
  for (let comment of comments) {
    if (comment._id.toString() === id.toString()) return comment;
    
    if (comment.replies?.length > 0) {
      const found = findCommentById(comment.replies, id);
      if (found) return found;
    }
  }
  return null;
}


function countTotalComments(comments = []) {
  let count = 0;
  for (let comment of comments) {
    count++;
    if (comment.replies?.length > 0) {
      count += countTotalComments(comment.replies);
    }
  }
  return count;
}

module.exports = {
  findCommentById,
  countTotalComments
};
