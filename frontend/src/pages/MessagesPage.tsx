import React, { useState } from 'react';
import './MessagesPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useConversations } from '../hooks/useConversations';
import { useMessages } from '../hooks/useMessages';
import { useMessageActions } from '../hooks/useMessageActions';
import { useSocketEvents } from '../hooks/useSocketEvents';
import ConversationList from '../components/ConversationList';
import ChatArea from '../components/ChatArea';
import MessageInput from '../components/MessageInput';

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

const MessagesPage: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { user: currentUser } = useAuth();

  const { conversations, isLoading: conversationsLoading, searchQuery, setSearchQuery } = useConversations();
  const { messages, isLoading: messagesLoading, messagesEndRef, addMessage, updateMessage, deleteMessage } = useMessages(selectedConversation);
  const {
    newMessage,
    setNewMessage,
    replyTo,
    setReplyTo,
    handleSendMessage,
    handleEditRequest,
    handleDeleteRequest,
    handleReactRequest,
    isSending,
  } = useMessageActions(selectedConversation);

  const { isTyping, emitTypingStart, emitTypingStop } = useSocketEvents(
    selectedConversation,
    addMessage,
    updateMessage,
    deleteMessage
  );

  const handleTyping = () => {
    emitTypingStart();
    setTimeout(() => {
      emitTypingStop();
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
  };

  return (
    <div className="messages-container">
      <ConversationList
        conversations={conversations}
        isLoading={conversationsLoading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
      />

      <ChatArea
        selectedConversation={selectedConversation}
        messages={messages}
        isLoading={messagesLoading}
        isTyping={isTyping}
        currentUserId={currentUser?._id}
        messagesEndRef={messagesEndRef}
        onEdit={handleEditRequest}
        onDelete={handleDeleteRequest}
        onReact={handleReactRequest}
        onReply={handleReply}
      />

      {selectedConversation && (
        <MessageInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          onSend={handleSendMessage}
          onTyping={handleTyping}
          onKeyPress={handleKeyPress}
          isSending={isSending}
        />
      )}
    </div>
  );
};

export default MessagesPage;
