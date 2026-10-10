import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { PgAttemptRepository } from '../apps/api/src/pg-repository.ts';

const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : new pg.Pool({ host: '/var/run/postgresql', user: 'la6', database: 'qwendirector' });
const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const [project, scene, shot, job, incompatible, compatible, shot2, job2] = ids;
try {
  await pool.query('insert into projects(id,name) values($1,$2)', [project, 'multi-node smoke']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [scene, project, 'scene']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)', [shot, scene, 'shot']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,2)', [shot2, scene, 'shot 2']);
  await pool.query("insert into nodes(id,instance_id,capabilities,status,heartbeat_at) values($1,'incompatible','{\"h3\":false}', 'online', now()),($2,'compatible','{\"h3\":true}', 'online', now())", [incompatible, compatible]);
  await pool.query("insert into jobs(id,shot_id,state,plan_hash,idempotency_key,request_hash,required_capabilities,adapter_id,plan_json) values($1,$2,'queued','p','k','r','{\"h3\":true}','comfyui','{}')", [job, shot]);
  const repo = new PgAttemptRepository(pool);
  assert.equal(await repo.claimNext(incompatible), null);
  const attempt = await repo.claimNext(compatible);
  assert.equal(attempt?.jobId, job);
  await pool.query("insert into jobs(id,shot_id,state,plan_hash,idempotency_key,request_hash,required_capabilities,adapter_id,plan_json) values($1,$2,'queued','p2','k2','r2','{\"h3\":true}','comfyui','{}')", [job2, shot2]);
  assert.equal(await repo.claimNext(compatible), null);
  console.log('OK: capability-aware multi-node claim fences incompatible node and single-delivers job');
} finally {
  await pool.query('delete from attempts where job_id=$1', [job]);
  await pool.query('delete from jobs where id in ($1,$2)', [job, job2]);
  await pool.query('delete from nodes where id in ($1,$2)', [incompatible, compatible]);
  await pool.query('delete from shots where id=$1', [shot]);
  await pool.query('delete from shots where id=$1', [shot2]);
  await pool.query('delete from scenes where id=$1', [scene]);
  await pool.query('delete from projects where id=$1', [project]);
  await pool.end();
}
