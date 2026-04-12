import React from 'react';
import StoriesBar from '../components/StoriesBar';
import './StoriesPage.css';

interface StoriesPageProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const StoriesPage: React.FC<StoriesPageProps> = ({ isCollapsed, setIsCollapsed }) => {
  return (
    <div className="stories-page">
      <div className="stories-container">
        <div className="stories-header">
          <h1 className="stories-title">Stories (Jhyaal)</h1>
        </div>
        <StoriesBar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>
    </div>
  );
};

export default StoriesPage;
