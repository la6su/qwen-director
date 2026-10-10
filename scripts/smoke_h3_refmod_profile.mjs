import assert from 'node:assert/strict';
import { createH3RefModWorkflowProfile, injectH3Inputs } from '@qwendirector/workflow-adapters/h3-profile';

const graph = {
  '127': { class_type: 'MiniMaxH3ImageToVideo', inputs: { first_frame: ['202', 0], last_frame: ['203', 0], prompt: 'old', width: 640, height: 384, length: 124 } },
  '128': { class_type: 'RandomNoise', inputs: { noise_seed: 1 } },
  '136': { class_type: 'SaveVideo', inputs: { filename_prefix: 'old' } },
  '200': { class_type: 'MiniMaxH3RefModsLoader', inputs: { mod_1: 'car', mod_2: 'actor' } },
  '201': { class_type: 'MiniMaxH3RefModApply', inputs: {} },
  '202': { class_type: 'LoadImage', inputs: { image: 'old-start.png' } },
  '203': { class_type: 'LoadImage', inputs: { image: 'old-end.png' } },
};
const profile = createH3RefModWorkflowProfile('refmod-smoke', 'RefMod smoke', graph, { imageNodeIds: ['202', '203'] });
assert.equal(profile.boundary.mode, 'refmod-i2v');
const injected = injectH3Inputs(profile, {
  prompt: 'new prompt', width: 832, height: 480, length: 124, seed: 42,
  filenamePrefix: 'qwendirector/smoke',
  images: [{ name: 'park-start.jpeg', subfolder: 'input' }, { name: 'park-end.jpeg', subfolder: 'input' }],
});
assert.equal(injected['127'].inputs.prompt, 'new prompt');
assert.deepEqual(injected['127'].inputs.first_frame, ['202', 0]);
assert.deepEqual(injected['127'].inputs.last_frame, ['203', 0]);
assert.equal(injected['202'].inputs.image, 'input/park-start.jpeg');
assert.equal(injected['203'].inputs.image, 'input/park-end.jpeg');
assert.equal(injected['128'].inputs.noise_seed, 42);
assert.equal(injected['136'].inputs.filename_prefix, 'qwendirector/smoke');
assert.equal(profile.graph['202'].inputs.image, 'old-start.png');
assert.throws(() => createH3RefModWorkflowProfile('bad', 'bad', { ...graph, '200': { class_type: 'MiniMaxH3RefModsLoader', inputs: { mod_1: 'same', mod_2: 'same' } } }, { imageNodeIds: ['202', '203'] }), /TWO_DISTINCT_MODS/);
console.log('OK: RefMod profile validates two identities and preserves linked image-frame inputs');
