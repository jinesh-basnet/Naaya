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
  type: string,
  currentUser: any,
  onUserFollowed: (handler: (data: any) => void) => void,
  offUserFollowed: (handler: (data: any) => void) => void,
  onUserUnfollowed: (handler: (data: any) => void) => void,
  offUserUnfollowed: (handler: (data: any) => void) => void
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
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
  }, [username, currentUser, queryClient, onUserFollowed, offUserFollowed, onUserUnfollowed, offUserUnfollowed, type]);
};
