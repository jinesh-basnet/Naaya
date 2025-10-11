import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  isFollowing?: boolean;
  followersCount: number;
  followingCount: number;
}

export const useProfileFollowSocketEvents = (
  profile: User | undefined,
  username: string | undefined,
  currentUser: any,
  onUserFollowed: (handler: (data: any) => void) => void,
  offUserFollowed: (handler: (data: any) => void) => void,
  onUserUnfollowed: (handler: (data: any) => void) => void,
  offUserUnfollowed: (handler: (data: any) => void) => void
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
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
};
