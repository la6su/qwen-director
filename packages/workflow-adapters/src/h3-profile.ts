import { createHash } from 'node:crypto';
import { validateH3Workflow, validateH3RefModWorkflow, type ComfyApiWorkflow } from './h3-workflow.js';

export interface H3ReferenceBinding { imageNodeIds?: string[]; audioNodeIds?: string[]; videoNodeIds?: string[]; }
export interface H3WorkflowProfile {
  schemaVersion: '1.0'; id: string; name: string; graph: ComfyApiWorkflow; graphHash: string;
  boundary: ReturnType<typeof validateH3Workflow> | ReturnType<typeof validateH3RefModWorkflow>; referenceBindings?: H3ReferenceBinding & { mode?: 'refmod-i2v' | 'fl2va-i2v' };
  /** Deterministic quality metadata derived from the immutable graph, used for A/B provenance. */
  qualityHint: 'draft-4step' | 'quality-8step' | 'unknown'; samplingSteps?: number; loras: string[];
  modelStack: Array<{ role: 'diffusion' | 'lora' | 'text-encoder' | 'vae'; nodeClass: string; name: string }>;
}

function deriveModelStack(graph: ComfyApiWorkflow) {
  const loaders = [
    ['UNETLoader', 'unet_name', 'diffusion'], ['CheckpointLoaderSimple', 'ckpt_name', 'diffusion'],
    ['LoraLoader', 'lora_name', 'lora'], ['LoraLoaderModelOnly', 'lora_name', 'lora'], ['MiniMaxH3PDDAccApply', 'pdd_file', 'lora'],
    ['CLIPLoader', 'clip_name', 'text-encoder'], ['VAELoader', 'vae_name', 'vae'],
  ] as const;
  return Object.entries(graph).flatMap(([, node]) => loaders.flatMap(([nodeClass, input, role]) => {
    const name = node?.class_type === nodeClass ? node.inputs?.[input] : undefined;
    return typeof name === 'string' && name ? [{ role, nodeClass, name }] : [];
  })).sort((a, b) => a.role.localeCompare(b.role) || a.nodeClass.localeCompare(b.nodeClass) || a.name.localeCompare(b.name));
}

function validateReferenceBindings(graph: ComfyApiWorkflow, bindings: H3ReferenceBinding): void {
  const valid = (ids: string[], classes: string[]) => ids.every((id) => classes.includes(graph[id]?.class_type ?? '')) && new Set(ids).size === ids.length;
  if (!valid(bindings.imageNodeIds ?? [], ['LoadImage'])) throw new Error('H3_WORKFLOW_REFERENCE_BINDING_INVALID:image');
  if (!valid(bindings.audioNodeIds ?? [], ['LoadAudio', 'VHS_LoadAudio'])) throw new Error('H3_WORKFLOW_REFERENCE_BINDING_INVALID:audio');
  if (!valid(bindings.videoNodeIds ?? [], ['LoadVideo', 'VHS_LoadVideo', 'VHS_LoadVideoPath'])) throw new Error('H3_WORKFLOW_REFERENCE_BINDING_INVALID:video');
  const ids = [...(bindings.imageNodeIds ?? []), ...(bindings.audioNodeIds ?? []), ...(bindings.videoNodeIds ?? [])];
  if (new Set(ids).size !== ids.length) throw new Error('H3_WORKFLOW_REFERENCE_BINDING_INVALID:duplicate');
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
  const pddScheduler = Object.values(graph).find((node) => node?.class_type === 'MiniMaxH3PDDAccScheduler');
  const pddApply = Object.values(graph).find((node) => node?.class_type === 'MiniMaxH3PDDAccApply');
  const samplingSteps = scheduler ? resolveNumber(scheduler.inputs?.steps, graph)
    : typeof pddScheduler?.inputs?.nfe === 'string' && /^\d+$/.test(pddScheduler.inputs.nfe) ? Number(pddScheduler.inputs.nfe)
      : typeof pddApply?.inputs?.nfe === 'string' && /^\d+$/.test(pddApply.inputs.nfe) ? Number(pddApply.inputs.nfe) : undefined;
  const loraSteps = loras.some((value) => /8step/i.test(value)) ? 8 : loras.some((value) => /4step/i.test(value)) ? 4 : undefined;
  const qualityHint = samplingSteps === loraSteps && samplingSteps === 8 ? 'quality-8step'
    : samplingSteps === loraSteps && samplingSteps === 4 ? 'draft-4step' : 'unknown';
  return { qualityHint, samplingSteps, loras } as const;
}

