import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { storiesAPI } from '../services/api';
import './UserHighlights.css';

interface Highlight {
  _id: string;
  title: string;
  coverStory: {
    media: {
      url: string;
      type: string;
    };
  };
  stories: string[];
  isPublic: boolean;
  createdAt: string;
}

interface UserHighlightsProps {
  userId: string;
  onHighlightClick: (highlight: Highlight) => void;
  onEditHighlight: (highlight: Highlight) => void;
}

const UserHighlights: React.FC<UserHighlightsProps> = ({ userId, onHighlightClick, onEditHighlight }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['userHighlights', userId],
    queryFn: () => storiesAPI.getUserHighlights(),
    enabled: !!userId,
  });

  const highlights: Highlight[] = data?.data?.highlights || [];

  if (isLoading) {
    return <div className="highlights-loading">Loading highlights...</div>;
  }

  if (error) {
    return <div className="highlights-error">Failed to load highlights.</div>;
  }

  if (highlights.length === 0) {
    return <div className="no-highlights">No highlights yet.</div>;
  }

  return (
    <div className="user-highlights-container">
      {highlights.map((highlight) => (
        <div
          key={highlight._id}
          className="highlight-item"
          onClick={() => onHighlightClick(highlight)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onHighlightClick(highlight);
            }
          }}
        >
          <img
            src={highlight.coverStory?.media?.url || '/default-highlight-cover.png'}
            alt={highlight.title}
            className="highlight-cover"
          />
          <div className="highlight-title">{highlight.title}</div>
          <button
            className="edit-highlight-button"
            onClick={(e) => {
              e.stopPropagation();
              onEditHighlight(highlight);
            }}
            aria-label={`Edit highlight ${highlight.title}`}
          >
            ✎
          </button>
        </div>
      ))}
    </div>
  );
};

export default UserHighlights;
