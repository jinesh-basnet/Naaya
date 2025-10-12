import React, { useState, useEffect } from 'react';
import './EditMessageModal.css';

interface EditMessageModalProps {
  isOpen: boolean;
  message: string;
  onSave: (newMessage: string) => void;
  onCancel: () => void;
}

const EditMessageModal: React.FC<EditMessageModalProps> = ({
  isOpen,
  message,
  onSave,
  onCancel
}) => {
  const [editedMessage, setEditedMessage] = useState(message);

  useEffect(() => {
    setEditedMessage(message);
  }, [message]);

  const handleSave = () => {
    if (editedMessage.trim() && editedMessage.trim() !== message) {
      onSave(editedMessage.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-modal-overlay" onClick={onCancel}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Message</h3>
        <textarea
          className="edit-message-input"
          value={editedMessage}
          onChange={(e) => setEditedMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Edit your message..."
          autoFocus
        />
        <div className="edit-modal-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={!editedMessage.trim() || editedMessage.trim() === message}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMessageModal;
