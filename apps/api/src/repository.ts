export type Attempt = { id: string; jobId: string; fencingToken: number; heartbeatSeq: number; state: 'leased'|'running'|'succeeded'|'failed'|'cancelled' };

export class InMemoryAttemptRepository {
  async ready() { return true; }
  private attempts = new Map<string, Attempt>();
  claim(jobId: string, _nodeId = 'local'): Attempt {
    const active = [...this.attempts.values()].find(a => a.jobId === jobId && ['leased', 'running'].includes(a.state));
    if (active) throw new Error('RESOURCE_BUSY');
    const token = Math.max(0, ...[...this.attempts.values()].filter(a => a.jobId === jobId).map(a => a.fencingToken)) + 1;
    const attempt = { id: `${jobId}-attempt-${token}`, jobId, fencingToken: token, heartbeatSeq: 0, state: 'leased' as const };
    this.attempts.set(attempt.id, attempt); return attempt;
  }
  heartbeat(id: string, token: number, sequence: number): Attempt { const a = this.require(id, token); if (sequence <= a.heartbeatSeq) throw new Error('STALE_HEARTBEAT'); a.heartbeatSeq = sequence; a.state = 'running'; return a; }
  commit(id: string, token: number, _manifest?: unknown): Attempt { const a = this.require(id, token); if (a.state === 'cancelled' || a.state === 'succeeded') throw new Error('INVALID_STATE'); a.state = 'succeeded'; return a; }
  cancel(id: string, token: number): Attempt { const a = this.require(id, token); if (a.state === 'succeeded') throw new Error('INVALID_STATE'); a.state = 'cancelled'; return a; }
  private require(id: string, token: number): Attempt { const a = this.attempts.get(id); if (!a || a.fencingToken !== token) throw new Error('FENCING_REJECTED'); return a; }
}
