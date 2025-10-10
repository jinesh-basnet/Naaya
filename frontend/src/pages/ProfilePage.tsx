import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaEdit, FaUserPlus, FaPlus } from 'react-icons/fa';
import { MdChat } from 'react-icons/md';
import { usersAPI, postsAPI, reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
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
  const { onUserFollowed, offUserFollowed, onUserUnfollowed, offUserUnfollowed } = useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'bookmarks' | 'savedReels'>('posts');
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});
  const [selectedHighlight, setSelectedHighlight] = useState<any>(null);
  const [isHighlightViewerOpen, setIsHighlightViewerOpen] = useState(false);
  const [isHighlightManagerOpen, setIsHighlightManagerOpen] = useState(false);



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

  const {
    data: savedReelsData,
    isLoading: savedReelsLoading,
    error: savedReelsError,
  } = useQuery({
    queryKey: ['userSavedReels'],
    queryFn: () => reelsAPI.getSavedReels(),
    enabled: isCurrentUser && !!profile,
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.followUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      if (currentUser?.username) {
        queryClient.invalidateQueries({ queryKey: ['followList', currentUser.username, 'following'] });
      }
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
      if (currentUser?.username) {
        queryClient.invalidateQueries({ queryKey: ['followList', currentUser.username, 'following'] });
      }
      toast.success('User unfollowed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unfollow user');
    },
  });

  React.useEffect(() => {
    if (profile) {
      console.log(`Profile loaded for ${profile.username}: followersCount=${profile.followersCount}, followingCount=${profile.followingCount}`);
    }
  }, [profile]);

  React.useEffect(() => {
    if (!profile) return;

    const handleUserFollowed = (data: any) => {
      queryClient.setQueryData(['profile', username], (oldData: any) => {
        if (!oldData) return oldData;
        const updatedUser = { ...oldData.data.user };
        let changed = false;

        if (data.followed._id === profile._id) {
          if (updatedUser.followersCount !== data.followed.followersCount) {
            updatedUser.followersCount = data.followed.followersCount;
            changed = true;
          }
        }

        if (data.follower._id === currentUser?._id) {
          const newFollowingCount = (updatedUser.followingCount || 0) + 1;
          if (updatedUser.followingCount !== newFollowingCount) {
            updatedUser.followingCount = newFollowingCount;
            changed = true;
          }
          if (data.followed._id === profile._id && updatedUser.isFollowing !== true) {
            updatedUser.isFollowing = true;
            changed = true;
          }
        }

        if (!changed) return oldData;

        return {
          ...oldData,
          data: {
            ...oldData.data,
            user: updatedUser
          }
        };
      });
    };

    const handleUserUnfollowed = (data: any) => {
      queryClient.setQueryData(['profile', username], (oldData: any) => {
        if (!oldData) return oldData;
        const updatedUser = { ...oldData.data.user };
        let changed = false;

        if (data.unfollowed._id === profile._id) {
          if (updatedUser.followersCount !== data.unfollowed.followersCount) {
            updatedUser.followersCount = data.unfollowed.followersCount;
            changed = true;
          }
        }

        if (data.unfollower._id === currentUser?._id) {
          const newFollowingCount = Math.max((updatedUser.followingCount || 0) - 1, 0);
          if (updatedUser.followingCount !== newFollowingCount) {
            updatedUser.followingCount = newFollowingCount;
            changed = true;
          }
          if (data.unfollowed._id === profile._id && updatedUser.isFollowing !== false) {
            updatedUser.isFollowing = false;
            changed = true;
          }
        }

        if (!changed) return oldData;

        return {
          ...oldData,
          data: {
            ...oldData.data,
            user: updatedUser
          }
        };
      });
    };

    onUserFollowed(handleUserFollowed);
    onUserUnfollowed(handleUserUnfollowed);

    return () => {
      offUserFollowed(handleUserFollowed);
      offUserUnfollowed(handleUserUnfollowed);
    };
  }, [profile, username, currentUser, queryClient, onUserFollowed, offUserFollowed, onUserUnfollowed, offUserUnfollowed]);

  if (profileLoading) {
    return (
      <div className="loading-spinner initial">
        Loading...
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="profile-container error">
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
            <h5 className={`profile-name ${!isCurrentUser ? 'clickable' : ''}`} {...(!isCurrentUser && { onClick: () => navigate(`/profile/${profile.username}`) })}>{safeString(profile.fullName)}</h5>
            <p className="profile-username">@{safeString(profile.username)}</p>
            <p className="profile-bio">{safeString(profile.bio) || 'No bio available.'}</p>
            {profile.location && (
              <p className="profile-location">Location: {formatLocation(profile.location)}</p>
            )}
            <div className="profile-stats">
              <span>
                <strong
                  onClick={() => navigate(`/profile/${profile.username}/followers`)}
                  aria-label="View followers"
                >
                  {profile.followersCount || 0}
                </strong> Followers
              </span>
              <span>
                <strong
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
              <div className="profile-actions">
                <button
                  className={`profile-button ${profile.isFollowing ? 'outlined' : 'contained'}`}
                  onClick={handleFollowToggle}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                >
                  <FaUserPlus /> {profile.isFollowing ? 'Following' : 'Follow'}
                </button>
                {profile.isFollowing && (
                  <button
                    className="profile-button message-button"
                    onClick={() => navigate(`/messages?user=${profile.username}`)}
                    aria-label="Send message"
                  >
                    <MdChat />
                  </button>
                )}
              </div>
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
              setIsHighlightManagerOpen(true);
              setIsHighlightViewerOpen(false);
            }}
          />
        )}

        <HighlightManager
          isOpen={isHighlightManagerOpen}
          onClose={() => {
            setIsHighlightManagerOpen(false);
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
                          src={reel.video.url.startsWith('http') ? reel.video.url : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${reel.video.url}`}
                          muted
                          onError={(e) => {
                            setVideoErrors(prev => ({ ...prev, [reel._id]: true }));
                          }}
                        />
                      ) : (
                        <div className="video-error">
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
              {(bookmarksLoading || savedReelsLoading) ? (
                <div className="loading-spinner"></div>
              ) : (bookmarksError || savedReelsError) ? (
                <div className="error-alert">Failed to load saved items.</div>
              ) : (
                !bookmarksData?.data?.posts?.length && !savedReelsData?.data?.reels?.length
              ) ? (
                <p className="no-posts">No saved items yet.</p>
              ) : (
                <div className="posts-grid">
                  {bookmarksData?.data?.posts?.map((post: Post) => (
                    <div key={`post-${post._id}`} className="post-item">
                      {post.media?.[0]?.url && (
                        <img
                          src={post.media[0].url}
                          alt={post.content || 'Saved post image'}
                        />
                      )}
                      <p className="post-content">{safeString(post.content)}</p>
                      <div className="item-type">Post</div>
                    </div>
                  ))}

                  {savedReelsData?.data?.reels?.map((reel: any) => (
                    <div key={`reel-${reel._id}`} className="post-item">
                      {reel.video?.url && !videoErrors[reel._id] ? (
                        <video
                          src={reel.video.url.startsWith('http') ? reel.video.url : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${reel.video.url}`}
                          muted
                          onError={(e) => {
                            setVideoErrors(prev => ({ ...prev, [reel._id]: true }));
                          }}
                        />
                      ) : (
                        <div className="video-error">
                          {videoErrors[reel._id] ? 'Video unavailable' : 'No video'}
                        </div>
                      )}
                      <p className="post-content">{safeString(reel.content)}</p>
                      <div className="item-type">Reel</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'savedReels' && isCurrentUser && (
            <>
              <p>Saved reels feature coming soon.</p>
            </>
          )}
        </div>


      </div>
    </ErrorBoundary>
  );
};

export default ProfilePage;
