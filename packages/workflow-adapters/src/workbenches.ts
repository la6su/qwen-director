export type WorkbenchKind = 'actor' | 'scene' | 'prop' | 'layout' | 'image-edit' | 'image-generate' | 'refmod-create';

export type WorkbenchContract = {
  kind: WorkbenchKind;
  displayName: string;
  requiredInputs: readonly string[];
  outputSlots: readonly string[];
  assetKind: string;
};

export const WORKBENCH_CONTRACTS: readonly WorkbenchContract[] = [
  { kind: 'actor', displayName: 'Actor workbench', requiredInputs: ['description'], outputSlots: ['master', 'turnaround'], assetKind: 'actor' },
  { kind: 'scene', displayName: 'Scene workbench', requiredInputs: ['description'], outputSlots: ['establishing', 'angles'], assetKind: 'scene' },
  { kind: 'prop', displayName: 'Prop workbench', requiredInputs: ['description'], outputSlots: ['master', 'detail'], assetKind: 'prop' },
  { kind: 'layout', displayName: 'Layout study', requiredInputs: ['composition'], outputSlots: ['layout'], assetKind: 'layout' },
  { kind: 'image-edit', displayName: 'Qwen Image 2.1 edit', requiredInputs: ['prompt'], outputSlots: ['image'], assetKind: 'image-edit' },
  { kind: 'image-generate', displayName: 'Qwen Image 2.1 text to image', requiredInputs: ['prompt'], outputSlots: ['image'], assetKind: 'reference' },
  { kind: 'refmod-create', displayName: 'MiniMax H3 RefMod', requiredInputs: ['prompt'], outputSlots: ['refmod'], assetKind: 'actor' },
];

export function getWorkbenchContract(kind: WorkbenchKind): WorkbenchContract {
  const contract = WORKBENCH_CONTRACTS.find((item) => item.kind === kind);
  if (!contract) throw new Error(`UNKNOWN_WORKBENCH:${kind}`);
  return contract;
}

export function validateWorkbenchInputs(kind: WorkbenchKind, inputs: Record<string, unknown>): void {
  const contract = getWorkbenchContract(kind);
  for (const key of contract.requiredInputs) if (typeof inputs[key] !== 'string' || !(inputs[key] as string).trim()) throw new Error(`WORKBENCH_INPUT_REQUIRED:${kind}:${key}`);
}

export function mapWorkbenchOutputs(kind: WorkbenchKind, outputs: Array<{ logicalName: string; mimeType: string; sha256: string; byteSize: number; outputNodeId?: string }>, outputBindings?: Record<string, string>) {
  const contract = getWorkbenchContract(kind);
  if (kind === 'refmod-create') return outputs.map((output) => ({ ...output, slot: 'refmod', provenance: { source: 'workbench', workbench: kind, slot: 'refmod' } }));
  const nodeIds = [...new Set(outputs.map((output) => output.outputNodeId).filter((id): id is string => Boolean(id)))].sort();
  if (nodeIds.length !== new Set(outputs.map((output) => output.outputNodeId)).size) throw new Error('WORKBENCH_OUTPUT_NODE_REQUIRED');
  const bindings = outputBindings ?? (nodeIds.length === 1 ? { [nodeIds[0]]: contract.outputSlots[0] } : undefined);
  if (!bindings || Object.keys(bindings).length !== nodeIds.length || nodeIds.some((id) => !Object.hasOwn(bindings, id))) throw new Error('WORKBENCH_OUTPUT_BINDINGS_INCOMPLETE');
  const slots = nodeIds.map((id) => bindings[id]);
  if (slots.some((slot) => !contract.outputSlots.includes(slot)) || new Set(slots).size !== slots.length) throw new Error('WORKBENCH_OUTPUT_BINDINGS_INVALID');
  return outputs.map((output) => {
    const slot = bindings[output.outputNodeId as string];
    return { ...output, slot, provenance: { source: 'workbench', workbench: kind, outputNodeId: output.outputNodeId, slot } };
  });
}

export function planWorkbench(kind: WorkbenchKind, inputs: Record<string, unknown>, workflowDigest: string) {
  validateWorkbenchInputs(kind, inputs);
  if (!/^[a-f0-9]{64}$/i.test(workflowDigest)) throw new Error('WORKBENCH_WORKFLOW_DIGEST_REQUIRED');
  const contract = getWorkbenchContract(kind);
  return { adapterId: `comfyui.workbench.${kind}`, adapterVersion: '1.0', workflowDigest, requirements: { concurrencyKey: `comfyui:${kind}`, diskMb: 1024 }, resolvedParameters: { workbench: kind, requiredInputs: contract.requiredInputs, outputSlots: contract.outputSlots } };
}

export type WorkbenchPlan = ReturnType<typeof planWorkbench> & { provenance: { source: 'workbench'; kind: WorkbenchKind } };

export function createWorkbenchPlan(kind: WorkbenchKind, inputs: Record<string, unknown>, workflowDigest: string): WorkbenchPlan {
  return { ...planWorkbench(kind, inputs, workflowDigest), provenance: { source: 'workbench', kind } };
}
