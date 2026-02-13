import React, { useState, useRef, useEffect } from 'react';
import { FaEdit, FaShare } from 'react-icons/fa';
import { BsTrash, BsReply } from 'react-icons/bs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI } from '../services/api';
import toast from 'react-hot-toast';
import './MessageActions.css';

interface MessageActionsProps {
  messageId: string;
  content: string;
  isOwnMessage: boolean;
  onReply?: (messageId: string, content: string, senderName: string) => void;
  senderName: string;
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  content,
  isOwnMessage,
  onReply,
  senderName
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardUserId, setForwardUserId] = useState('');
  const [showReactions, setShowReactions] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const editMutation = useMutation({
    mutationFn: (newContent: string) => messagesAPI.editMessage(messageId, newContent),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to edit message');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => messagesAPI.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    },
  });

  const reactionMutation = useMutation({
    mutationFn: (emoji: string) => messagesAPI.addReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setShowReactions(false);
    },
  });

  const handleEdit = () => {
    if (editContent.trim() && editContent !== content) {
      editMutation.mutate(editContent.trim());
    } else {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="message-edit-overlay">
        <div className="message-edit-card">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="edit-textarea"
            autoFocus
          />
          <div className="edit-footer">
            <button className="edit-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
            <button className="edit-save" onClick={handleEdit}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-options-container" ref={menuRef}>
      <button
        className="options-trigger"
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </button>

      {showMenu && (
        <div className={`options-menu ${isOwnMessage ? 'own' : 'other'}`}>
          <div className="reactions-row">
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                className="reaction-btn"
                onClick={() => reactionMutation.mutate(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="menu-divider"></div>

          <button className="menu-item" onClick={() => {
            onReply?.(messageId, content, senderName);
            setShowMenu(false);
          }}>
            <BsReply /> Reply
          </button>

          {isOwnMessage && (
            <button className="menu-item" onClick={() => {
              setIsEditing(true);
              setShowMenu(false);
            }}>
              <FaEdit /> Edit
            </button>
          )}

          <button className="menu-item" onClick={() => {
            setShowForwardModal(true);
            setShowMenu(false);
          }}>
            <FaShare /> Forward
          </button>

          {isOwnMessage && (
            <button className="menu-item delete" onClick={() => {
              if (window.confirm('Delete message?')) deleteMutation.mutate();
              setShowMenu(false);
            }}>
              <BsTrash /> Delete
            </button>
          )}
        </div>
      )}

      {showForwardModal && (
        <div className="forward-modal-overlay">
          <div className="forward-modal">
            <h3>Forward Message</h3>
            <p>Type user ID to forward to:</p>
            <input
              type="text"
              value={forwardUserId}
              onChange={(e) => setForwardUserId(e.target.value)}
              placeholder="User ID..."
            />
            <div className="forward-actions">
              <button onClick={() => setShowForwardModal(false)}>Cancel</button>
              <button
                className="send"
                onClick={() => {
                  messagesAPI.forwardMessage(messageId, forwardUserId);
                  setShowForwardModal(false);
                  toast.success('Forwarded!');
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageActions;
