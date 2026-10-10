import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
process.env.QWEN_STORAGE='postgres'; process.env.DATABASE_URL='postgresql:///qwendirector'; process.env.QWEN_API_AUTOSTART='false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ host:'/var/run/postgresql', database:'qwendirector' });
const parent = randomUUID(), child = randomUUID();
try {
  await pool.query(`insert into asset_versions(id,sha256,byte_size,mime_type,storage_key,provenance,asset_kind,tags) values
    ($1,repeat('a',64),1,'image/png',$3,'{}','actor','["hero"]'),($2,repeat('b',64),1,'image/png',$4,$5,'layout','["wide"]')`, [parent, child, `smoke/${parent}`, `smoke/${child}`, JSON.stringify({ derivedFromAssetVersionIds:[parent] })]);
  const response = await app.inject({ method:'GET', url:`/v1/assets/${child}/lineage` });
  assert.equal(response.statusCode, 200); const body=response.json(); assert.equal(body.assetKind,'layout'); assert.equal(body.parents[0].id,parent);
  console.log('OK: AssetVersion lineage endpoint');
} finally { await pool.query('delete from asset_versions where id=any($1::uuid[])',[ [parent,child] ]); await pool.end(); await app.close(); }
