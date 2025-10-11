import React from 'react';
import { FaEdit, FaUserPlus } from 'react-icons/fa';
import { MdChat } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { safeString, formatLocation } from '../utils/locationUtils';

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

interface ProfileHeaderProps {
  profile: User;
  isCurrentUser: boolean;
  onEdit: () => void;
  onFollowToggle: () => void;
  isPending: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isCurrentUser,
  onEdit,
  onFollowToggle,
  isPending,
}) => {
  const navigate = useNavigate();

  return (
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
        <h5 className={`profile-name ${!isCurrentUser ? 'clickable' : ''}`} {...(!isCurrentUser && { onClick: () => navigate(`/profile/${profile.username}`) })}>
          {safeString(profile.fullName)}
        </h5>
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
          <button className="profile-button outlined" onClick={onEdit}>
            <FaEdit /> Edit Profile
          </button>
        ) : (
          <div className="profile-actions">
            <button
              className={`profile-button ${profile.isFollowing ? 'outlined' : 'contained'}`}
              onClick={onFollowToggle}
              disabled={isPending}
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
  );
};

export default ProfileHeader;
