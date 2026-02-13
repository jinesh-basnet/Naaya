import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdClose, MdSend, MdFavorite, MdFavoriteBorder } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { safeRender } from '../utils/safeRender';
import Avatar from './Avatar';
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
  isReply?: boolean;
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
  const [loadedPostId, setLoadedPostId] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false);


  const loadComments = useCallback(async (pageNum = 1, append = false) => {
    if (!postId || (loadingRef.current && pageNum === 1)) return;

    if (loadedPostId !== postId) {
      setComments([]);
      setPage(1);
      setHasNextPage(false);
      setTotalComments(initialCommentsCount);
      setLoadedPostId(postId);
      append = false;
    }

    loadingRef.current = true;
    setIsLoading(true);
    try {
      const response = await postsAPI.getComments(postId, pageNum);
      const fetchedComments = response.data.comments || [];
      const pagination = response.data.pagination;

      if (append) {
        setComments(prev => [...prev, ...fetchedComments]);
      } else {
        setComments(fetchedComments);
      }

      setPage(pageNum);
      setHasNextPage(pagination ? pageNum < Math.ceil(pagination.total / pagination.limit) : false);
      setTotalComments(pagination ? pagination.total : fetchedComments.length);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [postId, loadedPostId, initialCommentsCount]);

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
      // If depth > 0, it's a nested reply. Use different endpoint for replies to replies.
      if (replyTo.isReply) {
        await postsAPI.replyToReply(postId, replyTo._id, replyContent.trim());
      } else {
        await postsAPI.replyToComment(postId, replyTo._id, replyContent.trim());
      }
      setReplyContent('');
      setReplyTo(null);
      await loadComments(1, false);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (comments.length > 0 && !replyTo) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length, replyTo]);

  const updateCommentLikes = (comments: Comment[], commentId: string, userId: string): Comment[] => {
    return comments.map(comment => {
      if (comment._id === commentId) {
        const isLiked = (comment.likes || []).some(like => like.user === userId);
        const newLikes = isLiked
          ? (comment.likes || []).filter(like => like.user !== userId)
          : [...(comment.likes || []), { user: userId }];
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
    const isLiked = (comment.likes || []).some(like => like.user === user?._id);
    const isReply = depth > 0;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        key={comment._id}
        className={`comment-item ${isReply ? 'reply' : ''}`}
      >
        <div className="avatar-wrapper">
          <Avatar
            src={comment.author.profilePicture}
            alt={comment.author.fullName}
            name={comment.author.fullName}
            size={40}
            className="avatar-img"
          />
        </div>

        <div className="comment-content-wrapper">
          <div className="comment-bubble">
            <span className="comment-author-name">
              {safeRender(comment.author.fullName)}
              {comment.author.isVerified && (
                <span className="verified-badge">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </span>
              )}
            </span>
            <p className="comment-text">{safeRender(comment.content)}</p>

            {(comment.likes || []).length > 0 && (
              <div className="bubble-reactions">
                <div className="reaction-icons">
                  <MdFavorite size={12} />
                </div>
                <span>{(comment.likes || []).length}</span>
              </div>
            )}
          </div>

          <div className="comment-actions-row">
            <button
              className={`action-link ${isLiked ? 'liked' : ''}`}
              onClick={() => handleLikeReply(comment._id)}
            >
              Like
            </button>

            <button
              className="action-link"
              onClick={() => setReplyTo({ ...comment, isReply: depth > 0 })}
            >
              Reply
            </button>
            <span className="comment-time-text">{formatTimeAgo(comment.createdAt)}</span>
          </div>

          {comment.replies && comment.replies.length > 0 && (
            <div className="nested-replies">
              {comment.replies.map(reply => renderComment(reply, depth + 1))}
            </div>
          )}
        </div>
      </motion.div>
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
          <AnimatePresence>
            {renderCommentsList()}
          </AnimatePresence>
          {isLoading && (
            <div className="loading-comments">
              <div className="loading-spinner"></div>
              Loading...
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
              View more comments
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
          <div className="input-container">
            <Avatar
              src={user?.profilePicture}
              alt={user?.fullName || 'User'}
              name={user?.fullName}
              size={32}
              className="input-avatar"
            />

            <div className="input-field-wrapper">
              <input
                ref={inputRef}
                type="text"
                placeholder={replyTo ? `Reply to ${replyTo.author.fullName}...` : "Write a comment..."}
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
                <MdSend size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCommentsModal;
