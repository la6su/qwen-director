import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseMiniMaxDirectorTimeline } from '../packages/workflow-adapters/src/minimax-director-timeline.ts';

const args = new Set(process.argv.slice(2));
const workflowPath = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
if (!workflowPath) throw new Error('WORKFLOW_PATH_REQUIRED');
const commit = args.has('--commit');
const comfyBase = new URL(process.env.COMFYUI_URL ?? 'http://127.0.0.1:8188');
const apiBase = new URL(process.env.QWEN_API_URL ?? process.env.QWEN_API_BASE_URL ?? 'http://127.0.0.1:4310');
const maxBytes = Number(process.env.QWEN_MAX_IMPORT_BYTES ?? 104857600);

function requireLoopback(url, label) {
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error(`${label}_MUST_BE_LOCALHOST`);
}
requireLoopback(comfyBase, 'COMFYUI_URL');
if (commit) requireLoopback(apiBase, 'QWEN_API_URL');
if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('QWEN_MAX_IMPORT_BYTES_INVALID');

const workflow = JSON.parse(await readFile(workflowPath, 'utf8'));
const directorNode = workflow.nodes?.find((node) => node.type === 'MiniMaxH3Director');
if (!directorNode) throw new Error('AIMIXER_DIRECTOR_NODE_MISSING');
let timeline;
for (const value of directorNode.widgets_values ?? []) {
  if (typeof value !== 'string' || !value.trimStart().startsWith('{')) continue;
  try {
    const candidate = JSON.parse(value);
    if (candidate?.version === 5 && Array.isArray(candidate?.segments)) { timeline = parseMiniMaxDirectorTimeline(candidate); break; }
  } catch { /* Other JSON widgets are not the timeline. */ }
}
if (!timeline) throw new Error('AIMIXER_TIMELINE_V5_NOT_FOUND');

const resolved = await Promise.all(timeline.unresolvedMedia.map(async (media) => {
  const query = new URLSearchParams({ filename: media.fileName, subfolder: media.subfolder, type: media.storageType });
  const response = await fetch(new URL(`/view?${query}`, comfyBase));
  if (!response.ok) return { media, status: response.status };
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > maxBytes) throw new Error(`AIMIXER_MEDIA_TOO_LARGE:${basename(media.fileName)}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > maxBytes) throw new Error(`AIMIXER_MEDIA_SIZE_INVALID:${basename(media.fileName)}`);
  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return { media, status: response.status, bytes, mimeType, sha256 };
}));
const missing = resolved.filter((item) => !item.bytes);
if (missing.length) {
  console.log(JSON.stringify({ mode: commit ? 'commit' : 'dry-run', found: resolved.length - missing.length, missing: missing.map(({ media, status }) => ({ file: basename(media.fileName), status })), imported: 0 }));
  if (commit) process.exitCode = 2;
} else if (!commit) {
  console.log(JSON.stringify({ mode: 'dry-run', found: resolved.length, missing: [], totalBytes: resolved.reduce((sum, item) => sum + item.bytes.length, 0), imported: 0 }));
} else {
  const actor = process.env.QWEN_IMPORT_ACTOR;
  if (!actor?.trim()) throw new Error('QWEN_IMPORT_ACTOR_REQUIRED');
  const authorization = process.env.QWEN_API_TOKEN ? { authorization: `Bearer ${process.env.QWEN_API_TOKEN}` } : {};
  const imports = [];
  for (const item of resolved) {
    const logicalName = `aimixer-${item.media.kind}-${basename(item.media.fileName).replace(/[^a-zA-Z0-9._-]/g, '_')}`.slice(0, 200);
    const response = await fetch(new URL('/v1/assets/import', apiBase), {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorization },
      body: JSON.stringify({ logicalName, sha256: item.sha256, mimeType: item.mimeType, contentBase64: Buffer.from(item.bytes).toString('base64'), actor: actor.trim(), assetKind: item.media.kind === 'image' ? 'reference' : item.media.kind, tags: ['aimixer', 'minimax-h3', item.media.kind] }),
    });
    if (!response.ok) throw new Error(`QWEN_ASSET_IMPORT_FAILED:${response.status}`);
    const body = await response.json();
    imports.push({ kind: item.media.kind, sha256: item.sha256, assetVersionId: body.assetVersionId });
  }
  console.log(JSON.stringify({ mode: 'commit', found: resolved.length, imported: imports.length, assets: imports }));
}
