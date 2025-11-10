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

  const currentPath = location.pathname;
  const currentIndex = navItems.findIndex(item => item.path === currentPath);

  const handleNavigation = (path: string) => {
    if (path === '/profile' && user) {
      navigate(`/profile/${user.username}`);
    } else if (path === '/messages') {
      alert('Messages feature coming soon!');
    } else {
      navigate(path);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bottom-nav-container" role="navigation" aria-label="Main navigation">
      <div className="nav-wrapper">
        <nav className="bottom-nav">
          {navItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                className={`nav-item ${currentIndex === index ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
                aria-label={t(item.labelKey)}
              >
                <IconComponent />
              </button>
            );
          })}
        </nav>
        <button
          className="add-fab"
          aria-label="Create post"
          onClick={openModal}
          title="Create post"
        >
          <MdAdd size={28} />
        </button>
      </div>
    </div>
  );
};

export default BottomNavigation;
