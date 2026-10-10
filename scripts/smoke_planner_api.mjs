import assert from 'node:assert/strict';
process.env.QWEN_STORAGE='memory'; process.env.QWEN_API_AUTOSTART='false';
const { app } = await import('../apps/api/src/index.ts');
const url = await app.listen({ host:'127.0.0.1', port:0 });
try { const response = await fetch(`${url}/v1/planner/plan`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ prompt:'hero enters', camera:'wide' }) }); const body = await response.json(); assert.equal(response.status,200); assert.equal(body.provenance.source,'local-planner'); assert.match(body.decisionHash,/^[a-f0-9]{64}$/); console.log('OK: planner API decision provenance'); } finally { await app.close(); }
