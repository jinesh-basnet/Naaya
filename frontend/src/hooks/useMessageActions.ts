import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI } from '../services/api';
import { useState } from 'react';
import toast from 'react-hot-toast';
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

export const useMessageActions = (selectedConversation: Conversation | null) => {
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { receiver: string; content: string; replyTo?: string }) =>
      messagesAPI.sendMessage(messageData),
    onSuccess: () => {
      setNewMessage('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.partner._id] });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const payload: any = {
      receiver: selectedConversation.partner._id,
      content: newMessage.trim(),
    };
    if (replyTo) payload.replyTo = replyTo._id;

    if (editingMessageId) {
      messagesAPI.editMessage(editingMessageId, newMessage.trim())
        .then(() => {
          setNewMessage('');
          setReplyTo(null);
          setEditingMessageId(null);
          queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.partner._id] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        })
        .catch(() => {
          toast.error('Failed to edit message');
        });
    } else {
      sendMessageMutation.mutate(payload);
    }
  };

  const handleEditRequest = (message: Message) => {
    setNewMessage(message.content);
    setReplyTo(null);
    setEditingMessageId(message._id);
  };

  const handleDeleteRequest = async (messageId: string) => {
    try {
      await messagesAPI.deleteMessage(messageId);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.partner._id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  const handleReactRequest = async (message: Message, emoji: string) => {
    try {
      const userReaction = (message.reactions || []).find((r: any) => r.user === currentUser?._id || (r.user && r.user._id === currentUser?._id));
      if (userReaction && userReaction.emoji === emoji) {
        await messagesAPI.removeReaction(message._id);
      } else {
        await messagesAPI.addReaction(message._id, emoji);
      }
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.partner._id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err) {
      toast.error('Failed to react');
    }
  };

  return {
    newMessage,
    setNewMessage,
    replyTo,
    setReplyTo,
    editingMessageId,
    handleSendMessage,
    handleEditRequest,
    handleDeleteRequest,
    handleReactRequest,
    isSending: sendMessageMutation.isPending,
  };
};
