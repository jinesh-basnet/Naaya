import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiMenu, HiArrowLeft } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getNavItems, userNavItems } from '../utils/navItems';
import Avatar from './Avatar';
import logo from '../assets/logo.png';
import './Navbar.css';

interface NavbarProps {
  setSidebarOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  isCollapsed?: boolean;
  setIsCollapsed?: React.Dispatch<React.SetStateAction<boolean>>;
}

const Navbar: React.FC<NavbarProps> = ({ setSidebarOpen, isCollapsed = false, setIsCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const navItems = getNavItems(t);
  const userItems = userNavItems(t);

  const handleNavigation = (path: string) => {
    if (path === '/logout') {
      logout();
      navigate('/login');
    } else if (path === '/profile') {
      navigate(`/profile/${user?.username}`);
    } else if (path === '/messages') {
      navigate('/messages');
    } else {
      navigate(path);
    }
  };

  const toggleCollapse = () => {
    if (setIsCollapsed) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <nav className={`navbar-sidebar ${isCollapsed ? 'collapsed' : ''}`} aria-label="Desktop sidebar navigation">
      <button
        className="navbar-toggle-btn"
        onClick={toggleCollapse}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <HiMenu /> : <HiArrowLeft />}
      </button>

      <div className="navbar-header" onClick={() => navigate('/home')}>
        <div className="logo-container">
          <img src={logo} alt="Naaya" className="navbar-logo-img" />
          {!isCollapsed && <span className="navbar-brand-name">नाया</span>}
        </div>
      </div>

      <ul className="navbar-nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <li key={item.path} className={`navbar-nav-item ${isActive ? 'active' : ''}`}>
              <button
                className="navbar-nav-button"
                onClick={() => handleNavigation(item.path)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="navbar-icon" />
                {!isCollapsed && <span className="navbar-label">{t(item.labelKey)}</span>}
                {item.showBadge && <span className="badge-overlay">3</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="navbar-profile-section">
        {userItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/profile' ? location.pathname.startsWith('/profile') : location.pathname === item.path;
          return (
            <div key={item.path} className={`navbar-nav-item ${isActive ? 'active' : ''}`}>
              <button
                className="navbar-nav-button"
                onClick={() => handleNavigation(item.path)}
              >
                <Icon className="navbar-icon" />
                {!isCollapsed && <span className="navbar-label">{t(item.labelKey)}</span>}
              </button>
            </div>
          );
        })}

        {!isCollapsed && user && (
          <div className="navbar-user-card" onClick={() => navigate(`/profile/${user.username}`)}>
            <Avatar
              src={user.profilePicture}
              alt={user.fullName}
              name={user.fullName}
              size={32}
              className="navbar-user-avatar"
            />
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user.fullName}</span>
              <span className="navbar-user-handle">@{user.username}</span>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
