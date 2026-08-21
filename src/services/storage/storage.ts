import { openDB } from 'idb';
import type { AppData } from '../../types/finance';

export interface StorageProvider {
  load(): Promise<AppData | undefined>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

const dbPromise = openDB('northstar-finance', 1, {
  upgrade(database) {
    database.createObjectStore('app');
  }
});

export class IndexedDbStorageProvider implements StorageProvider {
  async load() { return (await dbPromise).get('app', 'portfolio') as Promise<AppData | undefined>; }
  async save(data: AppData) { await (await dbPromise).put('app', data, 'portfolio'); }
  async clear() { await (await dbPromise).delete('app', 'portfolio'); }
}

export class SupabaseStorageProvider implements StorageProvider {
  async load(): Promise<AppData | undefined> { throw new Error('Sync is not configured. Local data is unchanged.'); }
  async save(_data: AppData): Promise<void> { throw new Error('Sync is not configured. Local data is unchanged.'); }
  async clear(): Promise<void> { throw new Error('Sync is not configured. Local data is unchanged.'); }
}

export const localStorageProvider = new IndexedDbStorageProvider();
