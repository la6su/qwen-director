import assert from 'node:assert/strict';
import { ComfyPromptExecutor } from '../packages/workflow-adapters/src/executors.ts';
const original = globalThis.fetch; let calls = [];
try { globalThis.fetch = async (url) => { calls.push(String(url)); if (String(url).includes('/history/')) return {ok:true,json:async()=>({'run-1':{outputs:{'8':{images:[{filename:'intermediate.png',subfolder:'',type:'output'}]},'9':{images:[{filename:'h3 final.mp4',subfolder:'',type:'output'}]}}}})}; return {ok:true,arrayBuffer:async()=>new TextEncoder().encode('video-bytes').buffer}; };
  const result = await new ComfyPromptExecutor('http://pve-comfy',{'9':{class_type:'SaveVideo'}}).collect({externalRunId:'run-1'}); assert.equal(result.outputs.length,1); assert.equal(result.outputs[0].mimeType,'video/mp4'); assert.match(result.outputs[0].logicalName,/h3_final/); assert.equal(calls.length,2); console.log('OK: ComfyUI history output download contract');
} finally { globalThis.fetch = original; }
