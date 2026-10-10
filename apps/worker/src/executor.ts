export type AttemptContext = { jobId: string; attemptId: string; fencingToken: number; planHash: string; plan?: Record<string, unknown> };
export type Receipt = { externalRunId: string; [key: string]: unknown };
export type PollResult = { state: 'running'|'succeeded'|'failed'; progress?: number; error?: string };
export interface ExecutionAdapter { prepare(ctx: AttemptContext): Promise<void>; submit(ctx: AttemptContext): Promise<Receipt>; poll(receipt: Receipt, signal?: AbortSignal): Promise<PollResult>; collect(receipt: Receipt): Promise<unknown>; cancel?(receipt: Receipt): Promise<void>; }
export interface ExecutionHooks { heartbeat(ctx: AttemptContext, sequence: number): Promise<void>; commit(ctx: AttemptContext, output: unknown): Promise<void>; fail(ctx: AttemptContext, error: unknown): Promise<void>; }

export async function execute(ctx: AttemptContext, adapter: ExecutionAdapter, hooks: ExecutionHooks, signal?: AbortSignal): Promise<void> {
  let receipt: Receipt | undefined;
  try {
    await adapter.prepare(ctx);
    receipt = await adapter.submit(ctx);
    let sequence = 0;
    while (true) {
      if (signal?.aborted) throw new Error('CANCELLED');
      await hooks.heartbeat(ctx, ++sequence);
      const status = await adapter.poll(receipt, signal);
      if (status.state === 'failed') throw new Error(status.error || 'BACKEND_FAILED');
      if (status.state === 'succeeded') { const output = await adapter.collect(receipt); await hooks.commit(ctx, output); return; }
    }
  } catch (error) { if ((error as Error).message === 'CANCELLED' && receipt && adapter.cancel) await adapter.cancel(receipt).catch(() => undefined); await hooks.fail(ctx, error); throw error; }
}
