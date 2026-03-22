import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoCheckmarkCircle } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { blocksAPI } from '../services/api';
import './BlockUserModal.css';

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
  };
  onBlockSuccess?: () => void;
}

const BLOCK_CATEGORIES = [
  { value: 'spam', label: 'Spam', description: 'This user is sending spam or repetitive content' },
  { value: 'harassment', label: 'Harassment', description: 'This user is bullying or harassing me' },
  { value: 'inappropriate', label: 'Inappropriate', description: 'This user is posting inappropriate content' },
  { value: 'impersonation', label: 'Impersonation', description: 'This user is pretending to be someone else' },
  { value: 'other', label: 'Other', description: 'Other reason not listed above' },
];

const BlockUserModal: React.FC<BlockUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onBlockSuccess,
}) => {
  useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('spam');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBlock = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Block User button clicked', { userId: user._id, category: selectedCategory });

    try {
      setIsSubmitting(true);
      
      const response = await blocksAPI.blockUser(user._id, {
        reason: reason.trim(),
        category: selectedCategory,
        blockedFromContext: 'profile',
      });

      console.log('Block API response:', response);

      toast.success(`Blocked @${user.username}`, {
        icon: <IoCheckmarkCircle />,
        duration: 3000,
      });

      onBlockSuccess?.();
      handleClose(e);
    } catch (error: any) {
      console.error('Block user error:', error);
      
      if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'User is already blocked');
      } else if (error.response?.status === 404) {
        toast.error('User not found');
      } else {
        toast.error('Failed to block user');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('Close action triggered');
    setSelectedCategory('spam');
    setReason('');
    onClose();
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop-wrapper">
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => handleClose(e)}
          />
          <motion.div
            className="block-modal-container"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="block-modal-header">
              <h2>Block @{user.username}?</h2>
              <button 
                type="button"
                className="close-btn" 
                onClick={(e) => handleClose(e)} 
                aria-label="Close"
              >
                <IoClose size={24} />
              </button>
            </div>

            <div className="block-modal-body">
              <p className="block-description">
                This user will not be able to see your profile, posts, or send you messages. 
                They won't be notified that you've blocked them.
              </p>

              <div className="block-categories-section">
                <h4 className="section-title">Why are you blocking this user?</h4>
                <div className="category-list">
                  {BLOCK_CATEGORIES.map((category) => (
                    <div
                      key={category.value}
                      className={`category-option ${selectedCategory === category.value ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect(category.value)}
                    >
                      <div className="custom-radio">
                        <div className="radio-inner" />
                      </div>
                      <div className="category-content">
                        <span className="category-label">{category.label}</span>
                        <span className="category-description">{category.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="block-reason-input-group">
                <label htmlFor="block-reason">Additional details (optional)</label>
                <textarea
                  id="block-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide more details about why you're blocking this user..."
                  maxLength={500}
                  rows={3}
                />
                <div className="textarea-footer">
                  <span className="char-count">{reason.length}/500</span>
                </div>
              </div>
            </div>

            <div className="block-modal-footer">
              <button
                type="button"
                className="cancel-btn-outline"
                onClick={(e) => handleClose(e)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="block-btn-primary"
                onClick={(e) => handleBlock(e)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="loader-dots">
                    <span></span><span></span><span></span>
                  </div>
                ) : (
                  'Block User'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BlockUserModal;