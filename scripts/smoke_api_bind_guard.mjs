import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['--import', 'tsx', '-e', "process.env.QWEN_API_AUTOSTART='true'; process.env.QWEN_API_HOST='0.0.0.0'; delete process.env.QWEN_API_TOKEN; await import('./apps/api/src/index.ts')"], { cwd: process.cwd(), env: process.env });
let output = '';
child.stderr.on('data', (chunk) => { output += chunk.toString(); });
const code = await new Promise((resolve) => child.on('exit', resolve));
assert.notEqual(code, 0); assert.match(output, /QWEN_API_TOKEN_REQUIRED_FOR_NON_LOOPBACK/);
console.log('OK: non-loopback API requires bearer token');
