import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const out = process.argv[2] ?? `.data/backups/${new Date().toISOString().replaceAll(':','-')}`;
const casRoot = process.env.QWEN_ASSET_ROOT ?? '.data/assets';
await mkdir(out, { recursive: true });
await run('pg_dump', ['--format=custom', '--file', join(out, 'qwendirector.dump'), process.env.DATABASE_URL ?? 'postgresql:///qwendirector']);
const files = [];
async function walk(dir) { for (const name of await readdir(dir, { withFileTypes:true })) { const p=join(dir,name.name); if(name.isDirectory()) await walk(p); else { const b=await readFile(p); const rel=relative(casRoot,p); const target=join(out,'cas',rel.replace(/^cas[\\/]/,'')); await mkdir(dirname(target), {recursive:true}); await copyFile(p,target); files.push({ path:rel, bytes:b.byteLength, sha256:createHash('sha256').update(b).digest('hex') }); } } }
try { await walk(join(casRoot, 'cas')); } catch (e) { if (e?.code !== 'ENOENT') throw e; }
const { stdout: assetRows } = await run('psql', ['--no-psqlrc','--tuples-only','--no-align','--dbname', process.env.DATABASE_URL ?? 'postgresql:///qwendirector', '-c', "select storage_key, sha256 from asset_versions"]);
const backedUp = new Set(files.map((file) => file.path.replace(/^cas[\\/]/, '')));
const missing = assetRows.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => line.split('|')[0].replace(/^cas[\\/]/, '')).filter((path) => !backedUp.has(path));
if (missing.length) throw new Error(`BACKUP_CAS_MISSING:${missing.length}`);
const dump = await readFile(join(out, 'qwendirector.dump'));
await writeFile(join(out, 'manifest.json'), JSON.stringify({ schemaVersion:1, createdAt:new Date().toISOString(), database:{file:'qwendirector.dump',bytes:dump.byteLength,sha256:createHash('sha256').update(dump).digest('hex')}, cas:{root:casRoot, files}}, null, 2));
console.log(`OK: backup created at ${out} (${files.length} CAS files)`);
