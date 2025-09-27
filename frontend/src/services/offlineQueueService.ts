interface QueuedAction {
  id: string;
  type: 'like' | 'comment' | 'post' | 'follow' | 'unfollow';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueueService {
  private queue: QueuedAction[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.loadQueueFromStorage();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('offlineQueue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue from storage:', error);
      this.queue = [];
    }
  }

  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save offline queue to storage:', error);
    }
  }

  addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): void {
    const queuedAction: QueuedAction = {
      ...action,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(queuedAction);
    this.saveQueueToStorage();

    // If online, try to sync immediately
    if (this.isOnline && !this.syncInProgress) {
      this.syncQueue();
    }
  }

  private async syncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    const actionsToProcess = [...this.queue];

    for (const action of actionsToProcess) {
      try {
        await this.processAction(action);
        this.removeFromQueue(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        action.retryCount++;

        // Remove action if it has been retried too many times
        if (action.retryCount >= 3) {
          this.removeFromQueue(action.id);
          console.warn('Removed action from queue after max retries:', action);
        } else {
          // Update retry count in storage
          this.saveQueueToStorage();
        }
      }
    }

    this.syncInProgress = false;
  }

  private async processAction(action: QueuedAction): Promise<void> {
    // Import services dynamically to avoid circular dependencies
    const { postsAPI } = await import('../services/api');

    switch (action.type) {
      case 'like':
        await postsAPI.likePost(action.data.postId);
        break;
      case 'comment':
        await postsAPI.addComment(action.data.postId, action.data.content);
        break;
      case 'post':
        await postsAPI.createPost(action.data.formData);
        break;
      case 'follow':
        // Assuming there's a follow API
        // await usersAPI.followUser(action.data.userId);
        break;
      case 'unfollow':
        // await usersAPI.unfollowUser(action.data.userId);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private removeFromQueue(actionId: string): void {
    this.queue = this.queue.filter(action => action.id !== actionId);
    this.saveQueueToStorage();
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  getSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  // Force sync (useful for manual sync button)
  forceSync(): void {
    if (this.isOnline) {
      this.syncQueue();
    }
  }

  // Clear queue (useful for debugging or manual cleanup)
  clearQueue(): void {
    this.queue = [];
    this.saveQueueToStorage();
  }
}

export const offlineQueueService = new OfflineQueueService();
