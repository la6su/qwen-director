import { validateComfyApiWorkflowSchema } from './comfy-schema.js';

export type ComfyApiWorkflow = Record<string, { class_type?: string; inputs?: Record<string, unknown> }>;
export type H3WorkflowBoundary = { h3NodeId: string; noiseNodeId: string; saveNodeId: string; mode?: 'r2v-2stage-veda' | 'fl2va-i2v'; noiseNodeIds?: string[]; videoNodeIds?: string[]; finalVideoNodeId?: string; promptNodeId?: string; durationNodeId?: string; resolutionNodeId?: string; megapixelsNodeId?: string; imageNodeIds?: string[] };

const linkedNodeId = (value: unknown) => Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
function isUpstream(graph: ComfyApiWorkflow, from: string, target: string, seen = new Set<string>()): boolean {
  if (from === target) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  return Object.values(graph[from]?.inputs ?? {}).some((value) => { const id = linkedNodeId(value); return id ? isUpstream(graph, id, target, seen) : false; });
}

function validateVedaWorkflow(workflow: ComfyApiWorkflow, h3NodeId: string, h3Node: NonNullable<ComfyApiWorkflow[string]>, find: (classType: string) => [string, NonNullable<ComfyApiWorkflow[string]>][]): H3WorkflowBoundary {
  const noises = find('RandomNoise'); const upscalers = find('MMH3UltimateUpscale'); const videos = find('VHS_VideoCombine');
  if (noises.length !== 2 || upscalers.length !== 1 || videos.length !== 2 || !find('VedaSparseAttention').length) throw new Error('H3_VEDA_BOUNDARY_INVALID');
  const samplerNoise = noises.find(([id]) => Object.values(workflow).some((node) => node.class_type === 'SamplerCustomAdvanced' && linkedNodeId(node.inputs?.noise) === id));
  const upscaleNoiseId = linkedNodeId(upscalers[0][1].inputs?.noise);
  const finalVideoNodeId = videos.find(([, node]) => {
    const decodeId = linkedNodeId(node.inputs?.images); const decode = decodeId ? workflow[decodeId] : undefined;
    return decode?.class_type === 'VAEDecode' && linkedNodeId(decode.inputs?.samples) === upscalers[0][0];
  })?.[0];
  const stageOneVideo = videos.find(([id]) => id !== finalVideoNodeId)?.[1];
  const stageOneDecodeId = linkedNodeId(stageOneVideo?.inputs?.images); const stageOneDecode = stageOneDecodeId ? workflow[stageOneDecodeId] : undefined;
  if (!samplerNoise || !upscaleNoiseId || !noises.some(([id]) => id === upscaleNoiseId) || !stageOneDecode || stageOneDecode.class_type !== 'VAEDecode' || !isUpstream(workflow, linkedNodeId(stageOneDecode.inputs?.samples) ?? '', h3NodeId)) throw new Error('H3_VEDA_OUTPUT_WIRING_INVALID');
  if (!finalVideoNodeId) throw new Error('H3_VEDA_FINAL_VIDEO_REQUIRED');
  if (linkedNodeId(upscalers[0][1].inputs?.conditioning) !== h3NodeId || !isUpstream(workflow, linkedNodeId(upscalers[0][1].inputs?.latent) ?? '', h3NodeId)) throw new Error('H3_VEDA_H3_CONDITIONING_REQUIRED');
  const promptJoinId = linkedNodeId(h3Node.inputs?.prompt); const promptJoin = promptJoinId ? workflow[promptJoinId] : undefined;
  const promptNodeId = linkedNodeId(promptJoin?.inputs?.string_b); const promptNode = promptNodeId ? workflow[promptNodeId] : undefined;
  const durationMathId = linkedNodeId(h3Node.inputs?.length); const durationMath = durationMathId ? workflow[durationMathId] : undefined;
  const durationNodeId = linkedNodeId(durationMath?.inputs?.['values.a']); const durationNode = durationNodeId ? workflow[durationNodeId] : undefined;
  const resolutionNodeId = linkedNodeId(h3Node.inputs?.width); const resolutionNode = resolutionNodeId ? workflow[resolutionNodeId] : undefined;
  const megapixelsNodeId = linkedNodeId(resolutionNode?.inputs?.megapixels); const megapixelsNode = megapixelsNodeId ? workflow[megapixelsNodeId] : undefined;
  if (promptJoin?.class_type !== 'StringConcatenate' || promptNode?.class_type !== 'PrimitiveStringMultiline' || durationMath?.class_type !== 'ComfyMathExpression' || durationNode?.class_type !== 'PrimitiveFloat' || resolutionNode?.class_type !== 'ResolutionSelector' || linkedNodeId(h3Node.inputs?.height) !== resolutionNodeId || megapixelsNode?.class_type !== 'PrimitiveFloat') throw new Error('H3_VEDA_INPUT_WIRING_INVALID');
  const imageNodes = find('LoadImage');
  const referenceSlots = Object.entries(h3Node.inputs ?? {})
    .map(([key, value]) => ({ key, slot: /^ref_images\.ref_image_(\d+)$/.exec(key)?.[1], source: linkedNodeId(value) }))
    .filter((entry): entry is { key: string; slot: string; source: string } => entry.slot !== undefined)
    .sort((a, b) => Number(a.slot) - Number(b.slot));
  if (referenceSlots.some(({ slot }, index) => Number(slot) !== index)) throw new Error('H3_VEDA_REFERENCE_WIRING_INVALID');
  const imageNodeIds = referenceSlots.map(({ source }) => {
    const matches = imageNodes.filter(([id]) => source && isUpstream(workflow, source, id));
    if (matches.length !== 1) throw new Error('H3_VEDA_REFERENCE_WIRING_INVALID');
    return matches[0][0];
  });
  if (!imageNodeIds.length || new Set(imageNodeIds).size !== imageNodeIds.length) throw new Error('H3_VEDA_REFERENCE_WIRING_INVALID');
  return { mode: 'r2v-2stage-veda', h3NodeId, noiseNodeId: samplerNoise[0], noiseNodeIds: noises.map(([id]) => id), saveNodeId: finalVideoNodeId, videoNodeIds: videos.map(([id]) => id), finalVideoNodeId, promptNodeId, durationNodeId, resolutionNodeId, megapixelsNodeId, imageNodeIds };
}

