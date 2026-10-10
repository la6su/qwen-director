import assert from 'node:assert/strict';
import { createH3WorkflowProfile, injectH3Inputs } from '../packages/workflow-adapters/src/h3-profile.ts';
const profile = createH3WorkflowProfile('h3-official','PVE H3', {'10':{class_type:'MiniMaxH3ReferenceToVideo',inputs:{}},'11':{class_type:'RandomNoise',inputs:{}},'12':{class_type:'SaveVideo',inputs:{}}});
const graph = injectH3Inputs(profile,{prompt:'six-section jazz shot',width:1280,height:720,length:56,seed:42,filenamePrefix:'qwendirector/test'});
assert.equal(graph['10'].inputs.width,1280); assert.equal(graph['10'].inputs.length,56); assert.equal(graph['11'].inputs.noise_seed,42); assert.equal(graph['12'].inputs.filename_prefix,'qwendirector/test'); assert.match(profile.graphHash,/^[a-f0-9]{64}$/);
const reordered = createH3WorkflowProfile('h3-official','PVE H3', {'12':{inputs:{},class_type:'SaveVideo'},'11':{inputs:{},class_type:'RandomNoise'},'10':{inputs:{},class_type:'MiniMaxH3ReferenceToVideo'}});
assert.equal(reordered.graphHash, profile.graphHash);
const qualityGraph = {
  '10': { class_type: 'MiniMaxH3ReferenceToVideo', inputs: {} },
  '11': { class_type: 'LoraLoaderModelOnly', inputs: { lora_name: 'MiniMax-H3-Ref2VA-Acc-8Step.safetensors' } },
  '20': { class_type: 'BasicScheduler', inputs: { steps: ['21', 0] } },
  '21': { class_type: 'ComfySwitchNode', inputs: { switch: ['23', 0], on_true: ['22', 0], on_false: ['24', 0] } },
  '22': { class_type: 'PrimitiveInt', inputs: { value: 8 } },
  '23': { class_type: 'PrimitiveBoolean', inputs: { value: true } },
  '24': { class_type: 'PrimitiveInt', inputs: { value: 56 } },
  '5': { class_type: 'RandomNoise', inputs: {} },
  '12': { class_type: 'SaveVideo', inputs: {} }
};
const qualityProfile = createH3WorkflowProfile('h3-quality', 'H3 quality', qualityGraph);
assert.equal(qualityProfile.qualityHint, 'quality-8step');
assert.equal(qualityProfile.samplingSteps, 8);
assert.deepEqual(qualityProfile.loras, ['MiniMax-H3-Ref2VA-Acc-8Step.safetensors']);
const mismatchedGraph = structuredClone(qualityGraph);
mismatchedGraph['22'].inputs.value = 4;
const mismatchedProfile = createH3WorkflowProfile('h3-quality-mismatch', 'H3 quality mismatch', mismatchedGraph);
assert.equal(mismatchedProfile.samplingSteps, 4);
assert.equal(mismatchedProfile.qualityHint, 'unknown');
const fullStepsGraph = structuredClone(qualityGraph);
fullStepsGraph['23'].inputs.value = false;
const fullStepsProfile = createH3WorkflowProfile('h3-quality-full-steps', 'H3 full steps', fullStepsGraph);
assert.equal(fullStepsProfile.samplingSteps, 56);
assert.equal(fullStepsProfile.qualityHint, 'unknown');
assert.throws(() => injectH3Inputs(profile,{prompt:'',width:1280,height:720,length:56}),/INVALID_H3_INPUTS/); console.log('OK: immutable H3 profile snapshot and deterministic input injection');
