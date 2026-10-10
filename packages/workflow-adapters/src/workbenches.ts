export type WorkbenchKind = 'actor' | 'scene' | 'prop' | 'layout';

export type WorkbenchContract = {
  kind: WorkbenchKind;
  displayName: string;
  requiredInputs: readonly string[];
  outputSlots: readonly string[];
  assetKind: WorkbenchKind;
};

export const WORKBENCH_CONTRACTS: readonly WorkbenchContract[] = [
  { kind: 'actor', displayName: 'Actor workbench', requiredInputs: ['description'], outputSlots: ['master', 'turnaround'], assetKind: 'actor' },
  { kind: 'scene', displayName: 'Scene workbench', requiredInputs: ['description'], outputSlots: ['establishing', 'angles'], assetKind: 'scene' },
  { kind: 'prop', displayName: 'Prop workbench', requiredInputs: ['description'], outputSlots: ['master', 'detail'], assetKind: 'prop' },
  { kind: 'layout', displayName: 'Layout study', requiredInputs: ['composition'], outputSlots: ['layout'], assetKind: 'layout' },
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

export function mapWorkbenchOutputs(kind: WorkbenchKind, outputs: Array<{ logicalName: string; mimeType: string; sha256: string; byteSize: number }>) {
  const contract = getWorkbenchContract(kind);
  return outputs.map((output, index) => ({ ...output, slot: contract.outputSlots[index] ?? `extra-${index + 1}`, provenance: { source: 'workbench', workbench: kind, slot: contract.outputSlots[index] ?? `extra-${index + 1}` } }));
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
