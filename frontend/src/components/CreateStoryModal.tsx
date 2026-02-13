import React, { useState, useEffect } from 'react';
import { FaXmark, FaImages, FaEarthAmericas, FaUsers, FaLock, FaPaperPlane } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';
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
            let mediaObject = null;
            if (media) {
                const formData = new FormData();
                formData.append('media', media);
                const uploadResponse = await storiesAPI.uploadStoryMedia(formData);
                mediaObject = uploadResponse.data.media;
            }

            const storyData: any = {
                content,
                visibility,
            };
            if (mediaObject) {
                storyData.media = mediaObject;
            }
            if (visibility === 'close_friends') {
                storyData.closeFriends = closeFriends;
            }

            await storiesAPI.createStory(storyData);
            toast.success('Story shared successfully!');
            queryClient.invalidateQueries({ queryKey: ['storiesFeed'] });
            handleClose();
        } catch (error: any) {
            console.error('Error sharing story:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to share story';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setContent('');
        setMedia(null);
        setPreviewUrl(null);
        setVisibility('public');
        setCloseFriends([]);
        onClose();
    };

    const toggleCloseFriend = (userId: string) => {
        setCloseFriends(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    return (
        <motion.div
            className="create-story-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
        >
            <div className="create-story-container" onClick={e => e.stopPropagation()}>
                <header className="create-story-header">
                    <button className="back-btn" onClick={step === 1 ? handleClose : () => setStep(1)}>
                        <FaXmark size={24} />
                    </button>
                    <h2>{step === 1 ? 'New Story' : 'Preview & Edit'}</h2>
                    {step === 2 && (
                        <button
                            className="share-btn-top"
                            onClick={handleShare}
                            disabled={loading}
                        >
                            {loading ? 'Posting...' : 'Share'}
                            <FaPaperPlane size={18} />
                        </button>
                    )}
                </header>

                <main className="create-story-main">
                    {step === 1 ? (
                        <div className="media-selector">
                            <div className="selector-content">
                                <div className="icon-circle">
                                    <FaImages size={48} />
                                </div>
                                <h3>Select photos and videos</h3>
                                <p>Share a moment with your followers</p>
                                <label htmlFor="story-media" className="select-file-btn">
                                    Select from device
                                </label>
                                <input
                                    type="file"
                                    id="story-media"
                                    hidden
                                    accept="image/*,video/*"
                                    onChange={handleMediaChange}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="story-editor">
                            <div className="preview-area">
                                {media?.type.startsWith('video') ? (
                                    <video src={previewUrl!} className="preview-media" autoPlay muted loop />
                                ) : (
                                    <img src={previewUrl!} alt="Preview" className="preview-media" />
                                )}
                                <textarea
                                    className="story-caption-overlay"
                                    placeholder="Type a caption..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
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
                                            <FaEarthAmericas />
                                            <span>Everyone</span>
                                        </button>
                                        <button
                                            className={`visibility-opt ${visibility === 'followers' ? 'active' : ''}`}
                                            onClick={() => setVisibility('followers')}
                                        >
                                            <FaUsers />
                                            <span>Followers</span>
                                        </button>
                                        <button
                                            className={`visibility-opt ${visibility === 'close_friends' ? 'active' : ''}`}
                                            onClick={() => setVisibility('close_friends')}
                                        >
                                            <FaUsers />
                                            <span>Close Friends</span>
                                        </button>
                                        <button
                                            className={`visibility-opt ${visibility === 'private' ? 'active' : ''}`}
                                            onClick={() => setVisibility('private')}
                                        >
                                            <FaLock />
                                            <span>Private</span>
                                        </button>
                                    </div>
                                </div>

                                {visibility === 'close_friends' && (
                                    <div className="friends-list-section">
                                        <h3>Select Friends</h3>
                                        <div className="friends-search-list">
                                            {userFollowers.length > 0 ? userFollowers.map(f => (
                                                <div key={f._id} className="friend-select-item" onClick={() => toggleCloseFriend(f._id)}>
                                                    <Avatar
                                                        src={f.profilePicture}
                                                        alt={f.username}
                                                        name={f.fullName}
                                                        size={32}
                                                    />
                                                    <div className="friend-info">
                                                        <span className="name">{f.fullName}</span>
                                                        <span className="username">@{f.username}</span>
                                                    </div>
                                                    <div className={`checkbox ${closeFriends.includes(f._id) ? 'checked' : ''}`} />
                                                </div>
                                            )) : (
                                                <p className="empty-msg">You aren't following anyone yet.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </aside>
                        </div>
                    )}
                </main>
            </div>
        </motion.div>
    );
};

export default CreateStoryModal;
