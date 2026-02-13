import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaXmark, FaPlay, FaPause, FaHeart, FaPaperPlane, FaUsers, FaLock, FaPlus, FaVolumeHigh, FaVolumeLow, FaVolumeXmark } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';
import { useStoryView } from '../contexts/StoryViewContext';
import { useAuth } from '../contexts/AuthContext';
import { storiesAPI } from '../services/api';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import './StoryViewer.css';

interface Story {
  _id: string;
  content?: string;
  media?: {
    url: string;
    type: string;
  };
  createdAt: string;
  visibility?: 'public' | 'close_friends' | 'private';
  author: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
  };
  viewsCount?: number;
  reactions?: any[];
}

interface StoryViewerProps {
  stories: Story[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onCreateStory?: () => void;
  onUserClick?: (userId: string) => void;
  getMediaUrl: (url?: string) => string;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  currentIndex,
  isOpen,
  onClose,
  onCreateStory,
  onUserClick,
  getMediaUrl
}) => {
  const [currentIdx, setCurrentIdx] = useState(currentIndex);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { markStoryAsViewed } = useStoryView();
  const { user } = useAuth();

  const currentStory = stories[currentIdx];
  const DEFAULT_DURATION = 5000; // 5 seconds for images

  const handleNext = useCallback(() => {
    if (currentIdx < stories.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIdx, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [currentIdx]);

  // Progress logic
  useEffect(() => {
    if (!isOpen || !isPlaying || !currentStory) return;

    const isVideo = currentStory.media?.type === 'video';
    const duration = isVideo && videoRef.current?.duration
      ? videoRef.current.duration * 1000
      : DEFAULT_DURATION;

    const step = 100 / (duration / 30); // update every 30ms

    progressTimerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimerRef.current!);
          handleNext();
          return 100;
        }
        return prev + step;
      });
    }, 30);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentIdx, isPlaying, isOpen, currentStory, handleNext]);

  // Video sync
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(e => console.log("Video play failed", e));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentIdx]);

  useEffect(() => {
    if (currentStory && isOpen) {
      markStoryAsViewed(currentStory._id);
      setProgress(0);
      setIsPlaying(true);
      setIsLiked(currentStory.reactions?.some(r => r.user === user?._id && r.type === 'love') || false);
    }
  }, [currentIdx, isOpen, currentStory?._id]);

  const handleReaction = async (emoji: string) => {
    const reactionMap: { [key: string]: string } = {
      '❤️': 'love',
      '😂': 'laugh',
      '😮': 'wow',
      '😢': 'sad',
      '🔥': 'like',
      '👏': 'like'
    };

    const reactionType = reactionMap[emoji] || 'like';

    try {
      await storiesAPI.addReaction(currentStory._id, reactionType);
      if (emoji === '❤️') setIsLiked(true);
      toast.success('Reaction sent!');
    } catch (error) {
      toast.error('Failed to send reaction');
    }
  };

  const toggleLike = async () => {
    try {
      if (isLiked) {
        await storiesAPI.removeReaction(currentStory._id);
        setIsLiked(false);
      } else {
        await storiesAPI.addReaction(currentStory._id, 'love');
        setIsLiked(true);
        toast.success('Liked!');
      }
    } catch (error) {
      toast.error('Failed to update like');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await storiesAPI.addReply(currentStory._id, replyText);
      toast.success('Reply sent!');
      setReplyText('');
      setIsPlaying(true);
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <motion.div
        className="story-viewer-card"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Progress Bars */}
        <div className="story-progress-container">
          {stories.map((_, idx) => (
            <div key={idx} className="story-progress-track">
              <div
                className="story-progress-fill"
                style={{
                  width: idx < currentIdx ? '100%' : (idx === currentIdx ? `${progress}%` : '0%'),
                  transition: idx === currentIdx ? 'none' : 'width 0.2s linear'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="story-header">
          <div
            className="story-author"
            onClick={() => onUserClick?.(currentStory.author._id)}
          >
            <div className="avatar-wrapper">
              <Avatar
                src={currentStory.author.profilePicture}
                alt={currentStory.author.username}
                name={currentStory.author.username}
                size="100%"
              />
            </div>
            <div className="author-meta">
              <span className="username">{currentStory.author.username}</span>
              <span className="time-ago">
                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {currentStory.visibility === 'close_friends' && (
              <div className="visibility-badge close-friends">
                <FaUsers size={10} />
                <span>Close Friends</span>
              </div>
            )}
          </div>

          <div className="header-actions">
            <button onClick={() => setIsMuted(prev => !prev)} className="action-icon">
              {isMuted ? <FaVolumeXmark size={18} /> : <FaVolumeHigh size={18} />}
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="action-icon">
              {isPlaying ? <FaPause size={18} /> : <FaPlay size={18} />}
            </button>
            {onCreateStory && (
              <button onClick={onCreateStory} className="action-icon">
                <FaPlus size={18} />
              </button>
            )}
            <button onClick={onClose} className="close-icon"><FaXmark size={24} /></button>
          </div>
        </div>

        {/* Media Content */}
        <div
          className="story-media-container"
          onMouseDown={() => setIsPlaying(false)}
          onMouseUp={() => setIsPlaying(true)}
          onMouseLeave={() => setIsPlaying(true)}
          onTouchStart={() => setIsPlaying(false)}
          onTouchEnd={() => setIsPlaying(true)}
        >
          <div className="nav-click-left" onClick={handlePrev} />
          <div className="nav-click-right" onClick={handleNext} />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStory._id}
              className="media-wrapper"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStory.media?.type === 'video' ? (
                <video
                  ref={videoRef}
                  src={getMediaUrl(currentStory.media.url)}
                  autoPlay
                  muted={isMuted}
                  playsInline
                  className="story-main-media"
                  onEnded={handleNext}
                  onLoadedMetadata={() => setProgress(0)}
                />
              ) : (
                <img src={getMediaUrl(currentStory.media?.url)} alt="" className="story-main-media" />
              )}
            </motion.div>
          </AnimatePresence>

          {currentStory.content && (
            <motion.div
              className="story-caption"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`caption-${currentStory._id}`}
            >
              <p>{currentStory.content}</p>
            </motion.div>
          )}
        </div>

        {/* Interaction Bar */}
        <div className="story-footer">
          <div className="footer-main">
            <div className="reply-input-wrapper">
              <input
                type="text"
                placeholder={`Reply to ${currentStory.author.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setIsPlaying(false)}
                onBlur={() => setIsPlaying(true)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
              />
              {replyText && (
                <button className="send-btn" onClick={handleReply}>
                  <FaPaperPlane />
                </button>
              )}
            </div>
            <button
              className={`like-btn ${isLiked ? 'liked' : ''}`}
              onClick={toggleLike}
            >
              <FaHeart />
            </button>
          </div>

          <div className="quick-reactions">
            {['😂', '😮', '😢', '🔥', '👏'].map(emoji => (
              <button key={emoji} onClick={() => handleReaction(emoji)} className="emoji-btn">
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Side Navigation Buttons (Desktop) */}
      <div className="desktop-story-nav" onClick={e => e.stopPropagation()}>
        <button className="nav-btn prev" onClick={handlePrev} disabled={currentIdx === 0}>
          ‹
        </button>
        <button className="nav-btn next" onClick={handleNext} disabled={currentIdx === stories.length - 1}>
          ›
        </button>
      </div>
    </div>
  );
};

export default StoryViewer;
