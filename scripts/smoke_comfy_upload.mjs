import assert from 'node:assert/strict';
import { comfyReferenceUploadTarget, uploadComfyReference } from '../packages/workflow-adapters/src/comfy-upload.ts';

const original = globalThis.fetch;
try {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'http://pve/upload/image');
    assert.equal(init.method, 'POST');
    assert.equal(init.body.get('type'), 'input');
    assert.equal(init.body.get('overwrite'), 'true');
    return { ok: true, json: async () => ({ name: 'ref.png', subfolder: 'qwendirector_refs/attempt-1', type: 'input' }) };
  };
  const targetA = comfyReferenceUploadTarget({ attemptId: 'attempt-1', assetVersionId: 'asset-a', role: 'first-frame', index: 0, filename: 'frame.png' });
  const targetB = comfyReferenceUploadTarget({ attemptId: 'attempt-1', assetVersionId: 'asset-b', role: 'last-frame', index: 1, filename: 'frame.png' });
  const targetNextAttempt = comfyReferenceUploadTarget({ attemptId: 'attempt-2', assetVersionId: 'asset-a', role: 'first-frame', index: 0, filename: 'frame.png' });
  assert.notEqual(targetA.filename, targetB.filename, 'same basename from separate refs must not collide');
  assert.notEqual(targetA.subfolder, targetNextAttempt.subfolder, 'uploads from separate attempts must be isolated');
  assert.deepEqual(targetA, { filename: 'qd-0-asset-a-first-frame-frame.png', subfolder: 'qwendirector_refs/attempt-1' });
  const result = await uploadComfyReference('http://pve', new Uint8Array([1, 2, 3]), targetA.filename, 'image', targetA.subfolder);
  assert.equal(result.name, 'ref.png');
  const video = await uploadComfyReference('http://pve', new Uint8Array([4, 5]), 'clip.mp4', 'video');
  assert.equal(video.name, 'ref.png');
  await assert.rejects(() => uploadComfyReference('http://pve', new Uint8Array(), '../bad.png'), /INVALID_REFERENCE_FILENAME/);
  assert.throws(() => comfyReferenceUploadTarget({ attemptId: '../bad', assetVersionId: 'asset-a', role: 'picture', index: 0, filename: 'ref.png' }), /INVALID_COMFY_REFERENCE_ID/);
  console.log('OK: ComfyUI reference uploads use isolated, collision-free paths');
} finally {
  globalThis.fetch = original;
}
