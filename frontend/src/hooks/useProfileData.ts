import { useQuery } from '@tanstack/react-query';
import { usersAPI, postsAPI, reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const useProfileData = (username: string | undefined) => {
  const { user: currentUser } = useAuth();

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersAPI.getProfile(username || ''),
    enabled: !!username,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) {
        return false; 
      }
      return failureCount < 3;
    },
  });

  const profile = profileData?.data?.user;
  const isCurrentUser = currentUser?.username === username;

  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery({
    queryKey: ['userPosts', username],
    queryFn: () => postsAPI.getUserPosts(username || ''),
    enabled: !!username && !!profile,
  });

  const {
    data: reelsData,
    isLoading: reelsLoading,
    error: reelsError,
  } = useQuery({
    queryKey: ['userReels', profile?._id],
    queryFn: () => reelsAPI.getUserReels(profile!._id),
    enabled: !!profile?._id,
  });

  const {
    data: bookmarksData,
    isLoading: bookmarksLoading,
    error: bookmarksError,
  } = useQuery({
    queryKey: ['userBookmarks'],
    queryFn: () => postsAPI.getUserBookmarks(),
    enabled: isCurrentUser && !!profile,
  });

  const {
    data: savedReelsData,
    isLoading: savedReelsLoading,
    error: savedReelsError,
  } = useQuery({
    queryKey: ['userSavedReels'],
    queryFn: () => reelsAPI.getSavedReels(),
    enabled: isCurrentUser && !!profile,
  });

  return {
    profile,
    isCurrentUser,
    profileLoading,
    profileError,
    postsData,
    postsLoading,
    postsError,
    reelsData,
    reelsLoading,
    reelsError,
    bookmarksData,
    bookmarksLoading,
    bookmarksError,
    savedReelsData,
    savedReelsLoading,
    savedReelsError,
  };
};
