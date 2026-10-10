import { Pool } from 'pg';
import { InMemoryAttemptRepository } from './repository.js';
import { PgAttemptRepository } from './pg-repository.js';
import { PgNodeRepository } from './pg-nodes.js';
import { FilesystemAssetStorage } from '@qwendirector/storage';

export function createAttemptRepository() {
  if ((process.env.QWEN_STORAGE ?? 'memory') === 'postgres') {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required when QWEN_STORAGE=postgres');
    const url = process.env.DATABASE_URL;
    const pool = url === 'postgresql:///qwendirector'
      ? new Pool({ host: '/var/run/postgresql', user: process.env.PGUSER ?? 'la6', database: 'qwendirector', max: 5 })
      : new Pool({ connectionString: url, max: 5 });
    return new PgAttemptRepository(pool);
  }
  return new InMemoryAttemptRepository();
}

export function createNodeRepository() {
  if ((process.env.QWEN_STORAGE ?? 'memory') !== 'postgres') return null;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required when QWEN_STORAGE=postgres');
  const url = process.env.DATABASE_URL;
  const pool = url === 'postgresql:///qwendirector'
    ? new Pool({ host: '/var/run/postgresql', user: process.env.PGUSER ?? 'la6', database: 'qwendirector', max: 5 })
    : new Pool({ connectionString: url, max: 5 });
  return new PgNodeRepository(pool);
}

export function createAssetStorage() {
  return new FilesystemAssetStorage(process.env.QWEN_ASSET_ROOT ?? '.data/assets');
}
