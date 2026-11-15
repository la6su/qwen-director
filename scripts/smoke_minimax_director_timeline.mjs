import assert from 'node:assert/strict';
import { minimaxDirectorMediaKey, parseMiniMaxDirectorTimeline } from '../packages/workflow-adapters/src/minimax-director-timeline.ts';
import { buildMiniMaxDirectorDesignProposal } from '../packages/workflow-adapters/src/minimax-director-plan.ts';

const source = {
  version: 5, frameRate: 24, totalFrames: 248, width: 1152, height: 640, refMaxSize: 1152,
  global: { taskType: 'r2v', prompt: 'Shared direction', refs: [{ imageFile: 'ref-a.png', type: 'input', subfolder: '' }], referenceVideo: { videoFile: 'motion.mp4', type: 'input', subfolder: '' } },
  segments: [
    { id: 'a', start: 0, length: 124, prompt: 'First beat', refs: [{ imageFile: 'ref-a.png', type: 'input', subfolder: '' }] },
    { id: 'b', start: 124, frameCount: 124, prompt: 'Second beat', continuityFromPrev: true, refs: [{ imageFile: 'ref-b.png', type: 'input', subfolder: '' }] },
  ],
};
const parsed = parseMiniMaxDirectorTimeline(JSON.stringify(source));
assert.equal(parsed.schemaVersion, 'aimixer-timeline-v5');
assert.deepEqual(parsed.segments.map(({ startFrame, frameCount, taskType, continuityFromPrevious }) => ({ startFrame, frameCount, taskType, continuityFromPrevious })), [
  { startFrame: 0, frameCount: 124, taskType: 'r2v', continuityFromPrevious: false },
  { startFrame: 124, frameCount: 124, taskType: 'r2v', continuityFromPrevious: true },
]);
assert.equal(parsed.segments[1].durationSeconds, 124 / 24);
assert.equal(parsed.media.length, 3);
assert.equal(parsed.media[0].scopes.join(','), 'global,segment');
assert.equal(parsed.media.find(({ kind }) => kind === 'video').fileName, 'motion.mp4');
assert.equal(parsed.unresolvedMedia.length, 3);
assert.deepEqual(parsed.source, source);
const baseInput = { projectId: 'project', projectTitle: 'Project', sceneId: 'scene', sceneTitle: 'Scene' };
const draft = buildMiniMaxDirectorDesignProposal(parsed, baseInput);
assert.equal(draft.readyForReview, false);
assert.equal(draft.unresolvedReferences.length, 3);
assert.equal(draft.document.scenes[0].shots.length, 2);
assert.equal(draft.document.scenes[0].shots[1].startSeconds, 124 / 24);
assert.equal(draft.document.scenes[0].shots[1].sourceMetadata.continuityFromPrevious, true);
const resolved = buildMiniMaxDirectorDesignProposal(parsed, { ...baseInput, assetVersionByMediaKey: Object.fromEntries(parsed.media.map((item, index) => [minimaxDirectorMediaKey(item), `asset-${index}`])) });
assert.equal(resolved.readyForReview, true);
assert.equal(resolved.unresolvedReferences.length, 0);
assert.equal(resolved.document.scenes[0].shots[0].referenceAssetVersionIds.length, 2);
assert.equal(resolved.document.scenes[0].shots[1].referenceAssetVersionIds.length, 3);
assert.throws(() => parseMiniMaxDirectorTimeline({ ...source, version: 6 }), /AIMIXER_TIMELINE_VERSION_UNSUPPORTED/);
assert.throws(() => parseMiniMaxDirectorTimeline({ ...source, segments: [{ id: 'bad', start: 0, length: -1 }] }), /AIMIXER_TIMELINE_SEGMENT_LENGTH_INVALID/);
assert.throws(() => parseMiniMaxDirectorTimeline({ ...source, segments: [{ id: 'a', start: 0, length: 124 }, { id: 'b', start: 100, length: 124 }] }), /AIMIXER_TIMELINE_SEGMENT_RANGE_INVALID/);
console.log('OK: AIMixer MiniMax H3 timeline v5 parsing and validation');
