import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useProfileFollow = (username: string | undefined) => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const followMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.followUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      if (currentUser?.username) {
        queryClient.invalidateQueries({ queryKey: ['followList', currentUser.username, 'following'] });
      }
      toast.success('User followed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to follow user');
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.unfollowUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      if (currentUser?.username) {
        queryClient.invalidateQueries({ queryKey: ['followList', currentUser.username, 'following'] });
      }
      toast.success('User unfollowed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unfollow user');
    },
  });

  const handleFollowToggle = (userId: string) => {
  };

  return {
    followMutation,
    unfollowMutation,
    handleFollowToggle,
    isPending: followMutation.isPending || unfollowMutation.isPending,
  };
};
