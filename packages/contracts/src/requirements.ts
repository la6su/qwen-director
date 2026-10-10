import type { GenerationSpec } from './generation.js';

export function requiredCapabilities(spec: GenerationSpec): Record<string, unknown> {
  const requirements: Record<string, unknown> = { modalities: [spec.modality] };
  if (spec.adapterOptions.adapterId) requirements.adapterId = spec.adapterOptions.adapterId;
  if (spec.output.width && spec.output.height) requirements.outputPixels = spec.output.width * spec.output.height;
  if (spec.output.durationSeconds) requirements.durationSeconds = spec.output.durationSeconds;
  return requirements;
}
