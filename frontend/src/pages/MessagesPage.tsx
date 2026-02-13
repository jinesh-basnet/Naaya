import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaperPlane } from 'react-icons/fa';
import ConversationsList from '../components/ConversationsList';
import './MessagesPage.css';

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="messages-layout">
      {/* Sidebar - conversations list */}
      <aside className="messages-sidebar">
        <ConversationsList />
      </aside>

      {/* Main Content Placeholder - only visible on desktop when no conversation is selected */}
      {!isMobile && (
        <main className="messages-main empty">
          <div className="chat-placeholder">
            <div className="placeholder-content">
              <div className="icon-wrapper">
                <FaPaperPlane />
              </div>
              <h2>Naaya Messenger</h2>
              <p>Connect with friends through private messages. Select a conversation to start chatting.</p>
              <button
                className="new-chat-btn"
                onClick={() => navigate('/messages/new')}
              >
                Start New Conversation
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default MessagesPage;
