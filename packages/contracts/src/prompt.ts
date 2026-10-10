export interface DirectorPromptFields {
  prompt?: string;
  camera?: string;
  action?: string;
  composition?: string;
  lighting?: string;
  sound?: string;
  transition?: string;
}

export const DIRECTOR_PROMPT_SECTIONS = ['prompt', 'camera', 'action', 'composition', 'lighting', 'sound', 'transition'] as const;
export type DirectorPromptSection = typeof DIRECTOR_PROMPT_SECTIONS[number];

/** Returns empty sections without changing the immutable prompt snapshot. */
export function getDirectorPromptCompleteness(fields: DirectorPromptFields): { filled: DirectorPromptSection[]; missing: DirectorPromptSection[]; score: number } {
  const filled = DIRECTOR_PROMPT_SECTIONS.filter((section) => Boolean(fields[section]?.trim())) as DirectorPromptSection[];
  const missing = DIRECTOR_PROMPT_SECTIONS.filter((section) => !fields[section]?.trim()) as DirectorPromptSection[];
  return { filled, missing, score: Math.round((filled.length / DIRECTOR_PROMPT_SECTIONS.length) * 100) };
}

/** Stable, model-independent prompt compilation from director-facing fields. */
export function compileDirectorPrompt(fields: DirectorPromptFields): string {
  const parts = [fields.prompt, fields.camera && `Camera: ${fields.camera}`, fields.action && `Action: ${fields.action}`, fields.composition && `Composition: ${fields.composition}`, fields.lighting && `Lighting: ${fields.lighting}`, fields.sound && `Sound: ${fields.sound}`, fields.transition && `Transition: ${fields.transition}`]
    .map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  if (!parts.length) throw new Error('EMPTY_DIRECTOR_PROMPT');
  return parts.join('\n');
}
