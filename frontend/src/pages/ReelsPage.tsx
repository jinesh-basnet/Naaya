import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdFavorite,
  MdFavoriteBorder,
  MdChat,
  MdShare,
  MdBookmarkBorder,
  MdMoreVert,
  MdVolumeUp,
  MdVolumeOff,
  MdPlayArrow,
  MdVisibility,
} from 'react-icons/md';
import './ReelsPage.css';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { safeRender } from '../utils/safeRender';

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
  const navigate = useNavigate();
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const previousReelsLength = useRef(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { onFeedReelLiked, offFeedReelLiked, onFeedReelSaved, offFeedReelSaved } = useSocket();
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});
  const [savedReels, setSavedReels] = useState<Set<string>>(new Set());



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
              reels: page.data.reels.map((reel: Reel) => {
                if (reel._id === data.reelId) {
                  const newLikes = data.isLiked
                    ? [...(reel.likes || []), { user: data.userId }]
                    : (reel.likes || []).filter(like => like.user !== data.userId);
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
  }, [currentReelIndex, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentReelIndex) {
          if (isPlaying) {
            video.play();
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
            reels: page.data.reels.map((reel: Reel) => {
              if (reel._id === reelId) {
                const isLiked = reel.likes?.some(like => like.user === user?._id) ?? false;
                const newLikes = isLiked
                  ? reel.likes.filter(like => like.user !== user?._id)
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
              reels: page.data.reels.map((reel: Reel) => {
                if (reel._id === reelId) {
                  const isLiked = reel.likes?.some(like => like.user === user?._id) ?? false;
                  const newLikes = isLiked
                    ? [...(reel.likes || []), { user: user?._id }]
                    : reel.likes.filter(like => like.user !== user?._id);
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
      // Revert optimistic update on error
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
      {reels.map((reel: Reel, index: number) => {
        const isActive = index === currentReelIndex;
        const isLiked = reel.likes?.some(like => like.user === user?._id) ?? false;
        const isSaved = savedReels.has(reel._id);
        const videoUrl = reel.video?.url ? (reel.video.url.startsWith('http') ? reel.video.url : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${reel.video.url}`) : '';

        return (
          <motion.div
            key={`${reel._id}-${index}`}
            className={`reel-item ${isActive ? 'active' : 'inactive'}`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: isActive ? 1 : 0,
              scale: isActive ? 1 : 0.8,
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="video-container">
              {videoUrl && !videoErrors[reel._id] ? (
                <video
                  ref={(el) => {
                    if (el) {
                      videoRefs.current[index] = el;
                    }
                  }}
                  src={videoUrl}
                  autoPlay
                  muted={isMuted}
                  playsInline
                  onTimeUpdate={handleVideoProgress}
                  onClick={handleVideoClick}
                  onEnded={handleVideoEnd}
                  onError={(e) => {
                    console.error(`[ReelsPage] Video load error for reel ${reel._id}:`, {
                      videoUrl,
                      error: e,
                      reelData: reel.video
                    });
                    setVideoErrors(prev => ({ ...prev, [reel._id]: true }));
                    toast.error(`Failed to load video for reel: ${reel.caption?.slice(0, 50) || 'Unknown'}`);
                  }}
                  className="reel-video"
                />
              ) : (
                <div className="video-placeholder">
                  {videoErrors[reel._id] ? 'Video unavailable' : 'No video available'}
                </div>
              )}

              {!isPlaying && videoUrl && !videoErrors[reel._id] && (
                <div className="play-overlay">
                  <MdPlayArrow className="play-icon" />
                </div>
              )}

              {videoUrl && !videoErrors[reel._id] && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${isActive ? progress : 0}%` }}
                  />
                </div>
              )}
            </div>

            <div className="top-left-overlay">
              <div className="user-info">
                {reel.author && reel.author.profilePicture ? (
                  <img
                    src={reel.author.profilePicture}
                    alt={reel.author.fullName}
                    className="user-avatar"
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    {reel.author ? safeRender(reel.author.fullName).charAt(0) : '?'}
                  </div>
                )}
                <div className="user-details">
                  <div className="user-name" onClick={() => navigate(`/profile/${reel.author?.username}`)}>
                    {reel.author ? safeRender(reel.author.fullName) : 'Unknown User'}
                    {reel.author?.isVerified && (
                      <div className="verified-badge">
                        ✓
                      </div>
                    )}
                  </div>
                  <span className="user-meta">
                    {formatTimeAgo(reel.createdAt)}
                    {reel.location?.city && ` · 📍 ${reel.location.city}`}
                  </span>
                </div>
                <button className="more-btn">
                  <MdMoreVert />
                </button>
              </div>
            </div>

            <div className="bottom-left-overlay">
              <div className="content-info">
                <p className="reel-caption">
                  {safeRender(reel.caption)}
                </p>
                {reel.audio && (
                  <div className="music-info">
                    <span>♪ {reel.audio.title} - {reel.audio.artist}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="side-actions">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="side-action-item"
              >
                <div
                  className="side-action-btn"
                  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    handleLike(reel._id);
                  }}
                >
                  {isLiked ? (
                    <MdFavorite style={{ color: '#e91e63', fontSize: 28 }} />
                  ) : (
                    <MdFavoriteBorder style={{ color: 'white', fontSize: 28 }} />
                  )}
                </div>
                <span className="side-action-count">{reel.likesCount}</span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="side-action-item"
              >
                <div className="side-action-btn">
                  <MdChat style={{ color: 'white', fontSize: 28 }} />
                </div>
                <span className="side-action-count">{reel.commentsCount}</span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="side-action-item"
              >
                <div className="side-action-btn">
                  <MdVisibility style={{ color: 'white', fontSize: 28 }} />
                </div>
                <span className="side-action-count">{reel.viewsCount}</span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="side-action-item"
              >
                <div className="side-action-btn">
                  <MdShare style={{ color: 'white', fontSize: 28 }} />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="side-action-item"
              >
                <div
                  className="side-action-btn"
                  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    if (user) {
                      handleSave(reel._id);
                    } else {
                      toast.error('Please login to save reels');
                    }
                  }}
                  title={isSaved ? 'Unsave Reel' : 'Save Reel'}
                >
                  {isSaved ? (
                    <MdBookmarkBorder style={{ color: '#e91e63', fontSize: 28 }} />
                  ) : (
                    <MdBookmarkBorder style={{ color: 'white', fontSize: 28 }} />
                  )}
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="side-action-item"
              >
                <div
                  className="side-action-btn"
                  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                >
                  {isMuted ? (
                    <MdVolumeOff style={{ color: 'white', fontSize: 28 }} />
                  ) : (
                    <MdVolumeUp style={{ color: 'white', fontSize: 28 }} />
                  )}
                </div>
              </motion.div>
            </div>

            {isActive && index === reels.length - 1 && isFetchingNextPage && (
              <div className="loading-overlay">
                <div>Loading more reels...</div>
              </div>
            )}
          </motion.div>
        );
      })}

      {reels.length === 0 && (
        <div className="no-reels">
          <h6>No reels available</h6>
        </div>
      )}
    </div>
  );
};

export default ReelsPage;
