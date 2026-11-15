import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';
import pg from 'pg';

process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
const root = await mkdtemp(join(tmpdir(), 'qwendirector-h3-e2e-'));
process.env.QWEN_ASSET_ROOT = root;

const inputBytes = Buffer.from('qwendirector-input-frame-fixture');
const outputBytes = Buffer.from('qwendirector-output-video-fixture');
const inputSha = createHash('sha256').update(inputBytes).digest('hex');
const schema = {
  MiniMaxH3ReferenceToVideo: {},
  MiniMaxH3ImageToVideo: { input: { required: {
    first_frame: ['IMAGE', {}], prompt: ['STRING', {}], width: ['INT', {}], height: ['INT', {}], length: ['INT', {}],
  } }, output: ['VIDEO'] },
  LoadImage: { input: { required: { image: ['STRING', {}] } }, output: ['IMAGE'] },
  RandomNoise: { input: { required: { noise_seed: ['INT', {}] } }, output: ['NOISE'] },
  SaveVideo: { input: { required: { video: ['VIDEO', {}], filename_prefix: ['STRING', {}] } }, output: [] },
};

let uploadedReferenceBody = Buffer.alloc(0);
let submittedWorkflow;
const comfy = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  const json = (status, value) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
  if (url.pathname === '/object_info') return json(200, schema);
  if (url.pathname === '/system_stats') return json(200, { system: { comfyui_version: 'mock' } });
  if (url.pathname === '/upload/image' && req.method === 'POST') {
    uploadedReferenceBody = body;
    return json(200, { name: 'uploaded-source.png', subfolder: 'input', type: 'input' });
  }
  if (url.pathname === '/prompt' && req.method === 'POST') {
    submittedWorkflow = JSON.parse(body.toString()).prompt;
    return json(200, { prompt_id: 'mock-h3-run' });
  }
  if (url.pathname === '/history/mock-h3-run') return json(200, {
    'mock-h3-run': { status: { status_str: 'success', completed: true }, outputs: { save: { videos: [{ filename: 'take.mp4', subfolder: '', type: 'output' }] } } },
  });
  if (url.pathname === '/view') { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(outputBytes); }
  if (url.pathname === '/interrupt') return json(200, {});
  return json(404, { error: 'not found' });
});

await new Promise((resolve) => comfy.listen(0, '127.0.0.1', resolve));
const comfyUrl = `http://127.0.0.1:${comfy.address().port}`;
process.env.COMFYUI_URL = comfyUrl;
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const apiUrl = await app.listen({ host: '127.0.0.1', port: 0 });
const ids = { project: randomUUID(), scene: randomUUID(), shot: randomUUID(), input: undefined, job: undefined, node: randomUUID() };
let worker;
let workerLogs = '';

