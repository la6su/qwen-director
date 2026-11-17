export type H3EventSourceStatus = 'verified' | 'unverified';
export interface H3TimedEvent {
  id: string;
  startFrame: number;
  endFrame: number;
  action: string;
  endState: string;
  entryState?: string;
  trigger?: string;
  continuityFromPrevious?: string;
  sourceRef?: string;
  sourceTiming?: H3EventSourceStatus;
}
export interface H3EventPlan {
  schemaVersion: 'qwendirector-h3-event-plan/v1';
  frameRate: 24;
  frameCount: number;
  events: H3TimedEvent[];
}

export interface H3EventCausalityReview {
  schemaVersion: 'qwendirector-h3-event-causality-review/v1';
  status: 'incomplete' | 'structured-for-human-review';
  semanticAssessment: 'not-performed';
  gaps: string[];
}

const MAX_EVENTS = 20;
const MAX_EVENT_TEXT = 1_000;

function fail(code: string): never { throw new Error(code); }

/** Validate an event timeline as a continuous, frame-addressed part of one H3 shot. */
export function normalizeH3EventPlan(value: unknown, expectedFrameCount?: number): H3EventPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('H3_EVENT_PLAN_INVALID');
  const source = value as Record<string, unknown>;
  if (source.schemaVersion !== 'qwendirector-h3-event-plan/v1' || source.frameRate !== 24) fail('H3_EVENT_PLAN_VERSION_INVALID');
  if (!Number.isInteger(source.frameCount) || (source.frameCount as number) < 5 || ((source.frameCount as number) - 5) % 17 !== 0) fail('H3_EVENT_PLAN_FRAME_COUNT_INVALID');
  const frameCount = source.frameCount as number;
  if (expectedFrameCount !== undefined && frameCount !== expectedFrameCount) fail('H3_EVENT_PLAN_FRAME_COUNT_MISMATCH');
  if (!Array.isArray(source.events) || source.events.length < 1 || source.events.length > MAX_EVENTS) fail('H3_EVENT_PLAN_EVENTS_INVALID');

  let expectedStart = 0;
  const ids = new Set<string>();
  const events = source.events.map((raw, index): H3TimedEvent => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('H3_EVENT_INVALID');
    const event = raw as Record<string, unknown>;
    if (typeof event.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(event.id) || ids.has(event.id)) fail('H3_EVENT_ID_INVALID');
    ids.add(event.id);
    if (!Number.isInteger(event.startFrame) || !Number.isInteger(event.endFrame)) fail('H3_EVENT_RANGE_INVALID');
    const startFrame = event.startFrame as number;
    const endFrame = event.endFrame as number;
    if (startFrame !== expectedStart || endFrame - startFrame < 5 || endFrame > frameCount) fail('H3_EVENT_RANGE_GAP_OVERLAP_OR_TOO_SHORT');
    expectedStart = endFrame;
    for (const key of ['action', 'endState'] as const) {
      if (typeof event[key] !== 'string' || !event[key].trim() || event[key].length > MAX_EVENT_TEXT) fail('H3_EVENT_TEXT_INVALID');
    }
    for (const key of ['entryState', 'trigger', 'continuityFromPrevious'] as const) {
      if (event[key] !== undefined && (typeof event[key] !== 'string' || !(event[key] as string).trim() || (event[key] as string).length > MAX_EVENT_TEXT)) fail('H3_EVENT_CAUSAL_TEXT_INVALID');
    }
    if (event.sourceRef !== undefined && (typeof event.sourceRef !== 'string' || event.sourceRef.length > 160)) fail('H3_EVENT_SOURCE_REF_INVALID');
    if (event.sourceTiming !== undefined && event.sourceTiming !== 'verified' && event.sourceTiming !== 'unverified') fail('H3_EVENT_SOURCE_TIMING_INVALID');
    if (event.sourceTiming === 'verified' && !event.sourceRef) fail('H3_EVENT_VERIFIED_SOURCE_REQUIRED');
    return {
      id: event.id as string, startFrame, endFrame,
      action: (event.action as string).trim(), endState: (event.endState as string).trim(),
      ...(typeof event.entryState === 'string' ? { entryState:event.entryState.trim() } : {}),
      ...(typeof event.trigger === 'string' ? { trigger:event.trigger.trim() } : {}),
      ...(typeof event.continuityFromPrevious === 'string' ? { continuityFromPrevious:event.continuityFromPrevious.trim() } : {}),
      ...(typeof event.sourceRef === 'string' && event.sourceRef.trim() ? { sourceRef: event.sourceRef.trim() } : {}),
      ...(event.sourceTiming ? { sourceTiming: event.sourceTiming as H3EventSourceStatus } : {}),
    };
  });
  if (expectedStart !== frameCount) fail('H3_EVENT_PLAN_COVERAGE_INCOMPLETE');
  return { schemaVersion: 'qwendirector-h3-event-plan/v1', frameRate: 24, frameCount, events };
}

/** Audits whether the event plan records a causal chain; it does not judge whether that chain is believable. */
export function reviewH3EventCausality(value: unknown): H3EventCausalityReview {
  const plan = normalizeH3EventPlan(value);
  const gaps: string[] = [];
  for (const [index, event] of plan.events.entries()) {
    if (!event.entryState) gaps.push(`${event.id}:entryState`);
    if (!event.trigger) gaps.push(`${event.id}:trigger`);
    if (index > 0 && !event.continuityFromPrevious) gaps.push(`${event.id}:continuityFromPrevious`);
  }
  return {
    schemaVersion:'qwendirector-h3-event-causality-review/v1',
    status:gaps.length ? 'incomplete' : 'structured-for-human-review',
    semanticAssessment:'not-performed',
    gaps,
  };
}

function timecode(frame: number): string {
  const elapsed = frame / 24;
  const minutes = Math.floor(elapsed / 60);
  return `${String(minutes).padStart(2, '0')}:${(elapsed - minutes * 60).toFixed(6).padStart(9, '0')}`;
}

/** Compile timed events as action phases inside one uninterrupted viewpoint, never as implicit cuts. */
export function compileH3TimedEvents(plan: H3EventPlan, expectedFrameCount: number): string {
  const normalized = normalizeH3EventPlan(plan, expectedFrameCount);
  return [
    'The following are timed action phases within this same uninterrupted shot; event boundaries do not create camera cuts.',
    ...normalized.events.map((event, index) => {
      const timing = event.sourceRef
        ? `Source ${event.sourceRef} timing is ${event.sourceTiming ?? 'unverified'}.`
        : 'No verified lyric or audio timing source is assigned.';
      const cause = event.entryState && event.trigger
        ? `It begins in this visible state: ${event.entryState} The trigger is: ${event.trigger}`
        : '';
      const bridge = index > 0 && event.continuityFromPrevious
        ? `The visible continuity from the previous event is: ${event.continuityFromPrevious}`
        : '';
      return `From frame ${event.startFrame} (${timecode(event.startFrame)}) through frame ${event.endFrame - 1} (${timecode(event.endFrame - 1)}), event ${index + 1}: ${cause} ${bridge} ${event.action} The action settles by the end of this range in this visible state: ${event.endState} ${timing}`.replace(/\s+/g, ' ').trim();
    }),
  ].join(' ');
}
