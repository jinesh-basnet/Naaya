import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data: any) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  onFeedPostLiked: (cb: (data: any) => void) => void;
  offFeedPostLiked: (cb: (data: any) => void) => void;
  onFeedPostSaved: (cb: (data: any) => void) => void;
  offFeedPostSaved: (cb: (data: any) => void) => void;
  onFeedPostShared: (cb: (data: any) => void) => void;
  offFeedPostShared: (cb: (data: any) => void) => void;
  onFeedReelLiked: (cb: (data: any) => void) => void;
  offFeedReelLiked: (cb: (data: any) => void) => void;
  onFeedReelSaved: (cb: (data: any) => void) => void;
  offFeedReelSaved: (cb: (data: any) => void) => void;
  onFeedReelShared: (cb: (data: any) => void) => void;
  offFeedReelShared: (cb: (data: any) => void) => void;
  onUserFollowed: (cb: (data: any) => void) => void;
  offUserFollowed: (cb: (data: any) => void) => void;
  onUserUnfollowed: (cb: (data: any) => void) => void;
  offUserUnfollowed: (cb: (data: any) => void) => void;
}


const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
      });

      newSocket.on('connect', () => setIsConnected(true));
      newSocket.on('disconnect', () => setIsConnected(false));
      newSocket.on('connect_error', (err) => console.error('Socket Conn Error:', err.message));

      socketRef.current = newSocket;
      setSocket(newSocket);

      return () => {
        newSocket.close();
        socketRef.current = null;
        setSocket(null);
      };
    }
    return undefined;
  }, [isAuthenticated, token]);

  const emit = useCallback((event: string, data: any) => {
    socket?.emit(event, data);
  }, [socket]);

  const joinConversation = useCallback((id: string) => emit('join_conversation', id), [emit]);
  const leaveConversation = useCallback((id: string) => emit('leave_conversation', id), [emit]);
  const startTyping = useCallback((id: string) => emit('start_typing', { conversationId: id }), [emit]);
  const stopTyping = useCallback((id: string) => emit('stop_typing', { conversationId: id }), [emit]);

  const onFeedPostLiked = useCallback((cb: (data: any) => void) => socket?.on('feedPostLiked', cb), [socket]);
  const offFeedPostLiked = useCallback((cb: (data: any) => void) => socket?.off('feedPostLiked', cb), [socket]);
  const onFeedPostSaved = useCallback((cb: (data: any) => void) => socket?.on('feedPostSaved', cb), [socket]);
  const offFeedPostSaved = useCallback((cb: (data: any) => void) => socket?.off('feedPostSaved', cb), [socket]);
  const onFeedPostShared = useCallback((cb: (data: any) => void) => socket?.on('feedPostShared', cb), [socket]);
  const offFeedPostShared = useCallback((cb: (data: any) => void) => socket?.off('feedPostShared', cb), [socket]);
  const onFeedReelLiked = useCallback((cb: (data: any) => void) => socket?.on('feedReelLiked', cb), [socket]);
  const offFeedReelLiked = useCallback((cb: (data: any) => void) => socket?.off('feedReelLiked', cb), [socket]);
  const onFeedReelSaved = useCallback((cb: (data: any) => void) => socket?.on('feedReelSaved', cb), [socket]);
  const offFeedReelSaved = useCallback((cb: (data: any) => void) => socket?.off('feedReelSaved', cb), [socket]);
  const onFeedReelShared = useCallback((cb: (data: any) => void) => socket?.on('feedReelShared', cb), [socket]);
  const offFeedReelShared = useCallback((cb: (data: any) => void) => socket?.off('feedReelShared', cb), [socket]);
  const onUserFollowed = useCallback((cb: (data: any) => void) => socket?.on('userFollowed', cb), [socket]);
  const offUserFollowed = useCallback((cb: (data: any) => void) => socket?.off('userFollowed', cb), [socket]);
  const onUserUnfollowed = useCallback((cb: (data: any) => void) => socket?.on('userUnfollowed', cb), [socket]);
  const offUserUnfollowed = useCallback((cb: (data: any) => void) => socket?.off('userUnfollowed', cb), [socket]);

  const value = useMemo(() => ({
    socket,
    isConnected,
    emit,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
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
    onUserFollowed,
    offUserFollowed,
    onUserUnfollowed,
    offUserUnfollowed,
  }), [socket, isConnected, emit, joinConversation, leaveConversation, startTyping, stopTyping, onFeedPostLiked, offFeedPostLiked, onFeedPostSaved, offFeedPostSaved, onFeedPostShared, offFeedPostShared, onFeedReelLiked, offFeedReelLiked, onFeedReelSaved, offFeedReelSaved, onFeedReelShared, offFeedReelShared, onUserFollowed, offUserFollowed, onUserUnfollowed, offUserUnfollowed]);


  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
