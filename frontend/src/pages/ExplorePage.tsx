import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI, postsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  IoSearch,
  IoClose,
  IoStar,
  IoFlash,
  IoPeople,
  IoPersonAdd,
  IoCheckmarkCircle,
  IoShieldCheckmark,
  IoLocation,
  IoGrid,
} from 'react-icons/io5';
import Avatar from '../components/Avatar';
import PostViewerModal from '../components/PostViewerModal';
import './ExplorePage.css';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
  isVerified: boolean;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  location?: { city: string; district?: string };
  bio?: string;
  interests?: string[];
  suggestionScore?: number;
  mutualConnections?: number;
}

const DiscoverPeoplePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loadingUserIds, setLoadingUserIds] = useState<string[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isPostViewerOpen, setIsPostViewerOpen] = useState(false);
  const [activeView, setActiveView] = useState<'posts' | 'people'>('posts');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'people') {
      setActiveView('people');
    } else if (tab === 'posts') {
      setActiveView('posts');
    }

    if (tab) {
    }
  }, [location.search]);

  const { data: suggestionData, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['suggested-users-rgr'],
    queryFn: () => postsAPI.getExploreOverview(50).then(res => res.data),
    staleTime: 60000
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-users', debouncedSearch],
    queryFn: () => usersAPI.searchUsers(debouncedSearch, true).then(res => res.data),
    enabled: debouncedSearch.length > 0,
  });

  // Recommended Posts (Explore Feed)
  const { data: explorePosts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['explore-posts'],
    queryFn: () => postsAPI.getFeed('explore', 1, 30).then(res => res.data),
    staleTime: 60000,
  });

  const displayUsers: User[] = useMemo(() => {
    if (debouncedSearch.length > 0) {
      return searchResults?.users || searchResults || [];
    }
    return suggestionData?.suggestedUsers || [];
  }, [debouncedSearch, searchResults, suggestionData]);

  useEffect(() => {
    const handleFollowUpdate = () => {
      queryClient.invalidateQueries(['suggested-users-rgr']);
      queryClient.invalidateQueries(['search-users']);
    };

    const socket = (window as any).socket;
    if (socket) {
      socket.on('user_followed', handleFollowUpdate);
      socket.on('user_unfollowed', handleFollowUpdate);
    }
    return () => {
      if (socket) {
        socket.off('user_followed', handleFollowUpdate);
        socket.off('user_unfollowed', handleFollowUpdate);
      }
    };
  }, [queryClient]);

  const followMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.followUser(userId),
    onMutate: (userId) => {
      setLoadingUserIds(prev => [...prev, userId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['suggested-users-rgr']);
      queryClient.invalidateQueries(['search-users']);
      toast.success('Following creator');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to follow');
    },
    onSettled: (_, __, userId) => {
      setLoadingUserIds(prev => prev.filter(id => id !== userId));
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.unfollowUser(userId),
    onMutate: (userId) => {
      setLoadingUserIds(prev => [...prev, userId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['suggested-users-rgr']);
      queryClient.invalidateQueries(['search-users']);
      toast.success('Unfollowed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to unfollow');
    },
    onSettled: (_, __, userId) => {
      setLoadingUserIds(prev => prev.filter(id => id !== userId));
    }
  });

  const handleFollowToggle = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    if (loadingUserIds.includes(user._id)) return;

    if (user.isFollowing) {
      unfollowMutation.mutate(user._id);
    } else {
      followMutation.mutate(user._id);
    }
  };

  const handlePostClick = (postId: string) => {
    setSelectedPostId(postId);
    setIsPostViewerOpen(true);
  };

  return (
    <div className="discover-page premium-interface">
      <div className="discovery-aura">
        <div className="aura-orb one" />
        <div className="aura-orb two" />
      </div>

      <header className="discovery-hero">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-text"
        >
          <h1 className="hero-title">Connect with <span className="highlight">more friends</span></h1>
          <p className="hero-subtitle">Discover new users suggested for you by Naaya's recommendation systems.</p>
        </motion.div>

        <div className={`search-super-box ${isSearchFocused ? 'focused' : ''}`}>
          <div className="search-prefix">
            {isSearching && searchQuery ? <div className="loader-spin" /> : <IoSearch />}
          </div>
          <input
            type="text"
            placeholder="Search communities or creators..."
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              <IoClose />
            </button>
          )}
        </div>
      </header>

      <main className="discovery-content">
        <div className="content-stratifier">
          <div className="stratifier-left">
            {!debouncedSearch && (
              <div className="view-selector">
                <button
                  className={`view-tab ${activeView === 'posts' ? 'active' : ''}`}
                  onClick={() => setActiveView('posts')}
                >
                  <IoGrid /> Recommended Posts
                </button>
                <button
                  className={`view-tab ${activeView === 'people' ? 'active' : ''}`}
                  onClick={() => setActiveView('people')}
                >
                  <IoPeople /> Discover People
                </button>
              </div>
            )}

            <h3 className="discovery-section-label">
              {debouncedSearch ? (<><IoSearch /> Search Results</>) : activeView === 'posts' ? (<><IoFlash /> Recommended for You</>) : (<><IoPeople /> Recommended for You</>)}
            </h3>
            <span className="algo-badge">
              <IoShieldCheckmark /> {debouncedSearch ? 'Global Search' : 'Curated for you'}
            </span>
          </div>
          <div className="stratifier-right">
            <div className="user-count">
              {debouncedSearch ? `${displayUsers.length} users found` : activeView === 'posts' ? `${explorePosts?.posts?.length || 0} posts suggested` : `${displayUsers.length} creators suggested`}
            </div>
          </div>
        </div>

        {debouncedSearch || activeView === 'people' ? (
          isLoadingSuggestions || (isSearching && searchQuery) ? (
            <div className="discovery-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="user-skeleton-card" />
              ))}
            </div>
          ) : displayUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="discovery-empty"
            >
              <div className="empty-icon-wrap"><IoPeople /></div>
              <h3>No Users Found</h3>
              <p>The cosmos is quiet. Try another search or refresh your suggestions.</p>
            </motion.div>
          ) : (
            <div className="discovery-grid wide-grid">
              <AnimatePresence mode="popLayout">
                {displayUsers.map((user, idx) => (
                  <motion.div
                    layout
                    key={user._id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: (idx % 20) * 0.05, duration: 0.4 }}
                    className="user-premium-card"
                    onClick={() => navigate(`/profile/${user.username}`)}
                  >
                    <div className="card-top-accent" />

                    <div className="premium-card-header">
                      <div className="avatar-stack">
                        <div className="avatar-aura" />
                        <Avatar src={user.profilePicture} alt={user.username} size={80} />
                        {user.isVerified && <div className="verify-badge-large"><IoStar /></div>}
                      </div>

                      <div className="action-hub">
                        <button
                          className={`follow-btn-round ${user.isFollowing ? 'following' : ''}`}
                          onClick={(e) => handleFollowToggle(e, user)}
                          disabled={loadingUserIds.includes(user._id)}
                        >
                          {loadingUserIds.includes(user._id) ? (
                            <div className="spinner-mini" />
                          ) : user.isFollowing ? (
                            <IoCheckmarkCircle />
                          ) : (
                            <IoPersonAdd />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="premium-card-body">
                      <div className="user-identity">
                        <h4 className="user-full-name">
                          {user.fullName}
                          {user.followersCount && user.followersCount > 1000 && <span className="influence-tag"><IoFlash /> Influencer</span>}
                        </h4>
                        <span className="user-handle">@{user.username}</span>
                      </div>

                      {user.bio && <p className="user-story">{user.bio}</p>}

                      <div className="user-social-stats">
                        <div className="stat-pill">
                          <span className="stat-value">{user.followersCount || 0}</span>
                          <span className="stat-label">Followers</span>
                        </div>
                        {user.mutualConnections !== undefined && user.mutualConnections > 0 && (
                          <div className="stat-pill accent">
                            <span className="stat-value">{user.mutualConnections}</span>
                            <span className="stat-label">Mutual</span>
                          </div>
                        )}
                      </div>

                      {user.interests && user.interests.length > 0 && (
                        <div className="interest-tags">
                          {user.interests.slice(0, 3).map((interest, i) => (
                            <span key={i} className="tag-chip">#{interest}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="premium-card-footer">
                      {user.location?.city ? (
                        <span className="location-hint">
                          <IoLocation /> {user.location.city}
                          {user.location.district ? `, ${user.location.district}` : ''}
                        </span>
                      ) : (
                        <span className="location-hint empty">
                          <IoPeople /> Based in the web
                        </span>
                      )}

                      <button className="view-profile-btn">
                        View Profile
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          isLoadingPosts ? (
            <div className="explore-posts-grid">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="post-skeleton-card" />
              ))}
            </div>
          ) : explorePosts?.posts?.length === 0 ? (
            <div className="discovery-empty">
              <div className="empty-icon-wrap"><IoGrid /></div>
              <h3>No Recommended Posts</h3>
              <p>Start following people to see recommendations here.</p>
            </div>
          ) : (
            <div className="explore-posts-grid">
              {explorePosts.posts.map((post: any, idx: number) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx % 15) * 0.03 }}
                  className="explore-post-card"
                  onClick={() => handlePostClick(post._id)}
                >
                  <img
                    src={post.media?.[0]?.url.startsWith('http') ? post.media[0].url : `http://localhost:5000${post.media?.[0]?.url}`}
                    alt="Explore"
                  />
                  <div className="post-overlay">
                    <div className="overlay-stats">
                      <span><IoStar /> {post.likesCount || 0}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {isPostViewerOpen && selectedPostId && (
          <PostViewerModal
            isOpen={isPostViewerOpen}
            onClose={() => setIsPostViewerOpen(false)}
            username={explorePosts?.posts?.find((p: any) => p._id === selectedPostId)?.author?.username || ''}
            initialPostId={selectedPostId}
          />
        )}
      </main>
    </div>
  );
};

export default DiscoverPeoplePage;
