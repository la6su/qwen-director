import assert from 'node:assert/strict';
process.env.QWEN_STORAGE = 'memory'; process.env.QWEN_API_AUTOSTART = 'false'; process.env.COMFYUI_URL = 'http://comfy.test';
const { app } = await import('../apps/api/src/index.ts');
const original = globalThis.fetch;
try {
  globalThis.fetch = async (url) => {
    assert.equal(String(url), 'http://comfy.test/object_info');
    return { ok: true, status: 200, json: async () => ({
      VideoSource: { output: ['VIDEO'], output_node: false, input_order: { required: ['filename'] }, input: { required: { filename: ['STRING', {}] } } },
      SaveVideo: { output: [], output_node: true, input_order: { required: ['video'] }, input: { required: { video: ['VIDEO', {}] } } },
    }) };
  };
  const response = await app.inject({ method: 'POST', url: '/v1/workflows/convert', payload: { workflow: {
    nodes: [
      { id: 1, type: 'VideoSource', inputs: [{ name: 'filename', widget: { name: 'filename' }, link: null }], outputs: [{ type: 'VIDEO' }], widgets_values: { filename: 'fixture.mp4' } },
      { id: 2, type: 'SaveVideo', inputs: [{ name: 'video', link: 1 }], outputs: [], widgets_values: [] },
    ],
    links: [[1, 1, 0, 2, 0, 'VIDEO']],
  } } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().graph['2'].inputs.video, ['1', 0]);
  assert.deepEqual(response.json().classes, ['VideoSource', 'SaveVideo']);
  console.log('OK: API workflow conversion endpoint uses runtime schema and prunes disconnected nodes');
} finally { globalThis.fetch = original; await app.close(); }
