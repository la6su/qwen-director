import { createHash } from 'node:crypto';

export type PlannerBrief = { prompt: string; camera?: string; action?: string; composition?: string; lighting?: string; sound?: string; transition?: string };
export type PlannerDecision = { sections: Required<PlannerBrief>; decisionHash: string; provenance: { source: 'local-planner'; model?: string; createdAt: string } };

export function planBrief(brief: PlannerBrief, model?: string): PlannerDecision {
  const sections = { prompt: brief.prompt ?? '', camera: brief.camera ?? '', action: brief.action ?? '', composition: brief.composition ?? '', lighting: brief.lighting ?? '', sound: brief.sound ?? '', transition: brief.transition ?? '' };
  const canonical = JSON.stringify(Object.keys(sections).sort().reduce((out, key) => ({ ...out, [key]: sections[key as keyof typeof sections] }), {} as Record<string, string>));
  return { sections, decisionHash: createHash('sha256').update(canonical).digest('hex'), provenance: { source: 'local-planner', ...(model ? { model } : {}), createdAt: new Date().toISOString() } };
}
