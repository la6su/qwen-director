import { createHash } from 'node:crypto';
import { normalizeH3EventPlan, reviewH3EventCausality, type H3EventPlan } from './h3-event-plan.js';

export type PlannerBrief = { prompt: string; camera?: string; action?: string; composition?: string; lighting?: string; sound?: string; music?: string; transition?: string };
export type MontageShotScale = 'detail' | 'cu' | 'mcu_1st' | 'ms_2nd' | 'wide' | 'extreme_wide';
export type MontageScreenDirection = 'left-to-right' | 'right-to-left' | 'into-depth' | 'from-depth' | 'static';
export type MontageMotionTempo = 'static' | 'slow' | 'moderate' | 'fast';
export type MontageShotMetadata = {
  shotScale?: MontageShotScale;
  cameraAxisDeg?: number;
  screenDirection?: MontageScreenDirection;
  actionPhase?: string;
  focalCenter?: { xPercent: number; yPercent: number };
  lightDirection?: string;
  colorBridge?: string;
  motionTempo?: MontageMotionTempo;
};
export type PlannerContinuityReference = { assetVersionId: string; logicalName: string; mediaType: string; role: string; assetKind?: string };
export type PlannerEventPlanContext = {
  schemaVersion: H3EventPlan['schemaVersion']; frameRate: 24; frameCount: number; events: Array<{
    id: string; startFrame: number; endFrame: number; action: string; endState: string;
    entryState?: string; trigger?: string; continuityFromPrevious?: string; sourceRef?: string; sourceTiming?: 'verified'|'unverified';
  }>;
  review: ReturnType<typeof reviewH3EventCausality>;
};
export type PlannerContinuityShot = { shotId: string; sceneTitle: string; title: string; durationSeconds: number; prompt: Required<PlannerBrief>; continuityFromPrevious: string; references: PlannerContinuityReference[]; montageMetadata?: MontageShotMetadata; metadataStatus: 'available' | 'absent' | 'invalid'; eventPlan?: PlannerEventPlanContext; eventPlanStatus?: 'invalid' };
export type MontageTransitionCheck = { id: 'cameraAxis' | 'screenDirection' | 'focalCenter' | 'motionTempo' | 'shotScale' | 'actionPhase' | 'lightingColorBridge'; result: 'observed' | 'review' | 'unverified'; note: string };
export type MontageTransitionReview = { schemaVersion: 'qwendirector-montage-transition-review/v1'; fromShotId: string; toShotId: string; status: 'observations-only' | 'review-required' | 'insufficient-metadata'; checks: MontageTransitionCheck[] };
export type DirectorTimelineEvent = { id: string; startFrame: number; endFrame: number; action: string; endState: string; entryState?: string; trigger?: string; continuityFromPrevious?: string; sourceRef?: string; sourceTiming?: 'verified'|'unverified' };
export type DirectorTimelineSegment = { shotId: string; sceneId?: string; sceneTitle: string; title: string; startFrame: number; endFrame: number; frameCount: number; catalogFrameCount: number; timingStatus: 'event-plan'|'event-plan-overrides-catalog-duration'|'catalog-duration-unplanned'|'catalog-duration-invalid-event-plan'; eventCausalityStatus?: 'incomplete'|'structured-for-human-review'; references: Array<{ assetVersionId: string; role: string }>; events: DirectorTimelineEvent[]; joinToNext?: { transitionType: 'unspecified'; reviewStatus?: MontageTransitionReview['status'] } };
export type DirectorTimelinePlan = { schemaVersion: 'qwendirector-director-timeline/v1'; frameRate: 24; frameCount: number; segments: DirectorTimelineSegment[] } & (
  | { scope: 'adjacent-shot-window'; anchorShotId: string }
  | { scope: 'project'; projectId: string }
);
export type PlannerContinuityContext = { current: PlannerContinuityShot; previous?: PlannerContinuityShot; next?: PlannerContinuityShot; transitionReviews?: MontageTransitionReview[]; directorTimeline?: DirectorTimelinePlan };
export type PlannerContinuityCheckId = 'shotScale' | 'cameraAxis' | 'screenDirection' | 'actionPhase' | 'focalCenter' | 'lightingColorBridge' | 'motionTempo' | 'actionCausality';
export type PlannerContinuityCheck = { result: 'consistent' | 'review' | 'not-applicable'; note: string };
export type PlannerContinuityAudit = {
  status: 'continuity-consistent' | 'review-required' | 'not-enough-context';
  checks: Record<PlannerContinuityCheckId, PlannerContinuityCheck>;
};
export type PlannerDecision = { sections: Required<PlannerBrief>; continuityAudit: PlannerContinuityAudit; continuityContext?: PlannerContinuityContext; continuityContextHash?: string; decisionHash: string; provenance: { source: 'local-planner' | 'llama.cpp'; model?: string; toolsUsed?: string[]; createdAt: string } };

