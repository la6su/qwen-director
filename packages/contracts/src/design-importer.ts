import type { DesignDocument } from './design.js';
import { validateDesign } from './design.js';

export function importDesign(input: unknown): DesignDocument {
  if (!input || typeof input !== 'object') throw new Error('INVALID_DESIGN');
  const raw = input as Record<string, any>;
  const known = new Set(['schemaVersion','project','scenes','source']);
  const sourceMetadata = Object.fromEntries(Object.entries(raw).filter(([key]) => !known.has(key)));
  const document: DesignDocument = { schemaVersion: raw.schemaVersion, project: raw.project, scenes: raw.scenes ?? [], source: raw.source, sourceMetadata };
  validateDesign(document);
  return document;
}
