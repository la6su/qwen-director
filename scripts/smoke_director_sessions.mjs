import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
process.env.QWEN_LLAMA_URL = 'http://local-llm.test';
process.env.QWEN_LLAMA_MODEL = 'qwen-smoke';
const originalFetch = globalThis.fetch;
const completionRequests = [];
const continuityAudit = {
  status: 'review-required',
  checks: Object.fromEntries(['shotScale','cameraAxis','screenDirection','actionPhase','focalCenter','lightingColorBridge','motionTempo'].map((id) => [id, { result: 'review', note: `Сверить ${id} с соседними шотами.` }])),
};
globalThis.fetch = async (url, init = {}) => {
  if (String(url).endsWith('/v1/models')) return new Response(JSON.stringify({ data: [{ id: 'qwen-smoke' }] }), { status: 200 });
  if (String(url).endsWith('/v1/chat/completions')) {
    completionRequests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({
      model: 'qwen-smoke',
      choices: [{ message: { content: JSON.stringify({ sections: { prompt: 'A shot.', camera: 'Locked.', action: 'Still.', composition: 'Wide.', lighting: 'Soft.', sound: 'Room tone.', music: 'N/A', transition: 'Cut.' }, continuityAudit }) } }],
    }), { status: 200 });
  }
  return originalFetch(url, init);
};

const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const [projectId, sceneId, previousShotId, focusedShotId, nextShotId, otherShotId, assetId, otherProjectId, otherSceneId] = Array.from({ length: 9 }, () => randomUUID());
let sessionId;
let projectSessionId;

