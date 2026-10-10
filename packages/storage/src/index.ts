export type StorageKey = string;

export interface StagedBlob {
  storageKey: StorageKey;
  sha256: string;
  byteSize: number;
  mimeType: string;
}

export interface AssetStorage {
  beginStaging(attemptId: string): Promise<StorageKey>;
  commitStaging(stagingKey: StorageKey, expectedSha256: string, mimeType?: string): Promise<StagedBlob>;
  discardStaging?(stagingKey: StorageKey): Promise<void>;
  openRead(storageKey: StorageKey): Promise<ReadableStream<Uint8Array>>;
}

export { FilesystemAssetStorage } from './filesystem.js';
