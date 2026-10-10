import assert from 'node:assert/strict';
import { validateH3Workflow } from '../packages/workflow-adapters/src/h3-workflow.ts';
assert.deepEqual(validateH3Workflow({'7':{class_type:'MiniMaxH3ReferenceToVideo'},'8':{class_type:'RandomNoise'},'9':{class_type:'SaveVideo'}}),{h3NodeId:'7',noiseNodeId:'8',saveNodeId:'9'});
assert.throws(() => validateH3Workflow({'1':{class_type:'MiniMaxH3ImageToVideo'},'2':{class_type:'RandomNoise'},'3':{class_type:'SaveVideo'}}), /H3_WORKFLOW_REQUIRES_ONE_H3_NODE/);
console.log('OK: H3 workflow boundary validation');
