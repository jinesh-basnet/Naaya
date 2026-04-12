import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  isVerified: boolean;
  bio?: string;
  isFollowing?: boolean;
}

export const useFollowSocketEvents = (
  username: string | undefined,
  type: 'followers' | 'following' | undefined,
  currentUser: any,
  onUserFollowed: (handler: (data: any) => void) => void,
  offUserFollowed: (handler: (data: any) => void) => void,
  onUserUnfollowed: (handler: (data: any) => void) => void,
  offUserUnfollowed: (handler: (data: any) => void) => void
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!username || !type) return;

    const handleUserFollowed = (data: any) => {
      if (type === 'followers' && data.followed._id === username) {
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
      } else if (type === 'following' && data.follower._id === username) {
        queryClient.setQueryData(['followList', username, type], (oldData: any) => {
          if (!oldData) return oldData;
          const existingUser = oldData.data.users.find((u: User) => u._id === data.followed._id);
          if (!existingUser) {
            const newUser: User = {
              _id: data.followed._id,
              username: data.followed.username,
              fullName: data.followed.fullName,
              profilePicture: data.followed.profilePicture,
              isVerified: false,
              isFollowing: true,
            };
            return {
              ...oldData,
              data: {
                ...oldData.data,
                users: [newUser, ...oldData.data.users],
              },
            };
          }
          return oldData;
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
      if (type === 'followers' && data.unfollowed._id === username) {
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
      } else if (type === 'following' && data.unfollower._id === username) {
        queryClient.setQueryData(['followList', username, type], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              users: oldData.data.users.filter((u: User) => u._id !== data.unfollowed._id),
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
  }, [username, type, currentUser, queryClient, onUserFollowed, offUserFollowed, onUserUnfollowed, offUserUnfollowed]);
};
