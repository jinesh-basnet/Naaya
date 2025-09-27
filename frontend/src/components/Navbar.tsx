import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getNepaliDate } from '../utils/nepaliDateUtils';
import { FaHome, FaHeart, FaBell, FaUser, FaCog, FaSignOutAlt, FaVideo, FaPlus } from 'react-icons/fa';
import { MdChat } from 'react-icons/md';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Navbar.css';

const Navbar: React.FC = () => {

  const { t, i18n } = useTranslation();
  const language = (i18n.language as 'ne' | 'en') || 'en';
  const [festivalMode, setFestivalMode] = useState(false);
  const nepaliDate = useMemo(() => getNepaliDate(), []);

  const navItems = useMemo(() => [
    { icon: <FaHome className="icon" />, label: t('nav.home'), path: '/home' },
    { icon: <MdChat className="icon" />, label: t('nav.messages'), path: '/messages' },
    { icon: <FaBell className="icon" />, label: t('nav.notifications'), path: '/notifications' },
    { icon: <FaVideo className="icon" />, label: t('nav.reels'), path: '/reels' },
  ], [t]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        if (isMounted) {
          setUnreadNotifications(response.data.unreadCount);
        }
      } catch (err) {
        console.error('Failed to fetch unread notifications count');
      }
    };

    if (user) {
      fetchUnreadCount();
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    handleMenuClose();
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };



  return (
    <div className={`navbar-sidebar ${festivalMode ? 'festival-mode' : ''}`}>
      <div className="navbar-header" onClick={() => navigate('/home')}>
        <img src="https://upload.wikimedia.org/wikipedia/commons/9/9b/Flag_of_Nepal.svg" alt="Nepal" />
        <div>
          <h5>{t('common.appName')}</h5>
          <p>{t('nav.tagline')}</p>
        </div>
      </div>

      <hr className="navbar-divider" />

      <div>
        <p className="navbar-date">{nepaliDate}</p>
        <button
          className="navbar-lang-btn"
          onClick={() => {
            const next = language === 'ne' ? 'en' : 'ne';
            i18n.changeLanguage(next);
            localStorage.setItem('lang', next);
          }}
        >
          {language === 'ne' ? t('nav.english') : t('nav.nepali')}
        </button>
        <button
          className={`navbar-festival-btn ${festivalMode ? 'contained' : ''}`}
          onClick={() => setFestivalMode(!festivalMode)}
        >
          {festivalMode
            ? (language === 'ne' ? 'दशैं/तिहार मोड' : 'Dashain/Tihar Mode')
            : (language === 'ne' ? 'सामान्य मोड' : 'Normal Mode')}
        </button>
      </div>

      <hr className="navbar-divider" />

      <form className="navbar-search" onSubmit={handleSearch}>
        <input
          className="navbar-search-input"
          placeholder={language === 'ne' ? 'खोज्नुहोस्...' : 'Search...'}
          aria-label="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <hr className="navbar-divider" />

      <div style={{ flexGrow: 1 }}>
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`navbar-nav-btn ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.path === '/notifications' ? (
              <div style={{ position: 'relative' }}>
                {item.icon}
                <span className="badge-overlay">{unreadNotifications}</span>
              </div>
            ) : (
              item.icon
            )}
            {item.label}
          </button>
        ))}
        <button className="navbar-more-btn" onClick={() => navigate('/more')}>
          {t('nav.more')}
        </button>
        <button className="navbar-create-btn" onClick={() => navigate('/create')}>
          <FaPlus className="icon" />
          {t('nav.createPost')}
        </button>
        <button className="navbar-logout-btn" onClick={handleLogout}>
          <FaSignOutAlt className="icon" />
          {t('nav.logout')}
        </button>
      </div>

      <hr className="navbar-divider" />

      <div className="navbar-footer">
        <button className="navbar-icon-btn">
          <FaHeart className="icon" />
          <span className="badge-overlay">4</span>
        </button>
        <button className="navbar-icon-btn" onClick={handleMenuOpen}>
          {user?.profilePicture ? (
            <img className="navbar-avatar" src={user.profilePicture} alt="avatar" />
          ) : (
            <div className="navbar-avatar fallback">{user?.fullName?.charAt(0)}</div>
          )}
        </button>
        {Boolean(anchorEl) && (
          <div className="navbar-menu">
            <ul>
              <li className="navbar-menu-item" onClick={() => { navigate(`/profile/${user?.username}`); handleMenuClose(); }}>
                <FaUser className="icon" />
                {t('nav.profile')}
              </li>
              <li className="navbar-menu-item" onClick={() => { navigate('/settings'); handleMenuClose(); }}>
                <FaCog className="icon" />
                {t('nav.settings')}
              </li>
              <li className="navbar-menu-item" onClick={handleLogout}>
                <FaSignOutAlt className="icon" />
                {t('nav.logout')}
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Navbar);
