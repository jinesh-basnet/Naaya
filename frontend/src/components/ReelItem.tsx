import React from 'react';
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

interface ReelItemProps {
  reel: Reel;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  progress: number;
  user: any;
  savedReels: Set<string>;
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
  videoErrors: Record<string, boolean>;
  setVideoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleLike: (reelId: string) => void;
  handleSave: (reelId: string) => void;
  handleVideoProgress: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  handleVideoClick: () => void;
  handleVideoEnd: () => void;
  setCommentsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedReelId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedReelAuthorId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedReelCommentsCount: React.Dispatch<React.SetStateAction<number>>;
  formatTimeAgo: (dateString: string) => string;
  isFetchingNextPage: boolean;
  isLast: boolean;
}

const ReelItem: React.FC<ReelItemProps> = ({
  reel,
  index,
  isActive,
  isPlaying,
  isMuted,
  progress,
  user,
  savedReels,
  videoRefs,
  videoErrors,
  setVideoErrors,
  handleLike,
  handleSave,
  handleVideoProgress,
  handleVideoClick,
  handleVideoEnd,
  setCommentsModalOpen,
  setSelectedReelId,
  setSelectedReelAuthorId,
  setSelectedReelCommentsCount,
  formatTimeAgo,
  isFetchingNextPage,
  isLast,
}) => {
  const navigate = useNavigate();
  const isLiked = reel.likes?.some(like => like.user === user?._id) ?? false;
  const isSaved = savedReels.has(reel._id);
  const videoUrl = reel.video?.url ? (reel.video.url.startsWith('http') ? reel.video.url : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${reel.video.url}`) : '';

  return (
    <div
      key={`${reel._id}-${index}`}
      className={`reel-item ${isActive ? 'active' : 'inactive'}`}
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
              console.error(`[ReelItem] Video load error for reel ${reel._id}:`, {
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
          <div
            className="side-action-btn"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              e.stopPropagation();
              setSelectedReelId(reel._id);
              setSelectedReelAuthorId(reel.author?._id || '');
              setSelectedReelCommentsCount(reel.commentsCount);
              setCommentsModalOpen(true);
            }}
          >
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
              // Note: setIsMuted is not passed, assuming it's handled at page level
              // This might need adjustment if mute is per reel
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

      {isActive && isLast && isFetchingNextPage && (
        <div className="loading-overlay">
          <div>Loading more reels...</div>
        </div>
      )}
    </div>
  );
};

export default ReelItem;
