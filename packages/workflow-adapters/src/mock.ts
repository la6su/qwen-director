import type { ExecutionPlan, GenerationSpec, OutputManifest } from '@qwendirector/contracts';

export type MockMode = 'success' | 'failure' | 'timeout' | 'duplicate_submit' | 'unknown';

export interface AdapterReceipt { attemptKey: string; externalRunId: string; }

export class MockAdapter {
  readonly id = 'mock';
  readonly version = '0.1.0';
  private readonly receipts = new Map<string, AdapterReceipt>();

  validate(spec: GenerationSpec): void {
    if (!spec.shotId || !spec.promptRevisionId || !spec.intent.prompt) throw new Error('INVALID_INPUT');
    if (!spec.output.mimeType) throw new Error('INVALID_INPUT');
  }

  plan(spec: GenerationSpec): ExecutionPlan {
    this.validate(spec);
    return {
      planHash: `mock:${spec.shotId}:${spec.promptRevisionId}`,
      adapterId: this.id,
      adapterVersion: this.version,
      requirements: { minVramMb: 0, diskMb: 1, concurrencyKey: 'mock' },
      resolvedParameters: { mode: spec.adapterOptions.mode ?? 'success' },
    };
  }

  submit(attemptKey: string, mode: MockMode = 'success'): AdapterReceipt {
    const prior = this.receipts.get(attemptKey);
    if (prior) return prior;
    if (mode === 'failure') throw new Error('BACKEND_UNAVAILABLE');
    const receipt = { attemptKey, externalRunId: `mock-run-${attemptKey}` };
    this.receipts.set(attemptKey, receipt);
    return receipt;
  }

  collect(jobId: string, attemptId: string, planHash: string): OutputManifest {
    return {
      schemaVersion: '1.0', jobId, attemptId, planHash,
      outputs: [{ logicalName: 'mock-output', mimeType: 'application/octet-stream', byteSize: 0, sha256: '0'.repeat(64), stagingHandle: `mock://${attemptId}` }],
      provenance: { adapterId: this.id, adapterVersion: this.version },
    };
  }
}
