import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdClose, MdSend, MdFavorite, MdFavoriteBorder } from 'react-icons/md';
import { postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { safeRender } from '../utils/safeRender';
import './PostCommentsModal.css';

interface Comment {
  _id: string;
  author: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture: string;
    isVerified: boolean;
  };
  content: string;
  replyTo?: string;
  likes: Array<{ user: string }>;
  createdAt: string;
  replies?: Comment[];
}

interface PostCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postAuthorId: string;
  initialCommentsCount: number;
}

const PostCommentsModal: React.FC<PostCommentsModalProps> = ({
  isOpen,
  onClose,
  postId,
  postAuthorId,
  initialCommentsCount
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalComments, setTotalComments] = useState(initialCommentsCount);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const buildCommentTree = (flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create map of all comments
    flatComments.forEach(comment => {
      commentMap.set(comment._id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    flatComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment._id)!;
      if (comment.replyTo) {
        const parent = commentMap.get(comment.replyTo);
        if (parent) {
          parent.replies!.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const loadComments = useCallback(async (pageNum = 1, append = false) => {
    if (!postId) return;

    setIsLoading(true);
    try {
      console.log('Loading comments for postId:', postId);
      const response = await postsAPI.getPost(postId);
      console.log('Comments response:', response.data.comments);
      const flatComments = response.data.comments || [];
      const commentTree = buildCommentTree(flatComments);
      console.log('Built comment tree:', commentTree);

      if (append) {
        setComments(prev => [...prev, ...commentTree]);
      } else {
        setComments(commentTree);
      }

      setHasNextPage(flatComments.length === 20);
      setTotalComments(flatComments.length);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (isOpen && postId) {
      loadComments();
    }
  }, [isOpen, postId, loadComments]);

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      console.log('Submitting comment:', newComment.trim());
      const response = await postsAPI.addComment(postId, newComment.trim());
      console.log('Comment response:', response);
      setNewComment('');
      // Reload comments to get the new one
      await loadComments(1, false);
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyTo || !replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Check if replying to a reply (nested reply)
      const isReplyToReply = replyTo.replyTo !== undefined;
      if (isReplyToReply) {
        await postsAPI.replyToReply(postId, replyTo._id, replyContent.trim());
      } else {
        await postsAPI.replyToComment(postId, replyTo._id, replyContent.trim());
      }
      setReplyContent('');
      setReplyTo(null);
      // Reload comments to get the new reply
      await loadComments(1, false);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCommentLikes = (comments: Comment[], commentId: string, userId: string): Comment[] => {
    return comments.map(comment => {
      if (comment._id === commentId) {
        const isLiked = comment.likes.some(like => like.user === userId);
        const newLikes = isLiked
          ? comment.likes.filter(like => like.user !== userId)
          : [...comment.likes, { user: userId }];
        return { ...comment, likes: newLikes };
      }
      if (comment.replies) {
        return { ...comment, replies: updateCommentLikes(comment.replies, commentId, userId) };
      }
      return comment;
    });
  };

  const handleLikeReply = async (replyId: string) => {
    try {
      await postsAPI.likeReply(postId, replyId);
      // Update local state optimistically
      setComments(prev => updateCommentLikes(prev, replyId, user!._id));
    } catch (error) {
      console.error('Failed to like reply:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const isLiked = comment.likes.some(like => like.user === user?._id);
    const isReply = depth > 0;

    return (
      <div key={comment._id} className={`comment-item ${isReply ? 'reply' : ''}`} style={{ marginLeft: depth * 20 }}>
        <div className="comment-avatar">
          {comment.author.profilePicture ? (
            <img
              src={comment.author.profilePicture}
              alt={comment.author.fullName}
              className="avatar-img"
            />
          ) : (
            <div className="avatar-placeholder">
              {safeRender(comment.author.fullName).charAt(0)}
            </div>
          )}
        </div>

        <div className="comment-content">
          <div className="comment-header">
            <span className="comment-author">
              {safeRender(comment.author.fullName)}
              {comment.author.isVerified && <span className="verified-badge">✓</span>}
            </span>
            <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span>
          </div>

          <p className="comment-text">{safeRender(comment.content)}</p>

          <div className="comment-actions">
            <button
              className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
              onClick={() => handleLikeReply(comment._id)}
            >
              {isLiked ? <MdFavorite /> : <MdFavoriteBorder />}
              <span>{comment.likes.length}</span>
            </button>

            <button
              className="action-btn reply-btn"
              onClick={() => setReplyTo(comment)}
            >
              Reply
            </button>
          </div>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="nested-replies">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderCommentsList = () => {
    return comments.map(comment => renderComment(comment, 0));
  };

  if (!isOpen) return null;

  return (
    <div className="post-comments-modal-overlay" onClick={onClose}>
      <div className="post-comments-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Comments ({totalComments})</h3>
          <button className="close-btn" onClick={onClose}>
            <MdClose />
          </button>
        </div>

        <div className="comments-list">
          {renderCommentsList()}
          {isLoading && (
            <div className="loading-comments">
              <div className="loading-spinner"></div>
              Loading comments...
            </div>
          )}
          {hasNextPage && !isLoading && (
            <button
              className="load-more-btn"
              onClick={() => {
                setPage(prev => prev + 1);
                loadComments(page + 1, true);
              }}
            >
              Load more comments
            </button>
          )}
          <div ref={commentsEndRef} />
        </div>

        {replyTo && (
          <div className="reply-indicator">
            <span>Replying to {safeRender(replyTo.author.fullName)}</span>
            <button
              className="cancel-reply-btn"
              onClick={() => {
                setReplyTo(null);
                setReplyContent('');
              }}
            >
              <MdClose />
            </button>
          </div>
        )}

        <div className="comment-input-section">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.fullName}
              className="input-avatar"
            />
          ) : (
            <div className="input-avatar-placeholder">
              {safeRender(user?.fullName || '').charAt(0)}
            </div>
          )}

          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              placeholder={replyTo ? `Reply to ${replyTo.author.fullName}...` : "Add a comment..."}
              value={replyTo ? replyContent : newComment}
              onChange={(e) => replyTo ? setReplyContent(e.target.value) : setNewComment(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  replyTo ? handleReply() : handleSubmitComment();
                }
              }}
              maxLength={500}
            />

            <button
              className={`send-btn ${((replyTo ? replyContent : newComment).trim() && !isSubmitting) ? 'active' : ''}`}
              onClick={replyTo ? handleReply : handleSubmitComment}
              disabled={!((replyTo ? replyContent : newComment).trim()) || isSubmitting}
            >
              <MdSend />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCommentsModal;
