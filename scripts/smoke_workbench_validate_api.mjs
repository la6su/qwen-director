import { readFileSync } from 'node:fs';
const source = readFileSync('apps/api/src/index.ts', 'utf8');
for (const marker of ["'/v1/workbenches/plan'", "'/v1/workbenches/validate'"]) if (!source.includes(marker)) throw new Error(`missing ${marker}`);
console.log('workbench validate API smoke: ok');
