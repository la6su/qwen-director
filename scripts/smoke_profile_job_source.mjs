import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createH3WorkflowProfile, injectH3Inputs } from '../packages/workflow-adapters/src/h3-profile.ts';
import { withH3VideoPath } from './lib/h3-workflow-fixture.mjs';

process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const [projectId, sceneId, shotId] = [randomUUID(), randomUUID(), randomUUID()];
const imageAssetVersionId = randomUUID();
const imageSha256 = imageAssetVersionId.replaceAll('-', '').padEnd(64, 'c');
const originalFetch = globalThis.fetch;
const graph = withH3VideoPath({
  h: { class_type: 'MiniMaxH3ReferenceToVideo', inputs: { prompt: 'Workflow template', width: 768, height: 432, length: 124 } },
  n: { class_type: 'RandomNoise', inputs: { noise_seed: 0 } },
  s: { class_type: 'SaveVideo', inputs: { filename_prefix: 'template' } },
}, { h3Id:'h', noiseId:'n', saveId:'s' });

try {
  await pool.query('insert into projects(id,name) values($1,$2)', [projectId, 'profile-source-smoke']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [sceneId, projectId, 'scene']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)', [shotId, sceneId, 'shot']);
  await pool.query("insert into asset_versions(id,sha256,byte_size,mime_type,storage_key,provenance,asset_kind,tags) values($1,$2,1,'image/png',$3,'{}','reference','[]')", [imageAssetVersionId, imageSha256, `smoke/${imageAssetVersionId}`]);

  const saved = await app.inject({ method: 'POST', url: '/v1/workflow-profiles', payload: { id: 'source-smoke', name: 'Source', graph } });
  assert.equal(saved.statusCode, 201, saved.body);
  const mockSchema = {
    MiniMaxH3ReferenceToVideo: { input:{required:{prompt:['STRING',{}],width:['INT',{}],height:['INT',{}],length:['INT',{}]}},output:['CONDITIONING','LATENT'] },
    MiniMaxH3ImageToVideo: { input:{required:{first_frame:['IMAGE',{}],prompt:['STRING',{}]}},output:['CONDITIONING','LATENT'] },
    LoadImage: { input:{required:{image:['STRING',{}]}},output:['IMAGE'] },
    RandomNoise: { input:{required:{noise_seed:['INT',{}]}},output:['NOISE'] },
    BasicGuider: { input:{required:{conditioning:['CONDITIONING',{}]}},output:['GUIDER'] },
    SamplerCustomAdvanced: { input:{required:{noise:['NOISE',{}],guider:['GUIDER',{}],latent_image:['LATENT',{}]}},output:['LATENT'] },
    VAEDecode: { input:{required:{samples:['LATENT',{}]}},output:['IMAGE'] },
    VHS_VideoCombine: { input:{required:{images:['IMAGE',{}]}},output:['VIDEO'] },
    SaveVideo: { input:{required:{video:['VIDEO',{}],filename_prefix:['STRING',{}]}},output:[] },
  };
  globalThis.fetch = async () => new Response(JSON.stringify(mockSchema), { status: 200 });
  const activated = await app.inject({ method: 'POST', url: '/v1/workflow-profiles/source-smoke/revisions/1/activate' });
  globalThis.fetch = originalFetch;
  assert.equal(activated.statusCode, 200, activated.body);
  assert.equal(activated.json().active, true);
  const profileState = (await pool.query("select active from workflow_profiles where id='source-smoke'")).rows[0];
  assert.equal(profileState.active, true);

  const job = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: { project: 'profile-source-smoke', scene: 'scene', shot: 'shot', projectId, sceneId, shotId, prompt: 'A quiet room reveal.', width: 768, height: 432, length: 124, seed: 42, adapterId: 'comfyui', workflowProfileId: 'source-smoke' },
  });
  assert.equal(job.statusCode, 201, job.body);

  const plan = (await pool.query('select plan_json from jobs where id=$1', [job.json().jobId])).rows[0].plan_json;
  assert.equal(plan.workflowProfile.id, 'source-smoke');
  assert.equal(plan.workflowProfile.graph.h.inputs.prompt, 'Workflow template');
  const restoredProfile = createH3WorkflowProfile(plan.workflowProfile.id, plan.workflowProfile.name, plan.workflowProfile.graph, plan.workflowProfile.referenceBindings);
  assert.equal(restoredProfile.graphHash, plan.workflowProfile.graphHash);

  const injected = injectH3Inputs(restoredProfile, {
    prompt: plan.prompt, width: plan.width, height: plan.height, length: plan.length,
    seed: plan.seed, filenamePrefix: `qwendirector/${job.json().jobId}`,
  });
  assert.equal(injected.h.inputs.prompt, plan.prompt);
  assert.equal(injected.h.inputs.length, 124);
  assert.equal(injected.n.inputs.noise_seed, 42);
  assert.equal(injected.s.inputs.filename_prefix, `qwendirector/${job.json().jobId}`);
  assert.equal(plan.workflowProfile.graph.h.inputs.prompt, 'Workflow template');

  const i2vaGraph = withH3VideoPath({
    h: { class_type: 'MiniMaxH3ImageToVideo', inputs: { first_frame: ['image', 0], prompt: 'Workflow template' } },
    n: { class_type: 'RandomNoise', inputs: {} },
    s: { class_type: 'SaveVideo', inputs: {} },
    image: { class_type: 'LoadImage', inputs: { image: 'template.png' } },
  }, { h3Id:'h', noiseId:'n', saveId:'s' });
  const i2vaSaved = await app.inject({ method: 'POST', url: '/v1/workflow-profiles', payload: { id: 'source-smoke-i2va', name: 'I2VA source', graph: i2vaGraph } });
  assert.equal(i2vaSaved.statusCode, 201, i2vaSaved.body);
  const i2vaSchema = {
    MiniMaxH3ImageToVideo: { input: { required: { first_frame: ['IMAGE', {}], prompt: ['STRING', {}] } } },
    RandomNoise: {}, SaveVideo: {},
    LoadImage: { input: { required: { image: ['STRING', {}] } }, output: ['IMAGE'] },
  };
  globalThis.fetch = async () => new Response(JSON.stringify(i2vaSchema), { status: 200 });
  const i2vaActivated = await app.inject({ method: 'POST', url: '/v1/workflow-profiles/source-smoke-i2va/revisions/1/activate' });
  globalThis.fetch = originalFetch;
  assert.equal(i2vaActivated.statusCode, 200, i2vaActivated.body);

  const i2vaJob = await app.inject({
    method: 'POST', url: '/v1/director/jobs',
    payload: {
      project: 'profile-source-smoke', scene: 'scene', shot: 'shot', projectId, sceneId, shotId,
      idempotencyKey: 'source-smoke-i2va', prompt: 'A dark studio frame opens into a digital world.',
      sound: 'Quiet room tone.', music: 'N/A', width: 768, height: 432, length: 124, seed: 17,
      adapterId: 'comfyui', workflowProfileId: 'source-smoke-i2va',
      references: [{ assetVersionId: imageAssetVersionId, filename: 'portrait/source.png', type: 'image', role: 'first-frame' }],
    },
  });
  assert.equal(i2vaJob.statusCode, 201, i2vaJob.body);
  const i2vaPlan = (await pool.query('select plan_json from jobs where id=$1', [i2vaJob.json().jobId])).rows[0].plan_json;
  assert.equal(i2vaPlan.workflowProfile.boundary.mode, 'i2va-i2v');
  assert.equal(i2vaPlan.references[0].assetVersionId, imageAssetVersionId);
  assert.match(i2vaPlan.prompt, /^For the target video, at 0\.00 seconds into the target video, <Picture 1> \(from \[Shot 1\]\) is fully referenced\.\n\nintegrated_multimodal_description:/);
  assert.match(i2vaPlan.prompt, /\noverall_soundscape:/);
  assert.match(i2vaPlan.prompt, /\nnon_diegetic_music:/);
  const restoredI2va = createH3WorkflowProfile(i2vaPlan.workflowProfile.id, i2vaPlan.workflowProfile.name, i2vaPlan.workflowProfile.graph, i2vaPlan.workflowProfile.referenceBindings);
  const injectedI2va = injectH3Inputs(restoredI2va, {
    prompt: i2vaPlan.prompt, width: i2vaPlan.width, height: i2vaPlan.height, length: i2vaPlan.length,
    seed: i2vaPlan.seed, filenamePrefix: `qwendirector/${i2vaJob.json().jobId}`, images: [{ name: 'portrait/source.png', type: 'input' }],
  });
  assert.equal(injectedI2va.image.inputs.image, 'portrait/source.png');
  assert.equal(injectedI2va.h.inputs.prompt, i2vaPlan.prompt);
  assert.equal(injectedI2va.s.inputs.filename_prefix, `qwendirector/${i2vaJob.json().jobId}`);
  assert.equal(i2vaPlan.workflowProfile.graph.image.inputs.image, 'template.png');
  console.log('OK: durable R2V and I2VA jobs restore immutable profiles and inject prompt, references, seed, and saver path');
} finally {
  globalThis.fetch = originalFetch;
  await pool.query("delete from workflow_profiles where id in ('source-smoke','source-smoke-i2va')");
  await pool.query('delete from jobs where shot_id=$1', [shotId]);
  await pool.query('delete from shots where id=$1', [shotId]);
  await pool.query('delete from scenes where id=$1', [sceneId]);
  await pool.query('delete from projects where id=$1', [projectId]);
  await pool.query('delete from asset_versions where id=$1', [imageAssetVersionId]);
  await pool.end();
  await app.close();
}
