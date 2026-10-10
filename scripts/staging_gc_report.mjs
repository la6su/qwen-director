import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
const root=process.env.QWEN_ASSET_ROOT ?? '.data/assets'; const graceSeconds=Number(process.env.STAGING_GC_GRACE_SECONDS ?? 86400); if(!Number.isFinite(graceSeconds)||graceSeconds<0) throw new Error('INVALID_STAGING_GC_GRACE_SECONDS');
const now=Date.now(), stale=[];
async function walk(dir){ for(const entry of await readdir(dir,{withFileTypes:true})){ const p=join(dir,entry.name); if(entry.isDirectory()) await walk(p); else { const s=await stat(p); const age=(now-s.mtimeMs)/1000; if(age>=graceSeconds) stale.push({key:relative(root,p),ageSeconds:Math.floor(age),mtime:new Date(s.mtimeMs).toISOString()}); } } }
try{await walk(join(root,'staging'));}catch(e){if(e?.code!=='ENOENT') throw e;}
console.log(JSON.stringify({mode:'dry-run',root,graceSeconds,eligible:stale},null,2));
