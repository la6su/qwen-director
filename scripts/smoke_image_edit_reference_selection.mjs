import assert from 'node:assert/strict';
import { compactImageEditReferences } from '../apps/web/src/image-edit-references.ts';

const input = [
  { assetVersionId:'a', filename:'base.png', role:'first-frame' },
  { assetVersionId:'a', filename:'base.png', role:'actor' },
  { assetVersionId:'b', filename:'detail.png', role:'last-frame' },
];
const result = compactImageEditReferences(input);
assert.deepEqual(result.map(({ assetVersionId, filename, role }) => ({ assetVersionId, filename, role })), [
  { assetVersionId:'a', filename:'base.png', role:'actor' },
  { assetVersionId:'b', filename:'detail.png', role:'picture' },
]);
assert.equal(input.length,3,'shot role bindings remain immutable');
console.log('Qwen Image edit reference selection smoke: ok');
