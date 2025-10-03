import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaComment, FaShare, FaRegBookmark, FaEllipsisV, FaMapMarkerAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { postsAPI, reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCreatePost } from '../contexts/CreatePostContext';
import { locationService, LocationData } from '../services/locationService';
import { offlineQueueService } from '../services/offlineQueueService';
import toast from 'react-hot-toast';
import StoriesBar from '../components/StoriesBar';
import CreatePostModal from '../components/CreatePostModal';
import PullToRefresh from 'react-pull-to-refresh';
import './HomePage.css';

interface HomePageProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

interface Post {
  _id: string;
  content: string;
  media: Array<{
    type: string;
    url: string;
    thumbnail?: string;
  }>;
  author: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture: string;
    isVerified: boolean;
  };
  location: {
    city: string;
    district: string;
  };
  language: string;
  likes: Array<{ user: string }>;
  comments: Array<{
    _id: string;
    author: {
      username: string;
      fullName: string;
      profilePicture: string;
    };
    content: string;
    createdAt: string;
  }>;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  postType: string;
  isReel?: boolean;
}

const BACKEND_BASE_URL = 'http://localhost:5000';

const HomePage: React.FC = () => {
  const { isModalOpen, closeModal } = useCreatePost();
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [showLocationAlert, setShowLocationAlert] = useState(false);
  const [heartBurst, setHeartBurst] = useState<{ [key: string]: boolean }>({});
  const [expandedCaptions, setExpandedCaptions] = useState<{ [key: string]: boolean }>({});
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const storedLocation = locationService.loadLocationFromStorage();
        if (storedLocation) {
          setLocationData(storedLocation);
          setLocationPermission('granted');
        } else {
          const permission = await locationService.requestPermission();
          setLocationPermission(permission.granted ? 'granted' : permission.denied ? 'denied' : 'prompt');

          if (permission.granted) {
            const location = await locationService.getCurrentPosition();
            if (location) {
              setLocationData(location);
              toast.success(`Location detected: ${location.city || 'Unknown location'}`);
            }
          } else if (permission.denied) {
            setShowLocationAlert(true);
          }
        }
      } catch (error) {
        console.error('Location initialization failed:', error);
        setLocationPermission('denied');
        setShowLocationAlert(true);
      }
    };

    initializeLocation();
  }, []);

  const { data: feedData, isLoading, refetch, error } = useQuery({
    queryKey: ['feed', 'posts', locationData?.city],
    queryFn: () => postsAPI.getFeed('fyp'),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, 
    cacheTime: 5 * 60 * 1000, 
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) return false;
      if (error?.response?.status === 429) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  useEffect(() => {
    if (error) {
      const status = error?.response?.status;
      if (status === 401) {
        toast.error('Please log in to view your feed');
        navigate('/login');
      } else if (status === 403) {
        toast.error('Access denied. Please check your permissions.');
      } else if (status === 404) {
        toast.error('Feed service temporarily unavailable');
      } else {
        toast.error('Failed to load posts feed');
      }
    }
  }, [error, navigate]);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleLike = async (postId: string, isReel?: boolean) => {
    const isOnline = offlineQueueService.getIsOnline();

    if (!isOnline) {
      offlineQueueService.addToQueue({
        type: 'like',
        data: { postId, isReel }
      });
      toast.success('Like queued - will sync when online!');
      return;
    }

    try {
      if (isReel) {
        await reelsAPI.likeReel(postId);
        toast.success('Reel liked!');
      } else {
        await postsAPI.likePost(postId);
        toast.success('Post liked!');
      }
      refetch();
    } catch (error) {
      toast.error('Failed to like');
    }
  };


  const handleModalPost = async (post: {
    postType: 'post' | 'reel';
    caption: string;
    media: File | null;
    tags: string[];
    location: string;
    filter?: string;
    brightness?: number;
    contrast?: number;
    editMode?: boolean;
    editPost?: {
      _id: string;
      content: string;
      media: Array<{
        type: string;
        url: string;
      }>;
      tags: string[];
      location: {
        name: string;
      };
    };
  }) => {
    try {
      if (post.editMode && post.editPost) {
        const formData = new FormData();
        formData.append('content', post.caption);
        if (post.media) formData.append('media', post.media);
        formData.append('tags', JSON.stringify(post.tags));
        if (post.location.trim()) {
          formData.append('location', JSON.stringify({ name: post.location }));
        }
        if (post.filter && post.filter !== 'none') {
          formData.append('filter', post.filter);
        }
        if (post.brightness !== undefined) {
          formData.append('brightness', post.brightness.toString());
        }
        if (post.contrast !== undefined) {
          formData.append('contrast', post.contrast.toString());
        }
        await postsAPI.updatePost(post.editPost._id, formData);
        refetch();
        toast.success('Post updated!');
      } else {
        const formData = new FormData();
        const language = user?.languagePreference === 'both' ? 'mixed' : (user?.languagePreference || 'english');
        formData.append('language', language);

        if (post.postType === 'reel') {
          formData.append('caption', post.caption);
          if (post.media) formData.append('video', post.media);
        formData.append('hashtags', JSON.stringify(post.tags));
        if (post.location.trim()) {
          formData.append('location', JSON.stringify({ name: post.location }));
        }
        if (post.filter && post.filter !== 'none') {
          const allowedFilters = ['none', 'clarendon', 'gingham', 'moon', 'lark', 'reyes', 'juno', 'slumber', 'crema', 'ludwig', 'aden', 'perpetua', 'sepia', 'grayscale', 'vintage', 'bright', 'contrast', 'warm', 'cool'];
          if (allowedFilters.includes(post.filter)) {
            formData.append('filter', post.filter);
          }
        }
        const brightness = Math.min(100, Math.max(-100, post.brightness ?? 0));
        const contrast = Math.min(100, Math.max(-100, post.contrast ?? 0));
        formData.append('brightness', brightness.toString());
        formData.append('contrast', contrast.toString());
          await reelsAPI.createReel(formData);
          queryClient.invalidateQueries({ queryKey: ['reels'] });
        } else {
          formData.append('postType', post.postType);
          formData.append('content', post.caption);
          if (post.media) formData.append('media', post.media);
          formData.append('tags', JSON.stringify(post.tags));
          if (post.location.trim()) {
            formData.append('location', JSON.stringify({ name: post.location }));
          }
          if (post.filter && post.filter !== 'none') {
            formData.append('filter', post.filter);
          }
          if (post.brightness && post.brightness !== 100) {
            formData.append('brightness', post.brightness.toString());
          }
          if (post.contrast && post.contrast !== 100) {
            formData.append('contrast', post.contrast.toString());
          }
          await postsAPI.createPost(formData);
        }
        refetch();
        toast.success(`${post.postType === 'reel' ? 'Reel' : 'Post'} shared!`);
      }
    } catch (error: any) {
      console.error('Error sharing post:', error);
      if (error.response && error.response.data) {
        toast.error(`Failed to ${post.editMode ? 'update' : 'share'} ${post.postType}: ${error.response.data.message || 'Unknown error'}`);
      } else {
        toast.error(`Failed to ${post.editMode ? 'update' : 'share'} ${post.postType}`);
      }
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

  const posts = feedData?.data?.posts || [];

  const filteredPosts = posts.filter((post: Post) => post.postType === 'post');

  const handleDoubleTap = (postId: string, isReel?: boolean) => {
    const isLiked = (filteredPosts.find((p: Post) => p._id === postId)?.likes || []).some((like: { user: string }) => like.user === user?._id) ?? false;
    if (!isLiked) {
      handleLike(postId, isReel);
    }
    setHeartBurst(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => setHeartBurst(prev => ({ ...prev, [postId]: false })), 500);
  };

  return (
    <div className="home-page">
      <div className="container">
        <StoriesBar isCollapsed={false} setIsCollapsed={() => {}} />

        {showLocationAlert && locationPermission === 'denied' && (
          <div className="alert">
            Enable location to see posts from people near you and discover local content!
            <button
              className="button"
              onClick={async () => {
                try {
                  const permission = await locationService.requestPermission();
                  setLocationPermission(permission.granted ? 'granted' : 'denied');

                  if (permission.granted) {
                    const location = await locationService.getCurrentPosition();
                    if (location) {
                      setLocationData(location);
                      setShowLocationAlert(false);
                      toast.success(`Location detected: ${location.city || 'Unknown location'}`);
                    }
                  }
                } catch (error) {
                  toast.error('Failed to get location permission');
                }
              }}
            >
              <FaMapMarkerAlt style={{ fontSize: 16, marginRight: 4 }} />
              Enable Location
            </button>
          </div>
        )}

        {locationData && (
          <div className="location-box">
            <FaMapMarkerAlt style={{ fontSize: 16, color: '#1976d2' }} />
            <span style={{ fontSize: '0.875rem', color: '#666' }}>
              Showing content near {locationData.city || 'your location'}
            </span>
            <span className="chip" style={{ borderColor: '#1976d2', color: '#1976d2' }}>
              Local
            </span>
          </div>
        )}

        <PullToRefresh
          onRefresh={handleRefresh}
          distanceToRefresh={60}
          resistance={2}
          className="pull-to-refresh"
        >
          {isLoading ? (
            <div className="loading-skeleton">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-content">
                    <div className="skeleton-header">
                      <div className="skeleton-avatar"></div>
                      <div className="skeleton-text">
                        <div style={{ width: '60%', height: 20, background: '#f5f5f5', borderRadius: 4 }}></div>
                        <div style={{ width: '40%', height: 16, background: '#f5f5f5', borderRadius: 4 }}></div>
                      </div>
                    </div>
                    <div className="skeleton-rect"></div>
                    <div className="skeleton-actions">
                      <div style={{ width: '20%', height: 16, background: '#f5f5f5', borderRadius: 4 }}></div>
                      <div style={{ width: '30%', height: 16, background: '#f5f5f5', borderRadius: 4 }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="posts-container">
              {filteredPosts.map((post: Post, index: number) => {
                const isLiked = (post.likes || []).some(like => like.user === user?._id) ?? false;

                return (
                  <motion.div
                    key={`${post._id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="card">
                      <div className="card-content">
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                          {post.author && (
                            <>
                              <img
                                src={post.author.profilePicture}
                                alt={post.author.username}
                                className="avatar"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                              <div className="avatar-fallback" style={{ display: 'none', width: 32, height: 32, border: '1px solid #e0e0e0', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', fontSize: 14, fontWeight: 'bold' }}>
                                {typeof post.author.fullName === 'string' ? post.author.fullName.charAt(0) : 'U'}
                              </div>
                              <div className="author-box">
                                <div className="name-box">
                                  <span
                                    style={{ fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer' }}
                                    onClick={() => {
                                      if (post.author._id !== user?._id) {
                                        navigate(`/profile/${post.author.username}`);
                                      }
                                    }}
                                  >
                                    {typeof post.author.fullName === 'string' ? post.author.fullName : ''}
                                  </span>
                                  {post.author.isVerified && (
                                    <div className="verified-badge">
                                      ✓
                                    </div>
                                  )}
                                </div>
                                <div className="time-box">
                                  <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                    {formatTimeAgo(post.createdAt)}
                                  </span>
                                  {post.location?.city && (
                                    <>
                                      <span style={{ fontSize: '0.75rem', color: '#666' }}>·</span>
                                      <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                        📍 {post.location.city}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <button className="icon-button">
                                <FaEllipsisV className="icon" />
                              </button>
                            </>
                          )}
                        </div>

                        {post.content && (
                          <div>
                            {expandedCaptions[post._id] || post.content.length <= 100 ? (
                              <p style={{ marginBottom: 16, whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                {typeof post.content === 'string' ? post.content : ''}
                              </p>
                            ) : (
                              <p style={{ marginBottom: 16, whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                {typeof post.content === 'string' ? post.content.slice(0, 100) : ''}... <span style={{ color: '#666', cursor: 'pointer' }} onClick={() => setExpandedCaptions(prev => ({ ...prev, [post._id]: true }))}>more</span>
                              </p>
                            )}
                          </div>
                        )}

                        {post.media && post.media.length > 0 && (
                          <div
                            className="media-box"
                            onDoubleClick={() => handleDoubleTap(post._id, post.isReel)}
                            style={{ position: 'relative' }}
                          >
                            {post.isReel ? (
                              <video
                                src={post.media[0].url.startsWith('http') ? post.media[0].url : `${BACKEND_BASE_URL}${post.media[0].url}`}
                                controls
                                className="media-video"
                              />
                            ) : (
post.media.map((media, index) => {
  let fullUrl = media.url;
  if (!fullUrl.startsWith('http')) {
    const normalizedUrl = fullUrl.replace(/\\/g, '/').replace(/^\/?/, '/');
    fullUrl = `${BACKEND_BASE_URL}${normalizedUrl}`;
  }

  return (
    <div
      key={`${post._id}-${index}`}
      className="media-item"
      style={media.type === 'video' ? { paddingTop: '56.25%' } : {}}
    >
      {media.type === 'image' ? (
        <img
          src={fullUrl}
          alt="Post content"
          className="media-img"
        />
      ) : (
        <video
          src={fullUrl}
          controls
          className="media-video"
        />
      )}
    </div>
  );
})
                            )}
                            <AnimatePresence>
                              {heartBurst[post._id] && (
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
                              onClick={() => handleLike(post._id, post.isReel)}
                            >
                              {isLiked ? (
                                <FaHeart className="liked-icon" />
                              ) : (
                                <FaRegHeart className="icon" />
                              )}
                            </button>
                            <button className="icon-button">
                              <FaComment className="icon" />
                            </button>
                            <button className="icon-button">
                              <FaShare className="icon" />
                            </button>
                          </div>
                          <button className="icon-button">
                            <FaRegBookmark className="icon" />
                          </button>
                        </div>

                        <div style={{ marginBottom: 8 }}>
                          {post.likesCount > 0 && (
                            <p style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: 4 }}>
                              {post.likesCount.toLocaleString()} {post.likesCount === 1 ? 'like' : 'likes'}
                            </p>
                          )}
                          <div>
                            {(post.comments || []).slice(0, 2).map((comment) => (
                              <p key={`${post._id}-${comment._id}`} style={{ fontSize: '0.875rem', marginBottom: 4 }}>
                                <strong>{comment.author.username}</strong> {comment.content}
                              </p>
                            ))}
                          </div>
                          {post.commentsCount > 2 && (
                            <p
                              style={{ fontSize: '0.875rem', color: '#666', cursor: 'pointer' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#000'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                            >
                              View all {post.commentsCount} comments
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </PullToRefresh>

        {filteredPosts.length === 0 && !isLoading && (
          <div className="no-posts">
            <h6 style={{ color: '#666', marginBottom: 8 }}>
              No posts yet
            </h6>
            <p style={{ color: '#666' }}>
              Be the first to share something amazing!
            </p>
          </div>
        )}
      </div>

      <CreatePostModal
        open={isModalOpen}
        onClose={closeModal}
        onPost={handleModalPost}
        editMode={false}
      />
    </div>
  );
};

export default HomePage;
