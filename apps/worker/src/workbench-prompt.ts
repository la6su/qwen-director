export type WorkbenchPromptKind = 'actor' | 'scene' | 'prop' | 'layout' | 'image-edit' | 'image-generate' | 'refmod-create';

/** Resolve the positive prompt sent to a workbench graph. Image generation uses
 * its dedicated prompt field verbatim; other workbenches use the compiled brief.
 */
export function resolveWorkbenchPrompt(input: {
  kind: WorkbenchPromptKind;
  workflowPrompt?: unknown;
  directorPrompt?: unknown;
  compiledPrompt?: unknown;
}): string {
  if (input.kind === 'image-generate') {
    const directorPrompt = typeof input.directorPrompt === 'string' ? input.directorPrompt.trim() : '';
    if (directorPrompt) return directorPrompt;
    return typeof input.workflowPrompt === 'string' ? input.workflowPrompt : '';
  }
  return typeof input.compiledPrompt === 'string' ? input.compiledPrompt : '';
}
