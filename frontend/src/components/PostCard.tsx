import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaComment, FaShare, FaRegBookmark, FaEllipsisV } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import PostCommentsModal from './PostCommentsModal';
import './PostCard.css';

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

const BACKEND_BASE_URL = 'http://localhost:5000';

interface PostCardProps {
  post: Post;
  index: number;
  handleLike: (postId: string, isReel?: boolean) => void;
  handleSave: (postId: string, isReel?: boolean) => void;
  handleDoubleTap: (postId: string, filteredPosts: Post[], isReel?: boolean) => void;
  handleShare: (userId: string, message: string) => void;
  heartBurst: { [key: string]: boolean };
  expandedCaptions: { [key: string]: boolean };
  setExpandedCaptions: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  formatTimeAgo: (dateString: string) => string;
  filteredPosts: Post[];
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  index,
  handleLike,
  handleSave,
  handleDoubleTap,
  handleShare,
  heartBurst,
  expandedCaptions,
  setExpandedCaptions,
  formatTimeAgo,
  filteredPosts
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videoErrors, setVideoErrors] = React.useState<Record<string, boolean>>({});
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<{ id: string; authorId: string; commentsCount: number } | null>(null);


  const isLiked = (post.likes || []).some(like => like.user === user?._id) ?? false;
  const isSaved = (post.saves || []).some(save => save.user === user?._id) ?? false;

  return (
    <motion.div
      key={`${post._id}-${index}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="card" onDoubleClick={() => handleDoubleTap(post._id, filteredPosts, post.isReel)}>
        <div className="card-content">
          <div className="author-info">
            {post.author && (
              <>
                <img
                  src={post.author.profilePicture}
                  alt={post.author.username}
                  className="avatar"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="avatar-fallback">
                  {typeof post.author.fullName === 'string' ? post.author.fullName.charAt(0) : 'U'}
                </div>
                <div className="author-box">
                  <div className="name-box">
                    <span
                      onClick={() => {
                        if (post.author._id !== user?._id) {
                          navigate(`/profile/${post.author.username}`);
                        }
                      }}
                    >
                      {typeof post.author.fullName === 'string' ? post.author.fullName : ''}
                    </span>
                    {post.author.isVerified && (
                      <div className="verified-badge">
                        ✓
                      </div>
                    )}
                  </div>
                  <div className="time-box">
                    <span>
                      {formatTimeAgo(post.createdAt)}
                    </span>
                    {post.location?.city && (
                      <>
                        <span>·</span>
                        <span>
                          📍 {post.location.city}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button className="icon-button">
                  <FaEllipsisV className="icon" />
                </button>
              </>
            )}
          </div>

          {post.content && (
            <div>
              {expandedCaptions[post._id] || post.content.length <= 100 ? (
                <p className="post-content">
                  {typeof post.content === 'string' ? post.content : ''}
                </p>
              ) : (
                <p className="post-content">
                  {typeof post.content === 'string' ? post.content.slice(0, 100) : ''}... <span className="post-content-more" onClick={() => setExpandedCaptions(prev => ({ ...prev, [post._id]: true }))}>more</span>
                </p>
              )}
            </div>
          )}

          {post.media && post.media.length > 0 && (
            <div className="media-box">
              {post.isReel ? (
                <div className="reel-container">
                  {videoErrors[post._id] ? (
                    <div className="video-placeholder">
                      Video unavailable
                    </div>
                  ) : (
                    <video
                      src={post.media[0].url.startsWith('http') ? post.media[0].url : `${BACKEND_BASE_URL}${post.media[0].url}`}
                      muted
                      playsInline
                      className="media-video reel-video"
                      onError={(e) => {
                        console.error(`[PostCard] Video load error for post ${post._id}:`, {
                          videoUrl: post.media[0].url,
                          error: e,
                          postData: post.media[0]
                        });
                        setVideoErrors(prev => ({ ...prev, [post._id]: true }));
                      }}
                    />
                  )}
                  <div className="reel-overlay">
                    <div className="play-button">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <div className="reel-indicator">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span>Reels</span>
                    </div>
                  </div>
                </div>
              ) : (
                post.media.map((media, idx) => {
                  let fullUrl = media.url;
                  if (!fullUrl.startsWith('http')) {
                    const normalizedUrl = fullUrl.replace(/\\/g, '/').replace(/^\/?/, '/');
                    fullUrl = `${BACKEND_BASE_URL}${normalizedUrl}`;
                  }

                  let paddingTop = '56.25%';
                  if (media.width && media.height) {
                    paddingTop = `${(media.height / media.width) * 100}%`;
                  }

                  return (
                    <div
                      key={`${post._id}-${idx}`}
                      className="media-item"
                      style={{ paddingTop }}
                    >
                      {media.type === 'image' ? (
                        <img
                          src={fullUrl}
                          alt="Post content"
                          className="media-img"
                        />
                      ) : (
                        <video
                          src={fullUrl}
                          controls
                          className="media-video"
                        />
                      )}
                    </div>
                  );
                })
              )}
              <AnimatePresence>
                {heartBurst[post._id] && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.5 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.5 }}
                    className="heart-burst"
                  >
                    <FaHeart size={50} color="red" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="actions-box">
            <div className="left-actions">
              <button
                className="icon-button"
                onClick={() => handleLike(post._id, post.isReel)}
              >
                {isLiked ? (
                  <FaHeart className="liked-icon" />
                ) : (
                  <FaRegHeart className="icon" />
                )}
              </button>
              <button
                className="icon-button"
                onClick={() => {
                  setSelectedPostForComments({
                    id: post._id,
                    authorId: post.author._id,
                    commentsCount: post.commentsCount || 0
                  });
                  setCommentsModalOpen(true);
                }}
              >
                <FaComment className="icon" />
              </button>
              <button className="icon-button">
                <FaShare className="icon" />
              </button>
            </div>
            <div className="save-container">
              <button
                className="icon-button"
                onClick={() => handleSave(post._id, post.isReel)}
              >
                <FaRegBookmark
                  className={isSaved ? "saved-icon" : "icon"}
                />
              </button>
              {(post.savesCount || 0) > 0 && (
                <span className="save-count">
                  {(post.savesCount || 0).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="likes-comments-section">
            {(post.likes || []).length > 0 && (
              <p className="likes-count">
                {(post.likes || []).length.toLocaleString()} {(post.likes || []).length === 1 ? 'like' : 'likes'}
              </p>
            )}
            <div>
              {(post.comments || []).slice(0, 2).map((comment) => (
                <p key={`${post._id}-${comment._id}`} className="comment-item">
                  <strong>{comment.author.username}</strong> {comment.content}
                </p>
              ))}
            </div>
            {(post.comments || []).length > 2 && (
              <p
                className="view-all-comments"
                onMouseEnter={(e) => e.currentTarget.style.color = '#000'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                onClick={() => {
                  setSelectedPostForComments({
                    id: post._id,
                    authorId: post.author._id,
                    commentsCount: post.commentsCount || 0
                  });
                  setCommentsModalOpen(true);
                }}
              >
                View all {(post.comments || []).length} comments
              </p>
            )}
          </div>
        </div>
      </div>

      {commentsModalOpen && selectedPostForComments && (
        <PostCommentsModal
          isOpen={commentsModalOpen}
          onClose={() => {
            setCommentsModalOpen(false);
            setSelectedPostForComments(null);
          }}
          postId={selectedPostForComments.id}
          postAuthorId={selectedPostForComments.authorId}
          initialCommentsCount={selectedPostForComments.commentsCount}
        />
      )}



    </motion.div>
  );
};

export default PostCard;
