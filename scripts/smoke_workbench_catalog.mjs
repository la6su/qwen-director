import { bindWorkbenchImages, digestWorkflow, prepareWorkbenchGraph, resolveWorkbenchImageBindings, validateWorkbenchGraph, validateWorkbenchRuntimeSchema, WORKBENCH_WORKFLOW_SPECS } from '@qwendirector/workflow-adapters/workbench-catalog';
const graph = {
  '1': { class_type: 'LoadImage', inputs: {} },
  '2': { class_type: 'VAELoader', inputs: {} },
  '3': { class_type: 'VAEEncode', inputs: { pixels: ['1', 0], vae: ['2', 0] } },
  '4': { class_type: 'KSampler', inputs: { latent_image: ['3', 0] } },
  '5': { class_type: 'VAEDecode', inputs: { samples: ['4', 0], vae: ['2', 0] } },
  '6': { class_type: 'SaveImage', inputs: { images: ['5', 0] } },
};
const digest = digestWorkflow(graph);
for (const kind of ['actor','scene','prop','layout']) {
  const result = validateWorkbenchGraph(kind, graph, digest);
  if (result.digest !== digest) throw new Error('digest mismatch');
}
try { validateWorkbenchGraph('layout', graph, '0'.repeat(64)); throw new Error('expected mismatch'); } catch (error) { if ((error.message ?? '') !== 'WORKBENCH_WORKFLOW_DIGEST_MISMATCH') throw error; }
if (validateWorkbenchGraph('actor', graph).outputBindings['6'] !== 'master') throw new Error('single-output default slot mismatch');
const multiImageGraph = {
  '1': { class_type:'LoadImage', inputs:{} }, '2': { class_type:'LoadImage', inputs:{} },
  '3': { class_type:'VAELoader', inputs:{} },
  '4': { class_type:'VAEEncode', inputs:{ pixels:['1',0], vae:['3',0] } },
  '5': { class_type:'KSampler', inputs:{ latent_image:['4',0] } },
  '6': { class_type:'VAEDecode', inputs:{ samples:['5',0], vae:['3',0] } },
  '7': { class_type:'SaveImage', inputs:{ images:['6',0] } },
};
if (validateWorkbenchGraph('actor', multiImageGraph, undefined, { '7':'master' }, ['2','1']).imageNodeIds.join(',') !== '2,1') throw new Error('explicit image input order must be preserved');
const boundGraph = structuredClone(multiImageGraph);
bindWorkbenchImages(boundGraph, ['2','1'], [{ name:'ref.png', subfolder:'attempt/a' }, { name:'base.png', subfolder:'attempt/b' }]);
if (boundGraph['2'].inputs.image !== 'attempt/a/ref.png' || boundGraph['1'].inputs.image !== 'attempt/b/base.png') throw new Error('ordered image bindings must reach their exact LoadImage nodes');
for (const images of [[{ name:'only.png' }], [{ name:'a.png' },{ name:'b.png' },{ name:'extra.png' }]]) {
  try { bindWorkbenchImages(structuredClone(multiImageGraph), ['2','1'], images); throw new Error('expected exact image reference count rejection'); }
  catch (error) { if ((error.message ?? '') !== 'WORKBENCH_IMAGE_REFERENCE_COUNT_MISMATCH') throw error; }
}
for (const invalid of [['1','1'], ['1'], ['1','missing']]) {
  try { resolveWorkbenchImageBindings('actor', multiImageGraph, invalid); throw new Error('expected invalid image bindings rejection'); }
  catch (error) { if ((error.message ?? '') !== 'WORKBENCH_IMAGE_BINDINGS_INVALID') throw error; }
}
const multiOutputGraph = { ...graph, '3': { class_type: 'SaveImage', inputs: { images: ['5', 0] } } };
try { validateWorkbenchGraph('actor', multiOutputGraph); throw new Error('expected explicit output binding requirement'); } catch (error) { if ((error.message ?? '') !== 'WORKBENCH_OUTPUT_BINDINGS_INCOMPLETE') throw error; }
if (validateWorkbenchGraph('actor', multiOutputGraph, undefined, { '6': 'turnaround', '3': 'master' }).outputBindings['6'] !== 'turnaround') throw new Error('explicit saver slot mapping mismatch');
try { validateWorkbenchGraph('actor', multiOutputGraph, undefined, { '6': 'master', '3': 'master' }); throw new Error('expected duplicate slot rejection'); } catch (error) { if ((error.message ?? '') !== 'WORKBENCH_OUTPUT_BINDINGS_INVALID') throw error; }
console.log('workbench catalog smoke: ok');
const imageEditGraph = {
  '1': { class_type:'LoadImage', inputs:{ image:'base.png' } },
  '2': { class_type:'TextEncodeQwenImage21', inputs:{ resolution:0, 'images.image_1':['1',0] } },
  '3': { class_type:'EmptyLatentImage', inputs:{ width:1659, height:948, batch_size:1 } },
  '4': { class_type:'ComfySwitchNode', inputs:{ switch:true, on_true:['3',0], on_false:['2',2] } },
  '5': { class_type:'KSampler', inputs:{ latent_image:['4',0] } },
  '6': { class_type:'SaveImageAdvanced', inputs:{ images:['5',0] } },
};
const preparedImageEdit = prepareWorkbenchGraph('image-edit', imageEditGraph);
if (preparedImageEdit['4'].inputs.switch !== false || imageEditGraph['4'].inputs.switch !== true) throw new Error('image edit must select an immutable copy of the reference latent branch');
validateWorkbenchGraph('image-edit', preparedImageEdit);
const reorderedImageEditGraph = {
  '1': { class_type:'LoadImage', inputs:{ image:'second.png' } },
  '2': { class_type:'LoadImage', inputs:{ image:'first.png' } },
  '3': { class_type:'TextEncodeQwenImage21', inputs:{ resolution:1024, 'images.image_1':['2',0], 'images.image_2':['1',0] } },
  '4': { class_type:'KSampler', inputs:{ latent_image:['3',2] } },
  '5': { class_type:'SaveImageAdvanced', inputs:{ images:['4',0] } },
};
if (validateWorkbenchGraph('image-edit', reorderedImageEditGraph).imageNodeIds.join(',') !== '2,1') throw new Error('Qwen bindings must follow encoder image_N order, not node ID order');
try { validateWorkbenchGraph('image-edit', reorderedImageEditGraph, undefined, undefined, ['1','2']); throw new Error('expected semantic image slot order rejection'); }
catch (error) { if ((error.message ?? '') !== 'WORKBENCH_IMAGE_BINDINGS_ORDER_MISMATCH') throw error; }
const unusedEnhancerGraph = structuredClone(reorderedImageEditGraph);
unusedEnhancerGraph['3'].inputs.prompt = 'direct image-edit instruction';
unusedEnhancerGraph['6'] = { class_type:'TextGenerate', inputs:{ prompt:'unused helper' } };
validateWorkbenchGraph('image-edit', unusedEnhancerGraph);
const mismatchedEnhancerGraph = structuredClone(reorderedImageEditGraph);
mismatchedEnhancerGraph['3'].inputs.prompt = ['7',0];
mismatchedEnhancerGraph['6'] = { class_type:'BatchImagesNode', inputs:{ 'images.image0':['2',0] } };
mismatchedEnhancerGraph['7'] = { class_type:'TextGenerate', inputs:{ image:['6',0], prompt:'describe references' } };
try { validateWorkbenchGraph('image-edit', mismatchedEnhancerGraph); throw new Error('expected connected prompt enhancer reference mismatch'); }
catch (error) { if ((error.message ?? '') !== 'IMAGE_EDIT_PROMPT_ENHANCER_REFERENCES_MISMATCH') throw error; }
console.log('workbench Qwen edit branch smoke: ok');
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
