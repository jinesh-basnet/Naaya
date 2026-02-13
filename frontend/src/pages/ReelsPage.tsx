import React, { useState, useRef, useEffect } from 'react';
import './ReelsPage.css';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import ReelCommentsModal from '../components/ReelCommentsModal';
import ReelItem from '../components/ReelItem';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string>('');
  const [selectedReelAuthorId, setSelectedReelAuthorId] = useState<string>('');
  const [selectedReelCommentsCount, setSelectedReelCommentsCount] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');

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
    if (pendingAdvance && !isFetchingNextPage && reels.length > previousReelsLength.current) {
      setCurrentReelIndex(reels.length - 1);
      setPendingAdvance(false);
    }
    previousReelsLength.current = reels.length;
  }, [isFetchingNextPage, reels.length, pendingAdvance]);

  // Handle Socket Events
  useEffect(() => {
    const handleLiked = (data: any) => { /* Update Cache */ };
    const handleSaved = (data: any) => { /* Update State */ };
    onFeedReelLiked(handleLiked);
    onFeedReelSaved(handleSaved);
    return () => {
      offFeedReelLiked(handleLiked);
      offFeedReelSaved(handleSaved);
    };
  }, [onFeedReelLiked, offFeedReelLiked, onFeedReelSaved, offFeedReelSaved]);

  const handleNext = () => {
    if (currentReelIndex < reels.length - 1) {
      setScrollDirection('down');
      setCurrentReelIndex(prev => prev + 1);
      return true;
    } else if (hasNextPage && !isFetchingNextPage) {
      setPendingAdvance(true);
      fetchNextPage();
      return true;
    }
    return false;
  };

  const handlePrev = () => {
    if (currentReelIndex > 0) {
      setScrollDirection('up');
      setCurrentReelIndex(prev => prev - 1);
      return true;
    }
    return false;
  };

  // Keyboard and Wheel Controls (Throttled)
  const lastScrollTime = useRef(0);
  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (commentsModalOpen) return;

      const now = Date.now();
      if (now - lastScrollTime.current < 800) return; // 800ms throttle

      if (Math.abs(e.deltaY) > 80) {
        if (e.deltaY > 0) handleNext();
        else handlePrev();
        lastScrollTime.current = now;
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (commentsModalOpen) return;
      if (e.key === 'ArrowDown') handleNext();
      else if (e.key === 'ArrowUp') handlePrev();
    };

    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('keydown', handleKey);
    };
  }, [currentReelIndex, reels.length, hasNextPage, isFetchingNextPage, commentsModalOpen]);

  const handleVideoProgress = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  const currentReel = reels[currentReelIndex];

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner-glow" />
        <h6 style={{ color: '#fff' }}>Curating your feed...</h6>
      </div>
    );
  }

  return (
    <div className="reels-container">
      <AnimatePresence initial={false} custom={scrollDirection}>
        <motion.div
          key={currentReel?._id || 'empty'}
          custom={scrollDirection}
          variants={{
            enter: (direction: string) => ({
              y: direction === 'down' ? '100%' : '-100%',
              opacity: 0,
            }),
            center: {
              y: 0,
              opacity: 1,
            },
            exit: (direction: string) => ({
              y: direction === 'down' ? '-100%' : '100%',
              opacity: 0,
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            y: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="reel-item-motion"
        >
          {currentReel ? (
            <ReelItem
              reel={currentReel}
              index={currentReelIndex}
              isActive={true}
              isPlaying={isPlaying}
              isMuted={isMuted}
              progress={progress}
              user={user}
              savedReels={savedReels}
              videoRefs={videoRefs}
              videoErrors={videoErrors}
              setVideoErrors={setVideoErrors}
              handleLike={(id) => reelsAPI.likeReel(id).catch(() => toast.error('Failed to like'))}
              handleSave={(id) => reelsAPI.saveReel(id).catch(() => toast.error('Failed to save'))}
              handleVideoProgress={handleVideoProgress}
              handleVideoClick={() => setIsPlaying(!isPlaying)}
              handleVideoEnd={() => { }} // Disabled auto-advance
              setCommentsModalOpen={setCommentsModalOpen}
              setSelectedReelId={setSelectedReelId}
              setSelectedReelAuthorId={setSelectedReelAuthorId}
              setSelectedReelCommentsCount={setSelectedReelCommentsCount}
              formatTimeAgo={(d) => new Date(d).toLocaleDateString()}
              isFetchingNextPage={isFetchingNextPage}
              isLast={currentReelIndex === reels.length - 1}
            />
          ) : (
            <div className="no-reels">
              <h6>No reels found.</h6>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <ReelCommentsModal
        isOpen={commentsModalOpen}
        onClose={() => setCommentsModalOpen(false)}
        reelId={selectedReelId}
        reelAuthorId={selectedReelAuthorId}
        initialCommentsCount={selectedReelCommentsCount}
      />
    </div>
  );
};

export default ReelsPage;
