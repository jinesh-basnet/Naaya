import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storiesAPI } from '../services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';
import { Story, DisplayStoryItem } from '../types/stories';
import Avatar from './Avatar';
import './StoriesBar.css';
import './StoryViewer.css';

const BACKEND_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getMediaUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  return `${BACKEND_BASE_URL}/${cleanUrl}`;
};

interface StoriesBarProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const StoriesBar: React.FC<StoriesBarProps> = ({ isCollapsed }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentViewingStories, setCurrentViewingStories] = useState<Story[]>([]);

  const { data: storiesData, isLoading } = useQuery({
    queryKey: ['storiesFeed'],
    queryFn: () => storiesAPI.getStoriesFeed({ sort: 'unseen_first', includeViewStatus: true }),
    staleTime: 5 * 60 * 1000,
  });

  const queryClient = useQueryClient();

  const displayStories: DisplayStoryItem[] = useMemo(() => {
    const backendGroups = (storiesData?.data?.stories || []) as DisplayStoryItem[];

    const addStoryItem: DisplayStoryItem = {
      id: 'add-story',
      author: {
        _id: user?._id,
        username: 'Add story',
        fullName: 'Add story',
        profilePicture: user?.profilePicture
      },
      isOwn: true,
      stories: []
    };

    return [addStoryItem, ...backendGroups];
  }, [storiesData?.data?.stories, user]);

  const allStoriesFlat = useMemo(() => {
    const backendGroups = (storiesData?.data?.stories || []) as DisplayStoryItem[];
    return backendGroups.flatMap(group => group.stories || []);
  }, [storiesData?.data?.stories]);

  const handleViewStory = (displayItem: DisplayStoryItem) => {
    if (!displayItem.stories || displayItem.stories.length === 0) return;

    const authorId = displayItem.author._id;

    const firstUnseenIndex = allStoriesFlat.findIndex(s => s.author._id === authorId && !s.hasViewed);
    const firstAuthorIndex = allStoriesFlat.findIndex(s => s.author._id === authorId);

    const startIndex = firstUnseenIndex !== -1 ? firstUnseenIndex : firstAuthorIndex;

    if (startIndex !== -1) {
      setCurrentViewingStories(allStoriesFlat);
      setCurrentStoryIndex(startIndex);
      setOpenViewModal(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="stories-bar loading">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="story-item-loading">
            <div className="skeleton-circle-ring">
              <div className="skeleton-avatar-circle" />
            </div>
            <div className="skeleton-text-line" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <motion.div 
        className={`stories-bar ${isCollapsed ? 'collapsed' : 'expanded'}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {displayStories.map((item) => (
          <motion.div
            key={item.id || item.author._id}
            variants={itemVariants}
            className="story-item"
            onClick={() => {
              if (item.isOwn && item.id === 'add-story') {
                setOpenCreateModal(true);
              } else {
                handleViewStory(item);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (item.isOwn && item.id === 'add-story') {
                  setOpenCreateModal(true);
                } else {
                  handleViewStory(item);
                }
              }
            }}
          >
            <motion.div
              className={`story-avatar-container ${item.hasUnseen ? 'has-unseen' : 'viewed'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
            >
              <div className="avatar-ring">
                {item.isOwn && item.id === 'add-story' ? (
                  <div className="story-avatar-add">
                    <Plus size={32} />
                  </div>
                ) : (
                  <Avatar
                    src={item.author?.profilePicture}
                    alt={item.author?.fullName || 'User'}
                    name={item.author?.fullName}
                    size="100%"
                    className="story-avatar"
                  />
                )}
              </div>
              {item.isOwn && item.id === 'add-story' && (
                <div className="add-icon-badge">
                  <Plus size={14} strokeWidth={3} />
                </div>
              )}
            </motion.div>
            <p className="story-username">
              {item.isOwn && item.id === 'add-story' ? 'Add story' : item.author?.username}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {createPortal(
        <>
          <AnimatePresence>
            {openCreateModal && (
              <CreateStoryModal
                isOpen={openCreateModal}
                onClose={() => setOpenCreateModal(false)}
                getMediaUrl={getMediaUrl}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {openViewModal && currentViewingStories.length > 0 && (
              <StoryViewer
                stories={currentViewingStories}
                currentIndex={currentStoryIndex}
                isOpen={openViewModal}
                onClose={() => {
                  setOpenViewModal(false);
                  queryClient.invalidateQueries({ queryKey: ['storiesFeed'] });
                }}
                onCreateStory={() => setOpenCreateModal(true)}
                onUserClick={(uid) => navigate(`/profile/${uid}`)}
                getMediaUrl={getMediaUrl}
              />
            )}
          </AnimatePresence>
        </>,
        document.body
      )}

    </>
  );
};

export default StoriesBar;
