import { createHash } from 'node:crypto';
import { validateH3Workflow, validateH3RefModWorkflow, type ComfyApiWorkflow } from './h3-workflow.js';

export interface H3ReferenceBinding { imageNodeIds?: string[]; audioNodeIds?: string[]; }
export interface H3WorkflowProfile {
  schemaVersion: '1.0'; id: string; name: string; graph: ComfyApiWorkflow; graphHash: string;
  boundary: ReturnType<typeof validateH3Workflow> | ReturnType<typeof validateH3RefModWorkflow>; referenceBindings?: H3ReferenceBinding & { mode?: 'refmod-i2v' };
  /** Deterministic quality metadata derived from the immutable graph, used for A/B provenance. */
  qualityHint: 'draft-4step' | 'quality-8step' | 'unknown'; samplingSteps?: number; loras: string[];
}

function resolveNumber(value: unknown, graph: ComfyApiWorkflow, seen = new Set<string>()): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!Array.isArray(value) || typeof value[0] !== 'string' || seen.has(value[0])) return undefined;
  const nodeId = value[0];
  const node = graph[nodeId];
  if (!node) return undefined;
  seen.add(nodeId);
  if (node.class_type === 'ComfySwitchNode') {
    const enabled = resolveBoolean(node.inputs?.switch, graph, seen);
    return resolveNumber(node.inputs?.[enabled ? 'on_true' : 'on_false'], graph, seen);
  }
  if (node.class_type === 'PrimitiveInt' || node.class_type === 'PrimitiveFloat') return resolveNumber(node.inputs?.value, graph, seen);
  return undefined;
}

function resolveBoolean(value: unknown, graph: ComfyApiWorkflow, seen = new Set<string>()): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (!Array.isArray(value) || typeof value[0] !== 'string' || seen.has(value[0])) return undefined;
  const nodeId = value[0];
  const node = graph[nodeId];
  if (!node || node.class_type !== 'PrimitiveBoolean') return undefined;
  seen.add(nodeId);
  return typeof node.inputs?.value === 'boolean' ? node.inputs.value : undefined;
}

function deriveSampling(graph: ComfyApiWorkflow, loras: string[]) {
  const scheduler = Object.values(graph).find((node) => node?.class_type === 'BasicScheduler');
  const samplingSteps = scheduler ? resolveNumber(scheduler.inputs?.steps, graph) : undefined;
  const loraSteps = loras.some((value) => /8step/i.test(value)) ? 8 : loras.some((value) => /4step/i.test(value)) ? 4 : undefined;
  const qualityHint = samplingSteps === loraSteps && samplingSteps === 8 ? 'quality-8step'
    : samplingSteps === loraSteps && samplingSteps === 4 ? 'draft-4step' : 'unknown';
  return { qualityHint, samplingSteps, loras } as const;
}

