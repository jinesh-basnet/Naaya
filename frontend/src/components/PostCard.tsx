import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaComment, FaShare, FaEllipsisV } from 'react-icons/fa';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { FiTrash2, FiFlag, FiLink, FiEyeOff } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { postsAPI } from '../services/api';
import toast from 'react-hot-toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import PostCommentsModal from './PostCommentsModal';
import Avatar from './Avatar';
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
  handleShare: (postId: string) => void;
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
  const queryClient = useQueryClient();
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<{ id: string; authorId: string; commentsCount: number } | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLiked = (post.likes || []).some(like => like.user === user?._id) ?? false;
  const isSaved = (post.saves || []).some(save => save.user === user?._id) ?? false;
  const isAuthor = post.author?._id === user?._id;

  const handleAction = async (action: string) => {
    setShowActionMenu(false);
    switch (action) {
      case 'delete':
        setShowDeleteModal(true);
        break;
      case 'report':
        toast.success('Post reported. Thank you for keeping Naaya safe.');
        break;
      case 'copy-link':
        const link = `${window.location.origin}/post/${post._id}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard');
        break;
      case 'not-interested':
        toast.success("We'll show you fewer posts like this");
        break;
      default:
        break;
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await postsAPI.deletePost(post._id);
      toast.success('Post deleted successfully');

      const updateFn = (oldData: any) => {
        if (!oldData) return oldData;

        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => {
              if (page.data?.posts) {
                return { ...page, data: { ...page.data, posts: page.data.posts.filter((p: any) => p._id !== post._id) } };
              }
              if (page.data?.reels) {
                return { ...page, data: { ...page.data, reels: page.data.reels.filter((r: any) => r._id !== post._id) } };
              }
              return page;
            })
          };
        }

        if (oldData.data?.posts) {
          return { ...oldData, data: { ...oldData.data, posts: oldData.data.posts.filter((p: any) => p._id !== post._id) } };
        }

        if (oldData.data?.reels) {
          return { ...oldData, data: { ...oldData.data, reels: oldData.data.reels.filter((r: any) => r._id !== post._id) } };
        }

        return oldData;
      };

      queryClient.setQueriesData({ queryKey: ['feed'] }, updateFn);
      queryClient.setQueriesData({ queryKey: ['userPosts'] }, updateFn);
      queryClient.setQueriesData({ queryKey: ['userContentInfinite'] }, updateFn);
      queryClient.setQueriesData({ queryKey: ['reels'] }, updateFn);
      queryClient.setQueriesData({ queryKey: ['userReels'] }, updateFn);

      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      setShowDeleteModal(false);
    } catch (error) {
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.author?.username) {
      navigate(`/profile/${post.author.username}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="naaya-post-card"
    >
      <div className="post-interaction-container">
        <div
          className="post-media-stage"
          onDoubleClick={() => handleDoubleTap(post._id, filteredPosts, post.isReel)}
        >
          {post.media && post.media.length > 0 && (
            <div className="media-canvas">
              {post.isReel ? (
                <video
                  src={post.media[0]?.url?.startsWith('http') ? post.media[0].url : `${BACKEND_BASE_URL}${post.media[0]?.url}`}
                  muted
                  loop
                  playsInline
                  autoPlay
                  className="canvas-media-item"
                />
              ) : (
                <img
                  src={post.media[0]?.url?.startsWith('http') ? post.media[0].url : `${BACKEND_BASE_URL}${post.media[0]?.url}`}
                  alt="Post"
                  className="canvas-media-item"
                />
              )}
            </div>
          )}

          <div className="post-action-blade">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="blade-item">
              <button
                className={`blade-btn ${isLiked ? 'active' : ''}`}
                onClick={() => handleLike(post._id, post.isReel)}
              >
                {isLiked ? <FaHeart /> : <FaRegHeart />}
              </button>
              <span className="blade-label">{post.likesCount || 0}</span>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="blade-item">
              <button
                className="blade-btn"
                onClick={() => {
                  setSelectedPostForComments({
                    id: post._id,
                    authorId: post.author?._id || '',
                    commentsCount: post.commentsCount || 0
                  });
                  setCommentsModalOpen(true);
                }}
              >
                <FaComment />
              </button>
              <span className="blade-label">{post.commentsCount || 0}</span>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="blade-item">
              <button className="blade-btn" onClick={() => handleShare(post._id)}>
                <FaShare />
              </button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="blade-item">
              <button
                className={`blade-btn ${isSaved ? 'active' : ''}`}
                onClick={() => handleSave(post._id, post.isReel)}
              >
                {isSaved ? <BsBookmarkFill /> : <BsBookmark />}
              </button>
            </motion.div>
          </div>

          <div className="post-user-plate" onClick={handleAuthorClick}>
            <div className="plate-avatar">
              <Avatar
                src={post.author?.profilePicture}
                alt={post.author?.username}
                name={post.author?.fullName}
                size="100%"
              />
            </div>
            <div className="plate-details">
              <span className="plate-username">@{post.author?.username}</span>
              {post.location?.city && (
                <span className="plate-location">{post.location.city}</span>
              )}
            </div>
            <button className="plate-menu" onClick={(e) => { e.stopPropagation(); setShowActionMenu(!showActionMenu); }}>
              <FaEllipsisV />
            </button>

            <AnimatePresence>
              {showActionMenu && (
                <>
                  <div className="menu-backdrop-v2" onClick={() => setShowActionMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="action-dropdown-v2"
                  >
                    <button className="menu-item-v2" onClick={() => handleAction('copy-link')}>
                      <FiLink /> <span>Copy Link</span>
                    </button>
                    {!isAuthor && (
                      <button className="menu-item-v2" onClick={() => handleAction('not-interested')}>
                        <FiEyeOff /> <span>Not Interested</span>
                      </button>
                    )}
                    <button className="menu-item-v2" onClick={() => handleAction('report')}>
                      <FiFlag /> <span>Report</span>
                    </button>
                    {isAuthor && (
                      <button className="menu-item-v2 danger" onClick={() => handleAction('delete')}>
                        <FiTrash2 /> <span>Delete Post</span>
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="post-caption-plate">
            <div className="caption-text-content">
              {expandedCaptions[post._id] || (post.content || '').length <= 60 ? (
                post.content
              ) : (
                <>
                  {(post.content || '').slice(0, 60)}
                  <span
                    className="plate-read-more"
                    onClick={() => setExpandedCaptions(prev => ({ ...prev, [post._id]: true }))}
                  >
                    ... view more
                  </span>
                </>
              )}
            </div>
            <div className="plate-timestamp">
              {formatTimeAgo(post.createdAt)}
            </div>
          </div>

          <AnimatePresence>
            {heartBurst[post._id] && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="stage-heart-burst"
              >
                <FaHeart />
              </motion.div>
            )}
          </AnimatePresence>
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

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Post?"
        message="This will permanently remove this post from your profile and the feed. This action cannot be undone."
        isPending={isDeleting}
      />
    </motion.div>
  );
};

export default PostCard;
