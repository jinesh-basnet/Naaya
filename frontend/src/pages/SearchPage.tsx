import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, postsAPI, reelsAPI } from '../services/api';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import './SearchPage.css';

type User = {
  _id: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  isVerified: boolean;
  bio?: string;
  location?: any;
  isFollowing?: boolean;
};

type Post = {
  _id: string;
  content: string;
  author: User;
  createdAt: string;
  media: [{
    type: string;
    url: string;
  }];
};

type Reel = {
  _id: string;
  caption: string;
  author: User;
  createdAt: string;
  video: {
    url: string;
  };
};

const SearchPage: React.FC = () => {
  const { isAuthenticated, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingUserIds, setLoadingUserIds] = useState<string[]>([]);
  const [playingReels, setPlayingReels] = useState<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

  const fetchResults = useCallback(async () => {
    const normalized = query.trim().replace(/\s+/g, ' ');
    if (normalized.length < 1) {
      setUsers([]);
      setPosts([]);
      setReels([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.debug('SearchPage: querying for', normalized);
      const [usersRes, postsRes, reelsRes] = await Promise.all([
        usersAPI.searchUsers(normalized),
        postsAPI.searchPosts(normalized),
        reelsAPI.searchReels(normalized)
      ]);

      console.debug('SearchPage: usersRes', usersRes?.data);
      console.debug('SearchPage: postsRes', postsRes?.data);
      console.debug('SearchPage: reelsRes', reelsRes?.data);

      let foundUsers: User[] = usersRes.data.users || [];

      if ((foundUsers.length === 0) && normalized && !normalized.includes(' ')) {
        try {
          const profileRes = await usersAPI.getProfile(normalized);
          if (profileRes?.data?.user) {
            foundUsers = [profileRes.data.user];
          }
        } catch (profileErr) {
          console.debug('SearchPage: profile fallback not found for', normalized, (profileErr as any)?.response?.status);
        }
      }

      setUsers(foundUsers);

      if (foundUsers.length > 0) {
        const userPromises = foundUsers.map(user =>
          Promise.all([
            postsAPI.getUserPosts(user.username, 1, 10),
            reelsAPI.getUserReels(user._id, 1, 10)
          ])
        );
        const results = await Promise.all(userPromises);
        const allPosts = results.flatMap(([postsRes]) => postsRes.data.posts || []);
        const allReels = results.flatMap(([, reelsRes]) => reelsRes.data.reels || []);
        setPosts(allPosts);
        setReels(allReels);
      } else {
        setPosts(postsRes.data.posts || []);
        setReels(reelsRes.data.reels || []);
      }
    } catch (err: any) {
      console.error('SearchPage: fetchResults error', err);
      setError(err.response?.data?.message || err.message || 'Error fetching search results');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchResults();
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchResults]);

  const followMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.followUser(userId),
    onMutate: (userId: string) => {
      setLoadingUserIds((prev) => [...prev, userId]);
    },
    onSuccess: (data, userId) => {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, isFollowing: true } : user
        )
      );
      setLoadingUserIds((prev) => prev.filter((id) => id !== userId));
      toast.success('User followed successfully');
    },
    onError: (error: any, userId) => {
      setLoadingUserIds((prev) => prev.filter((id) => id !== userId));
      toast.error(error.response?.data?.message || 'Failed to follow user');
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.unfollowUser(userId),
    onMutate: (userId: string) => {
      setLoadingUserIds((prev) => [...prev, userId]);
    },
    onSuccess: (data, userId) => {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, isFollowing: false } : user
        )
      );
      setLoadingUserIds((prev) => prev.filter((id) => id !== userId));
      toast.success('User unfollowed successfully');
    },
    onError: (error: any, userId) => {
      setLoadingUserIds((prev) => prev.filter((id) => id !== userId));
      toast.error(error.response?.data?.message || 'Failed to unfollow user');
    },
  });

  React.useEffect(() => {
    const handleUserFollowed = (data: any) => {
      setUsers((prevUsers) => {
        const exists = prevUsers.some(user => user._id === data.follower._id);
        if (exists) {
          return prevUsers.map(user =>
            user._id === data.follower._id
              ? { ...user, isFollowing: true }
              : user
          );
        } else {
          return prevUsers;
        }
      });
    };

    const handleUserUnfollowed = (data: any) => {
      setUsers((prevUsers) =>
        prevUsers.map(user =>
          user._id === data.unfollower._id
            ? { ...user, isFollowing: false }
            : user
        )
      );
    };

    (global as any).socket?.on('user_followed', handleUserFollowed);
    (global as any).socket?.on('user_unfollowed', handleUserUnfollowed);

    return () => {
      (global as any).socket?.off('user_followed', handleUserFollowed);
      (global as any).socket?.off('user_unfollowed', handleUserUnfollowed);
    };
  }, []);

  if (!isAuthenticated) {
    return <p>Please log in to use the search functionality.</p>;
  }

  const handleFollowToggle = (user: User) => {
    if (user.isFollowing) {
      unfollowMutation.mutate(user._id);
    } else {
      followMutation.mutate(user._id);
    }
  };

  const handlePlay = (playingId: string) => {
    setPlayingReels(prev => new Set([...prev, playingId]));
    Object.keys(videoRefs.current).forEach(id => {
      if (id !== playingId) {
        videoRefs.current[id]?.pause();
      }
    });
  };

  const handlePause = (pausedId: string) => {
    setPlayingReels(prev => {
      const newSet = new Set(prev);
      newSet.delete(pausedId);
      return newSet;
    });
  };

  return (
    <div className="search-page">
      <h1>Search</h1>
      <input
        type="text"
        placeholder="Search users, posts, or reels..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search input"
      />
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <>
          <h2>Users</h2>
          <ul className="search-results users-results">
            {users.length === 0 && <li>No users found.</li>}
            {users.map((user) => (
              <li key={user._id} className="user-result">
                <img src={user.profilePicture || '/default-profile.png'} alt={`${user.username} profile`} />
                <div>
                  <strong onClick={user._id !== currentUser?._id ? () => navigate(`/profile/${user.username}`) : undefined} style={user._id !== currentUser?._id ? { cursor: 'pointer' } : {}}>{user.fullName}</strong> @{user.username}
                  {user.isVerified && <span title="Verified">✔️</span>}
                  <p>{user.bio}</p>
                  <button
                    className={`follow-button ${user.isFollowing ? 'following' : 'not-following'}`}
                    onClick={() => handleFollowToggle(user)}
                    disabled={loadingUserIds.includes(user._id)}
                    aria-label={user.isFollowing ? 'Unfollow user' : 'Follow user'}
                  >
                    {loadingUserIds.includes(user._id)
                      ? '...'
                      : user.isFollowing
                      ? 'Following'
                      : 'Follow'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <h2>Posts</h2>
          <ul className="search-results posts-results">
            {posts.length === 0 && <li>No posts found.</li>}
            {posts.map((post) => (
              <li key={post._id} className="post-result">
                {post.media && post.media.length > 0 && post.media[0].type === 'image' && (
                  <img src={post.media[0].url} alt="Post" style={{ width: '100%', height: 'auto', borderRadius: '8px', marginBottom: '10px' }} />
                )}
                {post.content && <p>{post.content}</p>}
                <small>By <span onClick={post.author._id !== currentUser?._id ? () => navigate(`/profile/${post.author.username}`) : undefined} style={post.author._id !== currentUser?._id ? { cursor: 'pointer', textDecoration: 'underline' } : {}}>{post.author.fullName}</span> (@{post.author.username})</small>
              </li>
            ))}
          </ul>
          <h2>Reels</h2>
          <ul className="search-results reels-results">
            {reels.length === 0 && <li>No reels found.</li>}
            {reels.map((reel) => (
              <li key={reel._id} className="reel-result">
                <div className="reel-video-container">
                  <video
                    ref={(el) => { if (el) videoRefs.current[reel._id] = el; }}
                    src={reel.video.url}
                    controls
                    muted
                    playsInline
                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
                    onPlay={() => handlePlay(reel._id)}
                    onPause={() => handlePause(reel._id)}
                    onEnded={() => handlePause(reel._id)}
                    onError={(e) => {
                      console.error('Video load error:', e);
                    }}
                  />
                  <div className="play-overlay">{playingReels.has(reel._id) ? '⏸' : '▶'}</div>
                </div>
                <p>{reel.caption}</p>
                <small>By <span onClick={reel.author._id !== currentUser?._id ? () => navigate(`/profile/${reel.author.username}`) : undefined} style={reel.author._id !== currentUser?._id ? { cursor: 'pointer', textDecoration: 'underline' } : {}}>{reel.author.fullName}</span> (@{reel.author.username})</small>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default SearchPage;
