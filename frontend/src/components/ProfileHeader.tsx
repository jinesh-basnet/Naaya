import React from 'react';
import { FaEdit, FaUserPlus, FaMapMarkerAlt } from 'react-icons/fa';
import Avatar from './Avatar';
import { MdChat } from 'react-icons/md';
import { FiCheck } from 'react-icons/fi';
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
    <div className="profile-hero-section">
      <div className="profile-cover-area">
        <div className="cover-pattern" />
        <div className="cover-overlay" />
      </div>

      <div className="profile-main-card">
        <div className="avatar-side">
          <Avatar
            src={profile.profilePicture}
            alt={profile.fullName}
            name={profile.fullName}
            className="profile-avatar-unique"
            size={180}
          />
          {!isCurrentUser && profile.isFollowing && (
            <div className="active-badge" title="You follow each other">
              <FiCheck />
            </div>
          )}
        </div>

        <div className="profile-content-side">
          <div className="profile-header-top">
            <div className="name-group">
              <h1 className="profile-display-name">
                {safeString(profile.fullName)}
              </h1>
              <span className="profile-handle">@{safeString(profile.username)}</span>
            </div>

            <div className="header-actions-integrated">
              {isCurrentUser ? (
                <button className="premium-action-btn edit" onClick={onEdit}>
                  <FaEdit /> <span>Edit</span>
                </button>
              ) : (
                <>
                  <button
                    className={`premium-action-btn ${profile.isFollowing ? 'unfollow' : 'follow'}`}
                    onClick={onFollowToggle}
                    disabled={isPending}
                  >
                    {profile.isFollowing ? 'Following' : 'Follow'}
                  </button>
                  {profile.isFollowing && (
                    <button
                      className="premium-action-btn message"
                      onClick={() => navigate(`/messages/${profile._id}`)}
                    >
                      <MdChat />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="profile-bio-container">
            {profile.bio && (
              <p className="bio-text">
                {safeString(profile.bio).split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </p>
            )}

            {profile.location && (
              <div className="location-info-row">
                <div className="location-pill">
                  <FaMapMarkerAlt />
                  <span>{formatLocation(profile.location)}</span>
                </div>
                <div className="status-pill">
                  <span className="pulse-dot" />
                  <span>Available</span>
                </div>
              </div>
            )}
          </div>

          <div className="profile-dashboard-stats">
            <div className="stat-card" onClick={() => navigate(`/profile/${profile.username}/followers`)}>
              <span className="stat-value">{profile.followersCount || 0}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-card" onClick={() => navigate(`/profile/${profile.username}/following`)}>
              <span className="stat-value">{profile.followingCount || 0}</span>
              <span className="stat-label">Following</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">Posts</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
