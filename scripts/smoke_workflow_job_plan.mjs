import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { withH3VideoPath } from './lib/h3-workflow-fixture.mjs';

process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const [projectId, sceneId, shotId, videoAssetId] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const body = {
  project: 'workflow', scene: 'scene', shot: 'shot',
  prompt: 'A quiet room reveal', camera: 'slow dolly',
  sound: 'A low room tone with one dry keyboard click.',
  music: 'Sparse analog pulse at 96 BPM, held low beneath the action.',
  adapterId: 'comfyui',
  workflow: withH3VideoPath({
    '1': { class_type: 'MiniMaxH3ReferenceToVideo' },
    '2': { class_type: 'RandomNoise' },
    '3': { class_type: 'SaveVideo' },
  }, { h3Id: '1', noiseId: '2', saveId: '3' }),
};
const eventPlan = {
  schemaVersion:'qwendirector-h3-event-plan/v1', frameRate:24, frameCount:124,
  events:[
    { id:'observe', startFrame:0, endFrame:48, action:'The creator studies two image variations.', endState:'The pointer rests over one chosen variation.', sourceRef:'BEAT-01', sourceTiming:'unverified' },
    { id:'choose', startFrame:48, endFrame:124, action:'The creator selects one variation.', endState:'The selected image remains steady on the display.' },
  ],
};

