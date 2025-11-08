import React, { useState, useRef, useEffect } from 'react';
import './ReelsPage.css';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import ReelCommentsModal from '../components/ReelCommentsModal';
import ReelItem from '../components/ReelItem';

interface Reel {
  _id: string;
  caption: string;
  video: {
    url: string;
    thumbnail?: string;
    duration?: number;
    size?: number;
    width?: number;
    height?: number;
    format?: string;
  };
  audio?: {
    title: string;
    artist: string;
    url: string;
    startTime: number;
    duration: number;
    isOriginal: boolean;
  };
  author?: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture: string;
    isVerified: boolean;
  };
  location: {
    city: string;
    district: string;
  };
  language: string;
  likes: Array<{ user: string }>;
  comments: Array<{
    _id: string;
    author: {
      username: string;
      fullName: string;
      profilePicture: string;
    };
    content: string;
    createdAt: string;
  }>;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
}



const ReelsPage: React.FC = () => {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const previousReelsLength = useRef(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { onFeedReelLiked, offFeedReelLiked, onFeedReelSaved, offFeedReelSaved } = useSocket();
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});
  const [savedReels, setSavedReels] = useState<Set<string>>(new Set());
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string>('');
  const [selectedReelAuthorId, setSelectedReelAuthorId] = useState<string>('');
  const [selectedReelCommentsCount, setSelectedReelCommentsCount] = useState(0);





  const { data: reelsData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['reels'],
    queryFn: ({ pageParam = 1 }) => reelsAPI.getFeed(pageParam),
    getNextPageParam: (lastPage: any, allPages: any) => {
      if (lastPage.data.reels.length < 8) return undefined;
      return allPages.length + 1;
    },
  });

  useEffect(() => {
    if (user) {
      const fetchSavedReels = async () => {
        try {
        } catch (error) {
          console.error('Failed to fetch saved reels:', error);
        }
      };
      fetchSavedReels();
    }
  }, [user]);

  useEffect(() => {
    const handleFeedReelLiked = (data: any) => {
      queryClient.setQueryData(['reels'], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: {
              ...page.data,
              reels: page.data.reels.map((reel: any) => {
                if (reel._id === data.reelId) {
                  const newLikes = data.isLiked
                    ? [...(reel.likes || []), { user: data.userId }]
                    : (reel.likes || []).filter((like: { user: string }) => like.user !== data.userId);
                  return {
                    ...reel,
                    likes: newLikes,
                    likesCount: data.likesCount || newLikes.length
                  };
                }
                return reel;
              })
            }
          }))
        };
      });
    };

    const handleFeedReelSaved = (data: any) => {
      if (data.userId === user?._id) {
        setSavedReels(prev => {
          const newSet = new Set(prev);
          if (data.isSaved) {
            newSet.add(data.reelId);
          } else {
            newSet.delete(data.reelId);
          }
          return newSet;
        });
      }
    };

    onFeedReelLiked(handleFeedReelLiked);
    onFeedReelSaved(handleFeedReelSaved);

    return () => {
      offFeedReelLiked(handleFeedReelLiked);
      offFeedReelSaved(handleFeedReelSaved);
    };
  }, [queryClient, user?._id, onFeedReelLiked, offFeedReelLiked, onFeedReelSaved, offFeedReelSaved]);

  const reels = reelsData?.pages?.flatMap(page => page.data?.reels || []) || [];

  useEffect(() => {
    previousReelsLength.current = reels.length;
  }, [reels.length]);

  useEffect(() => {
    if (pendingAdvance && !isFetchingNextPage && reels.length > previousReelsLength.current) {
      setCurrentReelIndex(reels.length - 1);
      setPendingAdvance(false);
    }
  }, [isFetchingNextPage, reels.length, pendingAdvance]);

  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (commentsModalOpen) return;
    if (!touchStartY.current || !touchEndY.current) return;

    const touchDistance = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 50;

    if (Math.abs(touchDistance) < minSwipeDistance) return;

    if (touchDistance > 0) {
      if (currentReelIndex < reels.length - 1) {
        setCurrentReelIndex(prev => prev + 1);
      } else if (hasNextPage && !isFetchingNextPage) {
        setPendingAdvance(true);
        fetchNextPage();
      }
    } else if (touchDistance < 0 && currentReelIndex > 0) {
      setCurrentReelIndex(prev => prev - 1);
    }

    touchStartY.current = 0;
    touchEndY.current = 0;
  };

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (commentsModalOpen) return;
      e.preventDefault();
      if (e.deltaY > 0) {
        if (currentReelIndex < reels.length - 1) {
          setCurrentReelIndex(prev => prev + 1);
        } else if (hasNextPage && !isFetchingNextPage) {
          setPendingAdvance(true);
          fetchNextPage();
        }
      } else if (e.deltaY < 0 && currentReelIndex > 0) {
        setCurrentReelIndex(prev => prev - 1);
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (commentsModalOpen) return;
      if (e.key === 'ArrowDown') {
        if (currentReelIndex < reels.length - 1) {
          setCurrentReelIndex(prev => prev + 1);
        } else if (hasNextPage && !isFetchingNextPage) {
          setPendingAdvance(true);
          fetchNextPage();
        }
      } else if (e.key === 'ArrowUp' && currentReelIndex > 0) {
        setCurrentReelIndex(prev => prev - 1);
      }
    };

    window.addEventListener('wheel', handleScroll, { passive: false });
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentReelIndex, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage, commentsModalOpen]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentReelIndex) {
          if (isPlaying) {
            // Ensure video is ready before playing to prevent unhandled promise rejections
            if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
              video.play().catch(error => {
                // Handle autoplay interruption (e.g., browser power saving)
                console.warn('Video play interrupted:', error.message);
              });
            } else {
              // Wait for video to be ready
              const handleCanPlay = () => {
                video.play().catch(error => {
                  console.warn('Video play interrupted:', error.message);
                });
                video.removeEventListener('canplay', handleCanPlay);
              };
              video.addEventListener('canplay', handleCanPlay);
            }
          } else {
            video.pause();
          }
        } else {
          video.pause();
        }
      }
    });
  }, [currentReelIndex, isPlaying]);

  useEffect(() => {
    const currentVideo = videoRefs.current[currentReelIndex];
    if (currentVideo) {
      currentVideo.muted = isMuted;
    }
  }, [isMuted, currentReelIndex]);

  const handleLike = async (reelId: string) => {
    queryClient.setQueryData(['reels'], (oldData: any) => {
      if (!oldData?.pages) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          data: {
            ...page.data,
            reels: page.data.reels.map((reel: any) => {
              if (reel._id === reelId) {
                const isLiked = reel.likes?.some((like: { user: string }) => like.user === user?._id) ?? false;
                const newLikes = isLiked
                  ? reel.likes.filter((like: { user: string }) => like.user !== user?._id)
                  : [...(reel.likes || []), { user: user?._id }];
                return {
                  ...reel,
                  likes: newLikes,
                  likesCount: newLikes.length
                };
              }
              return reel;
            })
          }
        }))
      };
    });

    try {
      await reelsAPI.likeReel(reelId);
    } catch (error) {
      queryClient.setQueryData(['reels'], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: {
              ...page.data,
              reels: page.data.reels.map((reel: any) => {
                if (reel._id === reelId) {
                  const isLiked = reel.likes?.some((like: { user: string }) => like.user === user?._id) ?? false;
                  const newLikes = isLiked
                    ? [...(reel.likes || []), { user: user?._id }]
                    : reel.likes.filter((like: { user: string }) => like.user !== user?._id);
                  return {
                    ...reel,
                    likes: newLikes,
                    likesCount: newLikes.length
                  };
                }
                return reel;
              })
            }
          }))
        };
      });
      toast.error('Failed to like reel');
    }
  };

  const handleSave = async (reelId: string) => {
    if (!user) {
      toast.error('Please login to save reels');
      return;
    }

    const isCurrentlySaved = savedReels.has(reelId);
    setSavedReels(prev => {
      const newSet = new Set(prev);
      if (isCurrentlySaved) {
        newSet.delete(reelId);
      } else {
        newSet.add(reelId);
      }
      return newSet;
    });

    try {
      await reelsAPI.saveReel(reelId);
    } catch (error) {
      setSavedReels(prev => {
        const newSet = new Set(prev);
        if (isCurrentlySaved) {
          newSet.add(reelId);
        } else {
          newSet.delete(reelId);
        }
        return newSet;
      });
      toast.error('Failed to save reel');
    }
  };

  const handleVideoProgress = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const progress = (video.currentTime / video.duration) * 100;
    setProgress(progress);
  };

  const handleVideoClick = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVideoEnd = () => {
    if (currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(prev => prev + 1);
    } else if (hasNextPage && !isFetchingNextPage) {
      setPendingAdvance(true);
      fetchNextPage();
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <h6>Loading reels...</h6>
      </div>
    );
  }

  return (
    <div
      className="reels-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {reels.map((reel: Reel, index: number) => (
        <ReelItem
          key={`${reel._id}-${index}`}
          reel={reel}
          index={index}
          isActive={index === currentReelIndex}
          isPlaying={isPlaying}
          isMuted={isMuted}
          progress={progress}
          user={user}
          savedReels={savedReels}
          videoRefs={videoRefs}
          videoErrors={videoErrors}
          setVideoErrors={setVideoErrors}
          handleLike={handleLike}
          handleSave={handleSave}
          handleVideoProgress={handleVideoProgress}
          handleVideoClick={handleVideoClick}
          handleVideoEnd={handleVideoEnd}
          setCommentsModalOpen={setCommentsModalOpen}
          setSelectedReelId={setSelectedReelId}
          setSelectedReelAuthorId={setSelectedReelAuthorId}
          setSelectedReelCommentsCount={setSelectedReelCommentsCount}
          formatTimeAgo={formatTimeAgo}
          isFetchingNextPage={isFetchingNextPage}
          isLast={index === reels.length - 1}
        />
      ))}

      {reels.length === 0 && (
        <div className="no-reels">
          <h6>No reels available</h6>
        </div>
      )}

      {commentsModalOpen && (
        <ReelCommentsModal
          isOpen={commentsModalOpen}
          onClose={() => setCommentsModalOpen(false)}
          reelId={selectedReelId}
          reelAuthorId={selectedReelAuthorId}
          initialCommentsCount={selectedReelCommentsCount}
        />
      )}
    </div>
  );
};

export default ReelsPage;
