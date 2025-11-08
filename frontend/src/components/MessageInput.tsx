import React from 'react';
import { MdSend, MdEmojiEmotions, MdAttachFile, MdImage } from 'react-icons/md';

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

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
  onSend: () => void;
  onTyping: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isSending: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  setNewMessage,
  replyTo,
  setReplyTo,
  onSend,
  onTyping,
  onKeyPress,
  isSending,
}) => {
  return (
    <div className="input-area">
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-meta">
            Replying to {replyTo.sender.fullName}
            <button className="cancel-reply" onClick={() => setReplyTo(null)}>×</button>
          </div>
          <div className="reply-content">{replyTo.content}</div>
        </div>
      )}
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
          onTyping();
        }}
        onKeyPress={onKeyPress}
      />
      <button className="icon-btn">
        <MdEmojiEmotions />
      </button>
      <button
        className="icon-btn send-btn"
        onClick={onSend}
        disabled={!newMessage.trim() || isSending}
      >
        <MdSend />
      </button>
    </div>
  );
};

export default MessageInput;
