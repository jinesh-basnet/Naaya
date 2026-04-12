import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useFeed = (locationData: any) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: feedData, isLoading, refetch, error } = useQuery({
    queryKey: ['feed', 'posts', locationData?.city],
    queryFn: () => postsAPI.getFeed('fyp'),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) return false;
      if (error?.response?.status === 429) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  useEffect(() => {
    if (error) {
      const status = error?.response?.status;
      if (status === 401) {
        toast.error('Please log in to view your feed');
        navigate('/login');
      } else if (status === 403) {
        toast.error('Access denied. Please check your permissions.');
      } else if (status === 404) {
        toast.error('Feed service temporarily unavailable');
      } else {
        toast.error('Failed to load posts feed');
      }
    }
  }, [error, navigate]);

  const handleRefresh = async () => {
    await refetch();
  };

  return { feedData, isLoading, handleRefresh };
};
