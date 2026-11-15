import assert from 'node:assert/strict';
const { WORKBENCH_CONTRACTS, getWorkbenchContract, validateWorkbenchInputs, mapWorkbenchOutputs, planWorkbench } = await import('../packages/workflow-adapters/src/workbenches.ts');
assert.deepEqual(WORKBENCH_CONTRACTS.map((item) => item.kind), ['actor','scene','prop','layout','image-edit','image-generate','refmod-create']);
for (const item of WORKBENCH_CONTRACTS) { assert.ok(item.requiredInputs.length); assert.ok(item.outputSlots.length); assert.equal(getWorkbenchContract(item.kind).kind, item.kind); }
validateWorkbenchInputs('actor', { description: 'hero' }); assert.throws(() => validateWorkbenchInputs('layout', {}), /WORKBENCH_INPUT_REQUIRED/);
const oneSaver = mapWorkbenchOutputs('layout', [{ logicalName:'layout.png', mimeType:'image/png', sha256:'a'.repeat(64), byteSize:1, outputNodeId:'17' }]);
assert.equal(oneSaver[0].slot, 'layout');
assert.equal(oneSaver[0].provenance.outputNodeId, '17');
const reverseSavers = mapWorkbenchOutputs('actor', [
  { logicalName:'turnaround.png', mimeType:'image/png', sha256:'b'.repeat(64), byteSize:2, outputNodeId:'20' },
  { logicalName:'master.png', mimeType:'image/png', sha256:'c'.repeat(64), byteSize:3, outputNodeId:'10' },
], { '10':'master', '20':'turnaround' });
assert.deepEqual(reverseSavers.map((output) => output.slot), ['turnaround', 'master']);
assert.throws(() => mapWorkbenchOutputs('actor', [
  { logicalName:'a.png', mimeType:'image/png', sha256:'d'.repeat(64), byteSize:1, outputNodeId:'10' },
  { logicalName:'b.png', mimeType:'image/png', sha256:'e'.repeat(64), byteSize:1, outputNodeId:'20' },
]), /WORKBENCH_OUTPUT_BINDINGS_INCOMPLETE/);
assert.throws(() => mapWorkbenchOutputs('actor', [
  { logicalName:'a.png', mimeType:'image/png', sha256:'d'.repeat(64), byteSize:1, outputNodeId:'10' },
  { logicalName:'b.png', mimeType:'image/png', sha256:'e'.repeat(64), byteSize:1, outputNodeId:'20' },
], { '10':'master', '20':'master' }), /WORKBENCH_OUTPUT_BINDINGS_INVALID/);
assert.equal(planWorkbench('actor', { description:'hero' }, 'a'.repeat(64)).adapterId, 'comfyui.workbench.actor');
assert.throws(() => planWorkbench('prop', { description:'box' }, 'bad'), /WORKBENCH_WORKFLOW_DIGEST_REQUIRED/);
console.log('OK: workbench contracts and AssetVersion kinds');
