import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
process.env.QWEN_STORAGE='postgres'; process.env.DATABASE_URL='postgresql:///qwendirector'; process.env.QWEN_API_AUTOSTART='false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ host:'/var/run/postgresql', user:'la6', database:'qwendirector' });
const [project, scene, shot, job, node] = Array.from({length:5}, randomUUID);
try {
  await pool.query('insert into projects(id,name) values($1,$2)', [project,'retry']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [scene,project,'scene']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)', [shot,scene,'shot']);
  await pool.query("insert into nodes(id,instance_id,capabilities,status,heartbeat_at) values($1,'retry','{}','online',now())", [node]);
  await pool.query("insert into jobs(id,shot_id,state,plan_hash,idempotency_key,request_hash) values($1,$2,'queued','p','k','r')", [job,shot]);
  await pool.query("insert into approvals(id,job_id,plan_hash,approved_by,retry_budget) values($1,$2,'p','operator',1)", [randomUUID(),job]);
  const { PgAttemptRepository } = await import('../apps/api/src/pg-repository.ts');
  const repo = new PgAttemptRepository(pool); const attempt = await repo.claim(job,node);
  await repo.fail(attempt.id, Number(attempt.fencingToken), 'TEST_FAILURE');
  const response = await app.inject({method:'POST',url:`/v1/jobs/${job}/retry`,payload:{actor:'operator'}});
  assert.equal(response.statusCode, 200); assert.equal(response.json().state, 'awaiting_approval');
  assert.equal((await pool.query('select state from jobs where id=$1',[job])).rows[0].state, 'awaiting_approval');
  console.log('OK: retry budget returns failed job to manual approval');
} finally {
  await pool.query('delete from approvals where job_id=$1',[job]); await pool.query('delete from attempts where job_id=$1',[job]); await pool.query('delete from jobs where id=$1',[job]); await pool.query('delete from nodes where id=$1',[node]); await pool.query('delete from shots where id=$1',[shot]); await pool.query('delete from scenes where id=$1',[scene]); await pool.query('delete from projects where id=$1',[project]); await pool.end(); await app.close();
}
