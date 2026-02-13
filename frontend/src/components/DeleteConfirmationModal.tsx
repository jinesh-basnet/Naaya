import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2 } from 'react-icons/fi';
import { HiXMark } from 'react-icons/hi2';
import './DeleteConfirmationModal.css';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isPending?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isPending
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="delete-modal-overlay">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="delete-modal-backdrop"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="delete-modal-card"
                    >
                        <div className="delete-modal-header">
                            <div className="warning-icon-wrapper">
                                <FiTrash2 className="warning-icon" />
                            </div>
                            <h3>{title}</h3>
                            <button className="close-btn-minimal" onClick={onClose}>
                                {/* Close icon would go here if needed, but the UI is cleaner without it if it's a focus modal */}
                            </button>
                        </div>

                        <div className="delete-modal-body">
                            <p>{message}</p>
                        </div>

                        <div className="delete-modal-footer">
                            <button
                                className="cancel-btn-v2"
                                onClick={onClose}
                                disabled={isPending}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-delete-btn-v2"
                                onClick={onConfirm}
                                disabled={isPending}
                            >
                                {isPending ? <div className="spinner-small" /> : 'Delete'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DeleteConfirmationModal;
