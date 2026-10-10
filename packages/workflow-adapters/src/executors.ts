import type { AttemptContext } from '@qwendirector/worker/executor';
import { validateH3Workflow, validateH3RefModWorkflow, preflightH3Runtime, preflightH3RefModRuntime } from './h3-workflow.js';
import { getWorkbenchContract } from './workbenches.js';
import { validateWorkbenchGraph } from './workbench-catalog.js';

export class LlamaCompletionExecutor {
  constructor(private readonly baseUrl = 'http://127.0.0.1:8081') {}
  async prepare(ctx: AttemptContext) { if (!ctx.planHash) throw new Error('INVALID_PLAN'); }
  async submit(ctx: AttemptContext) {
    const prompt = typeof ctx.plan?.prompt === 'string' ? ctx.plan.prompt : `[qwendirector:${ctx.jobId}]`;
    const r = await fetch(`${this.baseUrl}/v1/completions`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({prompt, max_tokens:64, temperature:0}) });
    if (!r.ok) throw new Error(`LLAMA_SUBMIT_${r.status}`); const body = await r.json() as { choices?: Array<{ text?: string }> }; return { externalRunId: ctx.attemptId, text: body.choices?.[0]?.text ?? '' };
  }
  async poll() { return { state:'succeeded' as const }; }
  async collect(receipt: {externalRunId:string; text?: string}) { return { adapter:'llama.cpp', externalRunId:receipt.externalRunId, outputs: [{ logicalName:'completion.txt', mimeType:'text/plain', contentBase64: Buffer.from(receipt.text ?? '').toString('base64') }] }; }
}

export class ComfyPromptExecutor {
  constructor(protected readonly baseUrl = 'http://192.168.10.103:8188', protected readonly workflow: Record<string, any> = {}, private readonly timeoutMs = Number(process.env.QWEN_COMFY_TIMEOUT_MS ?? 3600000), private readonly pollMs = Number(process.env.QWEN_COMFY_POLL_MS ?? 1000)) {}
  async prepare(ctx: AttemptContext) { if (!ctx.planHash || !Object.keys(this.workflow).length) throw new Error('INVALID_WORKFLOW_PLAN'); validateH3Workflow(this.workflow as any); await preflightH3Runtime(this.baseUrl); }
  async submit(ctx: AttemptContext) { const r = await fetch(`${this.baseUrl}/prompt`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:this.workflow, client_id:`qwendirector-${ctx.attemptId}`}), signal: AbortSignal.timeout(30_000)}); if(!r.ok) { const detail=await r.text().catch(()=> ''); throw new Error(`COMFY_SUBMIT_${r.status}${detail ? `:${detail.slice(0,1000)}` : ''}`); } const b=await r.json() as {prompt_id?:string}; if(!b.prompt_id) throw new Error('COMFY_NO_PROMPT_ID'); return {externalRunId:b.prompt_id, startedAt:Date.now()}; }
  async poll(receipt: {externalRunId:string; startedAt?:number}) { if (receipt.startedAt && Date.now() - receipt.startedAt > this.timeoutMs) throw new Error('COMFY_TIMEOUT'); const r=await fetch(`${this.baseUrl}/history/${encodeURIComponent(receipt.externalRunId)}`); if(!r.ok) { await new Promise((resolve)=>setTimeout(resolve,this.pollMs)); return {state:'running' as const}; } const b=await r.json() as Record<string, any>; const entry=b[receipt.externalRunId]; if (!entry) { await new Promise((resolve)=>setTimeout(resolve,this.pollMs)); return {state:'running' as const}; } const status=entry.status?.status_str; if (status === 'error' || status === 'exception') return {state:'failed' as const, error: String(entry.status?.messages?.find((message:any)=>message?.[0] === 'execution_error')?.[1]?.exception_message ?? 'COMFY_EXECUTION_ERROR').slice(0,1000)}; if (entry.status?.completed === false) { await new Promise((resolve)=>setTimeout(resolve,this.pollMs)); return {state:'running' as const}; } return {state:'succeeded' as const}; }
  async cancel(receipt: {externalRunId:string}) { await fetch(`${this.baseUrl}/interrupt`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({prompt_id:receipt.externalRunId}) }); }
  async collect(receipt: {externalRunId:string}) {
    const historyResponse = await fetch(`${this.baseUrl}/history/${encodeURIComponent(receipt.externalRunId)}`);
    if (!historyResponse.ok) throw new Error(`COMFY_HISTORY_${historyResponse.status}`);
    const history = await historyResponse.json() as Record<string, any>;
    const outputs = history[receipt.externalRunId]?.outputs ?? {};
    const outputEntries = Object.entries(outputs).filter(([nodeId]) => {
      if (!Object.keys(this.workflow).length) return true; // compatibility for adapters that do not carry a graph
      const saveNodeId = Object.entries(this.workflow).find(([, node]) => (node as any)?.class_type === 'SaveVideo')?.[0];
      return saveNodeId ? nodeId === saveNodeId : true;
    });
    const files: Array<{ logicalName:string; mimeType:string; contentBase64:string }> = [];
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
            : field === 'images' ? 'image/png' : field === 'audio' ? 'audio/wav' : field === 'videos' || field === 'gifs' ? 'video/mp4' : 'application/octet-stream';
          files.push({ logicalName: `comfy-${nodeId}-${index}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`, mimeType, contentBase64: Buffer.from(bytes).toString('base64') });
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
    private readonly kind: 'actor' | 'scene' | 'prop' | 'layout',
  ) { super(baseUrl, workflow); }

  async prepare(ctx: AttemptContext) {
    if (!ctx.planHash || !Object.keys(this.workflow).length) throw new Error('INVALID_WORKBENCH_WORKFLOW');
    validateWorkbenchGraph(this.kind, this.workflow);
  }

  async collect(receipt: { externalRunId: string }) {
    const result = await super.collect(receipt);
    const slots = getWorkbenchContract(this.kind).outputSlots;
    return { ...result, workbench: this.kind, outputs: result.outputs.map((output: any, index: number) => ({ ...output, slot: slots[index] ?? `extra-${index + 1}`, provenance: { source: 'comfyui.workbench', workbench: this.kind, slot: slots[index] ?? `extra-${index + 1}`, externalRunId: receipt.externalRunId } })) };
  }
}
