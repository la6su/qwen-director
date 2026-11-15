import assert from 'node:assert/strict';
import { alignMiniMaxH3Frames, isMiniMaxH3TrainedLength, miniMaxH3DurationSeconds } from '../packages/contracts/src/cinematic.ts';
import { compileDirectorPrompt, compileH3Ref2VAPrompt } from '../packages/contracts/src/prompt.ts';

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
console.log('smoke_cinematic_contract: OK');
