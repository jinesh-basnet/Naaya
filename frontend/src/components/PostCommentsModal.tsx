import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdClose, MdSend, MdFavorite } from 'react-icons/md';
import { BsReply } from 'react-icons/bs';
import { FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { postsAPI, reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { safeRender } from '../utils/safeRender';
import Avatar from './Avatar';
import DeleteConfirmationModal from './DeleteConfirmationModal';
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
  contentType?: 'post' | 'reel';
  isEmbedded?: boolean;
}

const PostCommentsModal: React.FC<PostCommentsModalProps> = ({
  isOpen,
  onClose,
  postId,
  postAuthorId,
  initialCommentsCount,
  contentType = 'post',
  isEmbedded = false
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
  const [deleteModalConfig, setDeleteModalConfig] = useState<{ isOpen: boolean; commentId: string; isReply: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false);

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

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
      const response = contentType === 'reel'
        ? await reelsAPI.getReelComments(postId, pageNum)
        : await postsAPI.getComments(postId, pageNum);
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
  }, [postId, loadedPostId, initialCommentsCount, contentType]);

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
      if (contentType === 'reel') {
        await reelsAPI.commentReel(postId, newComment.trim());
      } else {
        await postsAPI.addComment(postId, newComment.trim());
      }
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
      if (contentType === 'reel') {
        if (replyTo.isReply) {
          await reelsAPI.replyToReply(postId, replyTo._id, replyContent.trim());
        } else {
          await reelsAPI.replyToComment(postId, replyTo._id, replyContent.trim());
        }
      } else {
        if (replyTo.isReply) {
          await postsAPI.replyToReply(postId, replyTo._id, replyContent.trim());
        } else {
          await postsAPI.replyToComment(postId, replyTo._id, replyContent.trim());
        }
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
      if (contentType === 'reel') {
        await reelsAPI.likeReply(postId, replyId);
      } else {
        await postsAPI.likeReply(postId, replyId);
      }
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

  const handleDeleteComment = async () => {
    if (!deleteModalConfig?.commentId) return;
    try {
      setIsDeleting(true);
      if (contentType === 'reel') {
        if (deleteModalConfig.isReply) {
          await reelsAPI.deleteReply(postId, deleteModalConfig.commentId);
        } else {
          await reelsAPI.deleteComment(postId, deleteModalConfig.commentId);
        }
      } else {
        if (deleteModalConfig.isReply) {
          await postsAPI.deleteReply(postId, deleteModalConfig.commentId);
        } else {
          await postsAPI.deleteComment(postId, deleteModalConfig.commentId);
        }
      }
      await loadComments(1, false);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteModalConfig(null);
    }
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const isLiked = (comment.likes || []).some(like => like.user === user?._id);
    const isReply = depth > 0;
    const canDelete = user?._id === comment.author._id || user?._id === postAuthorId;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedComments.has(comment._id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={comment._id}
        className={`comment-item ${isReply ? 'reply-item' : 'root-item'} depth-${depth}`}
      >
        <div className="comment-main-content">
          <div className="avatar-wrapper">
            <Avatar
              src={comment.author.profilePicture}
              alt={comment.author.fullName}
              name={comment.author.fullName}
              size={isReply ? 38 : 46}
              className="avatar-img"
            />
          </div>

          <div className="comment-content-wrapper">
            <div className="comment-plate-area">
              <div className="comment-plate" onClick={() => setReplyTo({ ...comment, isReply: depth > 0 })}>
                <div className="comment-header">
                  <span className="comment-author-name">
                    {safeRender(comment.author.fullName)}
                    {comment.author.isVerified && (
                      <span className="verified-badge">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </span>
                    )}
                  </span>
                </div>

                <p className="comment-text">{safeRender(comment.content)}</p>

                <div className="comment-footer">
                  <span className="comment-time-text">{formatTimeAgo(comment.createdAt)}</span>
                </div>
              </div>

              <div className="comment-side-blade">
                <button
                  className={`comment-blade-btn ${isLiked ? 'liked' : ''}`}
                  onClick={() => handleLikeReply(comment._id)}
                  title="Like"
                >
                  <MdFavorite size={18} />
                  {(comment.likes || []).length > 0 && (
                    <span className="blade-count">{(comment.likes || []).length}</span>
                  )}
                </button>

                <button
                  className="comment-blade-btn"
                  onClick={() => setReplyTo({ ...comment, isReply: depth > 0 })}
                  title="Reply"
                >
                  <BsReply size={20} />
                </button>

                {canDelete && (
                  <button
                    className="comment-blade-btn delete"
                    onClick={() => setDeleteModalConfig({ isOpen: true, commentId: comment._id, isReply: depth > 0 })}
                    title="Delete"
                  >
                    <FiTrash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {hasReplies && !isReply && (
              <button
                className="toggle-replies-btn"
                onClick={() => toggleReplies(comment._id)}
              >
                <div className="toggle-line" />
                {isExpanded ? 'Hide replies' : `View ${comment.replies!.length} ${comment.replies!.length === 1 ? 'reply' : 'replies'}`}
              </button>
            )}

            <AnimatePresence>
              {hasReplies && (isReply || isExpanded) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="nested-replies"
                >
                  {comment.replies!.map(reply => renderComment(reply, depth + 1))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderCommentsList = () => {
    return comments.map(comment => renderComment(comment, 0));
  };

  if (!isOpen && !isEmbedded) return null;

  const content = (
    <div className={`post-comments-modal ${isEmbedded ? 'embedded' : ''}`} onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Comments ({totalComments})</h3>
        {!isEmbedded && (
          <button className="close-btn" onClick={onClose}>
            <MdClose />
          </button>
        )}
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
          <div className="reply-indicator-content">
            <span className="replying-to-text">Replying to {safeRender(replyTo.author.fullName)}</span>
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

      <DeleteConfirmationModal
        isOpen={deleteModalConfig?.isOpen || false}
        onClose={() => setDeleteModalConfig(null)}
        onConfirm={handleDeleteComment}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        isPending={isDeleting}
      />
    </div>
  );

  if (isEmbedded) return content;

  return (
    <div className="post-comments-modal-overlay" onClick={onClose}>
      {content}
    </div>
  );
};

export default PostCommentsModal;
