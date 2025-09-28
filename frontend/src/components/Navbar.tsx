import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getNepaliDate } from '../utils/nepaliDateUtils';
import { FaUser, FaCog, FaSignOutAlt, FaPlus, FaBars, FaSearch } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { useCreatePost } from '../contexts/CreatePostContext';
import api from '../services/api';
import { getNavItems } from '../utils/navItems';
import './Navbar.css';

interface NavbarProps {
  setSidebarOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

const Navbar: React.FC<NavbarProps> = ({ setSidebarOpen }) => {

  const { t, i18n } = useTranslation();
  const language = (i18n.language as 'ne' | 'en') || 'en';
  const { festivalMode, setFestivalMode } = useFestival();
  const nepaliDate = useMemo(() => getNepaliDate(), []);

  const navItems = getNavItems(t).map(item => ({
    ...item,
    label: t(item.labelKey)
  }));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { openModal } = useCreatePost();

  useEffect(() => {
    let isMounted = true;
    const fetchUnreadCounts = async () => {
      try {
        const notifRes = await api.get('/notifications/unread-count');
        if (isMounted) {
          setUnreadNotifications(notifRes.data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread counts');
      }
    };

    if (user) {
      fetchUnreadCounts();
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
      <div className="navbar-header">
        <div onClick={() => navigate('/home')} style={{ cursor: 'pointer', flex: 1 }}>
          <img src="/logo.png" alt="Naaya" />
          <div>
            <h5>{t('common.appName')}</h5>
            <p>{t('nav.tagline')}</p>
          </div>
        </div>
        <button
          className="navbar-close-btn"
          onClick={() => setSidebarOpen && setSidebarOpen(false)}
          aria-label="Toggle Sidebar"
        >
          <FaBars />
        </button>
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
          onClick={() => {
            setFestivalMode(!festivalMode);
            document.body.classList.toggle('festival-mode', !festivalMode);
          }}
        >
          {festivalMode
            ? (language === 'ne' ? 'दशैं/तिहार मोड' : 'Dashain/Tihar Mode')
            : (language === 'ne' ? 'सामान्य मोड' : 'Normal Mode')}
        </button>
      </div>

      <hr className="navbar-divider" />

      <form className="navbar-search" onSubmit={handleSearch}>
        <div className="navbar-search-wrapper">
          <input
            className="navbar-search-input"
            placeholder={t('nav.searchPlaceholder')}
            aria-label="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="navbar-search-btn">
            <FaSearch className="search-icon" />
          </button>
        </div>
      </form>

      <button className="navbar-create-btn" onClick={openModal}>
        <FaPlus className="icon" />
        {t('nav.createPost')}
      </button>

      <hr className="navbar-divider" />

      <div style={{ flexGrow: 1 }}>
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`navbar-nav-btn ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <div style={{ position: 'relative' }}>
              {React.createElement(item.icon, { className: "icon" })}
              {item.showBadge && (
                <span className="badge-overlay">
                  {unreadNotifications}
                </span>
              )}
            </div>
            {item.label}
          </button>
        ))}
        <button
          className={`navbar-nav-btn ${location.pathname.startsWith('/profile') ? 'active' : ''}`}
          onClick={() => { navigate(`/profile/${user?.username}`); }}
        >
          <FaUser className="icon" />
          {t('nav.profile')}
        </button>
        <button
          className="navbar-nav-btn"
          onClick={() => { navigate('/settings'); }}
        >
          <FaCog className="icon" />
          {t('nav.settings')}
        </button>
      </div>

      <hr className="navbar-divider" />

      <div className="navbar-footer">
        <button className="navbar-icon-btn" onClick={handleLogout}>
          <FaSignOutAlt className="icon" />
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
