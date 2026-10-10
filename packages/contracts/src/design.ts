export interface DesignShot { id: string; title: string; startSeconds: number; durationSeconds: number; promptRevisionId?: string; referenceAssetVersionIds: string[]; sourceMetadata?: Record<string, unknown>; }
export interface DesignScene { id: string; title: string; shots: DesignShot[]; sourceMetadata?: Record<string, unknown>; }
export interface DesignDocument { schemaVersion: '1.0'; project: { id: string; title: string }; scenes: DesignScene[]; source?: { product?: string; version?: string; importedAt?: string }; sourceMetadata?: Record<string, unknown>; }

export function validateDesign(document: DesignDocument): void {
  if (document.schemaVersion !== '1.0' || !document.project?.id || !document.project?.title) throw new Error('INVALID_DESIGN_HEADER');
  let previous = -1;
  for (const scene of document.scenes ?? []) for (const shot of scene.shots ?? []) {
    if (!shot.id || !shot.title || shot.durationSeconds <= 0 || shot.startSeconds < previous) throw new Error(`INVALID_SHOT:${shot.id}`);
    previous = shot.startSeconds;
  }
}
