import React from 'react';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  isVerified: boolean;
  bio?: string;
  isFollowing?: boolean;
}

interface FollowButtonProps {
  user: User;
  onFollowToggle: (user: User) => void;
  loading: boolean;
}

const FollowButton: React.FC<FollowButtonProps> = ({ user, onFollowToggle, loading }) => {
  return (
    <button
      className={`follow-button ${user.isFollowing ? 'following' : 'not-following'}`}
      onClick={() => onFollowToggle(user)}
      disabled={loading}
      aria-label={user.isFollowing ? 'Unfollow user' : 'Follow user'}
    >
      {loading ? '...' : user.isFollowing ? 'Following' : 'Follow'}
    </button>
  );
};

export default FollowButton;
