import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdMoreVert } from 'react-icons/md';
import MessageItem from './MessageItem';

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
  isDeleted?: boolean;
  reactions?: Array<{
    emoji: string;
    user: string;
  }>;
}

interface ChatAreaProps {
  selectedConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  currentUserId: string | undefined;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReact: (message: Message, emoji: string) => void;
  onReply: (message: Message) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  selectedConversation,
  messages,
  isLoading,
  isTyping,
  currentUserId,
  messagesEndRef,
  onEdit,
  onDelete,
  onReact,
  onReply,
}) => {
  const navigate = useNavigate();

  if (!selectedConversation) {
    return (
      <div className="chat-area">
        <div className="empty-state">
          <div>
            <h6>Select a conversation to start messaging</h6>
            <p>Choose from your existing conversations or start a new one</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <img
          src={selectedConversation.partner.profilePicture}
          alt={selectedConversation.partner.fullName}
          className="chat-avatar"
        />
        {!selectedConversation.partner.profilePicture && (
          <div className="chat-avatar">{selectedConversation.partner.fullName.charAt(0)}</div>
        )}
        <div className="chat-user-info">
          <h6
            onClick={() => {
              if (selectedConversation.partner._id !== currentUserId) {
                navigate(`/profile/${selectedConversation.partner.username}`);
              }
            }}
            style={selectedConversation.partner._id !== currentUserId ? { cursor: 'pointer' } : {}}
          >
            {selectedConversation.partner.fullName}
          </h6>
          <span className="chat-username">@{selectedConversation.partner.username}</span>
        </div>
        <button className="more-btn">
          <MdMoreVert />
        </button>
      </div>

      <div className="messages-container-div">
        {isLoading ? (
          <div className="loading-text">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div>
              <h6>No messages yet. Start the conversation!</h6>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message._id}
              message={message}
              currentUserId={currentUserId}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onReply={onReply}
            />
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
    </div>
  );
};

export default ChatArea;
