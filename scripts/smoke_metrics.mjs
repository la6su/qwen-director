import assert from 'node:assert/strict';
process.env.QWEN_STORAGE='memory'; process.env.QWEN_API_AUTOSTART='false';
const { app } = await import('../apps/api/src/index.ts');
try { const response=await app.inject({method:'GET',url:'/metrics'}); assert.equal(response.statusCode,200); assert.match(response.headers['content-type'],/text\/plain/); assert.match(response.body,/qwendirector_http_requests_total \d+/); assert.match(response.body,/qwendirector_http_errors_total \d+/); console.log('OK: Prometheus metrics endpoint'); } finally { await app.close(); }
