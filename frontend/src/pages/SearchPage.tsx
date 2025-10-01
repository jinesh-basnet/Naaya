import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, postsAPI } from '../services/api';
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
  caption: string;
  author: User;
  createdAt: string;
};

const SearchPage: React.FC = () => {
  const { isAuthenticated, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingUserIds, setLoadingUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setUsers([]);
      setPosts([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === 'users') {
          const res = await usersAPI.searchUsers(query);
          setUsers(res.data.users);
        } else if (activeTab === 'posts') {
          const res = await postsAPI.searchPosts(query);
          setPosts(res.data.posts);
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching search results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, activeTab]);

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

  return (
    <div className="search-page">
      <h1>Search</h1>
      <input
        type="text"
        placeholder="Search users or posts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search input"
      />
      <div className="tabs">
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
          aria-selected={activeTab === 'users'}
          role="tab"
        >
          Users
        </button>
        <button
          className={activeTab === 'posts' ? 'active' : ''}
          onClick={() => setActiveTab('posts')}
          aria-selected={activeTab === 'posts'}
          role="tab"
        >
          Posts
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && activeTab === 'users' && (
        <ul className="search-results">
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
      )}
      {!loading && !error && activeTab === 'posts' && (
        <ul className="search-results">
          {posts.length === 0 && <li>No posts found.</li>}
          {posts.map((post) => (
            <li key={post._id} className="post-result">
              <p>{post.caption}</p>
              <small>By <span onClick={post.author._id !== currentUser?._id ? () => navigate(`/profile/${post.author.username}`) : undefined} style={post.author._id !== currentUser?._id ? { cursor: 'pointer', textDecoration: 'underline' } : {}}>{post.author.fullName}</span> (@{post.author.username})</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchPage;
