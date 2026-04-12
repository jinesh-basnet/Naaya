import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { postsAPI } from '../services/api';
import PostCard from '../components/PostCard';
import { IoChevronBack } from 'react-icons/io5';
import toast from 'react-hot-toast';
import './PostPage.css';

const PostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [heartBurst, setHeartBurst] = useState<{ [key: string]: boolean }>({});
  const [expandedCaptions, setExpandedCaptions] = useState<{ [key: string]: boolean }>({});

  const { data: postResponse, isLoading, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsAPI.getPost(postId || '').then(res => res.data),
    enabled: !!postId,
  });

  const post = postResponse?.post;

  const handleLike = async (id: string) => {
    try {
      await postsAPI.likePost(id);
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    } catch (err) {
      toast.error('Failed to update like');
    }
  };

  const handleSave = async (id: string) => {
    try {
      await postsAPI.savePost(id);
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast.success('Post saved');
    } catch (err) {
      toast.error('Failed to save post');
    }
  };

  const handleDoubleTap = (id: string) => {

    handleLike(id);
    setHeartBurst(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setHeartBurst(prev => ({ ...prev, [id]: false })), 500);
  };

  const handleShare = (id: string) => {
    const link = `${window.location.origin}/post/${id}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) return <div className="post-page-loading">Loading post...</div>;
  if (error || !post) return (
    <div className="post-page-error">
      <h2>Post not found</h2>
      <p>The post you are looking for may have been deleted.</p>
      <button onClick={() => navigate('/home')}>Go to Feed</button>
    </div>
  );

  return (
    <div className="post-page-container">
      <button className="post-page-back-btn" onClick={() => navigate(-1)}>
        <IoChevronBack /> Back
      </button>

      <PostCard
        post={post}
        index={0}
        handleLike={handleLike}
        handleSave={handleSave}
        handleDoubleTap={handleDoubleTap}
        handleShare={handleShare}
        heartBurst={heartBurst}
        expandedCaptions={expandedCaptions}
        setExpandedCaptions={setExpandedCaptions}
        formatTimeAgo={formatTimeAgo}
        filteredPosts={[post]}
      />
    </div>
  );
};

export default PostPage;
