import React, { useEffect, useRef } from 'react';
import { FaHeart, FaComment } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { BsGrid3X3, BsFilm, BsBookmark, BsPlayFill, BsImages } from 'react-icons/bs';

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
    province: string;
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
  onPostClick?: (postId: string) => void;
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
  onPostClick,
}) => {
  const { user } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const BACKEND_BASE_URL = 'http://localhost:5000';

  const getMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const normalizedUrl = url.replace(/\\/g, '/').replace(/^\/?/, '/');
    return `${BACKEND_BASE_URL}${normalizedUrl}`;
  };

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
      { root: null, rootMargin: '500px', threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, hasNextPosts, isFetchingNextPosts, hasNextReels, isFetchingNextReels, fetchNextPosts, fetchNextReels]);

  const renderContent = (data: Post[], loading: boolean, error: any, isReelTab: boolean = false) => {
    if (loading) {
      return <div className="loading-spinner"></div>;
    }
    if (error) {
      return <div className="error-alert">Failed to load content.</div>;
    }
    if (!data || data.length === 0) {
      return (
        <div className="no-posts">
          <div className="no-posts-icon">
            {isReelTab ? <BsFilm /> : <BsGrid3X3 />}
          </div>
          <h3>{isReelTab ? 'No Reels Yet' : 'No Posts Yet'}</h3>
          <p>When {isCurrentUser ? 'you share' : 'this user shares'} {isReelTab ? 'reels' : 'posts'}, they will appear here.</p>
        </div>
      );
    }

    return (
      <div className="posts-grid">
        {data.map((post, index) => {
          const isReel = isReelTab || post.isReel || post.postType === 'reel';
          const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;

          if (!mediaItem) return null;

          const mediaUrl = getMediaUrl(mediaItem.url);
          const isVideo = mediaItem.type === 'video' || isReel;

          return (
            <div
              key={post._id}
              className={`profile-post-card ${isReel ? 'reel-card' : 'standard-card'}`}
              onClick={() => onPostClick && onPostClick(post._id)}
              style={{ animationDelay: `${index % 12 * 0.05}s` }}
            >
              <div className="media-wrapper">
                {isVideo ? (
                  <video
                    src={mediaUrl}
                    muted
                    playsInline
                    className="post-media"
                    onMouseOver={e => e.currentTarget.play()}
                    onMouseOut={e => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                ) : (
                  <img src={mediaUrl} alt="Post" className="post-media" loading="lazy" />
                )}

                <div className="card-overlay">
                  <div className="overlay-content">
                    <div className="overlay-stat">
                      <FaHeart /> <span>{post.likesCount || 0}</span>
                    </div>
                    <div className="overlay-stat">
                      <FaComment /> <span>{post.commentsCount || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="item-badge">
                  {isReel ? <BsFilm /> : (post.media.length > 1 ? <BsImages /> : null)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  switch (activeTab) {
    case 'posts':
      const postsArr = postsData?.pages ? postsData.pages.flatMap((p: any) => p.data?.posts || []) : (postsData?.data?.posts || []);
      return (
        <>
          {renderContent(postsArr, postsLoading, postsError, false)}
          {hasNextPosts && <div ref={loadMoreRef} style={{ height: 20, width: '100%' }} />}
        </>
      );
    case 'reels':
      const reelsArr = reelsData?.pages ? reelsData.pages.flatMap((p: any) => p.data?.reels || []) : (reelsData?.data?.reels || []);
      return (
        <>
          {renderContent(reelsArr, reelsLoading, reelsError, true)}
          {hasNextReels && <div ref={loadMoreRef} style={{ height: 20, width: '100%' }} />}
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
