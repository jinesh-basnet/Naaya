import React, { useState, useEffect } from 'react';
import { FaXmark, FaImages, FaEarthAmericas, FaUsers, FaLock } from 'react-icons/fa6';
import { motion } from 'framer-motion';
import { storiesAPI, usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import Avatar from './Avatar';
import './CreateStoryModal.css';

interface CreateStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    getMediaUrl: (url?: string) => string;
}

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ isOpen, onClose, getMediaUrl }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [content, setContent] = useState('');
    const [media, setMedia] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [visibility, setVisibility] = useState('public');
    const [closeFriends, setCloseFriends] = useState<string[]>([]);
    const [userFollowers, setUserFollowers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user?.username) {
            const fetchFollowers = async () => {
                try {
                    const response = await usersAPI.getFollowing(user.username);
                    setUserFollowers(response.data.following || []);
                } catch (error) {
                    console.error('Failed to fetch following:', error);
                }
            };
            fetchFollowers();
        }
    }, [isOpen, user?.username]);

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMedia(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setStep(2);
        }
    };

    const handleShare = async () => {
        if (!content && !media) {
            toast.error('Add some content or media to your story!');
            return;
        }

        setLoading(true);
        try {
            let mediaData = undefined;

            if (media) {
                const mediaFormData = new FormData();
                mediaFormData.append('media', media);
                const uploadRes = await storiesAPI.uploadStoryMedia(mediaFormData);
                mediaData = uploadRes.data.media;
            }

            const storyData: any = {
                content,
                visibility,
            };

            if (mediaData) {
                storyData.media = mediaData;
            }

            if (visibility === 'close_friends' && closeFriends.length > 0) {
                storyData.closeFriends = closeFriends;
            }

            await storiesAPI.createStory(storyData);

            toast.success('Story shared!');
            queryClient.invalidateQueries({ queryKey: ['stories'] });
            onClose();
        } catch (error: any) {
            console.error('Error sharing story:', error);
            const errorMessage = error.response?.data?.message || 'Failed to share story';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const toggleCloseFriend = (userId: string) => {
        setCloseFriends(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    if (!isOpen) return null;

    return (
        <motion.div
            className="create-story-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="create-story-container"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="create-story-header">
                    <button className="back-btn" onClick={step === 2 ? () => setStep(1) : onClose}>
                        {step === 2 ? 'Back' : <FaXmark size={20} />}
                    </button>
                    <h2>Create Story</h2>
                    {step === 2 ? (
                        <button className="share-btn-top" onClick={handleShare} disabled={loading}>
                            {loading ? 'Sharing...' : 'Share'}
                        </button>
                    ) : (
                        <div style={{ width: '60px' }}></div>
                    )}
                </header>

                <main className="create-story-main">
                    {step === 1 && (
                        <div className="media-selector">
                            <div className="selector-content">
                                <div className="icon-circle">
                                    <FaImages size={48} />
                                </div>
                                <h3>Select Media</h3>
                                <p>Photos and videos will be added to your story for 24 hours.</p>
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleMediaChange}
                                    id="story-media-input"
                                    hidden
                                />
                                <label htmlFor="story-media-input" className="select-file-btn">
                                    Select from computer
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 2 && previewUrl && (
                        <div className="story-editor">
                            <div className="preview-area">
                                {media?.type?.startsWith('video') ? (
                                    <video src={previewUrl} controls autoPlay loop className="preview-media" />
                                ) : (
                                    <img src={previewUrl} alt="Preview" className="preview-media" />
                                )}
                                <textarea
                                    className="story-caption-overlay"
                                    placeholder="Add a caption..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    maxLength={150}
                                />
                            </div>

                            <aside className="story-settings">
                                <div className="settings-section">
                                    <h3>Who can see this?</h3>
                                    <div className="visibility-options">
                                        <button
                                            className={`visibility-opt ${visibility === 'public' ? 'active' : ''}`}
                                            onClick={() => setVisibility('public')}
                                        >
                                            <FaEarthAmericas size={18} />
                                            <span>Public</span>
                                        </button>
                                        <button
                                            className={`visibility-opt ${visibility === 'close_friends' ? 'active' : ''}`}
                                            onClick={() => setVisibility('close_friends')}
                                        >
                                            <FaUsers size={18} />
                                            <span>Close Friends</span>
                                        </button>
                                        <button
                                            className={`visibility-opt ${visibility === 'private' ? 'active' : ''}`}
                                            onClick={() => setVisibility('private')}
                                        >
                                            <FaLock size={18} />
                                            <span>Private</span>
                                        </button>
                                    </div>
                                </div>

                                {visibility === 'close_friends' && (
                                    <div className="settings-section friends-list-section">
                                        <h3>Select Friends</h3>
                                        <div className="friends-search-list">
                                            {userFollowers.length > 0 ? userFollowers.map(f => (
                                                <div key={f._id} className="friend-select-item" onClick={() => toggleCloseFriend(f._id)}>
                                                    <Avatar
                                                        src={f.profilePicture}
                                                        alt={f.username}
                                                        name={f.fullName}
                                                        size={44}
                                                    />
                                                    <div className="friend-info">
                                                        <span className="name">{f.fullName}</span>
                                                        <span className="username">@{f.username}</span>
                                                    </div>
                                                    <div className={`checkbox ${closeFriends.includes(f._id) ? 'checked' : ''}`} />
                                                </div>
                                            )) : (
                                                <p className="empty-msg" style={{ color: 'var(--text-secondary)' }}>You aren't following anyone yet.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </aside>
                        </div>
                    )}
                </main>
            </motion.div>
        </motion.div>
    );
};

export default CreateStoryModal;
