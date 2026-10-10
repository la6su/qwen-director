import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const dir = process.argv[2]; if (!dir) throw new Error('USAGE: restore_rehearsal <backup-dir>');
const manifest = JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
const db = `qwendirector_restore_${process.pid}`;
try {
  await run('createdb', [db]);
  await run('pg_restore', ['--exit-on-error', '--dbname', db, join(dir, manifest.database.file)]);
  const { stdout } = await run('psql', ['--no-psqlrc','--tuples-only','--dbname',db,'-c',"select count(*) from information_schema.tables where table_schema='public'"]);
  const tables = Number(stdout.trim());
  if (!Number.isFinite(tables) || tables < 5) throw new Error(`RESTORE_SCHEMA_INCOMPLETE:${tables}`);
  const { stdout: rows } = await run('psql', ['--no-psqlrc','--tuples-only','--no-align','--field-separator','\t','--dbname',db,'-c',"select storage_key, sha256 from asset_versions"]);
  const restored = rows.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [storageKey, sha256] = line.split('\t');
    return { storageKey, sha256 };
  });
  const backupCasRoot = join(dir, 'cas');
  for (const asset of restored) {
    const relativePath = asset.storageKey.replace(/^cas[\\/]/, '');
    if (!relativePath || relativePath.includes('..') || relativePath.startsWith('/') || relativePath.includes('\\0')) {
      throw new Error(`RESTORE_STORAGE_KEY_INVALID:${asset.storageKey}`);
    }
    const bytes = await readFile(join(backupCasRoot, relativePath));
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== asset.sha256) throw new Error(`RESTORE_ASSET_HASH_MISMATCH:${asset.storageKey}`);
  }
  console.log(`OK: restore rehearsal completed in isolated database (${tables} public tables, ${restored.length} AssetVersion CAS links verified)`);
} finally { await run('dropdb', ['--if-exists', db]).catch(() => {}); }
