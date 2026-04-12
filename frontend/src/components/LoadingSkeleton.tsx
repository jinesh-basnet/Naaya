import React from 'react';

const LoadingSkeleton: React.FC = () => (
  <div className="loading-skeleton">
    {[1, 2, 3].map((i) => (
      <div key={i} className="skeleton-card">
        <div className="skeleton-content">
          <div className="skeleton-header">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-text">
              <div className="skeleton-line-60"></div>
              <div className="skeleton-line-40"></div>
            </div>
          </div>
          <div className="skeleton-rect"></div>
          <div className="skeleton-actions">
            <div className="skeleton-line-20"></div>
            <div className="skeleton-line-30"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
