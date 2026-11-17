import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { digestWorkflow } from '@qwendirector/workflow-adapters/workbench-catalog';

process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const id = `workbench-binding-${randomUUID()}`;
const imageIds = [randomUUID(), randomUUID()];
const legacyImageEditId = `legacy-image-edit-${randomUUID()}`;
let jobId;
let projectId;
const graph = {
  '1': { class_type:'LoadImage', inputs:{ image:'base.png' } },
  '2': { class_type:'LoadImage', inputs:{ image:'reference.png' } },
  '3': { class_type:'SaveImage', inputs:{} },
};

try {
  await pool.query(`insert into asset_versions(id,sha256,byte_size,mime_type,storage_key,provenance,asset_kind,tags) values
    ($1,repeat('c',64),1,'image/png',$3,'{}','reference','[]'),($2,repeat('d',64),1,'image/png',$4,'{}','reference','[]')`, [imageIds[0], imageIds[1], `smoke/${imageIds[0]}`, `smoke/${imageIds[1]}`]);
  const saved = await app.inject({ method:'POST', url:'/v1/workbenches/profiles', payload:{
    id, name:'Reference binding smoke', kind:'actor', graph,
    imageNodeIds:['2','1'], outputBindings:{ '3':'master' },
  } });
  assert.equal(saved.statusCode,201,saved.body);
  assert.deepEqual(saved.json().reference_bindings.imageNodeIds,['2','1']);
  const loaded = await app.inject({ method:'GET', url:`/v1/workflow-profiles/${id}` });
  assert.equal(loaded.statusCode,200,loaded.body);
  assert.deepEqual(loaded.json().reference_bindings.imageNodeIds,['2','1']);
  const catalog = await app.inject({ method:'GET', url:'/v1/workflow-profiles/catalog' });
  assert.deepEqual(catalog.json().profiles.find((profile) => profile.id === id).reference_bindings.imageNodeIds,['2','1']);
  await pool.query('update workflow_profiles set active=true where id=$1',[id]);
  const missingReferences = await app.inject({ method:'POST', url:'/v1/director/jobs', payload:{
    project:'Reference binding smoke', scene:'Scene', shot:'Shot', prompt:'A test shot.',
    adapterId:'comfyui', workflowProfileId:id,
  } });
  assert.equal(missingReferences.statusCode,400,missingReferences.body);
  assert.equal(missingReferences.json().code,'WORKBENCH_IMAGE_REFERENCE_COUNT_MISMATCH');
  const created = await app.inject({ method:'POST', url:'/v1/director/jobs', payload:{
    project:'Reference binding smoke', scene:'Scene', shot:'Shot', prompt:'A test shot.',
    adapterId:'comfyui', workflowProfileId:id,
    references:[{assetVersionId:imageIds[0],filename:'first.png'},{assetVersionId:imageIds[1],filename:'second.png'}],
  } });
  assert.equal(created.statusCode,201,created.body);
  jobId = created.json().jobId; projectId = created.json().projectId;
  assert.equal(created.json().state,'awaiting_approval');
  const storedJob = await pool.query('select plan_json from jobs where id=$1',[jobId]);
  assert.deepEqual(storedJob.rows[0].plan_json.workflowProfile.referenceBindings.imageNodeIds,['2','1']);

  // Older profiles may store the empty-latent switch branch. Their explicit
  // runtime test must normalize exactly as job creation does.
  const legacyGraph = {
    load: { class_type:'LoadImage', inputs:{ image:'base.png' } },
    encoder: { class_type:'TextEncodeQwenImage21', inputs:{ 'images.image_1':['load',0], resolution:32 } },
    sampler: { class_type:'KSampler', inputs:{ latent_image:['switch',0] } },
    switch: { class_type:'ComfySwitchNode', inputs:{ switch:true, on_true:['empty',0], on_false:['encoder',2] } },
    empty: { class_type:'EmptyLatentImage', inputs:{ width:64, height:64, batch_size:1 } },
    save: { class_type:'SaveImageAdvanced', inputs:{} },
    orphan: { class_type:'TextGenerate', inputs:{ prompt:'unused helper' } },
  };
  const legacySaved = await app.inject({ method:'POST', url:'/v1/workbenches/profiles', payload:{
    id:legacyImageEditId, name:'Legacy image-edit latent branch', kind:'image-edit', graph:legacyGraph,
  } });
  assert.equal(legacySaved.statusCode,201,legacySaved.body);
  const rawHash = digestWorkflow(legacyGraph);
  await pool.query('update workflow_profiles set graph=$2,graph_hash=$3,active=true where id=$1',[legacyImageEditId,legacyGraph,rawHash]);
  const schema = {
    LoadImage: { input:{ required:{ image:['STRING'] } }, output:['IMAGE'] },
    TextEncodeQwenImage21: { input:{ required:{ images:['COMFY_AUTOGROW_V3',{ template:{ min:1,names:['image_1'],prefix:'image_',input:{required:{value:['IMAGE']}} } }], resolution:['INT'] } }, output:['CONDITIONING','CONDITIONING','LATENT'] },
    KSampler: { input:{ required:{ latent_image:['LATENT'] } }, output:['LATENT'] },
    ComfySwitchNode: { input:{ required:{ switch:['BOOLEAN'],on_true:['LATENT'],on_false:['LATENT'] } }, output:['COMFY_MATCHTYPE_V3'] },
    EmptyLatentImage: { input:{ required:{ width:['INT'],height:['INT'],batch_size:['INT'] } }, output:['LATENT'] },
    SaveImageAdvanced: { input:{ required:{} }, output:[] },
    TextGenerate: { input:{ required:{ prompt:['STRING'] } }, output:['STRING'] },
  };
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json(schema);
    const tested = await app.inject({ method:'POST', url:`/v1/workbenches/profiles/${legacyImageEditId}/test` });
    assert.equal(tested.statusCode,200,tested.body);
    assert.equal(tested.json().storedGraphHash,rawHash);
    assert.notEqual(tested.json().graphHash,rawHash);
    assert.equal(tested.json().runtime.reachable,true);
    const activated = await app.inject({ method:'POST', url:`/v1/workbenches/profiles/${legacyImageEditId}/activate` });
    assert.equal(activated.statusCode,200,activated.body);
    assert.equal(activated.json().graphHash,rawHash);
    assert.notEqual(activated.json().executableGraphHash,rawHash);
  } finally { globalThis.fetch = oldFetch; }
  console.log('workbench profile image binding persistence smoke: ok');
} finally {
  if (jobId) await pool.query('delete from jobs where id=$1',[jobId]);
  if (projectId) {
    await pool.query('delete from shots where scene_id in (select id from scenes where project_id=$1)',[projectId]);
    await pool.query('delete from scenes where project_id=$1',[projectId]);
    await pool.query('delete from projects where id=$1',[projectId]);
  }
  await pool.query('delete from asset_versions where id=any($1::uuid[])',[imageIds]);
  await pool.query('delete from workflow_profiles where id=$1',[id]);
  await pool.query('delete from workflow_profiles where id=$1',[legacyImageEditId]);
  await pool.end();
  await app.close();
}
