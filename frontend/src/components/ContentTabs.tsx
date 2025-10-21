import React, { useState } from 'react';
import PostCard from './PostCard';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { formatTimeAgo } from '../utils';

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
  reelsData: any;
  reelsLoading: boolean;
  reelsError: any;
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
  reelsData,
  reelsLoading,
  reelsError,
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
  const { handleLike, handleSave, handleDoubleTap } = usePostInteractions(null, () => {});
  const [heartBurst, setHeartBurst] = useState<{ [key: string]: boolean }>({});
  const [expandedCaptions, setExpandedCaptions] = useState<{ [key: string]: boolean }>({});

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
      return renderContent(postsData?.data?.posts || [], postsLoading, postsError, false);
    case 'reels':
      return renderContent(reelsData?.data?.reels || [], reelsLoading, reelsError, true);
    case 'bookmarks':
      return renderContent(bookmarksData?.data?.bookmarks || [], bookmarksLoading, bookmarksError, false);
    case 'savedReels':
      return renderContent(savedReelsData?.data?.savedReels || [], savedReelsLoading, savedReelsError, true);
    default:
      return <div>Invalid tab</div>;
  }
};

export default ContentTabs;
