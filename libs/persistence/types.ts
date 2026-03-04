export interface PersistenceOptions {
  storageDir?: string;
}

export interface PersistedData<T = unknown> {
  data: T;
  timestamp: number;
  checksum: string;
}
