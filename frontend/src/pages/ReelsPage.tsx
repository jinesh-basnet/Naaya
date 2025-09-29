import React, { useState, useRef, useEffect } from 'react';
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
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { safeRender } from '../utils/safeRender';

interface Reel {
  _id: string;
  content: string;
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
  author: {
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

const BACKEND_BASE_URL = 'http://localhost:5000';

const ReelsPage: React.FC = () => {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const previousReelsLength = useRef(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: (reelId: string) => reelsAPI.likeReel(reelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      toast.success('Reel liked!');
    },
    onError: () => {
      toast.error('Failed to like reel');
    },
  });

  const { data: reelsData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['reels'],
    queryFn: ({ pageParam = 1 }) => reelsAPI.getFeed(pageParam),
    getNextPageParam: (lastPage: any, allPages: any) => {
      if (lastPage.data.reels.length < 8) return undefined;
      return allPages.length + 1;
    },
  });

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

  // Touch swipe support
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

  const handleLike = (reelId: string) => {
    likeMutation.mutate(reelId);
  };

  const handleVideoProgress = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const progress = (video.currentTime / video.duration) * 100;
    setProgress(progress);
  };

  const handleVideoClick = () => {
    setIsPlaying(!isPlaying);
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
        <h6 style={{ color: 'white' }}>Loading reels...</h6>
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
        const isLiked = reel.likes.some(like => like.user === user?._id);
        const videoUrl = reel.video?.url || '';

        return (
          <motion.div
            key={reel._id}
            initial={{ opacity: 0 }}
            animate={{
              opacity: isActive ? 1 : 0,
              scale: isActive ? 1 : 0.8,
            }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: isActive ? 'block' : 'none',
            }}
          >
            <div
              className="video-container"
              onClick={handleVideoClick}
            >
              {videoUrl ? (
                <video
                  ref={(el) => {
                    if (el) {
                      videoRefs.current[index] = el;
                    }
                  }}
                  src={videoUrl}
                  loop
                  muted={isMuted}
                  playsInline
                  onTimeUpdate={handleVideoProgress}
                  onLoadedData={() => {
                    if (isActive && isPlaying) {
                      videoRefs.current[index]?.play();
                    }
                  }}
                  onError={(e) => {
                    console.error('Video load error:', videoUrl);
                  }}
                  className="reel-video"
                />
              ) : (
                <div className="video-placeholder">
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    background: '#333', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white',
                    fontSize: '1.2rem'
                  }}>
                    No video available
                  </div>
                </div>
              )}

              {!isPlaying && videoUrl && (
                <div className="play-overlay">
                  <MdPlayArrow className="play-icon" />
                </div>
              )}

              {videoUrl && (
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
                {reel.author.profilePicture ? (
                  <img
                    src={reel.author.profilePicture}
                    alt={reel.author.fullName}
                    className="user-avatar"
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    {safeRender(reel.author.fullName).charAt(0)}
                  </div>
                )}
                <div className="user-details">
                  <div className="user-name">
                    {safeRender(reel.author.fullName)}
                    {reel.author.isVerified && (
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
                  {safeRender(reel.content)}
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
                <div className="side-action-btn">
                  <MdBookmarkBorder style={{ color: 'white', fontSize: 28 }} />
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
