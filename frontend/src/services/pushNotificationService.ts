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
        await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered successfully');

        this.swRegistration = await navigator.serviceWorker.ready;
        console.log('Service Worker is ready and active');

        this.isInitialized = true;
      } catch (error) {
        console.error('Service Worker initialization failed:', error);
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
      console.warn('Cannot subscribe: Service Worker registration not found');
      await this.init();
      if (!this.swRegistration) return null;
    }

    const token = localStorage.getItem('token');
    if (!token || token === 'false') {
      console.warn('No valid auth token found, skipping push subscription');
      return null;
    }

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api';

      console.log('Fetching VAPID public key...');
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

      console.log('Got VAPID key, subscribing...');

      const serverKey = this.urlBase64ToUint8Array(publicKey);

      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: serverKey as any
      });

      console.log('Browser subscription successful, saving to server...');

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
        console.error('Failed to save subscription to server:', subResponse.status, subError);
        return null;
      }

      console.log('Push subscription fully established');
      return subscription;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Push subscription aborted: Use HTTPS OR check if permissions are blocked on localhost. Error details:', error);
      } else if (error.name === 'NotAllowedError') {
        console.warn('Push notifications permission denied by user');
      } else if (error.name === 'InvalidStateError') {
        console.warn('Push manager state error - maybe already subscribed or SW not active');
      } else {
        console.error('Push subscription failed with unexpected error:', error.name, error.message);
      }
      return null;
    }
  }

  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.swRegistration) {
      return false;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Unsubscribed from push notifications in browser');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }

  async showNotification(data: PushNotificationData): Promise<void> {
    if (this.swRegistration) {
      await this.swRegistration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/logo192.svg',
        badge: data.badge || '/logo192.svg',
        data: data.data,
        requireInteraction: true
      });
    } else {
      new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/logo192.svg'
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
