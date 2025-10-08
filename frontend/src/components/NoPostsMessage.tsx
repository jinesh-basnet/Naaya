import React from 'react';

const NoPostsMessage: React.FC = () => (
  <div className="no-posts">
    <h6 style={{ color: '#666', marginBottom: 8 }}>
      No posts yet
    </h6>
    <p style={{ color: '#666' }}>
      Be the first to share something amazing!
    </p>
  </div>
);

export default NoPostsMessage;