try {
  await pool.query(
    "insert into asset_versions(id,sha256,byte_size,mime_type,storage_key,provenance,asset_kind,tags) values($1,$2,4,'video/mp4',$3,'{}','video','[]')",
    [videoAssetId, videoAssetId.replaceAll('-', '').padEnd(64, '0').slice(0, 64), `smoke-video-${videoAssetId}`],
  );
  await pool.query('insert into projects(id,name) values($1,$2)', [projectId, 'workflow']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [sceneId, projectId, 'scene']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)', [shotId, sceneId, 'shot']);

  const response = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: { ...body, projectId, sceneId, shotId, eventPlan },
  });
  assert.equal(response.statusCode, 201, response.body);
  const jobId = response.json().jobId;
  const plan = (await pool.query('select plan_json from jobs where id=$1', [jobId])).rows[0].plan_json;
  assert.match(plan.workflowProfile.graphHash, /^[a-f0-9]{64}$/);
  assert.equal(plan.workflowProfile.boundary.h3NodeId, '1');
  assert.equal(plan.workflowProfile.qualityHint, 'unknown');
  assert.deepEqual(plan.promptInspection, {
    schemaVersion: 'qwendirector-h3-prompt-inspection/v1',
    mode: 'ref2va',
    frameCount: 124,
    findings: [],
  });
  assert.match(plan.prompt, /subject_definitions:[\s\S]*retention_analysis:[\s\S]*detailed_description:[\s\S]*overall_soundscape:[\s\S]*low room tone with one dry keyboard click\.[\s\S]*non_diegetic_music:[\s\S]*Sparse analog pulse at 96 BPM/);
  assert.equal(plan.directorFields.sound, body.sound);
  assert.equal(plan.directorFields.music, body.music);
  assert.deepEqual(plan.eventPlan, eventPlan);
  assert.equal(plan.eventCausalityReview.schemaVersion, 'qwendirector-h3-event-causality-review/v1');
  assert.equal(plan.eventCausalityReview.status, 'incomplete');
  assert.equal(plan.eventCausalityReview.semanticAssessment, 'not-performed');
  assert.ok(plan.eventCausalityReview.gaps.includes('choose:continuityFromPrevious'));
  assert.match(plan.prompt, /same uninterrupted shot/);
  assert.match(plan.prompt, /BEAT-01 timing is unverified/);

  const shot = (await pool.query('select director_prompt,prompt_revision from shots where id=$1', [shotId])).rows[0];
  assert.equal(shot.director_prompt.camera, 'slow dolly');
  assert.equal(shot.director_prompt.prompt, 'A quiet room reveal');
  assert.equal(shot.director_prompt.music, body.music);
  assert.deepEqual(shot.director_prompt.eventPlan, eventPlan);
  assert.equal(Number(shot.prompt_revision), 2);

  const missingCutTime = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: { ...body, projectId, sceneId, shotId, idempotencyKey: 'missing-cut-time', prompt: '[Shot 1] A creator studies the frame. [Shot 2] The creator selects it.' },
  });
  assert.equal(missingCutTime.statusCode, 400, missingCutTime.body);
  assert.match(missingCutTime.json().code, /^H3_PROMPT_CONTRACT_INVALID:H3_CUT_TIME_MISSING$/);
  assert.equal((await pool.query("select count(*)::int as count from jobs where shot_id=$1 and idempotency_key='missing-cut-time'", [shotId])).rows[0].count, 0);
  assert.equal(Number((await pool.query('select prompt_revision from shots where id=$1', [shotId])).rows[0].prompt_revision), 2);

  const invalidEventPlan = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: { ...body, projectId, sceneId, shotId, idempotencyKey:'event-gap', eventPlan:{ ...eventPlan, events:[{ ...eventPlan.events[0], endFrame:47 }, eventPlan.events[1]] } },
  });
  assert.equal(invalidEventPlan.statusCode, 400, invalidEventPlan.body);
  assert.equal(invalidEventPlan.json().code, 'H3_EVENT_RANGE_GAP_OVERLAP_OR_TOO_SHORT');
  assert.equal((await pool.query("select count(*)::int as count from jobs where shot_id=$1 and idempotency_key='event-gap'", [shotId])).rows[0].count, 0);
  assert.equal(Number((await pool.query('select prompt_revision from shots where id=$1', [shotId])).rows[0].prompt_revision), 2);

  const unboundReference = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: { ...body, projectId, sceneId, shotId, idempotencyKey: 'unbound-reference-label', prompt: '[Shot 1] <Picture 1> defines the frame.' },
  });
  assert.equal(unboundReference.statusCode, 400, unboundReference.body);
  assert.match(unboundReference.json().code, /^H3_PROMPT_CONTRACT_INVALID:H3_REFERENCE_LABEL_UNBOUND$/);
  assert.equal((await pool.query("select count(*)::int as count from jobs where shot_id=$1 and idempotency_key='unbound-reference-label'", [shotId])).rows[0].count, 0);
  assert.equal(Number((await pool.query('select prompt_revision from shots where id=$1', [shotId])).rows[0].prompt_revision), 2);

  // Later shot edits must not rewrite the already-created execution snapshot.
  await pool.query('update shots set director_prompt=$2 where id=$1', [shotId, {
    prompt: 'Later edit', sound: 'Replacement ambience', music: 'Replacement score',
  }]);
  const persistedPlan = (await pool.query('select plan_json from jobs where id=$1', [jobId])).rows[0].plan_json;
  assert.equal(persistedPlan.prompt, plan.prompt);
  assert.equal(persistedPlan.directorFields.sound, body.sound);
  assert.equal(persistedPlan.directorFields.music, body.music);
  assert.deepEqual(persistedPlan.eventPlan, eventPlan);

  const videoReference = { assetVersionId: videoAssetId, filename: 'ref.mp4', type: 'video', role: 'video' };
  const noVideoBinding = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: { ...body, projectId, sceneId, shotId, idempotencyKey: 'video-without-binding', references: [videoReference] },
  });
  assert.equal(noVideoBinding.statusCode, 400, noVideoBinding.body);
  assert.equal(noVideoBinding.json().code, 'H3_WORKFLOW_VIDEO_REFERENCE_COUNT_MISMATCH');

  const badVideoBinding = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: {
      ...body, projectId, sceneId, shotId, idempotencyKey: 'video-wrong-binding', references: [videoReference],
      workflow: { ...body.workflow, '4': { class_type: 'LoadImage', inputs: { image: 'placeholder.png' } } },
      workflowReferenceBindings: { videoNodeIds: ['4'] },
    },
  });
  assert.equal(badVideoBinding.statusCode, 400, badVideoBinding.body);
  assert.match(badVideoBinding.json().code, /H3_WORKFLOW_REFERENCE_BINDING_INVALID/);

  const validVideo = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: {
      ...body, projectId, sceneId, shotId, idempotencyKey: 'video-bound', references: [videoReference],
      workflow: {
        ...body.workflow,
        '1': { class_type: 'MiniMaxH3ReferenceToVideo', inputs: { 'ref_videos.ref_video_0': ['4', 0] } },
        '4': { class_type: 'LoadVideo', inputs: { file: 'placeholder.mp4' } },
      },
      workflowReferenceBindings: { videoNodeIds: ['4'] },
    },
  });
  assert.equal(validVideo.statusCode, 201, validVideo.body);
  const videoPlan = (await pool.query('select plan_json from jobs where id=$1', [validVideo.json().jobId])).rows[0].plan_json;
  assert.deepEqual(videoPlan.workflowProfile.referenceBindings.videoNodeIds, ['4']);

  const invalid = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: { ...body, projectId, sceneId, shotId, idempotencyKey: 'invalid-workflow', workflow: { '1': { class_type: 'SaveVideo' } } },
  });
  assert.equal(invalid.statusCode, 400);
  console.log('OK: durable H3 jobs snapshot compiled sound/music and preserve workflow bindings after later shot edits');
} finally {
  await pool.query('delete from jobs where shot_id=$1', [shotId]);
  await pool.query('delete from asset_versions where id=$1', [videoAssetId]);
  await pool.query('delete from shots where id=$1', [shotId]);
  await pool.query('delete from scenes where id=$1', [sceneId]);
  await pool.query('delete from projects where id=$1', [projectId]);
  await pool.end();
  await app.close();
}
