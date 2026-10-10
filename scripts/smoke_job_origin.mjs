import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
process.env.QWEN_STORAGE='postgres'; process.env.DATABASE_URL='postgresql:///qwendirector'; process.env.QWEN_API_AUTOSTART='false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ host:'/var/run/postgresql', database:'qwendirector' });
const [project, scene, shot] = [randomUUID(), randomUUID(), randomUUID()];
try {
  await pool.query('insert into projects(id,name) values($1,$2)', [project, 'origin-smoke']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [scene, project, 'scene']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)', [shot, scene, 'shot']);
  const response = await app.inject({ method:'POST', url:'/v1/director/jobs', payload:{ project:'origin-smoke', scene:'scene', shot:'shot', projectId:project, sceneId:scene, shotId:shot, prompt:'origin', adapterId:'llama.cpp', origin:'lab', idempotencyKey:`origin-smoke:${randomUUID()}` } });
  assert.equal(response.statusCode, 201, response.body);
  const row = (await pool.query('select origin from jobs where id=$1', [response.json().jobId])).rows[0];
  assert.equal(row.origin, 'lab');
  console.log('OK: job origin persists as lab');
} finally {
  await pool.query('delete from jobs where shot_id=$1', [shot]);
  await pool.query('delete from shots where id=$1', [shot]);
  await pool.query('delete from scenes where id=$1', [scene]);
  await pool.query('delete from projects where id=$1', [project]);
  await pool.end(); await app.close();
}
