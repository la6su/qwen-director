import assert from 'node:assert/strict';
process.env.QWEN_STORAGE='memory'; process.env.QWEN_API_AUTOSTART='false';
const { app } = await import('../apps/api/src/index.ts');
const old = globalThis.fetch;
try {
  globalThis.fetch = async (url) => ({ ok: String(url).includes('192.168.10.103'), status: String(url).includes('192.168.10.103') ? 200 : 503 });
  const response = await app.inject({ method:'GET', url:'/ready' });
  assert.equal(response.statusCode, 503); assert.equal(response.json().status, 'not_ready');
  console.log('OK: readiness fails closed when backend is unavailable');
} finally { globalThis.fetch=old; await app.close(); }
