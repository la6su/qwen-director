import type { DesignDocument, DesignScene, DesignShot } from '../../contracts/src/design.js';
import { validateDesign } from '../../contracts/src/design.js';
import type { MiniMaxDirectorTimeline } from './minimax-director-timeline.js';
import { minimaxDirectorMediaKey } from './minimax-director-timeline.js';

export type MiniMaxDirectorPlanInput = {
  projectId: string;
  projectTitle: string;
  sceneId: string;
  sceneTitle: string;
  assetVersionByMediaKey?: Record<string, string>;
};

export function buildMiniMaxDirectorDesignProposal(timeline: MiniMaxDirectorTimeline, input: MiniMaxDirectorPlanInput): {
  document: DesignDocument;
  unresolvedReferences: Array<{ mediaKey: string; fileName: string; kind: string }>;
  readyForReview: boolean;
} {
  for (const [key, value] of Object.entries(input)) {
    if (key !== 'assetVersionByMediaKey' && (typeof value !== 'string' || !value.trim())) throw new Error(`AIMIXER_PLAN_${key.toUpperCase()}_REQUIRED`);
  }
  const refs = timeline.media.filter((media) => media.storageType === 'input');
  const unresolvedReferences = refs.filter((media) => !input.assetVersionByMediaKey?.[minimaxDirectorMediaKey(media)])
    .map((media) => ({ mediaKey: minimaxDirectorMediaKey(media), fileName: media.fileName, kind: media.kind }));
  const shots: DesignShot[] = timeline.segments.map((segment, index) => {
    const segmentRefs = refs.filter((media) => media.scopes.includes('global') || media.segmentIds.includes(segment.id));
    const referenceAssetVersionIds = [...new Set(segmentRefs.map((media) => input.assetVersionByMediaKey?.[minimaxDirectorMediaKey(media)]).filter((id): id is string => Boolean(id)))];
    return {
      id: `aimixer-${segment.id}`,
      title: `Segment ${String(index + 1).padStart(2, '0')}`,
      startSeconds: segment.startFrame / timeline.fps,
      durationSeconds: segment.durationSeconds,
      referenceAssetVersionIds,
      sourceMetadata: {
        source: 'AIMixer/ComfyUI_MiniMaxH3_Director',
        sourceSegmentId: segment.id,
        startFrame: segment.startFrame,
        frameCount: segment.frameCount,
        fps: timeline.fps,
        taskType: segment.taskType,
        continuityFromPrevious: segment.continuityFromPrevious,
        unresolvedMediaKeys: segmentRefs.filter((media) => !input.assetVersionByMediaKey?.[minimaxDirectorMediaKey(media)]).map(minimaxDirectorMediaKey),
        directorPrompt: { prompt: segment.prompt, negativePrompt: segment.negativePrompt },
      },
    };
  });
  const scene: DesignScene = {
    id: input.sceneId,
    title: input.sceneTitle,
    shots,
    sourceMetadata: { source: 'AIMixer/ComfyUI_MiniMaxH3_Director', timelineSchemaVersion: timeline.schemaVersion, fps: timeline.fps, totalFrames: timeline.totalFrames, width: timeline.width, height: timeline.height, refMaxSize: timeline.refMaxSize, globalPrompt: timeline.globalPrompt, taskType: timeline.taskType },
  };
  const document: DesignDocument = {
    schemaVersion: '1.0',
    project: { id: input.projectId, title: input.projectTitle },
    scenes: [scene],
    source: { product: 'AIMixer ComfyUI MiniMax H3 Director', version: 'timeline-v5' },
  };
  validateDesign(document);
  return { document, unresolvedReferences, readyForReview: unresolvedReferences.length === 0 };
}
