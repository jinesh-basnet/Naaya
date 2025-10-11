import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdChat } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import FollowButton from './FollowButton';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  isVerified: boolean;
  bio?: string;
  isFollowing?: boolean;
}

interface UserItemProps {
  user: User;
  onFollowToggle: (user: User) => void;
  loadingUserIds: string[];
}

const UserItem: React.FC<UserItemProps> = ({ user, onFollowToggle, loadingUserIds }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const handleUserClick = () => {
    navigate(`/profile/${user.username}`);
  };

  const handleMessageClick = () => {
    navigate(`/messages?user=${user.username}`);
  };

  return (
    <li className="follow-item">
      <div
        className="user-info"
        onClick={handleUserClick}
        style={{ cursor: 'pointer' }}
      >
        <img
          src={user.profilePicture || '/default-profile.png'}
          alt={`${user.username} profile`}
          className="user-avatar"
        />
        <div className="user-details">
          <strong>{user.fullName}</strong> @{user.username}
          {user.isVerified && <span title="Verified">✔️</span>}
          {user.bio && <p className="user-bio">{user.bio}</p>}
        </div>
      </div>
      {currentUser?.username !== user.username && (
        <div className="action-buttons">
          <FollowButton
            user={user}
            onFollowToggle={onFollowToggle}
            loading={loadingUserIds.includes(user._id)}
          />
          {user.isFollowing && (
            <button
              className="message-button"
              onClick={handleMessageClick}
              aria-label="Send message"
            >
              <MdChat />
            </button>
          )}
        </div>
      )}
    </li>
  );
};

export default UserItem;
