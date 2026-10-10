import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run=promisify(execFile); const dir=process.argv[2]; if(!dir) throw new Error('USAGE: verify_backup_catalog <backup-dir>');
const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8')); const {stdout}=await run('pg_restore',['--list',join(dir,manifest.database.file)]);
const required=['projects','scenes','shots','jobs','attempts','asset_versions','workflow_profiles','workflow_profile_revisions','attempt_manifests'];
const missing=required.filter((name)=>!stdout.includes(`TABLE public ${name}`)); if(missing.length) throw new Error(`BACKUP_CATALOG_MISSING:${missing.join(',')}`);
console.log(`OK: backup catalog contains ${required.length} required tables`);
