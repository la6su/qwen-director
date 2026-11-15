import assert from 'node:assert/strict';
import pg from 'pg';

process.env.QWEN_STORAGE = 'postgres';
process.env.DATABASE_URL ??= 'postgresql:///qwendirector';
process.env.QWEN_API_AUTOSTART = 'false';
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const graph = {
  h: { class_type: 'MiniMaxH3ReferenceToVideo', inputs: {} },
  n: { class_type: 'RandomNoise', inputs: {} },
  s: { class_type: 'SaveVideo', inputs: {} },
  u: { class_type: 'UNETLoader', inputs: { unet_name: 'minimax_h3_ref2va_pruned_int8_convrot.safetensors' } },
  l: { class_type: 'LoraLoaderModelOnly', inputs: { lora_name: 'pika_h3_flex_ref2va_v1_bf16.safetensors' } },
};

try {
  const create = await app.inject({ method: 'POST', url: '/v1/workflow-profiles', payload: { id: 'smoke-h3', name: 'Smoke H3', graph } });
  assert.equal(create.statusCode, 201, create.body);
  assert.equal(create.json().active, false);
  assert.deepEqual(create.json().model_stack, [
    { role: 'diffusion', nodeClass: 'UNETLoader', name: 'minimax_h3_ref2va_pruned_int8_convrot.safetensors' },
    { role: 'lora', nodeClass: 'LoraLoaderModelOnly', name: 'pika_h3_flex_ref2va_v1_bf16.safetensors' },
  ]);
  const get = await app.inject({ method: 'GET', url: '/v1/workflow-profiles/smoke-h3' });
  assert.equal(get.statusCode, 200, get.body);
  assert.deepEqual(get.json().model_stack, create.json().model_stack);
  const list = await app.inject({ method: 'GET', url: '/v1/workflow-profiles' });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().profiles.every((profile) => profile.id !== 'smoke-h3'), true);
  console.log('OK: workflow profile API exposes graph-derived diffusion and LoRA model stack');
} finally {
  await pool.query("delete from workflow_profiles where id='smoke-h3'");
  await pool.end();
  await app.close();
}
