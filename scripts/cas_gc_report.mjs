import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import databaseUrl from './lib/require-database-url.mjs';
const run = promisify(execFile);
const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
if (/_test$/i.test(databaseName) && (!process.env.QWEN_ASSET_ROOT || !process.argv.includes('--allow-test-db'))) throw new Error('CAS_GC_TEST_DATABASE_REQUIRES_EXPLICIT_ROOT_AND_ALLOW_FLAG');
const root = process.env.QWEN_ASSET_ROOT ?? '.data/assets';
const { stdout } = await run('psql', ['--no-psqlrc','--tuples-only','--no-align','--field-separator','\t',databaseUrl,'-c','select storage_key from asset_versions']);
const referenced = new Set(stdout.split('\n').map((v)=>v.trim()).filter(Boolean));
const objects=[];
async function walk(dir) { for (const entry of await readdir(dir,{withFileTypes:true})) { const p=join(dir,entry.name); if(entry.isDirectory()) await walk(p); else objects.push(relative(root,p)); } }
try { await walk(join(root,'cas')); } catch(e) { if(e?.code!=='ENOENT') throw e; }
const graceSeconds = Number(process.env.CAS_GC_GRACE_SECONDS ?? 86400);
if (!Number.isFinite(graceSeconds) || graceSeconds < 0) throw new Error('INVALID_CAS_GC_GRACE_SECONDS');
const now=Date.now(); const orphan=[];
for (const key of objects) if (!referenced.has(key)) { const info=await stat(join(root,key)); const ageSeconds=(now-info.mtimeMs)/1000; if (ageSeconds >= graceSeconds) orphan.push({key,ageSeconds:Math.floor(ageSeconds),mtime:new Date(info.mtimeMs).toISOString()}); }
console.log(JSON.stringify({mode:'dry-run',root,graceSeconds,scanned:objects.length,referenced:objects.length-(objects.filter((key)=>!referenced.has(key)).length),eligibleOrphans:orphan},null,2));
