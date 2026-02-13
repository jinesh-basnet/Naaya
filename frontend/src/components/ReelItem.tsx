import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiHeart,
  HiOutlineHeart,
  HiChatBubbleLeftEllipsis,
  HiShare,
  HiBookmark,
  HiOutlineBookmark,
  HiEllipsisVertical,
  HiSpeakerWave,
  HiSpeakerXMark,
  HiOutlineFlag,
  HiOutlineTrash,
  HiOutlineLink,
  HiOutlineEyeSlash,
} from 'react-icons/hi2';
import { HiMusicNote, HiCheckCircle } from 'react-icons/hi';
import { MdPlayArrow } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { reelsAPI } from '../services/api';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Avatar from './Avatar';
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
  const queryClient = useQueryClient();
  const [showHeart, setShowHeart] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastTap = useRef<number>(0);

  const isLiked = reel.likes?.some(like => like.user === user?._id) ?? false;
  const isSaved = savedReels.has(reel._id);
  const isAuthor = reel.author?._id === user?._id;

  const handleAction = async (action: string) => {
    setShowActionMenu(false);
    switch (action) {
      case 'delete':
        setShowDeleteModal(true);
        break;
      case 'report':
        toast.success('Reel reported. Thank you for keeping Naaya safe.');
        break;
      case 'copy-link':
        const link = `${window.location.origin}/reel/${reel._id}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard');
        break;
      case 'not-interested':
        toast.success("We'll show you fewer reels like this");
        break;
      default:
        break;
    }
  };

  const videoUrl = reel.video?.url
    ? (reel.video.url.startsWith('http')
      ? reel.video.url
      : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${reel.video.url}`)
    : '';

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await reelsAPI.deleteReel(reel._id);
      toast.success('Reel deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['reelsFeed'] });
      queryClient.invalidateQueries({ queryKey: ['userReels', reel.author?.username] });
      setShowDeleteModal(false);
    } catch (error) {
      toast.error('Failed to delete reel');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDoubleTap = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (!isLiked) {
        handleLike(reel._id);
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    } else {
      handleVideoClick();
    }
    lastTap.current = now;
  }, [reel._id, isLiked, handleLike, handleVideoClick]);

  return (
    <div className="reel-item">
      <div className="video-container" onClick={handleDoubleTap}>
        {videoUrl && !videoErrors[reel._id] ? (
          <video
            ref={(el) => { if (el) videoRefs.current[index] = el; }}
            src={videoUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onTimeUpdate={handleVideoProgress}
            onError={() => {
              setVideoErrors(prev => ({ ...prev, [reel._id]: true }));
            }}
            className="reel-video"
          />
        ) : (
          <div className="video-placeholder">
            <div className="spinner" />
          </div>
        )}

        {/* Gradients */}
        <div className="top-gradient-overlay" />
        <div className="bottom-gradient-overlay" />

        {/* Interaction Overlays */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="mega-heart-v2"
            >
              <HiHeart size={80} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`play-overlay ${!isPlaying ? 'visible' : ''}`}>
          <MdPlayArrow size={60} />
        </div>

        {/* UI Controls Row (Top) */}
        <div className="top-actions-row">
          <span className="top-title">Reels</span>
          <button
            className="icon-btn-minimal"
            onClick={(e) => { e.stopPropagation(); setShowActionMenu(!showActionMenu); }}
          >
            <HiEllipsisVertical size={24} />
          </button>

          <AnimatePresence>
            {showActionMenu && (
              <>
                <div className="menu-backdrop-v2" onClick={() => setShowActionMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="action-dropdown-v2 reel-dropdown"
                >
                  <button className="menu-item-v2" onClick={() => handleAction('copy-link')}>
                    <HiOutlineLink size={18} /> <span>Copy Link</span>
                  </button>
                  {!isAuthor && (
                    <button className="menu-item-v2" onClick={() => handleAction('not-interested')}>
                      <HiOutlineEyeSlash size={18} /> <span>Not Interested</span>
                    </button>
                  )}
                  <button className="menu-item-v2" onClick={() => handleAction('report')}>
                    <HiOutlineFlag size={18} /> <span>Report</span>
                  </button>
                  {isAuthor && (
                    <button className="menu-item-v2 danger" onClick={() => handleAction('delete')}>
                      <HiOutlineTrash size={18} /> <span>Delete Reel</span>
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Side Actions (Right) */}
        <div className="side-actions-v2">
          <div className="action-item-v2">
            <motion.button
              whileTap={{ scale: 0.8 }}
              className={`action-btn-minimal ${isLiked ? 'liked' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleLike(reel._id); }}
            >
              {isLiked ? <HiHeart size={32} /> : <HiOutlineHeart size={32} />}
            </motion.button>
            <span className="action-count-v2">{reel.likesCount}</span>
          </div>

          <div className="action-item-v2">
            <motion.button
              whileTap={{ scale: 0.8 }}
              className="action-btn-minimal"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReelId(reel._id);
                setSelectedReelAuthorId(reel.author?._id || '');
                setSelectedReelCommentsCount(reel.commentsCount);
                setCommentsModalOpen(true);
              }}
            >
              <HiChatBubbleLeftEllipsis size={30} />
            </motion.button>
            <span className="action-count-v2">{reel.commentsCount}</span>
          </div>

          <div className="action-item-v2">
            <motion.button
              whileTap={{ scale: 0.8 }}
              className="action-btn-minimal"
              onClick={(e) => { e.stopPropagation(); toast.success('Link copied!'); }}
            >
              <HiShare size={30} />
            </motion.button>
          </div>

          <div className="action-item-v2">
            <motion.button
              whileTap={{ scale: 0.8 }}
              className="action-btn-minimal"
              onClick={(e) => { e.stopPropagation(); handleSave(reel._id); }}
            >
              {isSaved ? <HiBookmark size={30} /> : <HiOutlineBookmark size={30} />}
            </motion.button>
          </div>

          <div className="action-item-v2">
            <button className="icon-btn-minimal" onClick={(e) => e.stopPropagation()}>
              {isMuted ? <HiSpeakerXMark size={24} /> : <HiSpeakerWave size={24} />}
            </button>
          </div>

          {/* Music Disk Animation */}
          <div className="music-disk-container">
            <div className="music-disk">
              <div className="music-disk-inner" />
            </div>
          </div>
        </div>

        {/* Bottom Content (Left) */}
        <div className="content-section-v2">
          <div className="user-row-v2" onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${reel.author?.username}`);
          }}>
            <Avatar
              src={reel.author?.profilePicture}
              alt={reel.author?.username || 'User'}
              name={reel.author?.fullName}
              size={32}
              className="user-avatar-v2"
            />
            <span className="user-name-v2">
              {reel.author?.username}
              {reel.author?.isVerified && <HiCheckCircle size={14} color="#0095f6" />}
            </span>
            <button className="follow-btn-v2" onClick={(e) => e.stopPropagation()}>
              Follow
            </button>
          </div>

          <p className="caption-v2">
            {safeRender(reel.caption)}
          </p>

          <div className="music-row-v2">
            <HiMusicNote size={14} color="#fff" />
            <div className="music-ticker-container">
              <span className="music-ticker-text">
                {reel.audio?.title || 'Original Audio'} - {reel.author?.fullName}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-v2">
          <div className="progress-fill-v2" style={{ width: `${isActive ? progress : 0}%` }} />
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Reel?"
        message="This will permanently remove this reel from your profile and the reels feed. This action cannot be undone."
        isPending={isDeleting}
      />
    </div>
  );
};

export default ReelItem;
