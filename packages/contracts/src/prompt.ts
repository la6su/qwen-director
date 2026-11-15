export interface DirectorPromptFields {
  prompt?: string;
  camera?: string;
  action?: string;
  composition?: string;
  lighting?: string;
  sound?: string;
  music?: string;
  transition?: string;
}

export const DIRECTOR_PROMPT_SECTIONS = ['prompt', 'camera', 'action', 'composition', 'lighting', 'sound', 'music', 'transition'] as const;
export type DirectorPromptSection = typeof DIRECTOR_PROMPT_SECTIONS[number];

/** Returns empty sections without changing the immutable prompt snapshot. */
export function getDirectorPromptCompleteness(fields: DirectorPromptFields): { filled: DirectorPromptSection[]; missing: DirectorPromptSection[]; score: number } {
  const filled = DIRECTOR_PROMPT_SECTIONS.filter((section) => Boolean(fields[section]?.trim())) as DirectorPromptSection[];
  const missing = DIRECTOR_PROMPT_SECTIONS.filter((section) => !fields[section]?.trim()) as DirectorPromptSection[];
  return { filled, missing, score: Math.round((filled.length / DIRECTOR_PROMPT_SECTIONS.length) * 100) };
}

/** Stable, model-independent prompt compilation from director-facing fields. */
export function compileDirectorPrompt(fields: DirectorPromptFields): string {
  const parts = [fields.prompt, fields.camera && `Camera: ${fields.camera}`, fields.action && `Action: ${fields.action}`, fields.composition && `Composition: ${fields.composition}`, fields.lighting && `Lighting: ${fields.lighting}`, fields.sound && `Soundscape: ${fields.sound}`, fields.music && `Non-diegetic music: ${fields.music}`, fields.transition && `Transition: ${fields.transition}`]
    .map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  if (!parts.length) throw new Error('EMPTY_DIRECTOR_PROMPT');
  return parts.join('\n');
}

export type H3ReferencePromptInput = { type: 'image' | 'audio' | 'video'; role?: string; notes?: string };
const roleDescription: Record<string, string> = { actor:'character identity', set:'environment layout', prop:'object appearance', picture:'visual composition' };

/** Qwen Image edit instructions are plain image-edit directions, not the H3 Ref2VA schema. */
export function compileQwenImageEditPrompt(fields: DirectorPromptFields, references: H3ReferencePromptInput[] = []): string {
  const imageReferences = references.filter((reference) => reference.type === 'image');
  const requestedEdits = [fields.prompt, fields.action, fields.camera, fields.composition, fields.lighting]
    .map((value) => value?.trim().replace(/<\s*Picture\s+(\d+)\s*>/gi, 'Picture $1'))
    .filter((value): value is string => Boolean(value));
  if (!requestedEdits.length) throw new Error('EMPTY_QWEN_IMAGE_EDIT_PROMPT');

  const roleDescription: Record<string, string> = {
    actor: 'character identity and appearance',
    set: 'room architecture and environment',
    prop: 'object appearance',
    layout: 'spatial arrangement and object placement',
    picture: 'specific visible details requested in the edit directions',
  };
  const assignedRoles = imageReferences.map((reference, index) =>
    `Picture ${index + 1}: ${roleDescription[reference.role ?? 'picture'] ?? 'specific visible details requested in the edit directions'}.`,
  );
  const referenceInstruction = imageReferences.length > 1
    ? `Use Picture 1 as the base image to edit. Reference roles: ${assignedRoles.join(' ')} Use each reference for its assigned role and transfer any explicitly requested spatial arrangement or object placement. Do not transplant a reference background or camera viewpoint unless explicitly requested.`
    : 'Use Picture 1 as the base image to edit.';
  const invariants = ['Keep every element that is not explicitly requested to change faithful to the base image.'];
  if (!fields.camera?.trim()) invariants.push('Preserve the base camera viewpoint.');
  if (!fields.composition?.trim()) invariants.push('Preserve the base framing and composition.');
  if (!fields.lighting?.trim()) invariants.push('Preserve the base lighting.');
  return [
    referenceInstruction,
    `Make only the requested image edit: ${requestedEdits.join(' ')}`,
    invariants.join(' '),
  ].join('\n\n');
}

/** Canonical local prompt convention for H3 Ref2VA; native ComfyUI treats this as prompt text, not a validated schema. */
export function compileH3Ref2VAPrompt(fields: DirectorPromptFields, references: H3ReferencePromptInput[] = []): string {
  let imageIndex = 0; let videoIndex = 0; let audioIndex = 0;
  const labels = references.map((reference) => {
    if (reference.type === 'image') return { tag:`<Picture ${++imageIndex}>`, role:roleDescription[reference.role ?? 'picture'] ?? 'visual reference', reference };
    if (reference.type === 'video') return { tag:`<Video ${++videoIndex}>`, role:'motion and framing reference', reference };
    return { tag:`<Audio ${++audioIndex}>`, role:'sound reference', reference };
  });
  const subjectDefinitions = labels.length
    ? labels.map(({tag,role,reference}) => `${tag} is supplied for ${role}.${reference.notes ? ` User-provided notes: ${reference.notes}` : ''} Use it only for that role; do not invent attributes that are not visible or stated.`).join('\n')
    : 'No image, video, or audio references are connected; do not imply reference conditioning.';
  const retentionAnalysis = labels.map(({tag,reference}) => reference.type === 'audio'
    ? `${tag}: reference - use only the acoustic qualities stated in the prompt; reproduce the source verbatim only when explicitly requested.`
    : `${tag} (visual responsibility in [Shot 1]): partially_preserved - retain only features relevant to its assigned role and explicit invariants in the shot brief.`).join('\n') || 'No references are connected.';
  const visualLines = [
    fields.prompt?.trim(),
    fields.action?.trim() && `Action: ${fields.action.trim()}`,
    fields.camera?.trim() && `Camera: ${fields.camera.trim()}`,
    fields.composition?.trim() && `Composition: ${fields.composition.trim()}`,
    fields.lighting?.trim() && `Lighting: ${fields.lighting.trim()}`,
    fields.transition?.trim() && `Transition: ${fields.transition.trim()}`,
  ].filter((value): value is string => Boolean(value));
  if (!visualLines.length) throw new Error('EMPTY_DIRECTOR_PROMPT');
  return [
    `subject_definitions:\n${subjectDefinitions}`,
    `summary:\n${visualLines[0]}`,
    `retention_analysis:\n${retentionAnalysis}`,
    `detailed_description:\n[Shot 1] ${visualLines.join(' ')}`,
    `overall_soundscape:\n${fields.sound?.trim() || 'Natural location ambience and action-linked Foley only. Do not add speech that is not stated in the shot brief.'}`,
    `non_diegetic_music:\n${fields.music?.trim() || 'N/A'}`,
  ].join('\n\n');
}

/** Compile a two-keyframe H3 prompt with explicit FL2VA timestamp alignment. */
export function compileH3Fl2VAPrompt(fields: DirectorPromptFields, frameCount: number): string {
  if (!Number.isInteger(frameCount) || frameCount < 124 || (frameCount - 5) % 17 !== 0) throw new Error('INVALID_FL2VA_H3_LENGTH');
  const duration = (frameCount / 24).toFixed(2);
  return `How the reference pictures align with the target video - Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the ${duration}-second mark of the target video.\n\n${compileDirectorPrompt(fields)}`;
}
