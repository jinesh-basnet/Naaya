import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storiesAPI } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './SocketContext';

interface StoryViewContextType {
  viewedStories: Set<string>;
  markStoryAsViewed: (storyId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshViewedStories: () => Promise<void>;
}

const StoryViewContext = createContext<StoryViewContextType | undefined>(undefined);

export const useStoryView = () => {
  const context = useContext(StoryViewContext);
  if (!context) {
    throw new Error('useStoryView must be used within a StoryViewProvider');
  }
  return context;
};

interface StoryViewProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export const StoryViewProvider: React.FC<StoryViewProviderProps> = ({ children, userId }) => {
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const socket = useSocket();

  const markStoryAsViewed = useCallback(async (storyId: string) => {
    setViewedStories(prev => new Set(prev).add(storyId));
    setError(null);

    try {
      await storiesAPI.markStoryAsViewed(storyId);
      queryClient.invalidateQueries(['stories']);
    } catch (err) {
      setViewedStories(prev => {
        const newSet = new Set(prev);
        newSet.delete(storyId);
        return newSet;
      });
      setError('Failed to mark story as viewed');
      console.error('Error marking story as viewed:', err);
    }
  }, [queryClient]);

  const refreshViewedStories = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
    } catch (err) {
      setError('Failed to refresh viewed stories');
      console.error('Error refreshing viewed stories:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refreshViewedStories();
    } else {
      setViewedStories(new Set());
    }
  }, [userId, refreshViewedStories]);

  useEffect(() => {
    const handleStoryViewed = (data: any) => {
      queryClient.invalidateQueries(['stories']);
    };

    socket.onStoryViewed(handleStoryViewed);

    return () => {
      socket.offStoryViewed(handleStoryViewed);
    };
  }, [socket, queryClient]);

  const value: StoryViewContextType = {
    viewedStories,
    markStoryAsViewed,
    isLoading,
    error,
    refreshViewedStories,
  };

  return (
    <StoryViewContext.Provider value={value}>
      {children}
    </StoryViewContext.Provider>
  );
};
