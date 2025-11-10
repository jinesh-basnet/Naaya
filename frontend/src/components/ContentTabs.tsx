import React, { useEffect, useRef, useState } from 'react';
import PostCard from './PostCard';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { formatTimeAgo } from '../utils';
import { useAuth } from '../contexts/AuthContext';

interface Post {
  _id: string;
  content: string;
  media: Array<{
    type: string;
    url: string;
    thumbnail?: string;
    width?: number;
    height?: number;
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
  saves: Array<{ user: string }>;
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
  savesCount: number;
  postType: string;
  isReel?: boolean;
}

interface ContentTabsProps {
  activeTab: 'posts' | 'reels' | 'bookmarks' | 'savedReels';
  postsData: any;
  postsLoading: boolean;
  postsError: any;
  fetchNextPosts?: () => void;
  hasNextPosts?: boolean;
  isFetchingNextPosts?: boolean;
  reelsData: any;
  reelsLoading: boolean;
  reelsError: any;
  fetchNextReels?: () => void;
  hasNextReels?: boolean;
  isFetchingNextReels?: boolean;
  bookmarksData: any;
  bookmarksLoading: boolean;
  bookmarksError: any;
  savedReelsData: any;
  savedReelsLoading: boolean;
  savedReelsError: any;
  videoErrors: Record<string, boolean>;
  setVideoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isCurrentUser: boolean;
}

const ContentTabs: React.FC<ContentTabsProps> = ({
  activeTab,
  postsData,
  postsLoading,
  postsError,
  fetchNextPosts,
  hasNextPosts,
  isFetchingNextPosts,
  reelsData,
  reelsLoading,
  reelsError,
  fetchNextReels,
  hasNextReels,
  isFetchingNextReels,
  bookmarksData,
  bookmarksLoading,
  bookmarksError,
  savedReelsData,
  savedReelsLoading,
  savedReelsError,
  videoErrors,
  setVideoErrors,
  isCurrentUser,
}) => {
  const { user } = useAuth();
  const { handleLike, handleSave, handleDoubleTap } = usePostInteractions(null, () => {});
  const [heartBurst, setHeartBurst] = useState<{ [key: string]: boolean }>({});
  const [expandedCaptions, setExpandedCaptions] = useState<{ [key: string]: boolean }>({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (activeTab === 'posts') {
            if (hasNextPosts && !isFetchingNextPosts) {
              fetchNextPosts && fetchNextPosts();
            }
          } else if (activeTab === 'reels') {
            if (hasNextReels && !isFetchingNextReels) {
              fetchNextReels && fetchNextReels();
            }
          }
        });
      },
      { root: null, rootMargin: '1000px', threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, hasNextPosts, isFetchingNextPosts, hasNextReels, isFetchingNextReels, fetchNextPosts, fetchNextReels]);

  const renderContent = (data: Post[], loading: boolean, error: any, isReel: boolean = false) => {
    if (loading) {
      return <div className="loading-spinner">Loading...</div>;
    }
    if (error) {
      return <div className="error-alert">Failed to load content.</div>;
    }
    if (!data || data.length === 0) {
      return <div className="no-posts-message">No content available.</div>;
    }
    return (
      <div className="posts-grid">
        {data.map((post, index) => (
          <PostCard
            key={post._id}
            post={{ ...post, isReel }}
            index={index}
            handleLike={handleLike}
            handleSave={handleSave}
            handleDoubleTap={(postId, filteredPosts, isReelFlag) => {
              handleDoubleTap(postId, filteredPosts, isReelFlag);
              setHeartBurst(prev => ({ ...prev, [postId]: true }));
              setTimeout(() => setHeartBurst(prev => ({ ...prev, [postId]: false })), 500);
            }}
            heartBurst={heartBurst}
            expandedCaptions={expandedCaptions}
            setExpandedCaptions={setExpandedCaptions}
            formatTimeAgo={formatTimeAgo}
            filteredPosts={data}
          />
        ))}
      </div>
    );
  };

  switch (activeTab) {
    case 'posts':
      const postsArr = postsData?.pages ? postsData.pages.flatMap((p: any) => p.data?.posts || []) : (postsData?.data?.posts || []);
      return (
        <>
          {renderContent(postsArr, postsLoading, postsError, false)}
              {hasNextPosts && <div ref={loadMoreRef} style={{ height: 1, width: '100%' }} aria-hidden />}
        </>
      );
    case 'reels':
      const reelsArr = reelsData?.pages ? reelsData.pages.flatMap((p: any) => p.data?.reels || []) : (reelsData?.data?.reels || []);
      return (
        <>
          {renderContent(reelsArr, reelsLoading, reelsError, true)}
          {hasNextReels && <div ref={loadMoreRef} style={{ height: 1, width: '100%' }} aria-hidden />}
        </>
      );
    case 'bookmarks':
      const savedPosts = (bookmarksData?.data?.bookmarks || []).map((post: any) => ({ ...post, isReel: false }));
      const savedReels = (savedReelsData?.data?.savedReels || []).map((reel: any) => ({ ...reel, isReel: true }));

      const combinedSaved = [...savedPosts, ...savedReels].sort((a, b) => {
        const aSave = a.saves?.find((save: any) => save.user === user?._id);
        const bSave = b.saves?.find((save: any) => save.user === user?._id);
        const aDate = aSave ? new Date(aSave.savedAt).getTime() : 0;
        const bDate = bSave ? new Date(bSave.savedAt).getTime() : 0;
        return bDate - aDate; 
      });

      return renderContent(combinedSaved, bookmarksLoading || savedReelsLoading, bookmarksError || savedReelsError, false);
    case 'savedReels':
      return renderContent(savedReelsData?.data?.savedReels || [], savedReelsLoading, savedReelsError, true);
    default:
      return <div>Invalid tab</div>;
  }
};

export default ContentTabs;
