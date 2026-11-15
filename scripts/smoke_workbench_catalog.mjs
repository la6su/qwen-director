import { digestWorkflow, validateWorkbenchGraph, validateWorkbenchRuntimeSchema, WORKBENCH_WORKFLOW_SPECS } from '@qwendirector/workflow-adapters/workbench-catalog';
const graph = { '1': { class_type: 'LoadImage', inputs: {} }, '2': { class_type: 'SaveImage', inputs: {} } };
const digest = digestWorkflow(graph);
for (const kind of ['actor','scene','prop','layout']) {
  const result = validateWorkbenchGraph(kind, graph, digest);
  if (result.digest !== digest) throw new Error('digest mismatch');
}
try { validateWorkbenchGraph('layout', graph, '0'.repeat(64)); throw new Error('expected mismatch'); } catch (error) { if ((error.message ?? '') !== 'WORKBENCH_WORKFLOW_DIGEST_MISMATCH') throw error; }
if (validateWorkbenchGraph('actor', graph).outputBindings['2'] !== 'master') throw new Error('single-output default slot mismatch');
const multiOutputGraph = { ...graph, '3': { class_type: 'SaveImage', inputs: {} } };
try { validateWorkbenchGraph('actor', multiOutputGraph); throw new Error('expected explicit output binding requirement'); } catch (error) { if ((error.message ?? '') !== 'WORKBENCH_OUTPUT_BINDINGS_INCOMPLETE') throw error; }
if (validateWorkbenchGraph('actor', multiOutputGraph, undefined, { '2': 'turnaround', '3': 'master' }).outputBindings['2'] !== 'turnaround') throw new Error('explicit saver slot mapping mismatch');
try { validateWorkbenchGraph('actor', multiOutputGraph, undefined, { '2': 'master', '3': 'master' }); throw new Error('expected duplicate slot rejection'); } catch (error) { if ((error.message ?? '') !== 'WORKBENCH_OUTPUT_BINDINGS_INVALID') throw error; }
console.log('workbench catalog smoke: ok');
const runtime = validateWorkbenchRuntimeSchema({ '1': { class_type: 'LoadImage', inputs: { image: 'fixture.png' } }, '2': { class_type: 'SaveImage', inputs: { filename_prefix: 'fixture' } } }, { LoadImage: { input: { required: { image: ['STRING', {}] } } }, SaveImage: { input: { required: { filename_prefix: ['STRING', {}] } } } });
if (runtime.nodes !== 2) throw new Error('runtime node count mismatch');
for (const [candidate, schema, expected] of [
  [{ '1': { class_type: 'LoadImage', inputs: {} } }, { LoadImage: { input: { required: { image: ['STRING', {}] } } } }, 'REQUIRED_INPUT_MISSING'],
  [{ '1': { class_type: 'MissingNode', inputs: {} } }, {}, 'CLASS_MISSING'],
  [{ '1': { class_type: 'LoadImage', inputs: { unexpected: 'x' } } }, { LoadImage: { input: { required: {} } } }, 'INPUT_MISSING'],
]) { try { validateWorkbenchRuntimeSchema(candidate, schema); throw new Error('expected runtime schema rejection'); } catch (error) { if (!error.message.includes(expected)) throw error; } }
console.log('workbench runtime schema smoke: ok');
const linkedGraph = { '1': { class_type: 'Source', inputs: {} }, '2': { class_type: 'Target', inputs: { image: ['1', 0] } } };
const linkedSchema = { Source: { output: ['IMAGE'], input: {} }, Target: { output: [], input: { required: { image: ['IMAGE', {}] } } } };
validateWorkbenchRuntimeSchema(linkedGraph, linkedSchema);
try { validateWorkbenchRuntimeSchema(linkedGraph, { ...linkedSchema, Target: { ...linkedSchema.Target, input: { required: { image: ['STRING', {}] } } } }); throw new Error('expected incompatible socket rejection'); } catch (error) { if (!error.message.includes('LINK_TYPE_MISMATCH')) throw error; }
try { validateWorkbenchRuntimeSchema({ ...linkedGraph, '2': { ...linkedGraph['2'], inputs: { image: ['missing', 0] } } }, linkedSchema); throw new Error('expected missing link source rejection'); } catch (error) { if (!error.message.includes('LINK_INVALID')) throw error; }
console.log('workbench socket link smoke: ok');
const dynamicGraph = {
  '1': { class_type: 'Math', inputs: { expression: 'a + b', 'values.a': ['2', 0] } },
  '2': { class_type: 'NumberSource', inputs: {} },
  '3': { class_type: 'Upscale', inputs: { latent: ['2', 0], mode: 'target dimensions', 'mode.width': 1280, 'mode.height': 720 } },
};
const dynamicSchema = {
  Math: { input: { required: { expression: ['STRING', {}], values: ['COMFY_AUTOGROW_V3', { template: { input: { required: { value: ['FLOAT,INT', {}] } }, names: ['a', 'b'], min: 1 } }] } } },
  NumberSource: { output: ['INT'], input: {} },
  LatentSource: { output: ['LATENT'], input: {} },
  Upscale: { input: { required: { latent: ['LATENT', {}], mode: ['COMFY_DYNAMICCOMBO_V3', { options: [{ key: 'target dimensions', inputs: { required: { width: ['INT', {}], height: ['INT', {}] } } }] }] } } },
};
dynamicGraph['3'].inputs.latent = ['4', 0]; dynamicGraph['4'] = { class_type: 'LatentSource', inputs: {} };
validateWorkbenchRuntimeSchema(dynamicGraph, dynamicSchema);
console.log('workbench dynamic input smoke: ok');
