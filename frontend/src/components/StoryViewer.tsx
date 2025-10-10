import React, { useState, useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import { MdAdd, MdSend } from 'react-icons/md';
import { useStoryView } from '../contexts/StoryViewContext';
import { useAuth } from '../contexts/AuthContext';
import { storiesAPI } from '../services/api';
import toast from 'react-hot-toast';
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
  poll?: {
    question: string;
    options: string[];
    votes: any[];
    expiresAt: string;
  };
  reactions?: any[];
  replies?: any[];
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [replyText, setReplyText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  const { viewedStories, markStoryAsViewed } = useStoryView();
  const { user } = useAuth();

  useEffect(() => {
    if (!isPlaying || stories.length === 0) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrentStoryIndex(current => {
            for (let i = current + 1; i < stories.length; i++) {
              if (!viewedStories.has(stories[i]._id)) {
                return i;
              }
            }
            setIsPlaying(false);
            return current;
          });
          return 0;
        }
        return prev + (100 / 50);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, stories.length, stories, viewedStories]);

  useEffect(() => {
    setCurrentStoryIndex(currentIndex);
    setProgress(0);
    setIsPlaying(true);

    const currentStory = stories[currentIndex];
    if (currentStory) {
      setAnnouncement(`Story ${currentIndex + 1} of ${stories.length} by ${currentStory.author.fullName}`);
      if (!viewedStories.has(currentStory._id)) {
        markStoryAsViewed(currentStory._id);
      }
    }

    if (currentStory?.media?.type === 'video' && videoRef.current && !mediaErrors[currentIndex]) {
      videoRef.current.play().then(() => {
        setIsVideoPlaying(true);
      }).catch(err => {
        console.error('Video play failed:', err);
        setIsVideoPlaying(false);
      });
    }
  }, [currentIndex, stories, viewedStories, markStoryAsViewed, mediaErrors]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  const handlePrevious = () => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }

    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const handleNext = () => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }

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

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => {
          setIsVideoPlaying(true);
        }).catch((err: Error) => {
          console.error('Video play failed:', err);
          toast.error('Failed to play video');
        });
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
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

  const handleReaction = (type: string) => {
    storiesAPI.addReaction(currentStory._id, type).then(() => {
      toast.success('Reaction added!');
    }).catch((err: Error) => {
      toast.error('Failed to add reaction');
    });
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    storiesAPI.addReply(currentStory._id, replyText).then(() => {
      toast.success('Reply sent!');
      setReplyText('');
    }).catch((err: Error) => {
      toast.error('Failed to send reply');
    });
  };

  const handleVote = (optionIndex: number) => {
    storiesAPI.voteOnPoll(currentStory._id, optionIndex).then(() => {
      toast.success('Vote submitted!');
    }).catch((err: Error) => {
      toast.error('Failed to vote');
    });
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
          aria-label="Previous story"
        >
          ‹
        </button>

        <button
          className="nav-button"
          onClick={handleNext}
          disabled={currentStoryIndex >= stories.length - 1}
          aria-label="Next story"
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
            {typeof currentStory.viewsCount === 'number' && user?._id === currentStory.author._id && (
              <span className="story-views-count" title="View count" style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
                👁️ {currentStory.viewsCount}
              </span>
            )}
          </div>

          <div className="story-actions">
            {onCreateStory && (
              <button className="create-story-button" onClick={onCreateStory} aria-label="Create new story">
                <MdAdd />
              </button>
            )}
            <button className="close-button" onClick={onClose} aria-label="Close story viewer">
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="progress-container">
          {stories.map((_: Story, index: number) => {
            const progressValue = index === currentStoryIndex ? progress : index < currentStoryIndex ? 100 : 0;
            return (
              <div
                key={index}
                className={`progress-bar ${index < currentStoryIndex ? 'completed' : index === currentStoryIndex ? 'active' : ''}`}
                role="progressbar"
                aria-valuenow={progressValue}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Story ${index + 1} of ${stories.length} progress`}
              >
                <div
                  className="progress-fill"
                  style={{
                    width: `${progressValue}%`
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="story-content" onClick={handleStoryClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {currentStory ? (
            <>
              {currentStory.media?.url && (
                <div className="story-media" role="img" aria-label={currentStory.media.type === 'image' ? 'Story image' : 'Story video'}>
                  {mediaErrors[currentStoryIndex] ? (
                    <div className="media-error">
                      <div className="error-message">
                        <p>Failed to load media</p>
                        {(retryAttempts[currentStoryIndex] || 0) < 3 ? (
                          <button
                            className="retry-button"
                            onClick={() => handleRetry(currentStoryIndex)}
                            aria-label="Retry loading media"
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
                      alt="Story media"
                      className="story-image"
                      loading="lazy"
                      onError={() => handleMediaError(currentStoryIndex)}
                    />
                  ) : (
                    <div className="video-wrapper">
                      <video
                        ref={videoRef}
                        src={currentStory.media.url}
                        className="story-video"
                        muted
                        loop
                        preload="metadata"
                        playsInline
                        onError={() => handleMediaError(currentStoryIndex)}
                        onLoadedMetadata={() => {
                          if (videoRef.current && !mediaErrors[currentStoryIndex]) {
                            videoRef.current.play().catch(err => console.error(err));
                          }
                        }}
                        aria-label="Story video"
                      />
                      <button
                        className="video-control-button"
                        onClick={toggleVideoPlay}
                        aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                      >
                        {isVideoPlaying ? '⏸️' : '▶️'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {currentStory.content && (
                <div className="story-text">
                  <p>{currentStory.content}</p>
                </div>
              )}

              {currentStory.location && (
                <div className="story-location" aria-label="Story location">
                  <p>{currentStory.location.name || `${currentStory.location.city}, ${currentStory.location.district}`}</p>
                </div>
              )}

              {currentStory.poll && (
                <div className="story-poll" role="radiogroup" aria-labelledby="poll-question">
                  <h4 id="poll-question">{currentStory.poll.question}</h4>
                  {currentStory.poll.options.map((option, index) => (
                    <button 
                      key={index} 
                      onClick={() => handleVote(index)} 
                      className="poll-option"
                      role="radio"
                      aria-checked={false}
                      aria-label={`Vote for ${option}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              <div className="story-interactions">
                <div className="story-reactions" role="group" aria-label="Story reactions">
                  <button onClick={() => handleReaction('heart')} className="reaction-button" aria-label="React with heart">❤️</button>
                  <button onClick={() => handleReaction('laugh')} className="reaction-button" aria-label="React with laugh">😂</button>
                  <button onClick={() => handleReaction('sad')} className="reaction-button" aria-label="React with sad">😢</button>
                  <button onClick={() => handleReaction('angry')} className="reaction-button" aria-label="React with angry">😡</button>
                  <button onClick={() => handleReaction('like')} className="reaction-button" aria-label="React with like">👍</button>
                </div>

                <div className="story-reply" role="searchbox" aria-label="Reply to story">
                  <label htmlFor="reply-input" className="sr-only">Reply to story</label>
                  <input
                    id="reply-input"
                    type="text"
                    placeholder="Reply to story..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  />
                  <button onClick={handleSendReply} disabled={!replyText.trim()} aria-label="Send reply">
                    <MdSend />
                  </button>
                </div>
              </div>
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
