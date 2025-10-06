import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCheckCircle } from 'react-icons/md';
import { FaBell } from 'react-icons/fa';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import './NotificationsPage.css';

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

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <FaBell className="notifications-icon" />
        <h1 className="notifications-title">Notifications</h1>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        {unreadCount > 0 && (
          <button className="mark-all-read-button" onClick={markAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {loading && page === 1 ? (
        <div className="loading-container">Loading...</div>
      ) : notifications.length === 0 ? (
        <p className="no-notifications">No notifications yet.</p>
      ) : (
        <ul className="notifications-list">
          {notifications.map((notif) => (
            <li 
              key={notif._id} 
              className={`notification-item ${notif.isRead ? '' : 'unread'}`}
            >
              <img
                src={notif.sender.profilePicture}
                alt={notif.sender.fullName}
                className="notification-avatar"
                onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM5OTk5OTkiLz4KPHBhdGggZD0iTTIwIDIwQzIyLjc2MTQgMjAgMjUgMTcuNzYxNCAyNSAxNUMyNSAxMi4yMzg2IDIyLjc2MTQgMTAgMjAgMTBDMTcuMjM4NiAxMCAxNSAxMi4yMzg2IDE1IDE1QzE1IDE3Ljc2MTQgMTcuNzYxNCAyMCAyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='; }}
              />
              <div className="notification-content">
                <h3>{notif.title}</h3>
                <p>
                  <span
                    className="sender-name"
                    onClick={() => navigate(`/profile/${notif.sender.username}`)}
                  >
                    {notif.sender.fullName}
                  </span> — {notif.message}
                </p>
              </div>
              {!notif.isRead && (
                <button className="mark-read-button" onClick={() => markAsRead(notif._id)}>
                  <MdCheckCircle />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading && (
        <div className="load-more-container">
          <button className="load-more-button" onClick={loadMore}>
            Load more
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
