import assert from 'node:assert/strict';
process.env.QWEN_STORAGE='memory'; process.env.QWEN_API_AUTOSTART='false'; process.env.QWEN_API_TOKEN='local-test-token';
const { app } = await import('../apps/api/src/index.ts');
try {
  assert.equal((await app.inject({method:'GET',url:'/v1/projects'})).statusCode,401);
  assert.equal((await app.inject({method:'GET',url:'/health'})).statusCode,200);
  assert.equal((await app.inject({method:'GET',url:'/v1/runtime',headers:{authorization:'Bearer local-test-token'}})).statusCode,200);
  console.log('OK: optional API bearer authentication');
} finally { await app.close(); }
