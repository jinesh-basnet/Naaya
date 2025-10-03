import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaEdit, FaUserPlus, FaPlus } from 'react-icons/fa';
import { usersAPI, postsAPI, reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { safeString, formatLocation } from '../utils/locationUtils';
import ErrorBoundary from '../components/ErrorBoundary';
import HighlightViewer from '../components/HighlightViewer';
import HighlightManager from '../components/HighlightManager';
import UserHighlights from '../components/UserHighlights';
import toast from 'react-hot-toast';
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
  isFollowing?: boolean;
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'bookmarks'>('posts');
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});
  const [selectedHighlight, setSelectedHighlight] = useState<any>(null);
  const [isHighlightViewerOpen, setIsHighlightViewerOpen] = useState(false);
  const [isHighlightManagerOpen, setIsHighlightManagerOpen] = useState(false);
  const [highlightToEdit, setHighlightToEdit] = useState<any>(null);

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersAPI.getProfile(username || ''),
    enabled: !!username,
  });

  const profile: User | undefined = profileData?.data?.user;
  const isCurrentUser = currentUser?.username === username;

  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery({
    queryKey: ['userPosts', username],
    queryFn: () => postsAPI.getUserPosts(username || ''),
    enabled: !!username && !!profile,
  });

  const {
    data: reelsData,
    isLoading: reelsLoading,
    error: reelsError,
  } = useQuery({
    queryKey: ['userReels', profile?._id],
    queryFn: () => reelsAPI.getUserReels(profile!._id),
    enabled: !!profile?._id,
  });

  const {
    data: bookmarksData,
    isLoading: bookmarksLoading,
    error: bookmarksError,
  } = useQuery({
    queryKey: ['userBookmarks'],
    queryFn: () => postsAPI.getUserBookmarks(),
    enabled: isCurrentUser && !!profile,
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.followUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      toast.success('User followed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to follow user');
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.unfollowUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      toast.success('User unfollowed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unfollow user');
    },
  });

  React.useEffect(() => {
    if (!profile) return;

    const handleUserFollowed = (data: any) => {
      if (data.followed._id === profile._id) {
        queryClient.setQueryData(['profile', username], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              user: {
                ...oldData.data.user,
                followersCount: data.followed.followersCount,
                isFollowing: data.follower._id === currentUser?._id ? true : oldData.data.user.isFollowing,
              }
            }
          };
        });
      }
    };

    const handleUserUnfollowed = (data: any) => {
      if (data.unfollowed._id === profile._id) {
        queryClient.setQueryData(['profile', username], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              user: {
                ...oldData.data.user,
                followersCount: data.unfollowed.followersCount,
                isFollowing: data.unfollower._id === currentUser?._id ? false : oldData.data.user.isFollowing,
              }
            }
          };
        });
      }
    };

    (global as any).socket?.on('user_followed', handleUserFollowed);
    (global as any).socket?.on('user_unfollowed', handleUserUnfollowed);

    return () => {
      (global as any).socket?.off('user_followed', handleUserFollowed);
      (global as any).socket?.off('user_unfollowed', handleUserUnfollowed);
    };
  }, [profile, username, currentUser, queryClient]);

  if (profileLoading) {
    return (
      <div className="loading-spinner" style={{ marginTop: '32px' }}>
        Loading...
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="profile-container" style={{ maxWidth: '600px', marginTop: '32px' }}>
        <div className="error-alert">Failed to load profile.</div>
      </div>
    );
  }

  const handleEditProfile = () => {
    navigate('/settings');
  };

  const handleFollowToggle = () => {
    if (!profile) return;
    if (profile.isFollowing) {
      unfollowMutation.mutate(profile._id);
    } else {
      followMutation.mutate(profile._id);
    }
  };

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
            <h5 className="profile-name" {...(!isCurrentUser && { onClick: () => navigate(`/profile/${profile.username}`), style: { cursor: 'pointer' } })}>{safeString(profile.fullName)}</h5>
            <p className="profile-username">@{safeString(profile.username)}</p>
            <p className="profile-bio">{safeString(profile.bio) || 'No bio available.'}</p>
            {profile.location && (
              <p className="profile-location">Location: {formatLocation(profile.location)}</p>
            )}
            <div className="profile-stats">
              <span>
                <strong
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate(`/profile/${profile.username}/followers`)}
                  aria-label="View followers"
                >
                  {profile.followersCount || 0}
                </strong> Followers
              </span>
              <span>
                <strong
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate(`/profile/${profile.username}/following`)}
                  aria-label="View following"
                >
                  {profile.followingCount || 0}
                </strong> Following
              </span>
            </div>
            {isCurrentUser ? (
              <button className="profile-button outlined" onClick={handleEditProfile}>
                <FaEdit /> Edit Profile
              </button>
            ) : (
              <button
                className={`profile-button ${profile.isFollowing ? 'outlined' : 'contained'}`}
                onClick={handleFollowToggle}
                disabled={followMutation.isPending || unfollowMutation.isPending}
              >
                <FaUserPlus /> {profile.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {isCurrentUser && (
          <div className="highlights-section">
            <div className="highlights-header">
              <h4>Story Highlights</h4>
              <button
                className="add-highlight-button"
                onClick={() => {
                  setHighlightToEdit(null);
                  setIsHighlightManagerOpen(true);
                }}
                aria-label="Add new highlight"
              >
                <FaPlus />
              </button>
            </div>
            <UserHighlights
              userId={profile._id}
              onHighlightClick={(highlight: any) => {
                setSelectedHighlight(highlight);
                setIsHighlightViewerOpen(true);
              }}
              onEditHighlight={(highlight: any) => {
                setHighlightToEdit(highlight);
                setIsHighlightManagerOpen(true);
              }}
            />
          </div>
        )}

        {selectedHighlight && (
          <HighlightViewer
            highlight={selectedHighlight}
            isOpen={isHighlightViewerOpen}
            onClose={() => setIsHighlightViewerOpen(false)}
            onEdit={() => {
              setHighlightToEdit(selectedHighlight);
              setIsHighlightManagerOpen(true);
              setIsHighlightViewerOpen(false);
            }}
          />
        )}

        <HighlightManager
          isOpen={isHighlightManagerOpen}
          onClose={() => {
            setIsHighlightManagerOpen(false);
            setHighlightToEdit(null);
            queryClient.invalidateQueries(['userHighlights']);
          }}
        />

        <div className="profile-tabs">
          <button
            className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            className={`tab-button ${activeTab === 'reels' ? 'active' : ''}`}
            onClick={() => setActiveTab('reels')}
          >
            Reels
          </button>
          {isCurrentUser && (
            <button
              className={`tab-button ${activeTab === 'bookmarks' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookmarks')}
            >
              Saved
            </button>
          )}
        </div>

        <div className="posts-section">
          {activeTab === 'posts' && (
            <>
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
            </>
          )}

          {activeTab === 'reels' && (
            <>
              {reelsLoading ? (
                <div className="loading-spinner"></div>
              ) : reelsError ? (
                <div className="error-alert">Failed to load reels.</div>
              ) : !reelsData?.data?.reels || reelsData.data.reels.length === 0 ? (
                <p className="no-posts">No reels yet.</p>
              ) : (
                <div className="posts-grid">
                  {reelsData.data.reels.map((reel: any) => (
                    <div key={reel._id} className="post-item">
                      {reel.video?.url && !videoErrors[reel._id] ? (
                        <video
                          style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                          src={reel.video.url.startsWith('http') ? reel.video.url : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${reel.video.url}`}
                          muted
                          onError={(e) => {
                            setVideoErrors(prev => ({ ...prev, [reel._id]: true }));
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '200px',
                            backgroundColor: '#f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#666',
                            fontSize: '14px',
                            textAlign: 'center'
                          }}
                        >
                          {videoErrors[reel._id] ? 'Video unavailable' : 'No video'}
                        </div>
                      )}
                      <p className="post-content">{safeString(reel.caption)}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'bookmarks' && isCurrentUser && (
            <>
              {bookmarksLoading ? (
                <div className="loading-spinner"></div>
              ) : bookmarksError ? (
                <div className="error-alert">Failed to load bookmarks.</div>
              ) : !bookmarksData?.data?.posts || bookmarksData.data.posts.length === 0 ? (
                <p className="no-posts">No bookmarks yet.</p>
              ) : (
                <div className="posts-grid">
                  {bookmarksData.data.posts.map((post: Post) => (
                    <div key={post._id} className="post-item">
                      {post.media?.[0]?.url && (
                        <img
                          src={post.media[0].url}
                          alt={post.content || 'Bookmarked post image'}
                        />
                      )}
                      <p className="post-content">{safeString(post.content)}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ProfilePage;
