import React, { useState, useEffect, useCallback } from 'react';
import { MdClose, MdSend, MdSearch, MdImage } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
  isVerified: boolean;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'post' | 'reel';
  contentId: string;
  contentData: {
    content?: string;
    media?: Array<{
      type: string;
      url: string;
    }>;
    author?: {
      _id?: string;
      username: string;
      fullName: string;
    };
  };
  onShare: (userId: string, message: string) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentData,
}) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'options' | 'send'>('options');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const searchUsers = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await usersAPI.searchUsers(searchQuery);
      setUsers(response.data.users.filter((u: User) => u._id !== user?._id));
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, user]);

  const loadSuggestedUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      setUsers([]);
    } catch (error) {
      console.error('Error loading suggested users:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && searchQuery.trim()) {
      searchUsers();
    } else if (isOpen && !searchQuery.trim()) {
      loadSuggestedUsers();
    }
  }, [isOpen, searchQuery, searchUsers, loadSuggestedUsers]);

  const handleUserSelect = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleShareToStory = async () => {
    setIsSharing(true);
    try {
      const storyData = {
        content: contentData.content || '',
        media: contentData.media || [],
        sharedContent: {
          contentId: contentId,
          contentType: contentType === 'post' ? 'Post' : 'Reel',
          author: contentData.author ? {
            _id: contentData.author._id,
            username: contentData.author.username,
            fullName: contentData.author.fullName
          } : undefined
        }
      };

      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(storyData)
      });

      if (!response.ok) {
        throw new Error('Failed to share to story');
      }

      toast.success('Shared to your story!');
      onClose();
    } catch (error) {
      console.error('Error sharing to story:', error);
      toast.error('Failed to share to story');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSendTo = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user to share with');
      return;
    }

    setIsSharing(true);
    try {
      const sharePromises = Array.from(selectedUsers).map(async (userId) => {
        const messageData = {
          receiver: userId,
          content: shareMessage.trim() || `Shared a ${contentType}`,
          messageType: contentType === 'post' ? 'shared_post' : 'shared_reel',
          sharedContent: {
            contentId: contentId,
            contentType: contentType === 'post' ? 'Post' : 'Reel',
            content: contentData.content || '',
            media: contentData.media || [],
            author: contentData.author ? {
              _id: contentData.author._id,
              username: contentData.author.username,
              fullName: contentData.author.fullName
            } : undefined
          }
        };

        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(messageData)
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        return response.json();
      });

      await Promise.all(sharePromises);
      toast.success(`Shared ${contentType} with ${selectedUsers.size} user${selectedUsers.size > 1 ? 's' : ''}`);
      onClose();
      setSelectedUsers(new Set());
      setShareMessage('');
      setCurrentView('options');
    } catch (error) {
      console.error('Error sharing content:', error);
      toast.error('Failed to share content');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/${contentType}/${contentId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied to clipboard!');
      onClose();
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  const getContentPreview = () => {
    if (contentType === 'post') {
      return contentData.content || 'Shared a post';
    } else {
      return contentData.content || 'Shared a reel';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>Share {contentType === 'post' ? 'Post' : 'Reel'}</h3>
          <button className="close-button" onClick={onClose}>
            <MdClose />
          </button>
        </div>

        {currentView === 'options' && (
          <>
            <div className="share-content-preview">
              <div className="content-preview">
                <p className="preview-text">{getContentPreview()}</p>
                {contentData.author && (
                  <p className="preview-author">
                    by {contentData.author.fullName} (@{contentData.author.username})
                  </p>
                )}
              </div>
            </div>

            <div className="share-options">
              <button className="share-option" onClick={handleShareToStory} disabled={isSharing}>
                <MdImage className="option-icon" />
                <span>Share to Story</span>
              </button>
              <button className="share-option" onClick={() => setCurrentView('send')}>
                <MdSend className="option-icon" />
                <span>Send to</span>
              </button>
              <button className="share-option" onClick={handleCopyLink}>
                <MdSend className="option-icon" />
                <span>Copy Link</span>
              </button>
            </div>
          </>
        )}

        {currentView === 'send' && (
          <>
            <div className="share-message-input">
              <textarea
                placeholder="Add a message (optional)..."
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                maxLength={500}
              />
              <span className="char-count">{shareMessage.length}/500</span>
            </div>

            <div className="search-section">
              <div className="search-input-wrapper">
                <MdSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="users-list">
              {isLoading ? (
                <div className="loading-text">Searching...</div>
              ) : users.length === 0 ? (
                <div className="no-users">
                  {searchQuery.trim() ? 'No users found' : 'Start typing to search users'}
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user._id}
                    className={`user-item ${selectedUsers.has(user._id) ? 'selected' : ''}`}
                    onClick={() => handleUserSelect(user._id)}
                  >
                    <div className="user-avatar">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.fullName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.fullName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <div className="user-name">
                        {user.fullName}
                        {user.isVerified && <span className="verified-badge">✓</span>}
                      </div>
                      <div className="user-username">@{user.username}</div>
                    </div>
                    <div className="selection-indicator">
                      {selectedUsers.has(user._id) && <MdSend />}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="share-modal-footer">
              <button
                className="cancel-button"
                onClick={() => setCurrentView('options')}
                disabled={isSharing}
              >
                Back
              </button>
              <button
                className="share-button"
                onClick={handleSendTo}
                disabled={selectedUsers.size === 0 || isSharing}
              >
                {isSharing ? 'Sharing...' : `Send to ${selectedUsers.size} user${selectedUsers.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
