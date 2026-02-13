import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaArrowLeft, FaPaperPlane, FaImage, FaTimes } from 'react-icons/fa';
import { BsEmojiSmile, BsMic } from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { messagesAPI, api } from '../services/api';
import toast from 'react-hot-toast';
import ConversationsList from '../components/ConversationsList';
import MessageActions from '../components/MessageActions';
import Avatar from '../components/Avatar';
import './ChatPage.css';

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
    isVerified: boolean;
  };
  content: string;
  messageType: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  reactions: Array<{
    user: {
      _id: string;
      username: string;
      fullName: string;
      profilePicture?: string;
    };
    emoji: string;
    reactedAt: string;
  }>;
  replyTo?: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      username: string;
      fullName: string;
    };
  };
}

interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  participants: Array<{
    user: {
      _id: string;
      username: string;
      fullName: string;
      profilePicture?: string;
      isVerified: boolean;
      lastActive?: string;
    };
    role: 'admin' | 'member';
    isActive: boolean;
  }>;
  name?: string;
  avatar?: string;
}

const ChatPage: React.FC = () => {
  const { userId, conversationId, groupId } = useParams<{ userId?: string; conversationId?: string; groupId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string, text: string, name: string } | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const isDirectMessage = !!userId && userId !== 'new';
  const effectiveConversationId = conversationId || groupId;
  const currentConversationId = effectiveConversationId || (isDirectMessage ? `direct_${[user?._id, userId].sort().join('_')}` : '');

  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: () => isDirectMessage
      ? messagesAPI.getConversationByUserId(userId!)
      : messagesAPI.getConversation(effectiveConversationId!),
    enabled: (!!effectiveConversationId || isDirectMessage) && userId !== 'new',
  });

  const conversation: Conversation | undefined = (conversationData as any)?.data?.conversation || (conversationData as any)?.conversation || (conversationData as any)?.data;

  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', conversation?._id || (isDirectMessage ? userId : effectiveConversationId)],
    queryFn: () => {
      if (conversation?._id) {
        return messagesAPI.getConversationMessages(conversation._id);
      }
      return isDirectMessage
        ? messagesAPI.getMessages(userId!)
        : messagesAPI.getConversationMessages(effectiveConversationId!);
    },
    enabled: (!!conversation?._id || !!effectiveConversationId || isDirectMessage) && userId !== 'new',
  });

  const messages: Message[] = useMemo(() => {
    const rawMessages = (messagesData as any)?.data?.messages || (messagesData as any)?.messages || (messagesData as any)?.data || [];
    return Array.isArray(rawMessages) ? rawMessages : [];
  }, [messagesData]);

  const isNewMessage = userId === 'new';

  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string, replyTo?: string }) => {
      const payload: any = {
        content: data.content,
        messageType: 'text',
        replyTo: data.replyTo
      };

      if (conversation?._id) {
        payload.conversationId = conversation._id;
      } else if (isDirectMessage) {
        payload.recipientId = userId;
        payload.conversationId = currentConversationId;
      } else {
        payload.conversationId = currentConversationId;
      }

      return api.post('/messages', payload);
    },
    onSuccess: (response: any) => {
      setMessageInput('');
      setReplyTo(null);
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      if (isNewMessage && response.data?.participantId) {
        navigate(`/messages/${response.data.participantId}`, { replace: true });
      } else if (isNewMessage && response.data?.conversationId) {
        // Fallback or group
        navigate(`/messages/group/${response.data.conversationId}`, { replace: true });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send message');
    },
  });

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender._id !== user?._id && !lastMessage.isRead) {
      messagesAPI.markMessageAsRead(lastMessage._id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', isDirectMessage ? userId : effectiveConversationId] });
        if (conversation?._id) {
          queryClient.invalidateQueries({ queryKey: ['messages', conversation._id] });
        }
      });
    }
  }, [messages, user?._id, currentConversationId, queryClient]);

  useEffect(() => {
    if (socket?.isConnected && currentConversationId) {
      socket.joinConversation(currentConversationId);
    }

    return () => {
      if (socket?.isConnected && currentConversationId) {
        socket.leaveConversation(currentConversationId);
      }
    };
  }, [socket, currentConversationId]);

  useEffect(() => {
    const handleReceiveMessage = (data: any) => {
      const msgConvId = data.conversation?._id || data.conversation;
      if (msgConvId === currentConversationId || (conversation?._id && msgConvId === conversation._id)) {
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    };

    if (socket) {
      socket.onReceiveMessage(handleReceiveMessage);
    }

    return () => {
      if (socket) {
        socket.offReceiveMessage(handleReceiveMessage);
      }
    };
  }, [socket, currentConversationId, refetchMessages, queryClient]);

  useEffect(() => {
    const handleUserTyping = (data: any) => {
      const typingConvId = data.conversationId?._id || data.conversationId;
      if ((typingConvId === currentConversationId || (conversation?._id && typingConvId === conversation._id)) && data.userId !== user?._id) {
        setIsTyping(data.isTyping);
      }
    };

    if (socket) {
      socket.onUserTyping(handleUserTyping);
    }

    return () => {
      if (socket) {
        socket.offUserTyping(handleUserTyping);
      }
    };
  }, [socket, currentConversationId, user?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate({
      content: messageInput.trim(),
      replyTo: replyTo?.id
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);

    if (socket.isConnected && currentConversationId) {
      socket.startTyping(currentConversationId);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.stopTyping(currentConversationId);
      }, 2000);
    }
  };

  const handleReply = (id: string, text: string, name: string) => {
    setReplyTo({ id, text, name });
    inputRef.current?.focus();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChatTitle = () => {
    if (isNewMessage) return 'New Message';
    if (conversation) {
      if (conversation.type === 'direct' && conversation.participants) {
        const otherParticipant = conversation.participants.find(p => {
          const participantId = typeof p.user === 'string' ? p : (p.user?._id || p.user);
          return String(participantId) !== String(user?._id);
        });

        if (otherParticipant && typeof otherParticipant.user === 'object') {
          return otherParticipant.user.fullName || otherParticipant.user.username || 'Chat';
        }
      }

      // Try partner fallback
      const partner = (conversation as any).partner;
      if (partner) return partner.fullName || partner.username || 'Chat';

      if (conversation.name) return conversation.name;
    }
    return 'Chat';
  };

  const getChatAvatar = () => {
    if (isNewMessage) return '/default-profile.svg';
    if (conversation) {
      if (conversation.type === 'direct' && conversation.participants) {
        const otherParticipant = conversation.participants.find(p => {
          const participantId = typeof p.user === 'string' ? p : (p.user?._id || p.user);
          return String(participantId) !== String(user?._id);
        });

        if (otherParticipant && typeof otherParticipant.user === 'object') {
          return otherParticipant.user.profilePicture || '/default-profile.svg';
        }
      }

      const partner = (conversation as any).partner;
      if (partner?.profilePicture) return partner.profilePicture;

      if (conversation.avatar) return conversation.avatar;
    }
    return '/default-profile.svg';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', currentConversationId);
    formData.append('messageType', 'image');

    toast.promise(
      api.post('/messages', formData),
      {
        loading: 'Uploading image...',
        success: 'Image sent!',
        error: 'Failed to upload image',
      }
    ).then(() => {
      refetchMessages();
    });
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (conversationLoading || messagesLoading) {
    return <div className="loading-spinner">Loading chat...</div>;
  }

  return (
    <div className="chat-page-wrapper">
      <input
        type="file"
        id="image-upload"
        hidden
        accept="image/*"
        onChange={handleFileUpload}
      />
      {!isMobile && (
        <div className="messages-sidebar-wrapper">
          <ConversationsList />
        </div>
      )}

      <div className="chat-content-area">
        <div className="chat-header">
          <button className="back-button" onClick={() => navigate('/messages')}>
            <FaArrowLeft />
          </button>

          <div className="chat-info">
            <Avatar
              src={getChatAvatar()}
              alt={getChatTitle()}
              name={getChatTitle()}
              size={40}
              className="chat-avatar"
            />
            <div className="chat-details">
              <h2>{getChatTitle()}</h2>
              {!isNewMessage && isDirectMessage && (
                <span className="online-status">Active now</span>
              )}
            </div>
          </div>
        </div>

        <div className="messages-container">
          <div className="messages-list">
            {isNewMessage && (
              <div className="new-message-placeholder">
                <div className="placeholder-icon"><FaPaperPlane /></div>
                <h3>New Conversation</h3>
                <p>Type a user ID or select a friend to start chatting.</p>
              </div>
            )}
            {messages.length === 0 && !isNewMessage && !messagesLoading && (
              <div className="no-messages-prompt">
                <div className="prompt-icon"><FaPaperPlane /></div>
                <h3>Start a Conversation</h3>
                <p>No messages here yet. Be the first to say hello!</p>
              </div>
            )}
            {messages.map((message) => (
              <div key={message._id} className={`message-item ${message.sender._id === user?._id ? 'own' : 'other'}`}>
                {message.sender._id !== user?._id && (
                  <Avatar
                    src={message.sender.profilePicture}
                    alt={message.sender.fullName}
                    name={message.sender.fullName}
                    size={32}
                    className="message-avatar"
                  />
                )}
                <div className="message-content">
                  {message.replyTo && (
                    <div className="reply-preview-bubble">
                      <span className="reply-name">{message.replyTo.sender.fullName}</span>
                      <p className="reply-content">{message.replyTo.content?.substring(0, 50)}</p>
                    </div>
                  )}
                  <div className="message-bubble-wrapper">
                    <div className={`message-bubble ${message.messageType === 'image' ? 'has-image' : ''}`}>
                      {message.messageType === 'image' ? (
                        <img src={message.content} alt="shared" className="shared-image" />
                      ) : (
                        <p>{message.content}</p>
                      )}
                      <div className="message-meta">
                        <span className="message-time">{formatTime(message.createdAt)}</span>
                        {message.sender._id === user?._id && (
                          <span className={`read-status ${message.isRead ? 'read' : 'sent'}`}>
                            {message.isRead ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>

                    <MessageActions
                      messageId={message._id}
                      content={message.content}
                      isOwnMessage={message.sender._id === user?._id}
                      onReply={handleReply}
                      senderName={message.sender.fullName}
                    />
                  </div>

                  {message.reactions.length > 0 && (
                    <div className="message-reactions">
                      {message.reactions.map((r, i) => (
                        <span key={i} className="reaction-badge" title={r.user.fullName}>{r.emoji}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && <div className="typing-indicator">Typing...</div>}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="message-input-area">
          {replyTo && (
            <div className="active-reply-preview">
              <div className="reply-info">
                <span className="replying-to">Replying to {replyTo.name}</span>
                <p className="reply-content">{replyTo.text.substring(0, 80)}...</p>
              </div>
              <button className="cancel-reply" onClick={() => setReplyTo(null)}>
                <FaTimes />
              </button>
            </div>
          )}

          <div className="input-row">
            <button className="icon-btn"><BsEmojiSmile /></button>
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={isNewMessage ? "Enter user ID and message..." : "Type message..."}
              rows={1}
            />
            {messageInput.trim() ? (
              <button className="send-btn" onClick={handleSendMessage}><FaPaperPlane /></button>
            ) : (
              <div className="input-extras">
                <label htmlFor="image-upload" className="icon-btn"><FaImage /></label>
                <button className="icon-btn"><BsMic /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
