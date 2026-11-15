export type DirectorMediaRef = {
  kind: 'image' | 'video' | 'audio';
  fileName: string;
  subfolder: string;
  storageType: string;
  scopes: Array<'global' | 'segment'>;
  segmentIds: string[];
};

export type DirectorTimelineSegment = {
  id: string;
  startFrame: number;
  frameCount: number;
  durationSeconds: number;
  taskType: string;
  prompt: string;
  negativePrompt: string;
  continuityFromPrevious: boolean;
  references: string[];
};

export type MiniMaxDirectorTimeline = {
  schemaVersion: 'aimixer-timeline-v5';
  fps: number;
  totalFrames: number;
  width: number;
  height: number;
  refMaxSize: number;
  globalPrompt: string;
  taskType: string;
  segments: DirectorTimelineSegment[];
  media: DirectorMediaRef[];
  unresolvedMedia: DirectorMediaRef[];
  source: Record<string, unknown>;
};

export function minimaxDirectorMediaKey(media: Pick<DirectorMediaRef, 'kind' | 'storageType' | 'subfolder' | 'fileName'>): string {
  return JSON.stringify([media.kind, media.storageType, media.subfolder, media.fileName]);
}

type RawMedia = { fileName?: unknown; imageFile?: unknown; videoFile?: unknown; audioFile?: unknown; subfolder?: unknown; type?: unknown; index?: unknown };
const record = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const nonEmpty = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const positiveInt = (value: unknown, code: string): number => {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new Error(code);
  return Number(value);
};

/** Parse the installed AIMixer timeline v5 into a loss-preserving, read-only QD boundary. */
export function parseMiniMaxDirectorTimeline(input: unknown): MiniMaxDirectorTimeline {
  let source: Record<string, unknown>;
  if (typeof input === 'string') {
    try { source = record(JSON.parse(input)); } catch { throw new Error('AIMIXER_TIMELINE_JSON_INVALID'); }
  } else source = record(input);
  if (source.version !== 5) throw new Error(`AIMIXER_TIMELINE_VERSION_UNSUPPORTED:${String(source.version ?? 'missing')}`);
  const global = record(source.global);
  const rawSegments = list(source.segments).map(record);
  if (!rawSegments.length) throw new Error('AIMIXER_TIMELINE_SEGMENTS_EMPTY');
  const fps = positiveInt(source.frameRate, 'AIMIXER_TIMELINE_FPS_INVALID');
  const width = positiveInt(source.width, 'AIMIXER_TIMELINE_WIDTH_INVALID');
  const height = positiveInt(source.height, 'AIMIXER_TIMELINE_HEIGHT_INVALID');
  const refMaxSize = positiveInt(source.refMaxSize, 'AIMIXER_TIMELINE_REF_SIZE_INVALID');
  const segments: DirectorTimelineSegment[] = [];
  const mediaByKey = new Map<string, DirectorMediaRef>();
  const collectMedia = (values: unknown, scope: 'global' | 'segment', segmentId?: string, kindHint?: DirectorMediaRef['kind']) => {
    const entries = Array.isArray(values) ? values : values && typeof values === 'object' ? [values] : [];
    for (const raw of entries) {
      const item = raw as RawMedia;
      if (!item || typeof item !== 'object') continue;
      const fileName = nonEmpty(item.fileName) || nonEmpty(item.imageFile) || nonEmpty(item.videoFile) || nonEmpty(item.audioFile);
      if (!fileName) continue; // Empty picker slots are UI state, not references.
      const storageType = nonEmpty(item.type) || 'input';
      const kind: DirectorMediaRef['kind'] = nonEmpty(item.audioFile) ? 'audio' : nonEmpty(item.videoFile) ? 'video' : kindHint ?? 'image';
      const subfolder = nonEmpty(item.subfolder);
      const key = minimaxDirectorMediaKey({ kind, storageType, subfolder, fileName });
      const ref = mediaByKey.get(key) ?? { kind, fileName, subfolder, storageType, scopes: [], segmentIds: [] };
      if (!ref.scopes.includes(scope)) ref.scopes.push(scope);
      if (segmentId && !ref.segmentIds.includes(segmentId)) ref.segmentIds.push(segmentId);
      mediaByKey.set(key, ref);
    }
  };
  collectMedia(global.refs, 'global'); collectMedia(global.refVideos, 'global'); collectMedia(global.refAudios, 'global');
  collectMedia(global.referenceVideo, 'global', undefined, 'video'); collectMedia(global.genImage, 'global', undefined, 'image');
  const ids = new Set<string>();
  let previousEnd = 0;
  for (const raw of rawSegments) {
    const id = nonEmpty(raw.id);
    if (!id || ids.has(id)) throw new Error('AIMIXER_TIMELINE_SEGMENT_ID_INVALID');
    ids.add(id);
    const startFrame = Number.isSafeInteger(raw.start) && raw.start >= 0 ? raw.start : NaN;
    if (!Number.isSafeInteger(startFrame) || startFrame < previousEnd) throw new Error(`AIMIXER_TIMELINE_SEGMENT_RANGE_INVALID:${id}`);
    const frameCount = positiveInt(raw.length ?? raw.frameCount, `AIMIXER_TIMELINE_SEGMENT_LENGTH_INVALID:${id}`);
    const end = startFrame + frameCount;
    if (!Number.isSafeInteger(end)) throw new Error(`AIMIXER_TIMELINE_SEGMENT_RANGE_INVALID:${id}`);
    previousEnd = end;
    collectMedia(raw.refs, 'segment', id); collectMedia(raw.refVideos, 'segment', id); collectMedia(raw.refAudios, 'segment', id);
    collectMedia(raw.referenceVideo, 'segment', id, 'video'); collectMedia(raw.genImage, 'segment', id, 'image');
    collectMedia(raw.startImage, 'segment', id, 'image'); collectMedia(raw.endImage, 'segment', id, 'image');
    const refs = [...list(raw.refs), ...list(raw.refVideos), ...list(raw.refAudios)].map((value) => record(value)).filter((item) => nonEmpty(item.fileName) || nonEmpty(item.imageFile) || nonEmpty(item.videoFile) || nonEmpty(item.audioFile));
    segments.push({
      id, startFrame, frameCount, durationSeconds: frameCount / fps,
      taskType: nonEmpty(raw.taskType) || nonEmpty(global.taskType),
      prompt: typeof raw.prompt === 'string' ? raw.prompt : '',
      negativePrompt: typeof raw.negativePrompt === 'string' ? raw.negativePrompt : '',
      continuityFromPrevious: raw.continuityFromPrev === true,
      references: refs.map((item) => nonEmpty(item.fileName) || nonEmpty(item.imageFile) || nonEmpty(item.videoFile) || nonEmpty(item.audioFile)),
    });
  }
  const totalFrames = positiveInt(source.totalFrames, 'AIMIXER_TIMELINE_TOTAL_FRAMES_INVALID');
  if (previousEnd > totalFrames) throw new Error('AIMIXER_TIMELINE_SEGMENTS_EXCEED_TOTAL');
  const media = [...mediaByKey.values()];
  return {
    schemaVersion: 'aimixer-timeline-v5', fps, totalFrames, width, height, refMaxSize,
    globalPrompt: typeof global.prompt === 'string' ? global.prompt : '',
    taskType: nonEmpty(global.taskType), segments, media,
    unresolvedMedia: media.filter((item) => item.storageType === 'input'),
    source: structuredClone(source),
  };
}
