import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { postsAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  IoSearch,
  IoClose,
  IoHeart,
  IoChatbubble,
  IoCompass,
  IoTrendingUp,
  IoPeople,
  IoPlay,
  IoImages,
  IoGrid,
  IoList,
  IoFilter
} from 'react-icons/io5';
import Suggestions from '../components/Suggestions';
import Avatar from '../components/Avatar';
import './ExplorePage.css';

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
  comments: Array<any>;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
}

interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
  isVerified: boolean;
}

const BACKEND_BASE_URL = 'http://localhost:5000';

const categories = [
  { id: 'all', label: 'All', icon: <IoGrid /> },
  { id: 'photos', label: 'Photos', icon: <IoImages /> },
  { id: 'videos', label: 'Videos', icon: <IoPlay /> },
];

const ExplorePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: exploreData, isLoading } = useQuery({
    queryKey: ['explore', activeTab],
    queryFn: () => {
      switch (activeTab) {
        case 0:
          return postsAPI.getFeed('explore');
        case 1:
          return postsAPI.getFeed('trending');
        case 2:
          return postsAPI.getFeed('friends');
        default:
          return postsAPI.getFeed('explore');
      }
    },
  });

  const { data: postSearchResults, isLoading: isSearchingPosts } = useQuery({
    queryKey: ['search-posts', debouncedSearch],
    queryFn: () => postsAPI.searchPosts(debouncedSearch),
    enabled: debouncedSearch.length > 1,
  });

  const { data: userSearchResults, isLoading: isSearchingUsers } = useQuery({
    queryKey: ['search-users', debouncedSearch],
    queryFn: () => usersAPI.searchUsers(debouncedSearch),
    enabled: debouncedSearch.length > 1,
  });

  const isSearchActive = searchQuery.length > 0;
  const isActuallySearching = debouncedSearch.length > 1;

  let posts = isActuallySearching
    ? (postSearchResults?.data?.posts || (postSearchResults as any)?.posts || (postSearchResults as any)?.data || [])
    : (exploreData?.data?.posts || (exploreData as any)?.posts || (exploreData as any)?.data || []);

  const foundUsers: User[] = isActuallySearching
    ? (userSearchResults?.data?.users || (userSearchResults as any)?.users || (userSearchResults as any)?.data || [])
    : [];

  if (selectedCategory !== 'all') {
    posts = posts.filter((post: Post) => {
      if (selectedCategory === 'photos') {
        return post.media?.[0]?.type === 'image';
      }
      if (selectedCategory === 'videos') {
        return post.media?.[0]?.type === 'video';
      }
      return true;
    });
  }

  const tabLabels = [
    { id: 0, label: 'For You', icon: <IoCompass /> },
    { id: 1, label: 'Trending', icon: <IoTrendingUp /> },
    { id: 2, label: 'Friends', icon: <IoPeople /> },
  ];

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
  };

  const getMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const normalizedUrl = url.replace(/\\/g, '/').replace(/^\/?/, '/');
    return `${BACKEND_BASE_URL}${normalizedUrl}`;
  };

  return (
    <div className="explore-page">
      <div className="explore-header">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="explore-title-section"
        >
          <h1 className="explore-title">Explore</h1>
          <p className="explore-subtitle">Discover what's trending across Naaya</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="search-container"
        >
          <div className={`search-box ${isSearchFocused ? 'focused' : ''}`}>
            <div className="search-icon-wrapper">
              {isSearchingPosts || isSearchingUsers ? (
                <div className="search-loading-spinner" />
              ) : (
                <IoSearch className="search-icon" />
              )}
            </div>
            <input
              type="text"
              className="search-input"
              placeholder="Search posts, people, or places..."
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-btn" onClick={() => { setSearchQuery(''); setDebouncedSearch(''); }}>
                <IoClose />
              </button>
            )}
          </div>
        </motion.div>

        {!searchQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="tabs-section"
          >
            <div className="tabs">
              {tabLabels.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="controls-section"
        >
          <div className="category-filters">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon}
                <span>{category.label}</span>
              </button>
            ))}
          </div>

          <div className="view-controls">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <IoGrid />
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <IoList />
            </button>
          </div>
        </motion.div>
      </div>

      {isActuallySearching && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="search-results-layout"
        >
          {foundUsers.length > 0 && (
            <div className="found-users-section">
              <h3 className="section-subtitle">People</h3>
              <div className="found-users-grid">
                {foundUsers.slice(0, 5).map((u: any) => (
                  <div key={u._id} className="user-search-card" onClick={() => navigate(`/profile/${u.username}`)}>
                    <Avatar src={u.profilePicture} alt={u.fullName} size={48} />
                    <div className="user-search-info">
                      <span className="user-full-name">{u.fullName}</span>
                      <span className="user-username">@{u.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="search-results-header">
            <h3 className="section-subtitle">Top Results</h3>
            <p className="results-count">{posts.length} results found</p>
          </div>
        </motion.div>
      )}

      <div className="explore-content">
        {isLoading ? (
          <div className={`posts-${viewMode}`}>
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="skeleton-card"></div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="empty-state"
          >
            <IoCompass className="empty-icon" />
            <h2>{searchQuery ? 'No results found' : 'No posts yet'}</h2>
            <p>
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Discover amazing content from your community'}
            </p>
          </motion.div>
        ) : (
          <div className={`posts-${viewMode}`}>
            <AnimatePresence mode="popLayout">
              {posts.map((post: Post, index: number) => {
                const fullUrl = getMediaUrl(post.media?.[0]?.url);

                return (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      duration: 0.5,
                      delay: index % 10 * 0.05,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className="post-card"
                    onClick={() => handlePostClick(post)}
                  >
                    {post.media?.[0] && (
                      <div className="post-media-container">
                        {post.media[0].type === 'image' ? (
                          <img className="post-media" src={fullUrl} alt="Post" loading="lazy" />
                        ) : (
                          <video className="post-media" src={fullUrl} muted playsInline loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                        )}

                        <div className="post-overlay">
                          <div className="overlay-stats">
                            <div className="stat">
                              <IoHeart />
                              <span>{post.likesCount}</span>
                            </div>
                            <div className="stat">
                              <IoChatbubble />
                              <span>{post.commentsCount}</span>
                            </div>
                          </div>
                        </div>

                        {post.media.length > 1 && (
                          <div className="media-badge">
                            <IoImages />
                            <span>{post.media.length}</span>
                          </div>
                        )}

                        {post.media[0]?.type === 'video' && (
                          <div className="video-badge">
                            <IoPlay />
                          </div>
                        )}
                      </div>
                    )}

                    {viewMode === 'list' && (
                      <div className="post-info">
                        <div className="post-author">
                          <Avatar
                            src={post.author.profilePicture}
                            alt={post.author.fullName}
                            name={post.author.fullName}
                            size={36}
                            className="author-avatar"
                          />
                          <div className="author-meta">
                            <p className="author-name">{post.author.fullName}</p>
                            <p className="post-location">
                              {post.location?.city && `📍 ${post.location.city}`}
                            </p>
                          </div>
                        </div>
                        <p className="post-content">{post.content}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 2 && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="suggestions-container"
          >
            <Suggestions />
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={handleCloseModal}>
                <IoClose />
              </button>

              <div className="modal-content">
                <div className="modal-media">
                  {selectedPost.media?.[0] && (
                    <>
                      {selectedPost.media[0].type === 'image' ? (
                        <img
                          src={getMediaUrl(selectedPost.media[0].url)}
                          alt="Post"
                        />
                      ) : (
                        <video
                          src={getMediaUrl(selectedPost.media[0].url)}
                          controls
                          autoPlay
                          loop
                        />
                      )}
                    </>
                  )}
                </div>

                <div className="modal-details">
                  <div className="modal-header">
                    <img
                      src={selectedPost.author.profilePicture}
                      alt={selectedPost.author.fullName}
                      className="modal-avatar"
                    />
                    <div className="modal-author-info">
                      <p
                        className="modal-author-name"
                        onClick={() => {
                          if (selectedPost.author._id !== user?._id) {
                            navigate(`/profile/${selectedPost.author.username}`);
                            handleCloseModal();
                          }
                        }}
                      >
                        {selectedPost.author.fullName}
                      </p>
                      {selectedPost.location?.city && (
                        <p className="modal-location">📍 {selectedPost.location.city}</p>
                      )}
                    </div>
                  </div>

                  <div className="modal-body">
                    <p className="modal-content-text">{selectedPost.content}</p>
                  </div>

                  <div className="modal-footer">
                    <div className="modal-actions">
                      <button className="action-btn">
                        <IoHeart />
                      </button>
                      <button className="action-btn">
                        <IoChatbubble />
                      </button>
                    </div>
                    <p className="likes-count">{selectedPost.likesCount} likes</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExplorePage;
