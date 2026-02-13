import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IoArrowBack, IoSave, IoCheckmarkCircle } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, usersAPI } from '../services/api';
import './PrivacySettingsPage.css';

interface PrivacySettings {
    profileVisibility: 'public' | 'followers' | 'private';
    showOnlineStatus: boolean;
    allowMessagesFrom: 'everyone' | 'followers' | 'none';
    allowCommentsFrom: 'everyone' | 'followers' | 'none';
    allowTagging: boolean;
    allowMentions: boolean;
}

const PrivacySettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<PrivacySettings>({
        profileVisibility: 'public',
        showOnlineStatus: true,
        allowMessagesFrom: 'everyone',
        allowCommentsFrom: 'everyone',
        allowTagging: true,
        allowMentions: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPrivacySettings();
    }, []);

    const fetchPrivacySettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/privacy');
            setSettings(response.data.privacySettings);
        } catch (error: any) {
            console.error('Error fetching privacy settings:', error);
            toast.error('Failed to load privacy settings');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: keyof PrivacySettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put('/privacy', settings);

            toast.success('Privacy settings updated successfully', {
                icon: '✅',
                duration: 2000,
            });
            setHasChanges(false);
        } catch (error: any) {
            console.error('Error saving privacy settings:', error);
            toast.error('Failed to update privacy settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="privacy-settings-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading privacy settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="privacy-settings-page">
            <div className="privacy-settings-header">
                <button onClick={() => navigate(-1)} className="back-btn" aria-label="Go back">
                    <IoArrowBack />
                </button>
                <h1>Privacy Settings</h1>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="save-btn"
                        aria-label="Save changes"
                    >
                        {saving ? (
                            <div className="btn-spinner"></div>
                        ) : (
                            <>
                                <IoSave /> Save
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="privacy-settings-content">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="settings-section"
                >
                    <h2>Profile Visibility</h2>
                    <p className="section-description">Control who can see your profile and posts</p>

                    <div className="setting-options">
                        {['public', 'followers', 'private'].map((option) => (
                            <label key={option} className="radio-option">
                                <input
                                    type="radio"
                                    name="profileVisibility"
                                    value={option}
                                    checked={settings.profileVisibility === option}
                                    onChange={(e) => handleChange('profileVisibility', e.target.value)}
                                />
                                <div className="radio-content">
                                    <span className="radio-label">{option.charAt(0).toUpperCase() + option.slice(1)}</span>
                                    <span className="radio-description">
                                        {option === 'public' && 'Anyone can see your profile'}
                                        {option === 'followers' && 'Only your followers can see your profile'}
                                        {option === 'private' && 'Only you can see your profile'}
                                    </span>
                                </div>
                                {settings.profileVisibility === option && (
                                    <IoCheckmarkCircle className="check-icon" />
                                )}
                            </label>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="settings-section"
                >
                    <h2>Online Status</h2>
                    <p className="section-description">Let others see when you're online</p>

                    <label className="toggle-option">
                        <div className="toggle-content">
                            <span className="toggle-label">Show Online Status</span>
                            <span className="toggle-description">Others can see when you're active</span>
                        </div>
                        <div className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.showOnlineStatus}
                                onChange={(e) => handleChange('showOnlineStatus', e.target.checked)}
                            />
                            <span className="slider"></span>
                        </div>
                    </label>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="settings-section"
                >
                    <h2>Messages</h2>
                    <p className="section-description">Control who can send you messages</p>

                    <div className="setting-options">
                        {['everyone', 'followers', 'none'].map((option) => (
                            <label key={option} className="radio-option">
                                <input
                                    type="radio"
                                    name="allowMessagesFrom"
                                    value={option}
                                    checked={settings.allowMessagesFrom === option}
                                    onChange={(e) => handleChange('allowMessagesFrom', e.target.value)}
                                />
                                <div className="radio-content">
                                    <span className="radio-label">{option.charAt(0).toUpperCase() + option.slice(1)}</span>
                                    <span className="radio-description">
                                        {option === 'everyone' && 'Anyone can message you'}
                                        {option === 'followers' && 'Only followers can message you'}
                                        {option === 'none' && 'No one can message you'}
                                    </span>
                                </div>
                                {settings.allowMessagesFrom === option && (
                                    <IoCheckmarkCircle className="check-icon" />
                                )}
                            </label>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="settings-section"
                >
                    <h2>Comments</h2>
                    <p className="section-description">Control who can comment on your posts</p>

                    <div className="setting-options">
                        {['everyone', 'followers', 'none'].map((option) => (
                            <label key={option} className="radio-option">
                                <input
                                    type="radio"
                                    name="allowCommentsFrom"
                                    value={option}
                                    checked={settings.allowCommentsFrom === option}
                                    onChange={(e) => handleChange('allowCommentsFrom', e.target.value)}
                                />
                                <div className="radio-content">
                                    <span className="radio-label">{option.charAt(0).toUpperCase() + option.slice(1)}</span>
                                    <span className="radio-description">
                                        {option === 'everyone' && 'Anyone can comment on your posts'}
                                        {option === 'followers' && 'Only followers can comment'}
                                        {option === 'none' && 'No one can comment'}
                                    </span>
                                </div>
                                {settings.allowCommentsFrom === option && (
                                    <IoCheckmarkCircle className="check-icon" />
                                )}
                            </label>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="settings-section"
                >
                    <h2>Tagging & Mentions</h2>
                    <p className="section-description">Control how others can tag and mention you</p>

                    <div className="toggle-group">
                        <label className="toggle-option">
                            <div className="toggle-content">
                                <span className="toggle-label">Allow Tagging</span>
                                <span className="toggle-description">Others can tag you in posts</span>
                            </div>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.allowTagging}
                                    onChange={(e) => handleChange('allowTagging', e.target.checked)}
                                />
                                <span className="slider"></span>
                            </div>
                        </label>

                        <label className="toggle-option">
                            <div className="toggle-content">
                                <span className="toggle-label">Allow Mentions</span>
                                <span className="toggle-description">Others can mention you in comments</span>
                            </div>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.allowMentions}
                                    onChange={(e) => handleChange('allowMentions', e.target.checked)}
                                />
                                <span className="slider"></span>
                            </div>
                        </label>
                    </div>
                </motion.div>

                {hasChanges && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="save-prompt"
                    >
                        <p>You have unsaved changes</p>
                        <button onClick={handleSave} disabled={saving} className="save-prompt-btn">
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default PrivacySettingsPage;
