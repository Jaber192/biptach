// No supabase import needed for IndexedDB

// Define the database schema
export interface WorkOrder {
  id: string;
  company_id: string;
  customer_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  job_type: string;
  scheduled_at: string;
  created_at: string;
  updated_at: string;
  technician_id?: string;
  signature_storage_id?: string;
  photos?: string[];
  notes?: string;
  is_offline?: boolean;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
  is_offline?: boolean;
}

export interface Technician {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
  is_offline?: boolean;
}

export interface Notification {
  id: string;
  company_id: string;
  user_id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  is_offline?: boolean;
}

// Initialize IndexedDB
export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "biptach-offline-db";
  private readonly DB_VERSION = 1;

  constructor() {
    this.initDB();
  }

  private initDB(): void {
    const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
    };

    request.onsuccess = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores
      if (!db.objectStoreNames.contains("work_orders")) {
        const workOrdersStore = db.createObjectStore("work_orders", { keyPath: "id" });
        workOrdersStore.createIndex("company_id", "company_id", { unique: false });
        workOrdersStore.createIndex("status", "status", { unique: false });
        workOrdersStore.createIndex("scheduled_at", "scheduled_at", { unique: false });
      }
      
      if (!db.objectStoreNames.contains("customers")) {
        const customersStore = db.createObjectStore("customers", { keyPath: "id" });
        customersStore.createIndex("company_id", "company_id", { unique: false });
      }
      
      if (!db.objectStoreNames.contains("technicians")) {
        const techniciansStore = db.createObjectStore("technicians", { keyPath: "id" });
        techniciansStore.createIndex("company_id", "company_id", { unique: false });
      }
      
      if (!db.objectStoreNames.contains("notifications")) {
        const notificationsStore = db.createObjectStore("notifications", { keyPath: "id" });
        notificationsStore.createIndex("company_id", "company_id", { unique: false });
        notificationsStore.createIndex("user_id", "user_id", { unique: false });
        notificationsStore.createIndex("read", "read", { unique: false });
      }

      if (!db.objectStoreNames.contains("profiles")) {
        db.createObjectStore("profiles", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("companies")) {
        db.createObjectStore("companies", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("sync_queue")) {
        const syncQueueStore = db.createObjectStore("sync_queue", { keyPath: "id" });
        syncQueueStore.createIndex("status", "status", { unique: false });
        syncQueueStore.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  }

  private getTransaction(storeName: string, mode: IDBTransactionMode = "readonly"): IDBTransaction {
    if (!this.db) {
      throw new Error("IndexedDB not initialized");
    }
    return this.db.transaction([storeName], mode);
  }

  // Generic CRUD methods
  async add<T>(storeName: string, data: T): Promise<string> {
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(storeName);
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(storeName);
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async update<T>(storeName: string, id: string, data: Partial<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          const updatedData = { ...request.result, ...data };
          const updateRequest = store.put(updatedData);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error(`Record not found: ${id}`));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.getTransaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Helper methods for offline sync
  async markAsOffline<T>(storeName: string, id: string): Promise<void> {
    await this.update<T>(storeName, id, { is_offline: true } as unknown as Partial<T>);
  }

  async getOfflineRecords<T>(storeName: string): Promise<T[]> {
    const allRecords = await this.getAll<T>(storeName);
    return allRecords.filter(record => (record as any).is_offline === true);
  }

  async removeOfflineFlag<T>(storeName: string, id: string): Promise<void> {
    await this.update<T>(storeName, id, { is_offline: false } as unknown as Partial<T>);
  }

  // --- Sync Queue helpers ---
  async addQueueOperation<T>(operation: T): Promise<string> {
    return this.add("sync_queue", operation);
  }

  async getQueueOperations<T>(): Promise<T[]> {
    return this.getAll("sync_queue");
  }

  async removeQueueOperation(id: string): Promise<void> {
    return this.delete("sync_queue", id);
  }

  async clearQueue(): Promise<void> {
    return this.clear("sync_queue");
  }

  // --- Cache seeding helpers ---
  async seedStore<T extends { id: string }>(storeName: string, records: T[]): Promise<void> {
    const tx = this.getTransaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    for (const record of records) {
      store.put(record);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async isStoreEmpty(storeName: string): Promise<boolean> {
    const count = await new Promise<number>((resolve, reject) => {
      const tx = this.getTransaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return count === 0;
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();