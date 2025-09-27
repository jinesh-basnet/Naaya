import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaEdit, FaUserPlus } from 'react-icons/fa';
import { usersAPI, postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { safeString, formatLocation } from '../utils/locationUtils';
import ErrorBoundary from '../components/ErrorBoundary';
import './ProfilePage.css';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
  bio?: string;
  location?: {
    city: string;
    district: string;
    province: string;
  };
  followersCount: number;
  followingCount: number;
}

interface Post {
  _id: string;
  content: string;
  media: Array<{
    url: string;
    type: string;
  }>;
}

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();

  // Fetch user profile data
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersAPI.getProfile(username || ''),
    enabled: !!username,
  });

  // Fetch user posts
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery({
    queryKey: ['userPosts', username],
    queryFn: () => postsAPI.getUserPosts(username || ''),
    enabled: !!username,
  });

  if (profileLoading) {
    return (
      <div className="loading-spinner" style={{ marginTop: '32px' }}>
        Loading...
      </div>
    );
  }

  if (profileError || !profileData?.data) {
    return (
      <div className="profile-container" style={{ maxWidth: '600px', marginTop: '32px' }}>
        <div className="error-alert">Failed to load profile.</div>
      </div>
    );
  }

  const profile: User = profileData.data.user;

  const isCurrentUser = currentUser?.username === username;

  return (
    <ErrorBoundary>
      <div className="profile-container">
        <div className="profile-header">
          {profile.profilePicture ? (
            <img
              src={profile.profilePicture}
              alt={profile.fullName}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar">
              {profile.fullName?.charAt(0)}
            </div>
          )}
          <div className="profile-info">
            <h5 className="profile-name">{safeString(profile.fullName)}</h5>
            <p className="profile-username">@{safeString(profile.username)}</p>
            <p className="profile-bio">{safeString(profile.bio) || 'No bio available.'}</p>
            {profile.location && (
              <p className="profile-location">Location: {formatLocation(profile.location)}</p>
            )}
            <div className="profile-stats">
              <span><strong>{profile.followersCount || 0}</strong> Followers</span>
              <span><strong>{profile.followingCount || 0}</strong> Following</span>
            </div>
            {isCurrentUser ? (
              <button className="profile-button outlined">
                <FaEdit /> Edit Profile
              </button>
            ) : (
              <button className="profile-button contained">
                <FaUserPlus /> Follow
              </button>
            )}
          </div>
        </div>

        <div className="posts-section">
          <h6>Posts</h6>

          {postsLoading ? (
            <div className="loading-spinner"></div>
          ) : postsError ? (
            <div className="error-alert">Failed to load posts.</div>
          ) : !postsData?.data?.posts || postsData.data.posts.length === 0 ? (
            <p className="no-posts">No posts yet.</p>
          ) : (
            <div className="posts-grid">
              {postsData.data.posts.map((post: Post) => (
                <div key={post._id} className="post-item">
                  {post.media?.[0]?.url && (
                    <img
                      src={post.media[0].url}
                      alt={post.content || 'Post image'}
                    />
                  )}
                  <p className="post-content">{safeString(post.content)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ProfilePage;