export function createH3RefModWorkflowProfile(id: string, name: string, graph: ComfyApiWorkflow, referenceBindings: H3ReferenceBinding): H3WorkflowProfile {
  const boundary = validateH3RefModWorkflow(graph, referenceBindings);
  const graphHash = createHash('sha256').update(canonicalJson(graph)).digest('hex');
  const loras = Object.values(graph).filter((node) => node?.class_type === 'LoraLoaderModelOnly').map((node) => node.inputs?.lora_name).filter((value): value is string => typeof value === 'string' && value.length > 0);
  const sampling = deriveSampling(graph, loras);
  return { schemaVersion: '1.0', id, name, graph: structuredClone(graph), graphHash, boundary, referenceBindings: { ...structuredClone(referenceBindings), mode: 'refmod-i2v' }, ...sampling };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

/** Builds a portable starter graph using the model filenames discovered by ComfyUI object_info. */
export function createH3StarterWorkflow() : ComfyApiWorkflow {
  return {
    '1': { class_type: 'CLIPLoader', inputs: { clip_name: 'qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors', type: 'minimax' } },
    '2': { class_type: 'VAELoader', inputs: { vae_name: 'minimax_h3_video_vae_fp16.safetensors' } },
    '3': { class_type: 'VAELoader', inputs: { vae_name: 'minimax_h3_audio_vae_fp32.safetensors' } },
    '4': { class_type: 'EmptyMiniMaxH3LatentAV', inputs: { width: 1344, height: 768, length: 124 } },
    '5': { class_type: 'RandomNoise', inputs: { noise_seed: 0 } },
    '6': { class_type: 'MiniMaxH3ReferenceToVideo', inputs: { clip: ['1', 0], vae: ['2', 0], audio_vae: ['3', 0], prompt: 'A cinematic shot', width: 1344, height: 768, length: 124, ref_image_size: 'match' } },
    '7': { class_type: 'SaveVideo', inputs: { video: ['6', 0], filename_prefix: 'qwendirector/h3', format: 'auto' } }
  };
}

export function createH3WorkflowProfile(id: string, name: string, graph: ComfyApiWorkflow, referenceBindings?: H3ReferenceBinding): H3WorkflowProfile {
  const boundary = validateH3Workflow(graph);
  const graphHash = createHash('sha256').update(canonicalJson(graph)).digest('hex');
  const loras = Object.values(graph).filter((node) => node?.class_type === 'LoraLoaderModelOnly')
    .map((node) => node.inputs?.lora_name).filter((value): value is string => typeof value === 'string' && value.length > 0);
  const sampling = deriveSampling(graph, loras);
  return { schemaVersion:'1.0', id, name, graph: structuredClone(graph), graphHash, boundary, referenceBindings: referenceBindings ? structuredClone(referenceBindings) : undefined, ...sampling };
}

export function injectH3Inputs(profile: H3WorkflowProfile, input: { prompt: string; width: number; height: number; length: number; seed?: number; filenamePrefix?: string; images?: Array<{name:string;subfolder?:string;type?:string}>; audios?: Array<{name:string;subfolder?:string;type?:string}> }): ComfyApiWorkflow {
  if (!input.prompt.trim() || !Number.isInteger(input.width) || !Number.isInteger(input.height) || !Number.isInteger(input.length) || input.width <= 0 || input.height <= 0 || input.length <= 0) throw new Error('INVALID_H3_INPUTS');
  const graph = structuredClone(profile.graph);
  const boundary = profile.boundary;
  const h3 = graph[boundary.h3NodeId]; const noise = graph[boundary.noiseNodeId]; const save = graph[boundary.saveNodeId];
  h3.inputs = { ...h3.inputs, prompt: input.prompt, width: input.width, height: input.height, length: input.length };
  if (input.seed !== undefined) noise.inputs = { ...noise.inputs, noise_seed: input.seed };
  if (input.filenamePrefix) save.inputs = { ...save.inputs, filename_prefix: input.filenamePrefix };
  const imageIds = profile.referenceBindings?.imageNodeIds ?? []; const audioIds = profile.referenceBindings?.audioNodeIds ?? [];
  if ((input.images?.length ?? 0) > imageIds.length || (input.audios?.length ?? 0) > audioIds.length) throw new Error('TOO_MANY_H3_REFERENCES');
  input.images?.forEach((file, index) => { const node = graph[imageIds[index]]; if (!node) throw new Error('INVALID_H3_IMAGE_BINDING'); node.inputs = { ...node.inputs, image: file.subfolder ? `${file.subfolder}/${file.name}` : file.name }; });
  input.audios?.forEach((file, index) => { const node = graph[audioIds[index]]; if (!node) throw new Error('INVALID_H3_AUDIO_BINDING'); node.inputs = { ...node.inputs, audio: file.subfolder ? `${file.subfolder}/${file.name}` : file.name }; });
  if ('mode' in boundary && boundary.mode === 'refmod-i2v') {
    if (!input.images?.[0] || !Array.isArray(h3.inputs?.first_frame)) throw new Error('H3_REFMOD_FIRST_FRAME_REQUIRED');
    if (input.images[1] && !Array.isArray(h3.inputs?.last_frame)) throw new Error('H3_REFMOD_LAST_FRAME_BINDING_REQUIRED');
  }
  return graph;
}
