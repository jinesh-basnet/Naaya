import React, { useState, useEffect } from 'react';
import { IoArrowBack } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import './PrivacySettingsPage.css';

const PrivacySettingsPage: React.FC = () => {
    const [settings, setSettings] = useState({
        profileVisibility: 'public',
        showOnlineStatus: true,
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/privacy');
                setSettings(response.data.privacySettings || {
                    profileVisibility: 'public',
                    showOnlineStatus: true,
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (newSettings: any) => {
        try {
            await api.put('/privacy', newSettings);
            toast.success('Settings updated');
        } catch (err) {
            toast.error('Failed to update');
        }
    };

    if (loading) return <div className="p-10 text-center">Loading settings...</div>;

    return (
        <div className="privacy-settings-page">
            <header className="privacy-settings-header">
                <button onClick={() => navigate(-1)} className="back-btn"><IoArrowBack /></button>
                <h1>Privacy</h1>
            </header>

            <div className="privacy-settings-content">
                <section className="settings-section">
                    <h3>Who can see your profile?</h3>
                    <select
                        className="privacy-select"
                        value={settings.profileVisibility}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setSettings(prev => ({ ...prev, profileVisibility: val }));
                          handleSave({ ...settings, profileVisibility: val });
                        }}
                    >
                        <option value="public">Everyone (Public)</option>
                        <option value="followers">Only Followers</option>
                        <option value="private">Only Me (Private)</option>
                    </select>
                </section>

                <section className="settings-section">
                    <div className="flex-row">
                      <h3>Show online status</h3>
                      <input
                          type="checkbox"
                          checked={settings.showOnlineStatus}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setSettings(prev => ({ ...prev, showOnlineStatus: val }));
                            handleSave({ ...settings, showOnlineStatus: val });
                          }}
                      />
                    </div>
                    <p className="description">When on, people can see when you are active on Naaya.</p>
                </section>
            </div>
        </div>
    );
};

export default PrivacySettingsPage;
