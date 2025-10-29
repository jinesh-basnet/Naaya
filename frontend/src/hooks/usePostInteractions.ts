import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { postsAPI, reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { offlineQueueService } from '../services/offlineQueueService';
import toast from 'react-hot-toast';

interface Post {
  _id: string;
  likes: Array<{ user: string }>;
  saves: Array<{ user: string }>;
  isReel?: boolean;
}

export const usePostInteractions = (locationData: any, refetch: () => void) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [heartBurst, setHeartBurst] = useState<{ [key: string]: boolean }>({});
  const [expandedCaptions, setExpandedCaptions] = useState<{ [key: string]: boolean }>({});

  const handleLike = async (postId: string, isReel?: boolean) => {
    const isOnline = offlineQueueService.getIsOnline();

    if (!isOnline) {
      offlineQueueService.addToQueue({
        type: 'like',
        data: { postId, isReel }
      });
      toast.success('Like queued - will sync when online!');
      return;
    }

    queryClient.setQueryData(['feed', 'posts', locationData?.city], (oldData: any) => {
      if (!oldData?.data?.posts) return oldData;
      return {
        ...oldData,
        data: {
          ...oldData.data,
          posts: oldData.data.posts.map((post: Post) => {
            if (post._id === postId) {
              const isLiked = post.likes?.some(like => like.user === user?._id) ?? false;
              const newLikes = isLiked
                ? post.likes.filter(like => like.user !== user?._id)
                : [...(post.likes || []), { user: user?._id }];
              return {
                ...post,
                likes: newLikes,
                likesCount: newLikes.length
              };
            }
            return post;
          })
        }
      };
    });

    try {
      if (isReel) {
        await reelsAPI.likeReel(postId);
      } else {
        await postsAPI.likePost(postId);
      }
      refetch();
    } catch (error) {
      queryClient.setQueryData(['feed', 'posts', locationData?.city], (oldData: any) => {
        if (!oldData?.data?.posts) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            posts: oldData.data.posts.map((post: Post) => {
              if (post._id === postId) {
                const isLiked = post.likes?.some(like => like.user === user?._id) ?? false;
                const newLikes = isLiked
                  ? [...(post.likes || []), { user: user?._id }]
                  : post.likes.filter(like => like.user !== user?._id);
                return {
                  ...post,
                  likes: newLikes,
                  likesCount: newLikes.length
                };
              }
              return post;
            })
          }
        };
      });
      toast.error('Failed to like');
    }
  };

  const handleSave = async (postId: string, isReel?: boolean) => {
    queryClient.setQueryData(['feed', 'posts', locationData?.city], (oldData: any) => {
      if (!oldData?.data?.posts) return oldData;
      return {
        ...oldData,
        data: {
          ...oldData.data,
          posts: oldData.data.posts.map((post: Post) => {
            if (post._id === postId) {
              const isSaved = post.saves?.some(save => save.user === user?._id) ?? false;
              const newSaves = isSaved
                ? post.saves.filter(save => save.user !== user?._id)
                : [...(post.saves || []), { user: user?._id }];
              return {
                ...post,
                saves: newSaves,
                savesCount: newSaves.length
              };
            }
            return post;
          })
        }
      };
    });

    try {
      if (isReel) {
        await reelsAPI.saveReel(postId);
      } else {
        await postsAPI.savePost(postId);
      }
      refetch();
      queryClient.invalidateQueries({ queryKey: ['userBookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['userSavedReels'] });
    } catch (error) {
      queryClient.setQueryData(['feed', 'posts', locationData?.city], (oldData: any) => {
        if (!oldData?.data?.posts) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            posts: oldData.data.posts.map((post: Post) => {
              if (post._id === postId) {
                const isSaved = post.saves?.some(save => save.user === user?._id) ?? false;
                const newSaves = isSaved
                  ? [...(post.saves || []), { user: user?._id }]
                  : post.saves.filter(save => save.user !== user?._id);
                return {
                  ...post,
                  saves: newSaves,
                  savesCount: newSaves.length
                };
              }
              return post;
            })
          }
        };
      });
      toast.error('Failed to save');
    }
  };

  const handleDoubleTap = (postId: string, filteredPosts: Post[], isReel?: boolean) => {
    const isLiked = (filteredPosts.find((p: Post) => p._id === postId)?.likes || []).some((like: { user: string }) => like.user === user?._id) ?? false;
    if (!isLiked) {
      handleLike(postId, isReel);
    }
    setHeartBurst(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => setHeartBurst(prev => ({ ...prev, [postId]: false })), 500);
  };

  return { heartBurst, expandedCaptions, setExpandedCaptions, handleLike, handleSave, handleDoubleTap };
};
