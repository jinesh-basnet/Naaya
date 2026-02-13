import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { postsAPI, reelsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCreatePost } from '../contexts/CreatePostContext';
import toast from 'react-hot-toast';
import StoriesBar from '../components/StoriesBar';
import CreatePostModal from '../components/CreatePostModal';
import PullToRefresh from 'react-pull-to-refresh';
import LocationAlert from '../components/LocationAlert';
import LocationBox from '../components/LocationBox';
import LoadingSkeleton from '../components/LoadingSkeleton';
import PostCard from '../components/PostCard';
import NoPostsMessage from '../components/NoPostsMessage';
import Suggestions from '../components/Suggestions';
import { useLocation } from '../hooks/useLocation';
import { useFeed } from '../hooks/useFeed';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { useSocketUpdates } from '../hooks/useSocketUpdates';
import PostCommentsModal from '../components/PostCommentsModal';
import Avatar from '../components/Avatar';
import { useState } from 'react';
import './HomePage.css';

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

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isModalOpen, closeModal } = useCreatePost();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { locationData, locationPermission, showLocationAlert, handleEnableLocation } = useLocation();
  const { feedData, isLoading, handleRefresh } = useFeed(locationData);
  const { heartBurst, expandedCaptions, setExpandedCaptions, handleLike, handleSave, handleShare, handleDoubleTap } = usePostInteractions(locationData, () => { });
  useSocketUpdates(locationData, () => { });

  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState({
    id: '',
    authorId: '',
    commentsCount: 0
  });

  const handleModalPost = async (post: {
    postType: 'post' | 'reel';
    caption: string;
    media: File | null;
    tags: string[];
    location: string;
    filter?: string;
    brightness?: number;
    contrast?: number;
    editMode?: boolean;
    editPost?: {
      _id: string;
      content: string;
      media: Array<{
        type: string;
        url: string;
      }>;
      tags: string[];
      location: {
        name: string;
      };
    };
  }) => {
    try {
      if (post.editMode && post.editPost) {
        const formData = new FormData();
        formData.append('content', post.caption);
        if (post.media) formData.append('media', post.media);
        formData.append('tags', JSON.stringify(post.tags));
        if (post.location.trim()) {
          formData.append('location', JSON.stringify({ name: post.location }));
        }
        if (post.filter && post.filter !== 'none') {
          formData.append('filter', post.filter);
        }
        if (post.brightness !== undefined) {
          formData.append('brightness', post.brightness.toString());
        }
        if (post.contrast !== undefined) {
          formData.append('contrast', post.contrast.toString());
        }
        await postsAPI.updatePost(post.editPost._id, formData);
        toast.success('Post updated!');
        if (user?.username) queryClient.invalidateQueries({ queryKey: ['userPosts', user.username] });
        if (user?.username) queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      } else {
        const formData = new FormData();
        const language = user?.languagePreference === 'both' ? 'mixed' : (user?.languagePreference || 'english');
        formData.append('language', language);

        if (post.postType === 'reel') {
          formData.append('content', post.caption);
          if (post.media) formData.append('video', post.media);
          formData.append('hashtags', JSON.stringify(post.tags));
          if (post.location.trim()) {
            formData.append('location', JSON.stringify({ name: post.location }));
          }
          if (post.filter && post.filter !== 'none') {
            const allowedFilters = ['none', 'clarendon', 'gingham', 'moon', 'lark', 'reyes', 'juno', 'slumber', 'crema', 'ludwig', 'aden', 'perpetua', 'sepia', 'grayscale', 'vintage', 'bright', 'contrast', 'warm', 'cool'];
            if (allowedFilters.includes(post.filter)) {
              formData.append('filter', post.filter);
            }
          }
          const brightness = Math.min(100, Math.max(-100, post.brightness ?? 0));
          const contrast = Math.min(100, Math.max(-100, post.contrast ?? 0));
          formData.append('brightness', brightness.toString());
          formData.append('contrast', contrast.toString());
          await reelsAPI.createReel(formData);
          queryClient.invalidateQueries({ queryKey: ['reels'] });
          queryClient.invalidateQueries({ queryKey: ['userReels'] });
          if (user?.username) queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
        } else {
          formData.append('postType', post.postType);
          formData.append('content', post.caption);
          if (post.media) formData.append('media', post.media);
          formData.append('tags', JSON.stringify(post.tags));
          if (post.location.trim()) {
            formData.append('location', JSON.stringify({ name: post.location }));
          }
          if (post.filter && post.filter !== 'none') {
            formData.append('filter', post.filter);
          }
          if (post.brightness && post.brightness !== 100) {
            formData.append('brightness', post.brightness.toString());
          }
          if (post.contrast && post.contrast !== 100) {
            formData.append('contrast', post.contrast.toString());
          }
          await postsAPI.createPost(formData);
          if (user?.username) queryClient.invalidateQueries({ queryKey: ['userPosts', user.username] });
          if (user?.username) queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
        }
        toast.success(`${post.postType === 'reel' ? 'Reel' : 'Post'} shared!`);
      }
    } catch (error: any) {
      console.error('Error sharing post:', error);
      if (error.response && error.response.data) {
        toast.error(`Failed to ${post.editMode ? 'update' : 'share'} ${post.postType}: ${error.response.data.message || 'Unknown error'}`);
      } else {
        toast.error(`Failed to ${post.editMode ? 'update' : 'share'} ${post.postType}`);
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const posts = feedData?.data?.posts || [];
  const [isCollapsed, setIsCollapsed] = useState(false);
  const filteredPosts = posts.filter((post: Post) => post.postType === 'post');
  return (
    <div className="home-page-container">
      <div className="home-content-layout">
        <main className="feed-column">
          {/* Top Stories Bar */}
          <div className="home-stories-wrapper">
            <StoriesBar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
          </div>

          {/* Social Social Feed - Vertical Flow */}
          <div className="home-feed-flow">
            {filteredPosts.map((post: Post, index: number) => (
              <PostCard
                key={post._id}
                post={post}
                index={index}
                handleLike={handleLike}
                handleSave={handleSave}
                handleShare={handleShare}
                handleDoubleTap={handleDoubleTap}
                heartBurst={heartBurst}
                expandedCaptions={expandedCaptions}
                setExpandedCaptions={setExpandedCaptions}
                formatTimeAgo={formatTimeAgo}
                filteredPosts={filteredPosts}
              />
            ))}
          </div>
        </main>

        {/* Right Sidebar - Standard Social Media Pattern */}
        <aside className="home-sidebar-right">
          <div className="sidebar-inner-glass">
            <div className="user-profile-widget" onClick={() => navigate(`/profile/${user?.username}`)}>
              <Avatar
                src={user?.profilePicture}
                alt={user?.username || 'User Profile'}
                size="60px"
              />
              <div className="user-text">
                <span className="username">@{user?.username}</span>
                <span className="fullname">{user?.fullName}</span>
              </div>
            </div>

            <div className="sidebar-suggestions-box">
              <div className="box-header">
                <h3>Recommended for you</h3>
                <button onClick={() => navigate('/explore')}>See All</button>
              </div>
              <Suggestions limit={5} />
            </div>

            <div className="sidebar-stats-box">
              <div className="stat-item">
                <span className="stat-value">{user?.followers?.length || 0}</span>
                <span className="stat-label">Soulmates</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{user?.following?.length || 0}</span>
                <span className="stat-label">Following</span>
              </div>
            </div>

            <footer className="sidebar-footer-text">
              <p>© 2026 NAAYA • BY JINESH</p>
            </footer>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HomePage;
