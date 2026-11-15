import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { compileDirectorPrompt, compileH3BasePrompt, compileH3Fl2VAPrompt, compileH3Ref2VAPrompt, compileQwenImageEditPrompt, getDirectorPromptCompleteness, type DirectorPromptFields } from '@qwendirector/contracts/prompt';
import { createH3WorkflowProfile, createH3RefModWorkflowProfile } from '@qwendirector/workflow-adapters/h3-profile';
import { prepareWorkbenchGraph, validateWorkbenchGraph } from '@qwendirector/workflow-adapters/workbench-catalog';
import type { WorkbenchKind } from '@qwendirector/workflow-adapters/workbenches';

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

export class PgJobRepository {
  constructor(private readonly pool: Pool) {}
  async get(id: string) {
    const r = await this.pool.query(`select j.id,j.state,j.plan_hash,j.adapter_id,j.plan_json,j.created_at,j.cancel_requested_at,
      sh.id as shot_id,sh.title as shot_title,sc.id as scene_id,sc.title as scene_title,p.id as project_id,p.name as project_name,
      a.id as attempt_id,a.state as attempt_state,a.fencing_token,a.lease_expires_at,a.heartbeat_seq,a.error_detail
      from jobs j join shots sh on sh.id=j.shot_id join scenes sc on sc.id=sh.scene_id join projects p on p.id=sc.project_id
      left join lateral (select id,state,fencing_token,lease_expires_at,heartbeat_seq,error_detail from attempts where job_id=j.id order by created_at desc limit 1) a on true
      where j.id=$1`, [id]);
    return r.rows[0] ?? null;
  }