export type H3RefModBoundary = { mode: 'refmod-i2v'; h3NodeId: string; noiseNodeId: string; saveNodeId: string; modLoaderNodeId: string; imageNodeIds: string[] };

/** Validate the local H3 I2V graph used with saved RefMods. */
export function validateH3RefModWorkflow(workflow: ComfyApiWorkflow, bindings: { imageNodeIds?: string[] } = {}): H3RefModBoundary {
  const find = (classType: string) => Object.entries(workflow).filter(([, node]) => node?.class_type === classType);
  const h3 = find('MiniMaxH3ImageToVideo'); const noise = find('RandomNoise'); const save = find('SaveVideo'); const mods = find('MiniMaxH3RefModsLoader'); const apply = find('MiniMaxH3RefModApply');
  if (h3.length !== 1 || noise.length !== 1 || save.length !== 1 || mods.length !== 1 || apply.length !== 1) throw new Error('H3_REFMOD_WORKFLOW_BOUNDARY_INVALID');
  const loader = mods[0][1].inputs ?? {};
  const mod1 = loader.mod_1; const mod2 = loader.mod_2;
  if (typeof mod1 !== 'string' || !mod1 || mod1 === '(none)' || typeof mod2 !== 'string' || !mod2 || mod2 === '(none)' || mod1 === mod2) throw new Error('H3_REFMOD_TWO_DISTINCT_MODS_REQUIRED');
  const imageNodeIds = bindings.imageNodeIds ?? [];
  if (!imageNodeIds.length || imageNodeIds.some((id) => workflow[id]?.class_type !== 'LoadImage')) throw new Error('H3_REFMOD_IMAGE_BINDINGS_REQUIRED');
  const firstFrame = h3[0][1].inputs?.first_frame;
  if (!Array.isArray(firstFrame) || firstFrame.length !== 2 || typeof firstFrame[0] !== 'string') throw new Error('H3_REFMOD_FIRST_FRAME_REQUIRED');
  return { mode: 'refmod-i2v', h3NodeId: h3[0][0], noiseNodeId: noise[0][0], saveNodeId: save[0][0], modLoaderNodeId: mods[0][0], imageNodeIds };
}

