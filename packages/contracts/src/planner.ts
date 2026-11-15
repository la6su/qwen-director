import { createHash } from 'node:crypto';

export type PlannerBrief = { prompt: string; camera?: string; action?: string; composition?: string; lighting?: string; sound?: string; music?: string; transition?: string };
export type PlannerDecision = { sections: Required<PlannerBrief>; decisionHash: string; provenance: { source: 'local-planner' | 'llama.cpp'; model?: string; toolsUsed?: string[]; createdAt: string } };

export function createPlannerDecision(sections: Required<PlannerBrief>, source: PlannerDecision['provenance']['source'], model?: string, toolsUsed?: string[]): PlannerDecision {
  const canonical = JSON.stringify(Object.keys(sections).sort().reduce((out, key) => ({ ...out, [key]: sections[key as keyof typeof sections] }), {} as Record<string, string>));
  return { sections, decisionHash: createHash('sha256').update(canonical).digest('hex'), provenance: { source, ...(model ? { model } : {}), ...(toolsUsed?.length ? { toolsUsed: [...new Set(toolsUsed)].sort() } : {}), createdAt: new Date().toISOString() } };
}

export function planBrief(brief: PlannerBrief, model?: string): PlannerDecision {
  const sections = { prompt: brief.prompt ?? '', camera: brief.camera ?? '', action: brief.action ?? '', composition: brief.composition ?? '', lighting: brief.lighting ?? '', sound: brief.sound ?? '', music: brief.music ?? '', transition: brief.transition ?? '' };
  return createPlannerDecision(sections, 'local-planner', model);
}
