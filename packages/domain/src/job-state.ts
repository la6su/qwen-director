export type JobState =
  | 'draft'
  | 'awaiting_approval'
  | 'queued'
  | 'leased'
  | 'running'
  | 'cancel_requested'
  | 'reconciling'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'needs_attention';

const transitions: Record<JobState, readonly JobState[]> = {
  draft: ['awaiting_approval', 'cancelled'],
  awaiting_approval: ['queued', 'draft', 'cancelled'],
  queued: ['leased', 'cancelled'],
  leased: ['running', 'cancel_requested', 'reconciling', 'failed'],
  running: ['succeeded', 'failed', 'cancel_requested', 'reconciling'],
  cancel_requested: ['cancelled', 'succeeded', 'failed', 'needs_attention'],
  reconciling: ['running', 'queued', 'succeeded', 'failed', 'needs_attention'],
  succeeded: [],
  failed: [],
  cancelled: [],
  needs_attention: ['queued', 'cancelled'],
};

export function canTransition(from: JobState, to: JobState): boolean {
  return transitions[from].includes(to);
}

export function transition(from: JobState, to: JobState): JobState {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid job transition: ${from} -> ${to}`);
  }
  return to;
}

export function isTerminal(state: JobState): boolean {
  return transitions[state].length === 0;
}
