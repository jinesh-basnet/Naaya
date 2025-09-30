import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiMenu, HiArrowLeft } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getNavItems, userNavItems } from '../utils/navItems';
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
      <div className="navbar-header">
        <button
          className="navbar-toggle-btn"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <HiArrowLeft /> : <HiMenu />}
        </button>
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
                aria-label={t(item.labelKey)}
              >
                <Icon className="navbar-icon" />
                {!isCollapsed && <span className="navbar-label">{t(item.labelKey)}</span>}
                {item.showBadge && <span className="badge-overlay">3</span>} {/* Placeholder for badge count */}
              </button>
            </li>
          );
        })}
        {userItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/profile' ? location.pathname.startsWith('/profile') : location.pathname === item.path;
          return (
            <li key={item.path} className={`navbar-nav-item ${isActive ? 'active' : ''}`}>
              <button
                className="navbar-nav-button"
                onClick={() => handleNavigation(item.path)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={t(item.labelKey)}
              >
                <Icon className="navbar-icon" />
                {!isCollapsed && <span className="navbar-label">{t(item.labelKey)}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Navbar;
