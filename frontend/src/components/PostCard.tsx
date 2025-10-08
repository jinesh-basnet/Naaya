import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaComment, FaShare, FaRegBookmark, FaEllipsisV } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
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

const BACKEND_BASE_URL = 'http://localhost:5000';

interface PostCardProps {
  post: Post;
  index: number;
  handleLike: (postId: string, isReel?: boolean) => void;
  handleSave: (postId: string, isReel?: boolean) => void;
  handleDoubleTap: (postId: string, filteredPosts: Post[], isReel?: boolean) => void;
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
  heartBurst,
  expandedCaptions,
  setExpandedCaptions,
  formatTimeAgo,
  filteredPosts
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
                <video
                  src={post.media[0].url.startsWith('http') ? post.media[0].url : `${BACKEND_BASE_URL}${post.media[0].url}`}
                  controls
                  className="media-video"
                />
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
              <button className="icon-button">
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
              {(post.saves || []).length > 0 && (
                <span className="save-count">
                  {(post.saves || []).length.toLocaleString()}
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
              >
                View all {(post.comments || []).length} comments
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PostCard;
