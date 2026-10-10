export interface WorkerConfig { apiBaseUrl: string; nodeId: string; pollMs?: number; apiToken?: string; }
export type ClaimedJob = { jobId: string; attemptId: string; fencingToken: number; planHash: string; adapterId?: string; plan?: Record<string, unknown>; requiredCapabilities?: Record<string, unknown> };
export type Executor = (job: ClaimedJob) => Promise<void>;

export class WorkerLoop {
  private stopped = false;
  constructor(private readonly config: WorkerConfig, private readonly executor?: Executor) {}
  stop(): void { this.stopped = true; }
  async runOnce(): Promise<'idle' | 'claimed'> {
    if (this.stopped) return 'idle';
    const headers: Record<string,string> = { 'content-type':'application/json' }; if (this.config.apiToken) headers.authorization=`Bearer ${this.config.apiToken}`;
    const response = await fetch(`${this.config.apiBaseUrl}/v1/worker/claim`, { method: 'POST', headers, body: JSON.stringify({ nodeId: this.config.nodeId }) });
    if (response.status === 204 || response.status === 404) return 'idle';
    if (!response.ok) throw new Error(`CLAIM_FAILED_${response.status}`);
    const job = await response.json() as ClaimedJob;
    if (this.executor) await this.executor(job);
    return 'claimed';
  }

  async run(signal?: AbortSignal): Promise<void> {
    while (!this.stopped && !signal?.aborted) {
      try {
        await this.runOnce();
      } catch (error) {
        // The API may restart independently; keep the worker alive and retry.
        if (this.stopped || signal?.aborted) break;
        console.error(`[worker] claim failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (!this.stopped && !signal?.aborted) await new Promise((resolve) => setTimeout(resolve, this.config.pollMs ?? 1000));
    }
  }
}
