import React, { useState, useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import { MdAdd } from 'react-icons/md';
import './StoryViewer.css';

interface Story {
  _id: string;
  content?: string;
  media?: {
    url: string;
    type: string;
  };
  createdAt: string;
  author: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
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
  viewsCount?: number; 
}

interface StoryViewerProps {
  stories: Story[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onCreateStory?: () => void;
  onUserClick?: (userId: string) => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  currentIndex,
  isOpen,
  onClose,
  onCreateStory,
  onUserClick
}) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(currentIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [mediaErrors, setMediaErrors] = useState<{[key: number]: boolean}>({});
  const [retryAttempts, setRetryAttempts] = useState<{[key: number]: number}>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);

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
    setCurrentStoryIndex(currentIndex);
    setProgress(0);
    setIsPlaying(true);
  }, [currentIndex, stories]);

  useEffect(() => {
    const story = stories[currentStoryIndex];
    if (story) {
      setAnnouncement(`Story ${currentStoryIndex + 1} of ${stories.length} by ${story.author.fullName}`);
    }
  }, [currentStoryIndex, stories]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const handleNext = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
    touchStartY.current = e.changedTouches[0].screenY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    touchEndY.current = e.changedTouches[0].screenY;
  };

  const handleTouchEnd = () => {
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50) {
      if (deltaX > 0) {
        handlePrevious();
      } else {
        handleNext();
      }
    }
  };

  const handleMediaError = (storyIndex: number) => {
    setMediaErrors(prev => ({ ...prev, [storyIndex]: true }));
  };

  const handleRetry = (storyIndex: number) => {
    const currentAttempts = retryAttempts[storyIndex] || 0;
    if (currentAttempts < 3) {
      setRetryAttempts(prev => ({ ...prev, [storyIndex]: currentAttempts + 1 }));
      setMediaErrors(prev => ({ ...prev, [storyIndex]: false }));
      const story = stories[storyIndex];
      if (story?.media?.url) {
        const url = new URL(story.media.url);
        url.searchParams.set('retry', Date.now().toString());
        story.media.url = url.toString();
      }
    }
  };

  if (!isOpen || stories.length === 0) return null;

  const currentStory = stories[currentStoryIndex];

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <div className="story-navigation">
        <button
          className="nav-button"
          onClick={handlePrevious}
          disabled={currentStoryIndex === 0}
        >
          ‹
        </button>

        <button
          className="nav-button"
          onClick={handleNext}
          disabled={currentStoryIndex >= stories.length - 1}
        >
          ›
        </button>
      </div>
      <div className="story-viewer-container" onClick={e => e.stopPropagation()} ref={containerRef} role="dialog" aria-modal="true" aria-labelledby="story-author-name">
        <div className="story-viewer-header">
          <div className="story-info">
            <img
              src={currentStory.author.profilePicture || '/default-avatar.png'}
              alt={currentStory.author.fullName}
              className="story-author-avatar"
            />
            <div className="story-author-info">
              <h3
                onClick={() => onUserClick?.(currentStory.author._id)}
                style={{ cursor: 'pointer' }}
                aria-label={`View ${currentStory.author.fullName}'s profile`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onUserClick?.(currentStory.author._id);
                  }
                }}
              >
                {currentStory.author.fullName}
              </h3>
              <span className="story-username">@{currentStory.author.username}</span>
            </div>
            {typeof currentStory.viewsCount === 'number' && (
              <span className="story-views-count" title="View count" style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
                👁️ {currentStory.viewsCount}
              </span>
            )}
          </div>

          <div className="story-actions">
            {onCreateStory && (
              <button className="create-story-button" onClick={onCreateStory}>
                <MdAdd />
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

        <div className="story-content" onClick={handleStoryClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {currentStory ? (
            <>
              {currentStory.media?.url && (
                <div className="story-media">
                  {mediaErrors[currentStoryIndex] ? (
                    <div className="media-error">
                      <div className="error-message">
                        <p>Failed to load media</p>
                        {(retryAttempts[currentStoryIndex] || 0) < 3 ? (
                          <button
                            className="retry-button"
                            onClick={() => handleRetry(currentStoryIndex)}
                          >
                            Retry ({3 - (retryAttempts[currentStoryIndex] || 0)} attempts left)
                          </button>
                        ) : (
                          <p className="error-text">Maximum retry attempts reached</p>
                        )}
                      </div>
                    </div>
                  ) : currentStory.media.type === 'image' ? (
                    <img
                      src={currentStory.media.url}
                      alt="Story"
                      className="story-image"
                      loading="lazy"
                      onError={() => handleMediaError(currentStoryIndex)}
                    />
                  ) : (
                    <video
                      src={currentStory.media.url}
                      className="story-video"
                      autoPlay
                      muted
                      loop
                      preload="metadata"
                      onError={() => handleMediaError(currentStoryIndex)}
                    />
                  )}
                </div>
              )}

              {currentStory.content && (
                <div className="story-text">
                  <p>{currentStory.content}</p>
                </div>
              )}

              {currentStory.location && (
                <div className="story-location">
                  <p>{currentStory.location.name || `${currentStory.location.city}, ${currentStory.location.district}`}</p>
                </div>
              )}
            </>
          ) : (
            <div className="no-story">
              <div className="empty-state-illustration" aria-hidden="true">
                📷
              </div>
              <h3>No Stories Yet</h3>
              <p>Be the first to share a moment!</p>
            </div>
          )}
        </div>
        <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
      </div>
    </div>
  );
};

export default StoryViewer;
