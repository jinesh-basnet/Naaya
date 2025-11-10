import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture: string;
  };
  content: string;
  messageType: string;
  createdAt: string;
  isRead: boolean;
  isEdited?: boolean;
  reactions?: Array<{
    emoji: string;
    user: string;
  }>;
}

interface Conversation {
  partner: {
    _id: string;
  };
}

export const useSocketEvents = (
  selectedConversation: Conversation | null,
  addMessage: (message: Message) => void,
  updateMessage: (messageId: string, updates: Partial<Message>) => void,
  deleteMessage: (messageId: string) => void
) => {
  const [isTyping, setIsTyping] = useState(false);
  const { socket } = useSocket();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!socket || !selectedConversation) return;

    socket.emit('join_room', `conversation:${selectedConversation.partner._id}`);

    const handleNewMessage = (message: Message) => {
      addMessage(message);
    };

    const handleTypingStart = (data: { userId: string }) => {
      if (data.userId !== currentUser?._id) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: { userId: string }) => {
      if (data.userId !== currentUser?._id) {
        setIsTyping(false);
      }
    };

    const handleMessageSeen = (data: { messageId: string; userId: string }) => {
      updateMessage(data.messageId, { isRead: true });
    };

    const handleReactionAdded = (data: { messageId: string; reaction: any }) => {
      updateMessage(data.messageId, { reactions: data.reaction });
    };

    const handleReactionRemoved = (data: { messageId: string; userId: string }) => {
      updateMessage(data.messageId, {
        reactions: [] 
      });
    };

    const handleMessageEdited = (data: { messageId: string; messageData: any }) => {
      updateMessage(data.messageId, { content: data.messageData.content, isEdited: data.messageData.isEdited });
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      deleteMessage(data.messageId);
    };

    socket.on('receive_message', handleNewMessage);
    socket.on('user_typing', handleTypingStart);
    socket.on('user_typing_stop', handleTypingStop);
    socket.on('message_seen', handleMessageSeen);
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('user_typing', handleTypingStart);
      socket.off('user_typing_stop', handleTypingStop);
      socket.off('message_seen', handleMessageSeen);
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.emit('leave_room', `conversation:${selectedConversation.partner._id}`);
    };
  }, [socket, selectedConversation, currentUser?._id, addMessage, updateMessage, deleteMessage]);

  const emitTypingStart = () => {
    if (!socket || !selectedConversation) return;
    socket.emit('typing_start', {
      room: `conversation:${selectedConversation.partner._id}`,
      userId: currentUser?._id,
    });
  };

  const emitTypingStop = () => {
    if (!socket || !selectedConversation) return;
    socket.emit('typing_stop', {
      room: `conversation:${selectedConversation.partner._id}`,
      userId: currentUser?._id,
    });
  };

  return {
    isTyping,
    emitTypingStart,
    emitTypingStop,
  };
};