export function createH3RefModWorkflowProfile(id: string, name: string, graph: ComfyApiWorkflow, referenceBindings: H3ReferenceBinding): H3WorkflowProfile {
  if ((referenceBindings.audioNodeIds?.length ?? 0) || (referenceBindings.videoNodeIds?.length ?? 0)) throw new Error('H3_REFMOD_REFERENCE_MEDIA_UNSUPPORTED');
  validateReferenceBindings(graph, referenceBindings);
  const boundary = validateH3RefModWorkflow(graph, referenceBindings);
  const graphHash = createHash('sha256').update(canonicalJson(graph)).digest('hex');
  const loras = Object.values(graph).filter((node) => ['LoraLoaderModelOnly','MiniMaxH3PDDAccApply'].includes(node?.class_type ?? '')).map((node) => node.inputs?.lora_name ?? node.inputs?.pdd_file).filter((value): value is string => typeof value === 'string' && value.length > 0);
  const sampling = deriveSampling(graph, loras);
  return { schemaVersion: '1.0', id, name, graph: structuredClone(graph), graphHash, boundary, referenceBindings: { ...structuredClone(referenceBindings), mode: 'refmod-i2v' }, modelStack: deriveModelStack(graph), ...sampling };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

export function createH3WorkflowProfile(id: string, name: string, graph: ComfyApiWorkflow, referenceBindings?: H3ReferenceBinding): H3WorkflowProfile {
  const boundary = validateH3Workflow(graph);
  const graphHash = createHash('sha256').update(canonicalJson(graph)).digest('hex');
  const loras = Object.values(graph).filter((node) => ['LoraLoaderModelOnly','MiniMaxH3PDDAccApply'].includes(node?.class_type ?? ''))
    .map((node) => node.inputs?.lora_name ?? node.inputs?.pdd_file).filter((value): value is string => typeof value === 'string' && value.length > 0);
  const sampling = deriveSampling(graph, loras);
  const bindings = boundary.mode === 'r2v-2stage-veda' || boundary.mode === 'fl2va-i2v'
    ? { ...referenceBindings, imageNodeIds: referenceBindings?.imageNodeIds?.length ? referenceBindings.imageNodeIds : boundary.imageNodeIds }
    : referenceBindings;
  if (bindings) validateReferenceBindings(graph, bindings);
  if (boundary.mode === 'fl2va-i2v' && (bindings?.imageNodeIds?.length !== 2 || bindings.imageNodeIds.some((id, index) => id !== boundary.imageNodeIds?.[index]))) throw new Error('H3_FL2VA_IMAGE_BINDINGS_MUST_MATCH_FRAME_ORDER');
  return { schemaVersion:'1.0', id, name, graph: structuredClone(graph), graphHash, boundary, referenceBindings: bindings ? structuredClone({ ...bindings, ...(boundary.mode === 'fl2va-i2v' ? { mode: 'fl2va-i2v' as const } : {}) }) : undefined, modelStack: deriveModelStack(graph), ...sampling };
}

const vedaAspectRatios: Array<[string, number]> = [['1:1 (Square)', 1], ['2:3 (Portrait Photo)', 2/3], ['3:2 (Photo)', 3/2], ['3:4 (Portrait Standard)', 3/4], ['4:3 (Standard)', 4/3], ['9:16 (Portrait Widescreen)', 9/16], ['16:9 (Widescreen)', 16/9], ['21:9 (Ultrawide)', 21/9]];

export function injectH3Inputs(profile: H3WorkflowProfile, input: { prompt: string; width: number; height: number; length: number; seed?: number; filenamePrefix?: string; images?: Array<{name:string;subfolder?:string;type?:string}>; audios?: Array<{name:string;subfolder?:string;type?:string}>; videos?: Array<{name:string;subfolder?:string;type?:string}> }): ComfyApiWorkflow {
  if (!input.prompt.trim() || !Number.isInteger(input.width) || !Number.isInteger(input.height) || !Number.isInteger(input.length) || input.width <= 0 || input.height <= 0 || input.length <= 0) throw new Error('INVALID_H3_INPUTS');
  const graph = structuredClone(profile.graph);
  const boundary = profile.boundary;
  const h3 = graph[boundary.h3NodeId]; const noise = graph[boundary.noiseNodeId]; const save = graph[boundary.saveNodeId];
  if (boundary.mode === 'r2v-2stage-veda') {
    if ((input.length - 5) % 17 !== 0) throw new Error('INVALID_VEDA_H3_LENGTH');
    const ratio = input.width / input.height;
    const match = vedaAspectRatios.reduce((best, item) => Math.abs(Math.log(ratio / item[1])) < Math.abs(Math.log(ratio / best[1])) ? item : best);
    if (Math.abs(Math.log(ratio / match[1])) > 0.01) throw new Error('UNSUPPORTED_VEDA_ASPECT_RATIO');
    const megapixels = input.width * input.height / (1024 * 1024);
    if (megapixels < 0.1 || megapixels > 16) throw new Error('INVALID_VEDA_RESOLUTION');
    const prompt = graph[boundary.promptNodeId!]; const duration = graph[boundary.durationNodeId!];
    const resolution = graph[boundary.resolutionNodeId!]; const megapixelsNode = graph[boundary.megapixelsNodeId!];
    prompt.inputs = { ...prompt.inputs, value: input.prompt };
    duration.inputs = { ...duration.inputs, value: Math.max(5, input.length - 5) / 24 };
    resolution.inputs = { ...resolution.inputs, aspect_ratio: match[0] };
    megapixelsNode.inputs = { ...megapixelsNode.inputs, value: megapixels };
    for (const id of boundary.videoNodeIds ?? []) graph[id].inputs = { ...graph[id].inputs, filename_prefix: `${input.filenamePrefix ?? 'qwendirector/h3'}/${id === boundary.finalVideoNodeId ? 'final' : 'stage1'}` };
  } else {
    if (boundary.mode === 'fl2va-i2v' && (input.length < 124 || (input.length - 5) % 17 !== 0)) throw new Error('INVALID_FL2VA_H3_LENGTH');
    const promptBinding = h3.inputs?.prompt;
    if (typeof promptBinding === 'string') {
      h3.inputs = { ...h3.inputs, prompt: input.prompt };
    } else if (Array.isArray(promptBinding) && typeof promptBinding[0] === 'string') {
      const promptNode = graph[promptBinding[0]];
      if (!promptNode || !['PrimitiveStringMultiline', 'PrimitiveString'].includes(promptNode.class_type ?? '') || typeof promptNode.inputs?.value !== 'string') throw new Error('H3_PROMPT_BINDING_UNSUPPORTED');
      promptNode.inputs = { ...promptNode.inputs, value: input.prompt };
    } else {
      throw new Error('H3_PROMPT_BINDING_REQUIRED');
    }
    h3.inputs = { ...h3.inputs, width: input.width, height: input.height, length: input.length };
  }
  if (input.seed !== undefined) for (const id of (boundary.mode === 'r2v-2stage-veda' ? boundary.noiseNodeIds : undefined) ?? [boundary.noiseNodeId]) graph[id].inputs = { ...graph[id].inputs, noise_seed: input.seed };
  if (input.filenamePrefix && boundary.mode !== 'r2v-2stage-veda') save.inputs = { ...save.inputs, filename_prefix: input.filenamePrefix };
  const imageIds = profile.referenceBindings?.imageNodeIds ?? []; const audioIds = profile.referenceBindings?.audioNodeIds ?? []; const videoIds = profile.referenceBindings?.videoNodeIds ?? [];
  if ((input.images?.length ?? 0) > imageIds.length || (input.audios?.length ?? 0) > audioIds.length || (input.videos?.length ?? 0) > videoIds.length) throw new Error('TOO_MANY_H3_REFERENCES');
  if (boundary.mode === 'fl2va-i2v' && (input.images?.length !== 2 || imageIds.length !== 2)) throw new Error('H3_FL2VA_REQUIRES_FIRST_AND_LAST_IMAGES');
  input.images?.forEach((file, index) => { const node = graph[imageIds[index]]; if (!node) throw new Error('INVALID_H3_IMAGE_BINDING'); node.inputs = { ...node.inputs, image: file.subfolder ? `${file.subfolder}/${file.name}` : file.name }; });
  input.audios?.forEach((file, index) => { const node = graph[audioIds[index]]; if (!node) throw new Error('INVALID_H3_AUDIO_BINDING'); node.inputs = { ...node.inputs, audio: file.subfolder ? `${file.subfolder}/${file.name}` : file.name }; });
  input.videos?.forEach((file, index) => { const node = graph[videoIds[index]]; if (!node) throw new Error('INVALID_H3_VIDEO_BINDING'); const field = 'video' in (node.inputs ?? {}) ? 'video' : 'file'; node.inputs = { ...node.inputs, [field]: file.subfolder ? `${file.subfolder}/${file.name}` : file.name }; });
  if ('mode' in boundary && boundary.mode === 'refmod-i2v') {
    if (!input.images?.[0] || !Array.isArray(h3.inputs?.first_frame)) throw new Error('H3_REFMOD_FIRST_FRAME_REQUIRED');
    if (input.images[1] && !Array.isArray(h3.inputs?.last_frame)) throw new Error('H3_REFMOD_LAST_FRAME_BINDING_REQUIRED');
  }
  return graph;
}
