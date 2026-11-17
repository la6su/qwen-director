import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComfyWorkbenchExecutor } from '@qwendirector/workflow-adapters/executors';

const tempRoot = await mkdtemp(join(tmpdir(), 'qwendirector-refmod-'));
const allowedRoot = join(tempRoot, 'models', 'refmods');
const outsideRoot = join(tempRoot, 'outside');
const allowedDir = join(allowedRoot, 'QwenDirector');
await mkdir(allowedDir, { recursive: true });
await mkdir(outsideRoot, { recursive: true });
const expectedName = 'qd_smoke_job_smoke_attempt';
const refmodPath = join(allowedDir, `${expectedName}.safetensors`);
const refmodBytes = Buffer.from('test safetensors payload');
await writeFile(refmodPath, refmodBytes);

const oldRoot = process.env.QWEN_COMFY_REFMODS_ROOT;
const oldFetch = globalThis.fetch;
process.env.QWEN_COMFY_REFMODS_ROOT = allowedRoot;
const graph = { creator: { class_type: 'H3RefModCreateFromFolder', inputs: { name: expectedName } } };
globalThis.fetch = async (url) => {
  const route = new URL(String(url)).pathname;
  if (route === '/history/smoke-run') return Response.json({ 'smoke-run': { outputs: {} } });
  if (route === '/refmods/library') return Response.json([{ name: expectedName, path: refmodPath }]);
  throw new Error(`UNEXPECTED_MOCK_ROUTE:${route}`);
};

try {
  const executor = new ComfyWorkbenchExecutor('http://127.0.0.1:8188', graph, 'refmod-create');
  const collected = await executor.collect({ externalRunId: 'smoke-run' });
  assert.equal(collected.outputs.length, 1);
  assert.equal(collected.outputs[0].slot, 'refmod');
  assert.equal(collected.outputs[0].mimeType, 'application/octet-stream');
  assert.equal(collected.outputs[0].logicalName, `${expectedName}.safetensors`);
  assert.deepEqual(Buffer.from(collected.outputs[0].contentBase64, 'base64'), refmodBytes);

  const outsidePath = join(outsideRoot, `${expectedName}.safetensors`);
  await writeFile(outsidePath, refmodBytes);
  globalThis.fetch = async (url) => new URL(String(url)).pathname === '/history/smoke-run'
    ? Response.json({ 'smoke-run': { outputs: {} } })
    : Response.json([{ name: expectedName, path: outsidePath }]);
  await assert.rejects(() => executor.collect({ externalRunId: 'smoke-run' }), /COMFY_REFMOD_OUTPUT_OUTSIDE_ROOT/);

  globalThis.fetch = async (url) => new URL(String(url)).pathname === '/history/smoke-run'
    ? Response.json({ 'smoke-run': { outputs: {} } })
    : Response.json([{ name: expectedName, path: refmodPath }, { name: `${expectedName}-duplicate`, path: refmodPath }]);
  await assert.rejects(() => executor.collect({ externalRunId: 'smoke-run' }), /COMFY_REFMOD_OUTPUT_AMBIGUOUS/);
  console.log('OK: RefMod sidecar collection enforces unique output and realpath containment');
} finally {
  globalThis.fetch = oldFetch;
  if (oldRoot === undefined) delete process.env.QWEN_COMFY_REFMODS_ROOT;
  else process.env.QWEN_COMFY_REFMODS_ROOT = oldRoot;
  await rm(tempRoot, { recursive: true, force: true });
}
