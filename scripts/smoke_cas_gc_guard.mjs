import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import './lib/test-database.mjs';

const script = new URL('./cas_gc_report.mjs', import.meta.url);
const blocked = spawnSync(process.execPath, [script.pathname], {
  encoding: 'utf8',
  env: { ...process.env, QWEN_ASSET_ROOT: join(tmpdir(), 'qwendirector-cas-guard-unapproved') },
});
assert.notEqual(blocked.status, 0, 'test DB GC must require explicit opt-in');
assert.match(blocked.stderr, /CAS_GC_TEST_DATABASE_REQUIRES_EXPLICIT_ROOT_AND_ALLOW_FLAG/);

const isolatedRoot = await mkdtemp(join(tmpdir(), 'qwendirector-cas-guard-'));
try {
  const allowed = spawnSync(process.execPath, [script.pathname, '--allow-test-db'], {
    encoding: 'utf8',
    env: { ...process.env, QWEN_ASSET_ROOT: isolatedRoot },
  });
  assert.equal(allowed.status, 0, allowed.stderr);
  const report = JSON.parse(allowed.stdout);
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.scanned, 0);
  assert.equal(report.eligibleOrphans.length, 0);
  console.log('OK: CAS GC blocks test DB against implicit roots and accepts an isolated explicit dry-run');
} finally {
  await rm(isolatedRoot, { recursive: true, force: true });
}
