import React, { useState } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import { storiesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { safeRender } from '../utils/safeRender';
import './StoriesBar.css';

const StoriesBar: React.FC = () => {
  const { user } = useAuth();

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [newStoryContent, setNewStoryContent] = useState('');
  const [newStoryMedia, setNewStoryMedia] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch stories feed
  const { data: storiesData } = useQuery({
    queryKey: ['storiesFeed'],
    queryFn: () => storiesAPI.getStoriesFeed(),
  });

  const stories = storiesData?.data?.stories || [];

  // Add "Your story" at the beginning if user doesn't have a story
  const hasUserStory = stories.some((story: any) => story.author._id === user?._id);
  const displayStories = hasUserStory
    ? stories
    : [{ id: 'your-story', author: { _id: user?._id, username: 'Your story', fullName: 'Your story', profilePicture: user?.profilePicture }, isOwn: true }, ...stories];

  const handleCreateStory = async () => {
    if (!newStoryContent && !newStoryMedia) {
      toast.error('Please add content or media');
      return;
    }
    setLoading(true);
    try {
      let mediaObject = null;
      if (newStoryMedia) {
        // Upload media first
        const formData = new FormData();
        formData.append('media', newStoryMedia);
        const uploadResponse = await storiesAPI.uploadStoryMedia(formData);
        mediaObject = uploadResponse.data.media;
      }

      // Create story with media object
      const storyData = {
        content: newStoryContent,
        media: mediaObject
      };
      await storiesAPI.createStory(storyData);
      toast.success('Story created successfully');
      setOpenCreateModal(false);
      setNewStoryContent('');
      setNewStoryMedia(null);
    } catch (error) {
      toast.error('Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStory = (storyIndex: number) => {
    setCurrentStoryIndex(storyIndex);
    setOpenViewModal(true);
  };

  const handleNextStory = () => {
    setCurrentStoryIndex((prev) => (prev + 1) % displayStories.length);
  };

  const handlePrevStory = () => {
    setCurrentStoryIndex((prev) => (prev - 1 + displayStories.length) % displayStories.length);
  };

  return (
    <>
      <div className="stories-bar">
        {displayStories.map((story: any, index: number) => (
          <div
            key={story.id || story._id}
            className="story-item"
            onClick={() => {
              if (story.isOwn && story.id === 'your-story') {
                setOpenCreateModal(true);
              } else {
                handleViewStory(index);
              }
            }}
          >
            <div className="story-avatar-container">
              {story.isOwn && story.id === 'your-story' ? (
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
              {story.isOwn && story.id === 'your-story' && (
                <div className="add-icon-small">
                  <MdAdd />
                </div>
              )}
            </div>
            <p className="story-username">
              {story.isOwn && story.id === 'your-story' ? 'Your story' : story.author?.username || 'User'}
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
            <label htmlFor="story-media-file">
              <button className="media-button">
                {newStoryMedia ? 'Change Media' : 'Add Media'}
              </button>
            </label>
            {newStoryMedia && (
              <p className="selected-media">Selected: {newStoryMedia.name}</p>
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

      {/* Story View Modal */}
      {openViewModal && (
        <div className="view-story-modal-overlay" onClick={() => setOpenViewModal(false)}>
          <div className="view-story-modal" onClick={(e) => e.stopPropagation()}>
            <div className="view-story-header">
              <div className="view-story-author">
                <img
                  src={displayStories[currentStoryIndex]?.author?.profilePicture}
                  alt={displayStories[currentStoryIndex]?.author?.fullName}
                  className="view-story-avatar"
                />
                <div className="view-story-author-info">
                  <h3>{safeRender(displayStories[currentStoryIndex]?.author?.fullName)}</h3>
                  <p>@{displayStories[currentStoryIndex]?.author?.username}</p>
                </div>
              </div>
              <button className="close-button" onClick={() => setOpenViewModal(false)}>
                <MdClose />
              </button>
            </div>

            <div className="view-story-body">
              {displayStories[currentStoryIndex]?.media && (
                <div className="story-media-container">
                  {displayStories[currentStoryIndex]?.media?.type === 'image' ? (
                    <img
                      src={displayStories[currentStoryIndex]?.media?.url}
                      alt="Story media"
                      className="story-media"
                    />
                  ) : (
                    <video
                      src={displayStories[currentStoryIndex]?.media?.url}
                      controls
                      className="story-media"
                    />
                  )}
                </div>
              )}
              {displayStories[currentStoryIndex]?.content && (
                <h2 className="story-content">
                  {safeRender(displayStories[currentStoryIndex].content)}
                </h2>
              )}

              {/* Navigation arrows */}
              {displayStories.length > 1 && (
                <>
                  <button className="nav-button nav-prev" onClick={handlePrevStory}>
                    ‹
                  </button>
                  <button className="nav-button nav-next" onClick={handleNextStory}>
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StoriesBar;
