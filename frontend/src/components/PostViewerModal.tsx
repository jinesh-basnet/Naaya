import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaComment, FaShare, FaRegBookmark, FaEllipsisV, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { postsAPI, reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import PostCommentsModal from './PostCommentsModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Avatar from './Avatar';
import BookmarkCollectionsModal from './BookmarkCollectionsModal';
import './PostViewerModal.css';




interface PostViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  userId?: string;
  initialPostId?: string;
  contentType?: 'post' | 'reel' | 'saved';
}

const BACKEND_BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';


const getMediaUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const normalizedUrl = url.replace(/\\/g, '/').replace(/^\/?/, '/');
  return `${BACKEND_BASE_URL}${normalizedUrl}`;
};

const PostViewerModal: React.FC<PostViewerModalProps> = ({
  isOpen,
  onClose,
  username,
  userId,
  initialPostId,
  contentType = 'post'
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [heartBurst, setHeartBurst] = useState<{ [key: string]: boolean }>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['userContentInfinite', username, contentType],
    queryFn: ({ pageParam = 1 }) => {
      if (contentType === 'reel' && userId) {
        return reelsAPI.getUserReels(userId, pageParam, 12);
      }
      if (contentType === 'saved') {
        return postsAPI.getUserBookmarks(pageParam, 12);
      }
      return postsAPI.getUserPosts(username, pageParam, 12);
    },
    getNextPageParam: (lastPage, pages) => {
      const items = lastPage.data.posts || lastPage.data.reels || [];
      return items.length === 12 ? pages.length + 1 : undefined;
    },
    enabled: isOpen && !!username && (contentType !== 'reel' || !!userId),
  });

  const allPosts = useMemo(() => data?.pages.flatMap(page => page.data.posts || page.data.reels || []) || [], [data]);

  useEffect(() => {
    if (initialPostId && allPosts.length > 0) {
      const index = allPosts.findIndex(post => post._id === initialPostId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [initialPostId, allPosts]);

  const handleLike = async (postId: string) => {
    const isReel = currentPost?.postType === 'reel' || currentPost?.isReel || contentType === 'reel';
    try {
      if (isReel) {
        await reelsAPI.likeReel(postId);
      } else {
        await postsAPI.likePost(postId);
      }
      queryClient.invalidateQueries({ queryKey: ['userContentInfinite'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['userReels'] });
    } catch (error) {
      toast.error('Failed to like post');
    }
  };

  const handleSave = async (postId: string) => {
    const isReel = currentPost?.postType === 'reel' || currentPost?.isReel || contentType === 'reel';
    try {
      if (isReel) {
        await reelsAPI.saveReel(postId);
      } else {
        await postsAPI.savePost(postId);
      }
      queryClient.invalidateQueries({ queryKey: ['userContentInfinite'] });
      toast.success(isReel ? 'Reel saved!' : 'Post saved!');
    } catch (error) {
      toast.error('Failed to save post');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDoubleTap = (postId: string) => {
    const post = allPosts.find(p => p._id === postId);
    const isLiked = (post?.likes || []).some((like: { user: string }) => like.user === user?._id) ?? false;
    if (!isLiked) {
      handleLike(postId);
    }
    setHeartBurst(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => setHeartBurst(prev => ({ ...prev, [postId]: false })), 500);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < allPosts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!isOpen) return null;

  const currentPost = allPosts[currentIndex];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="post-viewer-modal-overlay"
          onClick={(e) => {
            if (e.target === modalRef.current) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="post-viewer-wrapper"
          >
            <button className="post-viewer-close-btn" onClick={onClose} aria-label="Close modal">
              <FaTimes />
            </button>

            <div className="post-viewer-main">
              <div className="post-viewer-media-section" onDoubleClick={() => currentPost && handleDoubleTap(currentPost._id)}>
                {isLoading ? (
                  <div className="viewer-placeholder">
                    <div className="spinner-glow" />
                    <p>Loading your content...</p>
                  </div>
                ) : error ? (
                  <div className="viewer-placeholder">
                    <p>Failed to load media. Please try again.</p>
                  </div>
                ) : !currentPost ? (
                  <div className="viewer-placeholder">
                    <p>Post no longer available</p>
                  </div>
                ) : (
                  <>
                    <div className="media-container">
                      {currentPost.postType === 'reel' || currentPost.video ? (
                        <div className="media-slide">
                          <video
                            src={getMediaUrl(currentPost.video?.url || (currentPost.media?.[0]?.type === 'video' ? currentPost.media[0].url : ''))}
                            controls
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="viewer-video"
                          />
                        </div>
                      ) : (
                        currentPost.media && currentPost.media.map((media: any, idx: number) => (
                          <div key={idx} className="media-slide">
                            {media.type === 'image' ? (
                              <img src={getMediaUrl(media.url)} alt="Full Post Content" />
                            ) : (
                              <video
                                src={getMediaUrl(media.url)}
                                controls
                                autoPlay={currentPost.postType === 'reel'}
                                muted
                                loop={currentPost.postType === 'reel'}
                                playsInline
                              />
                            )}
                          </div>
                        ))
                      )}

                      <AnimatePresence>
                        {heartBurst[currentPost._id] && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="heart-burst"
                          >
                            <FaHeart />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {currentIndex > 0 && (
                      <button className="nav-btn prev" onClick={handlePrev} aria-label="Previous post">
                        <FaChevronLeft />
                      </button>
                    )}
                    {currentIndex < allPosts.length - 1 && (
                      <button className="nav-btn next" onClick={handleNext} aria-label="Next post">
                        <FaChevronRight />
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="post-viewer-sidebar">
                {currentPost && (
                  <>
                    <div className="sidebar-header">
                      <div className="author-info" onClick={() => navigate(`/profile/${currentPost.author.username}`)}>
                        <Avatar
                          src={currentPost.author.profilePicture}
                          alt={currentPost.author.username}
                          size={32}
                        />
                        <div className="author-details">
                          <span className="username">{currentPost.author.username}</span>
                          <span className="location">{currentPost.location?.city || formatTimeAgo(currentPost.createdAt)}</span>
                        </div>
                      </div>
                      {user?._id === currentPost.author._id && (
                        <button className="action-more" onClick={() => setShowDeleteModal(true)} title="Delete post">
                          <FaEllipsisV />
                        </button>
                      )}
                    </div>

                    <div className="sidebar-content">
                      <div className="post-caption-row">
                        <Avatar
                          src={currentPost.author.profilePicture}
                          alt={currentPost.author.username}
                          size={32}
                        />
                        <div className="caption-text">
                          <span className="username">{currentPost.author.username}</span>
                          <p>{currentPost.content}</p>
                          <span className="time">{formatTimeAgo(currentPost.createdAt)}</span>
                        </div>
                      </div>

                      <div className="integrated-comments">
                        <PostCommentsModal
                          isOpen={true}
                          onClose={() => { }}
                          postId={currentPost._id}
                          postAuthorId={currentPost.author._id}
                          initialCommentsCount={currentPost.commentsCount || 0}
                          contentType={currentPost.postType === 'reel' ? 'reel' : 'post'}
                          isEmbedded={true}
                        />
                      </div>
                    </div>

                    <div className="sidebar-footer">
                      <div className="action-buttons">
                        <div className="left-group">
                          <button
                            className={`action-btn ${currentPost.likes?.some((l: any) => l.user === user?._id) ? 'liked' : ''}`}
                            onClick={() => handleLike(currentPost._id)}
                            aria-label="Like post"
                          >
                            {currentPost.likes?.some((l: any) => l.user === user?._id) ? <FaHeart /> : <FaRegHeart />}
                          </button>
                          <button className="action-btn" aria-label="Comment">
                            <FaComment />
                          </button>
                          <button className="action-btn" aria-label="Share">
                            <FaShare />
                          </button>
                        </div>
                          <button
                            className={`action-btn ${currentPost.saves?.some((s: any) => s.user === user?._id) ? 'saved' : ''}`}
                            onClick={() => handleSave(currentPost._id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setIsCollectionsModalOpen(true);
                            }}
                            aria-label="Save post"
                          >
                            {currentPost.saves?.some((s: any) => s.user === user?._id) ? <FaRegBookmark style={{ color: 'var(--primary-main)' }} /> : <FaRegBookmark />}
                          </button>
                      </div>
                      <div className="stats-row">
                        <span className="likes-count">{(currentPost.likes || []).length.toLocaleString()} likes</span>
                        <span className="date-footer">{new Date(currentPost.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {currentPost && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              if (currentPost.postType === 'reel' || contentType === 'reel') {
                await reelsAPI.deleteReel(currentPost._id);
              } else {
                await postsAPI.deletePost(currentPost._id);
              }
              toast.success('Deleted successfully');

              queryClient.invalidateQueries({ queryKey: ['userContentInfinite'] });
              queryClient.invalidateQueries({ queryKey: ['userPosts'] });
              queryClient.invalidateQueries({ queryKey: ['userReels'] });
              queryClient.invalidateQueries({ queryKey: ['feed'] });
              queryClient.invalidateQueries({ queryKey: ['reelsFeed'] });

              setShowDeleteModal(false);
              onClose();
            } catch (error) {
              toast.error('Failed to delete');
            } finally {
              setIsDeleting(false);
            }
          }}
          title={`Delete ${contentType === 'reel' ? 'Reel' : 'Post'}?`}
          message={`Are you sure you want to delete this ${contentType === 'reel' ? 'reel' : 'post'}? This action cannot be undone.`}
          isPending={isDeleting}
        />
      )}

      {isCollectionsModalOpen && currentPost && (
        <BookmarkCollectionsModal
          open={isCollectionsModalOpen}
          onClose={() => setIsCollectionsModalOpen(false)}
          postId={(currentPost.postType === 'reel' || currentPost.video || contentType === 'reel') ? undefined : currentPost._id}
          reelId={(currentPost.postType === 'reel' || currentPost.video || contentType === 'reel') ? currentPost._id : undefined}
        />
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PostViewerModal;