try {
  await pool.query('insert into projects(id,name) values($1,$2)', [projectId, 'planner-shot-context-smoke']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [sceneId, projectId, 'night studio']);
  for (const [id, title, position, prompt] of [
    [previousShotId, 'Screen insert', 1, { prompt: 'A dark screen with one cyan arc.' }],
    [focusedShotId, 'Creator chooses a frame', 2, { prompt: 'Creator studies two candidate frames.', camera: 'Three-quarter close shot.' }],
    [nextShotId, 'Chosen world begins', 3, { prompt: 'The selected frame opens into one world.' }],
  ]) {
    await pool.query(
      'insert into shots(id,scene_id,title,position,duration_seconds,director_prompt) values($1,$2,$3,$4,5,$5)',
      [id, sceneId, title, position, prompt],
    );
  }
  await pool.query('insert into projects(id,name) values($1,$2)', [otherProjectId, 'unrelated']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [otherSceneId, otherProjectId, 'other scene']);
  await pool.query('insert into shots(id,scene_id,title,position,duration_seconds) values($1,$2,$3,1,5)', [otherShotId, otherSceneId, 'Unrelated shot']);
  await pool.query(
    "insert into asset_versions(id,sha256,byte_size,mime_type,storage_key,provenance,asset_kind,tags) values($1,$2,1,'image/png',$3,'{}','reference','[]')",
    [assetId, assetId.replaceAll('-', '').padEnd(64, 'a'), `planner-smoke/${assetId}`],
  );
  await pool.query(
    'insert into shot_reference_assets(shot_id,asset_version_id,position,logical_name,media_type,role) values($1,$2,1,$3,$4,$5)',
    [focusedShotId, assetId, 'face-anchor.png', 'image', 'actor'],
  );

  const base = await app.listen({ host: '127.0.0.1', port: 0 });
  const created = await fetch(`${base}/v1/planner/sessions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  const createdText = await created.text();
  assert.equal(created.status, 201, createdText);
  sessionId = JSON.parse(createdText).id;
  const planned = await fetch(`${base}/v1/planner/assist`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'A room', message: 'Сделай камеру ниже.', sessionId }),
  });
  const plannedText = await planned.text();
  assert.equal(planned.status, 200, plannedText);
  assert.deepEqual(JSON.parse(plannedText).provenance.toolsUsed, []);
  const storedResponse = await fetch(`${base}/v1/planner/sessions/${sessionId}`);
  assert.equal(storedResponse.status, 200);
  const record = await storedResponse.json();
  assert.equal(Number(record.version), 1);
  assert.deepEqual(record.turns.map((turn) => turn.role), ['user', 'assistant']);
  assert.equal(record.turns[0].content, 'Сделай камеру ниже.');
  const { PgAttemptRepository } = await import('../apps/api/src/pg-repository.ts');
  const repository = new PgAttemptRepository(pool);
  await assert.rejects(() => repository.appendDirectorSessionExchange(sessionId, 0, 'stale', 'stale', {}), /DIRECTOR_SESSION_VERSION_CONFLICT/);

  const projectSession = await fetch(`${base}/v1/planner/sessions`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId }),
  });
  assert.equal(projectSession.status, 201);
  projectSessionId = (await projectSession.json()).id;
  const focused = await fetch(`${base}/v1/planner/assist`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'Creator studies two candidate frames.', message: 'Учитывай утверждённые references и соседние шоты.', sessionId: projectSessionId, shotId: focusedShotId }),
  });
  const focusedText = await focused.text();
  assert.equal(focused.status, 200, focusedText);
  const focusedResult = JSON.parse(focusedText);
  assert.ok(focusedResult.decisionHash);
  assert.equal(focusedResult.continuityAudit.status, 'review-required');
  assert.deepEqual(focusedResult.provenance.toolsUsed, ['list_active_workflows', 'read_selected_project', 'read_selected_shot', 'read_shot_references', 'read_adjacent_shots']);
  const contextMessage = completionRequests.at(-1).messages.find((message) => String(message.content).startsWith('Read-only tool results'));
  assert.ok(contextMessage, 'planner receives read-only project context');
  assert.match(contextMessage.content, /read_selected_shot/);
  assert.match(contextMessage.content, /read_shot_references/);
  const context = JSON.parse(contextMessage.content.slice(contextMessage.content.lastIndexOf(': ') + 2));
  assert.equal(context.project.focusedShot.current.shotId, focusedShotId);
  assert.equal(context.project.focusedShot.current.title, 'Creator chooses a frame');
  assert.equal(context.project.focusedShot.current.references[0].assetVersionId, assetId);
  assert.equal(context.project.focusedShot.current.references[0].role, 'actor');
  assert.equal(context.project.focusedShot.previous.shotId, previousShotId);
  assert.equal(context.project.focusedShot.next.shotId, nextShotId);

  const jobBody = {
    project: 'planner-shot-context-smoke', scene: 'night studio', shot: 'Creator chooses a frame',
    projectId, sceneId, shotId: focusedShotId, idempotencyKey: `planner-receipt:${randomUUID()}`,
    ...focusedResult.sections,
    plannerDecision: { decisionHash: focusedResult.decisionHash, sessionId: projectSessionId, continuityAudit: focusedResult.continuityAudit, provenance: focusedResult.provenance },
  };
  const jobResponse = await fetch(`${base}/v1/director/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(jobBody) });
  const jobText = await jobResponse.text();
  assert.equal(jobResponse.status, 201, jobText);
  const jobResult = JSON.parse(jobText);
  const persistedPlan = await pool.query('select plan_json from jobs where id=$1', [jobResult.jobId]);
  assert.equal(persistedPlan.rows[0].plan_json.plannerDecision.decisionHash, focusedResult.decisionHash);
  assert.deepEqual(persistedPlan.rows[0].plan_json.plannerDecision.continuityAudit, focusedResult.continuityAudit);
  assert.deepEqual(persistedPlan.rows[0].plan_json.plannerDecision.provenance.toolsUsed, focusedResult.provenance.toolsUsed);

  const staleDecision = await fetch(`${base}/v1/director/jobs`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...jobBody, idempotencyKey: `planner-stale:${randomUUID()}`, prompt: `${jobBody.prompt} manually edited` }),
  });
  assert.equal(staleDecision.status, 400);
  assert.equal((await staleDecision.json()).code, 'PLANNER_DECISION_FIELDS_MISMATCH');

  const forgedDecision = await fetch(`${base}/v1/director/jobs`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...jobBody, idempotencyKey: `planner-forged:${randomUUID()}`, plannerDecision: { ...jobBody.plannerDecision, provenance: { ...jobBody.plannerDecision.provenance, model: 'forged-model' } } }),
  });
  assert.equal(forgedDecision.status, 400);
  assert.equal((await forgedDecision.json()).code, 'PLANNER_DECISION_NOT_IN_SESSION');

  const callsBeforeInvalidShot = completionRequests.length;
  const wrongProject = await fetch(`${base}/v1/planner/assist`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'A shot', sessionId: projectSessionId, shotId: otherShotId }),
  });
  assert.equal(wrongProject.status, 404);
  assert.equal((await wrongProject.json()).code, 'PLANNER_SHOT_NOT_IN_PROJECT');
  const unboundShot = await fetch(`${base}/v1/planner/assist`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'A shot', sessionId, shotId: focusedShotId }),
  });
  assert.equal(unboundShot.status, 400);
  assert.equal((await unboundShot.json()).code, 'PLANNER_SHOT_CONTEXT_REQUIRES_PROJECT_SESSION');
  assert.equal(completionRequests.length, callsBeforeInvalidShot, 'invalid shot context must be rejected before contacting the local model');
  console.log('OK: Director sessions persist/fence turns and pass only project-scoped selected-shot, references, and adjacent-shot context');
} finally {
  globalThis.fetch = originalFetch;
  await app.close();
  if (sessionId || projectSessionId) await pool.query('delete from director_agent_sessions where id=any($1::uuid[])', [[sessionId, projectSessionId].filter(Boolean)]);
  await pool.query('delete from shot_reference_assets where shot_id=$1', [focusedShotId]);
  await pool.query("delete from jobs where idempotency_key like 'planner-receipt:%' or idempotency_key like 'planner-stale:%' or idempotency_key like 'planner-forged:%'");
  await pool.query('delete from asset_versions where id=$1', [assetId]);
  await pool.query('delete from shots where scene_id=any($1::uuid[])', [[sceneId, otherSceneId].filter(Boolean)]);
  await pool.query('delete from scenes where id=any($1::uuid[])', [[sceneId, otherSceneId].filter(Boolean)]);
  await pool.query('delete from projects where id=any($1::uuid[])', [[projectId, otherProjectId].filter(Boolean)]);
  await pool.end();
}
