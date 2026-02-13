import React, { useState, useEffect } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { messagesAPI } from '../services/api';
import './MessageSearch.css';

interface MessageSearchProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onMessageSelect?: (messageId: string) => void;
}

interface SearchResult {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    fullName: string;
  };
  createdAt: string;
}

const MessageSearch: React.FC<MessageSearchProps> = ({
  conversationId,
  isOpen,
  onClose,
  onMessageSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['messageSearch', conversationId, debouncedQuery],
    queryFn: () => {
      // This would need to be implemented in the backend
      // For now, we'll filter messages locally
      return messagesAPI.getConversationMessages(conversationId);
    },
    enabled: !!debouncedQuery.trim() && isOpen,
  });

  const filteredResults = React.useMemo(() => {
    if (!searchResults?.data?.messages || !debouncedQuery.trim()) {
      return [];
    }

    const query = debouncedQuery.toLowerCase();
    return (searchResults.data.messages as SearchResult[]).filter(message =>
      message.content.toLowerCase().includes(query)
    );
  }, [searchResults, debouncedQuery]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="search-highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleMessageClick = (messageId: string) => {
    onMessageSelect?.(messageId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="message-search-overlay" onClick={onClose}>
      <div className="message-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>
          <button
            className="close-search"
            onClick={onClose}
            title="Close search"
          >
            <FaTimes />
          </button>
        </div>

        <div className="search-results">
          {isLoading ? (
            <div className="search-loading">
              <div className="loading-spinner"></div>
              <p>Searching messages...</p>
            </div>
          ) : debouncedQuery.trim() ? (
            filteredResults.length > 0 ? (
              <>
                <div className="results-count">
                  {filteredResults.length} message{filteredResults.length !== 1 ? 's' : ''} found
                </div>
                {filteredResults.map((message) => (
                  <div
                    key={message._id}
                    className="search-result-item"
                    onClick={() => handleMessageClick(message._id)}
                  >
                    <div className="result-header">
                      <span className="result-sender">{message.sender.fullName}</span>
                      <span className="result-date">{formatDate(message.createdAt)}</span>
                    </div>
                    <div className="result-content">
                      {highlightText(message.content, debouncedQuery)}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="no-results">
                <FaSearch className="no-results-icon" />
                <p>No messages found for "{debouncedQuery}"</p>
              </div>
            )
          ) : (
            <div className="search-prompt">
              <FaSearch className="prompt-icon" />
              <p>Start typing to search messages in this conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageSearch;
