import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
process.env.QWEN_LLAMA_URL = 'http://local-llm.test';
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).endsWith('/v1/models')) return new Response(JSON.stringify({ data:[{id:'qwen-smoke'}] }), {status:200});
  if (String(url).endsWith('/v1/chat/completions')) return new Response(JSON.stringify({ model:'qwen-smoke', choices:[{message:{content:JSON.stringify({prompt:'A shot.',camera:'Locked.',action:'Still.',composition:'Wide.',lighting:'Soft.',sound:'Room tone.',music:'N/A',transition:'Cut.'})}}] }), {status:200});
  return originalFetch(url, init);
};
const { app } = await import('../apps/api/src/index.ts');
const { Pool } = pg;
const pool = new Pool({connectionString:process.env.DATABASE_URL});
let sessionId;
try {
  const base = await app.listen({host:'127.0.0.1',port:0});
  const created = await fetch(`${base}/v1/planner/sessions`, {method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  const createdText = await created.text();
  assert.equal(created.status,201,createdText);
  const session = JSON.parse(createdText);
  sessionId = session.id;
  const planned = await fetch(`${base}/v1/planner/assist`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:'A room',message:'Сделай камеру ниже.',sessionId:session.id})});
  const plannedText = await planned.text();
  assert.equal(planned.status,200,plannedText);
  assert.deepEqual(JSON.parse(plannedText).provenance.toolsUsed,[]);
  const stored = await fetch(`${base}/v1/planner/sessions/${session.id}`);
  assert.equal(stored.status,200);
  const record = await stored.json();
  assert.equal(Number(record.version),1);
  assert.deepEqual(record.turns.map((turn)=>turn.role),['user','assistant']);
  assert.equal(record.turns[0].content,'Сделай камеру ниже.');
  const { PgAttemptRepository } = await import('../apps/api/src/pg-repository.ts');
  const repository = new PgAttemptRepository(pool);
  await assert.rejects(() => repository.appendDirectorSessionExchange(session.id,0,'stale','stale',{}), /DIRECTOR_SESSION_VERSION_CONFLICT/);
  console.log('OK: PostgreSQL Director sessions persist exchanges and reject stale versions');
} finally {
  globalThis.fetch = originalFetch;
  await app.close();
  if (sessionId) await pool.query('delete from director_agent_sessions where id=$1', [sessionId]);
  await pool.end();
}
