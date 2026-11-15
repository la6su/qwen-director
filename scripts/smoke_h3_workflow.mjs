import assert from 'node:assert/strict';
import { validateH3Workflow } from '../packages/workflow-adapters/src/h3-workflow.ts';
assert.deepEqual(validateH3Workflow({'7':{class_type:'MiniMaxH3ReferenceToVideo'},'8':{class_type:'RandomNoise'},'9':{class_type:'SaveVideo'}}),{h3NodeId:'7',noiseNodeId:'8',saveNodeId:'9'});
assert.throws(() => validateH3Workflow({'1':{class_type:'MiniMaxH3ImageToVideo'},'2':{class_type:'RandomNoise'},'3':{class_type:'SaveVideo'}}), /H3_I2VA_FIRST_FRAME_BINDING_REQUIRED/);
assert.deepEqual(validateH3Workflow({'1':{class_type:'MiniMaxH3ImageToVideo',inputs:{first_frame:['4',0]}},'2':{class_type:'RandomNoise'},'3':{class_type:'SaveVideo'},'4':{class_type:'LoadImage'}}),{mode:'i2va-i2v',h3NodeId:'1',noiseNodeId:'2',saveNodeId:'3',imageNodeIds:['4']});
assert.deepEqual(validateH3Workflow({'1':{class_type:'MiniMaxH3ImageToVideo',inputs:{first_frame:['4',0],last_frame:['5',0]}},'2':{class_type:'RandomNoise'},'3':{class_type:'SaveVideo'},'4':{class_type:'LoadImage'},'5':{class_type:'LoadImage'}}),{mode:'fl2va-i2v',h3NodeId:'1',noiseNodeId:'2',saveNodeId:'3',imageNodeIds:['4','5']});
assert.throws(() => validateH3Workflow({'1':{class_type:'MiniMaxH3ImageToVideo',inputs:{first_frame:['4',0]}},'2':{class_type:'RandomNoise'},'3':{class_type:'SaveVideo'},'4':{class_type:'EmptyImage'}}), /H3_I2VA_FIRST_FRAME_BINDING_REQUIRED/);
console.log('OK: H3 workflow boundary validation');
