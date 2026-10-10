import assert from 'node:assert/strict';
const { WORKBENCH_CONTRACTS, getWorkbenchContract, validateWorkbenchInputs, mapWorkbenchOutputs, planWorkbench } = await import('../packages/workflow-adapters/src/workbenches.ts');
assert.deepEqual(WORKBENCH_CONTRACTS.map((item) => item.kind), ['actor','scene','prop','layout']);
for (const item of WORKBENCH_CONTRACTS) { assert.ok(item.requiredInputs.length); assert.ok(item.outputSlots.length); assert.equal(getWorkbenchContract(item.kind).assetKind, item.kind); }
validateWorkbenchInputs('actor', { description: 'hero' }); assert.throws(() => validateWorkbenchInputs('layout', {}), /WORKBENCH_INPUT_REQUIRED/);
assert.equal(mapWorkbenchOutputs('layout', [{ logicalName:'layout.png', mimeType:'image/png', sha256:'a'.repeat(64), byteSize:1 }])[0].slot, 'layout');
assert.equal(planWorkbench('actor', { description:'hero' }, 'a'.repeat(64)).adapterId, 'comfyui.workbench.actor');
assert.throws(() => planWorkbench('prop', { description:'box' }, 'bad'), /WORKBENCH_WORKFLOW_DIGEST_REQUIRED/);
console.log('OK: workbench contracts and AssetVersion kinds');
