import assert from 'node:assert/strict';
import { alignMiniMaxH3Frames, isMiniMaxH3TrainedLength, miniMaxH3DurationSeconds } from '../packages/contracts/src/cinematic.ts';
import { compileDirectorPrompt, compileH3BasePrompt, compileH3Ref2VAPrompt, inspectH3Prompt } from '../packages/contracts/src/prompt.ts';

for (const frames of [56, 73, 124, 192, 243, 362]) assert.equal(alignMiniMaxH3Frames(frames), frames);
assert.equal(alignMiniMaxH3Frames(120), 124);
assert.equal(alignMiniMaxH3Frames(363), 379);
assert.equal(miniMaxH3DurationSeconds(124), 124 / 24);
assert.throws(() => miniMaxH3DurationSeconds(120), /H3_FRAME_GRID_INVALID/);
assert.equal(isMiniMaxH3TrainedLength(124), true);
assert.equal(isMiniMaxH3TrainedLength(56), false);

const prompt = compileH3Ref2VAPrompt(
  { prompt:'A woman enters a quiet studio', camera:'The camera pushes in with small amplitude at slow speed.', sound:'Footsteps and room tone.', music:'N/A' },
  [
    { type:'image', role:'actor', notes:'red scarf' },
    { type:'image', role:'set' },
    { type:'video' },
    { type:'audio' },
  ],
);
for (const section of ['subject_definitions:', 'summary:', 'retention_analysis:', 'detailed_description:', 'overall_soundscape:', 'non_diegetic_music:']) assert.ok(prompt.includes(section), section);
for (const tag of ['<Picture 1>', '<Picture 2>', '<Video 1>', '<Audio 1>']) assert.ok(prompt.includes(tag), tag);
assert.ok(prompt.includes('character identity'));
assert.ok(prompt.includes('red scarf'));
assert.ok(prompt.includes('Footsteps and room tone.'));
assert.ok(prompt.includes('non_diegetic_music:\nN/A'));
assert.ok(!prompt.includes('undefined'));

assert.equal(compileDirectorPrompt({ prompt:'A quiet room', music:'N/A' }), 'A quiet room\nNon-diegetic music: N/A');
const i2va = compileH3BasePrompt({ prompt:'A lone creator edits an image.', camera:'The camera holds a static shot.', sound:'Quiet room tone.', music:'N/A' }, { mode:'i2va' });
assert.ok(i2va.startsWith('For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.\n\nintegrated_multimodal_description: [Shot 1]'));
for (const section of ['overall_soundscape: Quiet room tone.','non_diegetic_music: N/A']) assert.ok(i2va.includes(section));
const fl2va = compileH3BasePrompt({ prompt:'A continuous physical camera move.', sound:'Room tone.' }, { mode:'fl2va', frameCount:124, finalShotNumber:2 });
assert.ok(fl2va.startsWith('How the reference pictures align with the target video - Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 5.17-second mark of the target video.\n\nintegrated_multimodal_description:'));
assert.throws(() => compileH3BasePrompt({ prompt:'A shot.' }, { mode:'fl2va', frameCount:120 }), /INVALID_FL2VA_H3_LENGTH/);

const multiShotRef2va = compileH3Ref2VAPrompt({
  prompt:'[Shot 1] A dark room holds. [Shot 2] At 00:02.000, the camera cuts to the lit screen.',
  camera:'The camera holds a static shot.', sound:'Quiet room tone.', music:'N/A',
}, [{ type:'image', role:'set' }]);
assert.equal(inspectH3Prompt(multiShotRef2va, { mode:'ref2va', frameCount:124, referenceCounts:{ image:1, video:0, audio:0 } }).length, 0);

const multiShotFl2va = compileH3BasePrompt({
  prompt:'[Shot 1] Picture 1 holds the opening frame. [Shot 2] At 00:02.000, the camera cuts to Picture 2.',
  sound:'Room tone.', music:'N/A',
}, { mode:'fl2va', frameCount:124 });
assert.match(multiShotFl2va, /Picture 2 \(from Shot 2\) aligns with the 5\.17-second mark/);
assert.equal(inspectH3Prompt(multiShotFl2va, { mode:'fl2va', frameCount:124, referenceCounts:{ image:2, video:0, audio:0 } }).length, 0);

const lateCut = compileH3Ref2VAPrompt({ prompt:'[Shot 1] Hold. [Shot 2] At 00:06.000, reveal the room.' });
assert.ok(inspectH3Prompt(lateCut, { mode:'ref2va', frameCount:124, referenceCounts:{ image:0, video:0, audio:0 } }).some((finding) => finding.code === 'H3_CUT_TIME_RANGE'));
assert.ok(inspectH3Prompt(multiShotRef2va, { mode:'ref2va', frameCount:120, referenceCounts:{ image:1, video:0, audio:0 } }).some((finding) => finding.code === 'H3_FRAME_COUNT'));
console.log('smoke_cinematic_contract: OK');
