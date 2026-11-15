/** MiniMax H3 uses a 24 fps 17k+5 frame grid. The wider Comfy node limit is not a quality guarantee. */
export const MINIMAX_H3_FPS = 24;
export const MINIMAX_H3_GRID_STEP = 17;
export const MINIMAX_H3_GRID_OFFSET = 5;
export const MINIMAX_H3_TRAINED_FRAME_RANGE = { min: 124, max: 362 } as const;

export function alignMiniMaxH3Frames(requested: number): number {
  if (!Number.isFinite(requested)) throw new Error('H3_FRAME_COUNT_INVALID');
  const frameCount = Math.max(MINIMAX_H3_GRID_OFFSET, Math.ceil(requested));
  return frameCount + ((MINIMAX_H3_GRID_OFFSET - (frameCount % MINIMAX_H3_GRID_STEP) + MINIMAX_H3_GRID_STEP) % MINIMAX_H3_GRID_STEP);
}

export function miniMaxH3DurationSeconds(frames: number): number {
  if (!Number.isSafeInteger(frames) || frames < MINIMAX_H3_GRID_OFFSET || frames % MINIMAX_H3_GRID_STEP !== MINIMAX_H3_GRID_OFFSET % MINIMAX_H3_GRID_STEP) throw new Error('H3_FRAME_GRID_INVALID');
  return frames / MINIMAX_H3_FPS;
}

export function isMiniMaxH3TrainedLength(frames: number): boolean {
  return frames >= MINIMAX_H3_TRAINED_FRAME_RANGE.min && frames <= MINIMAX_H3_TRAINED_FRAME_RANGE.max && frames % MINIMAX_H3_GRID_STEP === MINIMAX_H3_GRID_OFFSET % MINIMAX_H3_GRID_STEP;
}
