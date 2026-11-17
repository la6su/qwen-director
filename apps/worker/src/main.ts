import { WorkerLoop } from './loop.js';
import { execute } from './executor.js';
import { HttpExecutionHooks } from './http-hooks.js';
import { LlamaCompletionExecutor, ComfyPromptExecutor, ComfyH3RefModExecutor, ComfyWorkbenchExecutor } from '@qwendirector/workflow-adapters/executors';
import { createH3WorkflowProfile, injectH3Inputs } from '@qwendirector/workflow-adapters/h3-profile';
import { comfyReferenceUploadTarget, uploadComfyReference } from '@qwendirector/workflow-adapters/comfy-upload';
import { resolveWorkbenchPrompt } from './workbench-prompt.js';
import { cleanupComfyAttemptInputs } from './comfy-input-cleanup.js';
import { bindWorkbenchImages } from '@qwendirector/workflow-adapters/workbench-catalog';

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
  let preserveComfyInputsForReconciliation = false;
  let executionStarted = false;
  let heartbeatSequence = 0;
  let heartbeatInFlight: Promise<void> | undefined;
  let leaseHeartbeat: ReturnType<typeof setInterval> | undefined;
  const pulseLease = () => {
    if (!leaseHeartbeat) return Promise.resolve();
    if (heartbeatInFlight) return heartbeatInFlight;
    heartbeatInFlight = hooks.heartbeat(ctx, ++heartbeatSequence).finally(() => { heartbeatInFlight = undefined; });
    return heartbeatInFlight;
  };
  const stopLeaseHeartbeat = () => {
    if (leaseHeartbeat) clearInterval(leaseHeartbeat);
    leaseHeartbeat = undefined;
  };
  const executionHooks = {
    heartbeat: () => pulseLease(),
    commit: async (attempt: typeof ctx, output: unknown) => { stopLeaseHeartbeat(); return hooks.commit(attempt, output); },
    fail: async (attempt: typeof ctx, error: unknown) => { stopLeaseHeartbeat(); return hooks.fail(attempt, error); },
    ...(hooks.unknown ? { unknown: async (attempt: typeof ctx, error: unknown) => { stopLeaseHeartbeat(); return hooks.unknown!(attempt, error); } } : {}),
  };
  leaseHeartbeat = setInterval(() => {
    void pulseLease().catch((error) => console.error(`[worker] lease heartbeat failed for job ${job.jobId}, attempt ${job.attemptId}: ${error instanceof Error ? error.message : String(error)}`));
  }, 15_000);
  try {
    await pulseLease();
    if (job.adapterId === 'llama.cpp') { executionStarted = true; await execute(ctx, new LlamaCompletionExecutor(process.env.QWEN_LLAMA_URL ?? 'http://127.0.0.1:8081'), executionHooks); }
    else if (job.adapterId === 'comfyui') {
      const profile = job.plan?.workflowProfile as any;
      if (!profile?.graph) throw new Error('MISSING_H3_WORKFLOW_PROFILE');
      const comfyUrl = process.env.COMFYUI_URL ?? 'http://127.0.0.1:8188';
      const references = Array.isArray(job.plan?.references) ? job.plan.references as Array<{ assetVersionId:string; filename:string; type?:'image'|'audio'|'video'; role?:string }> : [];
      const workbenchKind = profile.boundary?.workbenchKind as 'actor'|'scene'|'prop'|'layout'|'image-edit'|'image-generate'|'refmod-create'|undefined;
      const refmod = profile.boundary?.mode === 'refmod-i2v';
      const uploadable = workbenchKind
        ? references.filter((reference) => reference.type !== 'audio')
        : refmod ? references.filter((reference) => reference.type !== 'audio' && ['picture','set','layout'].includes(reference.role ?? 'picture')) : references;
      const refmodStagingFolder = workbenchKind === 'refmod-create' ? `qwendirector_refmods/${ctx.attemptId}` : '';
      const uploaded = await Promise.all(uploadable.map(async (reference, index) => {
        const assetResponse = await fetch(`${apiBaseUrl}/v1/assets/${encodeURIComponent(reference.assetVersionId)}`, { headers: apiToken ? { authorization:`Bearer ${apiToken}` } : {} });
        if (!assetResponse.ok) throw new Error(`REFERENCE_ASSET_FETCH_${assetResponse.status}`);
        const bytes = new Uint8Array(await assetResponse.arrayBuffer());
        if (workbenchKind === 'refmod-create') {
          const extension = reference.filename.toLowerCase().match(/\.(png|jpe?g|webp)$/)?.[0] ?? '.png';
          return { type: 'image', file: await uploadComfyReference(comfyUrl, bytes, `${String(index + 1).padStart(2, '0')}_reference${extension}`, 'image', refmodStagingFolder) };
        }
        const role = reference.role ?? 'picture';
        const target = comfyReferenceUploadTarget({ attemptId: ctx.attemptId, assetVersionId: reference.assetVersionId, role, index, filename: reference.filename });
        return { type: reference.type ?? 'image', role, file: await uploadComfyReference(comfyUrl, bytes, target.filename, reference.type ?? 'image', target.subfolder) };
      }));
      if (workbenchKind) {
        if (!['actor','scene','prop','layout','image-edit','image-generate','refmod-create'].includes(workbenchKind)) throw new Error('INVALID_WORKBENCH_KIND');
        const graph = structuredClone(profile.graph) as Record<string, any>;
        const refmodCreator = workbenchKind === 'refmod-create' ? Object.entries(graph).find(([, node]) => node?.class_type === 'H3RefModCreateFromFolder') : undefined;
        if (workbenchKind === 'refmod-create') {
          const referencesToStage = references.filter((reference) => (reference.type ?? 'image') === 'image');
          const uploadedImages = uploaded.filter((item) => item.type === 'image');
          if (!refmodCreator || !referencesToStage.length || referencesToStage.length !== uploadedImages.length) throw new Error('REFMOD_CREATE_REFERENCES_REQUIRED');
          if (uploadedImages.some(({ file }) => file.subfolder !== refmodStagingFolder)) throw new Error('REFMOD_CREATE_STAGING_INCOMPLETE');
          const creator = refmodCreator[1] as any;
          creator.inputs = { ...creator.inputs, folder: refmodStagingFolder, use_subfolders: false, use_folder_as_name: false, name: `qd_${ctx.jobId.replaceAll('-', '_')}_${ctx.attemptId.replaceAll('-', '_')}`, save: true, save_layout: 'bundle', subfolder: 'QwenDirector', description: String(job.plan?.prompt ?? '') };
        }
        const imageNodeIds = profile.referenceBindings?.imageNodeIds ?? Object.entries(graph).filter(([, node]) => node?.class_type === 'LoadImage').map(([id]) => id);
        const images = uploaded.filter((item) => item.type === 'image');
        if (workbenchKind !== 'refmod-create') {
          bindWorkbenchImages(graph, imageNodeIds, images.map(({ file }) => file));
        }
        for (const node of Object.values(graph) as any[]) {
          if (node?.class_type === 'SatoDiveH3Image') node.inputs = { ...node.inputs, prompt: String(job.plan?.prompt ?? '') };
          // Preserve a linked Qwen Image prompt (often the TextGenerate enhancer).
          // Replacing that connection with a string silently bypasses the user's graph.
          if (node?.class_type === 'TextEncodeQwenImage21' && !(Array.isArray(node.inputs?.prompt) && typeof node.inputs.prompt[0] === 'string')) {
            const prompt = resolveWorkbenchPrompt({ kind: workbenchKind, workflowPrompt: node.inputs?.prompt, directorPrompt: (job.plan as any)?.directorFields?.prompt, compiledPrompt: job.plan?.prompt });
            if (prompt) node.inputs = { ...node.inputs, prompt };
          }
          if (node?.class_type === 'TextGenerate') node.inputs = { ...node.inputs, prompt: String(job.plan?.prompt ?? '') };
          if (node?.class_type === 'H3RefModCreateFromFolder' && workbenchKind === 'refmod-create') node.inputs = { ...node.inputs, description: String(job.plan?.prompt ?? '') };
          if (node?.class_type === 'SaveImage' || node?.class_type === 'SaveImageAdvanced') node.inputs = { ...node.inputs, filename_prefix: `qwendirector/${job.jobId}` };
          if (workbenchKind === 'image-generate' && node?.class_type === 'EmptyLatentImage') node.inputs = { ...node.inputs, width: Number(job.plan?.width ?? node.inputs.width), height: Number(job.plan?.height ?? node.inputs.height) };
          if (workbenchKind === 'image-generate' && node?.class_type === 'KSampler' && typeof job.plan?.seed === 'number') node.inputs = { ...node.inputs, seed: job.plan.seed };
        }
        executionStarted = true;
        await execute(ctx, new ComfyWorkbenchExecutor(comfyUrl, graph, workbenchKind, profile.boundary?.outputBindings), executionHooks);
        return;
      }
      const imageUploads = uploaded.filter((item) => item.type === 'image');
      if (profile.boundary?.mode === 'fl2va-i2v') imageUploads.sort((a, b) => (a.role === 'first-frame' ? 0 : a.role === 'last-frame' ? 1 : 2) - (b.role === 'first-frame' ? 0 : b.role === 'last-frame' ? 1 : 2));
      const graph = injectH3Inputs(profile, { prompt: String(job.plan?.prompt ?? ''), width: Number(job.plan?.width ?? 1280), height: Number(job.plan?.height ?? 720), length: Number(job.plan?.length ?? 56), seed: typeof job.plan?.seed === 'number' ? job.plan.seed : undefined, filenamePrefix: `qwendirector/${job.jobId}`, images: imageUploads.map((item) => item.file), audios: uploaded.filter((item) => item.type === 'audio').map((item) => item.file), videos: uploaded.filter((item) => item.type === 'video').map((item) => item.file) });
      executionStarted = true;
      await execute(ctx, refmod ? new ComfyH3RefModExecutor(comfyUrl, graph, profile.boundary.imageNodeIds ?? []) : new ComfyPromptExecutor(comfyUrl, graph), executionHooks);
    }
    else throw new Error(`UNSUPPORTED_ADAPTER:${job.adapterId ?? 'missing'}`);
  } catch (error) {
    stopLeaseHeartbeat();
    if ((error as { code?: string })?.code === 'EXTERNAL_SUBMIT_UNKNOWN') preserveComfyInputsForReconciliation = true;
    if (!executionStarted) {
      try { await hooks.fail(ctx, error); }
      catch (failureError) { console.error(`[worker] could not record pre-submit failure for job ${job.jobId}, attempt ${job.attemptId}: ${failureError instanceof Error ? failureError.message : String(failureError)}`); }
    }
    throw error;
  } finally {
    stopLeaseHeartbeat();
    if (!preserveComfyInputsForReconciliation && job.adapterId === 'comfyui' && process.env.QWEN_COMFY_INPUT_ROOT) {
      try {
        const removed = await cleanupComfyAttemptInputs(ctx.attemptId);
        if (removed.length) console.info(`[worker] removed attempt-scoped ComfyUI inputs: ${removed.join(', ')}`);
      } catch (error) {
        console.error(`[worker] ComfyUI input cleanup failed for attempt ${ctx.attemptId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
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
