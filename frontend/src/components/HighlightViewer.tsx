import React, { useState, useEffect } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { storiesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './HighlightViewer.css';

interface Highlight {
  _id: string;
  title: string;
  coverStory: string;
  stories: string[];
  isPublic: boolean;
  createdAt: string;
}

interface Story {
  _id: string;
  content: string;
  media?: {
    url: string;
    type: string;
  };
  createdAt: string;
  user: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
}

interface HighlightViewerProps {
  highlight: Highlight;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

const HighlightViewer: React.FC<HighlightViewerProps> = ({
  highlight,
  isOpen,
  onClose,
  onEdit
}) => {
  const { user } = useAuth();
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const { data: highlightData, isLoading } = useQuery({
    queryKey: ['highlight', highlight._id],
    queryFn: () => storiesAPI.getHighlight(highlight._id),
    enabled: !!highlight._id && isOpen,
  });

  const stories = highlightData?.data?.highlight?.stories || [];

  useEffect(() => {
    if (!isPlaying || stories.length === 0) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrentStoryIndex(current => {
            if (current >= stories.length - 1) {
              setIsPlaying(false);
              return current;
            }
            return current + 1;
          });
          return 0;
        }
        return prev + (100 / 50); 
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, stories.length]);

  useEffect(() => {
    setCurrentStoryIndex(0);
    setProgress(0);
    setIsPlaying(true);
  }, [highlight._id]);

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    }
  };

  const handleNext = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else {
      setIsPlaying(false);
    }
  };

  const handleStoryClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width / 2) {
      handlePrevious();
    } else {
      handleNext();
    }
  };

  if (!isOpen) return null;

  const currentStory = stories[currentStoryIndex];
  const isOwner = user?._id === highlightData?.data?.highlight?.author?._id;

  return (
    <div className="highlight-viewer-overlay" onClick={onClose}>
      <div className="highlight-viewer-container" onClick={e => e.stopPropagation()}>
        <div className="highlight-viewer-header">
          <div className="highlight-info">
            <h3>{highlight.title}</h3>
            <span className="story-count">{currentStoryIndex + 1} of {stories.length}</span>
          </div>

          <div className="highlight-actions">
            {isOwner && onEdit && (
              <button className="edit-button" onClick={onEdit}>
                Edit
              </button>
            )}
            <button className="close-button" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="progress-container">
          {stories.map((_: Story, index: number) => (
            <div
              key={index}
              className={`progress-bar ${index < currentStoryIndex ? 'completed' : index === currentStoryIndex ? 'active' : ''}`}
            >
              <div
                className="progress-fill"
                style={{
                  width: index === currentStoryIndex ? `${progress}%` : index < currentStoryIndex ? '100%' : '0%'
                }}
              />
            </div>
          ))}
        </div>

        <div className="story-content" onClick={handleStoryClick}>
          {isLoading ? (
            <div className="shimmer-loading"></div>
          ) : currentStory ? (
            <>
              {currentStory.media?.url && (
                <div className="story-media">
                  {currentStory.media.type === 'image' ? (
                    <img
                      src={currentStory.media.url}
                      alt="Story"
                      className="story-image"
                    />
                  ) : (
                    <video
                      src={currentStory.media.url}
                      className="story-video"
                      autoPlay
                      muted
                      loop
                    />
                  )}
                </div>
              )}

              {currentStory.content && (
                <div className="story-text">
                  <p>{currentStory.content}</p>
                </div>
              )}
            </>
          ) : (
            <div className="no-stories">
              <p>No stories in this highlight</p>
            </div>
          )}
        </div>

        <div className="story-navigation">
          <button
            className="nav-button"
            onClick={handlePrevious}
            disabled={currentStoryIndex === 0}
          >
            <FaChevronLeft />
          </button>

          <button
            className="nav-button"
            onClick={handleNext}
            disabled={currentStoryIndex >= stories.length - 1}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HighlightViewer;
