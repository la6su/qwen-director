import { createHash } from 'node:crypto';
import { getWorkbenchContract, type WorkbenchKind } from './workbenches.js';
import { validateComfyApiWorkflowSchema } from './comfy-schema.js';

/** Canonical API workflow filenames from the Director Studio parity target. */
export const WORKBENCH_WORKFLOW_SPECS: Record<WorkbenchKind, { fileName: string; requiredClasses: readonly string[] }> = {
  actor: { fileName: 'qwen_actor_asset_workbench.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  scene: { fileName: 'QwenEdit2511_MultiAngle_SceneRef.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  prop: { fileName: 'qwen_prop_master.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  layout: { fileName: 'qwen_image_21_layout.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  'image-edit': { fileName: 'image_edit_QwenImage21.api.json', requiredClasses: ['LoadImage', 'TextEncodeQwenImage21', 'SaveImageAdvanced'] },
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

export function validateWorkbenchGraph(kind: WorkbenchKind, graph: Record<string, any>, expectedDigest?: string, outputBindings?: Record<string, string>): { digest: string; classes: string[]; outputBindings: Record<string, string> } {
  const contract = getWorkbenchContract(kind);
  if (!graph || typeof graph !== 'object' || !Object.keys(graph).length) throw new Error('WORKBENCH_GRAPH_REQUIRED');
  const classes = [...new Set(Object.values(graph).map((node) => node?.class_type).filter((value): value is string => typeof value === 'string'))];
  const missing = WORKBENCH_WORKFLOW_SPECS[kind].requiredClasses.filter((name) => !classes.includes(name));
  if (missing.length) throw new Error(`WORKBENCH_CLASSES_MISSING:${kind}:${missing.join(',')}`);
  const resolvedOutputBindings = resolveWorkbenchOutputBindings(kind, graph, outputBindings);
  if (kind === 'image-generate' && classes.includes('LoadImage')) throw new Error('IMAGE_GENERATE_MUST_NOT_LOAD_IMAGE');
  if (kind === 'image-generate' && (classes.filter((name) => name === 'TextEncodeQwenImage21').length !== 1 || classes.filter((name) => name === 'KSampler').length !== 1 || classes.filter((name) => name === 'SaveImageAdvanced').length !== 1)) throw new Error('IMAGE_GENERATE_BOUNDARY_INVALID');
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
    if (!latentSource || latentSource[1] !== 2 || latentSource[0] !== encoderId) throw new Error('IMAGE_EDIT_SAMPLER_MUST_USE_REFERENCE_LATENT');

    const resolution = encoder.inputs?.resolution;
    if (!Number.isInteger(resolution) || resolution <= 0) throw new Error('IMAGE_EDIT_REFERENCE_RESOLUTION_REQUIRED');
    if (resolution % 32 !== 0) throw new Error('IMAGE_EDIT_REFERENCE_RESOLUTION_MUST_ALIGN_32');

    const enhancers = Object.entries(graph).filter(([, node]) => node?.class_type === 'TextGenerate');
    if (enhancers.length) {
      const promptSource = linkedSource(graph, encoder.inputs?.prompt);
      if (!promptSource || graph[promptSource[0]]?.class_type !== 'TextGenerate') throw new Error('IMAGE_EDIT_PROMPT_ENHANCER_DISCONNECTED');
      const enhancer = graph[promptSource[0]] as any;
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
  return { digest, classes: [...classes, `contract:${contract.outputSlots.join(',')}`], outputBindings: resolvedOutputBindings };
}
