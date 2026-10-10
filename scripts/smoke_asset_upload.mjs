import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
process.env.QWEN_STORAGE='postgres'; process.env.DATABASE_URL='postgresql:///qwendirector'; process.env.QWEN_API_AUTOSTART='false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ host:'/var/run/postgresql', database:'qwendirector' });
const [project, scene, shot, job, node] = Array.from({length:5}, randomUUID);
const bytes = Buffer.from('asset-upload-smoke'); const sha256 = createHash('sha256').update(bytes).digest('hex');
try {
  await pool.query('insert into projects(id,name) values($1,$2)',[project,'asset smoke']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)',[scene,project,'scene']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)',[shot,scene,'shot']);
  await pool.query("insert into nodes(id,instance_id,capabilities,status,heartbeat_at) values($1,'asset-smoke','{}','online',now())",[node]);
  await pool.query("insert into jobs(id,shot_id,state,plan_hash,idempotency_key,request_hash) values($1,$2,'queued','p','k','r')",[job,shot]);
  const { PgAttemptRepository } = await import('../apps/api/src/pg-repository.ts'); const repo = new PgAttemptRepository(pool); const attempt = await repo.claim(job,node);
  const post=(url,payload)=>app.inject({method:'POST',url,payload});
  const uploaded=await post(`/v1/attempts/${attempt.id}/assets`,{fencingToken:Number(attempt.fencingToken),logicalName:'take-01.txt',sha256,mimeType:'text/plain',contentBase64:bytes.toString('base64')});
  assert.equal(uploaded.statusCode,201,uploaded.body); assert.equal(uploaded.json().sha256,sha256);
  assert.equal((await pool.query('select count(*) from attempt_assets where attempt_id=$1',[attempt.id])).rows[0].count,'1');
  await repo.commit(attempt.id, Number(attempt.fencingToken), { outputs: [{ logicalName: 'take-01.txt' }] });
  const evidence = await repo.getManifest(attempt.id); assert.equal(evidence.manifest.outputs[0].assetVersionId, uploaded.json().assetVersionId);
  const stale=await post(`/v1/attempts/${attempt.id}/assets`,{fencingToken:0,logicalName:'stale',sha256,mimeType:'text/plain',contentBase64:bytes.toString('base64')}); assert.equal(stale.statusCode,409);
  console.log('OK: API asset upload → SHA validation → AssetVersion + attempt link');
} finally { await pool.query('delete from attempt_manifests where attempt_id in(select id from attempts where job_id=$1)',[job]); await pool.query('delete from attempt_assets where attempt_id in(select id from attempts where job_id=$1)',[job]); await pool.query('delete from asset_versions where sha256=$1',[sha256]); await pool.query('delete from attempts where job_id=$1',[job]); await pool.query('delete from jobs where id=$1',[job]); await pool.query('delete from nodes where id=$1',[node]); await pool.query('delete from shots where id=$1',[shot]); await pool.query('delete from scenes where id=$1',[scene]); await pool.query('delete from projects where id=$1',[project]); await pool.end(); await app.close(); }
