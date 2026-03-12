import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoPersonRemove, IoClose, IoWarning, IoCheckmarkCircle } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { blocksAPI } from '../services/api';

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
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleBlock = async () => {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    try {
      setIsSubmitting(true);
      
      await blocksAPI.blockUser(user._id, {
        reason: reason.trim(),
        category: selectedCategory,
        blockedFromContext: 'profile',
      });

      toast.success(`Blocked @${user.username}`, {
        icon: <IoCheckmarkCircle />,
        duration: 3000,
      });

      onBlockSuccess?.();
      handleClose();
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

  const handleClose = () => {
    setShowConfirmation(false);
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
        <>
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="block-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            <div className="block-modal-header">
              <div className="block-modal-icon">
                <IoPersonRemove size={28} />
              </div>
              <h2>Block @{user.username}?</h2>
              <button className="close-btn" onClick={handleClose} aria-label="Close">
                <IoClose size={24} />
              </button>
            </div>

            {!showConfirmation ? (
              <>
                <div className="block-modal-body">
                  <p className="block-description">
                    This user will not be able to see your profile, posts, or send you messages. 
                    They won't be notified that you've blocked them.
                  </p>

                  <div className="block-categories">
                    <h4>Why are you blocking this user?</h4>
                    <div className="category-list">
                      {BLOCK_CATEGORIES.map((category) => (
                        <div
                          key={category.value}
                          className={`category-option ${selectedCategory === category.value ? 'selected' : ''}`}
                          onClick={() => handleCategorySelect(category.value)}
                        >
                          <div className="category-radio">
                            {selectedCategory === category.value && (
                              <IoCheckmarkCircle size={18} />
                            )}
                          </div>
                          <div className="category-content">
                            <span className="category-label">{category.label}</span>
                            <span className="category-description">{category.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="block-reason-input">
                    <label htmlFor="block-reason">Additional details (optional)</label>
                    <textarea
                      id="block-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Provide more details about why you're blocking this user..."
                      maxLength={500}
                      rows={3}
                    />
                    <span className="char-count">{reason.length}/500</span>
                  </div>
                </div>

                <div className="block-modal-footer">
                  <button
                    className="cancel-btn"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    className="block-btn"
                    onClick={handleBlock}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="btn-spinner" />
                    ) : (
                      <>
                        <IoPersonRemove />
                        Block User
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="block-confirmation-body">
                  <div className="warning-icon">
                    <IoWarning size={48} />
                  </div>
                  <h3>Are you sure?</h3>
                  <p>
                    You're about to block <strong>@{user.username}</strong>. 
                    {selectedCategory !== 'none' && (
                      <span> Reason: <strong>{BLOCK_CATEGORIES.find(c => c.value === selectedCategory)?.label}</strong></span>
                    )}
                  </p>
                  <ul className="block-effects">
                    <li>They won't be able to view your profile</li>
                    <li>They won't be able to send you messages</li>
                    <li>You'll be unfollowed from this account</li>
                    <li>You can unblock them anytime from Settings</li>
                  </ul>
                </div>

                <div className="block-modal-footer">
                  <button
                    className="cancel-btn"
                    onClick={() => setShowConfirmation(false)}
                    disabled={isSubmitting}
                  >
                    Go Back
                  </button>
                  <button
                    className="confirm-block-btn"
                    onClick={handleBlock}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="btn-spinner" />
                    ) : (
                      <>
                        <IoPersonRemove />
                        Yes, Block User
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BlockUserModal;

