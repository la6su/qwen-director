import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile('apps/web/src/components/AssetWorkbench.vue','utf8');
for (const token of ["'actor'", "'scene'", "'prop'", "'layout'", 'assetKind', 'tags']) assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
console.log('OK: typed Actor/Scene/Prop/Layout workbench contract');
