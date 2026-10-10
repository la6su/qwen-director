import Fastify from 'fastify';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createAttemptRepository, createNodeRepository, createAssetStorage } from './storage-factory.js';
import { createH3WorkflowProfile, createH3RefModWorkflowProfile } from '@qwendirector/workflow-adapters/h3-profile';
import { preflightH3Runtime, preflightH3RefModRuntime, validateH3Workflow, validateH3RefModWorkflow } from '@qwendirector/workflow-adapters/h3-workflow';
import { planBrief } from '@qwendirector/contracts/planner';
import { createWorkbenchPlan, type WorkbenchKind } from '@qwendirector/workflow-adapters/workbenches';
import { validateWorkbenchGraph, WORKBENCH_WORKFLOW_SPECS } from '@qwendirector/workflow-adapters/workbench-catalog';
import { WORKBENCH_CONTRACTS } from '@qwendirector/workflow-adapters/workbenches';

type State = 'awaiting_approval' | 'queued' | 'leased' | 'succeeded' | 'cancelled';
type Job = { id: string; shotId: string; planHash: string; requestHash: string; state: State; createdAt: string; };
const jobs = new Map<string, Job>();
const byKey = new Map<string, Job>();
const attempts = createAttemptRepository();
const nodes = createNodeRepository();
const assetStorage = createAssetStorage();
const configuredImportLimit = Number(process.env.QWEN_MAX_IMPORT_BYTES ?? 104857600);
const configuredOutputLimit = Number(process.env.QWEN_MAX_OUTPUT_BYTES ?? 536870912);
const maxOutputBytes = Number.isSafeInteger(configuredOutputLimit) && configuredOutputLimit > 0 ? configuredOutputLimit : 536870912;
const apiBodyLimit = Number.isSafeInteger(configuredImportLimit) && configuredImportLimit > 0 ? Math.min(Math.max(configuredImportLimit, maxOutputBytes) * 2, 1073741824) : 2097152;
const tlsCertFile = process.env.QWEN_TLS_CERT_FILE;
const tlsKeyFile = process.env.QWEN_TLS_KEY_FILE;
if ((tlsCertFile && !tlsKeyFile) || (!tlsCertFile && tlsKeyFile)) throw new Error('QWEN_TLS_CERT_AND_KEY_REQUIRED');
const fastifyOptions: any = {
  logger: {
    level: process.env.QWEN_LOG_LEVEL ?? 'info',
    redact: ['req.headers.authorization'],
  },
  bodyLimit: apiBodyLimit,
};
if (tlsCertFile && tlsKeyFile) fastifyOptions.https = { cert: readFileSync(tlsCertFile), key: readFileSync(tlsKeyFile) };
export const app = Fastify(fastifyOptions);
const metrics = { requests: 0, errors: 0 };
app.addHook('onRequest', async () => { metrics.requests++; });
app.addHook('onResponse', async (_request, reply) => { if (reply.statusCode >= 500) metrics.errors++; });
app.addHook('onClose', async () => { if ('close' in attempts) await attempts.close(); });
app.addHook('preHandler', async (request, reply) => {
  const expected = process.env.QWEN_API_TOKEN;
  if (!expected || request.url === '/health' || request.url === '/ready' || request.url === '/metrics') return;
  const header = request.headers.authorization ?? '';
  const supplied = Buffer.from(header); const target = Buffer.from(`Bearer ${expected}`);
  if (supplied.length !== target.length || !timingSafeEqual(supplied, target)) return reply.code(401).send({ code:'UNAUTHORIZED' });
});
app.addHook('preHandler', async (request, reply) => {
  if (!('jobs' in attempts) || request.method !== 'POST') return;
  const match = request.url.match(/^\/v1\/jobs\/([^/]+)\/(approve|cancel)$/);
  const body = request.body as { shotId: string; planHash: string; idempotencyKey: string; requestHash: string; requiredCapabilities?: Record<string, unknown>; adapterId?: string; plan?: Record<string, unknown>; actor: string; retryBudget?: number } | undefined;
  try {
    if (request.url === '/v1/jobs') {
      if (!body || ![body.shotId,body.planHash,body.idempotencyKey,body.requestHash].every(v => typeof v === 'string' && v.length > 0)) return reply.code(400).send({code:'INVALID_INPUT'});
      const result = await attempts.jobs.create(body);
      return reply.code(result.replayed ? 200 : 201).send(result);
    }
    if (match?.[2] === 'approve') {
      if (!body) return reply.code(400).send({code:'INVALID_INPUT'});
      return reply.send(await attempts.jobs.approve(match[1],body.planHash,body.actor,body.retryBudget));
    }
    if (match?.[2] === 'cancel') return reply.send(await attempts.jobs.cancel(match[1]));
  } catch(e) {
    const error = e as Error & {code?:string};
    const code = ['22P02','23503'].includes(error.code ?? '') ? 'INVALID_INPUT' : error.message;
    const known = ['INVALID_INPUT','INVALID_STATE','NOT_FOUND','APPROVAL_REQUIRED','IDEMPOTENCY_CONFLICT'];
    return reply.code(code === 'INVALID_INPUT' ? 400 : code === 'NOT_FOUND' ? 404 : known.includes(code) ? 409 : 500).send({code:known.includes(code) ? code : 'STORAGE_ERROR'});
  }
});

