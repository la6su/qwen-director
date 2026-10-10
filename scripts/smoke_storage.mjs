import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { FilesystemAssetStorage } from '../packages/storage/src/index.ts';

const root = await mkdtemp(join(tmpdir(), 'qwendirector-storage-'));
try {
  const storage = new FilesystemAssetStorage(root);
  const bytes = new TextEncoder().encode('director-cas-smoke');
  const sha = createHash('sha256').update(bytes).digest('hex');
  const staging = await storage.beginStaging('attempt-1');
  await storage.writeStaging(staging, bytes);
  const blob = await storage.commitStaging(staging, sha, 'text/plain');
  assert.equal(blob.byteSize, bytes.byteLength); assert.equal(blob.storageKey, `cas/${sha.slice(0, 2)}/${sha}`);
  const received = Buffer.from(await new Response(await storage.openRead(blob.storageKey)).arrayBuffer());
  assert.deepEqual(received, Buffer.from(bytes));
  const bad = await storage.beginStaging('attempt-2'); await storage.writeStaging(bad, bytes);
  await assert.rejects(() => storage.commitStaging(bad, '0'.repeat(64)), /SHA256_MISMATCH/); await storage.discardStaging(bad); await assert.rejects(() => access(join(root,bad)));
  console.log('OK: filesystem staging → hash validation → atomic CAS read');
} finally { await rm(root, { recursive: true, force: true }); }
