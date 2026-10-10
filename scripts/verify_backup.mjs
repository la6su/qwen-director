import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const root = process.argv[2]; if (!root) throw new Error('USAGE: verify_backup <backup-dir>');
const manifest = JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
if (manifest.schemaVersion !== 1 || !manifest.database || !manifest.cas || !Array.isArray(manifest.cas.files)) throw new Error('BACKUP_MANIFEST_UNSUPPORTED');
const dump = await readFile(join(root,manifest.database.file));
if (dump.byteLength !== manifest.database.bytes || createHash('sha256').update(dump).digest('hex') !== manifest.database.sha256) throw new Error('BACKUP_DATABASE_HASH_MISMATCH');
const casRoot = process.env.QWEN_BACKUP_CAS_ROOT ?? join(root, 'cas');
let checked = 0;
for (const file of manifest.cas.files) {
  const relativePath = file.path.replace(/^cas[\\/]/, '');
  if (!relativePath || relativePath.includes('..') || relativePath.startsWith('/') || relativePath.includes('\\0')) throw new Error(`BACKUP_CAS_PATH_INVALID:${file.path}`);
  const bytes = await readFile(join(casRoot, relativePath));
  const digest = createHash('sha256').update(bytes).digest('hex');
  const keyDigest = relativePath.split(/[\\/]/).pop();
  if (!/^[a-f0-9]{64}$/.test(keyDigest) || keyDigest !== file.sha256 || digest !== file.sha256 || bytes.byteLength !== file.bytes) throw new Error(`BACKUP_CAS_HASH_MISMATCH:${file.path}`);
  checked++;
}
console.log(`OK: backup manifest verified (database + ${checked} CAS records)`);
