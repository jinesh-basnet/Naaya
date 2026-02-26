import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './SettingsPage.css';
import {
  IoLanguage,
  IoMoon,
  IoSunny,
  IoPerson,
  IoNotifications,
  IoLogOut,
  IoGlobe,
  IoEye,
  IoLockClosed,
  IoCheckmark
} from 'react-icons/io5';
import { notificationsAPI } from '../services/api';
import { pushNotificationService } from '../services/pushNotificationService';

type SettingsTab = 'appearance' | 'account' | 'privacy' | 'notifications';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEffects: boolean;
}

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    soundEffects: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchPreferences();
    }
  }, [activeTab]);

  const fetchPreferences = async () => {
    try {
      setLoadingPreferences(true);
      const response = await notificationsAPI.getPreferences();
      if (response.data?.preferences) {
        setPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleTogglePreference = async (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key]
    };

    setPreferences(newPreferences);

    try {
      if (key === 'pushNotifications') {
        if (!preferences.pushNotifications) {
          const permission = await pushNotificationService.requestPermission();
          if (permission === 'granted') {
            await pushNotificationService.subscribeToPush();
          } else {
            toast.error('Notification permission denied');
            setPreferences(preferences); 
            return;
          }
        } else {
          await pushNotificationService.unsubscribeFromPush();
        }
      }

      await notificationsAPI.updatePreferences(newPreferences);
      toast.success(`${key.replace(/([A-Z])/g, ' $1')} ${newPreferences[key] ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update preference');
      setPreferences(preferences); 
    }
  };

  const handleLanguageChange = (lang: 'en' | 'ne') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
    toast.success(lang === 'en' ? 'Language changed to English' : 'भाषा नेपालीमा परिवर्तन गरियो', {
      icon: '🌐',
      duration: 2000,
    });
  };

  const handleThemeToggle = () => {
    toggleTheme();
    toast.success(
      theme === 'light' ? 'Switched to Dark Mode' : 'Switched to Light Mode',
      {
        icon: theme === 'light' ? '🌙' : '☀️',
        duration: 2000,
      }
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('Logged out successfully', {
      icon: '👋',
      duration: 2000,
    });
    setTimeout(() => {
      navigate('/login');
    }, 1000);
  };

  const navItems = [
    { id: 'appearance', label: t('settings.appearance'), icon: <IoGlobe /> },
    { id: 'account', label: t('settings.account'), icon: <IoPerson /> },
    { id: 'privacy', label: t('settings.privacy'), icon: <IoLockClosed /> },
    { id: 'notifications', label: t('settings.notifications'), icon: <IoNotifications /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <motion.div
            key="appearance"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="settings-card"
          >
            <h2 className="settings-section-title">
              <IoLanguage /> {t('settings.appearance')}
            </h2>

            <div className="settings-item">
              <div className="settings-item-info">
                <h3>{t('settings.language')}</h3>
                <p>{t('settings.languageDesc')}</p>
              </div>
              <div className="settings-control">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                  aria-label="Switch to English"
                >
                  {i18n.language === 'en' && <IoCheckmark style={{ marginRight: '0.25rem' }} />}
                  English
                </button>
                <button
                  onClick={() => handleLanguageChange('ne')}
                  className={`lang-btn ${i18n.language === 'ne' ? 'active' : ''}`}
                  aria-label="Switch to Nepali"
                >
                  {i18n.language === 'ne' && <IoCheckmark style={{ marginRight: '0.25rem' }} />}
                  नेपाली
                </button>
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <h3>{t('settings.theme')}</h3>
                <p>{t('settings.darkModeDesc')}</p>
              </div>
              <div className="settings-control">
                <button
                  onClick={handleThemeToggle}
                  className="theme-toggle-btn"
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? (
                    <>
                      <IoMoon /> {t('settings.darkMode')}
                    </>
                  ) : (
                    <>
                      <IoSunny /> {t('settings.lightMode')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        );

      case 'account':
        return (
          <motion.div
            key="account"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="settings-card"
          >
            <h2 className="settings-section-title">
              <IoPerson /> {t('settings.account')}
            </h2>
            <div className="settings-item">
              <div className="settings-item-info">
                <h3>Change Password</h3>
                <p>Update your password to keep your account secure</p>
              </div>
              <button
                className="lang-btn"
                onClick={() => navigate('/change-password')}
                aria-label="Change password"
              >
                Change
              </button>
            </div>
            <div className="settings-item">
              <div className="settings-item-info">
                <h3>Account Privacy</h3>
                <p>Manage who can see your profile and posts</p>
              </div>
              <button
                className="lang-btn"
                onClick={() => toast('Feature coming soon!', { icon: '🚀' })}
                aria-label="Manage account privacy"
              >
                Manage
              </button>
            </div>
          </motion.div>
        );

      case 'privacy':
        return (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="settings-card"
          >
            <h2 className="settings-section-title">
              <IoEye /> {t('settings.privacy')}
            </h2>
            <div className="settings-item">
              <div className="settings-item-info">
                <h3>{t('settings.blockedUsers')}</h3>
                <p>View and manage accounts you've blocked</p>
              </div>
              <button
                className="lang-btn"
                onClick={() => navigate('/blocked-users')}
                aria-label="View blocked accounts"
              >
                View List
              </button>
            </div>
            <div className="settings-item">
              <div className="settings-item-info">
                <h3>Post Privacy</h3>
                <p>Control who can comment on your posts</p>
              </div>
              <button
                className="lang-btn"
                onClick={() => navigate('/privacy-settings')}
                aria-label="Configure post privacy"
              >
                Configure
              </button>
            </div>
          </motion.div>
        );

      case 'notifications':
        return (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="settings-card"
          >
            <h2 className="settings-section-title">
              <IoNotifications /> {t('notifications.preferencesTitle')}
            </h2>

            {loadingPreferences ? (
              <div className="loading-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>{t('notifications.loadingPreferences')}</p>
              </div>
            ) : (
              <>
                <div className="settings-item">
                  <div className="settings-item-info">
                    <h3>{t('notifications.pushNotifications')}</h3>
                    <p>{t('notifications.pushNotificationsDesc')}</p>
                  </div>
                  <button
                    className={`lang-btn ${preferences.pushNotifications ? 'active' : ''}`}
                    onClick={() => handleTogglePreference('pushNotifications')}
                    aria-label="Toggle push notifications"
                  >
                    {preferences.pushNotifications ? t('notifications.enabled') : t('notifications.enable')}
                  </button>
                </div>

                <div className="settings-item">
                  <div className="settings-item-info">
                    <h3>{t('notifications.emailNotifications')}</h3>
                    <p>{t('notifications.emailNotificationsDesc')}</p>
                  </div>
                  <button
                    className={`lang-btn ${preferences.emailNotifications ? 'active' : ''}`}
                    onClick={() => handleTogglePreference('emailNotifications')}
                    aria-label="Toggle email notifications"
                  >
                    {preferences.emailNotifications ? t('notifications.enabled') : t('notifications.enable')}
                  </button>
                </div>

                <div className="settings-item">
                  <div className="settings-item-info">
                    <h3>{t('notifications.soundEffects')}</h3>
                    <p>{t('notifications.soundEffectsDesc')}</p>
                  </div>
                  <button
                    className={`lang-btn ${preferences.soundEffects ? 'active' : ''}`}
                    onClick={() => handleTogglePreference('soundEffects')}
                    aria-label="Toggle sound effects"
                  >
                    {preferences.soundEffects ? t('notifications.enabled') : t('notifications.enable')}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="settings-wrapper">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-header">
            <h2>{t('settings.title') || 'Settings'}</h2>
          </div>
          <nav className="settings-nav" aria-label="Settings navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`settings-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id as SettingsTab)}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <button
              className="settings-nav-item danger-nav-item"
              style={{ marginTop: '1rem', color: '#ff4d4f' }}
              onClick={() => setShowLogoutModal(true)}
              aria-label="Logout"
            >
              <IoLogOut /> {t('settings.logout')}
            </button>
          </nav>
        </aside>

        <main className="settings-content">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowLogoutModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--background-paper)',
                padding: '2rem',
                borderRadius: 'var(--border-radius)',
                maxWidth: '400px',
                width: '90%',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>{t('settings.logout')}</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                {t('settings.logoutConfirm')}
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="lang-btn"
                  style={{ flex: 1 }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleLogout}
                  className="danger-btn"
                  style={{ flex: 1, border: '2px solid #ff4d4f' }}
                >
                  {t('settings.logout')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SettingsPage;
