import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSearch } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import { formatTime } from '../utils/messageUtils';

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

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  isLoading,
  searchQuery,
  setSearchQuery,
  selectedConversation,
  onSelectConversation,
}) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  return (
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
        {isLoading ? (
          <li className="loading-text">Loading conversations...</li>
        ) : conversations.length === 0 ? (
          <li className="no-conversations">No conversations yet</li>
        ) : (
          conversations.map((conversation: Conversation) => (
            <li
              key={conversation.partner._id}
              className={`conversation-item ${selectedConversation?.partner._id === conversation.partner._id ? 'selected' : ''}`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="conversation-avatar">
                <img src={conversation.partner.profilePicture} alt={conversation.partner.fullName} />
                {conversation.unreadCount > 0 && <span className="avatar-badge"></span>}
                {!conversation.partner.profilePicture && conversation.partner.fullName.charAt(0)}
              </div>
              <div className="conversation-content">
                <div className="conversation-header">
                  <span
                    className="conversation-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (conversation.partner._id !== currentUser?._id) {
                        navigate(`/profile/${conversation.partner.username}`);
                      }
                    }}
                    style={conversation.partner._id !== currentUser?._id ? { cursor: 'pointer' } : {}}
                  >
                    {conversation.partner.fullName}
                  </span>
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
          ))
        )}
      </ul>
    </div>
  );
};

export default ConversationList;
