import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

process.env.QWEN_STORAGE = 'postgres';
process.env.DATABASE_URL = 'postgresql:///qwendirector';
process.env.QWEN_API_AUTOSTART = 'false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ host: '/var/run/postgresql', database: 'qwendirector' });
const nodeId = randomUUID();
const oldFetch = globalThis.fetch;
try {
  await pool.query("insert into nodes(id,instance_id,capabilities,status,heartbeat_at) values($1,'runtime-smoke',$2,'online',now())", [nodeId, { h3: true }]);
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ MiniMaxH3ReferenceToVideo: {}, RandomNoise: {}, SaveVideo: {} }) });
  const response = await app.inject({ method: 'GET', url: '/v1/runtime' });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.ok(Array.isArray(body.nodes));
  assert.deepEqual(body.nodes.find((node) => node.id === nodeId).capabilities, { h3: true });
  assert.equal(body.nodes[0].id, nodeId, 'online nodes must precede stale nodes');
  console.log('OK: unified runtime snapshot includes PostgreSQL node health');
} finally {
  globalThis.fetch = oldFetch;
  await pool.query('delete from nodes where id=$1', [nodeId]);
  await pool.end();
  await app.close();
}
