import assert from 'node:assert/strict';
const config = (await import('../apps/web/vite.config.ts')).default;
for (const key of ['/v1', '/health', '/ready', '/metrics']) {
  assert.equal(typeof config.server.proxy[key], 'string');
  assert.equal(typeof config.preview.proxy[key], 'string');
}
console.log('OK: web dev/preview API proxy routes configured');
