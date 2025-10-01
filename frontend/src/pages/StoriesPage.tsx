import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdClose } from 'react-icons/md';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './StoriesPage.css';
import { storiesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { formatLocation } from '../utils/locationUtils';
import { safeRender } from '../utils/safeRender';

interface Story {
  _id: string;
  author: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture: string;
    isVerified: boolean;
  };
  content?: string;
  media?: {
    type: string;
    url: string;
  };
  location?: {
    name?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    city?: string;
    district?: string;
    province?: string;
  };
  createdAt: string;
  expiresAt: string;
  reactionsCount: number;
  repliesCount: number;
}

const StoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [newStoryContent, setNewStoryContent] = useState('');
  const [newStoryMedia, setNewStoryMedia] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['storiesFeed'],
    queryFn: () => storiesAPI.getStoriesFeed(),
  });

  useEffect(() => {
    if (data?.data?.stories) {
      setStories(data.data.stories);
    }
  }, [data]);

  const createStoryMutation = useMutation({
    mutationFn: (storyData: any) => storiesAPI.createStory(storyData),
    onSuccess: () => {
      toast.success('Story created successfully');
      setOpenCreateModal(false);
      setNewStoryContent('');
      setNewStoryMedia(null);
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ['storiesFeed'] });
    },
    onError: () => {
      toast.error('Failed to create story');
      setLoading(false);
    },
  });

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

      const storyData = {
        content: newStoryContent,
        media: mediaObject
      };
      createStoryMutation.mutate(storyData);
    } catch (error) {
      toast.error('Failed to upload media');
      setLoading(false);
    }
  };

  const handleViewStory = (storyIndex: number) => {
    setCurrentStoryIndex(storyIndex);
    setOpenViewModal(true);
  };

  const handleNextStory = () => {
    setCurrentStoryIndex((prev) => (prev + 1) % stories.length);
  };

  const handlePrevStory = () => {
    setCurrentStoryIndex((prev) => (prev - 1 + stories.length) % stories.length);
  };

  return (
    <div className="stories-page">
      <div className="stories-container">
        <div className="stories-header">
          <h1 className="stories-title">Stories (Jhyaal)</h1>
          <button className="add-story-button" onClick={() => setOpenCreateModal(true)}>
            {(MdAdd as any)({})}
          </button>
        </div>

        {isLoading ? (
          <div className="loading-container">
            Loading...
          </div>
        ) : stories.length === 0 ? (
          <div className="no-stories">No stories available</div>
        ) : (
          <div className="stories-grid">
            {stories.map((story, index) => (
              <div key={story._id} className="story-card" onClick={() => handleViewStory(index)}>
                <div className="story-card-content">
                  <img
                    src={story.author.profilePicture}
                    alt={story.author.fullName}
                    className="story-avatar"
                    onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                  />
                  <h3 className="story-author-name" onClick={() => navigate(`/profile/${story.author.username}`)} style={{ cursor: 'pointer' }}>{safeRender(story.author.fullName)}</h3>
                  <p className="story-username">@{story.author.username}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {openCreateModal && (
          <div className="modal-overlay" onClick={() => setOpenCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Create Story</h2>
                <button className="close-button" onClick={() => setOpenCreateModal(false)}>
                  {(MdClose as any)({})}
                </button>
              </div>
              <textarea
                className="story-textarea"
                placeholder="What's on your mind?"
                value={newStoryContent}
                onChange={(e) => setNewStoryContent(e.target.value)}
                rows={3}
              />
              <input
                accept="image/*,video/*"
                id="story-media-file"
                type="file"
                className="media-input"
                onChange={(e) => setNewStoryMedia(e.target.files ? e.target.files[0] : null)}
              />
              <label htmlFor="story-media-file" className="media-button">
                {newStoryMedia ? 'Change Media' : 'Add Media'}
              </label>
              {newStoryMedia && <p className="selected-media">Selected: {newStoryMedia.name}</p>}
              <button className="post-button" onClick={handleCreateStory} disabled={loading}>
                {loading ? 'Posting...' : 'Post Story'}
              </button>
            </div>
          </div>
        )}

        {openViewModal && (
          <div className="modal-overlay" onClick={() => setOpenViewModal(false)}>
            <div className="modal-content story-view-modal" onClick={(e) => e.stopPropagation()}>
              <div className="story-view-header">
                <div className="story-view-author">
                  <img
                    src={stories[currentStoryIndex]?.author.profilePicture}
                    alt={stories[currentStoryIndex]?.author.fullName}
                    className="story-view-avatar"
                    onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                  />
                  <div className="story-view-author-info">
                  <h3 onClick={() => navigate(`/profile/${stories[currentStoryIndex]?.author.username}`)} style={{ cursor: 'pointer' }}>{safeRender(stories[currentStoryIndex]?.author.fullName)}</h3>
                    <p>@{stories[currentStoryIndex]?.author.username}</p>
                  </div>
                </div>
                <button className="close-button" onClick={() => setOpenViewModal(false)}>
                  {(MdClose as any)({})}
                </button>
              </div>

              <div className="story-view-body">
                {stories[currentStoryIndex]?.media && (
                  <div className="story-media">
                    {stories[currentStoryIndex]?.media?.type === 'image' ? (
                      <img
                        src={stories[currentStoryIndex]?.media?.url}
                        alt="Story media"
                        className="story-media"
                      />
                    ) : (
                      <video
                        src={stories[currentStoryIndex]?.media?.url}
                        controls
                        className="story-media"
                      />
                    )}
                  </div>
                )}
                {stories[currentStoryIndex]?.content && (
                  <p className="story-content">
                    {safeRender(stories[currentStoryIndex].content)}
                  </p>
                )}

                {stories[currentStoryIndex]?.location && (
                  <p className="story-location">
                    {formatLocation(stories[currentStoryIndex].location)}
                  </p>
                )}

                {stories.length > 1 && (
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
      </div>
    </div>
  );
};

export default StoriesPage;
