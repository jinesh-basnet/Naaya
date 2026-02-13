import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoArrowBack, IoPersonRemove, IoCheckmarkCircle } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import axios from 'axios';
import './BlockedUsersPage.css';

interface BlockedUser {
    id: string;
    user: {
        _id: string;
        username: string;
        fullName: string;
        profilePicture: string;
        bio: string;
        isVerified: boolean;
    };
    reason: string;
    blockedAt: string;
}

const BlockedUsersPage: React.FC = () => {
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [unblocking, setUnblocking] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const fetchBlockedUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/blocks');
            setBlockedUsers(response.data.blocks);
        } catch (error: any) {
            console.error('Error fetching blocked users:', error);
            toast.error('Failed to load blocked users');
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async (userId: string, username: string) => {
        try {
            setUnblocking(userId);
            await axios.delete(`/api/blocks/${userId}`);

            setBlockedUsers(prev => prev.filter(block => block.user._id !== userId));

            toast.success(`Unblocked @${username}`, {
                icon: '✅',
                duration: 2000,
            });
        } catch (error: any) {
            console.error('Error unblocking user:', error);
            toast.error('Failed to unblock user');
        } finally {
            setUnblocking(null);
        }
    };

    return (
        <div className="blocked-users-page">
            <div className="blocked-users-header">
                <button onClick={() => navigate(-1)} className="back-btn" aria-label="Go back">
                    <IoArrowBack />
                </button>
                <h1>Blocked Accounts</h1>
            </div>

            <div className="blocked-users-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading blocked accounts...</p>
                    </div>
                ) : blockedUsers.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="empty-state"
                    >
                        <IoCheckmarkCircle className="empty-icon" />
                        <h2>No Blocked Accounts</h2>
                        <p>You haven't blocked anyone yet</p>
                    </motion.div>
                ) : (
                    <div className="blocked-users-list">
                        <AnimatePresence>
                            {blockedUsers.map((block, index) => (
                                <motion.div
                                    key={block.user._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="blocked-user-card"
                                >
                                    <div className="user-info">
                                        <div className="user-avatar">
                                            <Avatar
                                                src={block.user.profilePicture}
                                                alt={block.user.username}
                                                name={block.user.fullName}
                                                size={50}
                                            />
                                        </div>
                                        <div className="user-details">
                                            <div className="user-name">
                                                <span className="full-name">{block.user.fullName}</span>
                                                {block.user.isVerified && (
                                                    <IoCheckmarkCircle className="verified-badge" />
                                                )}
                                            </div>
                                            <span className="username">@{block.user.username}</span>
                                            {block.user.bio && <p className="bio">{block.user.bio}</p>}
                                            {block.reason && (
                                                <p className="block-reason">
                                                    <strong>Reason:</strong> {block.reason}
                                                </p>
                                            )}
                                            <span className="blocked-date">
                                                Blocked {new Date(block.blockedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnblock(block.user._id, block.user.username)}
                                        disabled={unblocking === block.user._id}
                                        className="unblock-btn"
                                        aria-label={`Unblock ${block.user.username}`}
                                    >
                                        {unblocking === block.user._id ? (
                                            <div className="btn-spinner"></div>
                                        ) : (
                                            <>
                                                <IoPersonRemove /> Unblock
                                            </>
                                        )}
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlockedUsersPage;
