import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCheckCircle } from 'react-icons/md';
import { FaBell } from 'react-icons/fa';
import { notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { IoTrashOutline } from 'react-icons/io5';
import Avatar from '../components/Avatar';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
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
  const [deleteModalConfig, setDeleteModalConfig] = useState<{ isOpen: boolean; type: 'single' | 'all'; notificationId?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNotifications = async (pageNumber: number) => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getNotifications(pageNumber, 20);
      const data = response.data;
      if (pageNumber === 1) {
        setNotifications(data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...data.notifications]);
      }
      setUnreadCount(data.unreadCount);
      setHasMore(data.pagination ? pageNumber < data.pagination.pages : false);
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
      await notificationsAPI.markAsRead(notificationId);
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
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const originalNotifications = [...notifications];
    const notificationToDelete = notifications.find(n => n._id === notificationId);

    if (!notificationToDelete) return;

    setNotifications(prev => prev.filter(n => n._id !== notificationId));
    if (!notificationToDelete.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    let isUndone = false;

    toast(
      (t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Notification removed</span>
          <button
            onClick={() => {
              isUndone = true;
              toast.dismiss(t.id);
              setNotifications(originalNotifications);
              if (!notificationToDelete.isRead) {
                setUnreadCount(prev => prev + 1);
              }
            }}
            style={{
              background: 'var(--primary-main, #6366f1)',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}
          >
            Undo
          </button>
        </div>
      ),
      { duration: 5000, position: 'bottom-center' }
    );

    setTimeout(async () => {
      if (!isUndone) {
        try {
          await notificationsAPI.deleteNotification(notificationId);
        } catch (error) {
          console.error('Failed to delete notification on server:', error);
          toast.error('Could not sync deletion with server');
        }
      }
    }, 5000);
  };

  const clearAllNotifications = async () => {
    try {
      setIsDeleting(true);
      await notificationsAPI.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    } finally {
      setIsDeleting(false);
      setDeleteModalConfig(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteModalConfig?.type === 'all') {
      clearAllNotifications();
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
        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
          {unreadCount > 0 && (
            <button className="mark-all-read-button" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button className="clear-all-button" onClick={() => setDeleteModalConfig({ isOpen: true, type: 'all' })} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              Clear all
            </button>
          )}
        </div>
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
              <Avatar
                src={notif.sender.profilePicture}
                alt={notif.sender.fullName}
                name={notif.sender.fullName}
                size={40}
                className="notification-avatar"
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
              <div className="notification-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                {!notif.isRead && (
                  <button className="mark-read-button" onClick={() => markAsRead(notif._id)}>
                    <MdCheckCircle />
                  </button>
                )}
                <button className="delete-notification-button" onClick={() => deleteNotification(notif._id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <IoTrashOutline />
                </button>
              </div>
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

      <DeleteConfirmationModal
        isOpen={deleteModalConfig?.type === 'all' && deleteModalConfig?.isOpen}
        onClose={() => setDeleteModalConfig(null)}
        onConfirm={handleConfirmDelete}
        title="Clear All Notifications"
        message="Are you sure you want to clear all notifications? This action cannot be undone."
        isPending={isDeleting}
      />
    </div>
  );
};

export default NotificationsPage;
