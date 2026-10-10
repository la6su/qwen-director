import type { Pool, PoolClient } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import { PgJobRepository } from './pg-jobs.js';
import type { AssetStorage } from '@qwendirector/storage';
import { createH3WorkflowProfile, type H3WorkflowProfile } from '@qwendirector/workflow-adapters/h3-profile';

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

function manifestHash(manifest: unknown): string {
  return createHash('sha256').update(canonicalJson(manifest)).digest('hex');
}

export class PgAttemptRepository {
  async ready() { await this.pool.query('select 1'); return true; }
  async close() { await this.pool.end(); }
  get jobs() { return new PgJobRepository(this.pool); }
  constructor(private readonly pool: Pool) {}

  async claimNext(nodeId = process.env.QWEN_NODE_ID ?? 'local') {
    return this.claim(undefined, nodeId);
  }

  async claim(jobId: string | undefined, nodeId = process.env.QWEN_NODE_ID ?? 'local', leaseSeconds = 60) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const job = await client.query(`select j.id,j.plan_hash,j.adapter_id,j.plan_json,j.required_capabilities from jobs j join nodes n on n.id=$2 and n.status='online' where ($1::uuid is null or j.id=$1) and j.state='queued' and n.capabilities @> j.required_capabilities and not exists (select 1 from attempts active where active.node_id=n.id and active.state in ('leased','running','unknown')) order by j.created_at for update of j skip locked limit 1`, [jobId ?? null, nodeId]);
      if (!job.rowCount) {
        if (jobId) throw new Error('INVALID_STATE');
        await client.query('COMMIT'); return null;
      }
      jobId = job.rows[0].id;
      const busy = await client.query(`select 1 from attempts where job_id=$1 and state in ('leased','running','unknown') for update`, [jobId]);
      if (busy.rowCount) throw new Error('RESOURCE_BUSY');
      const token = await client.query(`select coalesce(max(fencing_token),0)+1 as token from attempts where job_id=$1`, [jobId]);
      const attemptId = crypto.randomUUID();
      const result = await client.query(`insert into attempts(id,job_id,node_id,fencing_token,attempt_key,state,lease_expires_at) values($1,$2,$3,$4,$5,'leased',now()+($6 * interval '1 second')) returning id,fencing_token`, [attemptId, jobId, nodeId, token.rows[0].token, `${jobId}:${attemptId}`, leaseSeconds]);
      await client.query(`update jobs set state='leased' where id=$1`, [jobId]);
      await client.query('COMMIT'); return { ...result.rows[0], jobId, planHash:job.rows[0].plan_hash, adapterId:job.rows[0].adapter_id, plan:job.rows[0].plan_json, requiredCapabilities:job.rows[0].required_capabilities, fencingToken:Number(result.rows[0].fencing_token) };
    } catch (error) { await client.query('ROLLBACK'); if ((error as { code?: string }).code === '23505') throw new Error('RESOURCE_BUSY'); throw error; } finally { client.release(); }
  }

  async heartbeat(attemptId: string, fencingToken: number, sequence: number) {
    return this.pool.query(`update attempts set state='running', heartbeat_seq=$3, lease_expires_at=now()+(60 * interval '1 second') where id=$1 and fencing_token=$2 and state in ('leased','running') and heartbeat_seq < $3 returning id,job_id,state`, [attemptId, fencingToken, sequence]).then(r => { if (!r.rowCount) throw new Error('FENCING_REJECTED_OR_STALE_HEARTBEAT'); return r.rows[0]; });
  }

  async fail(attemptId: string, fencingToken: number, error: unknown) {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const row = (await client.query(`update attempts set state='failed',error_detail=$3,error_at=now() where id=$1 and fencing_token=$2 and state in ('leased','running') returning job_id`, [attemptId, fencingToken, String(error).slice(0, 4000)])).rows[0]; if (!row) throw new Error('FENCING_REJECTED_OR_INVALID_STATE'); await client.query("update jobs set state=case when state='cancel_requested' then 'cancelled' else 'failed' end where id=$1", [row.job_id]); await client.query('COMMIT'); return { attemptId, jobId: row.job_id, state:'failed', error: String(error) }; } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async reconcileExpired() {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await client.query(`update attempts set state='unknown' where state in ('leased','running') and lease_expires_at < now() returning id,job_id`); if (result.rowCount) await client.query("update jobs set state='reconciling' where id = any($1::uuid[])", [result.rows.map((row) => row.job_id)]); await client.query('COMMIT'); return { reconciled: result.rowCount ?? 0, attempts: result.rows.map((row) => row.id) }; } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async resolveUnknown(attemptId: string, decision: 'success' | 'failed', actor: string, manifest: unknown = {}) {
    if (!actor || !['success','failed'].includes(decision)) throw new Error('INVALID_RECONCILE_DECISION');
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const row=(await client.query("select job_id,state from attempts where id=$1 for update",[attemptId])).rows[0]; if (!row || row.state !== 'unknown') throw new Error('INVALID_RECONCILE_STATE'); const next=decision==='success'?'succeeded':'failed'; if (decision==='success') { const hash=manifestHash(manifest); await client.query('insert into attempt_manifests(attempt_id,manifest_hash,manifest) values($1,$2,$3)',[attemptId,hash,manifest]); } await client.query('update attempts set state=$2 where id=$1',[attemptId,next]); await client.query('update jobs set state=$2 where id=$1',[row.job_id,next]); await client.query('COMMIT'); return {attemptId,jobId:row.job_id,state:next,actor}; } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async commit(attemptId: string, fencingToken: number, manifest: unknown) {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const job = await client.query(`select j.id from jobs j join attempts a on a.job_id=j.id
        where a.id=$1 and j.state in ('leased','running') for update of j`,[attemptId]);
      if (!job.rowCount) throw new Error('INVALID_STATE');
      const r = await client.query(`update attempts set state='succeeded' where id=$1 and fencing_token=$2
        and state in ('leased','running') and lease_expires_at>now() returning job_id`, [attemptId,fencingToken]);
      if (!r.rowCount) throw new Error('FENCING_REJECTED_OR_INVALID_STATE');
      const linked = await client.query('select logical_name, asset_version_id from attempt_assets where attempt_id=$1', [attemptId]);
      const byName = new Map(linked.rows.map((row) => [row.logical_name, row.asset_version_id]));
      const candidate = manifest && typeof manifest === 'object' ? manifest as Record<string, unknown> : {};
      const outputs = Array.isArray(candidate.outputs) ? candidate.outputs.map((output) => {
        if (!output || typeof output !== 'object') return output;
        const item = output as Record<string, unknown>;
        const id = typeof item.logicalName === 'string' ? byName.get(item.logicalName) : undefined;
        return id ? { ...item, assetVersionId: id } : item;
      }) : undefined;
      const enrichedManifest = outputs ? { ...candidate, outputs } : manifest;
      const hash = manifestHash(enrichedManifest);
      await client.query('insert into attempt_manifests(attempt_id,manifest_hash,manifest) values($1,$2,$3)', [attemptId, hash, enrichedManifest]);
      await client.query("update jobs set state='succeeded' where id=$1",[r.rows[0].job_id]);
      await client.query('COMMIT');
      return { id:attemptId, jobId:r.rows[0].job_id, state:'succeeded', manifest: enrichedManifest, manifestHash:hash };
    } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async getManifest(attemptId: string) {
    const result = await this.pool.query('select manifest_hash,manifest,created_at from attempt_manifests where attempt_id=$1', [attemptId]);
    return result.rows[0] ?? null;
  }

  async listAttempts(jobId: string) {
    const result = await this.pool.query(`select id,job_id,node_id,fencing_token,attempt_key,state,lease_expires_at,heartbeat_seq,error_detail,created_at,error_at
      from attempts where job_id=$1 order by created_at desc`, [jobId]);
    return result.rows;
  }

  async getTimeline(projectId: string) {
    const result = await this.pool.query(`select sc.id as scene_id, sc.title as scene_title, sc.position as scene_position,
      sh.id as shot_id, sh.title as shot_title, sh.position as shot_position, sh.plan_revision, sh.duration_seconds, sh.director_prompt, sh.prompt_revision,
      coalesce(jsonb_agg(jsonb_build_object('id',av.id,'logicalName',aa.logical_name,'sha256',av.sha256,'mimeType',av.mime_type,'byteSize',av.byte_size,'storageKey',av.storage_key,'provenance',av.provenance,'asset_kind',av.asset_kind,'tags',av.tags) order by aa.logical_name) filter (where av.id is not null),'[]'::jsonb) as assets
      from scenes sc left join shots sh on sh.scene_id=sc.id left join attempt_assets aa on aa.attempt_id in (select a.id from attempts a join jobs j on j.id=a.job_id where j.shot_id=sh.id) left join asset_versions av on av.id=aa.asset_version_id
      where sc.project_id=$1 group by sc.id,sh.id order by sc.position,sh.position`, [projectId]);
    const scenes = new Map<string, { sceneId: string; title: string; position: number; shots: unknown[] }>();
    for (const row of result.rows) {
      let scene = scenes.get(row.scene_id);
      if (!scene) { scene = { sceneId: row.scene_id, title: row.scene_title, position: row.scene_position, shots: [] }; scenes.set(row.scene_id, scene); }
      if (row.shot_id) scene.shots.push({ shotId: row.shot_id, title: row.shot_title, position: row.shot_position, planRevision: row.plan_revision, durationSeconds: Number(row.duration_seconds), prompt: row.director_prompt ?? {}, promptRevision: row.prompt_revision, assets: row.assets });
    }
    return [...scenes.values()].sort((a, b) => a.position - b.position);
  }

  async getAsset(assetVersionId: string) {
    const result = await this.pool.query('select id,storage_key,mime_type,byte_size,sha256,provenance,asset_kind,tags,created_at from asset_versions where id=$1', [assetVersionId]);
    return result.rows[0] ?? null;
  }
  async getAssetLineage(assetVersionId: string) {
    const row = (await this.pool.query('select id,provenance,asset_kind,tags,created_at from asset_versions where id=$1',[assetVersionId])).rows[0];
    if (!row) return null;
    const ids = Array.isArray(row.provenance?.derivedFromAssetVersionIds) ? row.provenance.derivedFromAssetVersionIds : [];
    const parents = ids.length ? (await this.pool.query('select id,sha256,mime_type,asset_kind,tags,created_at from asset_versions where id=any($1::uuid[])',[ids])).rows : [];
    return { assetVersionId: row.id, assetKind: row.asset_kind, tags: row.tags, createdAt: row.created_at, parents };
  }

  async listProjects() { return (await this.pool.query('select id,name,created_at from projects order by created_at desc')).rows; }
  async createProject(name: string) {
    if (!name?.trim()) throw new Error('INVALID_PROJECT_NAME');
    const row = (await this.pool.query('insert into projects(id,name) values($1,$2) returning id,name,created_at',[randomUUID(),name.trim()])).rows[0];
    return row;
  }
  async createScene(projectId: string, title: string) {
    if (!title?.trim()) throw new Error('INVALID_SCENE_TITLE');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (!(await client.query('select 1 from projects where id=$1',[projectId])).rowCount) throw new Error('PROJECT_NOT_FOUND');
      const position = Number((await client.query('select coalesce(max(position),0)+1 as next from scenes where project_id=$1',[projectId])).rows[0].next);
      const row = (await client.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,$4) returning id,project_id,title,position',[randomUUID(),projectId,title.trim(),position])).rows[0];
      await client.query('COMMIT'); return row;
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  async reorderScenes(projectId: string, sceneIds: string[]) {
    if (!Array.isArray(sceneIds) || sceneIds.length < 1 || sceneIds.some((id) => typeof id !== 'string' || !id)) throw new Error('INVALID_SCENE_ORDER');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (!(await client.query('select 1 from projects where id=$1', [projectId])).rowCount) throw new Error('PROJECT_NOT_FOUND');
      const rows = (await client.query('select id from scenes where project_id=$1 order by position', [projectId])).rows.map((row) => row.id as string);
      if (rows.length !== sceneIds.length || new Set(sceneIds).size !== sceneIds.length || rows.some((id) => !sceneIds.includes(id))) throw new Error('SCENE_ORDER_MISMATCH');
      await client.query('update scenes set position=position+$2 where project_id=$1', [projectId, rows.length + 1]);
      for (const [index, sceneId] of sceneIds.entries()) await client.query('update scenes set position=$2 where id=$1 and project_id=$3', [sceneId, index + 1, projectId]);
      await client.query('COMMIT');
      return (await client.query('select id,project_id,title,position from scenes where project_id=$1 order by position', [projectId])).rows;
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  async createShot(sceneId: string, title: string, durationSeconds?: number) {
    if (!title?.trim()) throw new Error('INVALID_SHOT_TITLE');
    if (durationSeconds !== undefined && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) throw new Error('INVALID_SHOT_DURATION');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (!(await client.query('select 1 from scenes where id=$1',[sceneId])).rowCount) throw new Error('SCENE_NOT_FOUND');
      const position = Number((await client.query('select coalesce(max(position),0)+1 as next from shots where scene_id=$1',[sceneId])).rows[0].next);
      const row = (await client.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,$4) returning id,scene_id,title,position,plan_revision',[randomUUID(),sceneId,title.trim(),position])).rows[0];
      await client.query('COMMIT'); return row;
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  async renameProject(id: string, name: string) { if (!name?.trim()) throw new Error('INVALID_PROJECT_NAME'); const r=await this.pool.query('update projects set name=$2 where id=$1 returning id,name,created_at',[id,name.trim()]); if(!r.rowCount) throw new Error('PROJECT_NOT_FOUND'); return r.rows[0]; }
  async renameScene(id: string, title: string) { if (!title?.trim()) throw new Error('INVALID_SCENE_TITLE'); const r=await this.pool.query('update scenes set title=$2 where id=$1 returning id,project_id,title,position',[id,title.trim()]); if(!r.rowCount) throw new Error('SCENE_NOT_FOUND'); return r.rows[0]; }
  async renameShot(id: string, title: string, durationSeconds?: number) { if (!title?.trim()) throw new Error('INVALID_SHOT_TITLE'); if (durationSeconds !== undefined && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) throw new Error('INVALID_SHOT_DURATION'); const r=await this.pool.query('update shots set title=$2,duration_seconds=coalesce($3,duration_seconds),plan_revision=plan_revision+1 where id=$1 returning id,scene_id,title,position,duration_seconds,plan_revision',[id,title.trim(),durationSeconds ?? null]); if(!r.rowCount) throw new Error('SHOT_NOT_FOUND'); return r.rows[0]; }
  async saveShotPrompt(id: string, prompt: Record<string, unknown>) { if (!prompt || typeof prompt !== 'object' || Array.isArray(prompt)) throw new Error('INVALID_SHOT_PROMPT'); const r=await this.pool.query('update shots set director_prompt=$2,prompt_revision=prompt_revision+1,plan_revision=plan_revision+1 where id=$1 returning id,prompt_revision,plan_revision,director_prompt',[id,prompt]); if(!r.rowCount) throw new Error('SHOT_NOT_FOUND'); return r.rows[0]; }
  async reorderShots(sceneId: string, shotIds: string[]) {
    if (!Array.isArray(shotIds) || shotIds.length < 1 || shotIds.some((id) => typeof id !== 'string' || !id)) throw new Error('INVALID_SHOT_ORDER');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (!(await client.query('select 1 from scenes where id=$1', [sceneId])).rowCount) throw new Error('SCENE_NOT_FOUND');
      const rows = (await client.query('select id from shots where scene_id=$1 order by position', [sceneId])).rows.map((row) => row.id as string);
      if (rows.length !== shotIds.length || new Set(shotIds).size !== shotIds.length || rows.some((id) => !shotIds.includes(id))) throw new Error('SHOT_ORDER_MISMATCH');
      await client.query('update shots set position=position+$2 where scene_id=$1', [sceneId, rows.length + 1]);
      for (const [index, shotId] of shotIds.entries()) await client.query('update shots set position=$2 where id=$1 and scene_id=$3', [shotId, index + 1, sceneId]);
      await client.query('COMMIT');
      return (await client.query('select id,scene_id,title,position,plan_revision,duration_seconds from shots where scene_id=$1 order by position', [sceneId])).rows;
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  async listJobs(state?: string) { return (await this.pool.query(`select j.id,j.state,j.plan_hash,j.adapter_id,j.created_at,sh.title as shot_title,sc.title as scene_title,p.name as project_name,a.id as attempt_id,a.state as attempt_state,a.lease_expires_at,a.heartbeat_seq,a.error_detail from jobs j join shots sh on sh.id=j.shot_id join scenes sc on sc.id=sh.scene_id join projects p on p.id=sc.project_id left join lateral (select id,state,lease_expires_at,heartbeat_seq,error_detail from attempts where job_id=j.id order by created_at desc limit 1) a on true ${state ? 'where j.state=$1' : ''} order by j.created_at desc limit 100`, state ? [state] : [])).rows; }
  async getProject(projectId: string) {
    const project = (await this.pool.query('select id,name,created_at from projects where id=$1',[projectId])).rows[0]; if (!project) return null;
    const timeline = await this.getTimeline(projectId);
    const jobs = (await this.pool.query(`select j.id,j.state,j.plan_hash,j.adapter_id,j.created_at,j.cancel_requested_at,sh.id as shot_id,sh.title as shot_title,sc.id as scene_id,sc.title as scene_title,a.id as attempt_id,a.state as attempt_state,a.error_detail from jobs j join shots sh on sh.id=j.shot_id join scenes sc on sc.id=sh.scene_id left join lateral (select id,state,error_detail from attempts where job_id=j.id order by created_at desc limit 1) a on true where sc.project_id=$1 order by j.created_at desc`,[projectId])).rows;
    return { ...project, scenes: timeline, jobs };
  }
  async getJobResult(jobId: string) {
    const result = await this.pool.query(`select a.id as attempt_id,a.state as attempt_state,a.error_detail,m.manifest_hash,m.manifest,so.asset_version_id as selected_asset_version_id,so.selected_by,so.selected_at,
      coalesce(jsonb_agg(jsonb_build_object('id',av.id,'logicalName',aa.logical_name,'sha256',av.sha256,'mimeType',av.mime_type,'byteSize',av.byte_size,'storageKey',av.storage_key,'provenance',av.provenance,'asset_kind',av.asset_kind,'tags',av.tags) order by aa.logical_name) filter (where av.id is not null),'[]'::jsonb) as assets
      from attempts a left join attempt_manifests m on m.attempt_id=a.id left join job_selected_outputs so on so.job_id=a.job_id left join attempt_assets aa on aa.attempt_id=a.id left join asset_versions av on av.id=aa.asset_version_id
      where a.job_id=$1 group by a.id,m.manifest_hash,m.manifest,so.asset_version_id,so.selected_by,so.selected_at order by a.created_at desc limit 1`, [jobId]);
    return result.rows[0] ? { ...result.rows[0], job_id: jobId } : null;
  }
  async selectJobOutput(jobId: string, assetVersionId: string, actor: string) { if (!actor) throw new Error('INVALID_ACTOR'); const result=await this.pool.query(`insert into job_selected_outputs(job_id,asset_version_id,selected_by) select $1,$2,$3 where exists(select 1 from attempts a join attempt_assets aa on aa.attempt_id=a.id where a.job_id=$1 and aa.asset_version_id=$2) on conflict(job_id) do update set asset_version_id=excluded.asset_version_id,selected_by=excluded.selected_by,selected_at=now() returning job_id,asset_version_id,selected_by,selected_at`,[jobId,assetVersionId,actor]); if (!result.rowCount) throw new Error('ASSET_NOT_LINKED_TO_JOB'); return result.rows[0]; }
  async listAssets(projectId?: string) {
    const query = projectId ? `select distinct av.id,av.sha256,av.byte_size,av.mime_type,av.storage_key,av.provenance,av.asset_kind,av.tags,av.created_at from asset_versions av join attempt_assets aa on aa.asset_version_id=av.id join attempts a on a.id=aa.attempt_id join jobs j on j.id=a.job_id join shots sh on sh.id=j.shot_id join scenes sc on sc.id=sh.scene_id where sc.project_id=$1 order by av.created_at desc` : 'select id,sha256,byte_size,mime_type,storage_key,provenance,asset_kind,tags,created_at from asset_versions order by created_at desc';
    return (await this.pool.query(query, projectId ? [projectId] : [])).rows;
  }
  async saveWorkflowProfile(profile: H3WorkflowProfile) { const client=await this.pool.connect(); try { await client.query('BEGIN'); const bindings=profile.referenceBindings ?? {}; const result=await client.query(`insert into workflow_profiles(id,name,graph,graph_hash,boundary,reference_bindings,active) values($1,$2,$3,$4,$5,$6,false) on conflict(id) do update set name=excluded.name,graph=excluded.graph,graph_hash=excluded.graph_hash,boundary=excluded.boundary,reference_bindings=excluded.reference_bindings,active=false returning id,name,graph_hash,boundary,reference_bindings,created_at,active`,[profile.id,profile.name,profile.graph,profile.graphHash,profile.boundary,bindings]); const next=await client.query('select coalesce(max(revision),0)+1 as revision from workflow_profile_revisions where profile_id=$1',[profile.id]); await client.query('insert into workflow_profile_revisions(profile_id,revision,graph,graph_hash,boundary,reference_bindings) values($1,$2,$3,$4,$5,$6)',[profile.id,next.rows[0].revision,profile.graph,profile.graphHash,profile.boundary,bindings]); await client.query('COMMIT'); return {...result.rows[0],revision:Number(next.rows[0].revision)}; } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); } }
  async saveWorkbenchProfile(profile: { id: string; name: string; kind: string; graph: Record<string, unknown>; graphHash: string; boundary: Record<string, unknown> }) {
    const client=await this.pool.connect(); try { await client.query('BEGIN'); const bindings={ workbenchKind: profile.kind }; const result=await client.query(`insert into workflow_profiles(id,name,graph,graph_hash,boundary,reference_bindings,active) values($1,$2,$3,$4,$5,$6,false) on conflict(id) do update set name=excluded.name,graph=excluded.graph,graph_hash=excluded.graph_hash,boundary=excluded.boundary,reference_bindings=excluded.reference_bindings,active=false returning id,name,graph_hash,boundary,reference_bindings,created_at,active`,[profile.id,profile.name,profile.graph,profile.graphHash,profile.boundary,bindings]); const next=await client.query('select coalesce(max(revision),0)+1 as revision from workflow_profile_revisions where profile_id=$1',[profile.id]); await client.query('insert into workflow_profile_revisions(profile_id,revision,graph,graph_hash,boundary,reference_bindings) values($1,$2,$3,$4,$5,$6)',[profile.id,next.rows[0].revision,profile.graph,profile.graphHash,profile.boundary,bindings]); await client.query('COMMIT'); return {...result.rows[0],revision:Number(next.rows[0].revision)}; } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  private profileReadModel(row: any) {
    try { const derived=createH3WorkflowProfile(row.id,row.name,row.graph,row.reference_bindings ?? undefined); return { ...row, quality_hint: derived.qualityHint, sampling_steps: derived.samplingSteps, loras: derived.loras }; }
    catch { return row; }
  }
  async listWorkflowProfiles() { return (await this.pool.query('select id,name,graph,graph_hash,boundary,reference_bindings,created_at,active,(select max(revision) from workflow_profile_revisions r where r.profile_id=workflow_profiles.id) as revision from workflow_profiles where active=true order by created_at desc')).rows.map((row) => this.profileReadModel(row)); }
  async getWorkflowProfile(id: string) { const row=(await this.pool.query('select id,name,graph,graph_hash,boundary,reference_bindings,created_at,active from workflow_profiles where id=$1',[id])).rows[0]; return row ? this.profileReadModel(row) : null; }
  async activateWorkflowProfile(id: string) { const result=await this.pool.query('update workflow_profiles set active=true where id=$1 returning id,name,graph_hash,boundary,created_at,active',[id]); return result.rows[0] ?? null; }
  async listWorkflowProfileRevisions(id: string) { return (await this.pool.query('select profile_id,revision,graph,graph_hash,boundary,reference_bindings,created_at from workflow_profile_revisions where profile_id=$1 order by revision desc',[id])).rows; }
  async activateWorkflowProfileRevision(id: string, revision: number) { const client=await this.pool.connect(); try { await client.query('BEGIN'); const revisionResult=await client.query('select graph,graph_hash,boundary,reference_bindings from workflow_profile_revisions where profile_id=$1 and revision=$2',[id,revision]); if (!revisionResult.rowCount) { await client.query('ROLLBACK'); return null; } const row=revisionResult.rows[0]; const result=await client.query('update workflow_profiles set graph=$2,graph_hash=$3,boundary=$4,reference_bindings=$5,active=true where id=$1 returning id,name,graph_hash,boundary,reference_bindings,created_at,active',[id,row.graph,row.graph_hash,row.boundary,row.reference_bindings]); await client.query('COMMIT'); return result.rows[0] ?? null; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } }

  async uploadAsset(attemptId: string, fencingToken: number, logicalName: string, bytes: Uint8Array, sha256: string, mimeType: string, storage: AssetStorage) {
    if (!logicalName || logicalName.length > 200 || logicalName.includes('/')) throw new Error('INVALID_LOGICAL_NAME');
    const stagingKey = await storage.beginStaging(attemptId);
    try { await (storage as AssetStorage & { writeStaging(key: string, bytes: Uint8Array): Promise<void> }).writeStaging(stagingKey, bytes); } catch (error) { await storage.discardStaging?.(stagingKey); throw error; }
    let blob; try { blob = await storage.commitStaging(stagingKey, sha256, mimeType); } catch (error) { await storage.discardStaging?.(stagingKey); throw error; }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const attempt = (await client.query("select job_id,state from attempts where id=$1 and fencing_token=$2 for update", [attemptId, fencingToken])).rows[0];
      if (!attempt || !['leased','running'].includes(attempt.state)) throw new Error('FENCING_REJECTED_OR_INVALID_STATE');
      const asset = (await client.query(`insert into asset_versions(id,sha256,byte_size,mime_type,storage_key,provenance) values($1,$2,$3,$4,$5,$6)
        on conflict(sha256) do update set sha256=excluded.sha256 returning id,sha256,byte_size,mime_type,storage_key`, [randomUUID(), blob.sha256, blob.byteSize, blob.mimeType, blob.storageKey, { attemptId, fencingToken, logicalName }])).rows[0];
      await client.query('insert into attempt_assets(attempt_id,asset_version_id,logical_name) values($1,$2,$3)', [attemptId, asset.id, logicalName]);
      await client.query('COMMIT');
      return { assetVersionId: asset.id, logicalName, ...blob };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async importAsset(logicalName: string, bytes: Uint8Array, sha256: string, mimeType: string, actor: string, storage: AssetStorage, assetKind = 'reference', tags: string[] = [], derivedFromAssetVersionIds: string[] = []) {
    if (!logicalName || logicalName.length > 200 || logicalName.includes('/') || !actor) throw new Error('INVALID_ASSET_IMPORT');
    if (!['actor','scene','prop','audio','layout','reference','video','other'].includes(assetKind) || tags.some((tag) => typeof tag !== 'string' || tag.length > 40) || derivedFromAssetVersionIds.some((id) => typeof id !== 'string')) throw new Error('INVALID_ASSET_METADATA');
    if (derivedFromAssetVersionIds.length) { const found = await this.pool.query('select id from asset_versions where id = any($1::uuid[])', [derivedFromAssetVersionIds]); if (found.rowCount !== new Set(derivedFromAssetVersionIds).size) throw new Error('LINEAGE_PARENT_NOT_FOUND'); }
    const stagingKey = await storage.beginStaging(`import-${randomUUID()}`);
    try { await (storage as AssetStorage & { writeStaging(key: string, bytes: Uint8Array): Promise<void> }).writeStaging(stagingKey, bytes); } catch (error) { await storage.discardStaging?.(stagingKey); throw error; }
    let blob; try { blob = await storage.commitStaging(stagingKey, sha256, mimeType); } catch (error) { await storage.discardStaging?.(stagingKey); throw error; }
    const result = await this.pool.query(`insert into asset_versions(id,sha256,byte_size,mime_type,storage_key,provenance,asset_kind,tags) values($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict(sha256) do update set sha256=excluded.sha256 returning id,sha256,byte_size,mime_type,storage_key`, [randomUUID(), blob.sha256, blob.byteSize, blob.mimeType, blob.storageKey, { actor, logicalName, source:'operator-import', assetKind, tags, derivedFromAssetVersionIds }, assetKind, JSON.stringify(tags)]);
    return { assetVersionId: result.rows[0].id, logicalName, ...blob };
  }
}
