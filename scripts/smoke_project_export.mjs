import assert from 'node:assert/strict';
const base=process.env.QWEN_API_URL ?? 'http://127.0.0.1:4310';
const projects=await (await fetch(`${base}/v1/projects`)).json();
const project=projects.projects?.[0]; if(!project) throw new Error('NO_PROJECT_FOR_EXPORT');
const response=await fetch(`${base}/v1/projects/${project.id}/export`); assert.equal(response.status,200);
assert.match(response.headers.get('content-disposition') ?? '',/attachment/); assert.equal(response.headers.get('cache-control'),'no-store');
const manifest=await response.json(); assert.equal(manifest.project_id,project.id); assert.ok(Array.isArray(manifest.scenes)); assert.ok(Array.isArray(manifest.jobs));
console.log(`OK: project export ${project.id} includes scenes and no-store attachment`);
