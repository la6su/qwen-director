import assert from 'node:assert/strict';
import { compileDirectorPrompt } from '../packages/contracts/src/prompt.ts';
assert.equal(compileDirectorPrompt({ prompt:'A jazz club', camera:'slow dolly', lighting:'warm tungsten' }), 'A jazz club\nCamera: slow dolly\nLighting: warm tungsten');
assert.throws(() => compileDirectorPrompt({}), /EMPTY_DIRECTOR_PROMPT/);
console.log('OK: deterministic director prompt compiler');
