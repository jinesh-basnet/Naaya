import React, { useState, useEffect } from 'react';
import { FaBell, FaTimes } from 'react-icons/fa';
import { BsBellSlash } from 'react-icons/bs';
import toast from 'react-hot-toast';
import './PushNotification.css';

interface PushNotificationProps {
  conversationId: string;
}

const PushNotification: React.FC<PushNotificationProps> = ({ conversationId }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Check if already subscribed
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notifications enabled!');
        await subscribeToNotifications();
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
    }
  };

  const subscribeToNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      // You'll need to implement this on your backend
      // const response = await fetch('/api/notifications/vapid-public-key');
      // const vapidPublicKey = await response.text();

      // Fetch VAPID public key from backend
      const response = await fetch('/api/notifications/subscribe', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const keyData = await response.json();
      const vapidPublicKey = keyData.publicKey;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to backend
      await fetch('/api/notifications/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...subscription.toJSON(),
          conversationId // Optional: Can be used for filtering
        })
      });

      setIsSubscribed(true);
      toast.success('Successfully subscribed to notifications!');
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      toast.error('Failed to subscribe to notifications');
    }
  };

  const unsubscribeFromNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notify backend
        const token = localStorage.getItem('token');
        if (token) {
          await fetch('/api/notifications/unsubscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ conversationId })
          });
        }

        setIsSubscribed(false);
        toast.success('Unsubscribed from notifications');
      }
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      toast.error('Failed to unsubscribe from notifications');
    }
  };

  const testNotification = () => {
    if (permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from the chat app!',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
      toast.success('Test notification sent!');
    } else {
      toast.error('Notifications are not enabled');
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!isSupported) {
    return null; // Don't render if notifications aren't supported
  }

  return (
    <>
      <div className="push-notification">
        <button
          className="notification-toggle"
          onClick={() => setShowSettings(!showSettings)}
          title={isSubscribed ? 'Notification settings' : 'Enable notifications'}
        >
          {isSubscribed ? <FaBell /> : <BsBellSlash />}
        </button>

        {showSettings && (
          <div className="notification-settings">
            <div className="settings-header">
              <h4>Push Notifications</h4>
              <button
                className="close-settings"
                onClick={() => setShowSettings(false)}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="settings-content">
              {permission === 'default' && (
                <div className="permission-section">
                  <p>Get notified when you receive new messages</p>
                  <small>We'll ask for your permission to send notifications</small>
                  <button
                    className="enable-notifications-btn"
                    onClick={requestPermission}
                  >
                    Enable Notifications
                  </button>
                </div>
              )}

              {permission === 'denied' && (
                <div className="permission-section">
                  <p>Notifications are blocked</p>
                  <small>Please enable notifications in your browser settings</small>
                </div>
              )}

              {permission === 'granted' && (
                <div className="subscription-status">
                  <span className={`status-indicator ${isSubscribed ? 'active' : 'inactive'}`}>
                    {isSubscribed ? '✓' : '○'}
                  </span>
                  <span>{isSubscribed ? 'Notifications enabled' : 'Notifications disabled'}</span>
                </div>
              )}

              {permission === 'granted' && (
                <div className="subscription-actions">
                  {!isSubscribed ? (
                    <button
                      className="subscribe-btn"
                      onClick={subscribeToNotifications}
                    >
                      Subscribe to Notifications
                    </button>
                  ) : (
                    <>
                      <button
                        className="unsubscribe-btn"
                        onClick={unsubscribeFromNotifications}
                      >
                        Unsubscribe
                      </button>
                      <button
                        className="test-notification-btn"
                        onClick={testNotification}
                      >
                        Test Notification
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PushNotification;
