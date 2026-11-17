import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const [projectId, sceneId, shotId, resolvedJobId, unknownJobId, nodeId, outputAssetId] = Array.from({ length:7 }, randomUUID);
const outputSha256 = 'a'.repeat(64);
const attemptIds = [];

try {
  await pool.query('insert into projects(id,name) values($1,$2)', [projectId, 'resolve']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [sceneId, projectId, 's']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)', [shotId, sceneId, 'sh']);
  await pool.query('insert into asset_versions(id,sha256,byte_size,mime_type,storage_key,provenance) values($1,$2,12,$3,$4,$5)', [outputAssetId, outputSha256, 'image/png', `smoke/${outputAssetId}.png`, { source:'smoke' }]);
  await pool.query("insert into nodes(id,instance_id,capabilities,status,heartbeat_at) values($1,'resolve','{}','online',now())", [nodeId]);
  await pool.query("insert into jobs(id,shot_id,state,plan_hash,idempotency_key,request_hash) values($1,$2,'queued','p',$3,$4),($5,$2,'queued','p',$6,$7)", [resolvedJobId, shotId, randomUUID(), randomUUID(), unknownJobId, randomUUID(), randomUUID()]);
  const { PgAttemptRepository } = await import('../apps/api/src/pg-repository.ts');
  const repo = new PgAttemptRepository(pool);

  const expired = await repo.claim(resolvedJobId, nodeId);
  attemptIds.push(expired.id);
  await pool.query("update attempts set lease_expires_at=now()-interval '1 minute' where id=$1", [expired.id]);
  await repo.reconcileExpired();
  const emptySuccess = await app.inject({ method:'POST', url:`/v1/attempts/${expired.id}/reconcile`, payload:{ decision:'success', actor:'operator', manifest:{ externalRunId:'known', outputs:[] } } });
  assert.equal(emptySuccess.statusCode, 409, 'success reconciliation must require durable output evidence');
  const badHash = await app.inject({ method:'POST', url:`/v1/attempts/${expired.id}/reconcile`, payload:{ decision:'success', actor:'operator', manifest:{ externalRunId:'known', outputs:[{ logicalName:'recovered.png', assetVersionId:outputAssetId, sha256:'b'.repeat(64), mimeType:'image/png' }] } } });
  assert.equal(badHash.statusCode, 409, 'success reconciliation must verify output hash against AssetVersion');
  const resolved = await app.inject({ method:'POST', url:`/v1/attempts/${expired.id}/reconcile`, payload:{ decision:'success', actor:'operator', manifest:{ externalRunId:'known', outputs:[{ logicalName:'recovered.png', assetVersionId:outputAssetId, sha256:outputSha256, mimeType:'image/png' }] } } });
  assert.equal(resolved.statusCode, 200);
  assert.equal((await pool.query('select state from jobs where id=$1', [resolvedJobId])).rows[0].state, 'succeeded');
  assert.equal((await pool.query('select count(*) from attempt_manifests where attempt_id=$1', [expired.id])).rows[0].count, '1');
  assert.equal((await pool.query('select asset_version_id from attempt_assets where attempt_id=$1 and logical_name=$2', [expired.id, 'recovered.png'])).rows[0].asset_version_id, outputAssetId);

  const uncertain = await repo.claim(unknownJobId, nodeId);
  attemptIds.push(uncertain.id);
  const marked = await app.inject({ method:'POST', url:`/v1/attempts/${uncertain.id}/unknown`, payload:{ fencingToken:uncertain.fencingToken, error:'lost ComfyUI submit response' } });
  assert.equal(marked.statusCode, 200);
  assert.equal((await pool.query('select state from attempts where id=$1', [uncertain.id])).rows[0].state, 'unknown');
  assert.equal((await pool.query('select state from jobs where id=$1', [unknownJobId])).rows[0].state, 'reconciling');
  const stale = await app.inject({ method:'POST', url:`/v1/attempts/${uncertain.id}/unknown`, payload:{ fencingToken:uncertain.fencingToken + 1, error:'stale worker' } });
  assert.equal(stale.statusCode, 409, 'unknown transition must enforce fencing');
  assert.equal(await repo.claimNext(nodeId), null, 'unknown attempt must prevent automatic reassignment');

  console.log('OK: unknown submit is fenced, durable, and requires manual reconciliation');
} finally {
  await pool.query('delete from attempt_manifests where attempt_id = any($1::uuid[])', [attemptIds]);
  await pool.query('delete from attempt_assets where attempt_id = any($1::uuid[])', [attemptIds]);
  await pool.query('delete from attempts where id = any($1::uuid[])', [attemptIds]);
  await pool.query('delete from asset_versions where id=$1', [outputAssetId]);
  await pool.query('delete from jobs where id = any($1::uuid[])', [[resolvedJobId, unknownJobId]]);
  await pool.query('delete from nodes where id=$1', [nodeId]);
  await pool.query('delete from shots where id=$1', [shotId]);
  await pool.query('delete from scenes where id=$1', [sceneId]);
  await pool.query('delete from projects where id=$1', [projectId]);
  await pool.end();
  await app.close();
}
