import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdAdd } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import './BottomNavigation.css';
import { useAuth } from '../contexts/AuthContext';
import { useCreatePost } from '../contexts/CreatePostContext';
import { getNavItems } from '../utils/navItems';

interface BottomNavigationProps {
  isMobile?: boolean;
  drawerOpen?: boolean;
  setDrawerOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

const BottomNavigation: React.FC<BottomNavigationProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { openModal } = useCreatePost();
  const { t } = useTranslation();

  const navItems = getNavItems(t);

  const handleNavigation = (path: string) => {
    if (path === '/profile' && user) {
      navigate(`/profile/${user.username}`);
    } else {
      navigate(path);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bottom-nav-container" role="navigation" aria-label="Main navigation">
      <nav className="bottom-nav">
        {navItems.slice(0, 2).map((item) => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path === '/profile' && location.pathname.startsWith('/profile'));
          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
              aria-label={t(item.labelKey)}
            >
              <IconComponent />
            </button>
          );
        })}

        <button
          className="add-fab-v2"
          aria-label="Create post"
          onClick={openModal}
        >
          <MdAdd />
        </button>

        {navItems.slice(2, 4).map((item) => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path === '/profile' && location.pathname.startsWith('/profile'));
          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
              aria-label={t(item.labelKey)}
            >
              <IconComponent />
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNavigation;
