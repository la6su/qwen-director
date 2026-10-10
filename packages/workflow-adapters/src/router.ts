import type { Modality } from '@qwendirector/contracts';
import type { BackendCapabilities, WorkflowBackendAdapter } from './backend.js';

export interface RoutedBackend { adapter: WorkflowBackendAdapter; capabilities: BackendCapabilities; }

/** Выбирает только уже доступный backend с заявленной modality. */
export function route(modality: Modality, candidates: readonly RoutedBackend[]): RoutedBackend {
  const match = candidates.find(({ capabilities }) => capabilities.reachable && capabilities.modalities.includes(modality));
  if (!match) throw new Error(`RESOURCE_UNAVAILABLE: no backend for ${modality}`);
  return match;
}
