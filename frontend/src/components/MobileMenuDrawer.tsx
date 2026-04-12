import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getNepaliDate } from '../utils/nepaliDateUtils';
import { Search, LogOut, Plus, Moon, Sun, X } from 'lucide-react';
import Avatar from './Avatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getNavItems } from '../utils/navItems';
import { useCreatePost } from '../contexts/CreatePostContext';
import { useTheme } from '../contexts/ThemeContext';
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
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            <div className="drawer-header">
              <div className="drawer-brand" onClick={() => { navigate('/home'); onClose(); }}>
                <img src={logo} alt="Project Logo" className="drawer-logo" />
                <span className="drawer-brand-name">Naaya</span>
              </div>
              <button className="close-btn" onClick={onClose}>
                <X size={24} />
              </button>
            </div>

            <div className="drawer-content">
              <form className="search-section" onSubmit={handleSearch}>
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>

              <div className="toggles-section">
                <span className="nepali-date">{nepaliDate}</span>
                <div className="toggle-group">
                  <button className="toggle-btn" onClick={handleLanguageToggle}>
                    {language === 'ne' ? 'English' : 'नेपाली'}
                  </button>
                  <button className="toggle-btn" onClick={toggleTheme}>
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                    <span style={{ marginLeft: '5px' }}>
                      {theme === 'light' ? 'Dark' : 'Light'}
                    </span>
                  </button>
                </div>
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
                    <item.icon size={20} />
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
                  <Plus size={20} />
                  <span>Create Post</span>
                </button>
              </div>

              <hr className="divider" />

              <div className="user-section">
                <div className="user-profile-header">
                  <Avatar
                    src={user?.profilePicture}
                    alt="User Profile"
                    size={45}
                  />
                  <div className="user-info">
                    <p className="user-fullname">{user?.fullName}</p>
                    <p className="user-username">@{user?.username}</p>
                  </div>
                </div>

                <div className="user-actions">
                  <button className="user-btn" onClick={() => { navigate(`/profile/${user?.username}`); onClose(); }}>
                    <span>View Profile</span>
                  </button>
                  <button className="user-btn logout-btn" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span>Logout Account</span>
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
