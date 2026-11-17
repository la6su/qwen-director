import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanupComfyAttemptInputs } from '../apps/worker/src/comfy-input-cleanup.ts';

const root = await mkdtemp(join(tmpdir(), 'qwendirector-comfy-cleanup-'));
try {
  await mkdir(join(root, 'qwendirector_refs', 'attempt-1'), { recursive: true });
  await mkdir(join(root, 'qwendirector_refs', 'attempt-2'), { recursive: true });
  await mkdir(join(root, 'qwendirector_refmods', 'attempt-1'), { recursive: true });
  await writeFile(join(root, 'qwendirector_refs', 'attempt-1', 'frame.png'), 'generated input');
  await writeFile(join(root, 'qwendirector_refs', 'attempt-2', 'frame.png'), 'keep active attempt');
  await writeFile(join(root, 'qwendirector_refmods', 'attempt-1', 'reference.png'), 'staged refmod input');
  await writeFile(join(root, 'qwendirector_refs', 'unrelated.png'), 'preserve user file');

  assert.deepEqual(await cleanupComfyAttemptInputs('attempt-1'), [], 'cleanup is disabled unless explicitly configured');
  assert.deepEqual(await cleanupComfyAttemptInputs('attempt-1', root), [
    'qwendirector_refs/attempt-1',
    'qwendirector_refmods/attempt-1',
  ]);
  await assert.rejects(() => readFile(join(root, 'qwendirector_refs', 'attempt-1', 'frame.png')), { code: 'ENOENT' });
  assert.equal(await readFile(join(root, 'qwendirector_refs', 'attempt-2', 'frame.png'), 'utf8'), 'keep active attempt');
  assert.equal(await readFile(join(root, 'qwendirector_refs', 'unrelated.png'), 'utf8'), 'preserve user file');
  await assert.rejects(() => cleanupComfyAttemptInputs('../attempt-2', root), /INVALID_COMFY_ATTEMPT_ID/);
  await assert.rejects(() => cleanupComfyAttemptInputs('attempt-1', join(root, 'missing')), /COMFY_INPUT_ROOT_NOT_FOUND/);
  console.log('OK: ComfyUI attempt cleanup is opt-in and limited to owned folders');
} finally {
  await rm(root, { recursive: true, force: true });
}
