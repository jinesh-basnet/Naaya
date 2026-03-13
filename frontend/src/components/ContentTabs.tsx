import React, { useEffect, useRef, useState } from 'react';
import { FaHeart, FaComment } from 'react-icons/fa';
import { BsFilm, BsImages, BsGrid3X3, BsBookmarkFill, BsCameraVideo } from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';

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
  collectionsData: any;
  collectionsLoading: boolean;
  collectionsError: any;
  videoErrors: Record<string, boolean>;
  setVideoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isCurrentUser: boolean;
  onPostClick?: (postId: string, type: 'post' | 'reel') => void;
}

const BACKEND_BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const getMediaUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const normalizedUrl = url.replace(/\\/g, '/').replace(/^\/?/, '/');
  return `${BACKEND_BASE_URL}${normalizedUrl}`;
};

/* ── Empty State Component ─────────────────────────── */
const EmptyState: React.FC<{ icon: React.ReactNode; message: string; subtext?: string }> = ({
  icon,
  message,
  subtext,
}) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-secondary)', fontSize: '1rem' }}>{message}</p>
    {subtext && (
      <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        {subtext}
      </p>
    )}
  </div>
);

/* ── Single Grid Item ──────────────────────────────── */
const ContentItem: React.FC<{
  post: any;
  isReel: boolean;
  videoErrors: Record<string, boolean>;
  setVideoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onClick: () => void;
  index: number;
}> = ({ post, isReel, videoErrors, setVideoErrors, onClick, index }) => {
  const mediaUrl = getMediaUrl(isReel ? (post.video?.url || post.media?.[0]?.url) : (post.media?.[0]?.url || post.video?.url));
  const isVideo = (post.media?.[0]?.type === 'video') || (isReel && !!(post.video?.url || post.media?.[0]?.url));
  const hasError = videoErrors[post._id];

  return (
    <div
      className="content-item"
      onClick={onClick}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="media-wrapper">
        {isVideo && !hasError ? (
          <video
            src={mediaUrl}
            className="media-element"
            muted
            loop
            playsInline
            preload="metadata"
            onMouseOver={e => (e.target as HTMLVideoElement).play().catch(() => { })}
            onMouseOut={e => {
              const v = e.target as HTMLVideoElement;
              v.pause();
              v.currentTime = 0;
            }}
            onError={() => setVideoErrors(prev => ({ ...prev, [post._id]: true }))}
          />
        ) : (
          <img
            src={hasError ? '/default-media-placeholder.svg' : mediaUrl}
            alt={post.content || 'Post'}
            className="media-element"
            loading="lazy"
            onError={() => setVideoErrors(prev => ({ ...prev, [post._id]: true }))}
          />
        )}

        {/* Hover Overlay */}
        <div className="card-overlay">
          <div className="overlay-content">
            <div className="overlay-stat">
              <FaHeart />
              <span>{post.likesCount || 0}</span>
            </div>
            <div className="overlay-stat">
              <FaComment />
              <span>{post.commentsCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Type Badge */}
        <div className="item-badge">
          {isReel ? (
            <BsFilm />
          ) : post.media?.length > 1 ? (
            <BsImages />
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ── Grid Renderer ─────────────────────────────────── */
const ContentGrid: React.FC<{
  items: any[];
  loading: boolean;
  error: any;
  isReel: boolean;
  videoErrors: Record<string, boolean>;
  setVideoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onPostClick?: (id: string, type: 'post' | 'reel') => void;
  emptyIcon: React.ReactNode;
  emptyMessage: string;
  emptySubtext?: string;
}> = ({ items, loading, error, isReel, videoErrors, setVideoErrors, onPostClick, emptyIcon, emptyMessage, emptySubtext }) => {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-glow" />
      </div>
    );
  }
  if (error) {
    return <div className="error-message">Failed to load content. Please try again.</div>;
  }
  if (!items || items.length === 0) {
    return <EmptyState icon={emptyIcon} message={emptyMessage} subtext={emptySubtext} />;
  }

  return (
    <div className="content-grid">
      {items.map((post: any, index: number) => {
        const itemIsReel = post.isReel !== undefined ? post.isReel : isReel;
        return (
          <ContentItem
            key={post._id || index}
            post={post}
            isReel={itemIsReel}
            videoErrors={videoErrors}
            setVideoErrors={setVideoErrors}
            onClick={() => onPostClick?.(post._id, itemIsReel ? 'reel' : 'post')}
            index={index}
          />
        );
      })}
    </div>
  );
};

/* ── Main ContentTabs ──────────────────────────────── */
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
  collectionsData,
  collectionsLoading,
  collectionsError,
  videoErrors,
  setVideoErrors,
  isCurrentUser,
  onPostClick,
}) => {
  const { user } = useAuth();
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
      const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
        useEffect(() => {
    if (!loadMoreRef.current) return;
    if (!fetchNextPosts && !fetchNextReels) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          if (activeTab === 'posts' && hasNextPosts && fetchNextPosts && !isFetchingNextPosts)
            fetchNextPosts();
          if ((activeTab === 'reels' || activeTab === 'savedReels') && hasNextReels && fetchNextReels && !isFetchingNextReels)
            fetchNextReels();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [activeTab, fetchNextPosts, fetchNextReels, hasNextPosts, hasNextReels, isFetchingNextPosts, isFetchingNextReels]);

  switch (activeTab) {
    case 'posts': {
      const postsArr = postsData?.pages
        ? postsData.pages.flatMap((p: any) => p.data?.posts || [])
        : postsData?.data?.posts || [];
      return (
        <>
          <ContentGrid
            items={postsArr}
            loading={postsLoading}
            error={postsError}
            isReel={false}
            videoErrors={videoErrors}
            setVideoErrors={setVideoErrors}
            onPostClick={onPostClick}
            emptyIcon={<BsGrid3X3 />}
            emptyMessage="No posts yet"
            emptySubtext={isCurrentUser ? 'Share your first post to get started' : undefined}
          />
          {hasNextPosts && <div ref={loadMoreRef} style={{ height: 24, width: '100%' }} />}
          {isFetchingNextPosts && (
            <div className="loading-container" style={{ padding: '24px 0' }}>
              <div className="spinner-glow" style={{ width: 28, height: 28 }} />
            </div>
          )}
        </>
      );
    }

    case 'reels': {
      const reelsArr = reelsData?.pages
        ? reelsData.pages.flatMap((p: any) => p.data?.reels || [])
        : reelsData?.data?.reels || [];
      return (
        <>
          <ContentGrid
            items={reelsArr}
            loading={reelsLoading}
            error={reelsError}
            isReel={true}
            videoErrors={videoErrors}
            setVideoErrors={setVideoErrors}
            onPostClick={onPostClick}
            emptyIcon={<BsCameraVideo />}
            emptyMessage="No reels yet"
            emptySubtext={isCurrentUser ? 'Create your first reel to share with the world' : undefined}
          />
          {hasNextReels && <div ref={loadMoreRef} style={{ height: 24, width: '100%' }} />}
          {isFetchingNextReels && (
            <div className="loading-container" style={{ padding: '24px 0' }}>
              <div className="spinner-glow" style={{ width: 28, height: 28 }} />
            </div>
          )}
        </>
      );
    }

    case 'bookmarks': {     
      const collections = collectionsData?.data?.collections || [];
      const selectedCollection = collections.find((c: any) => c._id === selectedCollectionId);

      // Filter logic
      const getItemsToDisplay = () => {
        if (selectedCollectionId && selectedCollection) {
          const collPosts = (selectedCollection.posts || []).map((p: any) => ({ ...p, isReel: false }));
          const collReels = (selectedCollection.reels || []).map((r: any) => ({ ...r, isReel: true }));
          return [...collPosts, ...collReels].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        const savedPosts = (bookmarksData?.data?.posts || []).map((post: any) => ({
          ...post,
          isReel: false,
        }));
        const savedReels = (savedReelsData?.data?.reels || []).map((reel: any) => ({
          ...reel,
          isReel: true,
        }));
        return [...savedPosts, ...savedReels].sort((a, b) => {
          const aSave = a.saves?.find((s: any) => s.user === user?._id);
          const bSave = b.saves?.find((s: any) => s.user === user?._id);
          const aDate = aSave ? new Date(aSave.savedAt).getTime() : 0;
          const bDate = bSave ? new Date(bSave.savedAt).getTime() : 0;
          return bDate - aDate;
        });
      };

      const displayItems = getItemsToDisplay();

      return (
        <div className="bookmarks-view">
          {selectedCollectionId && selectedCollection ? (
            <div className="collection-header-row">
              <button 
                className="back-btn-minimal" 
                onClick={() => setSelectedCollectionId(null)}
              >
                ← All Bookmarks
              </button>
              <div className="selected-collection-info">
                <h3>{selectedCollection.name}</h3>
                <span>{displayItems.length} items</span>
              </div>
            </div>
          ) : (
            collections.length > 0 && (
              <div className="collections-row">
                {collections.map((collection: any) => (
                  <div 
                    key={collection._id} 
                    className="collection-folder-item" 
                    onClick={() => setSelectedCollectionId(collection._id)}
                  >
                    <div className="collection-preview">
                      {collection.coverImage ? (
                        <img src={getMediaUrl(collection.coverImage)} alt={collection.name} />
                      ) : (collection.posts?.[0]?.media?.[0]?.url || collection.reels?.[0]?.video?.url) ? (
                        <img src={getMediaUrl(collection.posts?.[0]?.media?.[0]?.url || collection.reels?.[0]?.video?.url)} alt={collection.name} />
                      ) : (
                        <div className="empty-collection-icon">📦</div>
                      )}
                    </div>
                    <span className="collection-folder-name">{collection.name}</span>
                  </div>
                ))}
              </div>
            )
          )}

          <ContentGrid
            items={displayItems}
            loading={bookmarksLoading || savedReelsLoading || collectionsLoading}
            error={bookmarksError || savedReelsError || collectionsError}
            isReel={false}
            videoErrors={videoErrors}
            setVideoErrors={setVideoErrors}
            onPostClick={onPostClick}
            emptyIcon={<BsBookmarkFill />}
            emptyMessage={selectedCollectionId ? "No items in this collection" : "No saved content"}
            emptySubtext={selectedCollectionId ? "Add some posts or reels to start organizing" : "Posts and reels you save will appear here"}
          />
        </div>
      );
    }

    case 'savedReels': {
      const savedReelsArr = savedReelsData?.data?.reels || [];
      return (
        <ContentGrid
          items={savedReelsArr}
          loading={savedReelsLoading}
          error={savedReelsError}
          isReel={true}
          videoErrors={videoErrors}
          setVideoErrors={setVideoErrors}
          onPostClick={onPostClick}
          emptyIcon={<BsCameraVideo />}
          emptyMessage="No saved reels"
          emptySubtext="Reels you save will appear here"
        />
      );
    }

    default:
      return <div className="error-message">Unknown tab.</div>;
  }
};

export default ContentTabs;
