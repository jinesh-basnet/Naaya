import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdHome, MdSearch, MdAdd, MdMovie, MdPerson } from 'react-icons/md';
import './BottomNavigation.css';
import { useAuth } from '../contexts/AuthContext';

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const getValueFromPath = (path: string) => {
    switch (path) {
      case '/home':
        return 0;
      case '/explore':
        return 1;
      case '/reels':
        return 3;
      case '/profile':
        return 4;
      default:
        return 0;
    }
  };

  const handleNavigation = (newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/home');
        break;
      case 1:
        navigate('/explore');
        break;
      case 3:
        navigate('/reels');
        break;
      case 4:
        navigate(`/profile/${user?.username}`);
        break;
      default:
        break;
    }
  };

  if (!user) {
    return null;
  }

  const currentValue = getValueFromPath(location.pathname);

  return (
    <div className="bottom-nav-container">
      <div className="nav-wrapper">
        <nav className="bottom-nav">
          <button
            className={`nav-item ${currentValue === 0 ? 'active' : ''}`}
            onClick={() => handleNavigation(0)}
          >
            <MdHome />
          </button>
          <button
            className={`nav-item ${currentValue === 1 ? 'active' : ''}`}
            onClick={() => handleNavigation(1)}
          >
            <MdSearch />
          </button>
          <div className="nav-placeholder"></div>
          <button
            className={`nav-item ${currentValue === 3 ? 'active' : ''}`}
            onClick={() => handleNavigation(3)}
          >
            <MdMovie />
          </button>
          <button
            className={`nav-item ${currentValue === 4 ? 'active' : ''}`}
            onClick={() => handleNavigation(4)}
          >
            <MdPerson />
          </button>
        </nav>
        <button
          className="add-fab"
          onClick={() => navigate('/create')}
          aria-label="create post"
        >
          <MdAdd />
        </button>
      </div>
    </div>
  );
};

export default BottomNavigation;
