import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';

process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
const tempRoot = await mkdtemp(join(tmpdir(), 'qwendirector-refmod-e2e-'));
const assetRoot = join(tempRoot, 'cas');
const refmodRoot = join(tempRoot, 'models', 'refmods');
await mkdir(join(refmodRoot, 'QwenDirector'), { recursive: true });
process.env.QWEN_ASSET_ROOT = assetRoot;
process.env.QWEN_COMFY_REFMODS_ROOT = refmodRoot;

const expectedName = `qd_${randomUUID().replaceAll('-', '_')}`;
const refmodBytes = Buffer.from('durable RefMod safetensors fixture');
const refmodPath = join(refmodRoot, 'QwenDirector', `${expectedName}.safetensors`);
await writeFile(refmodPath, refmodBytes);

const { app } = await import('../apps/api/src/index.ts');
const { execute } = await import('../apps/worker/src/executor.ts');
const { HttpExecutionHooks } = await import('../apps/worker/src/http-hooks.ts');
const { ComfyWorkbenchExecutor } = await import('@qwendirector/workflow-adapters/executors');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const apiBase = await app.listen({ host: '127.0.0.1', port: 0 });
const [project, scene, shot, job, node] = Array.from({ length: 5 }, randomUUID);
const creatorInput = { folder: 'qwendirector_refmods/smoke-attempt', use_subfolders: false, use_folder_as_name: false, name: expectedName, save: true, save_layout: 'bundle', subfolder: 'QwenDirector', description: 'fixture', vae: ['vae', 0] };
const graph = {
  vae: { class_type: 'VAELoader', inputs: { vae_name: 'fixture.safetensors' } },
  creator: { class_type: 'H3RefModCreateFromFolder', inputs: creatorInput },
};
const schema = {
  VAELoader: { input: { required: { vae_name: ['STRING'] } }, output: ['VAE'] },
  H3RefModCreateFromFolder: { input: { required: { folder: ['STRING'], use_subfolders: ['BOOLEAN'], use_folder_as_name: ['BOOLEAN'], name: ['STRING'], save: ['BOOLEAN'], save_layout: ['STRING'], subfolder: ['STRING'], description: ['STRING'], vae: ['VAE'] } }, output: [] },
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.origin === apiBase) return originalFetch(input, init);
  if (url.pathname === '/object_info') return Response.json(schema);
  if (url.pathname === '/prompt') {
    const submitted = JSON.parse(String(init?.body ?? '{}'));
    assert.equal(submitted.prompt.creator.inputs.name, expectedName);
    return Response.json({ prompt_id: 'refmod-e2e' });
  }
  if (url.pathname === '/history/refmod-e2e') return Response.json({ 'refmod-e2e': { status: { status_str: 'success', completed: true }, outputs: {} } });
  if (url.pathname === '/refmods/library') return Response.json([{ name: expectedName, path: refmodPath }]);
  throw new Error(`UNEXPECTED_COMFY_ROUTE:${url.pathname}`);
};

try {
  await pool.query('insert into projects(id,name) values($1,$2)', [project, 'RefMod E2E']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [scene, project, 'scene']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)', [shot, scene, 'refmod']);
  await pool.query("insert into nodes(id,instance_id,capabilities,status,heartbeat_at) values($1,'refmod-e2e','{}','online',now())", [node]);
  await pool.query("insert into jobs(id,shot_id,state,plan_hash,idempotency_key,request_hash,adapter_id,plan_json) values($1,$2,'awaiting_approval','refmod-plan','refmod-key','refmod-request','comfyui','{}')", [job, shot]);
  const { PgAttemptRepository } = await import('../apps/api/src/pg-repository.ts');
  const repo = new PgAttemptRepository(pool);
  await repo.jobs.approve(job, 'refmod-plan', 'smoke');
  const attempt = await repo.claim(job, node);
  const ctx = { jobId: job, attemptId: attempt.id, fencingToken: Number(attempt.fencingToken), planHash: 'refmod-plan' };
  graph.creator.inputs.folder = `qwendirector_refmods/${ctx.attemptId}`;
  const executor = new ComfyWorkbenchExecutor('http://comfy.mock', graph, 'refmod-create');
  await execute(ctx, executor, new HttpExecutionHooks(apiBase));

  const manifest = await repo.getManifest(attempt.id);
  assert.equal(manifest.manifest.outputs.length, 1);
  const output = manifest.manifest.outputs[0];
  assert.equal(output.slot, 'refmod');
  assert.equal(output.logicalName, `${expectedName}.safetensors`);
  assert.equal(output.mimeType, 'application/octet-stream');
  assert.equal(output.provenance.workbench, 'refmod-create');
  assert.equal(output.provenance.slot, 'refmod');
  assert.equal((await pool.query('select state from jobs where id=$1', [job])).rows[0].state, 'succeeded');
  const asset = await repo.getAsset(output.assetVersionId);
  assert.equal(asset.sha256, output.sha256);
  assert.equal(Number(asset.byte_size), refmodBytes.length);
  console.log('OK: RefMod sidecar → worker fencing → CAS AssetVersion → durable refmod manifest');
} finally {
  globalThis.fetch = originalFetch;
  await pool.query('delete from attempt_manifests where attempt_id in(select id from attempts where job_id=$1)', [job]);
  await pool.query('delete from attempt_assets where attempt_id in(select id from attempts where job_id=$1)', [job]);
  await pool.query('delete from asset_versions where provenance->>\'attemptId\' in(select id::text from attempts where job_id=$1)', [job]);
  await pool.query('delete from attempts where job_id=$1', [job]);
  await pool.query('delete from approvals where job_id=$1', [job]);
  await pool.query('delete from jobs where id=$1', [job]);
  await pool.query('delete from nodes where id=$1', [node]);
  await pool.query('delete from shots where id=$1', [shot]);
  await pool.query('delete from scenes where id=$1', [scene]);
  await pool.query('delete from projects where id=$1', [project]);
  await pool.end();
  await app.close();
  await rm(tempRoot, { recursive: true, force: true });
}
