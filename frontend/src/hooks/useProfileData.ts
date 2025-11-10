import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
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
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const profile = profileData?.data?.user;
  const isCurrentUser = currentUser?.username === username;

  const POSTS_PAGE_LIMIT = 12;
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    fetchNextPage: fetchNextPostsPage,
    hasNextPage: hasNextPostsPage,
    isFetchingNextPage: isFetchingNextPostsPage,
  } = useInfiniteQuery({
    queryKey: ['userPosts', username],
    queryFn: ({ pageParam = 1 }) => postsAPI.getUserPosts(username || '', pageParam, POSTS_PAGE_LIMIT),
    enabled: !!username && !!profile,
    getNextPageParam: (lastPage, allPages) => {
      const posts = lastPage?.data?.posts || [];
      if (posts.length === POSTS_PAGE_LIMIT) {
        return allPages.length + 1;
      }
      return undefined;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const REELS_PAGE_LIMIT = 12;
  const {
    data: reelsData,
    isLoading: reelsLoading,
    error: reelsError,
    fetchNextPage: fetchNextReelsPage,
    hasNextPage: hasNextReelsPage,
    isFetchingNextPage: isFetchingNextReelsPage,
  } = useInfiniteQuery({
    queryKey: ['userReels', profile?._id],
    queryFn: ({ pageParam = 1 }) => reelsAPI.getUserReels(profile!._id, pageParam, REELS_PAGE_LIMIT),
    enabled: !!profile?._id,
    getNextPageParam: (lastPage, allPages) => {
      const reels = lastPage?.data?.reels || [];
      if (reels.length === REELS_PAGE_LIMIT) {
        return allPages.length + 1;
      }
      return undefined;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const {
    data: bookmarksData,
    isLoading: bookmarksLoading,
    error: bookmarksError,
  } = useQuery({
    queryKey: ['userBookmarks'],
    queryFn: () => postsAPI.getUserBookmarks(),
    enabled: isCurrentUser && !!profile,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const {
    data: savedReelsData,
    isLoading: savedReelsLoading,
    error: savedReelsError,
  } = useQuery({
    queryKey: ['userSavedReels'],
    queryFn: () => reelsAPI.getSavedReels(),
    enabled: isCurrentUser && !!profile,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  return {
    profile,
    isCurrentUser,
    profileLoading,
    profileError,
    postsData,
    postsLoading,
    postsError,
    fetchNextPostsPage,
    hasNextPostsPage,
    isFetchingNextPostsPage,
    reelsData,
    reelsLoading,
    reelsError,
    fetchNextReelsPage,
    hasNextReelsPage,
    isFetchingNextReelsPage,
    bookmarksData,
    bookmarksLoading,
    bookmarksError,
    savedReelsData,
    savedReelsLoading,
    savedReelsError,
  };
};
