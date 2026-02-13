import React from 'react';
import { MdAdd, MdFavoriteBorder, MdSend, MdSearch } from 'react-icons/md';
import { HiMenuAlt4 } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useCreatePost } from '../contexts/CreatePostContext';
import logo from '../assets/logo.png';
import './TopHeader.css';

interface TopHeaderProps {
  isMobile?: boolean;
  drawerOpen?: boolean;
  setDrawerOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarOpen?: boolean;
  setSidebarOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

const TopHeader: React.FC<TopHeaderProps> = ({
  isMobile,
  drawerOpen,
  setDrawerOpen,
  sidebarOpen,
  setSidebarOpen,
}) => {
  const navigate = useNavigate();
  const { openModal } = useCreatePost();

  const handleMenuToggle = () => {
    if (isMobile && setDrawerOpen) {
      setDrawerOpen(!drawerOpen);
    } else if (!isMobile && setSidebarOpen) {
      setSidebarOpen(!sidebarOpen);
    }
  };

  return (
    <header className="top-header" aria-label="Desktop top navigation">
      <div className="top-header-left">
        {isMobile && (
          <button
            onClick={handleMenuToggle}
            className="menu-toggle-btn"
            aria-label="Toggle menu"
          >
            <HiMenuAlt4 size={24} />
          </button>
        )}
        {isMobile && (
          <div className="logo-container" onClick={() => navigate('/home')}>
            <img src={logo} alt="Naaya" style={{ width: 32, height: 32 }} />
          </div>
        )}
      </div>

      <nav className="top-header-nav" aria-label={isMobile ? "Mobile top navigation" : "Primary navigation"}>
        {!isMobile && (
          <button
            aria-label="Search"
            className="nav-action-btn"
            onClick={() => navigate('/search')}
          >
            <MdSearch />
          </button>
        )}
        <button
          aria-label="Create post"
          className="nav-action-btn"
          onClick={openModal}
        >
          <MdAdd />
        </button>
        <button
          aria-label="Activity"
          className="nav-action-btn"
          onClick={() => navigate('/notifications')}
        >
          <MdFavoriteBorder />
        </button>
        <button
          aria-label="Direct messages"
          className="nav-action-btn"
          onClick={() => navigate('/messages')}
        >
          <MdSend />
        </button>
      </nav>
    </header>
  );
};

export default TopHeader;
