import { createHash } from 'node:crypto';
import { getWorkbenchContract, type WorkbenchKind } from './workbenches.js';

/** Canonical API workflow filenames from the Director Studio parity target. */
export const WORKBENCH_WORKFLOW_SPECS: Record<WorkbenchKind, { fileName: string; requiredClasses: readonly string[] }> = {
  actor: { fileName: 'qwen_actor_asset_workbench.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  scene: { fileName: 'QwenEdit2511_MultiAngle_SceneRef.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  prop: { fileName: 'qwen_prop_master.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
  layout: { fileName: 'ref_frame_layout.api.json', requiredClasses: ['LoadImage', 'SaveImage'] },
};

export function digestWorkflow(graph: unknown): string {
  return createHash('sha256').update(JSON.stringify(graph)).digest('hex');
}

export function validateWorkbenchGraph(kind: WorkbenchKind, graph: Record<string, any>, expectedDigest?: string): { digest: string; classes: string[] } {
  const contract = getWorkbenchContract(kind);
  if (!graph || typeof graph !== 'object' || !Object.keys(graph).length) throw new Error('WORKBENCH_GRAPH_REQUIRED');
  const classes = [...new Set(Object.values(graph).map((node) => node?.class_type).filter((value): value is string => typeof value === 'string'))];
  const missing = WORKBENCH_WORKFLOW_SPECS[kind].requiredClasses.filter((name) => !classes.includes(name));
  if (missing.length) throw new Error(`WORKBENCH_CLASSES_MISSING:${kind}:${missing.join(',')}`);
  const digest = digestWorkflow(graph);
  if (expectedDigest && digest.toLowerCase() !== expectedDigest.toLowerCase()) throw new Error('WORKBENCH_WORKFLOW_DIGEST_MISMATCH');
  return { digest, classes: [...classes, `contract:${contract.outputSlots.join(',')}`] };
}