async function waitFor(predicate, message, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await predicate();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${message}${workerLogs ? `\nworker: ${workerLogs.slice(-3000)}` : ''}`);
}

try {
  await pool.query('insert into projects(id,name) values($1,$2)', [ids.project, 'h3-worker-e2e']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [ids.scene, ids.project, 'scene']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)', [ids.shot, ids.scene, 'shot']);
  const imported = await app.inject({ method: 'POST', url: '/v1/assets/import', payload: {
    logicalName: 'source.png', sha256: inputSha, mimeType: 'image/png', contentBase64: inputBytes.toString('base64'), actor: 'smoke-test', assetKind: 'reference',
  } });
  assert.equal(imported.statusCode, 201, imported.body);
  ids.input = imported.json().assetVersionId;

  const graph = {
    h: { class_type: 'MiniMaxH3ImageToVideo', inputs: { first_frame: ['image', 0], prompt: 'Workflow prompt', width: 768, height: 432, length: 56 } },
    image: { class_type: 'LoadImage', inputs: { image: 'template.png' } },
    noise: { class_type: 'RandomNoise', inputs: { noise_seed: 0 } },
    save: { class_type: 'SaveVideo', inputs: { video: ['h', 0], filename_prefix: 'template' } },
  };
  const profileId = `h3-i2va-${randomUUID()}`;
  const saved = await app.inject({ method: 'POST', url: '/v1/workflow-profiles', payload: { id: profileId, name: 'I2VA worker E2E', graph } });
  assert.equal(saved.statusCode, 201, saved.body);
  const activated = await app.inject({ method: 'POST', url: `/v1/workflow-profiles/${profileId}/revisions/1/activate` });
  assert.equal(activated.statusCode, 200, activated.body);

  const created = await app.inject({ method: 'POST', url: '/v1/director/jobs', payload: {
    project: 'h3-worker-e2e', scene: 'scene', shot: 'shot', projectId: ids.project, sceneId: ids.scene, shotId: ids.shot,
    idempotencyKey: `h3-e2e-${randomUUID()}`, prompt: 'A fixed opening frame develops into a coherent night city.',
    sound: 'Quiet room tone.', music: 'N/A', width: 768, height: 432, length: 56, seed: 27,
    adapterId: 'comfyui', workflowProfileId: profileId,
    references: [{ assetVersionId: ids.input, filename: 'source.png', type: 'image', role: 'first-frame' }],
  } });
  assert.equal(created.statusCode, 201, created.body);
  ids.job = created.json().jobId;
  const approval = await app.inject({ method: 'POST', url: `/v1/jobs/${ids.job}/approve`, payload: { planHash: created.json().planHash, actor: 'smoke-test', retryBudget: 0 } });
  assert.equal(approval.statusCode, 200, approval.body);
  assert.equal(approval.json().state, 'queued');

  const workerEnv = {
    ...process.env,
    QWEN_API_BASE_URL: apiUrl,
    QWEN_NODE_ID: ids.node,
    QWEN_INSTANCE_ID: 'h3-worker-e2e',
    QWEN_WORKER_POLL_MS: '20',
    QWEN_COMFY_POLL_MS: '10',
    QWEN_COMFY_TIMEOUT_MS: '10000',
    QWEN_ASSET_ROOT: root,
    QWEN_API_AUTOSTART: 'false',
  };
  worker = spawn(process.execPath, ['--import', 'tsx', 'apps/worker/src/main.ts'], { cwd: process.cwd(), env: workerEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  worker.stdout.on('data', (chunk) => { workerLogs = (workerLogs + chunk.toString()).slice(-5000); });
  worker.stderr.on('data', (chunk) => { workerLogs = (workerLogs + chunk.toString()).slice(-5000); });

  const finalState = await waitFor(async () => {
    const row = (await pool.query('select state from jobs where id=$1', [ids.job])).rows[0];
    return row?.state === 'succeeded' || row?.state === 'failed' || row?.state === 'cancelled' ? row.state : undefined;
  }, 'worker did not reach a terminal job state');
  if (finalState !== 'succeeded') throw new Error(`H3_WORKER_E2E_${finalState}${workerLogs ? `\nworker: ${workerLogs}` : ''}`);

  assert.ok(uploadedReferenceBody.includes(inputBytes), 'worker fetched the AssetVersion and uploaded its bytes to ComfyUI');
  assert.equal(submittedWorkflow.image.inputs.image, 'input/uploaded-source.png');
  assert.match(submittedWorkflow.h.inputs.prompt, /^For the target video, at 0\.00 seconds into the target video/);
  assert.equal(submittedWorkflow.h.inputs.width, 768);
  assert.equal(submittedWorkflow.h.inputs.height, 432);
  assert.equal(submittedWorkflow.h.inputs.length, 56);
  assert.equal(submittedWorkflow.noise.inputs.noise_seed, 27);
  assert.equal(submittedWorkflow.save.inputs.filename_prefix, `qwendirector/${ids.job}`);

  const result = await app.inject({ method: 'GET', url: `/v1/jobs/${ids.job}/result` });
  assert.equal(result.statusCode, 200, result.body);
  const output = result.json().manifest.outputs[0];
  assert.equal(output.mimeType, 'video/mp4');
  const stored = await app.inject({ method: 'GET', url: `/v1/assets/${output.assetVersionId}` });
  assert.equal(stored.statusCode, 200);
  assert.deepEqual(Buffer.from(stored.rawPayload), outputBytes);
  console.log('OK: approved I2VA job → real worker → ComfyUI protocol → CAS output and durable AssetVersion manifest');
} finally {
  if (worker && worker.exitCode === null) {
    worker.kill('SIGINT');
    await Promise.race([once(worker, 'exit'), new Promise((resolve) => setTimeout(resolve, 2000))]);
  }
  if (ids.job) {
    await pool.query('delete from attempt_manifests where attempt_id in (select id from attempts where job_id=$1)', [ids.job]);
    await pool.query('delete from attempt_assets where attempt_id in (select id from attempts where job_id=$1)', [ids.job]);
    await pool.query('delete from attempts where job_id=$1', [ids.job]);
    await pool.query('delete from approvals where job_id=$1', [ids.job]);
    await pool.query('delete from jobs where id=$1', [ids.job]);
  }
  await pool.query("delete from workflow_profiles where name='I2VA worker E2E'");
  await pool.query('delete from nodes where id=$1', [ids.node]);
  await pool.query('delete from shots where id=$1', [ids.shot]);
  await pool.query('delete from scenes where id=$1', [ids.scene]);
  await pool.query('delete from projects where id=$1', [ids.project]);
  if (ids.input) await pool.query('delete from asset_versions where id=$1', [ids.input]);
  await pool.end();
  await app.close();
  await new Promise((resolve) => comfy.close(resolve));
  await rm(root, { recursive: true, force: true });
}
