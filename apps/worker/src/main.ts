import { WorkerLoop } from './loop.js';
import { execute } from './executor.js';
import { HttpExecutionHooks } from './http-hooks.js';
import { LlamaCompletionExecutor, ComfyPromptExecutor, ComfyH3RefModExecutor } from '@qwendirector/workflow-adapters/executors';
import { createH3WorkflowProfile, injectH3Inputs } from '@qwendirector/workflow-adapters/h3-profile';
import { uploadComfyReference } from '@qwendirector/workflow-adapters/comfy-upload';

const apiBaseUrl = process.env.QWEN_API_BASE_URL ?? 'http://127.0.0.1:4310';
const configuredNodeId = process.env.QWEN_NODE_ID ?? 'local';
// Keep the convenient local name compatible with PostgreSQL's UUID node key.
const nodeId = configuredNodeId === 'local'
  ? '00000000-0000-4000-8000-000000000001'
  : configuredNodeId;
const pollMs = Number(process.env.QWEN_WORKER_POLL_MS ?? 1000);
const apiToken = process.env.QWEN_API_TOKEN;
const instanceId = process.env.QWEN_INSTANCE_ID ?? 'local-qwen';
// Capability advertisement is part of scheduling: keep H3 support explicit so
// capability-aware claims cannot route a video job to a text-only worker.
let capabilities: Record<string, unknown> = {
  modalities: ['text', 'image', 'video', 'audio'],
  adapters: ['llama.cpp', 'comfyui'],
  h3: true,
  optimizationNodes: [],
};
const apiHeaders = (): Record<string,string> => { const headers: Record<string,string> = {'content-type':'application/json'}; if (apiToken) headers.authorization=`Bearer ${apiToken}`; return headers; };
const hooks = new HttpExecutionHooks(apiBaseUrl, apiToken);
const worker = new WorkerLoop({ apiBaseUrl, nodeId, pollMs, apiToken }, async (job) => {
  const ctx = { jobId: job.jobId, attemptId: job.attemptId, fencingToken: job.fencingToken, planHash: job.planHash, plan: job.plan };
  if (job.adapterId === 'llama.cpp') await execute(ctx, new LlamaCompletionExecutor(process.env.QWEN_LLAMA_URL ?? 'http://127.0.0.1:8081'), hooks);
  else if (job.adapterId === 'comfyui') {
    const profile = job.plan?.workflowProfile as any;
    if (!profile?.graph) throw new Error('MISSING_H3_WORKFLOW_PROFILE');
    const comfyUrl = process.env.COMFYUI_URL ?? 'http://192.168.10.103:8188';
    const references = Array.isArray(job.plan?.references) ? job.plan.references as Array<{ assetVersionId:string; filename:string; type?:'image'|'audio'; role?:string }> : [];
    const refmod = profile.boundary?.mode === 'refmod-i2v';
    const uploadable = refmod ? references.filter((reference) => reference.type !== 'audio' && ['picture','set','layout'].includes(reference.role ?? 'picture')) : references;
    const uploaded = await Promise.all(uploadable.map(async (reference) => { const assetResponse = await fetch(`${apiBaseUrl}/v1/assets/${encodeURIComponent(reference.assetVersionId)}`, { headers: apiToken ? { authorization:`Bearer ${apiToken}` } : {} }); if (!assetResponse.ok) throw new Error(`REFERENCE_ASSET_FETCH_${assetResponse.status}`); return uploadComfyReference(comfyUrl, new Uint8Array(await assetResponse.arrayBuffer()), reference.filename, reference.type ?? 'image'); }));
    const graph = injectH3Inputs(profile, { prompt: String(job.plan?.prompt ?? ''), width: Number(job.plan?.width ?? 1280), height: Number(job.plan?.height ?? 720), length: Number(job.plan?.length ?? 56), seed: typeof job.plan?.seed === 'number' ? job.plan.seed : undefined, filenamePrefix: `qwendirector/${job.jobId}`, images: refmod ? uploaded : uploaded.filter((_, index) => references[index].type !== 'audio'), audios: refmod ? [] : uploaded.filter((_, index) => references[index].type === 'audio') });
    await execute(ctx, refmod ? new ComfyH3RefModExecutor(comfyUrl, graph, profile.boundary.imageNodeIds ?? []) : new ComfyPromptExecutor(comfyUrl, graph), hooks);
  }
  else throw new Error(`UNSUPPORTED_ADAPTER:${job.adapterId ?? 'missing'}`);
});

try {
  // Advertise the live ComfyUI inventory, not an optimistic static list.
  const runtimeResponse = await fetch(`${apiBaseUrl}/v1/runtime`);
  if (runtimeResponse.ok) {
    const runtime = await runtimeResponse.json() as any;
    const comfy = Array.isArray(runtime.runtimes) ? runtime.runtimes.find((item: any) => item.id === 'comfyui') : undefined;
    if (comfy?.capabilities) capabilities = { ...capabilities, h3: comfy.capabilities.h3 === true, optimizationNodes: comfy.capabilities.optimizationNodes ?? [] };
  }
  const registration = await fetch(`${apiBaseUrl}/v1/nodes/register`, {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify({ nodeId, instanceId, capabilities }),
  });
  if (!registration.ok) console.error(`[worker] node registration failed: ${registration.status}`);
} catch (error) {
  console.error(`[worker] node registration unavailable: ${error instanceof Error ? error.message : String(error)}`);
}

const heartbeat = setInterval(() => {
  void (async () => {
    try {
      const runtimeResponse = await fetch(`${apiBaseUrl}/v1/runtime`);
      if (runtimeResponse.ok) {
        const runtime = await runtimeResponse.json() as any;
        const comfy = Array.isArray(runtime.runtimes) ? runtime.runtimes.find((item: any) => item.id === 'comfyui') : undefined;
        if (comfy?.capabilities) capabilities = { ...capabilities, h3: comfy.capabilities.h3 === true, optimizationNodes: comfy.capabilities.optimizationNodes ?? [] };
      }
    } catch { /* heartbeat below remains the source of node liveness */ }
    return fetch(`${apiBaseUrl}/v1/nodes/${nodeId}/heartbeat`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ instanceId, capabilities }) });
  })()
    .then(async (response) => {
      if (response.ok) return;
      if (response.status === 409 || response.status === 404) {
        await fetch(`${apiBaseUrl}/v1/nodes/register`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ nodeId, instanceId, capabilities }) });
        return;
      }
      console.error(`[worker] heartbeat failed: ${response.status}`);
    })
    .catch((error) => console.error(`[worker] heartbeat failed: ${error instanceof Error ? error.message : String(error)}`));
}, 15_000);

const stop = () => { clearInterval(heartbeat); worker.stop(); };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

await worker.run();