/** Validate the portable H3 boundary without depending on node IDs or internal graph layout. */
export function validateH3Workflow(workflow: ComfyApiWorkflow): H3WorkflowBoundary {
  const find = (classType: string): Array<[string, NonNullable<ComfyApiWorkflow[string]>]> => Object.entries(workflow).filter(([, node]) => node?.class_type === classType);
  const ref2va = find('MiniMaxH3ReferenceToVideo'); const i2va = find('MiniMaxH3ImageToVideo'); const noise = find('RandomNoise'); const save = find('SaveVideo');
  if (ref2va.length + i2va.length !== 1) throw new Error(`H3_WORKFLOW_REQUIRES_ONE_H3_NODE:${ref2va.length + i2va.length}`);
  if (ref2va.length && (find('MMH3UltimateUpscale').length || find('VedaSparseAttention').length)) return validateVedaWorkflow(workflow, ref2va[0][0], ref2va[0][1], find);
  if (noise.length !== 1) throw new Error(`H3_WORKFLOW_REQUIRES_ONE_NOISE_NODE:${noise.length}`);
  if (save.length !== 1) throw new Error(`H3_WORKFLOW_REQUIRES_ONE_SAVE_NODE:${save.length}`);
  if (i2va.length) {
    const h3Node = i2va[0][1];
    const frameLinks = ['first_frame', 'last_frame'].map((field) => {
      const source = linkedNodeId(h3Node.inputs?.[field]);
      if (!source || workflow[source]?.class_type !== 'LoadImage') throw new Error(`H3_FL2VA_${field.toUpperCase()}_BINDING_REQUIRED`);
      return source;
    });
    if (new Set(frameLinks).size !== 2) throw new Error('H3_FL2VA_DISTINCT_FRAMES_REQUIRED');
    if (find('MiniMaxH3RefModsLoader').length || find('MiniMaxH3RefModApply').length) throw new Error('H3_FL2VA_REFMOD_GRAPH_UNSUPPORTED');
    return { mode: 'fl2va-i2v', h3NodeId: i2va[0][0], noiseNodeId: noise[0][0], saveNodeId: save[0][0], imageNodeIds: frameLinks };
  }
  if (find('ref_frame').length || find('last_frame').length) throw new Error('H3_WORKFLOW_UNSUPPORTED_I2V_BOUNDARY');
  return { h3NodeId: ref2va[0][0], noiseNodeId: noise[0][0], saveNodeId: save[0][0] };
}

