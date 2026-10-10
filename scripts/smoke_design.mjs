import assert from 'node:assert/strict';
import { importDesign } from '../packages/contracts/src/design-importer.ts';
const d = importDesign({schemaVersion:'1.0',project:{id:'p',title:'Demo'},scenes:[{id:'s',title:'Scene',shots:[{id:'sh',title:'Opening',startSeconds:0,durationSeconds:5,referenceAssetVersionIds:[]}]}],futureField:{preserve:true}});
assert.equal(d.sourceMetadata.futureField.preserve,true);
assert.throws(()=>importDesign({schemaVersion:'1.0',project:{id:'p',title:'x'},scenes:[{id:'s',title:'s',shots:[{id:'a',title:'a',startSeconds:2,durationSeconds:1,referenceAssetVersionIds:[]},{id:'b',title:'b',startSeconds:1,durationSeconds:1,referenceAssetVersionIds:[]}]}]}));
console.log('OK: Design JSON validation and unknown-field preservation');
