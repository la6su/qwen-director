import assert from 'node:assert/strict';
process.env.QWEN_STORAGE='memory'; process.env.QWEN_API_AUTOSTART='false';
const { app } = await import('../apps/api/src/index.ts');
const old = globalThis.fetch;
try {
  globalThis.fetch = async (url) => ({ ok: String(url).includes('127.0.0.1'), status: String(url).includes('127.0.0.1') ? 200 : 503 });
  const plannerDown = await app.inject({ method:'GET', url:'/ready' });
  assert.equal(plannerDown.statusCode, 200); assert.equal(plannerDown.json().status, 'ready'); assert.equal(plannerDown.json().degraded, true); assert.equal(plannerDown.json().checks.find((check) => check.id === 'llama.cpp').required, false);
  globalThis.fetch = async () => ({ ok:false, status:503 });
  const comfyDown = await app.inject({ method:'GET', url:'/ready' });
  assert.equal(comfyDown.statusCode, 503); assert.equal(comfyDown.json().status, 'not_ready');
  console.log('OK: core generation readiness ignores optional planner but fails closed for ComfyUI');
} finally { globalThis.fetch=old; await app.close(); }
