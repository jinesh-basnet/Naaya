import React, { useState, useRef, useEffect } from 'react';
import { FaEdit, FaShare } from 'react-icons/fa';
import { BsTrash, BsReply } from 'react-icons/bs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { deriveSharedSecret, encryptContent } from '../utils/encryptionUtils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import './MessageActions.css';

interface MessageActionsProps {
  messageId: string;
  clientId?: string;
  content: string;
  isOwnMessage: boolean;
  status?: 'sending' | 'sent' | 'failed';
  onReply?: (messageId: string, content: string, senderName: string) => void;
  onRetry?: () => void;
  senderName: string;
  partnerPublicKey?: string;
  conversationType?: 'direct' | 'group';
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  clientId,
  content,
  isOwnMessage,
  status,
  onReply,
  onRetry,
  senderName,
  partnerPublicKey,
  conversationType
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardUserId, setForwardUserId] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const editMutation = useMutation({
    mutationFn: async (newContent: string) => {
      let payloadContent = newContent;
      let iv: string | undefined;
      let isEncrypted = false;

      if (conversationType === 'direct' && partnerPublicKey) {
        const storedKeysStr = localStorage.getItem(`e2ee_keys_${user?._id}`);
        if (storedKeysStr) {
          try {
            const storedKeys = JSON.parse(storedKeysStr);
            if (storedKeys.privateKey) {
              const sharedSecret = await deriveSharedSecret(storedKeys.privateKey, partnerPublicKey);
              const encrypted = await encryptContent(newContent, sharedSecret);
              payloadContent = encrypted.ciphertext;
              iv = encrypted.iv;
              isEncrypted = true;
            }
          } catch (e) {
            console.error('Encryption failed for edit:', e);
          }
        }
      }
      return messagesAPI.editMessage(messageId, payloadContent, iv, isEncrypted);
    },
    onMutate: async (newContent) => {
      await queryClient.cancelQueries({ queryKey: ['messages'] });
      const previousMessages = queryClient.getQueryData(['messages']);
      queryClient.setQueryData(['messages'], (old: any) => {
        if (!old) return old;
        const messages = (old.data?.messages || old.messages || old.data || []);
        const updatedMessages = messages.map((m: any) =>
          m._id === messageId ? { ...m, content: newContent, isEdited: true } : m
        );
        return { ...old, messages: updatedMessages };
      });
      return { previousMessages };
    },
    onSuccess: () => {
      setIsEditing(false);
      toast.success('Message updated');
    },
    onError: (error: any, _, context: any) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages'], context.previousMessages);
      }
      toast.error(error.response?.data?.message || 'Failed to edit message');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => messagesAPI.deleteMessage(messageId),
    onMutate: async () => {
      setIsDeleting(true);
      await queryClient.cancelQueries({ queryKey: ['messages'] });
      const previousMessages = queryClient.getQueryData(['messages']);
      queryClient.setQueryData(['messages'], (old: any) => {
        if (!old) return old;
        const messages = (old.data?.messages || old.messages || old.data || []);
        const updatedMessages = messages.map((m: any) =>
          m._id === messageId ? { ...m, isDeleted: true, content: 'This message was unsent' } : m
        );
        return { ...old, messages: updatedMessages };
      });
      return { previousMessages };
    },
    onSuccess: () => {
      toast.success('Message unsent');
      setShowDeleteModal(false);
    },
    onError: (error: any, _, context: any) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages'], context.previousMessages);
      }
      toast.error(error.response?.data?.message || 'Failed to delete message');
    },
    onSettled: () => {
      setIsDeleting(false);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const reactionMutation = useMutation({
    mutationFn: (emoji: string) => messagesAPI.addReaction(messageId, emoji),
    onMutate: async (emoji) => {
      await queryClient.cancelQueries({ queryKey: ['messages'] });
      const previousMessages = queryClient.getQueryData(['messages']);
      queryClient.setQueryData(['messages'], (old: any) => {
        if (!old) return old;
        const messages = (old.data?.messages || old.messages || old.data || []);
        const updatedMessages = messages.map((m: any) => {
          if (m._id !== messageId) return m;
          const reactions = [...m.reactions];
          const existing = reactions.find((r: any) => r.user._id === user?._id);
          if (existing) {
            existing.emoji = emoji;
          } else {
            reactions.push({ user: { _id: user?._id }, emoji, reactedAt: new Date().toISOString() });
          }
          return { ...m, reactions };
        });
        return { ...old, messages: updatedMessages };
      });
      return { previousMessages };
    },
    onError: (error: any, _, context: any) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages'], context.previousMessages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setShowMenu(false);
    },
  });

  const handleEditSave = () => {
    if (editContent.trim()) {
      editMutation.mutate(editContent.trim());
    }
  };

  return (
    <div className="message-options-container" ref={menuRef}>
      <button
        className="options-trigger"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Message options"
      >
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
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
              setShowDeleteModal(true);
              setShowMenu(false);
            }}>
              <BsTrash /> Unsend
            </button>
          )}
        </div>
      )}

      {isEditing && (
        <div className="message-edit-overlay" onClick={() => setIsEditing(false)}>
          <div className="message-edit-card" onClick={e => e.stopPropagation()}>
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Edit message..."
              className="edit-textarea"
            />
            <div className="edit-footer">
              <button
                className="edit-cancel"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(content);
                }}
              >
                Cancel
              </button>
              <button
                className="edit-save"
                onClick={handleEditSave}
                disabled={!editContent.trim() || editContent.trim() === content || editMutation.isPending}
              >
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
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

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Unsend Message?"
        message="Are you sure you want to unsend this message? It will be removed for everyone in the chat."
        isPending={isDeleting}
      />
    </div>
  );
};

export default MessageActions;
