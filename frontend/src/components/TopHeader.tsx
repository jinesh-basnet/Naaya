import React from 'react';
import { MdAdd, MdFavoriteBorder, MdSend } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useCreatePost } from '../contexts/CreatePostContext';

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
    <header
      style={{
        height: 60,
        backgroundColor: '#fff',
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid #dbdbdb',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
      aria-label="Instagram top navigation"
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={handleMenuToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#000',
            fontSize: 24,
            cursor: 'pointer',
            marginRight: 16,
            display: isMobile ? 'block' : 'none',
          }}
          aria-label="Toggle menu"
        >
          &#9776;
        </button>
      </div>

      {isMobile ? (
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
          aria-label="Mobile top navigation"
        >
          <button
            aria-label="Messages"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate('/messages')}
          >
            <MdSend size={24} />
          </button>
          <button
            aria-label="Notifications"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate('/notifications')}
          >
            <MdFavoriteBorder size={24} />
          </button>
        </nav>
      ) : (
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
          aria-label="Primary navigation"
        >
          <button
            aria-label="Create post"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={openModal}
          >
            <MdAdd size={24} />
          </button>
          <button
            aria-label="Activity"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate('/notifications')}
          >
            <MdFavoriteBorder size={24} />
          </button>
          <button
            aria-label="Direct messages"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate('/messages')}
          >
            <MdSend size={24} />
          </button>
        </nav>
      )}
    </header>
  );
};

export default TopHeader;
