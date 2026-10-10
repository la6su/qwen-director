import { app } from '../apps/api/src/index.ts';

const request = (method, url, payload) => app.inject({ method, url, payload });
let r = await request('GET', '/health');
if (r.statusCode !== 200) throw new Error('health failed');
const payload = { shotId: 'shot-1', planHash: 'plan-a', idempotencyKey: 'k1', requestHash: 'req-a' };
r = await request('POST', '/v1/jobs', payload);
if (r.statusCode !== 201 || r.json().state !== 'awaiting_approval') throw new Error('create failed');
const id = r.json().jobId;
r = await request('POST', '/v1/jobs', payload);
if (r.statusCode !== 200 || !r.json().replayed) throw new Error('idempotency failed');
r = await request('POST', '/v1/jobs', { ...payload, requestHash: 'req-b' });
if (r.statusCode !== 409) throw new Error('conflict failed');
r = await request('POST', `/v1/jobs/${id}/approve`, { planHash: 'plan-a', actor: 'smoke' });
if (r.statusCode !== 200 || r.json().state !== 'queued') throw new Error('approval failed');
r = await request('POST', `/v1/jobs/${id}/cancel`);
if (r.statusCode !== 200 || r.json().state !== 'cancelled') throw new Error('cancel failed');
await app.close();
console.log('OK: API lifecycle create → idempotent replay → conflict → approve → cancel');
