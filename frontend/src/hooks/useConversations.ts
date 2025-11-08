import { useQuery } from '@tanstack/react-query';
import { messagesAPI } from '../services/api';
import { useState } from 'react';

interface Conversation {
  partner: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture: string;
    isVerified: boolean;
    lastActive: string;
  };
  latestMessage: {
    _id: string;
    content: string;
    messageType: string;
    createdAt: string;
    isRead: boolean;
  };
  unreadCount: number;
}

export const useConversations = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesAPI.getConversations(),
  });

  const filteredConversations = conversationsData?.data?.conversations?.filter((conv: Conversation) => {
    return conv.partner.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.partner.username.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  return {
    conversations: filteredConversations,
    isLoading: conversationsLoading,
    searchQuery,
    setSearchQuery,
  };
};
