import assert from 'node:assert/strict';
import { extractComfyApiGraph, convertComfyUiWorkflowToApi } from '../apps/web/src/workflow-import.ts';
import { validateComfyApiWorkflowSchema } from '../packages/workflow-adapters/src/comfy-schema.ts';
const graph = { '1': { class_type: 'SaveVideo', inputs: {} } };
assert.deepEqual(extractComfyApiGraph(graph), graph);
assert.deepEqual(extractComfyApiGraph({ schema: 'qd-artifact-v1', graph }), graph);
assert.throws(() => extractComfyApiGraph({ nodes: [], links: [] }), /WORKFLOW_UI_FORMAT_UNSUPPORTED/);
assert.throws(() => extractComfyApiGraph({}), /WORKFLOW_GRAPH_EMPTY/);
const converted = convertComfyUiWorkflowToApi({ nodes: [
  { id: 1, type: 'ImageSource', inputs: [{ name: 'image', widget: { name: 'image' }, link: null }], outputs: [{ type: 'IMAGE' }], widgets_values: ['ref.png'] },
  { id: 2, type: 'VideoEncoder', inputs: [{ name: 'image', link: 10 }, { name: 'fps', widget: { name: 'fps' }, link: null }], outputs: [], widgets_values: [24] },
], links: [[10, 1, 0, 2, 0, 'IMAGE']] }, {
  ImageSource: { input_order: { required: ['image'] }, input: { required: { image: ['STRING', {}] } }, output: ['IMAGE'] },
  VideoEncoder: { output_node: true, input_order: { required: ['image', 'fps'] }, input: { required: { image: ['IMAGE', {}], fps: ['INT', {}] } }, output: [] },
});
assert.deepEqual(converted['2'].inputs, { image: ['1', 0], fps: 24 });
const named = convertComfyUiWorkflowToApi({ nodes: [
  { id: 7, type: 'Director', inputs: [{ name: 'frame_rate', widget: { name: 'frame_rate' } }, { name: 'timeline_data', widget: { name: 'timeline_data' } }], outputs: [], widgets_values: ['randomize', 1210], properties: { widgets_values_named: { frame_rate: 24, timeline_data: '{"segments":[]}' } } },
], links: [] }, {
  Director: { output_node: true, input_order: { required: ['frame_rate', 'timeline_data'] }, input: { required: { frame_rate: ['INT', {}], timeline_data: ['STRING', {}] } } },
});
assert.deepEqual(named['7'].inputs, { frame_rate: 24, timeline_data: '{"segments":[]}' });
assert.throws(() => convertComfyUiWorkflowToApi({ nodes: [{ id: 1, type: 'Unknown', inputs: [] }], links: [] }, {}), /WORKFLOW_NODE_CLASS_UNKNOWN/);
const valueSchema = { TypedNode: { output: [], input: { required: { label:['STRING',{}], count:['INT',{}], speed:['FLOAT',{}], enabled:['BOOLEAN',{}], mode:['fast','quality'] } } } };
assert.throws(() => validateComfyApiWorkflowSchema({ '1':{class_type:'TypedNode',inputs:{label:'ok',count:'24',speed:1,enabled:true,mode:'fast'} } }, valueSchema), /INPUT_VALUE_TYPE_INVALID:count:INT/);
assert.throws(() => validateComfyApiWorkflowSchema({ '1':{class_type:'TypedNode',inputs:{label:'ok',count:24,speed:1,enabled:true,mode:'randomize'} } }, valueSchema), /INPUT_VALUE_OPTION_INVALID:mode/);
const aliases = convertComfyUiWorkflowToApi({ nodes: [
  { id: 1, type: 'PromptSource', inputs: [{ name: 'value', widget: { name: 'value' } }], outputs: [{ type: 'STRING' }], widgets_values: { value: 'fixture' } },
  { id: 2, type: 'SetNode', inputs: [{ name: 'STRING', link: 20 }], widgets_values: ['prompt'] },
  { id: 3, type: 'GetNode', inputs: [], outputs: [{ type: 'STRING', links: [21] }], widgets_values: ['prompt'] },
  { id: 4, type: 'TextConsumer', inputs: [{ name: 'text', link: 21 }], outputs: [] },
  { id: 5, type: 'UnusedBrokenNode', inputs: [], outputs: [] },
], links: [[20, 1, 0, 2, 0, 'STRING'], [21, 3, 0, 4, 0, 'STRING']] }, {
  PromptSource: { output: ['STRING'], input_order: { required: ['value'] }, input: { required: { value: ['STRING', {}] } } },
  TextConsumer: { output_node: true, output: [], input_order: { required: ['text'] }, input: { required: { text: ['STRING', {}] } } },
  UnusedBrokenNode: { output: [], input: { required: { missing: ['STRING', {}] } } },
});
assert.equal(aliases['4'].inputs.text[0], '1');
assert.equal(Object.hasOwn(aliases, '2'), false);
assert.equal(Object.hasOwn(aliases, '3'), false);
assert.equal(Object.hasOwn(aliases, '5'), false);
const withoutViewer = convertComfyUiWorkflowToApi({ nodes: [
  { id: 10, type:'SourceImage', inputs:[{name:'image',widget:{name:'image'},link:null}], outputs:[{type:'IMAGE'}], widgets_values:['base.png'] },
  { id: 11, type:'ImageCompare', inputs:[{name:'image_a',link:30},{name:'compare_view',widget:{name:'compare_view'},link:null}], outputs:[], widgets_values:[], mode:0 },
  { id: 12, type:'ImageSaver', inputs:[{name:'images',link:31}], outputs:[] },
], links:[[30,10,0,11,0,'IMAGE'],[31,10,0,12,0,'IMAGE']] }, {
  SourceImage:{output:['IMAGE'],input_order:{required:['image']},input:{required:{image:['STRING',{}]}}},
  ImageCompare:{output_node:true,output:['IMAGE'],input:{required:{image_a:['IMAGE',{}],compare_view:['IMAGECOMPARE',{}]}}},
  ImageSaver:{output_node:true,output:[],input:{required:{images:['IMAGE',{}]}}},
});
assert.equal(Object.values(withoutViewer).some((node) => node.class_type === 'ImageCompare'), false);
console.log('OK: ComfyUI API workflow and QD artifact import normalization');
