import { digestWorkflow, validateWorkbenchGraph, WORKBENCH_WORKFLOW_SPECS } from '@qwendirector/workflow-adapters/workbench-catalog';
const graph = { '1': { class_type: 'LoadImage', inputs: {} }, '2': { class_type: 'SaveImage', inputs: {} } };
const digest = digestWorkflow(graph);
for (const kind of Object.keys(WORKBENCH_WORKFLOW_SPECS)) {
  const result = validateWorkbenchGraph(kind, graph, digest);
  if (result.digest !== digest) throw new Error('digest mismatch');
}
try { validateWorkbenchGraph('layout', graph, '0'.repeat(64)); throw new Error('expected mismatch'); } catch (error) { if ((error.message ?? '') !== 'WORKBENCH_WORKFLOW_DIGEST_MISMATCH') throw error; }
console.log('workbench catalog smoke: ok');
