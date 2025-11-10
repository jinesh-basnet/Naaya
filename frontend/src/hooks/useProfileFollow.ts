import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useProfileFollow = (username: string | undefined, profile?: any) => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const followMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.followUser(userId),
    onMutate: (userId: string) => {
      queryClient.setQueryData(['profile', username], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            user: {
              ...oldData.data.user,
              isFollowing: true,
              followersCount: (oldData.data.user.followersCount || 0) + 1
            }
          }
        };
      });

      if (currentUser?.username) {
        queryClient.setQueryData(['profile', currentUser.username], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              user: {
                ...oldData.data.user,
                followingCount: (oldData.data.user.followingCount || 0) + 1
              }
            }
          };
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      if (currentUser?.username) {
        queryClient.invalidateQueries({ queryKey: ['profile', currentUser.username] });
        queryClient.invalidateQueries({ queryKey: ['followList', currentUser.username, 'following'] });
      }
      toast.success('User followed successfully');
    },
    onError: (error: any, userId: string) => {
      if (error.response?.status !== 400 || error.response?.data?.code !== 'ALREADY_FOLLOWING') {
        queryClient.setQueryData(['profile', username], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              user: {
                ...oldData.data.user,
                isFollowing: false,
                followersCount: Math.max((oldData.data.user.followersCount || 0) - 1, 0)
              }
            }
          };
        });

        if (currentUser?.username) {
          queryClient.setQueryData(['profile', currentUser.username], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              data: {
                ...oldData.data,
                user: {
                  ...oldData.data.user,
                  followingCount: Math.max((oldData.data.user.followingCount || 0) - 1, 0)
                }
              }
            };
          });
        }
        toast.error(error.response?.data?.message || 'Failed to follow user');
      } else {
        queryClient.invalidateQueries({ queryKey: ['profile', username] });
        if (currentUser?.username) {
          queryClient.invalidateQueries({ queryKey: ['profile', currentUser.username] });
          queryClient.invalidateQueries({ queryKey: ['followList', currentUser.username, 'following'] });
        }
        toast.success('User followed successfully');
      }
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.unfollowUser(userId),
    onMutate: (userId: string) => {
      queryClient.setQueryData(['profile', username], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            user: {
              ...oldData.data.user,
              isFollowing: false,
              followersCount: Math.max((oldData.data.user.followersCount || 0) - 1, 0)
            }
          }
        };
      });

      if (currentUser?.username) {
        queryClient.setQueryData(['profile', currentUser.username], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              user: {
                ...oldData.data.user,
                followingCount: Math.max((oldData.data.user.followingCount || 0) - 1, 0)
              }
            }
          };
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      if (currentUser?.username) {
        queryClient.invalidateQueries({ queryKey: ['profile', currentUser.username] });
        queryClient.invalidateQueries({ queryKey: ['followList', currentUser.username, 'following'] });
      }
      toast.success('User unfollowed successfully');
    },
    onError: (error: any, userId: string) => {
      queryClient.setQueryData(['profile', username], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            user: {
              ...oldData.data.user,
              isFollowing: true,
              followersCount: (oldData.data.user.followersCount || 0) + 1
            }
          }
        };
      });

      if (currentUser?.username) {
        queryClient.setQueryData(['profile', currentUser.username], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              user: {
                ...oldData.data.user,
                followingCount: (oldData.data.user.followingCount || 0) + 1
              }
            }
          };
        });
      }
      toast.error(error.response?.data?.message || 'Failed to unfollow user');
    },
  });

  return {
    followMutation,
    unfollowMutation,
    isPending: followMutation.isPending || unfollowMutation.isPending,
  };
};