export const PLANNER_CONTINUITY_CHECK_IDS: readonly PlannerContinuityCheckId[] = ['shotScale','cameraAxis','screenDirection','actionPhase','focalCenter','lightingColorBridge','motionTempo','actionCausality'];
const LEGACY_PLANNER_CONTINUITY_CHECK_IDS = PLANNER_CONTINUITY_CHECK_IDS.filter((id) => id !== 'actionCausality');

export function normalizeMontageShotMetadata(value: unknown): MontageShotMetadata | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('SHOT_MONTAGE_METADATA_INVALID');
  const source = value as Record<string, unknown>;
  const allowed = ['shotScale','cameraAxisDeg','screenDirection','actionPhase','focalCenter','lightDirection','colorBridge','motionTempo'];
  if (Object.keys(source).some((key) => !allowed.includes(key))) throw new Error('SHOT_MONTAGE_METADATA_INVALID');
  const result: MontageShotMetadata = {};
  if (source.shotScale !== undefined) {
    if (!['detail','cu','mcu_1st','ms_2nd','wide','extreme_wide'].includes(String(source.shotScale))) throw new Error('SHOT_MONTAGE_METADATA_INVALID');
    result.shotScale = source.shotScale as MontageShotScale;
  }
  if (source.cameraAxisDeg !== undefined) {
    if (typeof source.cameraAxisDeg !== 'number' || !Number.isFinite(source.cameraAxisDeg) || source.cameraAxisDeg < 0 || source.cameraAxisDeg >= 360) throw new Error('SHOT_MONTAGE_METADATA_INVALID');
    result.cameraAxisDeg = source.cameraAxisDeg;
  }
  if (source.screenDirection !== undefined) {
    if (!['left-to-right','right-to-left','into-depth','from-depth','static'].includes(String(source.screenDirection))) throw new Error('SHOT_MONTAGE_METADATA_INVALID');
    result.screenDirection = source.screenDirection as MontageScreenDirection;
  }
  for (const key of ['actionPhase','lightDirection','colorBridge'] as const) {
    const item = source[key];
    if (item !== undefined) {
      const limit = key === 'actionPhase' ? 160 : 120;
      if (typeof item !== 'string' || !item.trim() || item.length > limit) throw new Error('SHOT_MONTAGE_METADATA_INVALID');
      result[key] = item.trim();
    }
  }
  if (source.focalCenter !== undefined) {
    const center = source.focalCenter;
    if (!center || typeof center !== 'object' || Array.isArray(center) || Object.keys(center).sort().join(',') !== 'xPercent,yPercent') throw new Error('SHOT_MONTAGE_METADATA_INVALID');
    const { xPercent, yPercent } = center as Record<string, unknown>;
    if (typeof xPercent !== 'number' || !Number.isFinite(xPercent) || xPercent < 0 || xPercent > 100 || typeof yPercent !== 'number' || !Number.isFinite(yPercent) || yPercent < 0 || yPercent > 100) throw new Error('SHOT_MONTAGE_METADATA_INVALID');
    result.focalCenter = { xPercent, yPercent };
  }
  if (source.motionTempo !== undefined) {
    if (!['static','slow','moderate','fast'].includes(String(source.motionTempo))) throw new Error('SHOT_MONTAGE_METADATA_INVALID');
    result.motionTempo = source.motionTempo as MontageMotionTempo;
  }
  return Object.keys(result).length ? result : undefined;
}

