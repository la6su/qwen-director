import { createHash } from 'node:crypto';
import { getWorkbenchContract, type WorkbenchKind } from './workbenches.js';
import { validateComfyApiWorkflowSchema } from './comfy-schema.js';
import { resolveWorkbenchImageBindings } from './workbench-image-bindings.js';
export { resolveWorkbenchImageBindings } from './workbench-image-bindings.js';

/** Canonical API workflow filenames from the Director Studio parity target. */
export const WORKBENCH_WORKFLOW_SPECS: Record<WorkbenchKind, { fileName: string; requiredClasses: readonly string[] }> = {
  actor: { fileName: 'qwen_actor_asset_workbench.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  scene: { fileName: 'QwenEdit2511_MultiAngle_SceneRef.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  prop: { fileName: 'qwen_prop_master.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  layout: { fileName: 'qwen_image_21_layout.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  'image-edit': { fileName: 'image_edit_QwenImage21.api.json', requiredClasses: ['LoadImage', 'TextEncodeQwenImage21', 'VAELoader', 'SaveImageAdvanced'] },
  'image-generate': { fileName: 'qwen_image_2.1_text_to_image.api.json', requiredClasses: ['UNETLoader', 'CLIPLoader', 'VAELoader', 'QwenImage21Cache', 'TextEncodeQwenImage21', 'EmptyLatentImage', 'KSampler', 'VAEDecode', 'SaveImageAdvanced'] },
  'refmod-create': { fileName: 'h3_refmod_create.api.json', requiredClasses: ['VAELoader', 'H3RefModCreateFromFolder'] },
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

export function digestWorkflow(graph: unknown): string {
  return createHash('sha256').update(canonicalJson(graph)).digest('hex');
}

export function validateWorkbenchRuntimeSchema(graph: Record<string, any>, schema: Record<string, any>) { return validateComfyApiWorkflowSchema(graph, schema, 'WORKBENCH_RUNTIME_SCHEMA_MISMATCH'); }

/** Ensure Qwen Image edits start sampling from the encoded base image. The
 * TextEncodeQwenImage21 latent output is intentionally empty and only matches
 * the first reference's size; it is not an encoded source image.
 */
export function prepareWorkbenchGraph(kind: WorkbenchKind, source: Record<string, any>): Record<string, any> {
  if (kind !== 'image-edit') return source;
  const graph = structuredClone(source);
  const samplers = Object.entries(graph).filter(([, node]) => node?.class_type === 'KSampler');
  const encoders = Object.entries(graph).filter(([, node]) => node?.class_type === 'TextEncodeQwenImage21');
  if (samplers.length !== 1 || encoders.length !== 1) return graph;
  const [encoderId] = encoders[0];
  const sampler = samplers[0][1] as any;
  const latentLink = sampler.inputs?.latent_image;
  const switchNode = Array.isArray(latentLink) && typeof latentLink[0] === 'string' ? graph[latentLink[0]] : undefined;
  if (switchNode?.class_type === 'ComfySwitchNode' && typeof switchNode.inputs?.switch === 'boolean') {
    const trueSource = linkedSource(graph, switchNode.inputs?.on_true);
    const falseSource = linkedSource(graph, switchNode.inputs?.on_false);
    const isBaseVae = (source: [string, number] | undefined) => source?.[1] === 0 && ['VAEEncode','VAEEncodeForInpaint'].includes(graph[source[0]]?.class_type);
    const trueIsBase = isBaseVae(trueSource);
    const falseIsBase = isBaseVae(falseSource);
    if (trueIsBase === falseIsBase) throw new Error('IMAGE_EDIT_BASE_VAE_LATENT_BRANCH_REQUIRED');
    switchNode.inputs = { ...switchNode.inputs, switch: trueIsBase };
  }
  return graph;
}

export function resolveWorkbenchOutputBindings(kind: WorkbenchKind, graph: Record<string, any>, bindings?: Record<string, string>) {
  if (kind === 'refmod-create') return {};
  const contract = getWorkbenchContract(kind);
  const nodeIds = Object.entries(graph).filter(([, node]) => ['SaveImage', 'SaveImageAdvanced'].includes(node?.class_type)).map(([id]) => id).sort();
  if (!nodeIds.length) throw new Error(`WORKBENCH_OUTPUT_NODES_MISSING:${kind}`);
  if (!bindings && nodeIds.length === 1) return { [nodeIds[0]]: contract.outputSlots[0] };
  if (!bindings || Object.keys(bindings).length !== nodeIds.length || nodeIds.some((id) => !Object.hasOwn(bindings, id))) throw new Error('WORKBENCH_OUTPUT_BINDINGS_INCOMPLETE');
  const slots = nodeIds.map((id) => bindings[id]);
  if (slots.some((slot) => !contract.outputSlots.includes(slot)) || new Set(slots).size !== slots.length) throw new Error('WORKBENCH_OUTPUT_BINDINGS_INVALID');
  return Object.fromEntries(nodeIds.map((id) => [id, bindings[id]]));
}

export function bindWorkbenchImages(graph: Record<string, any>, imageNodeIds: string[], images: Array<{ name: string; subfolder?: string }>) {
  if (images.length !== imageNodeIds.length) throw new Error('WORKBENCH_IMAGE_REFERENCE_COUNT_MISMATCH');
  imageNodeIds.forEach((id, index) => {
    const node = graph[id];
    if (node?.class_type !== 'LoadImage') throw new Error('INVALID_WORKBENCH_IMAGE_BINDING');
    const file = images[index];
    node.inputs = { ...node.inputs, image: file.subfolder ? `${file.subfolder}/${file.name}` : file.name };
  });
}

function linkedSource(graph: Record<string, any>, link: unknown): [string, number] | undefined {
  let current = link;
  const visited = new Set<string>();
  while (Array.isArray(current) && typeof current[0] === 'string' && Number.isInteger(current[1])) {
    const [id, output] = current as [string, number];
    if (visited.has(id)) return undefined;
    const node = graph[id];
    visited.add(id);
    if (node?.class_type === 'ComfySwitchNode') current = node.inputs?.[node.inputs?.switch === false ? 'on_false' : 'on_true'];
    else if (node?.class_type === 'PreviewAny' && Array.isArray(node.inputs?.source)) current = node.inputs.source;
    else return [id, output];
  }
  return undefined;
}

const IMAGE_SAMPLER_CLASSES = new Set(['KSampler', 'KSamplerAdvanced', 'SamplerCustom', 'SamplerCustomAdvanced']);

/** Actor/scene/prop/layout workbenches must produce sampled imagery, not pass a loaded reference straight to a saver. */
function validateGeneratedImageOutputs(kind: WorkbenchKind, graph: Record<string, any>): void {
  if (!['actor', 'scene', 'prop', 'layout', 'image-edit', 'image-generate'].includes(kind)) return;
  const savers = Object.entries(graph).filter(([, node]) => ['SaveImage', 'SaveImageAdvanced'].includes(node?.class_type));
  for (const [saverId, saver] of savers) {
    const pending = collectLinks(saver.inputs?.images ?? saver.inputs?.image);
    const visited = new Set<string>();
    let hasSampler = false;
    while (pending.length) {
      const [id] = pending.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = graph[id];
      if (!node) continue;
      if (IMAGE_SAMPLER_CLASSES.has(node.class_type)) hasSampler = true;
      for (const value of Object.values(node.inputs ?? {})) pending.push(...collectLinks(value));
    }
    if (!hasSampler) throw new Error(`WORKBENCH_GENERATION_PATH_REQUIRED:${kind}:${saverId}`);
  }
}

function collectLinks(value: unknown): Array<[string, number]> {
  if (!Array.isArray(value)) return [];
  if (value.length === 2 && typeof value[0] === 'string' && Number.isInteger(value[1])) return [[value[0], value[1]]];
  return value.flatMap(collectLinks);
}

export function validateWorkbenchGraph(kind: WorkbenchKind, graph: Record<string, any>, expectedDigest?: string, outputBindings?: Record<string, string>, imageNodeIds?: string[]): { digest: string; classes: string[]; outputBindings: Record<string, string>; imageNodeIds: string[] } {
  const contract = getWorkbenchContract(kind);
  if (!graph || typeof graph !== 'object' || !Object.keys(graph).length) throw new Error('WORKBENCH_GRAPH_REQUIRED');
  const classes = [...new Set(Object.values(graph).map((node) => node?.class_type).filter((value): value is string => typeof value === 'string'))];
  const missing = WORKBENCH_WORKFLOW_SPECS[kind].requiredClasses.filter((name) => !classes.includes(name));
  if (missing.length) throw new Error(`WORKBENCH_CLASSES_MISSING:${kind}:${missing.join(',')}`);
  const resolvedOutputBindings = resolveWorkbenchOutputBindings(kind, graph, outputBindings);
  const resolvedImageNodeIds = resolveWorkbenchImageBindings(kind, graph, imageNodeIds);
  validateGeneratedImageOutputs(kind, graph);
  if (kind === 'image-generate' && classes.includes('LoadImage')) throw new Error('IMAGE_GENERATE_MUST_NOT_LOAD_IMAGE');
  if (kind === 'image-generate' && (classes.filter((name) => name === 'TextEncodeQwenImage21').length !== 1 || classes.filter((name) => name === 'KSampler').length !== 1 || classes.filter((name) => name === 'SaveImageAdvanced').length !== 1)) throw new Error('IMAGE_GENERATE_BOUNDARY_INVALID');
  if (kind === 'image-generate') {
    const encoder = Object.entries(graph).find(([, node]) => node?.class_type === 'TextEncodeQwenImage21');
    const sampler = Object.values(graph).find((node) => node?.class_type === 'KSampler') as any;
    const positive = linkedSource(graph, sampler.inputs?.positive);
    const negative = linkedSource(graph, sampler.inputs?.negative);
    const latent = linkedSource(graph, sampler.inputs?.latent_image);
    if (!encoder || positive?.[0] !== encoder[0] || positive[1] !== 0 || negative?.[0] !== encoder[0] || negative[1] !== 1) throw new Error('IMAGE_GENERATE_CONDITIONING_PATH_INVALID');
    if (!latent || graph[latent[0]]?.class_type !== 'EmptyLatentImage') throw new Error('IMAGE_GENERATE_EMPTY_LATENT_PATH_INVALID');
  }
  if (kind === 'refmod-create') {
    const creators = Object.entries(graph).filter(([, node]) => node?.class_type === 'H3RefModCreateFromFolder');
    if (creators.length !== 1) throw new Error('REFMOD_CREATE_BOUNDARY_INVALID');
    const creator = creators[0][1] as any;
    if (creator.inputs?.save !== true || creator.inputs?.save_layout !== 'bundle' || creator.inputs?.use_subfolders === true) throw new Error('REFMOD_CREATE_SAVE_POLICY_INVALID');
    if (!Array.isArray(creator.inputs?.vae) || graph[String(creator.inputs.vae[0])]?.class_type !== 'VAELoader') throw new Error('REFMOD_CREATE_VIDEO_VAE_REQUIRED');
  }
  if (kind === 'image-edit') {
    const encoders = Object.entries(graph).filter(([, node]) => node?.class_type === 'TextEncodeQwenImage21');
    const samplers = Object.entries(graph).filter(([, node]) => node?.class_type === 'KSampler');
    if (encoders.length !== 1 || samplers.length !== 1) throw new Error('IMAGE_EDIT_BOUNDARY_INVALID');
    const [encoderId, encoder] = encoders[0] as [string, any];
    const sampler = samplers[0][1] as any;
    const latentSource = linkedSource(graph, sampler.inputs?.latent_image);
    const baseImageSource = linkedSource(graph, encoder.inputs?.['images.image_1']);
    const latentNode = latentSource && graph[latentSource[0]];
    const baseLatentEncoder = ['VAEEncode','VAEEncodeForInpaint'].includes(latentNode?.class_type);
    const latentImageSource = baseLatentEncoder ? linkedSource(graph, latentNode.inputs?.pixels) : undefined;
    const latentVaeSource = baseLatentEncoder ? linkedSource(graph, latentNode.inputs?.vae) : undefined;
    if (!latentSource || latentSource[1] !== 0 || !baseLatentEncoder) throw new Error('IMAGE_EDIT_SAMPLER_MUST_USE_SOURCE_VAE_LATENT');
    if (!baseImageSource || graph[baseImageSource[0]]?.class_type !== 'LoadImage' || latentImageSource?.[0] !== baseImageSource[0]) throw new Error('IMAGE_EDIT_BASE_IMAGE_VAE_PATH_INVALID');
    if (!latentVaeSource || graph[latentVaeSource[0]]?.class_type !== 'VAELoader') throw new Error('IMAGE_EDIT_BASE_VAE_REQUIRED');
    if (latentNode.class_type === 'VAEEncodeForInpaint') {
      const maskSource = linkedSource(graph, latentNode.inputs?.mask);
      const maskNode = maskSource && graph[maskSource[0]];
      const colorMaskSource = maskNode?.class_type === 'FeatherMask' ? linkedSource(graph, maskNode.inputs?.mask) : maskSource;
      const colorMaskNode = colorMaskSource && graph[colorMaskSource[0]];
      const colorMaskImageSource = colorMaskNode?.class_type === 'ImageColorToMask' ? linkedSource(graph, colorMaskNode.inputs?.image) : undefined;
      if (colorMaskNode?.class_type !== 'ImageColorToMask' || colorMaskImageSource?.[0] !== baseImageSource[0]) throw new Error('IMAGE_EDIT_BASE_MASK_PATH_INVALID');
    }

    const resolution = encoder.inputs?.resolution;
    if (!Number.isInteger(resolution) || resolution < 0) throw new Error('IMAGE_EDIT_REFERENCE_RESOLUTION_INVALID');
    if (resolution > 0 && resolution % 32 !== 0) throw new Error('IMAGE_EDIT_REFERENCE_RESOLUTION_MUST_ALIGN_32');

    const promptSource = linkedSource(graph, encoder.inputs?.prompt);
    const enhancer = promptSource && graph[promptSource[0]]?.class_type === 'TextGenerate' ? graph[promptSource[0]] as any : undefined;
    if (enhancer) {
      const encoderImageIds = Object.entries(encoder.inputs ?? {})
        .filter(([name, value]) => name.startsWith('images.image_') && Array.isArray(value))
        .map(([, value]) => linkedSource(graph, value)?.[0]).filter((id): id is string => Boolean(id));
      const enhancerImageSource = linkedSource(graph, enhancer.inputs?.image);
      const enhancerImageNode = enhancerImageSource && graph[enhancerImageSource[0]];
      const enhancerImageIds = Object.values(enhancerImageNode?.inputs ?? {}).map((value: any) => Array.isArray(value) ? linkedSource(graph, value)?.[0] : undefined).filter((id): id is string => Boolean(id));
      if (encoderImageIds.some((id) => !enhancerImageIds.includes(id))) throw new Error('IMAGE_EDIT_PROMPT_ENHANCER_REFERENCES_MISMATCH');
    }
  }
  const digest = digestWorkflow(graph);
  if (expectedDigest && digest.toLowerCase() !== expectedDigest.toLowerCase()) throw new Error('WORKBENCH_WORKFLOW_DIGEST_MISMATCH');
  return { digest, classes: [...classes, `contract:${contract.outputSlots.join(',')}`], outputBindings: resolvedOutputBindings, imageNodeIds: resolvedImageNodeIds };
}
