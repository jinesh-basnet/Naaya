import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  sendMessage: (data: any) => void;
  onMessage: (callback: (data: any) => void) => void;
  offMessage: (callback: (data: any) => void) => void;
  joinUserRoom: (userId: string) => void;
  onNotification: (callback: (notification: any) => void) => void;
  offNotification: (callback: (notification: any) => void) => void;

  onFeedPostLiked: (callback: (data: any) => void) => void;
  offFeedPostLiked: (callback: (data: any) => void) => void;
  onFeedPostSaved: (callback: (data: any) => void) => void;
  offFeedPostSaved: (callback: (data: any) => void) => void;
  onFeedPostShared: (callback: (data: any) => void) => void;
  offFeedPostShared: (callback: (data: any) => void) => void;
  onFeedReelLiked: (callback: (data: any) => void) => void;
  offFeedReelLiked: (callback: (data: any) => void) => void;
  onFeedReelSaved: (callback: (data: any) => void) => void;
  offFeedReelSaved: (callback: (data: any) => void) => void;
  onFeedReelShared: (callback: (data: any) => void) => void;
  offFeedReelShared: (callback: (data: any) => void) => void;
  onFeedReelCommented: (callback: (data: any) => void) => void;
  offFeedReelCommented: (callback: (data: any) => void) => void;
  onUserFollowed: (callback: (data: any) => void) => void;
  offUserFollowed: (callback: (data: any) => void) => void;
  onUserUnfollowed: (callback: (data: any) => void) => void;
  offUserUnfollowed: (callback: (data: any) => void) => void;
  onStoryViewed: (callback: (data: any) => void) => void;
  offStoryViewed: (callback: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          token,
        },
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      newSocket.on('reconnect', (attempt) => {
        console.log('Reconnected to server after', attempt, 'attempts');
        setIsConnected(true);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Reconnection failed');
        setIsConnected(false);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      return () => {
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    } else {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }
  }, [isAuthenticated, token]); 

  const joinRoom = useCallback((room: string) => {
    if (socket) {
      socket.emit('join_room', room);
    }
  }, [socket]);

  const leaveRoom = useCallback((room: string) => {
    if (socket) {
      socket.emit('leave_room', room);
    }
  }, [socket]);

  const sendMessage = useCallback((data: any) => {
    if (socket) {
      socket.emit('send_message', data);
    }
  }, [socket]);

  const onMessage = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('receive_message', callback);
    }
  }, [socket]);

  const offMessage = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('receive_message', callback);
    }
  }, [socket]);

  const joinUserRoom = useCallback((userId: string) => {
    if (socket) {
      socket.emit('join_room', `user:${userId}`);
    }
  }, [socket]);

  const onNotification = useCallback((callback: (notification: any) => void) => {
    if (socket) {
      socket.on('notification', callback);
    }
  }, [socket]);

  const offNotification = useCallback((callback: (notification: any) => void) => {
    if (socket) {
      socket.off('notification', callback);
    }
  }, [socket]);

  const onFeedPostLiked = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_post_liked', callback);
    }
  }, [socket]);

  const offFeedPostLiked = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_post_liked', callback);
    }
  }, [socket]);

  const onFeedPostSaved = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_post_saved', callback);
    }
  }, [socket]);

  const offFeedPostSaved = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_post_saved', callback);
    }
  }, [socket]);

  const onFeedPostShared = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_post_shared', callback);
    }
  }, [socket]);

  const offFeedPostShared = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_post_shared', callback);
    }
  }, [socket]);

  const onFeedReelLiked = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_reel_liked', callback);
    }
  }, [socket]);

  const offFeedReelLiked = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_reel_liked', callback);
    }
  }, [socket]);

  const onFeedReelSaved = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_reel_saved', callback);
    }
  }, [socket]);

  const offFeedReelSaved = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_reel_saved', callback);
    }
  }, [socket]);

  const onFeedReelShared = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_reel_shared', callback);
    }
  }, [socket]);

  const offFeedReelShared = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_reel_shared', callback);
    }
  }, [socket]);

  const onFeedReelCommented = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_reel_commented', callback);
    }
  }, [socket]);

  const offFeedReelCommented = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_reel_commented', callback);
    }
  }, [socket]);

  const onUserFollowed = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('user_followed', callback);
    }
  }, [socket]);

  const offUserFollowed = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('user_followed', callback);
    }
  }, [socket]);

  const onUserUnfollowed = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('user_unfollowed', callback);
    }
  }, [socket]);

  const offUserUnfollowed = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('user_unfollowed', callback);
    }
  }, [socket]);

  const onStoryViewed = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('story_viewed', callback);
    }
  }, [socket]);

  const offStoryViewed = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.off('story_viewed', callback);
    }
  }, [socket]);

  const value: SocketContextType = useMemo(() => ({
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    onMessage,
    offMessage,
    joinUserRoom,
    onNotification,
    offNotification,
    onFeedPostLiked,
    offFeedPostLiked,
    onFeedPostSaved,
    offFeedPostSaved,
    onFeedPostShared,
    offFeedPostShared,
    onFeedReelLiked,
    offFeedReelLiked,
    onFeedReelSaved,
    offFeedReelSaved,
    onFeedReelShared,
    offFeedReelShared,
    onFeedReelCommented,
    offFeedReelCommented,
    onUserFollowed,
    offUserFollowed,
    onUserUnfollowed,
    offUserUnfollowed,
    onStoryViewed,
    offStoryViewed,
  }), [socket, isConnected, joinRoom, leaveRoom, sendMessage, onMessage, offMessage, joinUserRoom, onNotification, offNotification, onFeedPostLiked, offFeedPostLiked, onFeedPostSaved, offFeedPostSaved, onFeedPostShared, offFeedPostShared, onFeedReelLiked, offFeedReelLiked, onFeedReelSaved, offFeedReelSaved, onFeedReelShared, offFeedReelShared, onFeedReelCommented, offFeedReelCommented, onUserFollowed, offUserFollowed, onUserUnfollowed, offUserUnfollowed, onStoryViewed, offStoryViewed]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
