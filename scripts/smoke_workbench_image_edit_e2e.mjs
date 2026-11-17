import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';
import pg from 'pg';
import { comfyReferenceUploadTarget } from '../packages/workflow-adapters/src/comfy-upload.ts';

process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
const root = await mkdtemp(join(tmpdir(), 'qwendirector-qwen-edit-e2e-'));
process.env.QWEN_ASSET_ROOT = root;

const schema = {
  LoadImage: { input:{ required:{ image:['STRING',{}] } }, output:['IMAGE'] },
  TextEncodeQwenImage21: { input:{ required:{ clip:['CLIP',{}], prompt:['STRING',{}], negative_prompt:['STRING',{}], resolution:['INT',{}], images:['COMFY_AUTOGROW_V3',{ template:{ input:{ required:{ image:['IMAGE',{}] } }, names:['image_1','image_2'], min:0 } }] }, optional:{ vae:['VAE',{}] } }, output:['CONDITIONING','CONDITIONING','LATENT'] },
  CLIPLoader: { input:{ required:{ clip_name:['STRING',{}], type:['STRING',{}] } }, output:['CLIP'] },
  VAELoader: { input:{ required:{ vae_name:['STRING',{}] } }, output:['VAE'] },
  VAEEncode: { input:{ required:{ pixels:['IMAGE',{}], vae:['VAE',{}] } }, output:['LATENT'] },
  UNETLoader: { input:{ required:{ unet_name:['STRING',{}], weight_dtype:['STRING',{}] } }, output:['MODEL'] },
  KSampler: { input:{ required:{ model:['MODEL',{}], seed:['INT',{}], steps:['INT',{}], cfg:['FLOAT',{}], sampler_name:['STRING',{}], scheduler:['STRING',{}], positive:['CONDITIONING',{}], negative:['CONDITIONING',{}], latent_image:['LATENT',{}], denoise:['FLOAT',{}] } }, output:['LATENT'] },
  VAEDecode: { input:{ required:{ samples:['LATENT',{}], vae:['VAE',{}] } }, output:['IMAGE'] },
  SaveImageAdvanced: { input:{ required:{ images:['IMAGE',{}], filename_prefix:['STRING',{}], format:['COMFY_DYNAMICCOMBO_V3',{ options:[{ key:'png', inputs:{ required:{ bit_depth:['COMBO',{ options:['8-bit','16-bit'] }], input_color_space:['COMBO',{ options:['sRGB'] }] } } }] }] } }, output:['IMAGE'] },
};
const assetA = Buffer.from(`base-image-${randomUUID()}`);
const assetB = Buffer.from(`reference-image-${randomUUID()}`);
const outputBytes = Buffer.from(`qwen-edit-output-${randomUUID()}`);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const uploads = [];
let submittedWorkflow;
const comfy = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  const json = (status, value) => { res.writeHead(status, { 'content-type':'application/json' }); res.end(JSON.stringify(value)); };
  if (url.pathname === '/object_info') return json(200, schema);
  if (url.pathname === '/upload/image' && req.method === 'POST') {
    const filename = body.toString().match(/filename="([^"]+)"/)?.[1];
    const subfolder = body.toString().match(/name="subfolder"\r\n\r\n([^\r]+)/)?.[1] ?? '';
    uploads.push({ filename, subfolder, body });
    return json(200, { name:filename, subfolder, type:'input' });
  }
  if (url.pathname === '/prompt' && req.method === 'POST') {
    submittedWorkflow = JSON.parse(body.toString()).prompt;
    return json(200, { prompt_id:'mock-qwen-edit-run' });
  }
  if (url.pathname === '/history/mock-qwen-edit-run') return json(200, {
    'mock-qwen-edit-run': { status:{ status_str:'success', completed:true }, outputs:{ '9':{ images:[{ filename:'edited.png', subfolder:'', type:'output' }] } } },
  });
  if (url.pathname === '/view') { res.writeHead(200, { 'content-type':'image/png' }); return res.end(outputBytes); }
  if (url.pathname === '/interrupt') return json(200, {});
  return json(404, { error:'not found' });
});

await new Promise((resolve) => comfy.listen(0, '127.0.0.1', resolve));
const comfyUrl = `http://127.0.0.1:${comfy.address().port}`;
process.env.COMFYUI_URL = comfyUrl;
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ connectionString:process.env.DATABASE_URL });
const apiUrl = await app.listen({ host:'127.0.0.1', port:0 });
const ids = { project:randomUUID(), scene:randomUUID(), shot:randomUUID(), inputA:undefined, inputB:undefined, output:undefined, job:undefined, profile:`qwen-edit-e2e-${randomUUID()}`, node:randomUUID() };
let worker;
let workerLogs = '';

