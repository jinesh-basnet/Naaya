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
} from 'react-icons/md';
import './ReelsPage.css';
import { useInfiniteQuery } from '@tanstack/react-query';
import { reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { safeRender } from '../utils/safeRender';

interface Reel {
  _id: string;
  content: string;
  media: Array<{
    type: string;
    url: string;
    thumbnail?: string;
  }>;
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
}

const BACKEND_BASE_URL = 'http://localhost:5000';

const ReelsPage: React.FC = () => {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const { user } = useAuth();

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
    const handleScroll = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0 && currentReelIndex < reels.length - 1) {
        setCurrentReelIndex(prev => prev + 1);
      } else if (e.deltaY < 0 && currentReelIndex > 0) {
        setCurrentReelIndex(prev => prev - 1);
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && currentReelIndex < reels.length - 1) {
        setCurrentReelIndex(prev => prev + 1);
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
  }, [currentReelIndex, reels.length]);

  useEffect(() => {
    // Pause all videos except current one
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
    try {
      await reelsAPI.likeReel(reelId);
      toast.success('Reel liked!');
    } catch (error) {
      toast.error('Failed to like reel');
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
    <div className="reels-container">
      {reels.map((reel: Reel, index: number) => {
        const isActive = index === currentReelIndex;
        const isLiked = reel.likes.some(like => like.user === user?._id);
        const mediaUrl = reel.media?.[0]?.url;
        const normalizedUrl = mediaUrl?.replace(/\\/g, '/').replace(/^\/?/, '/');
        const fullUrl = mediaUrl ? `${BACKEND_BASE_URL}${normalizedUrl}` : '';

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
            {/* Video */}
            <div
              className="video-container"
              onClick={handleVideoClick}
            >
              <video
                ref={(el) => {
                  if (el) {
                    videoRefs.current[index] = el;
                  }
                }}
                src={fullUrl}
                loop
                muted={isMuted}
                playsInline
                onTimeUpdate={handleVideoProgress}
                onLoadedData={() => {
                  if (isActive && isPlaying) {
                    videoRefs.current[index]?.play();
                  }
                }}
                className="reel-video"
              />

              {/* Play/Pause Overlay */}
              {!isPlaying && (
                <div className="play-overlay">
                  <MdPlayArrow className="play-icon" />
                </div>
              )}

              {/* Progress Bar */}
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${isActive ? progress : 0}%` }}
                />
              </div>
            </div>

            {/* Content Overlay */}
            <div className="content-overlay">
              {/* User Info */}
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

              {/* Caption */}
              <p className="reel-caption">
                {safeRender(reel.content)}
              </p>

              {/* Actions */}
              <div className="actions-bar">
                <button
                  className={`action-btn ${isLiked ? 'liked' : ''}`}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    handleLike(reel._id);
                  }}
                >
                  {isLiked ? <MdFavorite /> : <MdFavoriteBorder />}
                </button>
                <span className="action-count">
                  {reel.likesCount}
                </span>

                <button className="action-btn">
                  <MdChat />
                </button>
                <span className="action-count">
                  {reel.commentsCount}
                </span>

                <button className="action-btn">
                  <MdShare />
                </button>

                <div style={{ flex: 1 }} />

                <button
                  className="action-btn"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                >
                  {isMuted ? <MdVolumeOff /> : <MdVolumeUp />}
                </button>
              </div>
            </div>

            {/* Side Actions */}
            <div className="side-actions">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <div
                  className="side-action-btn"
                  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    handleLike(reel._id);
                  }}
                >
                  {isLiked ? (
                    <MdFavorite style={{ color: '#e91e63', fontSize: 24 }} />
                  ) : (
                    <MdFavoriteBorder style={{ color: 'white', fontSize: 24 }} />
                  )}
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className="side-action-btn">
                  <MdChat style={{ color: 'white', fontSize: 24 }} />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className="side-action-btn">
                  <MdShare style={{ color: 'white', fontSize: 24 }} />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className="side-action-btn">
                  <MdBookmarkBorder style={{ color: 'white', fontSize: 24 }} />
                </div>
              </motion.div>
            </div>
          </motion.div>
        );
      })}

      {/* Reel Counter */}
      <div className="reel-counter">
        {currentReelIndex + 1} / {reels.length}
      </div>

      {reels.length === 0 && (
        <div className="no-reels">
          <h6>No reels available</h6>
        </div>
      )}
    </div>
  );
};

export default ReelsPage;
