import assert from 'node:assert/strict';
import { AmbiguousComfySubmitError, ComfyPromptExecutor } from '../packages/workflow-adapters/src/executors.ts';
import { execute } from '../apps/worker/src/executor.ts';

const originalFetch = globalThis.fetch;
const attemptId = 'd5d8b2ce-b7a1-4bdb-890b-12998a66a331';
const context = { jobId:'a3e09e5d-e8f8-4e8e-8b0a-3ccf7aa58e97', attemptId, fencingToken:1, planHash:'test-plan' };
const workflow = { '1': { class_type:'SaveImage', inputs:{} } };

try {
  let submitCount = 0;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/prompt') { submitCount++; throw new Error('socket closed after request body'); }
    if (url.pathname === `/api/jobs/${attemptId}`) return Response.json({ id:attemptId, status:'in_progress' });
    throw new Error(`UNEXPECTED_ROUTE:${url.pathname}`);
  };
  const recovered = await new ComfyPromptExecutor('http://comfy', workflow).submit(context);
  assert.equal(recovered.externalRunId, attemptId);
  assert.equal(submitCount, 1, 'lost response must not resubmit the graph');

  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/prompt') throw new Error('connection reset');
    if (url.pathname === `/api/jobs/${attemptId}`) return Response.json({ error:'not found' }, { status:404 });
    throw new Error(`UNEXPECTED_ROUTE:${url.pathname}`);
  };
  await assert.rejects(
    () => new ComfyPromptExecutor('http://comfy', workflow).submit(context),
    (error) => error instanceof AmbiguousComfySubmitError && error.code === 'EXTERNAL_SUBMIT_UNKNOWN',
  );

  let lookupCount = 0;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/prompt') return new Response('invalid workflow', { status:400 });
    if (url.pathname.startsWith('/api/jobs/')) { lookupCount++; throw new Error('4xx must not perform lookup'); }
    throw new Error(`UNEXPECTED_ROUTE:${url.pathname}`);
  };
  await assert.rejects(() => new ComfyPromptExecutor('http://comfy', workflow).submit(context), /COMFY_SUBMIT_400/);
  assert.equal(lookupCount, 0, 'definitive client errors do not become unknown submits');

  let unknownCount = 0;
  let failedCount = 0;
  await assert.rejects(() => execute(context, {
    async prepare() {},
    async submit() { throw new AmbiguousComfySubmitError(); },
    async poll() { return { state:'running' }; },
    async collect() { return {}; },
  }, {
    async heartbeat() {}, async commit() {},
    async fail() { failedCount++; },
    async unknown() { unknownCount++; },
  }), /COMFY_SUBMIT_OUTCOME_UNKNOWN/);
  assert.equal(unknownCount, 1);
  assert.equal(failedCount, 0, 'ambiguous submit must not be recorded as ordinary failure');

  console.log('OK: ComfyUI submit receipt recovery, unknown fencing path, and definitive 4xx refusal');
} finally {
  globalThis.fetch = originalFetch;
}
