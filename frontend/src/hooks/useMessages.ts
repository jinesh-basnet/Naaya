import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messagesAPI } from '../services/api';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

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

export const useMessages = (selectedConversation: Conversation | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation?.partner._id],
    queryFn: () => selectedConversation ? messagesAPI.getMessages(selectedConversation.partner._id) : null,
    enabled: !!selectedConversation,
  });

  useEffect(() => {
    if (messagesData?.data?.messages) {
      setMessages(messagesData.data.messages);

      (async () => {
        if (!socket || !selectedConversation || !currentUser) return;

        const msgs = messagesData.data.messages as Message[];
        for (const m of msgs) {
          const receiverId = (m as any).receiver?._id || (m as any).receiver;
          const isRead = m.isRead;
          if (receiverId && currentUser?._id && receiverId === currentUser._id && !isRead) {
            try {
              await messagesAPI.markAsSeen(m._id);
              socket.emit('message_seen', {
                messageId: m._id,
                room: `conversation:${selectedConversation.partner._id}`,
                userId: currentUser._id,
              });
            } catch (err) {
            }
          }
        }
      })();
    }
  }, [messagesData, socket, selectedConversation, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(m => m._id === messageId ? { ...m, ...updates } : m));
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m));
  };

  return {
    messages,
    isLoading: messagesLoading,
    messagesEndRef,
    addMessage,
    updateMessage,
    deleteMessage,
  };
};
