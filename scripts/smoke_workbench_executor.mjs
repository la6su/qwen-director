import { ComfyWorkbenchExecutor } from '@qwendirector/workflow-adapters/executors';

const graph = { '1': { class_type: 'LoadImage', inputs: {} }, '2': { class_type: 'SaveImage', inputs: {} } };
for (const kind of ['actor', 'scene', 'prop', 'layout']) {
  const executor = new ComfyWorkbenchExecutor('http://127.0.0.1:9', graph, kind);
  await executor.prepare({ planHash: `smoke-${kind}`, jobId: 'job', attemptId: 'attempt', plan: {} });
}
console.log('workbench executor smoke: ok');