async function waitFor(predicate, message, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await predicate();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${message}${workerLogs ? `\nworker: ${workerLogs.slice(-3000)}` : ''}`);
}

try {
  await pool.query('insert into projects(id,name) values($1,$2)',[ids.project,'qwen-edit-worker-e2e']);
  await pool.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)',[ids.scene,ids.project,'scene']);
  await pool.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)',[ids.shot,ids.scene,'shot']);
  const importAsset = async (logicalName, bytes) => {
    const response = await app.inject({ method:'POST', url:'/v1/assets/import', payload:{ logicalName, sha256:digest(bytes), mimeType:'image/png', contentBase64:bytes.toString('base64'), actor:'smoke-test', assetKind:'reference' } });
    assert.equal(response.statusCode,201,response.body);
    return response.json().assetVersionId;
  };
  ids.inputA = await importAsset('base.png',assetA);
  ids.inputB = await importAsset('reference.png',assetB);

  // IDs are intentionally opposite numeric/node enumeration order. Binding must follow image_1/image_2 semantics.
  const graph = {
    '1':{ class_type:'LoadImage', inputs:{ image:'placeholder-second.png' } },
    '2':{ class_type:'LoadImage', inputs:{ image:'placeholder-first.png' } },
    '3':{ class_type:'TextEncodeQwenImage21', inputs:{ clip:['5',0], prompt:'template prompt', negative_prompt:'', resolution:1024, 'images.image_1':['2',0], 'images.image_2':['1',0], vae:['4',0] } },
    '4':{ class_type:'VAELoader', inputs:{ vae_name:'qwen_image_2.1_vae_bf16.safetensors' } },
    '5':{ class_type:'CLIPLoader', inputs:{ clip_name:'qwen3.5_9b_qwen_image_2.1_pe_i2i.int8_convrot.safetensors', type:'qwen_image' } },
    '6':{ class_type:'UNETLoader', inputs:{ unet_name:'qwen_image_2.1_int8_convrot.safetensors', weight_dtype:'default' } },
    '10':{ class_type:'VAEEncode', inputs:{ pixels:['2',0], vae:['4',0] } },
    '7':{ class_type:'KSampler', inputs:{ model:['6',0], seed:27, steps:30, cfg:1, sampler_name:'euler', scheduler:'simple', positive:['3',0], negative:['3',1], latent_image:['10',0], denoise:0.52 } },
    '8':{ class_type:'VAEDecode', inputs:{ samples:['7',0], vae:['4',0] } },
    '9':{ class_type:'SaveImageAdvanced', inputs:{ images:['8',0], filename_prefix:'template', format:'png', 'format.bit_depth':'8-bit', 'format.input_color_space':'sRGB' } },
  };
  const saved = await app.inject({ method:'POST', url:'/v1/workbenches/profiles', payload:{ id:ids.profile, name:'Qwen image edit worker E2E', kind:'image-edit', graph, imageNodeIds:['2','1'], outputBindings:{ '9':'image' } } });
  assert.equal(saved.statusCode,201,saved.body);
  assert.deepEqual(saved.json().reference_bindings.imageNodeIds,['2','1']);
  const activated = await app.inject({ method:'POST', url:`/v1/workbenches/profiles/${ids.profile}/activate` });
  assert.equal(activated.statusCode,200,activated.body);

  const created = await app.inject({ method:'POST', url:'/v1/director/jobs', payload:{
    project:'qwen-edit-worker-e2e', scene:'scene', shot:'shot', projectId:ids.project, sceneId:ids.scene, shotId:ids.shot,
    idempotencyKey:`qwen-edit-e2e-${randomUUID()}`, prompt:'Preserve the room layout and edit the monitor contents into a coherent digital world.',
    action:'Replace only the active display image with an immersive 3D world.', composition:'Keep the room composition from Picture 1.',
    adapterId:'comfyui', workflowProfileId:ids.profile,
    references:[{ assetVersionId:ids.inputA, filename:'base.png', type:'image', role:'picture' },{ assetVersionId:ids.inputB, filename:'reference.png', type:'image', role:'layout' }],
  } });
  assert.equal(created.statusCode,201,created.body);
  ids.job = created.json().jobId;
  const plan = (await pool.query('select plan_json from jobs where id=$1',[ids.job])).rows[0].plan_json;
  assert.deepEqual(plan.workflowProfile.referenceBindings.imageNodeIds,['2','1']);
  assert.match(plan.prompt,/Use Picture 1 as the base image to edit/);
  const approval = await app.inject({ method:'POST', url:`/v1/jobs/${ids.job}/approve`, payload:{ planHash:created.json().planHash, actor:'smoke-test', retryBudget:0 } });
  assert.equal(approval.statusCode,200,approval.body);
  assert.equal(approval.json().state,'queued');

  const workerEnv = { ...process.env, QWEN_API_BASE_URL:apiUrl, QWEN_NODE_ID:ids.node, QWEN_INSTANCE_ID:'qwen-edit-worker-e2e', QWEN_WORKER_POLL_MS:'20', QWEN_COMFY_POLL_MS:'10', QWEN_COMFY_TIMEOUT_MS:'10000', QWEN_ASSET_ROOT:root, QWEN_API_AUTOSTART:'false', COMFYUI_URL:comfyUrl };
  worker = spawn(process.execPath,['--import','tsx','apps/worker/src/main.ts'],{ cwd:process.cwd(), env:workerEnv, stdio:['ignore','pipe','pipe'] });
  worker.stdout.on('data',(chunk)=>{ workerLogs=(workerLogs+chunk.toString()).slice(-5000); });
  worker.stderr.on('data',(chunk)=>{ workerLogs=(workerLogs+chunk.toString()).slice(-5000); });

  const finalState = await waitFor(async()=>{
    const row=(await pool.query('select state from jobs where id=$1',[ids.job])).rows[0];
    return ['succeeded','failed','cancelled'].includes(row?.state) ? row.state : undefined;
  },'Qwen image-edit worker did not reach a terminal job state');
  if (finalState !== 'succeeded') throw new Error(`QWEN_IMAGE_EDIT_E2E_${finalState}${workerLogs ? `\nworker: ${workerLogs}` : ''}`);

  const targetA = comfyReferenceUploadTarget({ attemptId:(await pool.query('select id from attempts where job_id=$1',[ids.job])).rows[0].id, assetVersionId:ids.inputA, role:'picture', index:0, filename:'base.png' });
  const targetB = comfyReferenceUploadTarget({ attemptId:(await pool.query('select id from attempts where job_id=$1',[ids.job])).rows[0].id, assetVersionId:ids.inputB, role:'layout', index:1, filename:'reference.png' });
  assert.equal(uploads.length,2);
  assert.ok(uploads.some((item)=>item.body.includes(assetA)),'worker uploads the selected base AssetVersion bytes');
  assert.ok(uploads.some((item)=>item.body.includes(assetB)),'worker uploads the additional reference AssetVersion bytes');
  assert.equal(submittedWorkflow['2'].inputs.image,`${targetA.subfolder}/${targetA.filename}`,'first selected image reaches the node wired to encoder image_1');
  assert.equal(submittedWorkflow['1'].inputs.image,`${targetB.subfolder}/${targetB.filename}`,'second selected image reaches the node wired to encoder image_2');
  assert.match(submittedWorkflow['3'].inputs.prompt,/Use Picture 1 as the base image to edit/);
  assert.match(submittedWorkflow['3'].inputs.prompt,/room layout and edit the monitor contents/);
  assert.deepEqual(submittedWorkflow['3'].inputs['images.image_1'],['2',0]);
  assert.deepEqual(submittedWorkflow['3'].inputs['images.image_2'],['1',0]);
  assert.equal(submittedWorkflow['9'].inputs.filename_prefix,`qwendirector/${ids.job}`);

  const result = await app.inject({ method:'GET', url:`/v1/jobs/${ids.job}/result` });
  assert.equal(result.statusCode,200,result.body);
  const output = result.json().manifest.outputs[0];
  ids.output = output.assetVersionId;
  assert.equal(output.mimeType,'image/png');
  assert.equal(output.slot,'image');
  assert.equal(output.provenance.outputNodeId,'9');
  const stored = await app.inject({ method:'GET', url:`/v1/assets/${ids.output}` });
  assert.equal(stored.statusCode,200);
  assert.deepEqual(Buffer.from(stored.rawPayload),outputBytes);
  console.log('OK: approved Qwen image-edit job → ordered AssetVersion injection → mocked ComfyUI → durable CAS image manifest');
} finally {
  if (worker && worker.exitCode === null) {
    worker.kill('SIGINT');
    await Promise.race([once(worker,'exit'),new Promise((resolve)=>setTimeout(resolve,2000))]);
  }
  if (ids.job) {
    await pool.query('delete from attempt_manifests where attempt_id in(select id from attempts where job_id=$1)',[ids.job]);
    await pool.query('delete from attempt_assets where attempt_id in(select id from attempts where job_id=$1)',[ids.job]);
    await pool.query('delete from attempts where job_id=$1',[ids.job]);
    await pool.query('delete from approvals where job_id=$1',[ids.job]);
    await pool.query('delete from jobs where id=$1',[ids.job]);
  }
  await pool.query('delete from workflow_profiles where id=$1',[ids.profile]);
  await pool.query('delete from nodes where id=$1',[ids.node]);
  await pool.query('delete from shots where id=$1',[ids.shot]);
  await pool.query('delete from scenes where id=$1',[ids.scene]);
  await pool.query('delete from projects where id=$1',[ids.project]);
  const assetIds=[ids.inputA,ids.inputB,ids.output].filter(Boolean);
  if (assetIds.length) await pool.query('delete from asset_versions where id=any($1::uuid[])',[assetIds]);
  await pool.end();
  await app.close();
  await new Promise((resolve)=>comfy.close(resolve));
  await rm(root,{recursive:true,force:true});
}
