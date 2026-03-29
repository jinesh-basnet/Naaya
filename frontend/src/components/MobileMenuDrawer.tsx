import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getNepaliDate } from '../utils/nepaliDateUtils';
import { Search, LogOut, Plus, Moon, Sun, X } from 'lucide-react';
import Avatar from './Avatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getNavItems, userNavItems } from '../utils/navItems';
import { useCreatePost } from '../contexts/CreatePostContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import logo from '../assets/logo.png';

import './MobileMenuDrawer.css';

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({ open, onClose, isMobile }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { openModal } = useCreatePost();
  const { theme, toggleTheme } = useTheme();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const nepaliDate = getNepaliDate();
  const language = (i18n.language as 'ne' | 'en') || 'en';

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    let isMounted = true;
    const fetchUnreadCounts = async () => {
      try {
        const notifRes = await api.get('/notifications/unread-count');
        const msgRes = await api.get('/messages/unread-count');
        if (isMounted) {
          setUnreadNotifications(notifRes.data.unreadCount || 0);
          setUnreadMessages(msgRes.data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread counts');
      }
    };

    if (user && open) {
      fetchUnreadCounts();
    }
    return () => {
      isMounted = false;
    };
  }, [user, open]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      onClose();
    }
  };

  const handleLanguageToggle = () => {
    const next = language === 'ne' ? 'en' : 'ne';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };



  const handleLogout = () => {
    logout();
    navigate('/');
    onClose();
  };



  if (!isMobile || !open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="drawer-header">
              <div className="drawer-brand" onClick={() => { navigate('/home'); onClose(); }}>
                <img src={logo} alt="Naaya" className="drawer-logo" />
                <span className="drawer-brand-name">नाया</span>
              </div>
              <button className="close-btn" onClick={onClose} aria-label="Close menu">
                <X size={24} />
              </button>
            </div>

            <motion.div
              className="drawer-content"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.form key="search" variants={itemVariants} className="search-section" onSubmit={handleSearch}>
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  placeholder={t('nav.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </motion.form>

              <motion.div variants={itemVariants} className="toggles-section">
                <p className="nepali-date">{nepaliDate}</p>
                <div className="toggle-group">
                  <button className="toggle-btn" onClick={handleLanguageToggle}>
                    {language === 'ne' ? t('nav.english') : t('nav.nepali')}
                  </button>
                  <button className="toggle-btn theme-btn" onClick={toggleTheme}>
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    <span>{theme === 'light' ? t('settings.darkMode') : t('settings.lightMode')}</span>
                  </button>
                </div>
              </motion.div>

              <motion.hr variants={itemVariants} className="divider" />

              <motion.div variants={itemVariants} className="links-section">
                {getNavItems(t).map((item) => (
                  <button key={item.path} className="link-btn" onClick={() => {
                    if (item.path === '/messages') {
                      alert('Messages feature coming soon!');
                      onClose();
                    } else {
                      const path = item.labelKey === 'nav.profile' ? `/profile/${user?.username}` : item.path;
                      navigate(path);
                      onClose();
                    }
                  }}>
                    <div className="icon-wrapper">
                      <item.icon />
                      {item.showBadge && item.labelKey === 'nav.notification' && unreadNotifications > 0 && (
                        <span className="badge-overlay">{unreadNotifications}</span>
                      )}
                      {item.showBadge && item.labelKey === 'nav.messages' && unreadMessages > 0 && (
                        <span className="badge-overlay">{unreadMessages}</span>
                      )}
                    </div>
                    <span>{t(item.labelKey)}</span>
                  </button>
                ))}
                <button
                  className="link-btn create-btn"
                  onClick={() => {
                    openModal();
                    onClose();
                  }}
                >
                  <Plus className="icon" size={20} />
                  <span>{t('nav.createPost')}</span>
                </button>
              </motion.div>

              <motion.hr variants={itemVariants} className="divider" />

              <motion.div variants={itemVariants} className="user-section">
                <div className="user-profile-header">
                  <Avatar
                    src={user?.profilePicture}
                    alt={user?.fullName || 'User'}
                    name={user?.fullName}
                    size={60}
                    className="user-avatar"
                  />
                  <div className="user-info">
                    <p className="user-fullname">{user?.fullName}</p>
                    <p className="user-username">@{user?.username}</p>
                  </div>
                </div>

                <div className="user-actions">
                  {userNavItems(t).filter(item => item.labelKey !== 'nav.logout').map((item) => (
                    <button
                      key={item.path}
                      className="user-btn"
                      onClick={() => {
                        const path = item.labelKey === 'nav.profile' ? `/profile/${user?.username}` : item.path;
                        navigate(path);
                        onClose();
                      }}
                    >
                      <item.icon className="icon" />
                      <span>{t(item.labelKey)}</span>
                    </button>
                  ))}
                  <button className="user-btn logout-btn" onClick={handleLogout}>
                    <LogOut className="icon" size={20} />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMenuDrawer;
