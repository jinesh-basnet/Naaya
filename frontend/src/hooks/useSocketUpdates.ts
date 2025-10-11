import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../contexts/SocketContext';

interface Post {
  _id: string;
  likes: Array<{ user: string }>;
  saves: Array<{ user: string }>;
  likesCount?: number;
  savesCount?: number;
}

export const useSocketUpdates = (locationData: any, refetch: () => void) => {
  const queryClient = useQueryClient();
  const { socket, onFeedPostLiked, offFeedPostLiked, onFeedPostSaved, offFeedPostSaved, onFeedPostShared, offFeedPostShared, onFeedReelLiked, offFeedReelLiked, onFeedReelSaved, offFeedReelSaved, onFeedReelShared, offFeedReelShared } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleFeedPostLiked = (data: any) => {
      queryClient.setQueryData(['feed', 'posts', locationData?.city], (oldData: any) => {
        if (!oldData?.data?.posts) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            posts: oldData.data.posts.map((post: Post) => {
              if (post._id === data.postId) {
                const newLikes = data.isLiked
                  ? (post.likes || []).some(like => like.user === data.userId)
                    ? post.likes
                    : [...(post.likes || []), { user: data.userId }]
                  : (post.likes || []).filter(like => like.user !== data.userId);
                return {
                  ...post,
                  likes: newLikes,
                  likesCount: data.likesCount || newLikes.length
                };
              }
              return post;
            })
          }
        };
      });
    };

    const handleFeedPostSaved = (data: any) => {
      queryClient.setQueryData(['feed', 'posts', locationData?.city], (oldData: any) => {
        if (!oldData?.data?.posts) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            posts: oldData.data.posts.map((post: Post) => {
              if (post._id === data.postId) {
                const newSaves = data.isSaved
                  ? [...(post.saves || []), { user: data.userId }]
                  : (post.saves || []).filter(save => save.user !== data.userId);
                return {
                  ...post,
                  saves: newSaves,
                  savesCount: data.savesCount || newSaves.length
                };
              }
              return post;
            })
          }
        };
      });
    };

    const handleFeedPostShared = (data: any) => {
      refetch();
    };

    const handleFeedReelLiked = (data: any) => {
      queryClient.setQueryData(['feed', 'posts', locationData?.city], (oldData: any) => {
        if (!oldData?.data?.posts) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            posts: oldData.data.posts.map((post: Post) => {
              if (post._id === data.reelId) {
                const newLikes = data.isLiked
                  ? (post.likes || []).some(like => like.user === data.userId)
                    ? post.likes
                    : [...(post.likes || []), { user: data.userId }]
                  : (post.likes || []).filter(like => like.user !== data.userId);
                return {
                  ...post,
                  likes: newLikes,
                  likesCount: data.likesCount || newLikes.length
                };
              }
              return post;
            })
          }
        };
      });
    };

    const handleFeedReelSaved = (data: any) => {
      queryClient.setQueryData(['feed', 'posts', locationData?.city], (oldData: any) => {
        if (!oldData?.data?.posts) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            posts: oldData.data.posts.map((post: Post) => {
              if (post._id === data.reelId) {
                const newSaves = data.isSaved
                  ? [...(post.saves || []), { user: data.userId }]
                  : (post.saves || []).filter(save => save.user !== data.userId);
                return {
                  ...post,
                  saves: newSaves,
                  savesCount: data.savesCount || newSaves.length
                };
              }
              return post;
            })
          }
        };
      });
    };

    const handleFeedReelShared = (data: any) => {
      refetch();
    };

    onFeedPostLiked(handleFeedPostLiked);
    onFeedPostSaved(handleFeedPostSaved);
    onFeedPostShared(handleFeedPostShared);
    onFeedReelLiked(handleFeedReelLiked);
    onFeedReelSaved(handleFeedReelSaved);
    onFeedReelShared(handleFeedReelShared);

    return () => {
      offFeedPostLiked(handleFeedPostLiked);
      offFeedPostSaved(handleFeedPostSaved);
      offFeedPostShared(handleFeedPostShared);
      offFeedReelLiked(handleFeedReelLiked);
      offFeedReelSaved(handleFeedReelSaved);
      offFeedReelShared(handleFeedReelShared);
    };
  }, [socket, onFeedPostLiked, offFeedPostLiked, onFeedPostSaved, offFeedPostSaved, onFeedPostShared, offFeedPostShared, onFeedReelLiked, offFeedReelLiked, onFeedReelSaved, offFeedReelSaved, onFeedReelShared, offFeedReelShared, queryClient, locationData?.city, refetch]);
};
