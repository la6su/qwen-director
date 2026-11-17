import './lib/test-database.mjs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import pg from 'pg';
import { minimaxDirectorMediaKey, parseMiniMaxDirectorTimeline } from '../packages/workflow-adapters/src/minimax-director-timeline.ts';

process.env.QWEN_STORAGE = 'postgres';
process.env.QWEN_API_AUTOSTART = 'false';
const root = await mkdtemp(join(tmpdir(), 'qwendirector-aimixer-import-'));
process.env.QWEN_ASSET_ROOT = root;
const { app } = await import('../apps/api/src/index.ts');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const bytes = Buffer.from('aimixer-shared-frame-fixture');
const sha256 = createHash('sha256').update(bytes).digest('hex');
let projectId; let sceneId; let assetVersionId;

try {
  const project = await app.inject({ method: 'POST', url: '/v1/projects', payload: { name: `aimixer-import-${randomUUID()}` } });
  assert.equal(project.statusCode, 201, project.body);
  projectId = project.json().id;
  const scene = await app.inject({ method: 'POST', url: `/v1/projects/${projectId}/scenes`, payload: { title: 'Frame role import' } });
  assert.equal(scene.statusCode, 201, scene.body);
  sceneId = scene.json().id;
  const upload = await app.inject({ method: 'POST', url: '/v1/assets/import', payload: {
    logicalName: 'shared-frame.png', sha256, mimeType: 'image/png', contentBase64: bytes.toString('base64'), actor: 'smoke-test', assetKind: 'reference',
  } });
  assert.equal(upload.statusCode, 201, upload.body);
  assetVersionId = upload.json().assetVersionId;

  const frame = { imageFile: 'shared-frame.png', type: 'input', subfolder: '' };
  const timeline = {
    version: 5, frameRate: 24, totalFrames: 124, width: 1152, height: 640, refMaxSize: 1152,
    global: {}, segments: [{ id: 'same-asset-pair', start: 0, length: 124, startImage: frame, endImage: frame }],
  };
  const parsed = parseMiniMaxDirectorTimeline(timeline);
  const assetVersionByMediaKey = Object.fromEntries(parsed.media.map((media) => [minimaxDirectorMediaKey(media), assetVersionId]));
  const imported = await app.inject({ method: 'POST', url: `/v1/scenes/${sceneId}/aimixer/import`, payload: { timeline, assetVersionByMediaKey } });
  assert.equal(imported.statusCode, 201, imported.body);
  assert.equal(imported.json().status, 'draft');
  assert.equal(imported.json().requiresManualJobReview, true);
  const shotId = imported.json().shots[0].id;
  const links = await pool.query('select asset_version_id,role,position from shot_reference_assets where shot_id=$1 order by position', [shotId]);
  assert.deepEqual(links.rows.map((row) => ({ assetVersionId: row.asset_version_id, role: row.role })), [
    { assetVersionId, role: 'first-frame' },
    { assetVersionId, role: 'last-frame' },
  ]);
  const projectTimeline = await app.inject({ method: 'GET', url: `/v1/projects/${projectId}/timeline` });
  assert.deepEqual(projectTimeline.json().scenes[0].shots[0].references.map(({ id, role }) => ({ id, role })), [
    { id: assetVersionId, role: 'first-frame' },
    { id: assetVersionId, role: 'last-frame' },
  ]);
  const replay = await app.inject({ method: 'POST', url: `/v1/scenes/${sceneId}/aimixer/import`, payload: { timeline, assetVersionByMediaKey } });
  assert.equal(replay.statusCode, 200, replay.body);
  assert.equal(replay.json().replayed, true);
  const count = await pool.query('select count(*)::int as count from shots where import_batch_id=$1', [imported.json().batchId]);
  assert.equal(count.rows[0].count, 1);
  console.log('OK: AIMixer timeline import preserves first/last roles for one CAS AssetVersion and replays idempotently');
} finally {
  if (projectId) {
    await pool.query('delete from shots where scene_id in (select id from scenes where project_id=$1)', [projectId]);
    await pool.query('delete from scenes where project_id=$1', [projectId]);
    await pool.query('delete from projects where id=$1', [projectId]);
  }
  if (assetVersionId) await pool.query('delete from asset_versions where id=$1', [assetVersionId]);
  await pool.end();
  await app.close();
  await rm(root, { recursive: true, force: true });
}
