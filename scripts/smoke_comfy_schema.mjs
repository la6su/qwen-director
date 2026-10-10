import assert from 'node:assert/strict';
process.env.QWEN_STORAGE='memory'; process.env.QWEN_API_AUTOSTART='false';
const {app}=await import('../apps/api/src/index.ts'); const old=globalThis.fetch;
try { globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({'MiniMaxH3ReferenceToVideo':{input:{required:{prompt:['STRING',{}]}}},RandomNoise:{},SaveVideo:{},Ignored:{}})}); const response=await app.inject({method:'GET',url:'/v1/runtime/comfy-schema'}); assert.equal(response.statusCode,200); assert.deepEqual(Object.keys(response.json().classes),['MiniMaxH3ReferenceToVideo','RandomNoise','SaveVideo']); console.log('OK: allowlisted ComfyUI H3 schema endpoint'); } finally { globalThis.fetch=old; await app.close(); }
