export type ComfyApiWorkflow = Record<string, { class_type?: string; inputs?: Record<string, unknown> }>;

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
export function validateH3Workflow(workflow: ComfyApiWorkflow): { h3NodeId: string; noiseNodeId: string; saveNodeId: string } {
  const find = (classType: string) => Object.entries(workflow).filter(([, node]) => node?.class_type === classType);
  const h3 = find('MiniMaxH3ReferenceToVideo'); const noise = find('RandomNoise'); const save = find('SaveVideo');
  if (h3.length !== 1) throw new Error(`H3_WORKFLOW_REQUIRES_ONE_H3_NODE:${h3.length}`);
  if (noise.length !== 1) throw new Error(`H3_WORKFLOW_REQUIRES_ONE_NOISE_NODE:${noise.length}`);
  if (save.length !== 1) throw new Error(`H3_WORKFLOW_REQUIRES_ONE_SAVE_NODE:${save.length}`);
  if (find('MiniMaxH3ImageToVideo').length || find('ref_frame').length || find('last_frame').length) throw new Error('H3_WORKFLOW_UNSUPPORTED_I2V_BOUNDARY');
  return { h3NodeId: h3[0][0], noiseNodeId: noise[0][0], saveNodeId: save[0][0] };
}

export async function preflightH3Runtime(baseUrl: string, workflow?: ComfyApiWorkflow): Promise<{ classes: string[]; availableLoras?: string[]; missingLoras?: string[]; qualityHint?: 'draft-4step'|'quality-8step'|'unknown'; optimizationNodes?: string[] }> {
  const response = await fetch(`${baseUrl}/object_info`);
  if (!response.ok) throw new Error(`COMFY_OBJECT_INFO_${response.status}`);
  const info = await response.json() as Record<string, unknown>;
  const classes = Object.keys(info);
  for (const required of ['MiniMaxH3ReferenceToVideo', 'RandomNoise', 'SaveVideo']) if (!classes.includes(required)) throw new Error(`COMFY_MISSING_NODE:${required}`);
  if (!workflow) return { classes };
  const loras = Object.values(workflow).filter((node) => node?.class_type === 'LoraLoaderModelOnly').map((node) => node.inputs?.lora_name).filter((name): name is string => typeof name === 'string' && name.length > 0);
  const loader = info.LoraLoaderModelOnly as any;
  const availableLoras = Array.isArray(loader?.input?.required?.lora_name?.[0]) ? loader.input.required.lora_name[0].filter((name: unknown): name is string => typeof name === 'string') : [];
  const missingLoras = loras.filter((name) => !availableLoras.includes(name));
  if (missingLoras.length) throw new Error(`COMFY_MISSING_LORA:${missingLoras.join(',')}`);
  if (Object.values(workflow).some((node) => node?.class_type === 'MiniMaxH3ReferenceToVideo') && loras.some((name) => /fl2v/i.test(name))) throw new Error(`COMFY_INCOMPATIBLE_LORA:FL2V_FOR_REF2V:${loras.filter((name) => /fl2v/i.test(name)).join(',')}`);
  const qualityHint = loras.some((name) => /8step/i.test(name)) ? 'quality-8step' : loras.some((name) => /4step/i.test(name)) ? 'draft-4step' : 'unknown';
  const optimizationNodes = classes.filter((name) => ['MiniMaxH3MemoryEfficientSageAttentionPatch','EasyCache','LazyCache','LatentUpscale','LatentUpscaleBy'].includes(name));
  return { classes, availableLoras, missingLoras, qualityHint, optimizationNodes };
}

export async function preflightH3RefModRuntime(baseUrl: string, workflow: ComfyApiWorkflow, boundary: H3RefModBoundary): Promise<{ classes: string[]; availableMods: string[] }> {
  const response = await fetch(`${baseUrl}/object_info`);
  if (!response.ok) throw new Error(`COMFY_OBJECT_INFO_${response.status}`);
  const info = await response.json() as Record<string, any>;
  for (const required of ['MiniMaxH3ImageToVideo', 'MiniMaxH3RefModsLoader', 'MiniMaxH3RefModApply', 'RandomNoise', 'SaveVideo', 'LoadImage']) if (!info[required]) throw new Error(`COMFY_MISSING_NODE:${required}`);
  const options = info.MiniMaxH3RefModsLoader?.input?.required?.mod_1?.[0];
  const availableMods = Array.isArray(options) ? options.filter((item: unknown): item is string => typeof item === 'string' && item !== '(none)') : [];
  for (const mod of ['mod_1', 'mod_2']) { const name = workflow[boundary.modLoaderNodeId]?.inputs?.[mod]; if (typeof name !== 'string' || !availableMods.includes(name)) throw new Error(`COMFY_MISSING_REFMOD:${String(name)}`); }
  return { classes: Object.keys(info), availableMods };
}
