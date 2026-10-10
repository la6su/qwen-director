import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { Readable } from 'node:stream';
import type { AssetStorage, StagedBlob, StorageKey } from './index.js';

/** Local-only CAS provider. Keys are relative and never expose the root path. */
export class FilesystemAssetStorage implements AssetStorage {
  constructor(private readonly root: string) {}

  private absolute(key: StorageKey): string {
    const root = resolve(this.root);
    const path = resolve(root, key);
    if (path !== root && !path.startsWith(`${root}/`)) throw new Error('INVALID_STORAGE_KEY');
    return path;
  }

  async beginStaging(attemptId: string): Promise<StorageKey> {
    if (!/^[a-zA-Z0-9_-]+$/.test(attemptId)) throw new Error('INVALID_ATTEMPT_ID');
    const key = `staging/${attemptId}/${randomUUID()}.bin`;
    await mkdir(dirname(this.absolute(key)), { recursive: true });
    return key;
  }

  async writeStaging(stagingKey: StorageKey, bytes: Uint8Array): Promise<void> {
    const path = this.absolute(stagingKey);
    if (!stagingKey.startsWith('staging/')) throw new Error('INVALID_STAGING_KEY');
    await mkdir(dirname(path), { recursive: true });
    await new Promise<void>((ok, fail) => {
      const stream = createWriteStream(path, { flags: 'wx' });
      stream.once('error', fail); stream.once('finish', ok); stream.end(bytes);
    });
  }

  async commitStaging(stagingKey: StorageKey, expectedSha256: string, mimeType = 'application/octet-stream'): Promise<StagedBlob> {
    if (!/^[a-f0-9]{64}$/.test(expectedSha256)) throw new Error('INVALID_SHA256');
    if (!stagingKey.startsWith('staging/')) throw new Error('INVALID_STAGING_KEY');
    const source = this.absolute(stagingKey);
    const digest = createHash('sha256');
    const size = (await stat(source)).size;
    for await (const chunk of createReadStream(source)) digest.update(chunk);
    if (digest.digest('hex') !== expectedSha256) { await unlink(source).catch(() => {}); throw new Error('SHA256_MISMATCH'); }
    const storageKey = `cas/${expectedSha256.slice(0, 2)}/${expectedSha256}`;
    const destination = this.absolute(storageKey);
    await mkdir(dirname(destination), { recursive: true });
    try { await rename(source, destination); }
    catch (error: any) {
      if (error?.code !== 'EEXIST') throw error;
      await unlink(source);
    }
    return { storageKey, sha256: expectedSha256, byteSize: size, mimeType };
  }
  async discardStaging(stagingKey: StorageKey): Promise<void> { if (!stagingKey.startsWith('staging/')) return; await unlink(this.absolute(stagingKey)).catch((error:any)=>{ if (error?.code !== 'ENOENT') throw error; }); }

  async openRead(storageKey: StorageKey): Promise<ReadableStream<Uint8Array>> {
    const stream = createReadStream(this.absolute(storageKey));
    return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
  }
}
