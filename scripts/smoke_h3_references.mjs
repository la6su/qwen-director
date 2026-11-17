import assert from 'node:assert/strict';
import { createH3WorkflowProfile, injectH3Inputs } from '../packages/workflow-adapters/src/h3-profile.ts';
import { withH3VideoPath } from './lib/h3-workflow-fixture.mjs';

const graph = withH3VideoPath({
  h: { class_type: 'MiniMaxH3ReferenceToVideo', inputs: { prompt: 'template', 'ref_images.ref_image_0': ['i', 0], 'ref_audios.ref_audio_0': ['a', 0], 'ref_videos.ref_video_0': ['components', 0] } },
  n: { class_type: 'RandomNoise', inputs: {} }, s: { class_type: 'SaveVideo', inputs: {} },
  i: { class_type: 'LoadImage', inputs: { image: 'original.png' } },
  a: { class_type: 'LoadAudio', inputs: { audio: 'original.wav' } },
  v: { class_type: 'LoadVideo', inputs: { file: 'original.mp4' } },
  components: { class_type: 'GetVideoComponents', inputs: { video: ['v', 0] } },
}, { h3Id:'h', noiseId:'n', saveId:'s' });
const bindings = { imageNodeIds: ['i'], audioNodeIds: ['a'], videoNodeIds: ['v'] };
const p = createH3WorkflowProfile('p', 'h3', graph, bindings);
const out = injectH3Inputs(p, { prompt: 'x', width: 1, height: 1, length: 1, images: [{ name: 'ref.png', subfolder: 'input' }], audios: [{ name: 'ref.wav' }], videos: [{ name: 'clip.mp4', subfolder: 'input' }] });
assert.equal(out.i.inputs.image, 'input/ref.png'); assert.equal(out.a.inputs.audio, 'ref.wav'); assert.equal(out.v.inputs.file, 'input/clip.mp4');
assert.throws(() => injectH3Inputs(p, { prompt: 'x', width: 1, height: 1, length: 1 }), /H3_REFERENCE_COUNT_MISMATCH/);
assert.throws(() => createH3WorkflowProfile('missing', 'missing', graph), /H3_WORKFLOW_IMAGE_REFERENCE_SLOTS_MISMATCH/);
const disconnected = structuredClone(graph); disconnected.h.inputs['ref_videos.ref_video_0'] = ['components', 0]; disconnected.components.inputs.video = ['n', 0];
assert.throws(() => createH3WorkflowProfile('disconnected', 'disconnected', disconnected, bindings), /H3_WORKFLOW_VIDEO_REFERENCE_NOT_CONNECTED/);
const sparse = structuredClone(graph); sparse.h.inputs['ref_images.ref_image_1'] = ['i', 0];
assert.throws(() => createH3WorkflowProfile('sparse', 'sparse', sparse, { ...bindings, imageNodeIds: ['i'] }), /H3_WORKFLOW_IMAGE_REFERENCE_SLOTS_MISMATCH/);
console.log('OK: H3 reference slots are connected, dense, and exact-count');
