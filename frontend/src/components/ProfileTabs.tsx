import React from 'react';

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
  return (
    <div className="profile-tabs">
      <button
        className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
        onClick={() => onTabChange('posts')}
      >
        Posts
      </button>
      <button
        className={`tab-button ${activeTab === 'reels' ? 'active' : ''}`}
        onClick={() => onTabChange('reels')}
      >
        Reels
      </button>
      {isCurrentUser && (
        <button
          className={`tab-button ${activeTab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => onTabChange('bookmarks')}
        >
          Saved
        </button>
      )}
    </div>
  );
};

export default ProfileTabs;