export async function preflightH3Runtime(baseUrl: string, workflow?: ComfyApiWorkflow): Promise<{ classes: string[]; availableLoras?: string[]; missingLoras?: string[]; qualityHint?: 'draft-4step'|'quality-8step'|'unknown'; optimizationNodes?: string[] }> {
  const response = await fetch(`${baseUrl}/object_info`);
  if (!response.ok) throw new Error(`COMFY_OBJECT_INFO_${response.status}`);
  const info = await response.json() as Record<string, unknown>;
  const classes = Object.keys(info);
  if (workflow) validateComfyApiWorkflowSchema(workflow, info, 'COMFY_WORKFLOW_SCHEMA_MISMATCH');
  const boundary = workflow ? validateH3Workflow(workflow) : undefined;
  const requiredNodes = boundary?.mode === 'r2v-2stage-veda'
    ? ['MiniMaxH3ReferenceToVideo', 'RandomNoise', 'VHS_VideoCombine', 'MMH3UltimateUpscale', 'VedaSparseAttention']
    : [boundary?.mode === 'fl2va-i2v' ? 'MiniMaxH3ImageToVideo' : 'MiniMaxH3ReferenceToVideo', 'RandomNoise', 'SaveVideo'];
  for (const required of requiredNodes) if (!classes.includes(required)) throw new Error(`COMFY_MISSING_NODE:${required}`);
  if (!workflow) return { classes };
  const loras = Object.values(workflow).filter((node) => node?.class_type === 'LoraLoaderModelOnly').map((node) => node.inputs?.lora_name).filter((name): name is string => typeof name === 'string' && name.length > 0);
  const loader = info.LoraLoaderModelOnly as any;
  const availableLoras = Array.isArray(loader?.input?.required?.lora_name?.[0]) ? loader.input.required.lora_name[0].filter((name: unknown): name is string => typeof name === 'string') : [];
  const missingLoras = loras.filter((name) => !availableLoras.includes(name));
  if (missingLoras.length) throw new Error(`COMFY_MISSING_LORA:${missingLoras.join(',')}`);
  if (Object.values(workflow).some((node) => node?.class_type === 'MiniMaxH3ReferenceToVideo') && loras.some((name) => /fl2v/i.test(name))) throw new Error(`COMFY_INCOMPATIBLE_LORA:FL2V_FOR_REF2V:${loras.filter((name) => /fl2v/i.test(name)).join(',')}`);
  if (boundary?.mode === 'fl2va-i2v' && loras.some((name) => /pika.*flex.*ref2va/i.test(name))) throw new Error(`COMFY_INCOMPATIBLE_LORA:REF2V_FOR_FL2VA:${loras.filter((name) => /pika.*flex.*ref2va/i.test(name)).join(',')}`);
  if (boundary?.mode === 'fl2va-i2v') {
    const modelInputs = Object.entries(workflow).flatMap(([id, node]) => {
      const keys = ['UNETLoader', 'CheckpointLoaderSimple'].includes(node?.class_type ?? '') ? ['unet_name', 'ckpt_name']
        : /PDDAccApply/i.test(node?.class_type ?? '') ? ['pdd_file', 'model_name', 'unet_name'] : [];
      return keys.map((key) => ({ id, key, value: node.inputs?.[key] })).filter((entry): entry is { id: string; key: string; value: string } => typeof entry.value === 'string');
    });
    if (!modelInputs.some((entry) => /fl2v/i.test(entry.value))) throw new Error('COMFY_FL2VA_MODEL_STACK_REQUIRED');
  }
  const qualityHint = loras.some((name) => /8step/i.test(name)) ? 'quality-8step' : loras.some((name) => /4step/i.test(name)) ? 'draft-4step' : 'unknown';
  const optimizationNodes = classes.filter((name) => ['MiniMaxH3MemoryEfficientSageAttentionPatch','ModelAttentionBackend','MiniMaxLowVRAMAttention','EasyCache','LazyCache','LatentUpscale','LatentUpscaleBy'].includes(name));
  return { classes, availableLoras, missingLoras, qualityHint, optimizationNodes };
}

export async function preflightH3RefModRuntime(baseUrl: string, workflow: ComfyApiWorkflow, boundary: H3RefModBoundary): Promise<{ classes: string[]; availableMods: string[] }> {
  const response = await fetch(`${baseUrl}/object_info`);
  if (!response.ok) throw new Error(`COMFY_OBJECT_INFO_${response.status}`);
  const info = await response.json() as Record<string, any>;
  validateComfyApiWorkflowSchema(workflow, info, 'COMFY_WORKFLOW_SCHEMA_MISMATCH');
  for (const required of ['MiniMaxH3ImageToVideo', 'MiniMaxH3RefModsLoader', 'MiniMaxH3RefModApply', 'RandomNoise', 'SaveVideo', 'LoadImage']) if (!info[required]) throw new Error(`COMFY_MISSING_NODE:${required}`);
  const options = info.MiniMaxH3RefModsLoader?.input?.required?.mod_1?.[0];
  const availableMods = Array.isArray(options) ? options.filter((item: unknown): item is string => typeof item === 'string' && item !== '(none)') : [];
  for (const mod of ['mod_1', 'mod_2']) { const name = workflow[boundary.modLoaderNodeId]?.inputs?.[mod]; if (typeof name !== 'string' || !availableMods.includes(name)) throw new Error(`COMFY_MISSING_REFMOD:${String(name)}`); }
  return { classes: Object.keys(info), availableMods };
}
