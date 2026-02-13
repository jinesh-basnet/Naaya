import React from 'react';
import { BsGrid3X3, BsFilm, BsBookmark } from 'react-icons/bs';
import { motion } from 'framer-motion';

type ActiveTab = 'posts' | 'reels' | 'bookmarks' | 'savedReels';

interface ProfileTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isCurrentUser: boolean;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
  isCurrentUser,
}) => {
  const tabs = [
    { id: 'posts', label: 'Posts', icon: <BsGrid3X3 size={18} /> },
    { id: 'reels', label: 'Reels', icon: <BsFilm size={18} /> },
  ];

  if (isCurrentUser) {
    tabs.push({ id: 'bookmarks', label: 'Saved', icon: <BsBookmark size={18} /> });
  }

  return (
    <div className="profile-tabs-container">
      <div className="profile-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id as ActiveTab)}
          >
            <div className="tab-content">
              {tab.icon}
              <span>{tab.label}</span>
            </div>
            {activeTab === tab.id && (
              <motion.div
                className="active-indicator"
                layoutId="activeTab"
                transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProfileTabs;
