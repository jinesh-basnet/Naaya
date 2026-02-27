import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FaHeart, FaRegHeart, FaComment, FaShare, FaRegBookmark, FaEllipsisV, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { postsAPI, reelsAPI } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import PostCommentsModal from './PostCommentsModal';
import Avatar from './Avatar';



interface PostViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  userId?: string;
  initialPostId?: string;
  contentType?: 'post' | 'reel';
}

const BACKEND_BASE_URL = 'http://localhost:5000';

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
  const queryClient = useQueryClient();
  const [heartBurst, setHeartBurst] = useState<{ [key: string]: boolean }>({});
  const [expandedCaptions, setExpandedCaptions] = useState<{ [key: string]: boolean }>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<{ id: string; authorId: string; commentsCount: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const postsContainerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['userContentInfinite', username, contentType],
    queryFn: ({ pageParam = 1 }) => {
      if (contentType === 'reel' && userId) {
        return reelsAPI.getUserReels(userId, pageParam, 10);
      }
      return postsAPI.getUserPosts(username, pageParam, 10);
    },
    getNextPageParam: (lastPage, pages) => {
      const totalLoaded = pages.reduce((acc, page) => {
        const items = page.data.posts || page.data.reels || [];
        return acc + items.length;
      }, 0);
      return totalLoaded < lastPage.data.pagination.total ? pages.length + 1 : undefined;
    },
    enabled: isOpen && !!username && (contentType !== 'reel' || !!userId),
  });

  const allPosts = useMemo(() => data?.pages.flatMap(page => page.data.posts || page.data.reels || []) || [], [data]);

  useEffect(() => {
    if (initialPostId && allPosts.length > 0) {
      const index = allPosts.findIndex(post => post._id === initialPostId);
      if (index !== -1) {
        setCurrentIndex(index);
        const post = allPosts[index];
        if (post) {
          setSelectedPostForComments({
            id: post._id,
            authorId: post.author._id,
            commentsCount: post.commentsCount || 0
          });
          setCommentsModalOpen(true);
        }
      }
    }
  }, [initialPostId, allPosts]);

  useEffect(() => {
    if (commentsModalOpen && allPosts[currentIndex]) {
      const post = allPosts[currentIndex];
      setSelectedPostForComments({
        id: post._id,
        authorId: post.author._id,
        commentsCount: post.commentsCount || 0
      });
    }
  }, [currentIndex, allPosts, commentsModalOpen]);

  const handleLike = async (postId: string) => {
    try {
      await postsAPI.likePost(postId);
      toast.success('Post liked!');
    } catch (error) {
      toast.error('Failed to like post');
    }
  };

  const handleSave = async (postId: string) => {
    try {
      await postsAPI.savePost(postId);
      toast.success('Post saved!');
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

  if (!isOpen) return null;

  return (
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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="post-viewer-modal-content"
          >
            <button className="post-viewer-close-btn" onClick={onClose}>
              <FaTimes />
            </button>

            {currentIndex > 0 && (
              <button className="post-viewer-nav-btn prev" onClick={() => setCurrentIndex(currentIndex - 1)}>
                <FaChevronLeft />
              </button>
            )}

            {currentIndex < allPosts.length - 1 && (
              <button className="post-viewer-nav-btn next" onClick={() => setCurrentIndex(currentIndex + 1)}>
                <FaChevronRight />
              </button>
            )}

            <div ref={postsContainerRef} className="post-viewer-posts-container">
              {isLoading ? (
                <div className="loading-spinner" style={{ margin: '50px auto' }}>Loading...</div>
              ) : error ? (
                <div className="error-alert" style={{ margin: '50px auto' }}>Failed to load posts.</div>
              ) : allPosts.length === 0 ? (
                <div className="no-posts" style={{ margin: '50px auto' }}>No posts found.</div>
              ) : (() => {
                const currentPost = allPosts[currentIndex];
                if (!currentPost) {
                  return <div className="loading-spinner" style={{ margin: '50px auto' }}>Loading...</div>;
                }
                const isLiked = (currentPost.likes || []).some((like: { user: string }) => like.user === user?._id) ?? false;
                const isSaved = (currentPost.saves || []).some((save: { user: string }) => save.user === user?._id) ?? false;

                return (
                  <div
                    className={`post-viewer-card ${currentPost.postType === 'reel' ? 'reel-viewer-mode' : ''}`}
                    onDoubleClick={() => handleDoubleTap(currentPost._id)}
                  >
                    <div className="card-content">
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                        {currentPost.author && (
                          <>
                            <Avatar
                              src={currentPost.author.profilePicture}
                              alt={currentPost.author.username}
                              name={typeof currentPost.author.fullName === 'string' ? currentPost.author.fullName : ''}
                              className="avatar"
                              size={32}
                            />
                            <div className="author-box">
                              <div className="name-box">
                                <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                                  {typeof currentPost.author.fullName === 'string' ? currentPost.author.fullName : ''}
                                </span>
                                {currentPost.author.isVerified && (
                                  <div className="verified-badge">
                                    ✓
                                  </div>
                                )}
                              </div>
                              <div className="time-box">
                                <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                  {formatTimeAgo(currentPost.createdAt)}
                                </span>
                                {currentPost.location?.city && (
                                  <>
                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>·</span>
                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                      📍 {currentPost.location.city}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {user?._id === currentPost.author._id && (
                              <button
                                className="icon-button"
                                onClick={async () => {
                                  if (!currentPost) return;
                                  const ok = window.confirm('Are you sure you want to delete this content?');
                                  if (!ok) return;
                                  try {
                                    if (currentPost.postType === 'reel' || contentType === 'reel') {
                                      await reelsAPI.deleteReel(currentPost._id);
                                    } else {
                                      await postsAPI.deletePost(currentPost._id);
                                    }

                                    const updateFn = (oldData: any) => {
                                      if (!oldData) return oldData;
                                      if (oldData.pages) {
                                        return {
                                          ...oldData,
                                          pages: oldData.pages.map((page: any) => {
                                            if (page.data?.posts) {
                                              return { ...page, data: { ...page.data, posts: page.data.posts.filter((p: any) => p._id !== currentPost._id) } };
                                            }
                                            if (page.data?.reels) {
                                              return { ...page, data: { ...page.data, reels: page.data.reels.filter((r: any) => r._id !== currentPost._id) } };
                                            }
                                            return page;
                                          })
                                        };
                                      }
                                      if (oldData.data?.posts) {
                                        return { ...oldData, data: { ...oldData.data, posts: oldData.data.posts.filter((p: any) => p._id !== currentPost._id) } };
                                      }
                                      if (oldData.data?.reels) {
                                        return { ...oldData, data: { ...oldData.data, reels: oldData.data.reels.filter((r: any) => r._id !== currentPost._id) } };
                                      }
                                      return oldData;
                                    };

                                    queryClient.setQueriesData({ queryKey: ['feed'] }, updateFn);
                                    queryClient.setQueriesData({ queryKey: ['userPosts'] }, updateFn);
                                    queryClient.setQueriesData({ queryKey: ['userContentInfinite'] }, updateFn);
                                    queryClient.setQueriesData({ queryKey: ['reels'] }, updateFn);
                                    queryClient.setQueriesData({ queryKey: ['userReels'] }, updateFn);

                                    queryClient.invalidateQueries({ queryKey: ['userPosts'] });
                                    queryClient.invalidateQueries({ queryKey: ['userContentInfinite'] });
                                    queryClient.invalidateQueries({ queryKey: ['profile'] });
                                    queryClient.invalidateQueries({ queryKey: ['feed'] });
                                    toast.success('Deleted successfully');
                                    onClose();
                                  } catch (error) {
                                    console.error('Failed to delete', error);
                                    toast.error('Failed to delete');
                                  }
                                }}
                              >
                                <FaEllipsisV className="icon" />
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {currentPost.content && (
                        <div>
                          {expandedCaptions[currentPost._id] || currentPost.content.length <= 100 ? (
                            <p style={{ marginBottom: 16, whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                              {typeof currentPost.content === 'string' ? currentPost.content : ''}
                            </p>
                          ) : (
                            <p style={{ marginBottom: 16, whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                              {typeof currentPost.content === 'string' ? currentPost.content.slice(0, 100) : ''}... <span style={{ color: '#666', cursor: 'pointer' }} onClick={() => setExpandedCaptions(prev => ({ ...prev, [currentPost._id]: true }))}>more</span>
                            </p>
                          )}
                        </div>
                      )}

                      {currentPost.media && currentPost.media.length > 0 && (
                        <div
                          className="media-box"
                          style={{ position: 'relative' }}
                        >
                          {currentPost.media.map((media: { type: string; url: string; thumbnail?: string; width?: number; height?: number; }, index: number) => {
                            let fullUrl = media.url;
                            if (!fullUrl.startsWith('http')) {
                              const normalizedUrl = fullUrl.replace(/\\/g, '/').replace(/^\/?/, '/');
                              fullUrl = `${BACKEND_BASE_URL}${normalizedUrl}`;
                            }

                            let paddingTop = '56.25%';
                            if (media.width && media.height) {
                              paddingTop = `${(media.height / media.width) * 100}%`;
                            }

                            return (
                              <div
                                key={`${currentPost._id}-${index}`}
                                className="media-item"
                                style={{ paddingTop }}
                              >
                                {media.type === 'image' ? (
                                  <img
                                    src={getMediaUrl(media.url)}
                                    alt="Post content"
                                    className="media-img"
                                  />
                                ) : (
                                  <video
                                    src={getMediaUrl(media.url)}
                                    controls
                                    autoPlay={currentPost.postType === 'reel'}
                                    muted
                                    loop={currentPost.postType === 'reel'}
                                    playsInline
                                    className="media-video"
                                    onError={(e) => {
                                      console.error('Video load error:', e);
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                          <AnimatePresence>
                            {heartBurst[currentPost._id] && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1.5 }}
                                exit={{ scale: 0 }}
                                transition={{ duration: 0.5 }}
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 10,
                                  pointerEvents: 'none'
                                }}
                              >
                                <FaHeart size={50} color="red" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <div className="actions-box">
                        <div className="left-actions">
                          <button
                            className="icon-button"
                            onClick={() => handleLike(currentPost._id)}
                          >
                            {isLiked ? (
                              <FaHeart className="liked-icon" />
                            ) : (
                              <FaRegHeart className="icon" />
                            )}
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => {
                              setSelectedPostForComments({
                                id: currentPost._id,
                                authorId: currentPost.author._id,
                                commentsCount: currentPost.commentsCount || 0
                              });
                              setCommentsModalOpen(true);
                            }}
                          >
                            <FaComment className="icon" />
                          </button>
                          <button className="icon-button">
                            <FaShare className="icon" />
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <button
                            className="icon-button"
                            onClick={() => handleSave(currentPost._id)}
                          >
                            <FaRegBookmark
                              className={isSaved ? "saved-icon" : "icon"}
                              style={isSaved ? { color: '#1976d2' } : {}}
                            />
                          </button>
                          {(currentPost.saves || []).length > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#666', marginTop: 2 }}>
                              {(currentPost.saves || []).length.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        {(currentPost.likes || []).length > 0 && (
                          <p style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: 4 }}>
                            {(currentPost.likes || []).length.toLocaleString()} {(currentPost.likes || []).length === 1 ? 'like' : 'likes'}
                          </p>
                        )}
                        <div>
                          {(currentPost.comments || []).slice(0, 2).map((comment: { _id: string; author: { username: string; fullName: string; profilePicture: string; }; content: string; createdAt: string; }) => (
                            <p key={`${currentPost._id}-${comment._id}`} style={{ fontSize: '0.875rem', marginBottom: 4 }}>
                              <strong>{comment.author.username}</strong> {comment.content}
                            </p>
                          ))}
                        </div>
                        {(currentPost.comments || []).length > 2 && (
                          <p
                            style={{
                              fontSize: '0.875rem',
                              color: '#666',
                              cursor: 'pointer',
                              margin: 0
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#000'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                            onClick={() => {
                              setSelectedPostForComments({
                                id: currentPost._id,
                                authorId: currentPost.author._id,
                                commentsCount: currentPost.commentsCount || 0
                              });
                              setCommentsModalOpen(true);
                            }}
                          >
                            View all {(currentPost.comments || []).length} comments
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </motion.div>
      )}

      {commentsModalOpen && selectedPostForComments && (
        <PostCommentsModal
          isOpen={commentsModalOpen}
          onClose={() => {
            setCommentsModalOpen(false);
            setSelectedPostForComments(null);
          }}
          postId={selectedPostForComments.id}
          postAuthorId={selectedPostForComments.authorId}
          initialCommentsCount={selectedPostForComments.commentsCount}
          contentType={allPosts[currentIndex]?.postType === 'reel' ? 'reel' : 'post'}
        />
      )}
    </AnimatePresence>
  );
};

export default PostViewerModal;
