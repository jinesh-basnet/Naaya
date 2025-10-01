import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSend, MdSearch, MdMoreVert, MdEmojiEmotions, MdAttachFile, MdImage } from 'react-icons/md';
import './MessagesPage.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

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

const MessagesPage: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesAPI.getConversations(),
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation?.partner._id],
    queryFn: () => selectedConversation ? messagesAPI.getMessages(selectedConversation.partner._id) : null,
    enabled: !!selectedConversation,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { receiver: string; content: string }) =>
      messagesAPI.sendMessage(messageData),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.partner._id] });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  useEffect(() => {
    if (messagesData?.data?.messages) {
      setMessages(messagesData.data.messages);
    }
  }, [messagesData]);

  useEffect(() => {
    if (!socket || !selectedConversation) return;

    socket.emit('join_room', `conversation:${selectedConversation.partner._id}`);

    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
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

    socket.on('receive_message', handleNewMessage);
    socket.on('user_typing', handleTypingStart);
    socket.on('user_typing_stop', handleTypingStop);

    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('user_typing', handleTypingStart);
      socket.off('user_typing_stop', handleTypingStop);
      socket.emit('leave_room', `conversation:${selectedConversation.partner._id}`);
    };
  }, [socket, selectedConversation, currentUser?._id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      receiver: selectedConversation.partner._id,
      content: newMessage.trim(),
    });

    if (socket) {
      socket.emit('typing_stop', {
        room: `conversation:${selectedConversation.partner._id}`,
        userId: currentUser?._id,
      });
    }
  };

  const handleTyping = () => {
    if (!socket || !selectedConversation) return;

    socket.emit('typing_start', {
      room: `conversation:${selectedConversation.partner._id}`,
      userId: currentUser?._id,
    });

    setTimeout(() => {
      socket.emit('typing_stop', {
        room: `conversation:${selectedConversation.partner._id}`,
        userId: currentUser?._id,
      });
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversationsData?.data?.conversations?.filter((conv: Conversation) => {
    return conv.partner.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.partner.username.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="messages-container">
      <div className="messages-sidebar">
        <h6>Messages</h6>

        <div className="search-input-wrapper">
          <MdSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <ul className="conversations-list">
          {conversationsLoading ? (
            <li className="loading-text">Loading conversations...</li>
          ) : filteredConversations.length === 0 ? (
            <li className="no-conversations">No conversations yet</li>
          ) : (
            filteredConversations.map((conversation: Conversation) => {
              return (
                <li
                  key={conversation.partner._id}
                  className={`conversation-item ${selectedConversation?.partner._id === conversation.partner._id ? 'selected' : ''}`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="conversation-avatar">
                    <img src={conversation.partner.profilePicture} alt={conversation.partner.fullName} />
                    {conversation.unreadCount > 0 && <span className="avatar-badge"></span>}
                    {!conversation.partner.profilePicture && conversation.partner.fullName.charAt(0)}
                  </div>
                  <div className="conversation-content">
                    <div className="conversation-header">
                      <span className="conversation-name" onClick={conversation.partner._id !== currentUser?._id ? () => navigate(`/profile/${conversation.partner.username}`) : undefined} style={conversation.partner._id !== currentUser?._id ? { cursor: 'pointer' } : {}}>{conversation.partner.fullName}</span>
                      <span className="conversation-time">{formatTime(conversation.latestMessage.createdAt)}</span>
                    </div>
                    <div className="conversation-footer">
                      <span className="conversation-message">
                        {conversation.latestMessage?.content || 'No messages yet'}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="unread-chip">{conversation.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="chat-area">
        {selectedConversation ? (
          <>
            <div className="chat-header">
              <img
                src={selectedConversation.partner.profilePicture}
                alt={selectedConversation.partner.fullName}
                className="chat-avatar"
              />
              {!selectedConversation.partner.profilePicture && <div className="chat-avatar">{selectedConversation.partner.fullName.charAt(0)}</div>}
              <div className="chat-user-info">
                <h6 onClick={selectedConversation.partner._id !== currentUser?._id ? () => navigate(`/profile/${selectedConversation.partner.username}`) : undefined} style={selectedConversation.partner._id !== currentUser?._id ? { cursor: 'pointer' } : {}}>{selectedConversation.partner.fullName}</h6>
                <span className="chat-username">@{selectedConversation.partner.username}</span>
              </div>
              <button className="more-btn">
                <MdMoreVert />
              </button>
            </div>

            <div className="messages-container-div">
              {messagesLoading ? (
                <div className="loading-text">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="empty-state">
                  <div>
                    <h6>No messages yet. Start the conversation!</h6>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                  className={`message-item ${message.sender._id === currentUser?._id ? 'sent' : ''}`}
                >
                  <div
                    className={`message-bubble ${message.sender._id === currentUser?._id ? 'sent' : 'received'}`}
                  >
                    <p className="message-text">{message.content}</p>
                    <span className="message-time">{formatTime(message.createdAt)}</span>
                  </div>
                </div>
                ))
              )}
              {isTyping && (
                <div className="typing-indicator">
                  <div className="typing-bubble">
                    <p className="typing-text">Typing...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
              <button className="icon-btn">
                <MdAttachFile />
              </button>
              <button className="icon-btn">
                <MdImage />
              </button>
              <textarea
                className="message-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
              />
              <button className="icon-btn">
                <MdEmojiEmotions />
              </button>
              <button
                className="icon-btn send-btn"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
              >
                <MdSend />
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div>
              <h6>Select a conversation to start messaging</h6>
              <p>Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
