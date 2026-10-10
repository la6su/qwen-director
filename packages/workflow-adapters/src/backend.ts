import type { ExecutionPlan, GenerationSpec } from '@qwendirector/contracts';

export interface BackendCapabilities { adapterId: string; backendVersion?: string; modalities: string[]; models: Array<{ id: string; digest?: string }>; canCancel: boolean; reachable: boolean; }
export interface WorkflowBackendAdapter { readonly id: string; probe(): Promise<BackendCapabilities>; validate(spec: GenerationSpec): Promise<void>; plan(spec: GenerationSpec, capabilities: BackendCapabilities): Promise<ExecutionPlan>; }

async function jsonOrEmpty(response: Response): Promise<Record<string, any>> {
  try { return await response.json() as Record<string, any>; } catch { return {}; }
}

export class LlamaCppAdapter implements WorkflowBackendAdapter {
  readonly id = 'llama.cpp';
  constructor(private readonly baseUrl = 'http://127.0.0.1:8081') {}
  async probe(): Promise<BackendCapabilities> { try { const health = await fetch(`${this.baseUrl}/health`); const modelResponse = await fetch(`${this.baseUrl}/v1/models`); const body = await jsonOrEmpty(modelResponse); const rows = Array.isArray(body.data) ? body.data : Array.isArray(body.models) ? body.models : []; return { adapterId: this.id, backendVersion: 'llama.cpp', modalities: ['text'], models: rows.map((m: any) => ({ id: m.id ?? m.model ?? m.name, digest: m.digest })).filter((m: any) => m.id), canCancel: false, reachable: health.ok }; } catch { return { adapterId: this.id, modalities: ['text'], models: [], canCancel: false, reachable: false }; } }
  async validate(spec: GenerationSpec): Promise<void> { if (spec.modality !== 'text') throw new Error('UNSUPPORTED: llama.cpp supports text only'); }
  async plan(spec: GenerationSpec, capabilities: BackendCapabilities): Promise<ExecutionPlan> { await this.validate(spec); if (!capabilities.reachable) throw new Error('BACKEND_UNAVAILABLE: llama.cpp'); return { planHash: `llama.cpp:${spec.shotId}:${spec.promptRevisionId}`, adapterId: this.id, adapterVersion: '1.0', requirements: { diskMb: 1, concurrencyKey: 'llama.cpp' }, resolvedParameters: { endpoint: this.baseUrl } }; }
}

export class ComfyUiAdapter implements WorkflowBackendAdapter {
  readonly id = 'comfyui';
  constructor(private readonly baseUrl = 'http://192.168.10.103:8188') {}
  async probe(): Promise<BackendCapabilities> { try { const r = await fetch(`${this.baseUrl}/system_stats`); const body = await jsonOrEmpty(r); const devices = Array.isArray(body.devices) ? body.devices : []; return { adapterId: this.id, backendVersion: body.system?.comfyui_version, modalities: ['image', 'video', 'audio', 'previs'], models: devices.map((d: any) => ({ id: d.name, digest: `${d.vram_total ?? ''}` })).filter((m: any) => m.id), canCancel: false, reachable: r.ok }; } catch { return { adapterId: this.id, modalities: ['image', 'video', 'audio', 'previs'], models: [], canCancel: false, reachable: false }; } }
  async validate(spec: GenerationSpec): Promise<void> { if (spec.modality === 'text') throw new Error('UNSUPPORTED: ComfyUI text'); if (spec.adapterOptions.workflowUrl) throw new Error('INVALID_INPUT: workflowUrl is forbidden'); }
  async plan(spec: GenerationSpec, capabilities: BackendCapabilities): Promise<ExecutionPlan> { await this.validate(spec); if (!capabilities.reachable) throw new Error('BACKEND_UNAVAILABLE: ComfyUI'); return { planHash: `comfyui:${spec.shotId}:${spec.promptRevisionId}`, adapterId: this.id, adapterVersion: '1.0', requirements: { minVramMb: 4096, diskMb: 1024, concurrencyKey: 'comfyui' }, resolvedParameters: { endpoint: this.baseUrl, workflowDigest: spec.adapterOptions.workflowDigest ?? 'unknown' } }; }
}
