import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FaPlus } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ErrorBoundary from '../components/ErrorBoundary';
import PostViewerModal from '../components/PostViewerModal';
import EditProfileModal from '../components/EditProfileModal';
import HighlightViewer from '../components/HighlightViewer';
import HighlightManager from '../components/HighlightManager';
import UserHighlights from '../components/UserHighlights';
import ProfileHeader from '../components/ProfileHeader';
import ProfileTabs from '../components/ProfileTabs';
import ContentTabs from '../components/ContentTabs';
import { useProfileData } from '../hooks/useProfileData';
import { useProfileFollow } from '../hooks/useProfileFollow';
import { useProfileFollowSocketEvents } from '../hooks/useProfileFollowSocketEvents';

import './ProfilePage.css';

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
  const [isPostViewerOpen, setIsPostViewerOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(undefined);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const {
    profile,
    isCurrentUser,
    profileLoading,
    profileError,
    postsData,
    postsLoading,
    postsError,
    fetchNextPostsPage,
    hasNextPostsPage,
    isFetchingNextPostsPage,
    reelsData,
    reelsLoading,
    reelsError,
    fetchNextReelsPage,
    hasNextReelsPage,
    isFetchingNextReelsPage,
    bookmarksData,
    bookmarksLoading,
    bookmarksError,
    savedReelsData,
    savedReelsLoading,
    savedReelsError,
  } = useProfileData(username);

  const { followMutation, unfollowMutation, isPending } = useProfileFollow(username, profile);

  useProfileFollowSocketEvents(profile, username, currentUser, onUserFollowed, offUserFollowed, onUserUnfollowed, offUserUnfollowed);

  if (profileLoading) {
    return (
      <div className="profile-container">
        <div className="profile-loading-skeleton">
          <div className="skeleton-header-large">
            <div className="skeleton-avatar-large"></div>
            <div className="skeleton-info-large">
              <div className="skeleton-line-40"></div>
              <div className="skeleton-line-20"></div>
              <div className="skeleton-line-60"></div>
            </div>
          </div>
          <div className="skeleton-tabs">
            <div className="skeleton-tab"></div>
            <div className="skeleton-tab"></div>
            <div className="skeleton-tab"></div>
          </div>
          <div className="skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton-grid-item"></div>)}
          </div>
        </div>
      </div>
    );
  }

  if (profileError) {
    const is404 = profileError?.response?.status === 404;
    return (
      <div className="profile-container error">
        <div className="error-alert">
          {is404 ? 'User not found.' : 'Failed to load profile.'}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container error">
        <div className="error-alert">User not found.</div>
      </div>
    );
  }

  const handleEditProfile = () => {
    setIsEditProfileModalOpen(true);
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
        <ProfileHeader
          profile={profile}
          isCurrentUser={isCurrentUser}
          onEdit={handleEditProfile}
          onFollowToggle={handleFollowToggle}
          isPending={isPending}
        />

        {isCurrentUser && (
          <div className="highlights-section">
            <div className="highlights-header">
              <h4>Story Highlights</h4>
              <button
                className="add-highlight-button"
                onClick={() => setIsHighlightManagerOpen(true)}
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

        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCurrentUser={isCurrentUser}
        />

        <div className="posts-section">
          <ContentTabs
            activeTab={activeTab}
            postsData={postsData}
            postsLoading={postsLoading}
            postsError={postsError}
            fetchNextPosts={fetchNextPostsPage}
            hasNextPosts={hasNextPostsPage}
            isFetchingNextPosts={isFetchingNextPostsPage}
            reelsData={reelsData}
            reelsLoading={reelsLoading}
            reelsError={reelsError}
            fetchNextReels={fetchNextReelsPage}
            hasNextReels={hasNextReelsPage}
            isFetchingNextReels={isFetchingNextReelsPage}
            bookmarksData={bookmarksData}
            bookmarksLoading={bookmarksLoading}
            bookmarksError={bookmarksError}
            savedReelsData={savedReelsData}
            savedReelsLoading={savedReelsLoading}
            savedReelsError={savedReelsError}
            videoErrors={videoErrors}
            setVideoErrors={setVideoErrors}
            isCurrentUser={isCurrentUser}
            onPostClick={(postId) => {
              setSelectedPostId(postId);
              setIsPostViewerOpen(true);
            }}
          />
        </div>

        {isPostViewerOpen && profile && (
          <PostViewerModal
            isOpen={isPostViewerOpen}
            onClose={() => setIsPostViewerOpen(false)}
            username={profile.username}
            initialPostId={selectedPostId}
          />
        )}

        {profile && (
          <EditProfileModal
            isOpen={isEditProfileModalOpen}
            onClose={() => setIsEditProfileModalOpen(false)}
            currentUser={profile}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default ProfilePage;
