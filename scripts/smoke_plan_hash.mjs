import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const plan = (fields) => ({ project:'p', scene:'s', shot:'x', prompt:[fields.prompt, fields.camera && `Camera: ${fields.camera}`].filter(Boolean).join('\n'), directorFields:fields });
const hash = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
assert.notEqual(hash(plan({prompt:'a'})), hash(plan({prompt:'b'})));
assert.match(hash(plan({prompt:'a'})), /^[a-f0-9]{64}$/);
console.log('OK: plan hash changes with director input');
