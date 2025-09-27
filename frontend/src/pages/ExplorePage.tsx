import React, { useState } from 'react';
import { FaSearch, FaTimes, FaHeart, FaComment, FaCompass, FaChartLine, FaMapMarkerAlt } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
}

const BACKEND_BASE_URL = 'http://localhost:5000';

const ExplorePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: exploreData, isLoading } = useQuery({
    queryKey: ['explore', activeTab],
    queryFn: () => {
      switch (activeTab) {
        case 0:
          return postsAPI.getFeed('explore');
        case 1:
          return postsAPI.getFeed('trending');
        case 2:
          return postsAPI.getFeed('nearby');
        default:
          return postsAPI.getFeed('explore');
      }
    },
  });

  const { data: searchResults, refetch: searchRefetch } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => postsAPI.searchPosts(searchQuery),
    enabled: searchQuery.length > 2,
  });

  const posts = searchQuery.length > 2 ? (searchResults?.data?.posts || []) : (exploreData?.data?.posts || []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      searchRefetch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
  };

  const tabLabels = ['For You', 'Trending', 'Nearby'];

  return (
    <div className="explore-container">
      <div className="explore-inner">
        {/* Search Bar */}
        <div className="search-paper">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search posts, people, or places..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-icon" onClick={handleClearSearch}>
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {!searchQuery && (
          <div className="tabs-container">
            <div className="tabs">
              {tabLabels.map((label, index) => (
                <button
                  key={label}
                  className={`tab ${activeTab === index ? 'active' : ''}`}
                  onClick={() => setActiveTab(index)}
                >
                  {index === 0 && <FaCompass />}
                  {index === 1 && <FaChartLine />}
                  {index === 2 && <FaMapMarkerAlt />}
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results Header */}
        {searchQuery && (
          <div className="search-header">
            <h2 className="search-title">Search results for "{searchQuery}"</h2>
            <p className="search-subtitle">{posts.length} posts found</p>
          </div>
        )}

        {/* Posts Grid */}
        {isLoading ? (
          <div className="posts-grid">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="skeleton"></div>
            ))}
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map((post: Post) => {
              const mediaUrl = post.media?.[0]?.url;
              const normalizedUrl = mediaUrl?.replace(/\\/g, '/').replace(/^\/?/, '/');
              const fullUrl = mediaUrl ? `${BACKEND_BASE_URL}${normalizedUrl}` : '';

              return (
                <motion.div
                  key={post._id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="post-card" onClick={() => handlePostClick(post)}>
                    {post.media?.[0] && (
                      <>
                        {post.media[0].type === 'image' ? (
                          <img className="post-media" src={fullUrl} alt="Post" />
                        ) : (
                          <video className="post-media" src={fullUrl} />
                        )}

                        {/* Overlay with stats */}
                        <div className="overlay">
                          <div className="overlay-stats">
                            <div className="stat">
                              <FaHeart />
                              <span className="stat-text">{post.likesCount}</span>
                            </div>
                            <div className="stat">
                              <FaComment />
                              <span className="stat-text">{post.commentsCount}</span>
                            </div>
                          </div>
                        </div>

                        {/* Multiple media indicator */}
                        {post.media.length > 1 && (
                          <div className="media-count">
                            <span className="media-count-text">{post.media.length}</span>
                          </div>
                        )}

                        {/* Video indicator */}
                        {post.media[0]?.type === 'video' && (
                          <div className="video-indicator">
                            <span className="video-indicator-text">▶</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {posts.length === 0 && !isLoading && (
          <div className="empty-state">
            <FaCompass className="empty-icon" />
            <h2 className="empty-title">{searchQuery ? 'No results found' : 'Explore posts'}</h2>
            <p className="empty-subtitle">
              {searchQuery ? 'Try adjusting your search terms' : 'Discover amazing content from your community'}
            </p>
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            {/* Media */}
            <div className="modal-media">
              {selectedPost.media?.[0] && (
                <>
                  {selectedPost.media[0].type === 'image' ? (
                    <img
                      src={`${BACKEND_BASE_URL}${selectedPost.media[0].url.replace(/\\/g, '/').replace(/^\/?/, '/')}`}
                      alt="Post"
                    />
                  ) : (
                    <video
                      src={`${BACKEND_BASE_URL}${selectedPost.media[0].url.replace(/\\/g, '/').replace(/^\/?/, '/')}`}
                      controls
                    />
                  )}
                </>
              )}
            </div>

            {/* Details */}
            <div className="modal-details">
              {/* Header */}
              <div className="modal-header">
                <img
                  src={selectedPost.author.profilePicture}
                  alt={selectedPost.author.fullName}
                  className="modal-avatar"
                />
                <div className="modal-author">
                  <p className="modal-author-name">{selectedPost.author.fullName}</p>
                  <p className="modal-location">
                    {selectedPost.location?.city && `📍 ${selectedPost.location.city}`}
                  </p>
                </div>
              </div>

              {/* Content */}
              <p className="modal-content-text">{selectedPost.content}</p>

              {/* Actions */}
              <div className="modal-actions">
                <button className="action-button">
                  <FaHeart />
                </button>
                <button className="action-button">
                  <FaComment />
                </button>
                <span className="likes-text">{selectedPost.likesCount} likes</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
