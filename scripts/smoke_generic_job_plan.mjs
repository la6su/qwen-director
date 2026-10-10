import { readFileSync } from 'node:fs';
const source = readFileSync('apps/api/src/pg-jobs.ts', 'utf8');
for (const marker of ['workbenchKind', 'workflowProfile = { schemaVersion', 'graphHash: createHash']) if (!source.includes(marker)) throw new Error(`missing generic plan marker: ${marker}`);
console.log('generic durable job plan smoke: ok');
