import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import './NotificationPreferences.css';

const NotificationPreferences: React.FC = () => {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    soundEffects: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await api.get('/notifications/preferences');
        setPreferences(response.data.preferences);
      } catch (err) {
        setError(t('notifications.failedToLoadPreferences'));
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, [t]);

  const handleToggle = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences(prev => ({ ...prev, [key]: event.target.checked }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    try {
      await api.put('/notifications/preferences', { preferences });
      setSuccess(t('notifications.preferencesSaved'));
    } catch (err) {
      setError(t('notifications.failedToSavePreferences'));
    }
  };

  if (loading) {
    return <p className="loading-text">{t('notifications.loading')}</p>;
  }

  return (
    <div className="notification-preferences">
      <h2 className="preferences-title">{t('notifications.preferences')}</h2>
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
      <div className="form-group">
        <label className="form-control-label">
          {t('notifications.emailNotifications')}
          <label className="switch">
            <input
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={handleToggle('emailNotifications')}
            />
            <span className="slider"></span>
          </label>
        </label>
        <label className="form-control-label">
          {t('notifications.pushNotifications')}
          <label className="switch">
            <input
              type="checkbox"
              checked={preferences.pushNotifications}
              onChange={handleToggle('pushNotifications')}
            />
            <span className="slider"></span>
          </label>
        </label>
        <label className="form-control-label">
          {t('notifications.soundEffects')}
          <label className="switch">
            <input
              type="checkbox"
              checked={preferences.soundEffects}
              onChange={handleToggle('soundEffects')}
            />
            <span className="slider"></span>
          </label>
        </label>
      </div>
      <button className="save-button" onClick={handleSave}>
        {t('notifications.save')}
      </button>
    </div>
  );
};

export default NotificationPreferences;
