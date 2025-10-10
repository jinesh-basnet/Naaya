import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaArrowLeft } from 'react-icons/fa';
import { MdChat } from 'react-icons/md';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
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
  const queryClient = useQueryClient();
  const [loadingUserIds, setLoadingUserIds] = useState<string[]>([]);
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

  const followMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.followUser(userId),
    onMutate: (userId: string) => {
      setLoadingUserIds((prev) => [...prev, userId]);
    },
    onSuccess: (data, userId) => {
      queryClient.setQueryData(['followList', username, type], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            users: oldData.data.users.map((user: User) =>
              user._id === userId ? { ...user, isFollowing: true } : user
            ),
          },
        };
      });
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
      queryClient.setQueryData(['followList', username, type], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            users: oldData.data.users.map((user: User) =>
              user._id === userId ? { ...user, isFollowing: false } : user
            ),
          },
        };
      });
      setLoadingUserIds((prev) => prev.filter((id) => id !== userId));
      toast.success('User unfollowed successfully');
    },
    onError: (error: any, userId) => {
      setLoadingUserIds((prev) => prev.filter((id) => id !== userId));
      toast.error(error.response?.data?.message || 'Failed to unfollow user');
    },
  });

  React.useEffect(() => {
    if (!username) return;

    const handleUserFollowed = (data: any) => {
      if (data.followed._id === username) {
        queryClient.setQueryData(['followList', username, type], (oldData: any) => {
          if (!oldData) return oldData;
          const existingUser = oldData.data.users.find((u: User) => u._id === data.follower._id);
          if (existingUser) {
            return {
              ...oldData,
              data: {
                ...oldData.data,
                users: oldData.data.users.map((u: User) =>
                  u._id === data.follower._id
                    ? { ...u, isFollowing: data.follower._id === currentUser?._id ? true : u.isFollowing }
                    : u
                ),
              },
            };
          } else {
            const newUser: User = {
              _id: data.follower._id,
              username: data.follower.username,
              fullName: data.follower.fullName,
              profilePicture: data.follower.profilePicture,
              isVerified: false,
              isFollowing: data.follower._id === currentUser?._id,
            };
            return {
              ...oldData,
              data: {
                ...oldData.data,
                users: [newUser, ...oldData.data.users],
              },
            };
          }
        });
      } else {
        queryClient.setQueryData(['followList', username, type], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              users: oldData.data.users.map((u: User) =>
                u._id === data.follower._id
                  ? { ...u, isFollowing: data.follower._id === currentUser?._id ? true : u.isFollowing }
                  : u
              ),
            },
          };
        });
      }
    };

    const handleUserUnfollowed = (data: any) => {
      if (data.unfollowed._id === username) {
        queryClient.setQueryData(['followList', username, type], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              users: oldData.data.users.filter((u: User) => u._id !== data.unfollower._id),
            },
          };
        });
      } else {
        queryClient.setQueryData(['followList', username, type], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              users: oldData.data.users.map((u: User) =>
                u._id === data.unfollower._id
                  ? { ...u, isFollowing: data.unfollower._id === currentUser?._id ? false : u.isFollowing }
                  : u
              ),
            },
          };
        });
      }
    };

    onUserFollowed(handleUserFollowed);
    onUserUnfollowed(handleUserUnfollowed);

    return () => {
      offUserFollowed(handleUserFollowed);
      offUserUnfollowed(handleUserUnfollowed);
    };
  }, [username, currentUser, queryClient, onUserFollowed, offUserFollowed, onUserUnfollowed, offUserUnfollowed]);

  const handleFollowToggle = (user: User) => {
    if (user.isFollowing) {
      unfollowMutation.mutate(user._id);
    } else {
      followMutation.mutate(user._id);
    }
  };

  const handleUserClick = (user: User) => {
    navigate(`/profile/${user.username}`);
  };

  const handleMessageClick = (user: User) => {
    navigate(`/messages?user=${user.username}`);
  };

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
              <li key={user._id} className="follow-item">
                <div
                  className="user-info"
                  onClick={() => handleUserClick(user)}
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
                    {user.isFollowing && (
                      <button
                        className="message-button"
                        onClick={() => handleMessageClick(user)}
                        aria-label="Send message"
                      >
                        <MdChat />
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FollowersPage;
