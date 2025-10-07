import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }
  }, [isAuthenticated, token]); 

  const joinRoom = (room: string) => {
    if (socket) {
      socket.emit('join_room', room);
    }
  };

  const leaveRoom = (room: string) => {
    if (socket) {
      socket.emit('leave_room', room);
    }
  };

  const sendMessage = (data: any) => {
    if (socket) {
      socket.emit('send_message', data);
    }
  };

  const onMessage = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('receive_message', callback);
    }
  };

  const offMessage = (callback: (data: any) => void) => {
    if (socket) {
      socket.off('receive_message', callback);
    }
  };

  const joinUserRoom = (userId: string) => {
    if (socket) {
      socket.emit('join_room', `user:${userId}`);
    }
  };

  const onNotification = (callback: (notification: any) => void) => {
    if (socket) {
      socket.on('notification', callback);
    }
  };

  const offNotification = (callback: (notification: any) => void) => {
    if (socket) {
      socket.off('notification', callback);
    }
  };

  const onFeedPostLiked = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_post_liked', callback);
    }
  };

  const offFeedPostLiked = (callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_post_liked', callback);
    }
  };

  const onFeedPostSaved = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_post_saved', callback);
    }
  };

  const offFeedPostSaved = (callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_post_saved', callback);
    }
  };

  const onFeedPostShared = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_post_shared', callback);
    }
  };

  const offFeedPostShared = (callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_post_shared', callback);
    }
  };

  const onFeedReelLiked = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_reel_liked', callback);
    }
  };

  const offFeedReelLiked = (callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_reel_liked', callback);
    }
  };

  const onFeedReelSaved = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_reel_saved', callback);
    }
  };

  const offFeedReelSaved = (callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_reel_saved', callback);
    }
  };

  const onFeedReelShared = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_reel_shared', callback);
    }
  };

  const offFeedReelShared = (callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_reel_shared', callback);
    }
  };

  const onFeedReelCommented = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('feed_reel_commented', callback);
    }
  };

  const offFeedReelCommented = (callback: (data: any) => void) => {
    if (socket) {
      socket.off('feed_reel_commented', callback);
    }
  };

  const value: SocketContextType = {
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
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
