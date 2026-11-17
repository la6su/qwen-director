import './lib/test-database.mjs';
import assert from 'node:assert/strict'; import pg from 'pg';
import { withH3VideoPath } from './lib/h3-workflow-fixture.mjs';
process.env.QWEN_STORAGE='postgres'; process.env.QWEN_API_AUTOSTART='false'; const {app}=await import('../apps/api/src/index.ts'); const pool=new pg.Pool({ connectionString: process.env.DATABASE_URL }); const old=globalThis.fetch;
const objectInfo = {
  MiniMaxH3ReferenceToVideo: { input:{required:{prompt:['STRING',{}]}},output:['CONDITIONING','LATENT'] },
  RandomNoise: { input:{required:{}},output:['NOISE'] },
  SamplerCustomAdvanced: { input:{required:{noise:['NOISE',{}],guider:['GUIDER',{}],latent_image:['LATENT',{}]}},output:['LATENT'] },
  BasicGuider: { input:{required:{conditioning:['CONDITIONING',{}]}},output:['GUIDER'] },
  VAEDecode: { input:{required:{samples:['LATENT',{}]}},output:['IMAGE'] },
  VHS_VideoCombine: { input:{required:{images:['IMAGE',{}]}},output:['VIDEO'] },
  SaveVideo: { input:{required:{video:['VIDEO',{}]}},output:[] },
};
try { globalThis.fetch=async(url)=>{if(String(url).endsWith('/object_info')) return {ok:true,json:async()=>objectInfo}; return {ok:true,status:200};}; const graph=withH3VideoPath({'h':{class_type:'MiniMaxH3ReferenceToVideo',inputs:{prompt:'fixture'}},'n':{class_type:'RandomNoise',inputs:{}},'s':{class_type:'SaveVideo',inputs:{}}},{h3Id:'h',noiseId:'n',saveId:'s'}); const created=await app.inject({method:'POST',url:'/v1/workflow-profiles',payload:{id:'preflight-smoke',name:'Preflight',graph}}); assert.equal(created.statusCode,201); const result=await app.inject({method:'POST',url:'/v1/workflow-profiles/preflight-smoke/preflight'}); assert.equal(result.statusCode,200); assert.equal(result.json().boundary.h3NodeId,'h'); console.log('OK: saved H3 profile PVE preflight'); } finally {globalThis.fetch=old; await pool.query("delete from workflow_profiles where id='preflight-smoke'"); await pool.end(); await app.close();}
