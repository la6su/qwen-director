import { InMemoryAttemptRepository } from '../apps/api/src/repository.ts';
const r = new InMemoryAttemptRepository();
const a = r.claim('job-1');
r.heartbeat(a.id, a.fencingToken, 1);
try { r.commit(a.id, a.fencingToken - 1); throw new Error('stale token accepted'); } catch (e) { if (e.message !== 'FENCING_REJECTED') throw e; }
try { r.heartbeat(a.id, a.fencingToken, 1); throw new Error('stale heartbeat accepted'); } catch (e) { if (e.message !== 'STALE_HEARTBEAT') throw e; }
r.commit(a.id, a.fencingToken);
console.log('OK: repository fencing, monotonic heartbeat and single commit');