  async createDirector(body: { project: string; scene: string; shot: string; projectId?: string; sceneId?: string; shotId?: string; idempotencyKey?: string } & DirectorPromptFields & { adapterId?: string; workflow?: Record<string, any>; workflowProfileId?: string; workflowProfileName?: string; workflowReferenceBindings?: { mode?:'refmod-i2v'|'fl2va-i2v'; imageNodeIds?: string[]; audioNodeIds?: string[]; videoNodeIds?: string[]; workbenchKind?: string; outputBindings?: Record<string,string> }; references?: Array<{assetVersionId:string;filename:string;type?:'image'|'audio'|'video';role?:'picture'|'actor'|'set'|'prop'|'layout'|'first-frame'|'last-frame'|'audio'|'video'}>; width?: number; height?: number; length?: number; seed?: number; origin?: 'user'|'lab'|'system' }) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const quotaRaw = process.env.QWEN_MAX_PENDING_JOBS ?? '0';
      const maxPending = Number(quotaRaw);
      if (!Number.isSafeInteger(maxPending) || maxPending < 0) throw new Error('INVALID_JOB_QUOTA_CONFIG');
      if (maxPending > 0) {
        const pending = await c.query("select count(*)::int as count from jobs where state in ('awaiting_approval','queued','leased','running','cancel_requested','reconciling')");
        if (pending.rows[0].count >= maxPending) throw new Error('JOB_QUOTA_EXCEEDED');
      }
      let projectId = body.projectId, sceneId = body.sceneId, shotId = body.shotId;
      if (projectId || sceneId || shotId) {
        if (!projectId || !sceneId || !shotId) throw new Error('INCOMPLETE_CATALOG_REFERENCE');
        const hierarchy = (await c.query(`select p.id as project_id, s.id as scene_id, sh.id as shot_id from projects p join scenes s on s.project_id=p.id join shots sh on sh.scene_id=s.id where p.id=$1 and s.id=$2 and sh.id=$3`,[projectId,sceneId,shotId])).rows[0];
        if (!hierarchy) throw new Error('CATALOG_REFERENCE_NOT_FOUND');
      } else {
        projectId = randomUUID(); sceneId = randomUUID(); shotId = randomUUID();
        await c.query('insert into projects(id,name) values($1,$2)', [projectId, body.project]);
        await c.query('insert into scenes(id,project_id,title,position) values($1,$2,$3,1)', [sceneId, projectId, body.scene]);
        await c.query('insert into shots(id,scene_id,title,position) values($1,$2,$3,1)', [shotId, sceneId, body.shot]);
      }
      const promptCompleteness = getDirectorPromptCompleteness(body);
      const requestHash = createHash('sha256').update(canonicalJson(body)).digest('hex');
      const idem = body.idempotencyKey?.trim() || `director:${shotId}`;
      const prior = (await c.query('select id,state,plan_hash,request_hash from jobs where shot_id=$1 and idempotency_key=$2',[shotId,idem])).rows[0];
      if (prior) { if (prior.request_hash !== requestHash) throw new Error('IDEMPOTENCY_CONFLICT'); await c.query('ROLLBACK'); return { jobId:prior.id,state:prior.state,planHash:prior.plan_hash,replayed:true,projectId,sceneId,shotId }; }
      // Persist the latest director form as the shot's immutable-by-revision prompt
      // before creating the execution plan. This keeps catalog/timeline state in
      // sync with the approved job while preserving prompt revision history.
      await c.query(`update shots
        set director_prompt=$2, prompt_revision=prompt_revision+1, plan_revision=plan_revision+1
        where id=$1`, [shotId, {
          prompt: body.prompt ?? '', camera: body.camera ?? '', action: body.action ?? '',
          composition: body.composition ?? '', lighting: body.lighting ?? '',
          sound: body.sound ?? '', music: body.music ?? '', transition: body.transition ?? '',
        }]);
      let workflowProfile;
      if ((body.adapterId ?? 'llama.cpp') === 'comfyui') {
        let source = body.workflow;
        if (body.workflowProfileId) { const stored=(await c.query('select id,name,graph,graph_hash,boundary,reference_bindings from workflow_profiles where id=$1 and active=true',[body.workflowProfileId])).rows[0]; if (!stored) throw new Error('WORKFLOW_PROFILE_NOT_ACTIVE'); source=stored.graph; body.workflowReferenceBindings = { ...(stored.reference_bindings ?? {}), ...(stored.boundary?.outputBindings ? { outputBindings: stored.boundary.outputBindings } : {}) }; }
        if (!source) throw new Error('INVALID_WORKFLOW_PLAN');
        const workbenchKind = body.workflowReferenceBindings?.workbenchKind;
        if (workbenchKind && ['actor','scene','prop','layout','image-edit','image-generate','refmod-create'].includes(workbenchKind)) {
          source = prepareWorkbenchGraph(workbenchKind as WorkbenchKind, source);
          const validation = validateWorkbenchGraph(workbenchKind as WorkbenchKind, source, undefined, body.workflowReferenceBindings?.outputBindings);
          workflowProfile = { schemaVersion: '1.0', id: body.workflowProfileId ?? `${workbenchKind}-custom`, name: body.workflowProfileName ?? `${workbenchKind} workbench`, graph: source, graphHash: createHash('sha256').update(canonicalJson(source)).digest('hex'), boundary: { workbenchKind, outputBindings: validation.outputBindings }, referenceBindings: body.workflowReferenceBindings, qualityHint: 'unknown', loras: [] };
        } else workflowProfile = body.workflowReferenceBindings?.mode === 'refmod-i2v'
          ? createH3RefModWorkflowProfile(body.workflowProfileId ?? 'h3-refmod-custom', body.workflowProfileName ?? 'H3 RefMod workflow', source, body.workflowReferenceBindings)
          : createH3WorkflowProfile(body.workflowProfileId ?? 'h3-custom', body.workflowProfileName ?? 'H3 workflow', source, body.workflowReferenceBindings);
        const imageNodeCount = Object.values(workflowProfile.graph).filter((node) => node?.class_type === 'LoadImage').length;
        const boundImageCount = workflowProfile.referenceBindings?.imageNodeIds?.length ?? 0;
        if (!workbenchKind && imageNodeCount > boundImageCount) throw new Error('H3_WORKFLOW_IMAGE_BINDINGS_REQUIRED');
      }
      const submittedReferences = Array.isArray((body as any).references) ? (body as any).references : [];
      const references = submittedReferences.length
        ? submittedReferences.map((reference: any) => ({ assetVersionId: reference.assetVersionId, filename: reference.filename, type: reference.type ?? 'image', role: reference.role ?? (reference.type === 'audio' ? 'audio' : reference.type === 'video' ? 'video' : 'picture') }))
        : (await c.query('select asset_version_id as "assetVersionId",logical_name as filename,media_type as type,role from shot_reference_assets where shot_id=$1 order by position', [shotId])).rows;
      if (references.some((reference: any) => typeof reference.assetVersionId !== 'string' || typeof reference.filename !== 'string')) throw new Error('INVALID_REFERENCE_PLAN');
      if (references.some((reference: any) => !['picture','actor','set','prop','layout','first-frame','last-frame','audio','video'].includes(reference.role) || (reference.type === 'audio' && reference.role !== 'audio') || (reference.type === 'video' && reference.role !== 'video') || (reference.type !== 'audio' && reference.type !== 'video' && ['audio','video'].includes(reference.role)) || (['first-frame','last-frame'].includes(reference.role) && reference.type !== 'image'))) throw new Error('INVALID_REFERENCE_ROLE');
      if (references.length) {
        const ids = references.map((reference: any) => reference.assetVersionId);
        const found = await c.query('select id,mime_type from asset_versions where id = any($1::uuid[])', [ids]);
        if (found.rowCount !== new Set(ids).size) throw new Error('REFERENCE_ASSET_NOT_FOUND');
        const mimeById = new Map(found.rows.map((row:any)=>[row.id, String(row.mime_type)]));
        if (references.some((reference:any) => reference.type === 'audio' ? !mimeById.get(reference.assetVersionId)?.startsWith('audio/') : reference.type === 'video' ? !mimeById.get(reference.assetVersionId)?.startsWith('video/') : !mimeById.get(reference.assetVersionId)?.startsWith('image/'))) throw new Error('REFERENCE_MIME_MISMATCH');
      }
      if (workflowProfile && 'workbenchKind' in workflowProfile.boundary && references.some((reference:any) => reference.type !== 'image')) throw new Error('WORKBENCH_REFERENCE_MEDIA_UNSUPPORTED');
      if (workflowProfile?.referenceBindings?.mode === 'refmod-i2v' && references.some((reference:any) => reference.type !== 'image')) throw new Error('H3_REFMOD_REFERENCE_MEDIA_UNSUPPORTED');
      if (workflowProfile && !('workbenchKind' in workflowProfile.boundary) && workflowProfile.boundary.mode === 'fl2va-i2v') {
        const frames = references.filter((reference: any) => reference.type === 'image');
        if (references.length !== 2 || frames.length !== 2 || frames.filter((reference: any) => reference.role === 'first-frame').length !== 1 || frames.filter((reference: any) => reference.role === 'last-frame').length !== 1) throw new Error('H3_FL2VA_FIRST_AND_LAST_FRAME_REFERENCES_REQUIRED');
      }
      if (workflowProfile && !('workbenchKind' in workflowProfile.boundary) && workflowProfile.boundary.mode === 'i2va-i2v') {
        const frames = references.filter((reference: any) => reference.type === 'image');
        if (frames.length !== 1 || frames[0].role !== 'first-frame') throw new Error('H3_I2VA_FIRST_FRAME_REFERENCE_REQUIRED');
      }
      if (workflowProfile && !('workbenchKind' in workflowProfile.boundary)) {
        const bindings = workflowProfile.referenceBindings ?? {};
        if (references.filter((reference:any) => reference.type === 'audio').length > (bindings.audioNodeIds?.length ?? 0)) throw new Error('H3_WORKFLOW_AUDIO_BINDINGS_REQUIRED');
        if (references.filter((reference:any) => reference.type === 'video').length > ((bindings as any).videoNodeIds?.length ?? 0)) throw new Error('H3_WORKFLOW_VIDEO_BINDINGS_REQUIRED');
      }
      const boundaryMode = workflowProfile && !('workbenchKind' in workflowProfile.boundary) ? workflowProfile.boundary.mode : undefined;
      const planLength = boundaryMode === 'fl2va-i2v' || boundaryMode === 'i2va-i2v' ? Number(body.length ?? 124) : body.length;
      const workbenchKind = workflowProfile && 'workbenchKind' in workflowProfile.boundary ? workflowProfile.boundary.workbenchKind : undefined;
      const compiledPrompt = workbenchKind
        ? workbenchKind === 'image-edit' ? compileQwenImageEditPrompt(body, references) : compileDirectorPrompt(body)
        : boundaryMode === 'fl2va-i2v' ? compileH3Fl2VAPrompt(body, Number(planLength))
          : boundaryMode === 'i2va-i2v' ? compileH3BasePrompt(body, { mode: 'i2va' })
          : boundaryMode === undefined || boundaryMode === 'r2v-2stage-veda' ? compileH3Ref2VAPrompt(body, references)
            : compileDirectorPrompt(body);
      const plan = { project: body.project, scene: body.scene, shot: body.shot, catalog: { projectId, sceneId, shotId }, prompt: compiledPrompt, promptCompleteness, width: body.width, height: body.height, length: planLength, seed: body.seed, directorFields: { ...body, references }, references, workflowProfile };
      const planHash = createHash('sha256').update(canonicalJson(plan)).digest('hex');
      const inserted = await c.query(`insert into jobs (id,shot_id,state,plan_hash,idempotency_key,request_hash,required_capabilities,adapter_id,plan_json,origin) values($1,$2,'awaiting_approval',$3,$4,$5,$6,$7,$8,$9) returning id,state`, [randomUUID(), shotId, planHash, idem, requestHash, {}, body.adapterId ?? 'llama.cpp', plan, body.origin ?? 'user']);
      const result = { jobId: inserted.rows[0].id, state: inserted.rows[0].state, planHash, replayed: false };
      await c.query('COMMIT');
      return { ...result, projectId, sceneId, shotId };
    } catch (error) { await c.query('ROLLBACK'); throw error; } finally { c.release(); }
  }

  async create(body: { shotId: string; planHash: string; requestHash: string; idempotencyKey: string; requiredCapabilities?: Record<string, unknown>; adapterId?: string; plan?: Record<string, unknown> }) {
    const inserted = await this.pool.query(`insert into jobs
      (id,shot_id,state,plan_hash,idempotency_key,request_hash,required_capabilities,adapter_id,plan_json)
      values($1,$2,'awaiting_approval',$3,$4,$5,$6,$7,$8)
      on conflict(shot_id,idempotency_key) do nothing returning *`,
    [randomUUID(),body.shotId,body.planHash,body.idempotencyKey,body.requestHash,body.requiredCapabilities ?? {},body.adapterId ?? null,body.plan ?? {}]);
    const row = inserted.rows[0] ?? (await this.pool.query(
      'select * from jobs where shot_id=$1 and idempotency_key=$2', [body.shotId,body.idempotencyKey])).rows[0];
    if (row.plan_hash !== body.planHash || row.request_hash !== body.requestHash) throw new Error('IDEMPOTENCY_CONFLICT');
    return { jobId: row.id, state: row.state, replayed: !inserted.rowCount };
  }

  async approve(id: string, planHash: string, actor: string, retryBudget = 0) {
    if (!actor || !Number.isSafeInteger(retryBudget) || retryBudget < 0) throw new Error('INVALID_INPUT');
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const row = (await c.query('select * from jobs where id=$1 for update',[id])).rows[0];
      if (!row) throw new Error('NOT_FOUND');
      if (row.plan_hash !== planHash) throw new Error('APPROVAL_REQUIRED');
      if (row.state !== 'awaiting_approval') throw new Error('INVALID_STATE');
      await c.query('insert into approvals(id,job_id,plan_hash,approved_by,retry_budget) values($1,$2,$3,$4,$5)',[randomUUID(),id,planHash,actor,retryBudget]);
      await c.query("update jobs set state='queued' where id=$1",[id]);
      await c.query('COMMIT');
      return { jobId:id, state:'queued' };
    } catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }

  async cancel(id: string) {
    const r = await this.pool.query(`update jobs set state=case when state in ('leased','running','cancel_requested')
      then 'cancel_requested' else 'cancelled' end, cancel_requested_at=now()
      where id=$1 and state in ('draft','awaiting_approval','queued','leased','running','cancel_requested','cancelled') returning state`,[id]);
    if (!r.rowCount) throw new Error('INVALID_STATE');
    return { jobId:id, state:r.rows[0].state };
  }

  async retry(id: string, actor: string) {
    if (!actor?.trim()) throw new Error('INVALID_ACTOR');
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const job = (await c.query('select state from jobs where id=$1 for update', [id])).rows[0];
      if (!job) throw new Error('NOT_FOUND');
      if (job.state !== 'failed') throw new Error('INVALID_STATE');
      const approval = (await c.query('select retry_budget from approvals where job_id=$1 order by approved_at desc limit 1', [id])).rows[0];
      const budget = Number(approval?.retry_budget ?? 0);
      const failures = Number((await c.query("select count(*)::int as count from attempts where job_id=$1 and state='failed'", [id])).rows[0].count);
      if (failures > budget) throw new Error('RETRY_BUDGET_EXHAUSTED');
      await c.query("update jobs set state='awaiting_approval' where id=$1", [id]);
      await c.query('COMMIT');
      return { jobId:id, state:'awaiting_approval', remainingRetryBudget:Math.max(0, budget - failures) };
    } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
}
