const DB_NAME = 'NaayaMessagingDB';
const DB_VERSION = 1;

export interface CachedMessage {
    _id: string;
    conversationId: string;
    sender: any;
    content: string;
    messageType: string;
    createdAt: string;
    isRead: boolean;
    status?: 'sent' | 'sending' | 'failed';
    clientId?: string;
}

class LocalMessageCache {
    private db: IDBDatabase | null = null;

    async init() {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('messages')) {
                    const store = db.createObjectStore('messages', { keyPath: '_id' });
                    store.createIndex('conversationId', 'conversationId', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    async saveMessages(messages: CachedMessage[]) {
        if (!this.db) await this.init();
        const transaction = this.db!.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');

        messages.forEach(msg => store.put(msg));

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getMessages(conversationId: string, limit = 50): Promise<CachedMessage[]> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('conversationId');
            const request = index.getAll(conversationId);

            request.onsuccess = () => {
                const results = request.result as CachedMessage[];
                // Sort by date locally
                results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                resolve(results.slice(-limit));
            };
            request.onerror = () => reject(request.error);
        });
    }

    async clearCache() {
        if (!this.db) await this.init();
        const transaction = this.db!.transaction(['messages'], 'readwrite');
        transaction.objectStore('messages').clear();
    }
}

export const messageCache = new LocalMessageCache();
