import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile('apps/web/src/components/WorkflowWizard.vue','utf8');
for (const token of ['MiniMaxH3ReferenceToVideo','RandomNoise','SaveVideo','Проверить и активировать']) assert.match(source, new RegExp(token));
console.log('OK: H3 workflow wizard boundary validation contract');
