import React from 'react';
import MessageOptions from './MessageOptions';
import { formatTime } from '../utils/messageUtils';

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

interface MessageItemProps {
  message: Message;
  currentUserId: string | undefined;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReact: (message: Message, emoji: string) => void;
  onReply: (message: Message) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  onEdit,
  onDelete,
  onReact,
  onReply,
}) => {
  return (
    <div
      className={`message-item ${message.sender._id === currentUserId ? 'sent' : ''}`}
    >
      <div className={`message-bubble-wrapper`}>
        <div
          onDoubleClick={() => onReply(message)}
          className={`message-bubble ${message.sender._id === currentUserId ? 'sent' : 'received'}`}
        >
          <p className="message-text">{message.content}</p>
          <span className="message-time">{formatTime(message.createdAt)}</span>
        </div>
        <MessageOptions
          message={message}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
        />
      </div>
    </div>
  );
};

export default MessageItem;
