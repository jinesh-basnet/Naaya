import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaTimes, FaLock } from 'react-icons/fa';
import { storiesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './HighlightManager.css';

interface Story {
  _id: string;
  content: string;
  media?: {
    url: string;
    type: string;
  };
  createdAt: string;
}

interface Highlight {
  _id: string;
  title: string;
  coverStory: string;
  stories: string[];
  isPublic: boolean;
  createdAt: string;
}

interface HighlightManagerProps {
  isOpen: boolean;
  onClose: () => void;
  highlightToEdit?: Highlight | null;
}

const HighlightManager: React.FC<HighlightManagerProps> = ({
  isOpen,
  onClose,
  highlightToEdit
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [selectedStories, setSelectedStories] = useState<string[]>([]);
  const [coverStory, setCoverStory] = useState<string>('');
  const [isPublic, setIsPublic] = useState(true);

  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ['userStories', user?.username],
    queryFn: () => storiesAPI.getUserStories(user!.username),
    enabled: !!user?.username && isOpen,
  });

  const stories = storiesData?.data?.stories || [];

  useEffect(() => {
    if (isOpen) {
      if (highlightToEdit) {
        setTitle(highlightToEdit.title);
        setSelectedStories(highlightToEdit.stories);
        setCoverStory(highlightToEdit.coverStory);
        setIsPublic(highlightToEdit.isPublic);
      } else {
        setTitle('');
        setSelectedStories([]);
        setCoverStory('');
        setIsPublic(true);
      }
    }
  }, [isOpen, highlightToEdit]);

  const createHighlightMutation = useMutation({
    mutationFn: (highlightData: any) => storiesAPI.createHighlight(highlightData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userHighlights'] });
      toast.success('Highlight created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create highlight');
    },
  });

  const updateHighlightMutation = useMutation({
    mutationFn: ({ highlightId, updateData }: { highlightId: string, updateData: any }) =>
      storiesAPI.updateHighlight(highlightId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userHighlights'] });
      toast.success('Highlight updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update highlight');
    },
  });

  const handleStoryToggle = (storyId: string) => {
    setSelectedStories(prev =>
      prev.includes(storyId)
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId]
    );
  };

  const handleCoverStorySelect = (storyId: string) => {
    setCoverStory(storyId);
    if (!selectedStories.includes(storyId)) {
      setSelectedStories(prev => [...prev, storyId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a title for your highlight');
      return;
    }

    if (selectedStories.length === 0) {
      toast.error('Please select at least one story');
      return;
    }

    if (!coverStory) {
      toast.error('Please select a cover story');
      return;
    }

    const highlightData = {
      title: title.trim(),
      coverStory,
      stories: selectedStories,
      isPublic,
    };

    if (highlightToEdit) {
      updateHighlightMutation.mutate({
        highlightId: highlightToEdit._id,
        updateData: highlightData
      });
    } else {
      createHighlightMutation.mutate(highlightData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="highlight-manager-overlay" onClick={onClose}>
      <div className="highlight-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="highlight-manager-header">
          <h2>{highlightToEdit ? 'Edit Highlight' : 'Create New Highlight'}</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="highlight-manager-form">
          <div className="form-group">
            <label htmlFor="title">Highlight Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter highlight title..."
              maxLength={30}
              required
            />
            <span className="char-count">{title.length}/30</span>
          </div>

          <div className="form-group">
            <label>Privacy</label>
            <div className="privacy-options">
              <button
                type="button"
                className={`privacy-option ${isPublic ? 'active' : ''}`}
                onClick={() => setIsPublic(true)}
              >
                Public
              </button>
              <button
                type="button"
                className={`privacy-option ${!isPublic ? 'active' : ''}`}
                onClick={() => setIsPublic(false)}
              >
                <FaLock /> Private
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Select Stories ({selectedStories.length} selected)</label>
            {storiesLoading ? (
              <div className="loading-spinner"></div>
            ) : stories.length === 0 ? (
              <p className="no-stories">No stories available. Create some stories first!</p>
            ) : (
              <div className="stories-grid">
                {stories.map((story: Story) => (
                  <div
                    key={story._id}
                    className={`story-item ${selectedStories.includes(story._id) ? 'selected' : ''}`}
                    onClick={() => handleStoryToggle(story._id)}
                  >
                    {story.media?.url && (
                      <img
                        src={story.media.url}
                        alt="Story media"
                        className="story-thumbnail"
                      />
                    )}
                    <div className="story-overlay">
                      <input
                        type="checkbox"
                        checked={selectedStories.includes(story._id)}
                        onChange={() => handleStoryToggle(story._id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedStories.length > 0 && (
            <div className="form-group">
              <label>Choose Cover Story</label>
              <div className="cover-stories-grid">
                {selectedStories.map(storyId => {
                  const story = stories.find((s: Story) => s._id === storyId);
                  if (!story) return null;

                  return (
                    <div
                      key={storyId}
                      className={`cover-story-item ${coverStory === storyId ? 'selected' : ''}`}
                      onClick={() => handleCoverStorySelect(storyId)}
                    >
                      {story.media?.url && (
                        <img
                          src={story.media.url}
                          alt="Cover story"
                          className="cover-thumbnail"
                        />
                      )}
                      {coverStory === storyId && (
                        <div className="cover-indicator">Cover</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedStories.length > 0 && (
            <div className="form-group">
              <label>Preview ({selectedStories.length} stories)</label>
              <div className="preview-stories">
                {selectedStories.map(storyId => {
                  const story = stories.find((s: Story) => s._id === storyId);
                  if (!story) return null;

                  return (
                    <div key={storyId} className="preview-story-item">
                      {story.media?.url && (
                        <img
                          src={story.media.url}
                          alt="Story preview"
                          className="preview-thumbnail"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={createHighlightMutation.isPending || updateHighlightMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={createHighlightMutation.isPending || updateHighlightMutation.isPending}
            >
              {createHighlightMutation.isPending || updateHighlightMutation.isPending
                ? 'Saving...'
                : highlightToEdit ? 'Update Highlight' : 'Create Highlight'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HighlightManager;
