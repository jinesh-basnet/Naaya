import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaArrowLeft } from 'react-icons/fa';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useFollowMutations } from '../hooks/useFollowMutations';
import { useFollowSocketEvents } from '../hooks/useFollowSocketEvents';
import UserItem from '../components/UserItem';
import './FollowListPage.css';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  isVerified: boolean;
  bio?: string;
  isFollowing?: boolean;
}

const FollowersPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { onUserFollowed, offUserFollowed, onUserUnfollowed, offUserUnfollowed } = useSocket();
  const navigate = useNavigate();
  const type = 'followers';

  const {
    data: listData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['followList', username, type],
    queryFn: () => usersAPI.getFollowers(username || ''),
    enabled: !!username,
  });

  const { loadingUserIds, handleFollowToggle } = useFollowMutations(username || '', type);

  useFollowSocketEvents(
    username,
    type,
    currentUser,
    onUserFollowed,
    offUserFollowed,
    onUserUnfollowed,
    offUserUnfollowed
  );

  if (isLoading) {
    return (
      <div className="follow-list-page">
        <div className="loading-spinner" style={{ marginTop: '32px' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error || !listData?.data) {
    return (
      <div className="follow-list-page">
        <div className="error-alert" style={{ marginTop: '32px' }}>
          Failed to load followers.
        </div>
      </div>
    );
  }

  const users: User[] = listData.data.users;
  const title = 'Followers';

  return (
    <div className="follow-list-page">
      <div className="follow-list-header">
        <button
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <FaArrowLeft />
        </button>
        <h1>{title}</h1>
      </div>
      <div className="follow-list-content">
        {users.length === 0 ? (
          <p className="no-users">No followers yet.</p>
        ) : (
          <ul className="follow-list">
            {users.map((user) => (
              <UserItem
                key={user._id}
                user={user}
                onFollowToggle={handleFollowToggle}
                loadingUserIds={loadingUserIds}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FollowersPage;
