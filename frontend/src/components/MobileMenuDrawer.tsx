import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getNepaliDate } from '../utils/nepaliDateUtils';
import { FaSearch, FaSignOutAlt, FaPlus } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getNavItems, userNavItems } from '../utils/navItems';
import api from '../services/api';
import './MobileMenuDrawer.css';

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  openCreatePostModal: () => void;
}

const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({ open, onClose, isMobile, openCreatePostModal }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const nepaliDate = getNepaliDate();
  const language = (i18n.language as 'ne' | 'en') || 'en';

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
              <button className="close-btn" onClick={onClose}>
                <MdClose />
              </button>
            </div>

            <div className="drawer-content">
              <form className="search-section" onSubmit={handleSearch}>
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder={t('nav.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>

              <div className="toggles-section">
                <p className="nepali-date">{nepaliDate}</p>
                <button className="toggle-btn" onClick={handleLanguageToggle}>
                  {language === 'ne' ? t('nav.english') : t('nav.nepali')}
                </button>

              </div>

              <hr className="divider" />

              <div className="links-section">
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
                    <div style={{ position: 'relative' }}>
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
                    openCreatePostModal();
                    onClose();
                  }}
                >
                  <FaPlus />
                  <span>{t('nav.createPost')}</span>
                </button>
              </div>

              <hr className="divider" />

              <div className="user-section">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="avatar" className="user-avatar" />
                ) : (
                  <div className="user-avatar fallback">{user?.fullName?.charAt(0)}</div>
                )}
                <div className="user-info">
                  <p>{user?.fullName}</p>
                  <p>@{user?.username}</p>
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
                      <item.icon />
                      <span>{t(item.labelKey)}</span>
                    </button>
                  ))}
                  <button className="user-btn logout-btn" onClick={handleLogout}>
                    <FaSignOutAlt />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMenuDrawer;
