export interface CreateJobRequest {
  shotId: string;
  planHash: string;
  idempotencyKey: string;
  requestHash: string;
}

export type ApiErrorCode =
  | 'IDEMPOTENCY_CONFLICT'
  | 'APPROVAL_REQUIRED'
  | 'FENCING_REJECTED'
  | 'INVALID_STATE'
  | 'NOT_FOUND';

export interface ApiError { code: ApiErrorCode; message: string; correlationId: string; }

/**
 * Реализация должна выполнять claim, lease и commit в транзакциях PostgreSQL.
 * Этот файл фиксирует границу, не притворяясь готовым HTTP-сервером.
 */
export interface JobStore {
  createOrReplayJob(request: CreateJobRequest): Promise<{ jobId: string; replayed: boolean }>;
  approve(jobId: string, planHash: string, actor: string, retryBudget: number): Promise<void>;
  claimNext(nodeId: string, capabilitySnapshot: unknown): Promise<{ jobId: string; attemptId: string; fencingToken: number } | null>;
  heartbeat(attemptId: string, fencingToken: number, sequence: number): Promise<void>;
  commitResult(attemptId: string, fencingToken: number, outputManifest: unknown): Promise<void>;
}