const oppositeScreenDirections: Partial<Record<MontageScreenDirection, MontageScreenDirection>> = {
  'left-to-right':'right-to-left', 'right-to-left':'left-to-right',
};

/** Compare only structured, user-authored shot metadata; findings are review prompts, never automatic cut approval. */
export function reviewMontageTransition(from: PlannerContinuityShot, to: PlannerContinuityShot): MontageTransitionReview {
  const a = from.montageMetadata;
  const b = to.montageMetadata;
  const checks: MontageTransitionCheck[] = [];
  const add = (id: MontageTransitionCheck['id'], result: MontageTransitionCheck['result'], note: string) => checks.push({ id, result, note: note.slice(0, 240) });
  if (a?.cameraAxisDeg === undefined || b?.cameraAxisDeg === undefined) add('cameraAxis','unverified','Для обоих шотов не задан структурированный угол камеры.');
  else {
    const rawDelta = Math.abs(a.cameraAxisDeg - b.cameraAxisDeg) % 360;
    const delta = Math.min(rawDelta, 360 - rawDelta);
    add('cameraAxis', delta < 30 ? 'review' : 'observed', `Зафиксирован переход оси ${delta}°; проверьте jump cut и намеренность смены ракурса.`);
  }
  if (!a?.screenDirection || !b?.screenDirection) add('screenDirection','unverified','Не заданы оба экранных вектора движения.');
  else if (oppositeScreenDirections[a.screenDirection] === b.screenDirection) add('screenDirection','review',`Векторы меняются с ${a.screenDirection} на ${b.screenDirection}; проверьте встречный удар или покажите разворот внутри кадра.`);
  else add('screenDirection','observed',`Зафиксированы векторы ${a.screenDirection} → ${b.screenDirection}; автоматическая оценка физического действия не выполняется.`);
  if (!a?.focalCenter || !b?.focalCenter) add('focalCenter','unverified','Не заданы оба центра внимания.');
  else {
    const shift = Math.abs(a.focalCenter.xPercent - b.focalCenter.xPercent);
    add('focalCenter', shift > 100 / 3 ? 'review' : 'observed', `Горизонтальное смещение центра внимания ${shift.toFixed(1)}% ширины кадра.`);
  }
  if (!a?.motionTempo || !b?.motionTempo) add('motionTempo','unverified','Не заданы оба темпа движения.');
  else add('motionTempo', a.motionTempo === 'fast' && b.motionTempo === 'static' ? 'review' : 'observed', `Темп перехода: ${a.motionTempo} → ${b.motionTempo}; оцените намеренность изменения.`);
  if (!a?.shotScale || !b?.shotScale) add('shotScale','unverified','Не заданы обе крупности.');
  else add('shotScale', a.shotScale === b.shotScale ? 'review' : 'observed', `Крупность меняется: ${a.shotScale} → ${b.shotScale}; одинаковый масштаб может быть намеренным match cut.`);
  if (!a?.actionPhase || !b?.actionPhase) add('actionPhase','unverified','Не заданы обе фазы действия.');
  else add('actionPhase','observed','Обе фазы действия заданы; их визуальное совпадение требует просмотра материала.');
  if (!a?.lightDirection || !a?.colorBridge || !b?.lightDirection || !b?.colorBridge) add('lightingColorBridge','unverified','Для проверки нужны направление света и цветовой мост обоих шотов.');
  else add('lightingColorBridge','observed',`Зафиксированы свет и цветовой мост: «${a.colorBridge}» → «${b.colorBridge}».`);
  const status: MontageTransitionReview['status'] = checks.some((check) => check.result === 'review')
    ? 'review-required'
    : checks.some((check) => check.result === 'unverified') ? 'insufficient-metadata' : 'observations-only';
  return { schemaVersion:'qwendirector-montage-transition-review/v1', fromShotId:from.shotId, toShotId:to.shotId, status, checks };
}

