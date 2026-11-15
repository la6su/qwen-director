import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createH3WorkflowProfile, injectH3Inputs } from '../packages/workflow-adapters/src/h3-profile.ts';

process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const [projectId, sceneId, shotId] = [randomUUID(), randomUUID(), randomUUID()];
const originalFetch = globalThis.fetch;
const graph = {
  h: { class_type: 'MiniMaxH3ReferenceToVideo', inputs: { prompt: 'Workflow template', width: 768, height: 432, length: 124 } },
  n: { class_type: 'RandomNoise', inputs: { noise_seed: 0 } },
  s: { class_type: 'SaveVideo', inputs: { filename_prefix: 'template' } },
};

try {
  await pool.query('insert into projects(id,name) values($1,$2)', [projectId, 'profile-source-smoke']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [sceneId, projectId, 'scene']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)', [shotId, sceneId, 'shot']);

  const saved = await app.inject({ method: 'POST', url: '/v1/workflow-profiles', payload: { id: 'source-smoke', name: 'Source', graph } });
  assert.equal(saved.statusCode, 201, saved.body);
  const mockSchema = Object.fromEntries(Object.values(graph).map((node) => [node.class_type, {
    input: { required: Object.fromEntries(Object.entries(node.inputs).map(([name, value]) => [name, [typeof value === 'number' ? 'INT' : typeof value === 'boolean' ? 'BOOLEAN' : 'STRING']])) }, output: [],
  }]));
  globalThis.fetch = async () => new Response(JSON.stringify(mockSchema), { status: 200 });
  const activated = await app.inject({ method: 'POST', url: '/v1/workflow-profiles/source-smoke/revisions/1/activate' });
  globalThis.fetch = originalFetch;
  assert.equal(activated.statusCode, 200, activated.body);
  assert.equal(activated.json().active, true);
  const profileState = (await pool.query("select active from workflow_profiles where id='source-smoke'")).rows[0];
  assert.equal(profileState.active, true);

  const job = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: { project: 'profile-source-smoke', scene: 'scene', shot: 'shot', projectId, sceneId, shotId, prompt: 'A quiet room reveal.', width: 768, height: 432, length: 124, seed: 42, adapterId: 'comfyui', workflowProfileId: 'source-smoke' },
  });
  assert.equal(job.statusCode, 201, job.body);

  const plan = (await pool.query('select plan_json from jobs where id=$1', [job.json().jobId])).rows[0].plan_json;
  assert.equal(plan.workflowProfile.id, 'source-smoke');
  assert.equal(plan.workflowProfile.graph.h.inputs.prompt, 'Workflow template');
  const restoredProfile = createH3WorkflowProfile(plan.workflowProfile.id, plan.workflowProfile.name, plan.workflowProfile.graph, plan.workflowProfile.referenceBindings);
  assert.equal(restoredProfile.graphHash, plan.workflowProfile.graphHash);

  const injected = injectH3Inputs(restoredProfile, {
    prompt: plan.prompt, width: plan.width, height: plan.height, length: plan.length,
    seed: plan.seed, filenamePrefix: `qwendirector/${job.json().jobId}`,
  });
  assert.equal(injected.h.inputs.prompt, plan.prompt);
  assert.equal(injected.h.inputs.length, 124);
  assert.equal(injected.n.inputs.noise_seed, 42);
  assert.equal(injected.s.inputs.filename_prefix, `qwendirector/${job.json().jobId}`);
  assert.equal(plan.workflowProfile.graph.h.inputs.prompt, 'Workflow template');
  console.log('OK: durable job restores its immutable H3 profile and injects compiled prompt, seed, and output path');
} finally {
  globalThis.fetch = originalFetch;
  await pool.query("delete from workflow_profiles where id='source-smoke'");
  await pool.query('delete from jobs where shot_id=$1', [shotId]);
  await pool.query('delete from shots where id=$1', [shotId]);
  await pool.query('delete from scenes where id=$1', [sceneId]);
  await pool.query('delete from projects where id=$1', [projectId]);
  await pool.end();
  await app.close();
}
