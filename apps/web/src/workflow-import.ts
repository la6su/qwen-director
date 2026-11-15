export { extractComfyApiGraph, convertComfyUiWorkflowToApi } from '../../../packages/workflow-adapters/src/workflow-import.js';
import { extractComfyApiGraph } from '../../../packages/workflow-adapters/src/workflow-import.js';

export async function normalizeComfyWorkflow(value: unknown, fetcher: typeof fetch): Promise<Record<string, unknown>> {
  if (value && typeof value === 'object' && Array.isArray((value as any).nodes) && Array.isArray((value as any).links)) {
    const response = await fetcher('/v1/workflows/convert', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflow: value }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.code ?? 'WORKFLOW_CONVERSION_FAILED');
    return result.graph;
  }
  return extractComfyApiGraph(value);
}
