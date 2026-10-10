import assert from 'node:assert/strict';
const base = process.env.QWEN_API_BASE_URL ?? 'http://127.0.0.1:4310';
const total = Number(process.env.QWEN_LOAD_REQUESTS ?? 100);
assert(Number.isSafeInteger(total) && total > 0 && total <= 1000);
const started = performance.now();
const responses = await Promise.all(Array.from({ length: total }, (_, index) => fetch(`${base}${index % 2 ? '/health' : '/ready'}`)));
const elapsed = performance.now() - started;
assert(responses.every((response) => response.ok), `non-2xx response: ${responses.find((response) => !response.ok)?.status}`);
console.log(`OK: API load smoke ${total} requests in ${Math.round(elapsed)} ms (${Math.round(total / (elapsed / 1000))} req/s)`);