app.get('/health', async () => ({ status: 'ok', service: 'qwendirector-api' }));
app.get('/metrics', async (_request, reply) => { reply.type('text/plain; version=0.0.4'); return `qwendirector_http_requests_total ${metrics.requests}\nqwendirector_http_errors_total ${metrics.errors}\n`; });
app.get('/ready', async (_request, reply) => {
  const checks = [
    ['comfyui', process.env.COMFYUI_URL ?? 'http://192.168.10.103:8188/system_stats'],
    ['llama.cpp', `${process.env.QWEN_LLAMA_URL ?? 'http://127.0.0.1:8081'}/health`],
  ] as const;
  const results: Array<{id:string;ok:boolean;status:number|null}> = await Promise.all(checks.map(async ([id, url]) => { try { const response = await fetch(url, { signal: AbortSignal.timeout(3000) }); return { id, ok: response.ok, status: response.status }; } catch { return { id, ok:false, status:null }; } }));
  try { await (attempts as any).ready(); results.push({ id:'storage', ok:true, status:200 }); } catch { results.push({ id:'storage', ok:false, status:null }); }
  const ready = results.every((item) => item.ok);
  return reply.code(ready ? 200 : 503).send({ status: ready ? 'ready' : 'not_ready', checkedAt: new Date().toISOString(), checks: results });
});
app.get('/v1/runtime', async () => {
  const checks = [
    { id:'comfyui', base: process.env.COMFYUI_URL ?? 'http://192.168.10.103:8188', paths:['/system_stats','/object_info'] },
    { id:'llama.cpp', base: process.env.QWEN_LLAMA_URL ?? 'http://127.0.0.1:8081', paths:['/health','/v1/models'] },
  ];
  const result = await Promise.all(checks.map(async (check) => { const started=Date.now(); let capabilities: Record<string, unknown> | undefined; const statuses=await Promise.all(check.paths.map(async (path) => { try { const response=await fetch(`${check.base}${path}`); if (check.id === 'comfyui' && path === '/object_info' && response.ok) { try { const info = await response.json() as Record<string, any>; const loraValues = info.LoraLoaderModelOnly?.input?.required?.lora_name?.[0]; const h3Loras = Array.isArray(loraValues) ? loraValues.filter((name: unknown): name is string => typeof name === 'string' && /minimax.*h3|h3.*minimax/i.test(name)) : []; capabilities = { h3: ['MiniMaxH3ReferenceToVideo','RandomNoise','SaveVideo'].every((name) => name in info), classes: ['MiniMaxH3ReferenceToVideo','RandomNoise','SaveVideo'].filter((name) => name in info), optimizationNodes: ['MiniMaxH3MemoryEfficientSageAttentionPatch','EasyCache','LazyCache','LatentUpscale','LatentUpscaleBy'].filter((name) => name in info), h3Loras }; } catch { /* health remains valid when capability payload is unavailable */ } } return {path,status:response.status,ok:response.ok}; } catch { return {path,status:null,ok:false}; } })); return {id:check.id,ok:statuses.every((item)=>item.ok),latencyMs:Date.now()-started,checks:statuses,...(capabilities ? {capabilities} : {})}; }));
  let nodeSnapshot: unknown[] | undefined;
  if (nodes && 'list' in nodes) {
    try { nodeSnapshot = await (nodes as any).list(); } catch { nodeSnapshot = undefined; }
  }
  return { checkedAt:new Date().toISOString(), runtimes:result, ...(nodeSnapshot ? { nodes: nodeSnapshot } : {}) };
});
app.get('/v1/runtime/comfy-schema', async (_request, reply) => { try { const response=await fetch(`${process.env.COMFYUI_URL ?? 'http://192.168.10.103:8188'}/object_info`); if (!response.ok) return reply.code(502).send({code:`COMFY_SCHEMA_${response.status}`}); const info=await response.json() as Record<string, unknown>; const names=['MiniMaxH3ReferenceToVideo','EmptyMiniMaxH3LatentAV','RandomNoise','SaveVideo','LoadImage','LoadAudio']; return { source:'comfyui/object_info', classes:Object.fromEntries(names.filter((name)=>name in info).map((name)=>[name,info[name]])) }; } catch { return reply.code(503).send({code:'COMFY_SCHEMA_UNAVAILABLE'}); } });
app.get('/v1/workflow-profiles', async (_request, reply) => { if (!('listWorkflowProfiles' in attempts)) return reply.code(501).send({code:'WORKFLOW_PROFILE_STORAGE_UNAVAILABLE'}); return { profiles: await (attempts as any).listWorkflowProfiles() }; });
app.get<{ Params:{id:string} }>('/v1/workflow-profiles/:id', async (request, reply) => { if (!('getWorkflowProfile' in attempts)) return reply.code(501).send({code:'WORKFLOW_PROFILE_STORAGE_UNAVAILABLE'}); const profile=await (attempts as any).getWorkflowProfile(request.params.id); return profile ?? reply.code(404).send({code:'NOT_FOUND'}); });
app.post<{ Body: { id:string; name:string; graph:Record<string, any>; referenceBindings?: {mode?:'refmod-i2v';imageNodeIds?:string[];audioNodeIds?:string[]} } }>('/v1/workflow-profiles', async (request, reply) => { if (!('saveWorkflowProfile' in attempts)) return reply.code(501).send({code:'WORKFLOW_PROFILE_STORAGE_UNAVAILABLE'}); try { const body=request.body; const profile=body.referenceBindings?.mode === 'refmod-i2v' ? createH3RefModWorkflowProfile(body.id,body.name,body.graph,body.referenceBindings) : createH3WorkflowProfile(body.id,body.name,body.graph,body.referenceBindings); return reply.code(201).send(await (attempts as any).saveWorkflowProfile(profile)); } catch (e) { return reply.code(400).send({code:(e as Error).message}); } });
app.post<{ Params:{id:string} }>('/v1/workflow-profiles/:id/preflight', async (request, reply) => { if (!('getWorkflowProfile' in attempts)) return reply.code(501).send({code:'WORKFLOW_PROFILE_STORAGE_UNAVAILABLE'}); const profile=await (attempts as any).getWorkflowProfile(request.params.id); if (!profile) return reply.code(404).send({code:'NOT_FOUND'}); try { const refmod=profile.reference_bindings?.mode === 'refmod-i2v'; const boundary=refmod ? validateH3RefModWorkflow(profile.graph,profile.reference_bindings) : validateH3Workflow(profile.graph); const runtime=refmod ? await preflightH3RefModRuntime(process.env.COMFYUI_URL ?? 'http://192.168.10.103:8188',profile.graph,boundary as ReturnType<typeof validateH3RefModWorkflow>) : await preflightH3Runtime(process.env.COMFYUI_URL ?? 'http://192.168.10.103:8188', profile.graph); const activated=await (attempts as any).activateWorkflowProfile(profile.id); return {profileId:profile.id,graphHash:profile.graph_hash,boundary,runtime,revision:profile.revision,active:activated?.active === true}; } catch (e) { return reply.code(409).send({code:(e as Error).message}); } });
app.post<{ Params:{id:string} }>('/v1/workflow-profiles/:id/test', async (request, reply) => { if (!('getWorkflowProfile' in attempts)) return reply.code(501).send({code:'WORKFLOW_PROFILE_STORAGE_UNAVAILABLE'}); const profile=await (attempts as any).getWorkflowProfile(request.params.id); if (!profile) return reply.code(404).send({code:'NOT_FOUND'}); try { const refmod=profile.reference_bindings?.mode === 'refmod-i2v'; const boundary=refmod ? validateH3RefModWorkflow(profile.graph,profile.reference_bindings) : validateH3Workflow(profile.graph); const runtime=refmod ? await preflightH3RefModRuntime(process.env.COMFYUI_URL ?? 'http://192.168.10.103:8188',profile.graph,boundary as ReturnType<typeof validateH3RefModWorkflow>) : await preflightH3Runtime(process.env.COMFYUI_URL ?? 'http://192.168.10.103:8188', profile.graph); return {profileId:profile.id,graphHash:profile.graph_hash,boundary,runtime,revision:profile.revision,active:profile.active === true,tested:true}; } catch (e) { return reply.code(409).send({code:(e as Error).message}); } });
app.get<{ Params:{id:string} }>('/v1/workflow-profiles/:id/revisions', async (request, reply) => { if (!('listWorkflowProfileRevisions' in attempts)) return reply.code(501).send({code:'WORKFLOW_PROFILE_STORAGE_UNAVAILABLE'}); return { profileId:request.params.id, revisions:await (attempts as any).listWorkflowProfileRevisions(request.params.id) }; });
app.post<{ Params:{id:string;revision:string} }>('/v1/workflow-profiles/:id/revisions/:revision/activate', async (request, reply) => { if (!('activateWorkflowProfileRevision' in attempts)) return reply.code(501).send({code:'WORKFLOW_PROFILE_STORAGE_UNAVAILABLE'}); const revision=Number(request.params.revision); if (!Number.isSafeInteger(revision) || revision < 1) return reply.code(400).send({code:'INVALID_REVISION'}); const profile=await (attempts as any).getWorkflowProfile(request.params.id); if (!profile) return reply.code(404).send({code:'NOT_FOUND'}); try { const revisionRow=(await (attempts as any).listWorkflowProfileRevisions(request.params.id)).find((item:any)=>Number(item.revision)===revision); const graph=revisionRow?.graph ?? {}; validateH3Workflow(graph); const activated=await (attempts as any).activateWorkflowProfileRevision(request.params.id,revision); if (!activated) return reply.code(404).send({code:'REVISION_NOT_FOUND'}); const derived=createH3WorkflowProfile(request.params.id,profile.name,graph,activated.reference_bindings); return {profileId:request.params.id,revision,active:true,graphHash:activated.graph_hash,qualityHint:derived.qualityHint,samplingSteps:derived.samplingSteps,loras:derived.loras}; } catch (e) { return reply.code(409).send({code:(e as Error).message}); } });
app.get('/v1/projects', async (_request, reply) => { if (!('listProjects' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); return { projects: await (attempts as any).listProjects() }; });
app.post<{ Body:{name:string} }>('/v1/projects', async (request, reply) => { if (!('createProject' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); try { return reply.code(201).send(await (attempts as any).createProject(request.body?.name)); } catch (e) { return reply.code(400).send({code:(e as Error).message}); } });
app.post<{ Params:{projectId:string}; Body:{title:string} }>('/v1/projects/:projectId/scenes', async (request, reply) => { if (!('createScene' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); try { return reply.code(201).send(await (attempts as any).createScene(request.params.projectId,request.body?.title)); } catch (e) { const code=(e as Error).message; return reply.code(code==='PROJECT_NOT_FOUND'?404:400).send({code}); } });
app.patch<{ Params:{projectId:string}; Body:{sceneIds:string[]} }>('/v1/projects/:projectId/scenes/order', async (request, reply) => { if (!('reorderScenes' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); try { return { projectId:request.params.projectId, scenes:await (attempts as any).reorderScenes(request.params.projectId,request.body?.sceneIds) }; } catch (e) { const code=(e as Error).message; return reply.code(code==='PROJECT_NOT_FOUND'?404:400).send({code}); } });
app.post<{ Params:{sceneId:string}; Body:{title:string;durationSeconds?:number} }>('/v1/scenes/:sceneId/shots', async (request, reply) => { if (!('createShot' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); try { return reply.code(201).send(await (attempts as any).createShot(request.params.sceneId,request.body?.title,request.body?.durationSeconds)); } catch (e) { const code=(e as Error).message; return reply.code(code==='SCENE_NOT_FOUND'?404:400).send({code}); } });
app.patch<{ Params:{sceneId:string}; Body:{shotIds:string[]} }>('/v1/scenes/:sceneId/shots/order', async (request, reply) => { if (!('reorderShots' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); try { return { sceneId:request.params.sceneId, shots:await (attempts as any).reorderShots(request.params.sceneId,request.body?.shotIds) }; } catch (e) { const code=(e as Error).message; return reply.code(code==='SCENE_NOT_FOUND'?404:400).send({code}); } });
app.patch<{ Params:{projectId:string}; Body:{name:string} }>('/v1/projects/:projectId', async (request, reply) => { if (!('renameProject' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); try { return await (attempts as any).renameProject(request.params.projectId,request.body?.name); } catch (e) { const code=(e as Error).message; return reply.code(code==='PROJECT_NOT_FOUND'?404:400).send({code}); } });
app.patch<{ Params:{sceneId:string}; Body:{title:string} }>('/v1/scenes/:sceneId', async (request, reply) => { if (!('renameScene' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); try { return await (attempts as any).renameScene(request.params.sceneId,request.body?.title); } catch (e) { const code=(e as Error).message; return reply.code(code==='SCENE_NOT_FOUND'?404:400).send({code}); } });
app.patch<{ Params:{shotId:string}; Body:{title:string;durationSeconds?:number} }>('/v1/shots/:shotId', async (request, reply) => { if (!('renameShot' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); try { return await (attempts as any).renameShot(request.params.shotId,request.body?.title,request.body?.durationSeconds); } catch (e) { const code=(e as Error).message; return reply.code(code==='SHOT_NOT_FOUND'?404:400).send({code}); } });
app.get<{ Querystring:{state?:string} }>('/v1/jobs', async (request, reply) => { if (!('listJobs' in attempts)) return reply.code(501).send({code:'JOB_STORAGE_UNAVAILABLE'}); return { jobs:await (attempts as any).listJobs(request.query.state) }; });
app.get<{ Params: { projectId: string } }>('/v1/projects/:projectId', async (request, reply) => { if (!('getProject' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); const project = await (attempts as any).getProject(request.params.projectId); return project ?? reply.code(404).send({code:'NOT_FOUND'}); });
app.get<{ Params: { projectId: string } }>('/v1/projects/:projectId/export', async (request, reply) => { if (!('getProject' in attempts)) return reply.code(501).send({code:'PROJECT_STORAGE_UNAVAILABLE'}); const project = await (attempts as any).getProject(request.params.projectId); if (!project) return reply.code(404).send({code:'NOT_FOUND'}); const manifest={schema_version:'1.0',project_id:project.id,project_name:project.name,created_at:project.created_at,scenes:project.scenes,jobs:project.jobs ?? []}; reply.header('content-type','application/json; charset=utf-8').header('content-disposition',`attachment; filename="qwendirector-project-${project.id}.manifest.json"`).header('cache-control','no-store'); return manifest; });
app.get<{ Querystring: { projectId?: string } }>('/v1/assets', async (request, reply) => { if (!('listAssets' in attempts)) return reply.code(501).send({code:'ASSET_STORAGE_UNAVAILABLE'}); return { assets: await (attempts as any).listAssets(request.query.projectId) }; });
app.get<{ Params: { id: string } }>('/v1/jobs/:id', async (request, reply) => {
  if ('jobs' in attempts) { const job = await (attempts as any).jobs.get(request.params.id); return job ? job : reply.code(404).send({ code: 'NOT_FOUND' }); }
  const job = jobs.get(request.params.id); return job ? job : reply.code(404).send({ code: 'NOT_FOUND' });
});
app.get<{ Params: { id: string } }>('/v1/jobs/:id/attempts', async (request, reply) => {
  if (!('listAttempts' in attempts)) return reply.code(501).send({ code: 'ATTEMPT_STORAGE_UNAVAILABLE' });
  const detail = 'jobs' in attempts ? await (attempts as any).jobs.get(request.params.id) : jobs.get(request.params.id);
  if (!detail) return reply.code(404).send({ code: 'NOT_FOUND' });
  return { jobId: request.params.id, attempts: await (attempts as any).listAttempts(request.params.id) };
});
app.get<{ Params: { id: string } }>('/v1/jobs/:id/result', async (request, reply) => { if (!('getJobResult' in attempts)) return reply.code(501).send({code:'RESULT_STORAGE_UNAVAILABLE'}); const result=await (attempts as any).getJobResult(request.params.id); return result ?? reply.code(404).send({code:'NOT_FOUND'}); });
app.get<{ Params: { id: string } }>('/v1/jobs/:id/export', async (request, reply) => { if (!('getJobResult' in attempts)) return reply.code(501).send({code:'RESULT_STORAGE_UNAVAILABLE'}); const result=await (attempts as any).getJobResult(request.params.id); if (!result) return reply.code(404).send({code:'NOT_FOUND'}); reply.header('content-type','application/json; charset=utf-8').header('content-disposition',`attachment; filename="qwendirector-${request.params.id}.manifest.json"`).header('cache-control','no-store'); return result; });
app.post<{ Params:{id:string}; Body:{assetVersionId:string;actor:string} }>('/v1/jobs/:id/select-output', async (request, reply) => { if (!('selectJobOutput' in attempts)) return reply.code(501).send({code:'RESULT_STORAGE_UNAVAILABLE'}); try { return await (attempts as any).selectJobOutput(request.params.id,request.body.assetVersionId,request.body.actor); } catch (e) { return reply.code(409).send({code:(e as Error).message}); } });
app.get<{ Params: { projectId: string } }>('/v1/projects/:projectId/timeline', async (request, reply) => {
  if (!('getTimeline' in attempts)) return reply.code(501).send({ code: 'TIMELINE_STORAGE_UNAVAILABLE' });
  return { projectId: request.params.projectId, scenes: await (attempts as any).getTimeline(request.params.projectId) };
});
app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>('/v1/shots/:id/prompt', async (request, reply) => { if (!('saveShotPrompt' in attempts)) return reply.code(501).send({ code:'SHOT_PROMPT_STORAGE_UNAVAILABLE' }); try { return await (attempts as any).saveShotPrompt(request.params.id, request.body ?? {}); } catch (e) { const code=(e as Error).message; return reply.code(code==='SHOT_NOT_FOUND'?404:400).send({code}); } });
app.get<{ Params: { assetVersionId: string } }>('/v1/assets/:assetVersionId', async (request, reply) => {
  if (!('getAsset' in attempts)) return reply.code(501).send({ code:'ASSET_STORAGE_UNAVAILABLE' });
  const asset = await (attempts as any).getAsset(request.params.assetVersionId); if (!asset) return reply.code(404).send({ code:'NOT_FOUND' });
  try {
    const stream = await assetStorage.openRead(asset.storage_key);
    const filename = asset.storage_key.split('/').pop() || asset.id;
    reply.header('content-type', asset.mime_type).header('content-length', String(asset.byte_size)).header('x-content-sha256', asset.sha256).header('cache-control', 'private, max-age=31536000, immutable').header('content-disposition', `inline; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
    return reply.send(stream);
  } catch { return reply.code(410).send({ code:'ASSET_BLOB_MISSING' }); }
});
app.get<{ Params: { assetVersionId: string } }>('/v1/assets/:assetVersionId/lineage', async (request, reply) => { if (!('getAssetLineage' in attempts)) return reply.code(501).send({code:'ASSET_STORAGE_UNAVAILABLE'}); const lineage = await (attempts as any).getAssetLineage(request.params.assetVersionId); if (!lineage) return reply.code(404).send({code:'NOT_FOUND'}); return lineage; });
app.post<{ Body: { logicalName:string; sha256:string; mimeType:string; contentBase64:string; actor:string; assetKind?:string; tags?:string[]; derivedFromAssetVersionIds?:string[] } }>('/v1/assets/import', async (request, reply) => { if (!('importAsset' in attempts)) return reply.code(501).send({code:'ASSET_STORAGE_UNAVAILABLE'}); try { const b=request.body; const bytes=Buffer.from(b.contentBase64 ?? '', 'base64'); const maxBytes=Number(process.env.QWEN_MAX_IMPORT_BYTES ?? 104857600); if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || bytes.length > maxBytes) throw new Error('ASSET_IMPORT_TOO_LARGE'); if (!b.logicalName || !b.sha256 || !b.mimeType || !b.actor || !bytes.length) throw new Error('INVALID_ASSET_IMPORT'); return reply.code(201).send(await (attempts as any).importAsset(b.logicalName,bytes,b.sha256,b.mimeType,b.actor,assetStorage,b.assetKind,b.tags,b.derivedFromAssetVersionIds)); } catch(e) { const code=(e as Error).message; return reply.code(code==='INVALID_ASSET_IMPORT'||code==='INVALID_ASSET_METADATA'||code==='LINEAGE_PARENT_NOT_FOUND'||code==='ASSET_IMPORT_TOO_LARGE'||code==='SHA256_MISMATCH'?400:500).send({code}); } });
app.post<{ Body: { project: string; scene: string; shot: string; projectId?:string; sceneId?:string; shotId?:string; prompt?: string; camera?: string; action?: string; composition?: string; lighting?: string; sound?: string; transition?: string; adapterId?: string; workflow?: Record<string, any>; workflowProfileId?: string; workflowProfileName?: string; workflowReferenceBindings?: { imageNodeIds?: string[]; audioNodeIds?: string[] }; references?: Array<{ assetVersionId:string; filename:string; type?:'image'|'audio'; role?:'picture'|'actor'|'set'|'prop'|'audio' }>; width?: number; height?: number; length?: number; seed?: number } }>('/v1/director/jobs', async (request, reply) => {
  const body = request.body;
  if (!body?.project?.trim() || !body.scene?.trim() || !body.shot?.trim() || ![body.prompt,body.camera,body.action,body.composition,body.lighting,body.sound,body.transition].some((value) => value?.trim())) return reply.code(400).send({ code: 'INVALID_INPUT' });
  const shotId = randomUUID();
  const planHash = `plan:${shotId}`;
  const requestHash = `request:${shotId}`;
  const idempotencyKey = `director:${shotId}`;
  if ('jobs' in attempts) { try { const result = await (attempts as any).jobs.createDirector(body); return reply.code(201).send({ ...result, project: body.project, scene: body.scene, shot: body.shot }); } catch (error) { const code = (error as Error).message; return reply.code(code === 'JOB_QUOTA_EXCEEDED' ? 429 : code === 'CATALOG_REFERENCE_NOT_FOUND' ? 404 : code === 'IDEMPOTENCY_CONFLICT' ? 409 : code === 'INVALID_WORKFLOW_PLAN' || code === 'EMPTY_DIRECTOR_PROMPT' || code === 'WORKFLOW_PROFILE_NOT_ACTIVE' || code === 'REFERENCE_ASSET_NOT_FOUND' || code === 'REFERENCE_MIME_MISMATCH' || code === 'INVALID_REFERENCE_PLAN' || code === 'INVALID_REFERENCE_ROLE' || code === 'INCOMPLETE_CATALOG_REFERENCE' || code.startsWith('H3_WORKFLOW_') ? 400 : 500).send({ code }); } }
  const job: Job = { id: randomUUID(), shotId, planHash, requestHash, state: 'awaiting_approval', createdAt: new Date().toISOString() };
  jobs.set(job.id, job);
  return reply.code(201).send({ jobId: job.id, shotId, state: job.state, project: body.project, scene: body.scene, shot: body.shot });
});
app.post<{ Body: { nodeId?: string; instanceId: string; capabilities: Record<string, unknown> } }>('/v1/nodes/register', async (request, reply) => { if (!nodes) return reply.code(501).send({ code:'NODE_STORAGE_UNAVAILABLE' }); try { return await nodes.register(request.body); } catch (e) { return reply.code(409).send({ code:(e as Error).message }); } });
app.get('/v1/nodes', async (_request, reply) => { if (!nodes || !('list' in nodes)) return reply.code(501).send({ code:'NODE_STORAGE_UNAVAILABLE' }); return { nodes: await (nodes as any).list() }; });
app.post<{ Body: { prompt:string; camera?:string; action?:string; composition?:string; lighting?:string; sound?:string; transition?:string; model?:string } }>('/v1/planner/plan', async (request, reply) => { if (!request.body?.prompt?.trim()) return reply.code(400).send({ code:'PLANNER_PROMPT_REQUIRED' }); return planBrief(request.body, request.body.model ?? 'local-planner'); });
app.post<{ Body: { kind: WorkbenchKind; inputs: Record<string, unknown>; workflowDigest: string } }>('/v1/workbenches/plan', async (request, reply) => {
  try {
    const body = request.body;
    if (!body?.kind || !body.inputs || !body.workflowDigest) return reply.code(400).send({ code: 'WORKBENCH_PLAN_REQUIRED' });
    return createWorkbenchPlan(body.kind, body.inputs, body.workflowDigest);
  } catch (error) { return reply.code(400).send({ code: (error as Error).message }); }
});
app.get('/v1/workbenches/catalog', async () => ({ workbenches: WORKBENCH_CONTRACTS.map((contract) => ({ ...contract, workflow: WORKBENCH_WORKFLOW_SPECS[contract.kind] })) }));
app.post<{ Body: { kind: WorkbenchKind; graph: Record<string, any>; expectedDigest?: string } }>('/v1/workbenches/validate', async (request, reply) => {
  try {
    const body = request.body;
    if (!body?.kind || !body.graph) return reply.code(400).send({ code: 'WORKBENCH_GRAPH_REQUIRED' });
    const validation = validateWorkbenchGraph(body.kind, body.graph, body.expectedDigest);
    return { kind: body.kind, ...validation, accepted: true };
  } catch (error) { return reply.code(400).send({ code: (error as Error).message }); }
});
app.post<{ Body: { id: string; name: string; kind: WorkbenchKind; graph: Record<string, any>; expectedDigest?: string } }>('/v1/workbenches/profiles', async (request, reply) => {
  if (!('saveWorkbenchProfile' in attempts)) return reply.code(501).send({ code: 'WORKBENCH_PROFILE_STORAGE_UNAVAILABLE' });
  try {
    const body = request.body; if (!body?.id || !body.name || !body.kind || !body.graph) return reply.code(400).send({ code: 'WORKBENCH_PROFILE_REQUIRED' });
    const validation = validateWorkbenchGraph(body.kind, body.graph, body.expectedDigest);
    return reply.code(201).send(await (attempts as any).saveWorkbenchProfile({ id: body.id, name: body.name, kind: body.kind, graph: body.graph, graphHash: validation.digest, boundary: { classes: validation.classes } }));
  } catch (error) { return reply.code(400).send({ code: (error as Error).message }); }
});
app.post<{ Params: { id: string } }>('/v1/workbenches/profiles/:id/test', async (request, reply) => {
  if (!('getWorkflowProfile' in attempts)) return reply.code(501).send({ code: 'WORKBENCH_PROFILE_STORAGE_UNAVAILABLE' });
  const profile = await (attempts as any).getWorkflowProfile(request.params.id); if (!profile) return reply.code(404).send({ code: 'NOT_FOUND' });
  try {
    const kind = profile.reference_bindings?.workbenchKind as WorkbenchKind | undefined; if (!kind) throw new Error('WORKBENCH_KIND_MISSING');
    const validation = validateWorkbenchGraph(kind, profile.graph, profile.graph_hash);
    const response = await fetch(`${process.env.COMFYUI_URL ?? 'http://192.168.10.103:8188'}/object_info`);
    if (!response.ok) throw new Error(`COMFY_SCHEMA_${response.status}`);
    const info = await response.json() as Record<string, unknown>;
    const missing = ['LoadImage', 'SaveImage'].filter((name) => !(name in info)); if (missing.length) throw new Error(`WORKBENCH_RUNTIME_CLASSES_MISSING:${missing.join(',')}`);
    return { profileId: profile.id, kind, graphHash: validation.digest, runtime: { reachable: true, classes: ['LoadImage', 'SaveImage'] }, tested: true, active: profile.active === true };
  } catch (error) { return reply.code(409).send({ code: (error as Error).message }); }
});
app.post<{ Params: { id: string } }>('/v1/workbenches/profiles/:id/activate', async (request, reply) => {
  if (!('getWorkflowProfile' in attempts) || !('activateWorkflowProfile' in attempts)) return reply.code(501).send({ code: 'WORKBENCH_PROFILE_STORAGE_UNAVAILABLE' });
  const profile = await (attempts as any).getWorkflowProfile(request.params.id); if (!profile) return reply.code(404).send({ code: 'NOT_FOUND' });
  try {
    const kind = profile.reference_bindings?.workbenchKind as WorkbenchKind | undefined; if (!kind) throw new Error('WORKBENCH_KIND_MISSING');
    validateWorkbenchGraph(kind, profile.graph, profile.graph_hash);
    const activated = await (attempts as any).activateWorkflowProfile(profile.id); return { profileId: profile.id, kind, active: activated?.active === true, graphHash: profile.graph_hash };
  } catch (error) { return reply.code(409).send({ code: (error as Error).message }); }
});
app.post<{ Querystring:{ staleSeconds?: string } }>('/v1/admin/nodes/reconcile', async (request, reply) => { if (!nodes || !('markStale' in nodes)) return reply.code(501).send({ code:'NODE_STORAGE_UNAVAILABLE' }); const seconds = request.query.staleSeconds ? Number(request.query.staleSeconds) : 30; if (!Number.isFinite(seconds) || seconds < 1) return reply.code(400).send({ code:'INVALID_STALE_WINDOW' }); const result = await (nodes as any).markStale(seconds); return { markedStale: result.rowCount ?? 0, staleSeconds: seconds }; });
app.post<{ Params: { id: string }; Body: { instanceId: string; capabilities?: Record<string, unknown> } }>('/v1/nodes/:id/heartbeat', async (request, reply) => { if (!nodes) return reply.code(501).send({ code:'NODE_STORAGE_UNAVAILABLE' }); try { return await nodes.heartbeat(request.params.id,request.body.instanceId,request.body.capabilities); } catch (e) { return reply.code(409).send({ code:(e as Error).message }); } });
app.post<{ Body: { nodeId?: string } }>('/v1/worker/claim', async (request, reply) => {
  if ('claimNext' in attempts) {
    const nodeId = request.body?.nodeId ?? '00000000-0000-4000-8000-000000000001';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nodeId)) return reply.code(400).send({ code: 'INVALID_NODE_ID' });
    const attempt = await (attempts as any).claimNext(nodeId);
    if (!attempt) return reply.code(204).send();
    return { jobId: attempt.jobId, attemptId: attempt.id, fencingToken: Number(attempt.fencing_token), planHash: attempt.planHash, adapterId: attempt.adapterId, plan: attempt.plan, requiredCapabilities: attempt.requiredCapabilities };
  }
  const job = [...jobs.values()].find((candidate) => candidate.state === 'queued');
  if (!job) return reply.code(204).send();
  try {
    const attempt = await attempts.claim(job.id, request.body?.nodeId ?? 'local');
    return { jobId: job.id, attemptId: attempt.id, fencingToken: attempt.fencingToken, planHash: job.planHash };
  } catch (e) { return reply.code(409).send({ code: (e as Error).message }); }
});
app.post<{ Body: { shotId: string; planHash: string; idempotencyKey: string; requestHash: string } }>('/v1/jobs', async (request, reply) => {
  const body = request.body;
  if (!body?.shotId || !body.planHash || !body.idempotencyKey || !body.requestHash) return reply.code(400).send({ code: 'INVALID_INPUT' });
  const key = `${body.shotId}:${body.idempotencyKey}`;
  const prior = byKey.get(key);
  if (prior) { if (prior.requestHash !== body.requestHash) return reply.code(409).send({ code: 'IDEMPOTENCY_CONFLICT' }); return { jobId: prior.id, replayed: true, state: prior.state }; }
  const job: Job = { id: randomUUID(), shotId: body.shotId, planHash: body.planHash, requestHash: body.requestHash, state: 'awaiting_approval', createdAt: new Date().toISOString() };
  jobs.set(job.id, job); byKey.set(key, job); return reply.code(201).send({ jobId: job.id, replayed: false, state: job.state });
});
app.post<{ Params: { id: string }; Body: { planHash: string; actor: string; retryBudget?: number } }>('/v1/jobs/:id/approve', async (request, reply) => { const job = jobs.get(request.params.id); if (!job) return reply.code(404).send({ code: 'NOT_FOUND' }); if (job.planHash !== request.body.planHash || !request.body.actor) return reply.code(409).send({ code: 'APPROVAL_REQUIRED' }); job.state = 'queued'; return { jobId: job.id, state: job.state }; });
app.post<{ Params: { id: string } }>('/v1/jobs/:id/cancel', async (request, reply) => { const job = jobs.get(request.params.id); if (!job) return reply.code(404).send({ code: 'NOT_FOUND' }); job.state = 'cancelled'; return { jobId: job.id, state: job.state }; });
app.post<{ Params: { id: string }; Body: { actor: string } }>('/v1/jobs/:id/retry', async (request, reply) => { if (!('jobs' in attempts) || !('retry' in (attempts as any).jobs)) return reply.code(501).send({code:'RETRY_STORAGE_UNAVAILABLE'}); try { return await (attempts as any).jobs.retry(request.params.id, request.body?.actor); } catch (e) { const code=(e as Error).message; return reply.code(code==='NOT_FOUND'?404:code==='INVALID_STATE'||code==='RETRY_BUDGET_EXHAUSTED'?409:400).send({code}); } });
app.post<{ Params: { id: string } }>('/v1/jobs/:id/claim', async (request, reply) => { const job = jobs.get(request.params.id); if (!job || job.state !== 'queued') return reply.code(409).send({ code: 'INVALID_STATE' }); try { const attempt = await attempts.claim(job.id); job.state = 'queued'; return { attemptId: attempt.id, fencingToken: attempt.fencingToken }; } catch (e) { return reply.code(409).send({ code: (e as Error).message }); } });
app.post<{ Params: { attemptId: string }; Body: { fencingToken: number; sequence: number } }>('/v1/attempts/:attemptId/heartbeat', async (request, reply) => { try { const a = await attempts.heartbeat(request.params.attemptId, request.body.fencingToken, request.body.sequence); const job = await (attempts as any).jobs.get((a as any).job_id); return { attemptId: a.id, state: job?.state ?? a.state, sequence: a.heartbeat_seq }; } catch (e) { return reply.code(409).send({ code: (e as Error).message }); } });
app.post<{ Params: { attemptId: string }; Body: { fencingToken: number; manifest?: unknown } }>('/v1/attempts/:attemptId/commit', async (request, reply) => { try { const a = await attempts.commit(request.params.attemptId, request.body.fencingToken, request.body.manifest ?? {}); const job = jobs.get(a.jobId); if (job) job.state = 'succeeded'; return { attemptId: a.id, state: a.state, manifest: request.body.manifest ?? {} }; } catch (e) { return reply.code(409).send({ code: (e as Error).message }); } });
app.post<{ Params: { attemptId: string }; Body: { fencingToken: number; error?: unknown } }>('/v1/attempts/:attemptId/cancel', async (request, reply) => { if (!('fail' in attempts)) return reply.code(501).send({code:'ATTEMPT_FAILURE_STORAGE_UNAVAILABLE'}); try { return await (attempts as any).fail(request.params.attemptId, request.body.fencingToken, request.body.error ?? 'worker failure'); } catch (e) { return reply.code(409).send({code:(e as Error).message}); } });
app.post('/v1/admin/reconcile', async (_request, reply) => { if (!('reconcileExpired' in attempts)) return reply.code(501).send({code:'RECONCILE_STORAGE_UNAVAILABLE'}); return (attempts as any).reconcileExpired(); });
app.post<{ Params: { attemptId: string }; Body: { decision: 'success'|'failed'; actor: string; manifest?: unknown } }>('/v1/attempts/:attemptId/reconcile', async (request, reply) => { if (!('resolveUnknown' in attempts)) return reply.code(501).send({code:'RECONCILE_STORAGE_UNAVAILABLE'}); try { return await (attempts as any).resolveUnknown(request.params.attemptId,request.body.decision,request.body.actor,request.body.manifest ?? {}); } catch (e) { return reply.code(409).send({code:(e as Error).message}); } });
app.get<{ Params: { attemptId: string } }>('/v1/attempts/:attemptId/manifest', async (request, reply) => {
  if (!('getManifest' in attempts)) return reply.code(501).send({ code: 'MANIFEST_STORAGE_UNAVAILABLE' });
  const manifest = await (attempts as any).getManifest(request.params.attemptId);
  return manifest ?? reply.code(404).send({ code: 'NOT_FOUND' });
});
app.post<{ Params: { attemptId: string }; Body: { fencingToken: number; logicalName: string; sha256: string; mimeType: string; contentBase64: string } }>('/v1/attempts/:attemptId/assets', async (request, reply) => {
  if (!('uploadAsset' in attempts)) return reply.code(501).send({ code: 'ASSET_STORAGE_UNAVAILABLE' });
  const body = request.body;
  try {
    if (!body || !Number.isSafeInteger(body.fencingToken) || typeof body.contentBase64 !== 'string' || typeof body.sha256 !== 'string' || typeof body.mimeType !== 'string') throw new Error('INVALID_INPUT');
    const bytes = Buffer.from(body.contentBase64, 'base64');
    if (bytes.length > maxOutputBytes) throw new Error('ASSET_OUTPUT_TOO_LARGE');
    const result = await (attempts as any).uploadAsset(request.params.attemptId, body.fencingToken, body.logicalName, bytes, body.sha256, body.mimeType, assetStorage);
    return reply.code(201).send(result);
  } catch (error) { const code = (error as Error).message; return reply.code(code === 'INVALID_INPUT' || code === 'SHA256_MISMATCH' || code === 'ASSET_OUTPUT_TOO_LARGE' ? 400 : code.startsWith('FENCING_') ? 409 : 500).send({ code }); }
});
if (process.env.QWEN_API_AUTOSTART === 'true') {
  const host = process.env.QWEN_API_HOST ?? '127.0.0.1';
  if (!process.env.QWEN_API_TOKEN && !['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('QWEN_API_TOKEN_REQUIRED_FOR_NON_LOOPBACK');
  app.listen({ host, port: Number(process.env.QWEN_API_PORT ?? 4310) });
}
