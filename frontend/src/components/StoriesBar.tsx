import React, { useState, useEffect, useMemo } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storiesAPI, usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StoryViewer from './StoryViewer';
import { Story, DisplayStoryItem } from '../types/stories';
import { organizeStories } from '../utils/storyOrganizer';
import './StoriesBar.css';

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
  const [newStoryContent, setNewStoryContent] = useState('');
  const [newStoryMedia, setNewStoryMedia] = useState<File | null>(null);
  const [storyVisibility, setStoryVisibility] = useState('public');
  const [storyCloseFriends, setStoryCloseFriends] = useState<string[]>([]);
  const [userCloseFriends, setUserCloseFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: storiesData } = useQuery({
    queryKey: ['storiesFeed'],
    queryFn: () => storiesAPI.getStoriesFeed({ sort: 'unseen_first', includeViewStatus: true }),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const queryClient = useQueryClient();

  const stories: Story[] = useMemo(() => (storiesData?.data?.stories || []) as Story[], [storiesData?.data?.stories]);

  const organizedStories = useMemo(() => organizeStories(stories, user?._id), [stories, user?._id]);

  const displayStories: DisplayStoryItem[] = useMemo(() => [
    { id: 'add-story', author: { _id: user?._id, username: 'Add story', fullName: 'Add story', profilePicture: user?.profilePicture }, isOwn: true, stories: [] },
    ...organizedStories
  ], [organizedStories, user?._id, user?.profilePicture]);

  const flatStories = useMemo(() => stories, [stories]);

  useEffect(() => {
    const fetchCloseFriends = async () => {
      if (openCreateModal && user?.username) {
        try {
          const response = await usersAPI.getFollowing(user.username);
          const following = response.data.following || [];
          setUserCloseFriends(following);
        } catch (error) {
          console.error('Failed to fetch close friends:', error);
        }
      }
    };

    fetchCloseFriends();
  }, [openCreateModal, user?.username]);

  const handleCreateStory = async () => {
    if (!newStoryContent && !newStoryMedia) {
      toast.error('Please add content or media');
      return;
    }
    setLoading(true);
    try {
      let mediaObject = null;
      if (newStoryMedia) {
        const formData = new FormData();
        formData.append('media', newStoryMedia);
        const uploadResponse = await storiesAPI.uploadStoryMedia(formData);
        mediaObject = uploadResponse.data.media;
      }

      const storyData: any = {
        content: newStoryContent,
        visibility: storyVisibility,
      };
      if (mediaObject) {
        storyData.media = mediaObject;
      }
      if (storyVisibility === 'close_friends') {
        storyData.closeFriends = storyCloseFriends;
      }
      await storiesAPI.createStory(storyData);
      toast.success('Story created successfully');
      setOpenCreateModal(false);
      setNewStoryContent('');
      setNewStoryMedia(null);
      setStoryVisibility('public');
      setStoryCloseFriends([]);
    } catch (error) {
      toast.error('Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStory = async (displayIndex: number) => {
    const displayStory = displayStories[displayIndex];
    const firstStoryIndex = flatStories.findIndex(story => story.author._id === displayStory.author._id);
    if (firstStoryIndex !== -1) {
      setCurrentViewingStories(flatStories);
      setCurrentStoryIndex(firstStoryIndex);
      setOpenViewModal(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <>
      <div className={`stories-bar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
        {displayStories.map((story, index) => (
          <div
            key={story.id || story.author._id}
            className="story-item"
            onClick={() => {
              if (story.isOwn && story.id === 'add-story') {
                setOpenCreateModal(true);
              } else {
                handleViewStory(index);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={story.isOwn && story.id === 'add-story' ? 'Create new story' : `View stories by ${story.author?.fullName || story.author?.username}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (story.isOwn && story.id === 'add-story') {
                  setOpenCreateModal(true);
                } else {
                  handleViewStory(index);
                }
              }
            }}
          >
            <motion.div
              className={`story-avatar-container ${story.isOwn ? 'new-story' : 'viewed-story'} ${story.hasUnseen ? 'has-unseen' : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {story.isOwn && story.id === 'add-story' ? (
                <button className="story-avatar-add">
                  <MdAdd />
                </button>
              ) : (
                <img
                  src={story.author?.profilePicture}
                  alt={story.author?.fullName}
                  className={`story-avatar ${story.isOwn ? 'own' : ''}`}
                />
              )}
              {story.isOwn && story.id === 'add-story' && (
                <div className="add-icon-small">
                  <MdAdd />
                </div>
              )}
            </motion.div>
            <p className="story-username">
              {story.isOwn && story.id === 'add-story' ? 'Add story' :
               story.isOwn && story.stories && story.stories.length > 0 ? `${story.author?.username} (${story.stories.length})` :
               story.stories && story.stories.length > 0 ? (
                 story.hasUnseen && story.unseenCount ?
                   `${story.author?.username} (${story.unseenCount} new)` :
                   `${story.author?.username} (${story.stories.length})`
               ) :
               story.author?.username || 'User'}
            </p>
          </div>
        ))}
      </div>

      {openCreateModal && (
        <div className="create-story-modal-overlay" onClick={() => setOpenCreateModal(false)}>
          <div className="create-story-modal" onClick={(e) => e.stopPropagation()}>
            <div className="create-story-header">
              <h2 className="create-story-title">Create Story</h2>
              <button className="close-button" onClick={() => setOpenCreateModal(false)}>
                <MdClose />
              </button>
            </div>
            <textarea
              className="create-story-textarea"
              placeholder="What's on your mind?"
              value={newStoryContent}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewStoryContent(e.target.value)}
              rows={3}
            />
            <input
              accept="image/*,video/*"
              className="media-input"
              id="story-media-file"
              type="file"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStoryMedia(e.target.files ? e.target.files[0] : null)}
            />
            <label htmlFor="story-media-file" className="media-button">
              {newStoryMedia ? 'Change Media' : 'Add Media'}
            </label>
            {newStoryMedia && (
              <p className="selected-media">Selected: {newStoryMedia.name}</p>
            )}
            <div className="story-visibility-section">
              <label htmlFor="story-visibility" className="visibility-label">Visibility:</label>
              <select
                id="story-visibility"
                value={storyVisibility}
                onChange={(e) => setStoryVisibility(e.target.value)}
                className="visibility-select"
              >
                <option value="public">Public</option>
                <option value="followers">Followers</option>
                <option value="close_friends">Close Friends</option>
                <option value="private">Private</option>
              </select>
            </div>
            {storyVisibility === 'close_friends' && (
              <div className="close-friends-section">
                <label className="close-friends-label">Select Close Friends:</label>
                <div className="close-friends-list">
                  {userCloseFriends.length > 0 ? (
                    userCloseFriends.map((friend) => (
                      <div key={friend._id} className="close-friend-item">
                        <input
                          type="checkbox"
                          id={`friend-${friend._id}`}
                          checked={storyCloseFriends.includes(friend._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStoryCloseFriends([...storyCloseFriends, friend._id]);
                            } else {
                              setStoryCloseFriends(storyCloseFriends.filter(id => id !== friend._id));
                            }
                          }}
                          className="close-friend-checkbox"
                        />
                        <label htmlFor={`friend-${friend._id}`} className="close-friend-label">
                          <img
                            src={friend.profilePicture || '/default-avatar.png'}
                            alt={friend.username}
                            className="close-friend-avatar"
                          />
                          <span className="close-friend-name">{friend.fullName || friend.username}</span>
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="close-friends-placeholder">No close friends found. Add some friends first!</p>
                  )}
                </div>
              </div>
            )}
            <button
              className="post-button"
              onClick={handleCreateStory}
              disabled={loading}
            >
              {loading ? 'Posting...' : 'Post Story'}
            </button>
          </div>
        </div>
      )}

      <StoryViewer
        stories={currentViewingStories}
        currentIndex={currentStoryIndex}
        isOpen={openViewModal}
        onClose={() => {
          setOpenViewModal(false);
          queryClient.invalidateQueries({ queryKey: ['storiesFeed'] });
        }}
        onCreateStory={() => setOpenCreateModal(true)}
        onUserClick={handleUserClick}
      />
    </>
  );
};

export default StoriesBar;
