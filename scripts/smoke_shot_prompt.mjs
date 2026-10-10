import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
process.env.QWEN_STORAGE='postgres'; process.env.QWEN_API_AUTOSTART='false'; process.env.DATABASE_URL ??= 'postgresql:///qwendirector';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({host:'/var/run/postgresql',user:process.env.PGUSER ?? 'la6',database:'qwendirector'});
const project=(await app.inject({method:'POST',url:'/v1/projects',payload:{name:`prompt-${randomUUID()}`}})).json();
try {
  const scene=(await app.inject({method:'POST',url:`/v1/projects/${project.id}/scenes`,payload:{title:'Scene'}})).json();
  const shot=(await app.inject({method:'POST',url:`/v1/scenes/${scene.id}/shots`,payload:{title:'Shot',durationSeconds:5}})).json();
  const saved=await app.inject({method:'PATCH',url:`/v1/shots/${shot.id}/prompt`,payload:{prompt:'locked camera',camera:'35mm',action:'slow reveal',composition:'wide',lighting:'low key',sound:'room tone',transition:'cut'}});
  assert.equal(saved.statusCode,200); assert.equal(saved.json().prompt_revision,2); assert.equal(saved.json().plan_revision,2);
  const timeline=(await app.inject({method:'GET',url:`/v1/projects/${project.id}/timeline`})).json(); const stored=timeline.scenes[0].shots[0];
  assert.equal(stored.prompt.prompt,'locked camera'); assert.equal(stored.prompt.camera,'35mm'); assert.equal(stored.promptRevision,2);
  const invalid=await app.inject({method:'PATCH',url:`/v1/shots/${shot.id}/prompt`,payload:[]}); assert.equal(invalid.statusCode,400);
  console.log('OK: shot prompt draft persists with revision and read-model');
} finally {
  await pool.query('delete from jobs where shot_id in (select id from shots where scene_id in (select id from scenes where project_id=$1))',[project.id]);
  await pool.query('delete from shots where scene_id in (select id from scenes where project_id=$1)',[project.id]);
  await pool.query('delete from scenes where project_id=$1',[project.id]);
  await pool.query('delete from projects where id=$1',[project.id]); await pool.end(); await app.close();
}