/** Compile an adjacent-shot window; event ranges remain inside their owning shot and never imply cuts. */
export function compileDirectorTimelineWindow(shots: PlannerContinuityShot[], anchorShotId: string, transitionReviews: MontageTransitionReview[] = []): DirectorTimelinePlan {
  if (!shots.length || !shots.some((shot) => shot.shotId === anchorShotId)) throw new Error('DIRECTOR_TIMELINE_ANCHOR_INVALID');
  let cursor = 0;
  const segments = shots.map((shot, index): DirectorTimelineSegment => {
    const catalogFrameCount = Math.round(shot.durationSeconds * 24);
    if (!Number.isSafeInteger(catalogFrameCount) || catalogFrameCount < 1) throw new Error(`DIRECTOR_TIMELINE_DURATION_INVALID:${shot.shotId}`);
    const plan = shot.eventPlan;
    const invalidEventPlan = shot.eventPlanStatus === 'invalid';
    const frameCount = plan && !invalidEventPlan ? plan.frameCount : catalogFrameCount;
    if (!Number.isSafeInteger(cursor + frameCount)) throw new Error('DIRECTOR_TIMELINE_RANGE_OVERFLOW');
    const startFrame = cursor;
    const endFrame = startFrame + frameCount;
    cursor = endFrame;
    const events = plan && !invalidEventPlan ? plan.events.map((event): DirectorTimelineEvent => ({
      id: event.id,
      startFrame: startFrame + event.startFrame,
      endFrame: startFrame + event.endFrame,
      action: event.action,
      endState: event.endState,
      ...(event.entryState ? { entryState: event.entryState } : {}),
      ...(event.trigger ? { trigger: event.trigger } : {}),
      ...(event.continuityFromPrevious ? { continuityFromPrevious: event.continuityFromPrevious } : {}),
      ...(event.sourceRef ? { sourceRef: event.sourceRef, sourceTiming: event.sourceTiming ?? 'unverified' } : {}),
    })) : [];
    const review = index < shots.length - 1 ? transitionReviews.find((item) => item.fromShotId === shot.shotId && item.toShotId === shots[index + 1].shotId) : undefined;
    return {
      shotId:shot.shotId, sceneTitle:shot.sceneTitle, title:shot.title, startFrame, endFrame, frameCount, catalogFrameCount,
      timingStatus:invalidEventPlan ? 'catalog-duration-invalid-event-plan' : plan ? (frameCount === catalogFrameCount ? 'event-plan' : 'event-plan-overrides-catalog-duration') : 'catalog-duration-unplanned',
      ...(plan && !invalidEventPlan ? { eventCausalityStatus:plan.review.status } : {}),
      references:shot.references.map(({ assetVersionId, role }) => ({ assetVersionId, role })),
      events,
      ...(index < shots.length - 1 ? { joinToNext:{ transitionType:'unspecified' as const, ...(review ? { reviewStatus:review.status } : {}) } } : {}),
    };
  });
  return { schemaVersion:'qwendirector-director-timeline/v1', scope:'adjacent-shot-window', frameRate:24, anchorShotId, frameCount:cursor, segments };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

export type PlannerShotInput = { shotId: string; sceneId?: string; sceneTitle?: string; title?: string; durationSeconds?: number; prompt?: Record<string, unknown>; references?: Array<Record<string, unknown>>; sourceMetadata?: Record<string, unknown> };

export function normalizePlannerShot(shot: PlannerShotInput, includeEventPlan = false): PlannerContinuityShot {
  const raw = (shot.sourceMetadata?.directing as Record<string, unknown> | undefined)?.montage;
  const prompt = Object.fromEntries(['prompt','camera','action','composition','lighting','sound','music','transition'].map((key) => [key, String(shot.prompt?.[key] ?? '').slice(0,500)])) as Required<PlannerBrief>;
  const references = (shot.references ?? []).slice(0,12).map((reference) => ({
    assetVersionId: String(reference.assetVersionId ?? reference.id ?? ''),
    logicalName: String(reference.logicalName ?? '').slice(0,180),
    mediaType: String(reference.mediaType ?? reference.type ?? ''),
    role: String(reference.role ?? ''),
    ...(reference.assetKind ?? reference.asset_kind ? { assetKind: String(reference.assetKind ?? reference.asset_kind) } : {}),
  }));
  const base = {
    shotId: shot.shotId,
    sceneTitle: String(shot.sceneTitle ?? '').slice(0,160),
    title: String(shot.title ?? '').slice(0,160),
    durationSeconds: Number(shot.durationSeconds ?? 0),
    prompt,
    continuityFromPrevious: String(shot.sourceMetadata?.continuityFromPrevious ?? '').slice(0,500),
    references,
  };
  let montageMetadata: MontageShotMetadata | undefined;
  let metadataStatus: PlannerContinuityShot['metadataStatus'] = 'absent';
  try { montageMetadata = normalizeMontageShotMetadata(raw); metadataStatus = montageMetadata ? 'available' : 'absent'; }
  catch { metadataStatus = 'invalid'; }
  const result: PlannerContinuityShot = { ...base, ...(montageMetadata ? { montageMetadata } : {}), metadataStatus };
  if (includeEventPlan && shot.prompt?.eventPlan !== undefined && shot.prompt.eventPlan !== null) {
    try {
      const eventPlan = normalizeH3EventPlan(shot.prompt.eventPlan);
      const compactPlan: PlannerEventPlanContext = {
        schemaVersion:eventPlan.schemaVersion, frameRate:24, frameCount:eventPlan.frameCount,
        events:eventPlan.events.map((event) => ({
          id:event.id, startFrame:event.startFrame, endFrame:event.endFrame,
          action:event.action.slice(0,240), endState:event.endState.slice(0,240),
          ...(event.entryState ? { entryState:event.entryState.slice(0,240) } : {}),
          ...(event.trigger ? { trigger:event.trigger.slice(0,240) } : {}),
          ...(event.continuityFromPrevious ? { continuityFromPrevious:event.continuityFromPrevious.slice(0,240) } : {}),
          ...(event.sourceRef ? { sourceRef:event.sourceRef.slice(0,120), sourceTiming:event.sourceTiming ?? 'unverified' } : {}),
        })),
        review:reviewH3EventCausality(eventPlan),
      };
      return { ...result, eventPlan:compactPlan };
    } catch { return { ...result, eventPlanStatus:'invalid' }; }
  }
  return result;
}

export function buildPlannerContinuityContext(shots: PlannerShotInput[], currentShotId: string): PlannerContinuityContext {
  const index = shots.findIndex((shot) => shot.shotId === currentShotId);
  if (index < 0) throw new Error('PLANNER_SHOT_NOT_IN_PROJECT');
  const current = normalizePlannerShot(shots[index], true);
  const previous = index > 0 ? normalizePlannerShot(shots[index - 1], true) : undefined;
  const next = index + 1 < shots.length ? normalizePlannerShot(shots[index + 1], true) : undefined;
  const transitionReviews = [
    ...(previous ? [reviewMontageTransition(previous, current)] : []),
    ...(next ? [reviewMontageTransition(current, next)] : []),
  ];
  const window = [...(previous ? [previous] : []), current, ...(next ? [next] : [])];
  return {
    current,
    ...(previous ? { previous } : {}),
    ...(next ? { next } : {}),
    ...(transitionReviews.length ? { transitionReviews } : {}),
    directorTimeline:compileDirectorTimelineWindow(window, current.shotId, transitionReviews),
  };
}

export type DirectorTimelineSceneInput = { sceneId: string; title: string; shots: PlannerShotInput[] };
export function compileProjectDirectorTimeline(projectId: string, scenes: DirectorTimelineSceneInput[]): DirectorTimelinePlan {
  const positioned = scenes.flatMap((scene) => scene.shots.map((shot) => ({ scene, shot:normalizePlannerShot({ ...shot, sceneTitle:scene.title }, true) })));
  if (!positioned.length) return { schemaVersion:'qwendirector-director-timeline/v1', scope:'project', projectId, frameRate:24, frameCount:0, segments:[] };
  const shots = positioned.map(({ shot }) => shot);
  const reviews = shots.slice(1).map((shot, index) => reviewMontageTransition(shots[index], shot));
  const adjacent = compileDirectorTimelineWindow(shots, shots[0].shotId, reviews);
  const segments = adjacent.segments.map((segment, index) => ({
    ...segment,
    sceneId:positioned[index].scene.sceneId,
    sceneTitle:positioned[index].scene.title,
  }));
  return { schemaVersion:adjacent.schemaVersion, scope:'project', projectId, frameRate:adjacent.frameRate, frameCount:adjacent.frameCount, segments };
}

export function hashPlannerContinuityContext(context?: PlannerContinuityContext): string | undefined {
  return context ? createHash('sha256').update(canonicalJson(context)).digest('hex') : undefined;
}

export function normalizePlannerContinuityAudit(value?: unknown): PlannerContinuityAudit {
  if (value === undefined) return {
    status: 'not-enough-context',
    checks: Object.fromEntries(PLANNER_CONTINUITY_CHECK_IDS.map((id) => [id, { result: 'not-applicable', note: 'Соседние шоты не предоставлены для сравнения.' }])) as PlannerContinuityAudit['checks'],
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('PLANNER_AUDIT_INVALID');
  const source = value as Record<string, unknown>;
  const allowedStatuses = ['continuity-consistent','review-required','not-enough-context'];
  if (!allowedStatuses.includes(String(source.status)) || !source.checks || typeof source.checks !== 'object' || Array.isArray(source.checks)) throw new Error('PLANNER_AUDIT_INVALID');
  const sourceChecks = source.checks as Record<string, unknown>;
  const hasLegacyChecks = Object.keys(sourceChecks).length === LEGACY_PLANNER_CONTINUITY_CHECK_IDS.length && LEGACY_PLANNER_CONTINUITY_CHECK_IDS.every((id) => Object.hasOwn(sourceChecks, id));
  const hasCurrentChecks = Object.keys(sourceChecks).length === PLANNER_CONTINUITY_CHECK_IDS.length && PLANNER_CONTINUITY_CHECK_IDS.every((id) => Object.hasOwn(sourceChecks, id));
  if (!hasLegacyChecks && !hasCurrentChecks) throw new Error('PLANNER_AUDIT_INVALID');
  const checks = {} as PlannerContinuityAudit['checks'];
  for (const id of PLANNER_CONTINUITY_CHECK_IDS) {
    const check = sourceChecks[id] ?? (id === 'actionCausality' ? { result:'not-applicable', note:'Причинная структура событий не проверялась.' } : undefined);
    if (!check || typeof check !== 'object' || Array.isArray(check)) throw new Error('PLANNER_AUDIT_INVALID');
    const item = check as Record<string, unknown>;
    if (!['consistent','review','not-applicable'].includes(String(item.result)) || typeof item.note !== 'string' || item.note.trim().length === 0 || item.note.length > 240) throw new Error('PLANNER_AUDIT_INVALID');
    checks[id] = { result: item.result as PlannerContinuityCheck['result'], note: item.note.trim() };
  }
  const status = source.status as PlannerContinuityAudit['status'];
  const hasReview = Object.values(checks).some((check) => check.result === 'review');
  const hasConsistent = Object.values(checks).some((check) => check.result === 'consistent');
  if ((status === 'continuity-consistent' && (hasReview || !hasConsistent)) || (status === 'review-required' && !hasReview) || (status === 'not-enough-context' && hasConsistent)) throw new Error('PLANNER_AUDIT_INVALID');
  return { status, checks };
}

function validatePlannerAuditEvidence(audit: PlannerContinuityAudit, context?: PlannerContinuityContext): void {
  const requiredMetadata: Record<PlannerContinuityCheckId, Array<keyof MontageShotMetadata>> = {
    shotScale: ['shotScale'],
    cameraAxis: ['cameraAxisDeg'],
    screenDirection: ['screenDirection'],
    actionPhase: ['actionPhase'],
    focalCenter: ['focalCenter'],
    lightingColorBridge: ['lightDirection', 'colorBridge'],
    motionTempo: ['motionTempo'],
    actionCausality: [],
  };
  for (const id of PLANNER_CONTINUITY_CHECK_IDS) {
    if (audit.checks[id].result !== 'consistent') continue;
    if (id === 'actionCausality') {
      if (!context?.current.eventPlan || context.current.eventPlan.review.status !== 'structured-for-human-review') throw new Error(`PLANNER_AUDIT_UNSUPPORTED_CONSISTENCY_CLAIM:${id}`);
      continue;
    }
    const neighbors = [context?.previous, context?.next].filter((shot): shot is PlannerContinuityShot => Boolean(shot));
    const metadata = [context?.current, ...neighbors].map((shot) => shot?.montageMetadata);
    const supported = neighbors.length > 0 && metadata.every((item) => item && requiredMetadata[id].every((key) => Object.hasOwn(item, key)));
    if (!supported) throw new Error(`PLANNER_AUDIT_UNSUPPORTED_CONSISTENCY_CLAIM:${id}`);
  }
}

export function createPlannerDecision(sections: Required<PlannerBrief>, source: PlannerDecision['provenance']['source'], model?: string, toolsUsed?: string[], continuityAudit?: unknown, continuityContext?: PlannerContinuityContext): PlannerDecision {
  const audit = normalizePlannerContinuityAudit(continuityAudit);
  validatePlannerAuditEvidence(audit, continuityContext);
  const continuityContextHash = hashPlannerContinuityContext(continuityContext);
  const canonicalSections = Object.keys(sections).sort().reduce((out, key) => ({ ...out, [key]: sections[key as keyof typeof sections] }), {} as Record<string, string>);
  const canonical = canonicalJson({ sections: canonicalSections, continuityAudit: audit, ...(continuityContext ? { continuityContext, continuityContextHash } : {}) });
  return { sections, continuityAudit: audit, ...(continuityContext ? { continuityContext, continuityContextHash } : {}), decisionHash: createHash('sha256').update(canonical).digest('hex'), provenance: { source, ...(model ? { model } : {}), ...(toolsUsed?.length ? { toolsUsed: [...new Set(toolsUsed)].sort() } : {}), createdAt: new Date().toISOString() } };
}

export function planBrief(brief: PlannerBrief, model?: string): PlannerDecision {
  const sections = { prompt: brief.prompt ?? '', camera: brief.camera ?? '', action: brief.action ?? '', composition: brief.composition ?? '', lighting: brief.lighting ?? '', sound: brief.sound ?? '', music: brief.music ?? '', transition: brief.transition ?? '' };
  return createPlannerDecision(sections, 'local-planner', model);
}
