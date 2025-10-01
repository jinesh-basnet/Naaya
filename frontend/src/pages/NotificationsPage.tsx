import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCheckCircle } from 'react-icons/md';
import { FaBell } from 'react-icons/fa';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  sender: {
    username: string;
    fullName: string;
    profilePicture: string;
  };
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchNotifications = async (pageNumber: number) => {
    try {
      setLoading(true);
      const response = await api.get(`/notifications?page=${pageNumber}&limit=20`);
      const data = response.data;
      if (pageNumber === 1) {
        setNotifications(data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...data.notifications]);
      }
      setUnreadCount(data.unreadCount);
      setHasMore(pageNumber < data.pagination.pages);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount((count) => Math.max(count - 1, 0));
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      fetchNotifications(nextPage);
      setPage(nextPage);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: 'var(--background)',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '24px'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px'
  };

  const iconStyle = {
    fontSize: '36px',
    marginRight: '8px'
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: 400,
    margin: '0 0 0 8px'
  };

  const badgeStyle: React.CSSProperties = {
    backgroundColor: '#f44336',
    color: 'white',
    borderRadius: '50%',
    padding: '2px 6px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    marginLeft: '16px',
    minWidth: '20px',
    textAlign: 'center'
  };

  const markAllButtonStyle = {
    marginLeft: 'auto',
    padding: '6px 16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.875rem'
  };

  const loadingStyle = {
    display: 'flex',
    justifyContent: 'center',
    padding: '32px 0'
  };

  const noNotifStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: '32px',
    color: '#666',
    fontSize: '1rem'
  };

  const listStyle = {
    listStyle: 'none',
    padding: 0,
    margin: 0
  };

  const itemBaseStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    marginBottom: '8px',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0'
  };

  const unreadStyle = {
    backgroundColor: '#e3f2fd'
  };

  const avatarStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    marginRight: '16px',
    objectFit: 'cover'
  };

  const contentStyle = {
    flex: 1
  };

  const h3Style = {
    margin: '0 0 4px 0',
    fontSize: '1rem',
    fontWeight: 500
  };

  const pStyle = {
    margin: 0,
    fontSize: '0.875rem',
    color: '#666'
  };

  const senderStyle = {
    color: '#000',
    fontWeight: 500
  };

  const markReadButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    color: '#1976d2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const loadMoreContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '16px'
  };

  const loadMoreButtonStyle = {
    padding: '12px 24px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <FaBell style={iconStyle} />
        <h1 style={titleStyle}>Notifications</h1>
        {unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
        {unreadCount > 0 && (
          <button style={markAllButtonStyle} onClick={markAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {loading && page === 1 ? (
        <div style={loadingStyle}>Loading...</div>
      ) : notifications.length === 0 ? (
        <p style={noNotifStyle}>No notifications yet.</p>
      ) : (
        <ul style={listStyle}>
          {notifications.map((notif) => (
            <li 
              key={notif._id} 
              style={{
                ...itemBaseStyle,
                ...(notif.isRead ? {} : unreadStyle)
              }}
            >
              <img
                src={notif.sender.profilePicture}
                alt={notif.sender.fullName}
                style={avatarStyle}
                onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM5OTk5OTkiLz4KPHBhdGggZD0iTTIwIDIwQzIyLjc2MTQgMjAgMjUgMTcuNzYxNCAyNSAxNUMyNSAxMi4yMzg2IDIyLjc2MTQgMTAgMjAgMTBDMTcuMjM4NiAxMCAxNSAxMi4yMzg2IDE1IDE1QzE1IDE3Ljc2MTQgMTcuNzYxNCAyMCAyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='; }}
              />
              <div style={contentStyle}>
                <h3 style={h3Style}>{notif.title}</h3>
                <p style={pStyle}>
                  <span
                    style={{ ...senderStyle, cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${notif.sender.username}`)}
                  >
                    {notif.sender.fullName}
                  </span> — {notif.message}
                </p>
              </div>
              {!notif.isRead && (
                <button style={markReadButtonStyle} onClick={() => markAsRead(notif._id)}>
                  <MdCheckCircle />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading && (
        <div style={loadMoreContainerStyle}>
          <button style={loadMoreButtonStyle} onClick={loadMore}>
            Load more
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
