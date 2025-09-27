interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: { action: string; title: string; icon?: string }[];
}

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) {
      return; 
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
        this.isInitialized = true;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  async getPermissionStatus(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      console.error('Service Worker not registered');
      return null;
    }

    const token = localStorage.getItem('token');
    if (!token || token === 'false') {
      console.warn('No valid auth token found, skipping push subscription');
      return null;
    }

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

      const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to get VAPID keys:', response.status, errorData);
        return null;
      }

      const { publicKey } = await response.json();

      if (!publicKey) {
        console.error('No public key received from server');
        return null;
      }

      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey) as any
      });

      // Send subscription to server
      const subResponse = await fetch(`${API_BASE_URL}/notifications/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscription)
      });

      if (!subResponse.ok) {
        const subError = await subResponse.json().catch(() => ({}));
        console.error('Failed to save subscription:', subResponse.status, subError);
        return null;
      }

      console.log('Push subscription successful');
      return subscription;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Push subscription aborted - likely due to browser restrictions or invalid VAPID keys');
      } else if (error.name === 'NotAllowedError') {
        console.warn('Push notifications not allowed by user');
      } else if (error.name === 'InvalidStateError') {
        console.warn('Push manager not available or already subscribed');
      } else {
        console.error('Push subscription failed:', error.message || error);
      }
      return null;
    }
  }

  async showNotification(data: PushNotificationData): Promise<void> {
    if (this.swRegistration) {
      await this.swRegistration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/logo192.png',
        badge: data.badge || '/logo192.png',
        data: data.data,
        requireInteraction: true
      });
    } else {
      // Fallback to regular notification
      new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/logo192.png'
      });
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
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
  }
}

export const pushNotificationService = new PushNotificationService();
