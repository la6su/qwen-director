import assert from 'node:assert/strict';

process.env.QWEN_STORAGE = 'memory';
process.env.QWEN_API_AUTOSTART = 'false';
process.env.QWEN_LLAMA_URL = 'http://local-llm.test';
const originalFetch = globalThis.fetch;
let mode = 'success';
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).endsWith('/v1/models')) return new Response(JSON.stringify({ data: mode === 'no-model' ? [] : [{ id: 'qwen-local' }] }), { status: 200 });
  if (String(url).endsWith('/v1/chat/completions')) {
    if (mode === 'invalid-json') return new Response(JSON.stringify({ model: 'qwen-local', choices: [{ message: { content: '{"prompt":"only a prompt"}' } }] }), { status: 200 });
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'qwen-local');
    const latest = JSON.parse(body.messages.at(-1).content);
    assert.equal(latest.brief.prompt, 'A room reveal');
    assert.ok(['Составь shot plan по текущему брифу.','Опусти камеру ниже.'].includes(latest.request));
    return new Response(JSON.stringify({ model: 'qwen-local', choices: [{ message: { content: JSON.stringify({ prompt: 'A quiet room reveal.', camera: 'Slow locked dolly.', action: 'The curtains move gently.', composition: 'Wide symmetrical frame.', lighting: 'Soft morning light.', sound: 'Room tone.', music: 'N/A', transition: 'Fade in.' }) } }] }), { status: 200 });
  }
  throw new Error('unexpected planner URL');
};
const { app } = await import('../apps/api/src/index.ts');
const { planBriefWithLocalModel } = await import('../apps/api/src/local-planner.ts');
try {
  const response = await app.inject({ method: 'POST', url: '/v1/planner/assist', payload: { prompt: 'A room reveal', message:'Опусти камеру ниже.' } });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().provenance.source, 'llama.cpp');
  assert.equal(response.json().provenance.model, 'qwen-local');
  assert.equal(JSON.parse(JSON.parse(calls[1].init.body).messages.at(-1).content).request, 'Опусти камеру ниже.');
  assert.match(response.json().decisionHash, /^[a-f0-9]{64}$/);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.url.startsWith('http://local-llm.test/')));
  const memoryOnly = await app.inject({ method:'POST', url:'/v1/planner/sessions', payload:{} });
  assert.equal(memoryOnly.statusCode, 501);
  assert.equal(memoryOnly.json().code, 'DIRECTOR_SESSION_STORAGE_REQUIRED');
  await planBriefWithLocalModel({ prompt:'A room reveal' }, undefined, { project:{name:'Test set'}, workflows:[{id:'pika'}], history:[{role:'assistant',content:'Use the existing scene'}] });
  const requestBody = JSON.parse(calls.at(-1).init.body);
  assert.ok(requestBody.messages.some((message) => message.content.includes('Test set')));
  assert.ok(requestBody.messages.some((message) => message.content === 'Use the existing scene'));
  mode = 'invalid-json';
  const invalid = await app.inject({ method: 'POST', url: '/v1/planner/assist', payload: { prompt: 'A room reveal' } });
  assert.equal(invalid.statusCode, 502);
  assert.equal(invalid.json().code, 'PLANNER_OUTPUT_INVALID');
  mode = 'no-model';
  const unavailable = await app.inject({ method: 'POST', url: '/v1/planner/assist', payload: { prompt: 'A room reveal' } });
  assert.equal(unavailable.statusCode, 503);
  assert.equal(unavailable.json().code, 'PLANNER_LOCAL_MODEL_UNAVAILABLE');
  console.log('OK: local llama planner returns bounded typed proposals and rejects invalid/unavailable output');
} finally {
  globalThis.fetch = originalFetch;
  await app.close();
}
