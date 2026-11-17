import { compileH3TimedEvents, type H3EventPlan } from './h3-event-plan.js';

export interface DirectorPromptFields {
  prompt?: string;
  camera?: string;
  action?: string;
  composition?: string;
  lighting?: string;
  sound?: string;
  music?: string;
  transition?: string;
  eventPlan?: H3EventPlan | null;
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
export function compileH3Ref2VAPrompt(fields: DirectorPromptFields, references: H3ReferencePromptInput[] = [], frameCount = 124): string {
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
  if (fields.eventPlan && /\[Shot\s+[2-9]\d*\]/i.test(visualLines.join(' '))) throw new Error('H3_EVENT_PLAN_MULTI_SHOT_PROMPT_CONFLICT');
  const description = visualLines.join(' ');
  const timedEvents = fields.eventPlan ? compileH3TimedEvents(fields.eventPlan, frameCount) : '';
  const fullDescription = [description, timedEvents].filter(Boolean).join(' ');
  const shotDescription = /^\[Shot\s+1\]/i.test(fullDescription) ? fullDescription : `[Shot 1] ${fullDescription}`;
  return [
    `subject_definitions:\n${subjectDefinitions}`,
    `summary:\n${visualLines[0]}`,
    `retention_analysis:\n${retentionAnalysis}`,
    `detailed_description:\n${shotDescription}`,
    `overall_soundscape:\n${fields.sound?.trim() || 'Natural location ambience and action-linked Foley only. Do not add speech that is not stated in the shot brief.'}`,
    `non_diegetic_music:\n${fields.music?.trim() || 'N/A'}`,
  ].join('\n\n');
}

export type H3BaseMode = 't2va' | 'i2va' | 'fl2va' | 'l2va';
export type H3PromptMode = H3BaseMode | 'ref2va';
export type H3PromptFinding = { code: string; severity: 'error' | 'warning'; message: string };

/** Static protocol/timing lint. It cannot judge creative intent or rendered quality. */
export function inspectH3Prompt(prompt: string, options: { mode: H3PromptMode; frameCount: number; referenceCounts?: { image: number; video: number; audio: number } }): H3PromptFinding[] {
  const findings: H3PromptFinding[] = [];
  const fields = options.mode === 'ref2va'
    ? ['subject_definitions', 'summary', 'retention_analysis', 'detailed_description', 'overall_soundscape', 'non_diegetic_music']
    : ['integrated_multimodal_description', 'overall_soundscape', 'non_diegetic_music'];
  const fieldPattern = new RegExp(`^\\s*(${fields.join('|')})\\s*:`, 'gim');
  const fieldMatches = [...prompt.matchAll(fieldPattern)];
  const names = fieldMatches.map((match) => match[1].toLowerCase());
  if (fields.some((field) => names.filter((name) => name === field).length !== 1) || fields.some((field, index) => names.indexOf(field) !== index)) {
    findings.push({ code: 'H3_SECTION_SCHEMA', severity: 'error', message: 'Проверьте обязательные секции H3 и их порядок.' });
  }
  const bodyField = options.mode === 'ref2va' ? 'detailed_description' : 'integrated_multimodal_description';
  const bodyIndex = names.indexOf(bodyField);
  const bodyStart = bodyIndex >= 0 ? fieldMatches[bodyIndex].index! + fieldMatches[bodyIndex][0].length : 0;
  const nextFieldIndex = bodyIndex >= 0 ? fieldMatches[bodyIndex + 1]?.index ?? prompt.length : prompt.length;
  const description = prompt.slice(bodyStart, nextFieldIndex);
  const shots = [...description.matchAll(/\[Shot\s+(\d+)\]/gi)];
  if (!shots.length || Number(shots[0][1]) !== 1) findings.push({ code: 'H3_SHOT_SEQUENCE', severity: 'error', message: 'Описание должно начинаться с [Shot 1].' });
  let previousCut = -1;
  for (let index = 0; index < shots.length; index += 1) {
    const shotNumber = Number(shots[index][1]);
    if (shotNumber !== index + 1) findings.push({ code: 'H3_SHOT_SEQUENCE', severity: 'error', message: `Ожидался [Shot ${index + 1}], найден [Shot ${shotNumber}].` });
    if (index === 0) continue;
    const segmentStart = shots[index].index! + shots[index][0].length;
    const segmentEnd = shots[index + 1]?.index ?? description.length;
    const cutText = description.slice(segmentStart, segmentEnd);
    const cut = cutText.match(/^\s*At\s+(\d{2}):([0-5]\d)\.(\d{3})\s*,/i);
    if (!cut) {
      findings.push({ code: 'H3_CUT_TIME_MISSING', severity: 'error', message: `[Shot ${shotNumber}] должен начинаться с возрастающего таймкода At MM:SS.mmm.` });
      continue;
    }
    const seconds = Number(cut[1]) * 60 + Number(cut[2]) + Number(cut[3]) / 1000;
    if (seconds <= previousCut || seconds >= options.frameCount / 24) findings.push({ code: 'H3_CUT_TIME_RANGE', severity: 'error', message: `Таймкод [Shot ${shotNumber}] должен возрастать и находиться внутри длительности клипа.` });
    previousCut = seconds;
  }
  const alignment = prompt.slice(0, Math.max(0, bodyStart));
  const seconds = (options.frameCount / 24).toFixed(2);
  if (options.mode === 'i2va' && !/For the target video, at 0\.00 seconds into the target video, <Picture 1> \(from \[Shot 1\]\) is fully referenced\./i.test(alignment)) findings.push({ code: 'H3_I2VA_ALIGNMENT', severity: 'error', message: 'Не найдена обязательная строка выравнивания первого кадра I2VA.' });
  if (options.mode === 'fl2va') {
    const expected = `Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot ${shots.at(-1)?.[1] ?? 1}) aligns with the ${seconds}-second mark of the target video.`;
    if (!alignment.includes(expected)) findings.push({ code: 'H3_FL2VA_ALIGNMENT', severity: 'error', message: 'FL2VA alignment line does not match the final shot and frame-grid duration.' });
  }
  if (options.mode === 'l2va') {
    const expected = `<Picture 1> (from [Shot ${shots.at(-1)?.[1] ?? 1}]) aligns with the ${seconds}-second mark of the target video.`;
    if (!alignment.includes(expected)) findings.push({ code: 'H3_L2VA_ALIGNMENT', severity: 'error', message: 'L2VA alignment line does not match the final shot and frame-grid duration.' });
  }
  const referenceCounts = options.referenceCounts;
  if (referenceCounts) {
    const kinds: Record<string, keyof typeof referenceCounts> = { Picture: 'image', Video: 'video', Audio: 'audio' };
    for (const match of description.matchAll(/<(Picture|Video|Audio)\s+(\d+)>/gi)) {
      const kind = kinds[match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()];
      if (kind && Number(match[2]) > referenceCounts[kind]) findings.push({ code: 'H3_REFERENCE_LABEL_UNBOUND', severity: 'error', message: `${match[0]} не соответствует подключённому референсу.` });
    }
  }
  if (!Number.isInteger(options.frameCount) || options.frameCount < 5 || (options.frameCount - 5) % 17 !== 0) findings.push({ code: 'H3_FRAME_COUNT', severity: 'error', message: 'Длительность должна соответствовать допустимой сетке 17k+5 кадров H3.' });
  return findings;
}

/** Compile the three shared multimodal fields used by H3 base video modes. */
export function compileH3BasePrompt(fields: DirectorPromptFields, options: { mode: H3BaseMode; frameCount?: number; finalShotNumber?: number }): string {
  const { mode } = options;
  const frameCount = options.frameCount ?? 124;
  if ((mode === 'fl2va' || mode === 'l2va') && (!Number.isInteger(frameCount) || frameCount < 56 || (frameCount - 5) % 17 !== 0)) throw new Error(mode === 'fl2va' ? 'INVALID_FL2VA_H3_LENGTH' : 'INVALID_L2VA_H3_LENGTH');
  const visual = [
    fields.prompt?.trim(),
    fields.composition?.trim() && `Composition: ${fields.composition.trim()}`,
    fields.lighting?.trim() && `Lighting: ${fields.lighting.trim()}`,
    fields.action?.trim() && `Action: ${fields.action.trim()}`,
    fields.camera?.trim() && `Camera: ${fields.camera.trim()}`,
    fields.transition?.trim() && `Transition: ${fields.transition.trim()}`,
  ].filter((value): value is string => Boolean(value));
  if (fields.eventPlan && /\[Shot\s+[2-9]\d*\]/i.test(visual.join(' '))) throw new Error('H3_EVENT_PLAN_MULTI_SHOT_PROMPT_CONFLICT');
  if (fields.eventPlan) visual.push(compileH3TimedEvents(fields.eventPlan, frameCount));
  if (!visual.length) throw new Error('EMPTY_DIRECTOR_PROMPT');
  const description = visual.join(' ');
  const shotDescription = /^\[Shot\s+1\]/i.test(description) ? description : `[Shot 1] ${description}`;
  const finalShotNumber = options.finalShotNumber ?? Number([...shotDescription.matchAll(/\[Shot\s+(\d+)\]/gi)].at(-1)?.[1] ?? 1);
  if (!Number.isInteger(finalShotNumber) || finalShotNumber < 1) throw new Error('INVALID_H3_SHOT_NUMBER');
  let alignment = '';
  if (mode === 'i2va') alignment = 'For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.';
  else if (mode === 'fl2va') alignment = `How the reference pictures align with the target video - Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot ${finalShotNumber}) aligns with the ${(frameCount / 24).toFixed(2)}-second mark of the target video.`;
  else if (mode === 'l2va') alignment = `How the reference pictures align with the target video - <Picture 1> (from [Shot ${finalShotNumber}]) aligns with the ${(frameCount / 24).toFixed(2)}-second mark of the target video.`;
  const body = [
    `integrated_multimodal_description: ${shotDescription}`,
    `overall_soundscape: ${fields.sound?.trim() || 'Natural location ambience and action-linked Foley only. No speech or vocalization is heard.'}`,
    `non_diegetic_music: ${fields.music?.trim() || 'N/A'}`,
  ].join('\n');
  return alignment ? `${alignment}\n\n${body}` : body;
}

/** Compile a two-keyframe H3 prompt with explicit FL2VA timestamp alignment. */
export function compileH3Fl2VAPrompt(fields: DirectorPromptFields, frameCount: number): string {
  return compileH3BasePrompt(fields, { mode: 'fl2va', frameCount });
}
