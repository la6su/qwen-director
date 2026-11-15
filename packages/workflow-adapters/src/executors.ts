import type { AttemptContext } from '@qwendirector/worker/executor';
import { readFile, realpath, stat } from 'node:fs/promises';
import { basename, isAbsolute, relative } from 'node:path';
import { validateH3Workflow, validateH3RefModWorkflow, preflightH3Runtime, preflightH3RefModRuntime } from './h3-workflow.js';
import type { WorkbenchKind } from './workbenches.js';
import { validateWorkbenchGraph, validateWorkbenchRuntimeSchema } from './workbench-catalog.js';

export class LlamaCompletionExecutor {
  constructor(
    private readonly baseUrl = process.env.QWEN_LLAMA_URL ?? 'http://127.0.0.1:8081',
    private readonly model = process.env.QWEN_LLAMA_MODEL ?? 'qwen3.8-flash-next',
    private readonly apiKey = process.env.QWEN_LLAMA_API_KEY ?? '',
    private readonly maxTokens = Number(process.env.QWEN_LLAMA_MAX_TOKENS ?? 64),
  ) {}
  private headers(): Record<string,string> { const headers: Record<string,string> = {'content-type':'application/json'}; if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`; return headers; }
  async prepare(ctx: AttemptContext) { if (!ctx.planHash) throw new Error('INVALID_PLAN'); }
  async submit(ctx: AttemptContext) {
    const prompt = typeof ctx.plan?.prompt === 'string' ? ctx.plan.prompt : `[qwendirector:${ctx.jobId}]`;
    const r = await fetch(`${this.baseUrl}/v1/chat/completions`, { method:'POST', headers:this.headers(), body:JSON.stringify({model: this.model, messages:[{role:'user', content:prompt}], max_tokens:this.maxTokens, temperature:0}), signal: AbortSignal.timeout(Number(process.env.QWEN_LLAMA_TIMEOUT_MS ?? 120_000)) });
    if (!r.ok) { const detail = await r.text().catch(() => ''); throw new Error(`LLAMA_SUBMIT_${r.status}${detail ? `:${detail.slice(0,500)}` : ''}`); }
    const body = await r.json() as { choices?: Array<{ text?: string; message?: { content?: string } }> };
    const choice = body.choices?.[0];
    return { externalRunId: ctx.attemptId, text: choice?.message?.content ?? choice?.text ?? '' };
  }
  async poll() { return { state:'succeeded' as const }; }
  async collect(receipt: {externalRunId:string; text?: string}) { return { adapter:'llama.cpp', externalRunId:receipt.externalRunId, outputs: [{ logicalName:'completion.txt', mimeType:'text/plain', contentBase64: Buffer.from(receipt.text ?? '').toString('base64') }] }; }
}

export class ComfyPromptExecutor {
  constructor(protected readonly baseUrl = 'http://127.0.0.1:8188', protected readonly workflow: Record<string, any> = {}, private readonly timeoutMs = Number(process.env.QWEN_COMFY_TIMEOUT_MS ?? 3600000), private readonly pollMs = Number(process.env.QWEN_COMFY_POLL_MS ?? 1000)) {}
  async prepare(ctx: AttemptContext) { if (!ctx.planHash || !Object.keys(this.workflow).length) throw new Error('INVALID_WORKFLOW_PLAN'); validateH3Workflow(this.workflow as any); await preflightH3Runtime(this.baseUrl, this.workflow as any); }
  async submit(ctx: AttemptContext) { const r = await fetch(`${this.baseUrl}/prompt`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:this.workflow, client_id:`qwendirector-${ctx.attemptId}`}), signal: AbortSignal.timeout(30_000)}); if(!r.ok) { const detail=await r.text().catch(()=> ''); throw new Error(`COMFY_SUBMIT_${r.status}${detail ? `:${detail.slice(0,1000)}` : ''}`); } const b=await r.json() as {prompt_id?:string}; if(!b.prompt_id) throw new Error('COMFY_NO_PROMPT_ID'); return {externalRunId:b.prompt_id, startedAt:Date.now()}; }
  async poll(receipt: {externalRunId:string; startedAt?:number}) { if (receipt.startedAt && Date.now() - receipt.startedAt > this.timeoutMs) throw new Error('COMFY_TIMEOUT'); const r=await fetch(`${this.baseUrl}/history/${encodeURIComponent(receipt.externalRunId)}`); if(!r.ok) { await new Promise((resolve)=>setTimeout(resolve,this.pollMs)); return {state:'running' as const}; } const b=await r.json() as Record<string, any>; const entry=b[receipt.externalRunId]; if (!entry) { await new Promise((resolve)=>setTimeout(resolve,this.pollMs)); return {state:'running' as const}; } const status=entry.status?.status_str; if (status === 'error' || status === 'exception') return {state:'failed' as const, error: String(entry.status?.messages?.find((message:any)=>message?.[0] === 'execution_error')?.[1]?.exception_message ?? 'COMFY_EXECUTION_ERROR').slice(0,1000)}; if (entry.status?.completed === false) { await new Promise((resolve)=>setTimeout(resolve,this.pollMs)); return {state:'running' as const}; } return {state:'succeeded' as const}; }
  async cancel(receipt: {externalRunId:string}) { await fetch(`${this.baseUrl}/interrupt`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({prompt_id:receipt.externalRunId}) }); }
  async collect(receipt: {externalRunId:string}) {
    const historyResponse = await fetch(`${this.baseUrl}/history/${encodeURIComponent(receipt.externalRunId)}`);
    if (!historyResponse.ok) throw new Error(`COMFY_HISTORY_${historyResponse.status}`);
    const history = await historyResponse.json() as Record<string, any>;
    const outputs = history[receipt.externalRunId]?.outputs ?? {};
    const hasH3Boundary = Object.values(this.workflow).some((node: any) => ['MiniMaxH3ReferenceToVideo','MiniMaxH3ImageToVideo'].includes(node?.class_type));
    const boundary = hasH3Boundary ? validateH3Workflow(this.workflow as any) : undefined;
    const outputNodeIds = new Set(Object.entries(this.workflow).filter(([, node]: [string, any]) => ['SaveImage', 'SaveImageAdvanced'].includes(node?.class_type)).map(([id]) => id));
    const outputEntries = Object.entries(outputs).filter(([nodeId]) => {
      if (boundary) return nodeId === boundary.saveNodeId;
      return outputNodeIds.size ? outputNodeIds.has(nodeId) : true;
    });
    const files: Array<{ logicalName:string; mimeType:string; contentBase64:string; outputNodeId?:string }> = [];
    for (const [nodeId, nodeOutput] of outputEntries) {
      for (const field of ['images', 'gifs', 'videos', 'audio']) {
        for (const [index, file] of ((nodeOutput as any)?.[field] ?? []).entries()) {
          if (!file?.filename) continue;
          const query = new URLSearchParams({ filename: String(file.filename), subfolder: String(file.subfolder ?? ''), type: String(file.type ?? 'output') });
          const response = await fetch(`${this.baseUrl}/view?${query}`);
          if (!response.ok) throw new Error(`COMFY_OUTPUT_${response.status}`);
          const bytes = new Uint8Array(await response.arrayBuffer());
          const filename = String(file.filename);
          const extension = filename.toLowerCase().split('.').pop() ?? '';
          const mimeType = ['mp4', 'webm', 'mov', 'mkv'].includes(extension)
            ? (extension === 'webm' ? 'video/webm' : extension === 'mov' ? 'video/quicktime' : extension === 'mkv' ? 'video/x-matroska' : 'video/mp4')
            : field === 'images' ? (extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'webp' ? 'image/webp' : extension === 'avif' ? 'image/avif' : 'image/png') : field === 'audio' ? 'audio/wav' : field === 'videos' || field === 'gifs' ? 'video/mp4' : 'application/octet-stream';
          files.push({ logicalName: `comfy-${nodeId}-${index}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`, mimeType, contentBase64: Buffer.from(bytes).toString('base64'), outputNodeId: nodeId });
        }
      }
    }
    return { adapter:'comfyui', externalRunId:receipt.externalRunId, outputs: files };
  }
}

/** Local H3 I2V executor with two prebuilt RefMods and immutable image bindings. */
export class ComfyH3RefModExecutor extends ComfyPromptExecutor {
  constructor(baseUrl: string, workflow: Record<string, any>, private readonly imageNodeIds: string[]) { super(baseUrl, workflow); }
  async prepare(ctx: AttemptContext) {
    if (!ctx.planHash || !Object.keys(this.workflow).length) throw new Error('INVALID_REFMOD_WORKFLOW_PLAN');
    const boundary = validateH3RefModWorkflow(this.workflow, { imageNodeIds: this.imageNodeIds });
    await preflightH3RefModRuntime(this.baseUrl, this.workflow, boundary);
    await preflightH3Runtime(this.baseUrl);
  }
}

/** Generic typed workbench executor for Actor/Scene/Prop/Layout graphs.
 * H3-specific validation is intentionally kept out of this path; each workbench
 * supplies its own graph contract while sharing durable ComfyUI execution.
 */
export class ComfyWorkbenchExecutor extends ComfyPromptExecutor {
  constructor(
    baseUrl: string,
    workflow: Record<string, any>,
    private readonly kind: WorkbenchKind,
    private readonly outputBindings?: Record<string, string>,
  ) { super(baseUrl, workflow); }

  async prepare(ctx: AttemptContext) {
    if (!ctx.planHash || !Object.keys(this.workflow).length) throw new Error('INVALID_WORKBENCH_WORKFLOW');
    validateWorkbenchGraph(this.kind, this.workflow, undefined, this.outputBindings);
    if (this.kind === 'refmod-create' && !process.env.QWEN_COMFY_REFMODS_ROOT) throw new Error('COMFY_REFMOD_ROOT_REQUIRED');
    const response = await fetch(`${this.baseUrl}/object_info`);
    if (!response.ok) throw new Error(`COMFY_OBJECT_INFO_${response.status}`);
    validateWorkbenchRuntimeSchema(this.workflow, await response.json() as Record<string, any>);
  }

  async collect(receipt: { externalRunId: string }) {
    const result = await super.collect(receipt);
    const outputs = [...result.outputs];
    if (this.kind === 'refmod-create') {
      const creator = Object.values(this.workflow).find((node: any) => node?.class_type === 'H3RefModCreateFromFolder') as any;
      const expectedName = String(creator?.inputs?.name ?? '').trim();
      const root = process.env.QWEN_COMFY_REFMODS_ROOT;
      if (!root || !expectedName) throw new Error('COMFY_REFMOD_COLLECTION_CONFIG_INVALID');
      const libraryResponse = await fetch(`${this.baseUrl}/refmods/library`);
      if (!libraryResponse.ok) throw new Error(`COMFY_REFMOD_LIBRARY_${libraryResponse.status}`);
      const library = await libraryResponse.json() as Array<{ name?: unknown; path?: unknown }>;
      const candidates = library.filter((item) => typeof item.path === 'string' && basename(String(item.path)) === `${expectedName}.safetensors`);
      if (candidates.length !== 1) throw new Error(candidates.length ? 'COMFY_REFMOD_OUTPUT_AMBIGUOUS' : 'COMFY_REFMOD_OUTPUT_NOT_FOUND');
      const allowedRoot = await realpath(root);
      const filePath = await realpath(String(candidates[0].path));
      const pathFromRoot = relative(allowedRoot, filePath);
      if (!pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) throw new Error('COMFY_REFMOD_OUTPUT_OUTSIDE_ROOT');
      const metadata = await stat(filePath);
      // Keep this below the API's default import limit so the collected sidecar
      // can pass through the ordinary durable asset-import route.
      const maxBytes = Number(process.env.QWEN_COMFY_REFMOD_MAX_BYTES ?? 100 * 1024 * 1024);
      if (!metadata.isFile() || metadata.size < 16 || !Number.isSafeInteger(maxBytes) || metadata.size > maxBytes) throw new Error('COMFY_REFMOD_OUTPUT_SIZE_INVALID');
      const bytes = await readFile(filePath);
      outputs.push({ logicalName: basename(filePath), mimeType: 'application/octet-stream', contentBase64: bytes.toString('base64') });
    }
    const bindings = this.kind === 'refmod-create' ? {} : validateWorkbenchGraph(this.kind, this.workflow, undefined, this.outputBindings).outputBindings;
    const mapped = outputs.map((output: any) => {
      const slot = this.kind === 'refmod-create' && !output.outputNodeId ? 'refmod' : bindings[output.outputNodeId];
      if (!slot) throw new Error(`WORKBENCH_OUTPUT_NODE_UNMAPPED:${String(output.outputNodeId ?? 'unknown')}`);
      return { ...output, slot, provenance: { source: 'comfyui.workbench', workbench: this.kind, outputNodeId: output.outputNodeId, slot, externalRunId: receipt.externalRunId } };
    });
    if (this.kind !== 'refmod-create') {
      const produced = new Set(mapped.map((output: any) => output.outputNodeId));
      if (Object.keys(bindings).some((nodeId) => !produced.has(nodeId))) throw new Error('WORKBENCH_OUTPUT_BINDING_NOT_PRODUCED');
    }
    return { ...result, workbench: this.kind, outputs: mapped };
  }
}
