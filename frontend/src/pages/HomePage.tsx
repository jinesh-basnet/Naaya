import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StoriesBar from '../components/StoriesBar';
import PostCard from '../components/PostCard';
import Suggestions from '../components/Suggestions';
import { useLocation } from '../hooks/useLocation';
import { useFeed } from '../hooks/useFeed';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { useSocketUpdates } from '../hooks/useSocketUpdates';
import Avatar from '../components/Avatar';
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
  const { user } = useAuth();
  const { locationData } = useLocation();
  const { feedData } = useFeed(locationData);
  const { heartBurst, expandedCaptions, setExpandedCaptions, handleLike, handleSave, handleShare, handleDoubleTap } = usePostInteractions(locationData, () => { });
  useSocketUpdates(locationData, () => { });

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
          <div className="home-stories-wrapper">
            <StoriesBar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
          </div>

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
              <Suggestions limit={10} />
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
