import assert from 'node:assert/strict';
import { WorkerLoop } from '../apps/worker/src/loop.ts';
const old=globalThis.fetch; try { let seen; globalThis.fetch=async (_url,init)=>{seen=init; return {status:204,ok:true};}; const loop=new WorkerLoop({apiBaseUrl:'http://api',nodeId:'node',apiToken:'secret'}); await loop.runOnce(); assert.equal(seen.headers.authorization,'Bearer secret'); console.log('OK: worker claim bearer authentication'); } finally { globalThis.fetch=old; }
