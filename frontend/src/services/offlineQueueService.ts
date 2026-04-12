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

        if (action.retryCount >= 3) {
          this.removeFromQueue(action.id);
          console.warn('Removed action from queue after max retries:', action);
        } else {
          this.saveQueueToStorage();
        }
      }
    }

    this.syncInProgress = false;
  }

  private async processAction(action: QueuedAction): Promise<void> {
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
        break;
      case 'unfollow':
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

  forceSync(): void {
    if (this.isOnline) {
      this.syncQueue();
    }
  }

  clearQueue(): void {
    this.queue = [];
    this.saveQueueToStorage();
  }
}

export const offlineQueueService = new OfflineQueueService();
