import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { BsReply } from 'react-icons/bs';
import './MessageReply.css';

interface MessageReplyProps {
  messageId: string;
  originalMessage: {
    _id: string;
    content: string;
    sender: {
      username: string;
      fullName: string;
    };
  };
  onReply: (messageId: string, content: string, replyTo: string) => void;
  onCancel: () => void;
  currentUserId: string;
}

const MessageReply: React.FC<MessageReplyProps> = ({
  messageId,
  originalMessage,
  onReply,
  onCancel,
  currentUserId
}) => {
  const [replyContent, setReplyContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim()) {
      onReply(messageId, replyContent.trim(), originalMessage._id);
      setReplyContent('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="message-reply">
      <div className="reply-header">
        <div className="reply-indicator">
          <BsReply />
          <span>Replying to {originalMessage.sender.username}</span>
        </div>
        <button
          type="button"
          className="cancel-reply-btn"
          onClick={onCancel}
          title="Cancel reply"
        >
          <FaTimes />
        </button>
      </div>

      <div className="original-message-preview">
        <p className="original-content">
          {originalMessage.content.length > 100
            ? `${originalMessage.content.substring(0, 100)}...`
            : originalMessage.content}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="reply-form">
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Write your reply..."
          className="reply-input"
          rows={3}
          autoFocus
        />
        <div className="reply-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="send-reply-btn"
            disabled={!replyContent.trim()}
          >
            Reply
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageReply;
