import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MdAdd, MdClose } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storiesAPI, usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';
import { Story, DisplayStoryItem } from '../types/stories';
import { organizeStories } from '../utils/storyOrganizer';
import Avatar from './Avatar';
import { getProfileImageUrl } from '../utils/imageUtils';
import './StoriesBar.css';
import './StoryViewer.css'; // Added for consistency, though typically component-specific CSS is imported in the component itself.

const BACKEND_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// This utility function should ideally be in a shared utility file or within the components that use it.
// Placing it here as per the provided diff.
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

  const { data: storiesData } = useQuery({
    queryKey: ['storiesFeed'],
    queryFn: () => storiesAPI.getStoriesFeed({ sort: 'unseen_first', includeViewStatus: true }),
    staleTime: 5 * 60 * 1000,
  });

  const queryClient = useQueryClient();

  // Backend already groups and sorts these!
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

  // Flatten for the viewer
  const allStoriesFlat = useMemo(() => {
    const backendGroups = (storiesData?.data?.stories || []) as DisplayStoryItem[];
    return backendGroups.flatMap(group => group.stories || []);
  }, [storiesData?.data?.stories]);

  const handleViewStory = (displayItem: DisplayStoryItem) => {
    if (!displayItem.stories || displayItem.stories.length === 0) return;

    // Find the first story of this author in the flat list
    const authorId = displayItem.author._id;

    // Find first unseen story or just the first story
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

  return (
    <>
      <div className={`stories-bar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
        {displayStories.map((item, index) => (
          <div
            key={item.id || item.author._id}
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
              whileTap={{ scale: 0.95 }}
            >
              <div className="avatar-ring">
                {item.isOwn && item.id === 'add-story' ? (
                  <div className="story-avatar-add">
                    <MdAdd />
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
                  <MdAdd />
                </div>
              )}
            </motion.div>
            <p className="story-username">
              {item.isOwn && item.id === 'add-story' ? 'Add story' : item.author?.username}
            </p>
          </div>
        ))}
      </div>

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
