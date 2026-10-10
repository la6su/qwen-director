import assert from 'node:assert/strict';
const { planBrief } = await import('../packages/contracts/src/planner.ts');
const a = planBrief({ prompt: 'hero enters', camera: 'wide' }, 'local-test');
const b = planBrief({ prompt: 'hero enters', camera: 'wide' }, 'local-test');
assert.equal(a.decisionHash, b.decisionHash); assert.equal(a.provenance.source, 'local-planner'); assert.equal(a.sections.lighting, '');
console.log('OK: deterministic local planner decision provenance');
