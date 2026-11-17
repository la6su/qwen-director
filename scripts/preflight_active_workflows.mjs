import pg from 'pg';
import databaseUrl from './lib/require-database-url.mjs';
import { createH3RefModWorkflowProfile, createH3WorkflowProfile } from '../packages/workflow-adapters/src/h3-profile.ts';
import { preflightH3RefModRuntime, preflightH3Runtime } from '../packages/workflow-adapters/src/h3-workflow.ts';
import { digestWorkflow, prepareWorkbenchGraph, validateWorkbenchGraph, validateWorkbenchRuntimeSchema } from '../packages/workflow-adapters/src/workbench-catalog.ts';

const baseUrl = process.env.COMFYUI_URL ?? 'http://127.0.0.1:8188';
const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const results = [];

try {
  const client = await pool.connect();
  let profiles;
  try {
    await client.query('BEGIN READ ONLY');
    profiles = (await client.query(`
      select id, name, graph, graph_hash, boundary, reference_bindings, active
      from workflow_profiles where active=true order by id
    `)).rows;
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  for (const profile of profiles) {
    const isWorkbench = typeof profile.reference_bindings?.workbenchKind === 'string';
    const kind = isWorkbench ? profile.reference_bindings.workbenchKind : 'h3';
    const result = { id: profile.id, kind, status: 'ok', storedGraphHash: profile.graph_hash };
    try {
      if (isWorkbench) {
        const graph = prepareWorkbenchGraph(kind, profile.graph);
        validateWorkbenchGraph(kind, graph, undefined, profile.boundary?.outputBindings, profile.reference_bindings?.imageNodeIds);
        const response = await fetch(`${baseUrl}/object_info`);
        if (!response.ok) throw new Error(`COMFY_OBJECT_INFO_${response.status}`);
        validateWorkbenchRuntimeSchema(graph, await response.json());
        result.effectiveGraphHash = digestWorkflow(graph);
      } else {
        const isRefMod = profile.reference_bindings?.mode === 'refmod-i2v';
        const derived = isRefMod
          ? createH3RefModWorkflowProfile(profile.id, profile.name, profile.graph, profile.reference_bindings)
          : createH3WorkflowProfile(profile.id, profile.name, profile.graph, profile.reference_bindings ?? undefined);
        if (isRefMod) await preflightH3RefModRuntime(baseUrl, profile.graph, derived.boundary);
        else await preflightH3Runtime(baseUrl, profile.graph);
        result.effectiveGraphHash = derived.graphHash;
        result.mode = derived.boundary.mode;
      }
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'UNKNOWN_PREFLIGHT_ERROR';
    }
    results.push(result);
  }

  const failed = results.filter((result) => result.status !== 'ok');
  console.log(JSON.stringify({ mode: 'read-only', runtime: baseUrl, activeProfiles: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  if (failed.length) process.exitCode = 1;
} finally {
  await pool.end();
}
