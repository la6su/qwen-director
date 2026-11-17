<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import WorkflowWizard from './components/WorkflowWizard.vue';
import AssetWorkbench from './components/AssetWorkbench.vue';
import PlannerAssist from './components/PlannerAssist.vue';
import { normalizeComfyWorkflow } from './workflow-import';
import { compactImageEditReferences } from './image-edit-references';
import type { DirectorTimelinePlan, PlannerContinuityAudit, PlannerContinuityContext } from '@qwendirector/contracts/planner';
import { compileH3BasePrompt, compileH3Ref2VAPrompt, inspectH3Prompt } from '@qwendirector/contracts/prompt';
import { normalizeH3EventPlan, reviewH3EventCausality, type H3EventPlan } from '@qwendirector/contracts/h3-event-plan';
import { alignMiniMaxH3Frames } from '@qwendirector/contracts/cinematic';
import { minimaxDirectorMediaKey, parseMiniMaxDirectorTimeline } from '@qwendirector/workflow-adapters/minimax-director-timeline';

const prompt = ref('');
const apiToken = ref(localStorage.getItem('qwen-api-token') ?? '');
function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (apiToken.value) headers.set('authorization', `Bearer ${apiToken.value}`);
  return window.fetch(input, { ...init, headers });
}
const fetch = apiFetch;
const camera = ref(''); const action = ref(''); const composition = ref(''); const lighting = ref(''); const sound = ref(''); const music = ref(''); const transition = ref('');
const montage = ref<{shotScale:string;cameraAxisDeg:string;screenDirection:string;actionPhase:string;focalX:string;focalY:string;lightDirection:string;colorBridge:string;motionTempo:string}>({shotScale:'',cameraAxisDeg:'',screenDirection:'',actionPhase:'',focalX:'',focalY:'',lightDirection:'',colorBridge:'',motionTempo:''});
type H3EventDraft = H3EventPlan['events'][number];
const h3EventPlanEnabled = ref(false);
const h3Events = ref<H3EventDraft[]>([]);
const h3EventPlan = computed<H3EventPlan | null>(() => {
  if (!h3EventPlanEnabled.value) return null;
  try { return normalizeH3EventPlan({ schemaVersion:'qwendirector-h3-event-plan/v1', frameRate:24, frameCount:h3Length.value, events:h3Events.value }, h3Length.value); }
  catch { return null; }
});
const h3EventCausalityReview = computed(() => h3EventPlan.value ? reviewH3EventCausality(h3EventPlan.value) : null);
const h3EventPlanError = computed(() => h3EventPlanEnabled.value && !h3EventPlan.value ? 'События должны непрерывно покрывать весь шот кадрами 0…N, каждое длится минимум 5 кадров и содержит действие и видимое конечное состояние.' : '');
const adapterId = ref('llama.cpp'); const width = ref(1280); const height = ref(720); const durationSeconds = ref(5); const seed = ref<number | undefined>(); const workflowJson = ref(''); const workflowWorkbenchKind = ref<string>(); const workflowOutputBindings = ref<Record<string,string>>({});
const retryBudget = ref(1);
const h3Length = computed(() => alignMiniMaxH3Frames(Math.max(124, Math.round((Number(durationSeconds.value) || 0) * 24))));
watch(h3Length, (next, previous) => { const last=h3Events.value.at(-1); if (h3EventPlanEnabled.value && last?.endFrame === previous) last.endFrame=next; });
const h3MemoryWarning = computed(() => activeH3Workflow.value && h3Length.value > 56);
const imageNodeIds = ref(''); const audioNodeIds = ref(''); const videoNodeIds = ref('');
const profileName = ref('PVE H3 profile');
const project = ref('Новый проект');
const scene = ref('Сцена 01');
const shot = ref('Shot 01');
const status = ref('idle');
const result = ref('');
const plannerDecision = ref<{ sections: Record<string, string>; continuityAudit: PlannerContinuityAudit; continuityContext?: PlannerContinuityContext; continuityContextHash?: string; decisionHash: string; sessionId: string; provenance: { source: string; model?: string; toolsUsed?: string[]; createdAt: string } } | null>(null);
const job = ref<{ id: string; planHash: string } | null>(null);
const timeline = ref<any[]>([]);
const directorTimeline = ref<DirectorTimelinePlan | null>(null);
const projectId = ref('');
const projects = ref<Array<{id:string;name:string}>>([]);
const projectFilter = ref('');
const editorTab = ref<'brief' | 'direction' | 'generation'>('brief');
const inspectorTab = ref<'references' | 'takes'>('references');
const visibleProjects = computed(() => { const query = projectFilter.value.trim().toLowerCase(); if (!query) return projects.value; return projects.value.filter((item) => item.id === projectId.value || item.name.toLowerCase().includes(query)); });
const selectedShotId = ref('');
const selectedSceneId = ref('');
const selectedAssetIds = ref<string[]>([]);
const referenceRoles = ref<Record<string, string>>({});
const shotReferencesEdited = ref(false);
const importingAsset = ref(false);
const importAssetKind = ref('reference');
const importAssetTags = ref('');
const resultPayload = ref<any>(null);
const selectedJobAttempts = ref<any[]>([]);
const selectedJobId = ref('');
const previewAsset = ref<any>(null);
const previewUrl = ref('');
const runtimes = ref<Array<{id:string;ok:boolean;latencyMs:number;capabilities?:{h3?:boolean;classes?:string[];optimizationNodes?:string[];h3Loras?:string[]};resources?:{vramDevices:Array<{name:string;totalBytes:number;freeBytes:number}>}}>>([]);
const comfySchemaClasses = ref<string[]>([]);
const nodes = ref<Array<{id:string;instance_id:string;status:string;heartbeat_at:string;capabilities?:Record<string,unknown>}>>([]);
const nodeHeartbeatStaleAfterMs = 30_000;
function isNodeFresh(node: (typeof nodes.value)[number]) { const heartbeatAt = Date.parse(node.heartbeat_at); return node.status === 'online' && Number.isFinite(heartbeatAt) && Date.now() - heartbeatAt <= nodeHeartbeatStaleAfterMs; }
const onlineNodeCount = computed(() => nodes.value.filter(isNodeFresh).length);
const staleNodeCount = computed(() => nodes.value.filter((node) => !isNodeFresh(node)).length);
const workflowProfiles = ref<Array<{id:string;name:string;graph:Record<string,unknown>;boundary:unknown;reference_bindings?:Record<string,any>;graphHash?:string;graph_hash?:string;quality_hint?:string;sampling_steps?:number;loras?:string[];model_stack?:Array<{role:string;nodeClass:string;name:string}>}>>([]);
const selectedWorkflowProfile = computed(() => workflowProfiles.value.find((profile) => profile.id === selectedProfileId.value));
const activeWorkbenchKind = computed(() => selectedWorkflowProfile.value?.reference_bindings?.workbenchKind ?? workflowWorkbenchKind.value);
const activeWorkflowClasses = computed(() => {
  const graph = selectedWorkflowProfile.value?.graph;
  if (graph) return Object.values(graph).map((node: any) => node?.class_type).filter((value): value is string => typeof value === 'string');
  try { return Object.values(JSON.parse(workflowJson.value) as Record<string, any>).map((node) => node?.class_type).filter((value): value is string => typeof value === 'string'); }
  catch { return []; }
});
const activeEngineLabel = computed(() => {
  if (adapterId.value !== 'comfyui') return adapterId.value;
  if (activeWorkbenchKind.value === 'image-edit' || activeWorkbenchKind.value === 'image-generate') return 'Qwen Image 2.1';
  if (activeWorkbenchKind.value) return `ComfyUI · ${activeWorkbenchKind.value}`;
  return activeWorkflowClasses.value.some((name) => name === 'MiniMaxH3ReferenceToVideo' || name === 'MiniMaxH3ImageToVideo') ? 'MiniMax H3' : 'ComfyUI';
});
const activeH3Workflow = computed(() => adapterId.value === 'comfyui' && activeWorkflowClasses.value.some((name) => name === 'MiniMaxH3ReferenceToVideo' || name === 'MiniMaxH3ImageToVideo'));
const workflowProfileCandidates = ref<Array<{id:string;name:string;graphHash?:string;graph_hash?:string;active:boolean;revision:number;quality_hint?:string;sampling_steps?:number;model_stack?:Array<{role:string;nodeClass:string;name:string}>;reference_bindings?:Record<string,any>}>>([]);
const profileRevisions = ref<Array<{revision:number;graph_hash:string;created_at:string;boundary?:unknown}>>([]);
const jobs = ref<Array<{id:string;state:string;project_name:string;scene_title:string;shot_title:string;adapter_id:string;plan_hash:string;attempt_id?:string;attempt_state?:string;lease_expires_at?:string;heartbeat_seq?:number;error_detail?:string;created_at?:string}>>([]);
const jobStateFilter = ref('all');
const visibleJobs = computed(() => jobStateFilter.value === 'all' ? jobs.value : jobs.value.filter((item) => item.state === jobStateFilter.value));
const jobStateLabels: Record<string, string> = {
  awaiting_approval: 'Ожидает утверждения',
  queued: 'В очереди',
  leased: 'Назначена',
  running: 'Выполняется',
  cancel_requested: 'Отменяется',
  reconciling: 'Требует проверки',
  unknown: 'Результат не подтверждён',
  succeeded: 'Готова',
  failed: 'Ошибка',
  cancelled: 'Отменена',
};
function jobStateLabel(value: string) { return jobStateLabels[value] ?? value; }
function profileModelLabel(profile: {model_stack?: Array<{role:string;name:string}>; quality_hint?:string; sampling_steps?:number; graphHash?:string; graph_hash?:string}) { const stack=(profile.model_stack ?? []).filter((item)=>item.role==='diffusion'||item.role==='lora').map((item)=>item.name); const model=stack.join(' + ') || profile.quality_hint || (profile.graphHash ?? profile.graph_hash ?? '').slice(0,12); return Number.isSafeInteger(profile.sampling_steps) && Number(profile.sampling_steps) > 0 ? `${model} · ${profile.sampling_steps} steps` : model; }
function leaseLabel(value?: string) { if (!value) return ''; const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000); return seconds <= 0 ? 'lease истёк' : `lease ещё ${seconds} с`; }
const statusLabels: Record<string, string> = {
  idle: 'Готово к работе',
  submitting: 'Создаём задачу…',
  'awaiting approval': 'Ожидает утверждения',
  queued: 'В очереди',
  leased: 'Назначена исполнителю',
  running: 'Генерация…',
  succeeded: 'Готово',
  failed: 'Ошибка',
  cancelled: 'Отменено',
  error: 'Ошибка',
  'profile ready': 'Профиль готов',
  'profile preflight failed': 'Профиль не прошёл проверку',
};
const visibleStatus = computed(() => statusLabels[status.value] ?? status.value);
const selectedProfileId = ref('');
const preflightQualityHint = ref('');
const preflightOptimizationNodes = ref<string[]>([]);
watch(selectedProfileId, () => {
  preflightQualityHint.value = ''; preflightOptimizationNodes.value = [];
  const profile = workflowProfiles.value.find((item) => item.id === selectedProfileId.value);
  if (profile?.reference_bindings?.workbenchKind !== 'image-generate') return;
  const latent = Object.values(profile.graph).find((node: any) => node?.class_type === 'EmptyLatentImage') as any;
  if (Number.isFinite(Number(latent?.inputs?.width)) && Number.isFinite(Number(latent?.inputs?.height))) {
    width.value = Number(latent.inputs.width); height.value = Number(latent.inputs.height);
  }
});
watch(adapterId, () => { preflightQualityHint.value = ''; preflightOptimizationNodes.value = []; });
const selectedProfileIsTurbo = computed(() => { const profile = workflowProfiles.value.find((item) => item.id === selectedProfileId.value); return Object.values(profile?.graph ?? {}).some((node: any) => node?.class_type === 'LoraLoaderModelOnly' && String(node?.inputs?.lora_name ?? '').toLowerCase().includes('turbo')); });
const comfyReady = computed(() => runtimes.value.find((runtime) => runtime.id === 'comfyui')?.ok !== false);
const comfyVramSummary = computed(() => (runtimes.value.find((runtime) => runtime.id === 'comfyui')?.resources?.vramDevices ?? []).map((device) => `${device.name}: ${(device.freeBytes / 1024 ** 3).toFixed(1)} / ${(device.totalBytes / 1024 ** 3).toFixed(1)} GiB свободно`).join(' · '));
const mediaPool = computed(() => timeline.value.flatMap((sceneItem: any) => sceneItem.shots.flatMap((shotItem: any) => shotItem.assets ?? [])));
const globalAssets = ref<any[]>([]);
const allMediaAssets = computed(() => [...mediaPool.value, ...globalAssets.value.filter((asset)=>!mediaPool.value.some((item:any)=>item.id===asset.id))]);
const directorTimelineUnplannedCount = computed(() => directorTimeline.value?.segments.filter((segment) => segment.timingStatus === 'catalog-duration-unplanned').length ?? 0);
const directorTimelineInvalidCount = computed(() => directorTimeline.value?.segments.filter((segment) => segment.timingStatus === 'catalog-duration-invalid-event-plan').length ?? 0);
const directorTimelineReviewJoinCount = computed(() => directorTimeline.value?.segments.filter((segment) => segment.joinToNext?.reviewStatus === 'review-required').length ?? 0);
const directorTimelineMissingJoinDataCount = computed(() => directorTimeline.value?.segments.filter((segment) => segment.joinToNext?.reviewStatus === 'insufficient-metadata').length ?? 0);
function directorFrameTimecode(frame: number) { const seconds=frame/24; const minutes=Math.floor(seconds/60); return `${String(minutes).padStart(2,'0')}:${(seconds-minutes*60).toFixed(2).padStart(5,'0')}`; }
function directorTimelineStatus(status: DirectorTimelinePlan['segments'][number]['timingStatus']) { return status==='event-plan'?'события размечены':status==='event-plan-overrides-catalog-duration'?'длина отличается от каталога':status==='catalog-duration-invalid-event-plan'?'план событий повреждён':'события не размечены'; }
const aimixerTimeline = ref<ReturnType<typeof parseMiniMaxDirectorTimeline> | null>(null);
const aimixerMapping = ref<Record<string, string>>({});
const aimixerSourceName = ref(''); const aimixerImportBusy = ref(false); const aimixerImportError = ref('');
const aimixerUploadingKey = ref('');
const aimixerMedia = computed(() => aimixerTimeline.value?.unresolvedMedia ?? []);
function aimixerMediaAssets(media: (typeof aimixerMedia.value)[number]) {
  const prefix = media.kind === 'image' ? 'image/' : media.kind === 'video' ? 'video/' : 'audio/';
  return allMediaAssets.value.filter((asset: any) => String(asset.mimeType ?? asset.mime_type ?? '').startsWith(prefix));
}
function aimixerAssetId(media: (typeof aimixerMedia.value)[number], asset: any) {
  const key = minimaxDirectorMediaKey(media);
  aimixerMapping.value = { ...aimixerMapping.value, [key]: asset?.id ?? '' };
}
function setAimixerAsset(media: (typeof aimixerMedia.value)[number], event: Event) {
  const id = (event.target as HTMLSelectElement).value;
  aimixerAssetId(media, aimixerMediaAssets(media).find((asset: any) => asset.id === id));
}
async function importAimixerReference(media: (typeof aimixerMedia.value)[number], event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  const key = minimaxDirectorMediaKey(media); aimixerUploadingKey.value = key; aimixerImportError.value = '';
  try {
    const expected = `${media.kind}/`;
    if (!file.type.startsWith(expected)) throw new Error(`Ожидается файл типа ${expected}*`);
    const maxBytes = 100 * 1024 * 1024;
    if (file.size > maxBytes) throw new Error('Файл больше лимита импорта 100 MiB');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map((value) => value.toString(16).padStart(2, '0')).join('');
    let binary = ''; const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    const response = await fetch('/v1/assets/import', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ logicalName:file.name, sha256, mimeType:file.type, contentBase64:btoa(binary), actor:'local-ui', assetKind:media.kind === 'image' ? 'reference' : media.kind, tags:['aimixer-reference'] }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.code ?? 'AIMIXER_REFERENCE_IMPORT_FAILED');
    await loadGlobalAssets();
    aimixerMapping.value = { ...aimixerMapping.value, [key]: body.assetVersionId };
  } catch (error) { aimixerImportError.value = String((error as Error).message ?? error); }
  finally { aimixerUploadingKey.value = ''; input.value = ''; }
}
async function readAimixerWorkflow(event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  aimixerImportError.value = ''; aimixerTimeline.value = null; aimixerMapping.value = {};
  try {
    const workflow = JSON.parse(await file.text());
    const node = workflow.nodes?.find((item: any) => item.type === 'MiniMaxH3Director');
    if (!node) throw new Error('В workflow не найдена нода MiniMaxH3Director');
    const values = node.widgets_values_named?.timeline_data ?? node.properties?.widgets_values_named?.timeline_data ?? node.widgets_values ?? [];
    const candidates = Array.isArray(values) ? values : [values]; let timeline: ReturnType<typeof parseMiniMaxDirectorTimeline> | null = null;
    for (const value of candidates) {
      try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; if (parsed?.version === 5) { timeline = parseMiniMaxDirectorTimeline(parsed); break; } } catch { /* skip other widget values */ }
    }
    if (!timeline) throw new Error('Не найден поддерживаемый timeline v5');
    aimixerTimeline.value = timeline; aimixerSourceName.value = file.name;
    for (const media of timeline.unresolvedMedia) {
      const basename = media.fileName.split('/').pop() ?? media.fileName;
      const cliName = `aimixer-${media.kind}-${basename.replace(/[^a-zA-Z0-9._-]/g, '_')}`.slice(0, 200);
      const matches = aimixerMediaAssets(media).filter((asset: any) => [basename, cliName].includes(asset.provenance?.logicalName ?? asset.logicalName));
      if (matches.length === 1) aimixerAssetId(media, matches[0]);
    }
  } catch (error) { aimixerImportError.value = String((error as Error).message ?? error); }
  input.value = '';
}
async function importAimixerTimeline() {
  if (!aimixerTimeline.value || !selectedSceneId.value || aimixerMedia.value.some((media) => !aimixerMapping.value[minimaxDirectorMediaKey(media)])) return;
  aimixerImportBusy.value = true; aimixerImportError.value = '';
  try {
    const response = await fetch(`/v1/scenes/${selectedSceneId.value}/aimixer/import`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ timeline:aimixerTimeline.value.source, assetVersionByMediaKey:aimixerMapping.value }) });
    const body = await response.json(); result.value = JSON.stringify(body, null, 2);
    if (!response.ok) throw new Error(body.code ?? 'AIMIXER_IMPORT_FAILED');
    await loadTimeline();
    const sceneItem = timeline.value.find((item:any) => item.sceneId === selectedSceneId.value);
    const firstImportedId = body.shots?.[0]?.id;
    const firstImported = sceneItem?.shots?.find((item:any) => item.shotId === firstImportedId);
    if (firstImported) selectShot(sceneItem, firstImported);
  } catch (error) { aimixerImportError.value = String((error as Error).message ?? error); }
  finally { aimixerImportBusy.value = false; }
}
const mediaKindFilter = ref('all');
const visibleMediaAssets = computed(() => mediaKindFilter.value === 'all' ? allMediaAssets.value : allMediaAssets.value.filter((asset:any) => (asset.asset_kind ?? asset.assetKind ?? 'reference') === mediaKindFilter.value));
const selectedSceneItem = computed(() => timeline.value.find((item: any) => item.sceneId === selectedSceneId.value));
const selectedShotItem = computed(() => selectedSceneItem.value?.shots?.find((item: any) => item.shotId === selectedShotId.value));
const promptSections = computed(() => [prompt.value, camera.value, action.value, composition.value, lighting.value, sound.value, transition.value]);
const promptScore = computed(() => Math.round((promptSections.value.filter((value) => value.trim()).length / promptSections.value.length) * 100));
const promptMissing = computed(() => 7 - promptSections.value.filter((value) => value.trim()).length);
const h3PromptInspection = computed(() => {
  if (!activeH3Workflow.value) return null;
  const mode = (selectedWorkflowProfile.value?.boundary as any)?.mode;
  const modeLabel = mode === 'fl2va-i2v' ? 'FL2VA' : mode === 'i2va-i2v' ? 'I2VA' : mode === 'refmod-i2v' ? 'RefMod I2V' : mode === 'r2v-2stage-veda' ? 'Ref2VA · VEDA' : activeWorkflowClasses.value.includes('MiniMaxH3ReferenceToVideo') ? 'Ref2VA' : 'H3 · режим профиля не определён';
  const findings: Array<{ code:string; severity:'error'|'warning'; message:string }> = [];
  const warnings: string[] = [];
  if (!action.value.trim()) warnings.push('Отдельное поле «Действие» пусто; локальная проверка не может подтвердить, что действие явно задано в общем брифе.');
  if (!camera.value.trim()) warnings.push('Отдельное поле «Камера» пусто; убедитесь, что нужное движение камеры названо в общем брифе.');
  if ((mode === 'fl2va-i2v' || mode === 'i2va-i2v') && !sound.value.trim()) warnings.push('Звук не задан: компилятор укажет естественную среду и Foley, без речи и вокализаций.');
  if (mode === 'r2v-2stage-veda' && !sound.value.trim()) warnings.push('Звук не задан: компилятор попросит естественную среду и Foley, не добавляя речь, отсутствующую в брифе.');
  if ((mode === 'fl2va-i2v' || mode === 'i2va-i2v' || mode === 'r2v-2stage-veda') && !music.value.trim()) warnings.push('Музыка не задана: компилятор передаст non_diegetic_music: N/A.');
  if (h3EventPlanError.value) warnings.push(h3EventPlanError.value);
  if (prompt.value.trim()) {
    try {
      const fields = { prompt:prompt.value, camera:camera.value, action:action.value, composition:composition.value, lighting:lighting.value, sound:sound.value, music:music.value, transition:transition.value, ...(h3EventPlan.value ? { eventPlan:h3EventPlan.value } : {}) };
      const promptMode = mode === 'fl2va-i2v' ? 'fl2va' : mode === 'i2va-i2v' ? 'i2va' : 'ref2va';
      const counts = selectedReferenceCounts.value;
      const promptReferences = [
        ...Array.from({ length:counts.image }, () => ({ type:'image' as const })),
        ...Array.from({ length:counts.video }, () => ({ type:'video' as const })),
        ...Array.from({ length:counts.audio }, () => ({ type:'audio' as const })),
      ];
      const compiled = promptMode === 'ref2va' ? compileH3Ref2VAPrompt(fields, promptReferences, h3Length.value) : compileH3BasePrompt(fields, { mode:promptMode, frameCount:h3Length.value });
      findings.push(...inspectH3Prompt(compiled, { mode:promptMode, frameCount:h3Length.value, referenceCounts:counts }));
    } catch (error) {
      findings.push({ code:'H3_PROMPT_COMPILE', severity:'error', message:`Промпт нельзя скомпилировать: ${String((error as Error).message ?? error)}` });
    }
  }
  return { modeLabel, frameCount: h3Length.value, duration: (h3Length.value / 24).toFixed(2), findings, warnings };
});
const selectedReferences = computed(() => {
  const assets = new Map(allMediaAssets.value.map((asset: any) => [asset.id, asset]));
  return selectedAssetIds.value.flatMap((id) => { const asset = assets.get(id); return asset ? [asset] : []; });
});
const selectedReferenceCounts = computed(() => {
  const saved = selectedShotItem.value?.references ?? [];
  const savedById = new Map<string, any[]>();
  for (const reference of saved) savedById.set(reference.id, [...(savedById.get(reference.id) ?? []), reference]);
  const assets = new Map(allMediaAssets.value.map((asset:any) => [asset.id, asset]));
  const references = selectedAssetIds.value.flatMap((id) => savedById.get(id) ?? (assets.has(id) ? [assets.get(id)] : []));
  return references.reduce((total, reference:any) => {
    const mime = reference?.mimeType ?? reference?.mime_type ?? '';
    const type = reference?.mediaType ?? (mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : 'image');
    total[type === 'audio' ? 'audio' : type === 'video' ? 'video' : 'image'] += 1;
    return total;
  }, { image:0, video:0, audio:0 });
});
const referenceSlotCount = computed(() => {
  if (adapterId.value === 'comfyui' && activeWorkbenchKind.value === 'image-edit') return selectedReferences.value.length;
  const saved = selectedShotItem.value?.references ?? [];
  if (!shotReferencesEdited.value) return saved.length || selectedReferences.value.length;
  const selected = new Set(selectedAssetIds.value);
  return saved.filter((reference: any) => selected.has(reference.id)).length
    + selectedReferences.value.filter((asset: any) => !saved.some((reference: any) => reference.id === asset.id)).length;
});
const isMultiRoleReference = (assetId: string) => (selectedShotItem.value?.references ?? []).filter((reference: any) => reference.id === assetId).length > 1;
const resultAssets = computed(() => resultPayload.value?.assets ?? []);
const activeTakeIndex = computed(() => resultAssets.value.findIndex((asset: any) => asset.id === previewAsset.value?.id));
const resultExecutionEvidence = computed(() => resultPayload.value?.manifest?.executionEvidence ?? null);
const executionEvidenceMemoryDevices = computed(() => Array.isArray(resultExecutionEvidence.value?.runtime?.memoryObservation?.devices) ? resultExecutionEvidence.value.runtime.memoryObservation.devices : []);
const selectedProjectName = computed(() => projects.value.find((item) => item.id === projectId.value)?.name ?? project.value);
const timelineShots = computed(() => timeline.value.flatMap((sceneItem:any) => sceneItem.shots.map((shotItem:any) => ({ ...shotItem, sceneTitle: sceneItem.title }))));
const activeJobsCount = computed(() => jobs.value.filter((item) => !['succeeded', 'failed', 'cancelled'].includes(item.state)).length);

function mediaReference(asset: any, role?: string) {
  const mime = asset.mimeType ?? asset.mime_type ?? '';
  const type = asset.mediaType ?? (mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : 'image');
  const defaultRole = type === 'audio' ? 'audio' : type === 'video' ? 'video' : 'picture';
  const storageKey = asset.storageKey ?? asset.storage_key ?? '';
  return {
    assetVersionId: asset.id,
    filename: asset.logicalName ?? storageKey.split('/').pop() ?? asset.id,
    type,
    role: role ?? asset.role ?? referenceRoles.value[asset.id] ?? defaultRole,
  };
}

async function createJob() {
  if (h3EventPlanError.value && activeH3Workflow.value) { result.value = h3EventPlanError.value; status.value = 'error'; return; }
  status.value = 'submitting';
  result.value = '';
  try {
    const savedShotReferences = selectedShotItem.value?.references ?? [];
    const savedById = new Map<string, any[]>();
    for (const reference of savedShotReferences) savedById.set(reference.id, [...(savedById.get(reference.id) ?? []), reference]);
    const assetsById = new Map(allMediaAssets.value.map((asset: any) => [asset.id, asset]));
    const selectedReferencesForJob = selectedAssetIds.value.flatMap((id) => {
      const saved = savedById.get(id);
      if (saved?.length) return saved.map((reference) => mediaReference(reference, !shotReferencesEdited.value || isMultiRoleReference(id) ? reference.role : referenceRoles.value[id] ?? reference.role));
      const asset = assetsById.get(id);
      return asset ? [mediaReference(asset)] : [];
    });
    const references = adapterId.value === 'comfyui' && activeWorkbenchKind.value === 'image-edit'
      ? compactImageEditReferences(selectedReferencesForJob)
      : selectedReferencesForJob;
    let workflow: Record<string, unknown> | undefined;
    if (adapterId.value === 'comfyui') {
      const profile = workflowProfiles.value.find((item) => item.id === selectedProfileId.value);
      try { workflow = profile?.graph ?? JSON.parse(workflowJson.value); } catch { result.value = 'Invalid workflow JSON'; status.value = 'error'; return; }
      const classes = Object.values(workflow).map((node: any) => node?.class_type);
      const workbenchKind = profile?.reference_bindings?.workbenchKind;
      if (workbenchKind === 'image-edit') {
        if (classes.filter((value) => value === 'TextEncodeQwenImage21').length !== 1 || classes.filter((value) => value === 'SaveImageAdvanced').length !== 1 || !classes.includes('LoadImage')) { result.value = 'Qwen Image workflow has an invalid image-edit boundary'; status.value = 'error'; return; }
      } else if (workbenchKind === 'image-generate') {
        if (classes.filter((value) => value === 'TextEncodeQwenImage21').length !== 1 || classes.filter((value) => value === 'SaveImageAdvanced').length !== 1 || !classes.includes('EmptyLatentImage') || !classes.includes('KSampler') || classes.includes('LoadImage')) { result.value = 'Qwen Image workflow has an invalid text-to-image boundary'; status.value = 'error'; return; }
      } else {
      const veda = (profile?.boundary as any)?.mode === 'r2v-2stage-veda';
      const imageToVideoNode = Object.values(workflow).find((node: any) => node?.class_type === 'MiniMaxH3ImageToVideo') as any;
      const fl2va = (profile?.boundary as any)?.mode === 'fl2va-i2v' || Boolean(imageToVideoNode?.inputs?.last_frame);
      const i2va = (profile?.boundary as any)?.mode === 'i2va-i2v' || Boolean(imageToVideoNode?.inputs?.first_frame) && !imageToVideoNode?.inputs?.last_frame;
      const h3Class = fl2va || i2va ? 'MiniMaxH3ImageToVideo' : 'MiniMaxH3ReferenceToVideo';
      for (const required of veda ? ['MiniMaxH3ReferenceToVideo','RandomNoise','MMH3UltimateUpscale','VedaSparseAttention','VHS_VideoCombine'] : [h3Class,'RandomNoise','SaveVideo']) {
        const expected = veda && required === 'RandomNoise' ? 2 : veda && required === 'VHS_VideoCombine' ? 2 : 1;
        if (classes.filter((value) => value === required).length !== expected) { result.value = `H3 workflow has an invalid ${required} boundary`; status.value = 'error'; return; }
      }
      if (fl2va || i2va) {
        const h3Node = imageToVideoNode;
        const first = h3Node?.inputs?.first_frame?.[0]; const last = h3Node?.inputs?.last_frame?.[0];
        if (i2va && (!first || last || classes.filter((value) => value === 'LoadImage').length !== 1 || references.length !== 1 || references[0]?.type !== 'image' || references[0]?.role !== 'first-frame')) { result.value = 'I2VA requires exactly one image assigned as First Frame and wired to first_frame'; status.value = 'error'; return; }
        if (fl2va && (!first || !last || first === last || classes.filter((value) => value === 'LoadImage').length !== 2)) { result.value = 'FL2VA requires two distinct LoadImage inputs wired to first_frame and last_frame'; status.value = 'error'; return; }
        if (fl2va && (references.length !== 2 || references.filter((item) => item.type === 'image' && item.role === 'first-frame').length !== 1 || references.filter((item) => item.type === 'image' && item.role === 'last-frame').length !== 1)) { result.value = 'Текущий FL2VA профиль предназначен для анимации между двумя кадрами. Для hero face anchor выберите Qwen Image 2.1 · image-generate; First Frame / Last Frame здесь не нужны.'; status.value = 'error'; return; }
      }
      }
    }
    const selectedProfile = workflowProfiles.value.find((item) => item.id === selectedProfileId.value);
    const workflowClasses = Object.values(workflow ?? {}).map((node: any) => node?.class_type);
    const inferredWorkbenchKind = workflowClasses.includes('TextEncodeQwenImage21') && workflowClasses.includes('SaveImageAdvanced') ? (workflowClasses.includes('LoadImage') ? 'image-edit' : workflowClasses.includes('EmptyLatentImage') && workflowClasses.includes('KSampler') ? 'image-generate' : undefined) : undefined;
    if (inferredWorkbenchKind === 'image-generate' && !references.some((reference) => reference.type === 'image') && /\bPicture\s+\d+\b/i.test([prompt.value, action.value, composition.value].join('\n'))) { result.value = 'В промпте указаны Picture 1/2, но изображения не прикреплены. Выберите реальные референсы и профиль image-edit.'; status.value = 'error'; return; }
    if (inferredWorkbenchKind === 'image-generate' && references.length) { result.value = 'Qwen Image text-to-image uses no input images. Clear selected Media Pool references first.'; status.value = 'error'; return; }
    const resolvedWorkbenchKind = selectedProfile?.reference_bindings?.workbenchKind ?? workflowWorkbenchKind.value ?? inferredWorkbenchKind;
    const workflowReferenceBindings = adapterId.value === 'comfyui' ? { ...(['fl2va-i2v','i2va-i2v'].includes(selectedProfile?.boundary?.mode ?? '') ? { mode: selectedProfile?.boundary?.mode } : {}), imageNodeIds: imageNodeIds.value.split(',').map((value) => value.trim()).filter(Boolean), audioNodeIds: audioNodeIds.value.split(',').map((value) => value.trim()).filter(Boolean), videoNodeIds: videoNodeIds.value.split(',').map((value) => value.trim()).filter(Boolean), ...(resolvedWorkbenchKind ? { workbenchKind: resolvedWorkbenchKind, ...(Object.keys(workflowOutputBindings.value).length ? { outputBindings: workflowOutputBindings.value } : {}) } : {}) } : undefined;
    const idempotencyKey = selectedShotId.value ? `ui:${selectedShotId.value}:${JSON.stringify({ prompt: prompt.value, events: h3EventPlan.value, width: width.value, height: height.value, durationSeconds: adapterId.value === 'comfyui' && activeH3Workflow.value ? h3Length.value : durationSeconds.value, seed: seed.value ?? null, adapterId: adapterId.value, profileId: selectedProfileId.value || null, assets: references.map(({ assetVersionId, role }) => [assetVersionId, role]).sort(([a, roleA], [b, roleB]) => a.localeCompare(b) || roleA.localeCompare(roleB)) })}` : undefined;
    const currentSections = { prompt: prompt.value, camera: camera.value, action: action.value, composition: composition.value, lighting: lighting.value, sound: sound.value, music: music.value, transition: transition.value };
    const appliedPlannerDecision = plannerDecision.value && Object.keys(currentSections).every((key) => currentSections[key as keyof typeof currentSections] === plannerDecision.value?.sections[key]) ? { decisionHash: plannerDecision.value.decisionHash, sessionId: plannerDecision.value.sessionId, continuityAudit: plannerDecision.value.continuityAudit, continuityContext: plannerDecision.value.continuityContext, continuityContextHash: plannerDecision.value.continuityContextHash, provenance: plannerDecision.value.provenance } : undefined;
    const response = await fetch('/v1/director/jobs', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ project: project.value, scene: scene.value, shot: shot.value, projectId: projectId.value || undefined, sceneId: selectedSceneId.value || undefined, shotId: selectedShotId.value || undefined, idempotencyKey, ...currentSections, ...(activeH3Workflow.value && h3EventPlan.value ? { eventPlan:h3EventPlan.value } : {}), ...(appliedPlannerDecision ? { plannerDecision: appliedPlannerDecision } : {}), references, adapterId: adapterId.value, width: width.value, height: height.value, length: activeH3Workflow.value ? h3Length.value : undefined, seed: seed.value, workflow, workflowProfileId: selectedProfileId.value || undefined, workflowProfileName: workflowProfiles.value.find((item) => item.id === selectedProfileId.value)?.name, workflowReferenceBindings }) });
    const payload = await response.json();
    if (!response.ok && ['PLANNER_CONTEXT_STALE','PLANNER_CONTEXT_HASH_REQUIRED'].includes(payload.code)) {
      plannerDecision.value = null;
      result.value = 'Контекст шота изменился после планирования: порядок, brief, длительность, references или монтажные данные. Запустите Director ещё раз, чтобы получить свежую проверку стыка.';
      status.value = 'error';
      return;
    }
    if (!response.ok && String(payload.code ?? '').startsWith('PLANNER_AUDIT_UNSUPPORTED_CONSISTENCY_CLAIM')) {
      plannerDecision.value = null;
      result.value = 'Planner отметил стык как согласованный без достаточных структурированных режиссёрских данных у соседних шотов. Заполните недостающие поля во вкладке «Режиссура» или повторите запрос Planner с оценкой «нужна проверка».';
      status.value = 'error';
      return;
    }
    result.value = JSON.stringify(payload, null, 2);
    if (response.ok) { job.value = { id: payload.jobId, planHash: payload.planHash }; projectId.value = payload.projectId ?? ''; if (payload.projectId) await loadTimeline(payload.projectId); }
    status.value = response.ok ? 'awaiting approval' : 'error';
  } catch (error) { result.value = String(error); status.value = 'error'; }
}

async function loadTimeline(id = projectId.value) {
  if (!id) { timeline.value=[]; directorTimeline.value=null; return; }
  const response = await fetch(`/v1/projects/${id}/timeline`);
  if (response.ok) {
    const payload = await response.json();
    timeline.value = payload.scenes ?? [];
    directorTimeline.value = payload.directorTimeline ?? null;
    if (!selectedSceneId.value && timeline.value[0]) {
      selectedSceneId.value = timeline.value[0].sceneId;
      const firstShot = timeline.value[0].shots?.[0];
      if (firstShot) selectShot(timeline.value[0], firstShot);
    }
  } else { timeline.value=[]; directorTimeline.value=null; }
}
function selectDirectorTimelineSegment(segment: DirectorTimelinePlan['segments'][number]) { const sceneItem=timeline.value.find((item:any)=>item.sceneId===segment.sceneId); const shotItem=sceneItem?.shots.find((item:any)=>item.shotId===segment.shotId); if(sceneItem&&shotItem) selectShot(sceneItem,shotItem); }

async function loadProjects() {
  const response = await fetch('/v1/projects'); if (!response.ok) return;
  projects.value = (await response.json()).projects;
  if (!projectId.value && projects.value[0]) { projectId.value = projects.value[0].id; await loadTimeline(); }
}
async function loadGlobalAssets() { const response=await fetch('/v1/assets'); if(response.ok) globalAssets.value=(await response.json()).assets; }

const newProjectName = ref(''); const newSceneTitle = ref(''); const newShotTitle = ref(''); const newShotDuration = ref(5);
const projectCreateBusy = ref(false); const projectCreateError = ref('');
async function createProjectCatalog() { if (!newProjectName.value.trim() || projectCreateBusy.value) return; projectCreateBusy.value=true; projectCreateError.value=''; try { const response=await fetch('/v1/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:newProjectName.value.trim()})}); const payload=await response.json(); result.value=JSON.stringify(payload,null,2); if(!response.ok){projectCreateError.value=payload.message ?? payload.code ?? 'Не удалось создать проект'; return;} newProjectName.value=''; await loadProjects(); } catch (error) { projectCreateError.value=String((error as Error).message ?? error); } finally { projectCreateBusy.value=false; } }
async function createSceneCatalog() { if(!projectId.value)return; const response=await fetch(`/v1/projects/${projectId.value}/scenes`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:newSceneTitle.value})}); result.value=JSON.stringify(await response.json(),null,2); if(response.ok){plannerDecision.value=null;newSceneTitle.value=''; await loadTimeline();} }
async function createShotCatalog() { const sceneId=selectedSceneId.value || timeline.value[0]?.sceneId; if(!sceneId)return; const response=await fetch(`/v1/scenes/${sceneId}/shots`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:newShotTitle.value,durationSeconds:newShotDuration.value})}); result.value=JSON.stringify(await response.json(),null,2); if(response.ok){plannerDecision.value=null;newShotTitle.value=''; await loadTimeline();} }
async function renameProjectCatalog() { const current=projects.value.find((item)=>item.id===projectId.value); const name=window.prompt('Новое имя проекта',current?.name ?? ''); if(!name?.trim()||!current)return; const response=await fetch(`/v1/projects/${current.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({name})}); result.value=JSON.stringify(await response.json(),null,2); if(response.ok) await loadProjects(); }
async function renameSceneCatalog(item:any) { const title=window.prompt('Новое название сцены',item.title); if(!title?.trim())return; const response=await fetch(`/v1/scenes/${item.sceneId}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({title})}); result.value=JSON.stringify(await response.json(),null,2); if(response.ok){plannerDecision.value=null;await loadTimeline();} }
async function renameShotCatalog(item:any) { const title=window.prompt('Новое название шота',item.title); if(!title?.trim())return; const duration=window.prompt('Длительность (секунды)',String(item.durationSeconds ?? 5)); const durationSeconds=duration === null ? undefined : Number(duration); if(duration !== null && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) { result.value='Invalid shot duration'; return; } const response=await fetch(`/v1/shots/${item.shotId}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({title,durationSeconds})}); result.value=JSON.stringify(await response.json(),null,2); if(response.ok){plannerDecision.value=null;await loadTimeline();} }
async function selectProject() { plannerDecision.value=null;selectedSceneId.value = ''; selectedShotId.value = ''; selectedAssetIds.value = []; referenceRoles.value = {}; shotReferencesEdited.value = false; project.value = projects.value.find((item) => item.id === projectId.value)?.name ?? project.value; await loadTimeline(); }
function selectShot(sceneItem: any, shotItem: any) {
  if (selectedShotId.value !== shotItem.shotId) plannerDecision.value = null;
  selectedSceneId.value = sceneItem.sceneId; selectedShotId.value = shotItem.shotId;
  project.value = projects.value.find((item) => item.id === projectId.value)?.name ?? project.value;
  scene.value = sceneItem.title; shot.value = shotItem.title;
  const saved = shotItem.prompt ?? {}; const source = shotItem.sourceMetadata ?? {};
  const savedMontage = source.directing?.montage ?? {};
  montage.value = { shotScale:savedMontage.shotScale ?? '', cameraAxisDeg:savedMontage.cameraAxisDeg ?? '', screenDirection:savedMontage.screenDirection ?? '', actionPhase:savedMontage.actionPhase ?? '', focalX:savedMontage.focalCenter?.xPercent ?? '', focalY:savedMontage.focalCenter?.yPercent ?? '', lightDirection:savedMontage.lightDirection ?? '', colorBridge:savedMontage.colorBridge ?? '', motionTempo:savedMontage.motionTempo ?? '' };
  prompt.value = saved.prompt ?? ''; camera.value = saved.camera ?? ''; action.value = saved.action ?? '';
  composition.value = saved.composition ?? ''; lighting.value = saved.lighting ?? ''; sound.value = saved.sound ?? ''; music.value = saved.music ?? ''; transition.value = saved.transition ?? '';
  h3EventPlanEnabled.value = Boolean(saved.eventPlan);
  h3Events.value = Array.isArray(saved.eventPlan?.events) ? saved.eventPlan.events.map((event: H3EventDraft) => ({ ...event })) : [];
  if (Number.isFinite(Number(shotItem.durationSeconds)) && Number(shotItem.durationSeconds) > 0) durationSeconds.value = Number(shotItem.durationSeconds);
  if (Number.isFinite(Number(source.width)) && Number(source.width) > 0) width.value = Number(source.width);
  if (Number.isFinite(Number(source.height)) && Number(source.height) > 0) height.value = Number(source.height);
  const references = Array.isArray(shotItem.references) ? shotItem.references : [];
  selectedAssetIds.value = [...new Set(references.map((item: any) => item.id))];
  referenceRoles.value = Object.fromEntries(references.map((item: any) => [item.id, item.role]));
  shotReferencesEdited.value = false;
}
function markShotReferencesEdited() { shotReferencesEdited.value = true; plannerDecision.value = null; }
function enableH3EventPlan() { h3EventPlanEnabled.value = true; if (!h3Events.value.length) h3Events.value = [{ id:'event-01', startFrame:0, endFrame:h3Length.value, action:'', endState:'', sourceTiming:'unverified' }]; }
function addH3Event() { const last=h3Events.value.at(-1); if (!last || h3Events.value.length >= 20 || last.endFrame-last.startFrame < 10) return; const oldEnd=last.endFrame; const split=last.startFrame+Math.floor((oldEnd-last.startFrame)/2); last.endFrame=split; h3Events.value.push({ id:`event-${crypto.randomUUID()}`, startFrame:split, endFrame:oldEnd, action:'', endState:'', sourceTiming:'unverified' }); }
function syncH3EventBoundary(index: number) { const next=h3Events.value[index+1]; if (next) next.startFrame=h3Events.value[index].endFrame; }
function removeH3Event(index: number) { if (h3Events.value.length < 2) { h3EventPlanEnabled.value=false; h3Events.value=[]; return; } const removed=h3Events.value.splice(index,1)[0]; if(index>0) h3Events.value[index-1].endFrame=removed.endFrame; else h3Events.value[0].startFrame=0; }
async function saveShotPrompt() { if (!selectedShotId.value) return; if (h3EventPlanError.value) { result.value=h3EventPlanError.value; return; } const payload={prompt:prompt.value,camera:camera.value,action:action.value,composition:composition.value,lighting:lighting.value,sound:sound.value,music:music.value,transition:transition.value,eventPlan:h3EventPlan.value}; const response=await fetch(`/v1/shots/${selectedShotId.value}/prompt`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}); const body=await response.json(); result.value=JSON.stringify(body,null,2); if(response.ok){plannerDecision.value=null;await loadTimeline();} }
async function saveShotMontage() {
  if (!selectedShotId.value) return;
  const metadata: Record<string, unknown> = {};
  if (montage.value.shotScale) metadata.shotScale = montage.value.shotScale;
  if (montage.value.cameraAxisDeg !== '') metadata.cameraAxisDeg = Number(montage.value.cameraAxisDeg);
  if (montage.value.screenDirection) metadata.screenDirection = montage.value.screenDirection;
  if (montage.value.actionPhase.trim()) metadata.actionPhase = montage.value.actionPhase.trim();
  if (montage.value.focalX !== '' || montage.value.focalY !== '') {
    if (montage.value.focalX === '' || montage.value.focalY === '') { result.value = 'Для центра внимания укажите обе координаты X и Y.'; return; }
    metadata.focalCenter = { xPercent:Number(montage.value.focalX), yPercent:Number(montage.value.focalY) };
  }
  if (montage.value.lightDirection.trim()) metadata.lightDirection = montage.value.lightDirection.trim();
  if (montage.value.colorBridge.trim()) metadata.colorBridge = montage.value.colorBridge.trim();
  if (montage.value.motionTempo) metadata.motionTempo = montage.value.motionTempo;
  const response = await fetch(`/v1/shots/${selectedShotId.value}/montage`, { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify(metadata) });
  const body = await response.json(); result.value = JSON.stringify(body, null, 2); if (response.ok) { plannerDecision.value = null; await loadTimeline(); }
}
function selectScene(sceneItem: any) { plannerDecision.value = null; selectedSceneId.value = sceneItem.sceneId; selectedShotId.value = ''; scene.value = sceneItem.title; }
function markSelectedAsLayout() { for (const id of selectedAssetIds.value) referenceRoles.value[id] = 'layout'; plannerDecision.value = null; }
const selectedLayoutCount = computed(() => selectedAssetIds.value.filter((id) => referenceRoles.value[id] === 'layout').length);
async function moveShot(sceneItem: any, shotItem: any, delta: number) { const ids=sceneItem.shots.map((item:any)=>item.shotId); const index=ids.indexOf(shotItem.shotId); const target=index+delta; if(index<0||target<0||target>=ids.length)return; [ids[index],ids[target]]=[ids[target],ids[index]]; const response=await fetch(`/v1/scenes/${sceneItem.sceneId}/shots/order`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({shotIds:ids})}); result.value=JSON.stringify(await response.json(),null,2); if(response.ok){plannerDecision.value=null;await loadTimeline();} }
async function moveScene(sceneItem: any, delta: number) { const ids=timeline.value.map((item:any)=>item.sceneId); const index=ids.indexOf(sceneItem.sceneId); const target=index+delta; if(index<0||target<0||target>=ids.length||!projectId.value)return; [ids[index],ids[target]]=[ids[target],ids[index]]; const response=await fetch(`/v1/projects/${projectId.value}/scenes/order`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({sceneIds:ids})}); result.value=JSON.stringify(await response.json(),null,2); if(response.ok){plannerDecision.value=null;await loadTimeline();} }
onMounted(loadProjects);
async function loadRuntime() { const response = await fetch('/v1/runtime'); if (response.ok) { const payload = await response.json(); runtimes.value = payload.runtimes ?? []; if (Array.isArray(payload.nodes)) nodes.value = payload.nodes; } const schema = await fetch('/v1/runtime/comfy-schema'); if (schema.ok) comfySchemaClasses.value = Object.keys((await schema.json()).classes ?? {}); }
async function loadNodes() { const response = await fetch('/v1/nodes'); if (response.ok) nodes.value = (await response.json()).nodes; }
async function reconcileNodes() { const response = await fetch('/v1/admin/nodes/reconcile',{method:'POST'}); result.value=JSON.stringify(await response.json(),null,2); await loadRuntime(); }
async function importAsset(event: Event) { const input=event.target as HTMLInputElement; const file=input.files?.[0]; if (!file) return; importingAsset.value=true; try { const bytes=await file.arrayBuffer(); const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map((v)=>v.toString(16).padStart(2,'0')).join(''); const contentBase64=btoa(String.fromCharCode(...new Uint8Array(bytes))); const response=await fetch('/v1/assets/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({logicalName:file.name,sha256:digest,mimeType:file.type||'application/octet-stream',contentBase64,actor:'local-ui',assetKind:importAssetKind.value,tags:importAssetTags.value.split(',').map((tag)=>tag.trim()).filter(Boolean)})}); result.value=JSON.stringify(await response.json(),null,2); if(response.ok) { await loadGlobalAssets(); importAssetTags.value=''; } } catch(error) { result.value=String(error); } finally { importingAsset.value=false; input.value=''; } }
async function importWorkflowJson(event: Event) { const input=event.target as HTMLInputElement; const file=input.files?.[0]; if (!file) return; try { const graph=await normalizeComfyWorkflow(JSON.parse(await file.text()), fetch); workflowJson.value=JSON.stringify(graph, null, 2); workflowWorkbenchKind.value=undefined; workflowOutputBindings.value={}; result.value=`Файл workflow загружен: ${file.name}. Сохранение и активация не выполнены.`; status.value='idle'; } catch (error) { result.value=String(error); status.value='error'; } finally { input.value=''; } }
async function loadWorkflowProfiles() { const [response,catalogResponse] = await Promise.all([fetch('/v1/workflow-profiles'),fetch('/v1/workflow-profiles/catalog')]); if (response.ok) { workflowProfiles.value = (await response.json()).profiles.map((profile:any) => ({ ...profile, graphHash: profile.graphHash ?? profile.graph_hash, qualityHint: profile.qualityHint ?? profile.quality_hint, samplingSteps: profile.samplingSteps ?? profile.sampling_steps })); if (workflowProfiles.value[0]) { if (!selectedProfileId.value) { const characterImage = workflowProfiles.value.find((profile:any) => profile.active && profile.reference_bindings?.workbenchKind === 'image-generate' && /character|actor|portrait/i.test(`${profile.id} ${profile.name}`)); const imageGenerate = workflowProfiles.value.find((profile:any) => profile.active && profile.reference_bindings?.workbenchKind === 'image-generate'); const quality = workflowProfiles.value.find((profile:any) => profile.qualityHint === 'quality-8step'); selectedProfileId.value = (characterImage ?? imageGenerate ?? quality ?? workflowProfiles.value[0]).id; } if (adapterId.value === 'llama.cpp') adapterId.value = 'comfyui'; await loadProfileRevisions(); } } if (catalogResponse.ok) workflowProfileCandidates.value = (await catalogResponse.json()).profiles; }
async function loadProfileRevisions() { profileRevisions.value = []; if (!selectedProfileId.value) return; const response = await fetch(`/v1/workflow-profiles/${encodeURIComponent(selectedProfileId.value)}/revisions`); if (response.ok) profileRevisions.value = (await response.json()).revisions ?? []; }
async function activateProfileRevision(revision: number, profileId = selectedProfileId.value) { if (!profileId || !window.confirm(`Активировать ${profileId}, revision ${revision}? Новые задачи смогут использовать этот immutable graph.`)) return; const response = await fetch(`/v1/workflow-profiles/${encodeURIComponent(profileId)}/revisions/${revision}/activate`, { method: 'POST' }); const payload = await response.json(); result.value = JSON.stringify(payload, null, 2); if (response.ok) { await loadWorkflowProfiles(); if (profileId === selectedProfileId.value) await loadProfileRevisions(); status.value = 'profile ready'; } else status.value = 'profile preflight failed'; }
async function testWorkflowProfileCandidate(profile: {id:string;reference_bindings?:Record<string,any>}) { const isWorkbench=Boolean(profile.reference_bindings?.workbenchKind); const response=await fetch(isWorkbench?`/v1/workbenches/profiles/${encodeURIComponent(profile.id)}/test`:`/v1/workflow-profiles/${encodeURIComponent(profile.id)}/test`,{method:'POST'}); const payload=await response.json(); result.value=JSON.stringify(payload,null,2); status.value=response.ok?'profile ready':'profile preflight failed'; }
async function activateWorkbenchProfile(profile: {id:string;name:string;reference_bindings?:Record<string,any>}) { if (!profile.reference_bindings?.workbenchKind) return; const test=await fetch(`/v1/workbenches/profiles/${encodeURIComponent(profile.id)}/test`,{method:'POST'}); const tested=await test.json(); if (!test.ok) { result.value=JSON.stringify(tested,null,2); status.value='profile preflight failed'; return; } if (!window.confirm(`Активировать ${profile.name}? Новые задачи смогут использовать этот проверенный ${profile.reference_bindings.workbenchKind} graph.`)) return; const response=await fetch(`/v1/workbenches/profiles/${encodeURIComponent(profile.id)}/activate`,{method:'POST'}); const payload=await response.json(); result.value=JSON.stringify(payload,null,2); if (response.ok) { selectedProfileId.value=profile.id; await loadWorkflowProfiles(); await loadProfileRevisions(); status.value='profile ready'; } else status.value='profile preflight failed'; }
async function loadJobs() { const response = await fetch('/v1/jobs'); if (response.ok) jobs.value = (await response.json()).jobs; }
async function approveQueueJob(item: any) { const response=await fetch(`/v1/jobs/${item.id}/approve`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({planHash:item.plan_hash,actor:'local-ui',retryBudget:retryBudget.value})}); result.value=JSON.stringify(await response.json(),null,2); await loadJobs(); }
async function cancelQueueJob(item: any) { const response=await fetch(`/v1/jobs/${item.id}/cancel`,{method:'POST'}); result.value=JSON.stringify(await response.json(),null,2); await loadJobs(); }
async function retryQueueJob(item: any) { const response=await fetch(`/v1/jobs/${item.id}/retry`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({actor:'local-ui'})}); result.value=JSON.stringify(await response.json(),null,2); await loadJobs(); }
async function reconcileQueueJob(item: any, decision: 'success'|'failed') {
  if (!item.attempt_id) return;
  let manifest: Record<string, unknown> = { reconciledBy:'local-ui', decision };
  if (decision === 'success') {
    const externalRunId = window.prompt('Подтверждённый ComfyUI externalRunId', item.attempt_id);
    if (!externalRunId?.trim()) return;
    const outputJson = window.prompt('Вставьте JSON-массив выходов с logicalName, assetVersionId, sha256 и mimeType. Сначала импортируйте/проверьте результаты в Media Pool.');
    if (!outputJson) return;
    try {
      const outputs = JSON.parse(outputJson);
      if (!Array.isArray(outputs) || !outputs.length) throw new Error('Нужен непустой массив выходов.');
      manifest = { ...manifest, externalRunId:externalRunId.trim(), outputs };
    } catch (error) {
      status.value = error instanceof Error ? error.message : 'Некорректный JSON выходов.';
      return;
    }
  }
  const label = decision === 'success' ? 'успешной с проверенными выходами' : 'ошибочной';
  if (!window.confirm(`Зафиксировать попытку как ${label}? Это изменит состояние задачи.`)) return;
  const response = await fetch(`/v1/attempts/${item.attempt_id}/reconcile`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ decision, actor:'local-ui', manifest }) });
  result.value = JSON.stringify(await response.json(), null, 2);
  await loadJobs();
}
async function viewJobResult(item: any) { selectedJobAttempts.value = []; const response=await fetch(`/v1/jobs/${item.id}/result`); resultPayload.value=await response.json(); result.value=JSON.stringify(resultPayload.value,null,2); previewAsset.value=null; if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value=''; } }
async function viewJobDetail(item: any) { selectedJobId.value = item.id; const [detailResponse, attemptsResponse]=await Promise.all([fetch(`/v1/jobs/${encodeURIComponent(item.id)}`), fetch(`/v1/jobs/${encodeURIComponent(item.id)}/attempts`)]); if (!detailResponse.ok) return; const detail=await detailResponse.json(); const history=attemptsResponse.ok ? await attemptsResponse.json() : { attempts: [] }; selectedJobAttempts.value = history.attempts ?? []; result.value=JSON.stringify({ ...detail, attemptHistory: selectedJobAttempts.value }, null, 2); }
async function exportJobManifest(jobId: string) { const response=await fetch(`/v1/jobs/${encodeURIComponent(jobId)}/export`); if(!response.ok){ result.value=JSON.stringify(await response.json(),null,2); return; } const url=URL.createObjectURL(await response.blob()); const link=document.createElement('a'); link.href=url; link.download=`qwendirector-${jobId}.manifest.json`; link.click(); window.setTimeout(()=>URL.revokeObjectURL(url),1000); }
async function exportProjectManifest(projectIdToExport: string) { const response=await fetch(`/v1/projects/${encodeURIComponent(projectIdToExport)}/export`); if(!response.ok){ result.value=JSON.stringify(await response.json(),null,2); return; } const url=URL.createObjectURL(await response.blob()); const link=document.createElement('a'); link.href=url; link.download=`qwendirector-project-${projectIdToExport}.manifest.json`; link.click(); window.setTimeout(()=>URL.revokeObjectURL(url),1000); }
async function previewAssetVersion(asset: any) {
  try {
    const response = await fetch(`/v1/assets/${encodeURIComponent(asset.id)}`);
    if (!response.ok) throw new Error(`ASSET_FETCH_${response.status}`);
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = URL.createObjectURL(await response.blob());
    previewAsset.value = asset;
  } catch (error) { result.value = String(error); }
}
function previewTakeAt(offset: number) {
  if (!resultAssets.value.length) return;
  const next = (activeTakeIndex.value < 0 ? 0 : activeTakeIndex.value + offset + resultAssets.value.length) % resultAssets.value.length;
  void previewAssetVersion(resultAssets.value[next]);
}
watch(selectedAssetIds, () => {
  const asset = selectedReferences.value[0];
  if (asset) void previewAssetVersion(asset);
  else { previewAsset.value = null; if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value = ''; } }
}, { deep: true });
async function selectFinalTake(jobId: string, assetVersionId: string) { const response=await fetch(`/v1/jobs/${jobId}/select-output`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({assetVersionId,actor:'local-ui'})}); result.value=JSON.stringify(await response.json(),null,2); }
async function saveWorkflowProfile() {
  try { const graph = JSON.parse(workflowJson.value); const id = `${profileName.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'h3-profile'}-${Date.now()}`; const response = await fetch('/v1/workflow-profiles', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ id, name:profileName.value, graph, referenceBindings:{ imageNodeIds:imageNodeIds.value.split(',').map((value)=>value.trim()).filter(Boolean), audioNodeIds:audioNodeIds.value.split(',').map((value)=>value.trim()).filter(Boolean), videoNodeIds:videoNodeIds.value.split(',').map((value)=>value.trim()).filter(Boolean) } }) }); if (!response.ok) throw new Error((await response.json()).code ?? 'PROFILE_SAVE_FAILED'); await loadWorkflowProfiles(); selectedProfileId.value = id; result.value = `Saved workflow profile ${id}`; } catch (error) { result.value = String(error); status.value = 'error'; }
}
async function handleWorkflowSave(payload: { name: string; graph: Record<string, unknown>; kind?: 'actor'|'scene'|'prop'|'layout'|'image-edit'|'image-generate'|'refmod-create'; imageNodeIds: string[]; audioNodeIds: string[]; videoNodeIds?: string[]; outputBindings: Record<string,string> }) {
  profileName.value = payload.name; workflowJson.value = JSON.stringify(payload.graph); imageNodeIds.value = payload.imageNodeIds.join(','); audioNodeIds.value = (payload.audioNodeIds ?? []).join(','); videoNodeIds.value = (payload.videoNodeIds ?? []).join(',');
  workflowWorkbenchKind.value = payload.kind; workflowOutputBindings.value = payload.outputBindings ?? {};
  if (payload.kind) {
    try { const id = `qwen-${payload.kind}-${Date.now()}`; const response = await fetch('/v1/workbenches/profiles', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ id, name:payload.name, kind:payload.kind, graph:payload.graph, imageNodeIds:payload.imageNodeIds, outputBindings:payload.outputBindings }) }); const body = await response.json(); if (!response.ok) throw new Error(body.code ?? 'WORKBENCH_PROFILE_SAVE_FAILED'); await loadWorkflowProfiles(); result.value = `${payload.kind} candidate saved (${id}). It is listed under workflow candidates; run the live schema check, then activate it explicitly before creating a manually approved job.`; status.value = 'candidate saved'; return; } catch (error) { result.value = String(error); status.value = 'error'; return; }
  }
  await saveWorkflowProfile(); if (selectedProfileId.value) await testWorkflowProfile();
}
async function testWorkflowProfile() { if (!selectedProfileId.value) return false; const profile=workflowProfiles.value.find((item)=>item.id===selectedProfileId.value); const isWorkbench=Boolean(profile?.reference_bindings?.workbenchKind); const response = await fetch(isWorkbench ? `/v1/workbenches/profiles/${selectedProfileId.value}/test` : `/v1/workflow-profiles/${selectedProfileId.value}/test`, { method: 'POST' }); const payload = await response.json(); result.value = JSON.stringify(payload, null, 2); return response.ok; }
function applyPlanner(decision: { sections: Record<string, string>; continuityAudit: PlannerContinuityAudit; continuityContext?: PlannerContinuityContext; continuityContextHash?: string; decisionHash: string; sessionId: string; provenance: { source: string; model?: string; toolsUsed?: string[]; createdAt: string } }) { plannerDecision.value = decision; prompt.value = decision.sections.prompt; camera.value = decision.sections.camera; action.value = decision.sections.action; composition.value = decision.sections.composition; lighting.value = decision.sections.lighting; sound.value = decision.sections.sound; music.value = decision.sections.music; transition.value = decision.sections.transition; result.value = JSON.stringify({ decisionHash: decision.decisionHash, continuityAudit: decision.continuityAudit, continuityContext: decision.continuityContext, continuityContextHash: decision.continuityContextHash, provenance: decision.provenance }, null, 2); }
async function preflightProfile() { if (!selectedProfileId.value) return; const response=await fetch(`/v1/workflow-profiles/${selectedProfileId.value}/preflight`,{method:'POST'}); const payload=await response.json(); preflightQualityHint.value=payload.runtime?.qualityHint ?? ''; preflightOptimizationNodes.value=payload.runtime?.optimizationNodes ?? []; result.value=JSON.stringify(payload,null,2); status.value=response.ok?'profile ready':'profile preflight failed'; }
onMounted(loadRuntime);
onMounted(loadWorkflowProfiles);
onMounted(loadJobs);
onMounted(loadGlobalAssets);
let refreshTimer: number | undefined;
onMounted(() => { refreshTimer = window.setInterval(() => { void loadJobs(); void loadRuntime(); if (selectedJobId.value) { const item = jobs.value.find((job) => job.id === selectedJobId.value); if (item) void viewJobDetail(item); } }, 5000); });
onUnmounted(() => { if (refreshTimer) window.clearInterval(refreshTimer); if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); });

async function approveJob() {
  if (!job.value) return;
  const response = await fetch(`/v1/jobs/${job.value.id}/approve`, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ planHash: job.value.planHash, actor: 'local-ui', retryBudget: retryBudget.value }) });
  result.value = JSON.stringify(await response.json(), null, 2);
  status.value = response.ok ? 'queued' : 'error';
  if (response.ok) watchJob();
}

async function watchJob() {
  if (!job.value) return;
  const timer = window.setInterval(async () => {
    const response = await fetch(`/v1/jobs/${job.value!.id}`);
    if (!response.ok) return;
    const payload = await response.json();
    status.value = payload.state;
    result.value = JSON.stringify(payload, null, 2);
    if (payload.state === 'succeeded' || payload.state === 'failed' || payload.state === 'cancelled') window.clearInterval(timer);
  }, 1500);
}
</script>

<template>
  <main class="studio-shell">
    <header class="studio-topbar">
      <a class="studio-brand" href="#" aria-label="QwenDirector — рабочее пространство">
        <span class="studio-mark">QD</span><span>QwenDirector</span>
      </a>
      <div v-if="projects.length" class="studio-breadcrumb" aria-label="Текущий контекст">
        <span>{{ selectedProjectName }}</span><i>/</i><span>{{ scene }}</span><i>/</i><strong>{{ shot }}</strong>
      </div>
      <div class="topbar-health" aria-label="Состояние сервисов"><span :class="comfyReady ? 'is-ok' : 'is-bad'"><i></i>ComfyUI</span><span :class="onlineNodeCount > 0 ? 'is-ok' : 'is-warn'"><i></i>{{ onlineNodeCount }} worker</span><span v-if="staleNodeCount" class="is-warn" :title="'Недоступные или устаревшие исполнители: ' + staleNodeCount"><i></i>{{ staleNodeCount }} stale</span></div>
      <nav class="studio-header-actions" aria-label="Действия рабочего пространства">
        <button v-if="job" type="button" class="uk-button uk-button-text" @click="exportJobManifest(job.id)">Экспорт</button>
        <a href="#tools-offcanvas" uk-toggle class="uk-button uk-button-default">Инструменты</a>
        <a href="#job-offcanvas" uk-toggle class="uk-button uk-button-primary">Задачи <span v-if="activeJobsCount" class="uk-badge">{{ activeJobsCount }}</span></a>
        <a href="#settings-offcanvas" uk-toggle class="uk-button uk-button-default" aria-label="Открыть настройки">Настройки</a>
      </nav>
    </header>
    <div id="tools-offcanvas" uk-offcanvas="flip: true; overlay: true">
      <div class="uk-offcanvas-bar uk-width-large studio-tools-panel">
        <button class="uk-offcanvas-close" type="button" uk-close aria-label="Закрыть инструменты"></button>
        <span class="panel-eyebrow">ПОДГОТОВКА</span><h2>Инструменты проекта</h2>
        <PlannerAssist :token="apiToken" :project-id="projectId" :shot-id="selectedShotId" :brief="{ prompt, camera, action, composition, lighting, sound, music, transition }" @apply="applyPlanner" />
        <AssetWorkbench :token="apiToken" />
        <WorkflowWizard :api-token="apiToken" @save="handleWorkflowSave" />
      </div>
    </div>
    <section v-if="!projects.length" class="studio-onboarding">
      <span class="studio-kicker">НОВЫЙ ПРОЕКТ&nbsp; / &nbsp;01</span><h1>Сначала — замысел.</h1>
      <p>Создайте проект, чтобы собрать сцены, шоты и референсы в одном локальном пространстве.<br>Каждая генерация останется проверяемой задачей с историей и исходными данными.</p>
      <form @submit.prevent="createProjectCatalog"><input v-model="newProjectName" class="uk-input" placeholder="Например, «Ночной город»" aria-label="Название проекта"><button class="uk-button uk-button-primary" :disabled="!newProjectName.trim() || projectCreateBusy">{{ projectCreateBusy ? 'Создаём…' : 'Создать проект' }} <span aria-hidden="true">→</span></button></form>
      <p v-if="projectCreateError" class="project-create-error" role="alert">{{ projectCreateError }}</p>
      <div class="onboarding-next" aria-label="Следующие шаги">
        <span><strong>01&nbsp; / &nbsp;Сцены и шоты</strong><small>Структура ролика</small></span>
        <span><strong>02&nbsp; / &nbsp;Референсы</strong><small>Локальная медиатека</small></span>
        <span><strong>03&nbsp; / &nbsp;Черновой рендер</strong><small>Проверка до запуска</small></span>
      </div>
      <div class="onboarding-local"><span aria-hidden="true">⌂</span>Исходники, модели и задачи остаются в вашей локальной лаборатории.</div>
    </section>
    <footer v-if="!projects.length" class="studio-empty-footer"><span>QWENDIRECTOR&nbsp; / &nbsp;LOCAL-FIRST</span><span>Планирование&nbsp; → &nbsp;проверка&nbsp; → &nbsp;генерация</span></footer>
    <div id="settings-offcanvas" uk-offcanvas="flip: true; overlay: true">
      <div class="uk-offcanvas-bar uk-width-large">
        <button class="uk-offcanvas-close" type="button" uk-close aria-label="Закрыть настройки"></button>
        <h2>Настройки</h2>
        <label>API token<input v-model="apiToken" type="password" class="uk-input uk-margin-small-top" autocomplete="off" @change="localStorage.setItem('qwen-api-token', apiToken)"></label>
        <div class="uk-margin-top"><div class="uk-flex uk-flex-between uk-flex-middle"><strong>Сервисы</strong><button type="button" class="uk-button uk-button-text" @click="loadRuntime">Обновить</button></div><div class="uk-margin-small-top"><span v-for="runtime in runtimes" :key="runtime.id" class="uk-label uk-margin-small-right" :class="runtime.ok ? 'uk-label-success' : 'uk-label-danger'">{{ runtime.id }}: {{ runtime.ok ? 'доступен' : 'недоступен' }} · {{ runtime.latencyMs }} мс{{ runtime.id === 'comfyui' && runtime.capabilities ? ` · H3 ${runtime.capabilities.h3 ? 'готов' : 'неполон'}` : '' }}</span></div><div v-for="runtime in runtimes.filter((item) => item.id === 'comfyui' && item.capabilities?.optimizationNodes?.length)" :key="`${runtime.id}-optimizations`" class="uk-text-small uk-text-muted uk-margin-small-top">Ускорители PVE: {{ runtime.capabilities?.optimizationNodes?.join(', ') }}</div><div v-for="runtime in runtimes.filter((item) => item.id === 'comfyui' && item.capabilities?.h3Loras?.length)" :key="`${runtime.id}-loras`" class="uk-text-small uk-text-muted uk-margin-small-top">H3 LoRA: {{ runtime.capabilities?.h3Loras?.join(', ') }}</div><div v-if="comfySchemaClasses.length" class="uk-text-small uk-text-muted uk-margin-small-top">Ноды ComfyUI: {{ comfySchemaClasses.join(', ') }}</div></div>
        <div class="uk-margin-top"><div class="uk-flex uk-flex-between uk-flex-middle"><strong>Исполнители</strong><span><button type="button" class="uk-button uk-button-text uk-margin-small-right" @click="reconcileNodes">Проверить stale</button><button type="button" class="uk-button uk-button-text" @click="loadNodes">Обновить</button></span></div><div class="uk-margin-small-top"><span v-for="node in nodes" :key="node.id" class="uk-label uk-margin-small-right" :class="node.status === 'online' ? 'uk-label-success' : 'uk-label-warning'">{{ node.instance_id }}: {{ node.status === 'online' ? 'доступен' : node.status }}</span></div><div v-if="nodes.length && onlineNodeCount === 0" class="uk-alert uk-alert-warning uk-margin-small-top">Нет доступных исполнителей: задачу можно подготовить, но генерация начнётся только после восстановления worker.</div></div>
      </div>
    </div>
    <div id="job-offcanvas" uk-offcanvas="flip: true; overlay: true">
      <div class="uk-offcanvas-bar uk-width-large">
        <button class="uk-offcanvas-close" type="button" uk-close aria-label="Закрыть очередь задач"></button>
        <div class="uk-flex uk-flex-between uk-flex-middle"><h2 class="uk-margin-remove">Очередь задач</h2><button type="button" class="uk-button uk-button-text" @click="loadJobs">Обновить</button></div>
        <select v-model="jobStateFilter" class="uk-select uk-margin-small-bottom" aria-label="Фильтр задач"><option value="all">Все состояния</option><option value="awaiting_approval">Ожидают утверждения</option><option value="queued">В очереди</option><option value="leased">Назначены</option><option value="running">Выполняются</option><option value="reconciling">Требуют проверки</option><option value="succeeded">Готовы</option><option value="failed">С ошибкой</option><option value="cancelled">Отменены</option></select>
        <label class="uk-display-block uk-text-small uk-margin-small-bottom">Повторы после ошибки<input v-model.number="retryBudget" type="number" min="0" max="10" step="1" class="uk-input uk-form-small uk-margin-small-top"></label>
        <article v-for="item in visibleJobs" :key="item.id" class="uk-card uk-card-secondary uk-card-body uk-margin-small-bottom">
          <div class="uk-flex uk-flex-between"><strong>{{ item.project_name }}</strong><span class="uk-label">{{ jobStateLabel(item.state) }}</span></div>
          <div class="uk-text-small uk-margin-small-top">{{ item.scene_title }} / {{ item.shot_title }}</div>
          <div class="uk-text-small uk-text-muted uk-margin-small-top"><span v-if="item.attempt_state">Попытка: {{ jobStateLabel(item.attempt_state) }}</span><span v-if="item.adapter_id"> · {{ item.adapter_id }}</span><span v-if="item.heartbeat_seq !== undefined"> · heartbeat {{ item.heartbeat_seq }}</span><span v-if="item.lease_expires_at"> · {{ leaseLabel(item.lease_expires_at) }}</span></div>
          <div v-if="item.error_detail" class="uk-text-danger uk-text-small uk-margin-small-top">{{ item.error_detail.slice(0, 120) }}</div>
          <div v-if="item.state === 'reconciling'" class="uk-alert-warning uk-padding-small uk-text-small" role="alert">Результат внешнего запуска неизвестен. Сверьте attempt в ComfyUI. Успех можно зафиксировать только с AssetVersion выходов и совпадающими SHA-256/MIME.</div>
          <div class="uk-margin-small-top"><button class="uk-button uk-button-text uk-margin-small-right" @click="viewJobDetail(item)">Подробнее</button><button v-if="['succeeded','failed'].includes(item.state)" class="uk-button uk-button-text uk-margin-small-right" @click="viewJobResult(item)">Результат</button><button v-if="item.state === 'awaiting_approval'" class="uk-button uk-button-text uk-margin-small-right" @click="approveQueueJob(item)">Утвердить</button><button v-if="item.state === 'failed'" class="uk-button uk-button-text uk-margin-small-right" @click="retryQueueJob(item)">Повторить</button><button v-if="['queued','leased','running','cancel_requested'].includes(item.state)" class="uk-button uk-button-text uk-text-danger" @click="cancelQueueJob(item)">Отменить</button><button v-if="item.state === 'reconciling' && item.attempt_id" class="uk-button uk-button-text uk-margin-small-right" @click="reconcileQueueJob(item, 'success')">Подтвердить успех с выходами</button><button v-if="item.state === 'reconciling' && item.attempt_id" class="uk-button uk-button-text uk-text-danger" @click="reconcileQueueJob(item, 'failed')">Зафиксировать ошибку</button></div>
        </article>
        <p v-if="!visibleJobs.length" class="uk-text-muted">Нет задач в этом состоянии.</p>
        <section v-if="selectedJobAttempts.length" class="queue-history uk-margin-top" aria-label="История попыток"><h3 class="uk-margin-small-bottom">История попыток</h3><div v-for="attempt in selectedJobAttempts" :key="attempt.id" class="history-row"><div><strong>{{ jobStateLabel(attempt.state) }}</strong><span class="uk-text-small uk-text-muted"> · {{ attempt.node_id || 'исполнитель не назначен' }}</span></div><div class="uk-text-small uk-text-muted">{{ attempt.created_at ? new Date(attempt.created_at).toLocaleString('ru-RU') : '' }}<span v-if="attempt.error_detail" class="uk-text-danger"> · {{ attempt.error_detail.slice(0, 90) }}</span></div></div></section>
      </div>
    </div>
    <aside v-if="projects.length" class="studio-library" aria-label="Навигатор проекта">
      <div class="library-project"><span class="panel-eyebrow">ПРОЕКТ</span><label class="sr-only" for="project-switcher">Выберите проект</label><select id="project-switcher" v-model="projectId" class="uk-select" @change="selectProject"><option v-for="item in visibleProjects" :key="item.id" :value="item.id">{{ item.name }}</option></select><div class="library-actions"><button type="button" class="uk-button uk-button-text" @click="renameProjectCatalog">Переименовать</button><button type="button" class="uk-button uk-button-text" @click="exportProjectManifest(projectId)">Экспорт</button></div></div>
      <div class="library-heading"><span>Сцены и шоты</span><span>{{ timeline.reduce((total, item) => total + item.shots.length, 0) }} шотов</span></div>
      <details class="aimixer-import">
        <summary>Импорт AIMixer timeline v5</summary>
        <label class="uk-form-label">Workflow JSON<input type="file" accept="application/json,.json" class="uk-input" @change="readAimixerWorkflow"></label>
        <template v-if="aimixerTimeline">
          <p class="uk-text-small">{{ aimixerSourceName }} · {{ aimixerTimeline.segments.length }} сегмента · {{ aimixerTimeline.totalFrames }} кадров · {{ aimixerMedia.length }} references</p>
          <label class="uk-form-label">Добавить в сцену<select v-model="selectedSceneId" class="uk-select"><option v-for="item in timeline" :key="item.sceneId" :value="item.sceneId">{{ item.title }}</option></select></label>
          <label v-for="media in aimixerMedia" :key="minimaxDirectorMediaKey(media)" class="uk-form-label aimixer-reference-row">
            <span>{{ media.role }} · {{ media.fileName }}</span>
            <select class="uk-select" :value="aimixerMapping[minimaxDirectorMediaKey(media)] ?? ''" @change="setAimixerAsset(media, $event)">
              <option value="">Не сопоставлено</option>
              <option v-for="asset in aimixerMediaAssets(media)" :key="asset.id" :value="asset.id">{{ asset.provenance?.logicalName ?? asset.logicalName ?? asset.id }} · {{ asset.id.slice(0,8) }}</option>
            </select>
            <label class="uk-text-small">Нет в Media Pool? Импортировать локальный файл<input type="file" class="uk-input" :accept="`${media.kind}/*`" :disabled="Boolean(aimixerUploadingKey)" @change="importAimixerReference(media, $event)"></label>
            <span v-if="aimixerUploadingKey === minimaxDirectorMediaKey(media)" class="uk-text-small">Импортируем в локальный CAS…</span>
          </label>
          <button type="button" class="uk-button uk-button-default uk-width-1-1" :disabled="!selectedSceneId || aimixerImportBusy || aimixerMedia.some((media)=>!aimixerMapping[minimaxDirectorMediaKey(media)])" @click="importAimixerTimeline">{{ aimixerImportBusy ? 'Импорт…' : `Создать ${aimixerTimeline.segments.length} черновых shots` }}</button>
        </template>
        <p v-if="aimixerImportError" class="uk-text-danger uk-text-small">{{ aimixerImportError }}</p>
      </details>
      <div class="scene-tree">
        <section v-for="(sceneItem, sceneIndex) in timeline" :key="sceneItem.sceneId" class="scene-group">
          <div class="scene-row" :class="{ 'is-active': selectedSceneId === sceneItem.sceneId && !selectedShotId }"><button type="button" class="scene-title" @click="selectScene(sceneItem)">{{ String(sceneIndex + 1).padStart(2, '0') }} · {{ sceneItem.title }}</button><div class="tree-actions"><button type="button" class="tree-button" @click="renameSceneCatalog(sceneItem)" aria-label="Переименовать сцену">···</button><button type="button" class="tree-button" :disabled="sceneIndex===0" @click="moveScene(sceneItem, -1)" aria-label="Поднять сцену">↑</button><button type="button" class="tree-button" :disabled="sceneIndex===timeline.length-1" @click="moveScene(sceneItem, 1)" aria-label="Опустить сцену">↓</button></div></div>
          <div v-for="(shotItem, shotIndex) in sceneItem.shots" :key="shotItem.shotId" class="shot-row-wrap" :class="{ 'is-active': selectedShotId === shotItem.shotId }"><button type="button" class="shot-row" @click="selectShot(sceneItem, shotItem)"><span class="shot-index">{{ String(shotIndex + 1).padStart(2, '0') }}</span><span class="shot-copy"><strong>{{ shotItem.title }}</strong><small>{{ shotItem.durationSeconds }} сек. <template v-if="shotItem.assets.length">· {{ shotItem.assets.length }} медиа</template></small></span></button><div class="shot-tools"><button type="button" @click="renameShotCatalog(shotItem)" aria-label="Переименовать шот">···</button><button type="button" :disabled="shotIndex===0" @click="moveShot(sceneItem, shotItem, -1)" aria-label="Поднять шот">↑</button><button type="button" :disabled="shotIndex===sceneItem.shots.length-1" @click="moveShot(sceneItem, shotItem, 1)" aria-label="Опустить шот">↓</button></div></div>
        </section>
      </div>
      <details class="library-add">
        <summary>＋ Добавить</summary>
        <form @submit.prevent="createSceneCatalog"><label>Сцена<input v-model="newSceneTitle" class="uk-input" placeholder="Название сцены"></label><button class="uk-button uk-button-default" :disabled="!projectId || !newSceneTitle.trim()">Добавить сцену</button></form>
        <form @submit.prevent="createShotCatalog"><label>Шот<input v-model="newShotTitle" class="uk-input" placeholder="Название шота"></label><label>Длительность, сек.<input v-model.number="newShotDuration" type="number" min="0.1" step="0.1" class="uk-input"></label><button class="uk-button uk-button-default" :disabled="!newShotTitle.trim() || !timeline.length">Добавить шот</button></form>
        <form @submit.prevent="createProjectCatalog"><label>Новый проект<input v-model="newProjectName" class="uk-input" placeholder="Название"></label><button class="uk-button uk-button-text" :disabled="!newProjectName.trim()">Создать проект</button></form>
      </details>
    </aside>
    <form v-if="projects.length" class="studio-editor" @submit.prevent="createJob">
      <div class="editor-heading"><div><span class="panel-eyebrow">ШОТ {{ selectedShotItem ? String((selectedSceneItem?.shots?.indexOf(selectedShotItem) ?? 0) + 1).padStart(2, '0') : '—' }}</span><h1>{{ shot }}</h1><p>{{ scene }} · {{ durationSeconds }} сек. · {{ width }} × {{ height }}</p></div><button v-if="selectedShotId" type="button" class="uk-button uk-button-text" @click="saveShotPrompt">Сохранить черновик</button></div>
      <section class="shot-stage" :class="{ 'has-reference': selectedReferences.length }"><div class="stage-grid"></div><template v-if="previewUrl && previewAsset"><video v-if="previewAsset.mimeType?.startsWith('video/')" class="stage-preview" muted playsinline :src="previewUrl"></video><img v-else-if="previewAsset.mimeType?.startsWith('image/')" class="stage-preview" :src="previewUrl" :alt="previewAsset.logicalName"></template><div class="stage-content"><span class="stage-label">КЛЮЧЕВОЙ КАДР</span><strong v-if="selectedReferences.length">{{ selectedReferences[0].logicalName || selectedReferences[0].provenance?.logicalName || 'Выбранный референс' }}</strong><strong v-else>Соберите замысел этого шота</strong><p v-if="referenceSlotCount">{{ referenceSlotCount }} референс{{ referenceSlotCount === 1 ? '' : 'а' }} помогут удержать персонажа, локацию и ритм.</p><p v-else>Добавьте референс справа — он станет опорой для следующей генерации.</p></div><div class="stage-meta"><span>{{ activeEngineLabel }}</span><span>{{ activeH3Workflow ? `${h3Length} кадров` : adapterId === 'comfyui' ? `${width} × ${height}` : `${durationSeconds} сек.` }}</span></div></section>
      <div class="editor-tabs" role="tablist" aria-label="Редактор шота"><button type="button" role="tab" :aria-selected="editorTab === 'brief'" :class="{ 'is-active': editorTab === 'brief' }" @click="editorTab = 'brief'">Бриф</button><button type="button" role="tab" :aria-selected="editorTab === 'direction'" :class="{ 'is-active': editorTab === 'direction' }" @click="editorTab = 'direction'">Режиссура</button><button type="button" role="tab" :aria-selected="editorTab === 'generation'" :class="{ 'is-active': editorTab === 'generation' }" @click="editorTab = 'generation'">Генерация</button></div>
      <section v-if="timelineShots.length" class="timeline-strip" aria-label="Последовательность шотов"><div class="timeline-header"><span>ТАЙМЛАЙН</span><small>{{ timelineShots.length }} шотов · {{ timelineShots.reduce((sum, item) => sum + Number(item.durationSeconds || 0), 0).toFixed(1) }} сек.</small></div><div class="timeline-track"><button v-for="(item, index) in timelineShots" :key="item.shotId" type="button" class="timeline-shot" :title="item.sceneTitle" :class="{ 'is-active': item.shotId === selectedShotId }" @click="selectShot(timeline.find((sceneItem:any) => sceneItem.shots.some((shotItem:any) => shotItem.shotId === item.shotId)), item)"><span>{{ String(index + 1).padStart(2, '0') }}</span><em>{{ item.sceneTitle }}</em><strong>{{ item.title }}</strong><small>{{ item.durationSeconds }} сек.</small></button></div>
        <details v-if="directorTimeline" class="director-timeline-detail"><summary>Покадровая партитура · 24 fps · {{ directorTimeline.frameCount }} кадров · {{ (directorTimeline.frameCount/24).toFixed(2) }} сек.<span> · без event plan: {{ directorTimelineUnplannedCount }} · ошибок плана: {{ directorTimelineInvalidCount }} · стыки проверить: {{ directorTimelineReviewJoinCount }} · стыки без данных: {{ directorTimelineMissingJoinDataCount }}</span></summary><div class="director-timeline-rows"><article v-for="(segment, index) in directorTimeline.segments" :key="segment.shotId" class="director-timeline-row"><button type="button" :class="{ 'is-active':segment.shotId===selectedShotId }" @click="selectDirectorTimelineSegment(segment)"><span>{{ String(index+1).padStart(2,'0') }} · {{ directorFrameTimecode(segment.startFrame) }}–{{ directorFrameTimecode(segment.endFrame) }}</span><strong>{{ segment.sceneTitle }} / {{ segment.title }}</strong><small>{{ directorTimelineStatus(segment.timingStatus) }}<template v-if="segment.timingStatus==='event-plan-overrides-catalog-duration'"> · каталог: {{ segment.catalogFrameCount }} кадров, план: {{ segment.frameCount }}</template><template v-if="segment.eventCausalityStatus==='incomplete'"> · причинная структура неполна</template><template v-if="segment.joinToNext?.transitionType==='unspecified'"> · переход не выбран</template><template v-if="segment.joinToNext?.reviewStatus==='review-required'"> · стык проверить</template><template v-if="segment.joinToNext?.reviewStatus==='insufficient-metadata'"> · данных для стыка мало</template></small></button><details v-if="segment.events.length" class="director-event-list"><summary>{{ segment.events.length }} событий</summary><ol><li v-for="event in segment.events" :key="event.id"><span>{{ directorFrameTimecode(event.startFrame) }}–{{ directorFrameTimecode(event.endFrame-1) }}</span><strong>{{ event.action }}</strong><small><template v-if="event.entryState">Вход: {{ event.entryState }}. </template><template v-if="event.trigger">Триггер: {{ event.trigger }}. </template><template v-if="event.continuityFromPrevious">Связь: {{ event.continuityFromPrevious }}. </template>Конец: {{ event.endState }}<template v-if="event.sourceRef"> · Источник {{ event.sourceRef }} ({{ event.sourceTiming ?? 'unverified' }})</template></small></li></ol></details></article></div><p class="director-timeline-note">Это монтажный план из текущих каталоговых длительностей и event plans, а не подтверждённый синхрон с треком. Референсы доступны в списке шота; переходы пока не выбираются автоматически.</p></details>
      </section>
      <section v-if="editorTab === 'brief'" class="editor-panel"><div class="prompt-readiness"><div><label class="field-label" for="prompt">Что должно произойти в кадре?</label><p class="field-hint">Соберите шот из семи режиссёрских секций. Можно начать только с брифа.</p></div><span class="prompt-score" :class="promptScore >= 70 ? 'is-ready' : ''">{{ promptScore }}%</span></div><textarea id="prompt" v-model="prompt" class="uk-textarea shot-prompt" rows="7" placeholder="Опишите действие, героя, место и настроение. Например: «Девушка в красном пальто выходит из ночного трамвая, мокрый асфальт отражает неон». "></textarea><p v-if="promptMissing && prompt.trim()" class="field-hint">Можно уточнить ещё {{ promptMissing }} {{ promptMissing === 1 ? 'секцию' : 'секции' }} на вкладке «Режиссура» — это повысит управляемость результата.</p><aside v-if="h3PromptInspection" class="h3-preflight" aria-label="Локальная проверка H3-промпта"><div><strong>H3 preflight · {{ h3PromptInspection.modeLabel }}</strong><span>{{ h3PromptInspection.frameCount }} кадров · {{ h3PromptInspection.duration }} с при 24 fps</span></div><ul v-if="h3PromptInspection.findings.length" class="h3-preflight-errors"><li v-for="finding in h3PromptInspection.findings" :key="finding.code">{{ finding.message }}</li></ul><ul v-if="h3PromptInspection.warnings.length" class="h3-preflight-warnings"><li v-for="warning in h3PromptInspection.warnings" :key="warning">{{ warning }}</li></ul><p v-if="!h3PromptInspection.findings.length && !h3PromptInspection.warnings.length">Структура, таймкоды и метки референсов прошли локальную проверку.</p><small>Проверка advisory-only: оценивает контракт текста, не режиссуру, физику или качество будущего видео.</small></aside></section>
      <section v-if="editorTab === 'direction'" class="editor-panel"><div class="director-intro"><div><h2>Режиссёрские указания</h2><p>Заполняйте только то, что действительно задаёт характер кадра.</p></div><button type="button" class="uk-button uk-button-text" @click="editorTab = 'brief'">Вернуться к брифу</button></div>
      <div class="uk-grid-small uk-child-width-1-2@s uk-margin-top" uk-grid>
        <label>Камера<input v-model="camera" class="uk-input uk-margin-small-top" placeholder="slow dolly, 35mm"></label>
        <label>Действие<input v-model="action" class="uk-input uk-margin-small-top" placeholder="персонаж входит в кадр"></label>
        <label>Композиция<input v-model="composition" class="uk-input uk-margin-small-top" placeholder="wide establishing shot"></label>
        <label>Свет<input v-model="lighting" class="uk-input uk-margin-small-top" placeholder="warm tungsten"></label>
        <label>Звуковая среда<input v-model="sound" class="uk-input uk-margin-small-top" placeholder="room tone, footsteps, fabric rustle"></label>
        <label>Музыка<input v-model="music" class="uk-input uk-margin-small-top" placeholder="N/A или инструменты, темп и динамика"></label>
        <label>Переход<input v-model="transition" class="uk-input uk-margin-small-top" placeholder="match cut"></label>
      </div>
      <div v-if="activeH3Workflow" class="h3-events">
        <div class="director-intro"><div><h2>Действие по времени внутри шота</h2><p>Это фазы одного непрерывного плана, не автоматические склейки. Диапазон задаётся кадрами при 24 fps; выходной хвост H3 не создаёт нового действия.</p></div><button v-if="!h3EventPlanEnabled" type="button" class="uk-button uk-button-default" @click="enableH3EventPlan">Добавить события</button><button v-else type="button" class="uk-button uk-button-text" @click="h3EventPlanEnabled=false;h3Events=[]">Отключить</button></div>
        <p v-if="h3EventPlanEnabled" class="field-hint">Полный диапазон: 0–{{ h3Length }} кадров · {{ (h3Length / 24).toFixed(3) }} с. Каждое событие должно иметь действие и видимое устойчивое состояние на выходе.</p>
        <article v-for="(event, index) in h3Events" :key="event.id" class="h3-event-row">
          <header><strong>Событие {{ index + 1 }} · кадры [{{ event.startFrame }}, {{ event.endFrame }})</strong><button type="button" class="uk-button uk-button-text" @click="removeH3Event(index)">Убрать</button></header>
          <label>Состояние в начале<textarea v-model="event.entryState" class="uk-textarea" rows="2" placeholder="Что уже видно до действия"></textarea></label>
          <label>Триггер<textarea v-model="event.trigger" class="uk-textarea" rows="2" placeholder="Какое событие или решение запускает действие"></textarea></label>
          <label>Действие<textarea v-model="event.action" class="uk-textarea" rows="2" placeholder="Что зритель видит происходить в этой фазе"></textarea></label>
          <label>Состояние в конце диапазона<textarea v-model="event.endState" class="uk-textarea" rows="2" placeholder="Какое видимое состояние уже установилось к концу"></textarea></label>
          <label v-if="index > 0">Связь с предыдущим событием<textarea v-model="event.continuityFromPrevious" class="uk-textarea" rows="2" placeholder="Как предыдущее состояние или действие приводит к этому"></textarea></label>
          <div class="uk-grid-small uk-child-width-1-2@s" uk-grid><label>Источник / beat ID<input v-model="event.sourceRef" class="uk-input" placeholder="необязательно"></label><label>Проверка синхронизации<select v-model="event.sourceTiming" class="uk-select"><option value="unverified">UNVERIFIED</option><option value="verified">Подтверждена</option></select></label></div>
          <div class="h3-event-range"><label>Начальный кадр<input :value="event.startFrame" type="number" class="uk-input" disabled></label><label>Конечный кадр, не включая<input v-model.number="event.endFrame" type="number" :min="event.startFrame + 5" :max="h3Length" :readonly="index === h3Events.length - 1" class="uk-input" @change="syncH3EventBoundary(index)"></label></div>
        </article>
        <button v-if="h3EventPlanEnabled" type="button" class="uk-button uk-button-default" :disabled="h3Events.length >= 20" @click="addH3Event">Разделить последнее событие</button>
        <p v-if="h3EventPlanError" class="h3-event-error" role="alert">{{ h3EventPlanError }}</p>
        <aside v-if="h3EventCausalityReview" class="h3-event-review" :class="h3EventCausalityReview.gaps.length ? 'is-incomplete' : 'is-structured'"><strong>Проверка причинной структуры: {{ h3EventCausalityReview.gaps.length ? 'нужно заполнить поля' : 'структура записана' }}</strong><p v-if="h3EventCausalityReview.gaps.length">Не заполнены: {{ h3EventCausalityReview.gaps.join(', ') }}</p><p>Смысловая убедительность не проверяется автоматически; требуется режиссёрская оценка.</p></aside>
      </div>
      <div class="director-intro uk-margin-large-top"><div><h2>Монтажная непрерывность</h2><p>Факты для сравнения с соседними шотами; пустые поля остаются неизвестными.</p></div></div>
      <div class="uk-grid-small uk-child-width-1-2@s uk-margin-top" uk-grid>
        <label>Крупность<select v-model="montage.shotScale" class="uk-select uk-margin-small-top"><option value="">Не задана</option><option value="detail">Деталь</option><option value="cu">Крупный</option><option value="mcu_1st">Первый средний</option><option value="ms_2nd">Второй средний</option><option value="wide">Общий</option><option value="extreme_wide">Дальний</option></select></label>
        <label>Ракурс по оси, °<input v-model="montage.cameraAxisDeg" type="number" min="0" max="359.99" step="0.1" class="uk-input uk-margin-small-top" placeholder="0–359"></label>
        <label>Экранное направление<select v-model="montage.screenDirection" class="uk-select uk-margin-small-top"><option value="">Не задано</option><option value="left-to-right">Слева направо</option><option value="right-to-left">Справа налево</option><option value="into-depth">В глубину</option><option value="from-depth">Из глубины</option><option value="static">Статично</option></select></label>
        <label>Фаза действия<input v-model="montage.actionPhase" maxlength="160" class="uk-input uk-margin-small-top" placeholder="например, рука тянется к мыши"></label>
        <label>Центр внимания X, %<input v-model="montage.focalX" type="number" min="0" max="100" step="1" class="uk-input uk-margin-small-top" placeholder="0–100"></label>
        <label>Центр внимания Y, %<input v-model="montage.focalY" type="number" min="0" max="100" step="1" class="uk-input uk-margin-small-top" placeholder="0–100"></label>
        <label>Направление света<input v-model="montage.lightDirection" maxlength="120" class="uk-input uk-margin-small-top" placeholder="ключевой свет справа"></label>
        <label>Цветовой мост к соседнему шоту<input v-model="montage.colorBridge" maxlength="120" class="uk-input uk-margin-small-top" placeholder="янтарный блик продолжается в следующий кадр"></label>
        <label>Темп движения<select v-model="montage.motionTempo" class="uk-select uk-margin-small-top"><option value="">Не задан</option><option value="static">Статика</option><option value="slow">Медленный</option><option value="moderate">Умеренный</option><option value="fast">Быстрый</option></select></label>
      </div><button type="button" class="uk-button uk-button-default uk-margin-top" :disabled="!selectedShotId" @click="saveShotMontage">Сохранить монтажные данные</button></section>
      <section v-if="editorTab === 'generation'" class="editor-panel"><div class="director-intro"><div><h2>Параметры генерации</h2><p>Технические параметры для текущего шота.</p></div><span class="runtime-state" :class="comfyReady ? 'is-ok' : 'is-bad'">{{ comfyReady ? 'ComfyUI готов' : 'ComfyUI недоступен' }}</span></div>
      <div class="uk-grid-small uk-child-width-1-4@s uk-margin-top" uk-grid>
        <label>Исполнитель<select v-model="adapterId" class="uk-select uk-margin-small-top"><option value="llama.cpp">llama.cpp</option><option value="comfyui">ComfyUI workflow</option></select></label>
        <label>Ширина<input v-model.number="width" type="number" min="64" class="uk-input uk-margin-small-top"></label>
        <label>Высота<input v-model.number="height" type="number" min="64" class="uk-input uk-margin-small-top"></label>
        <label v-if="activeH3Workflow">Длительность, сек.<input v-model.number="durationSeconds" type="number" min="0.1" step="0.1" class="uk-input uk-margin-small-top"><span class="uk-text-small uk-text-muted">{{ h3Length }} кадров при 24 fps</span><span v-if="comfyVramSummary" class="uk-display-block uk-text-small uk-text-muted">VRAM сейчас: {{ comfyVramSummary }}. Снимок, не прогноз пикового расхода.</span><span v-if="h3MemoryWarning" class="uk-display-block uk-text-warning uk-text-small">Длинный H3-шот. Перед утверждением проверьте свободную VRAM.</span></label>
      </div>
      <label v-if="adapterId === 'comfyui'" class="uk-display-block uk-margin-top">Профиль workflow<select v-model="selectedProfileId" class="uk-select uk-margin-small-top" @change="loadProfileRevisions"><option value="">Ручной workflow</option><option v-for="profile in workflowProfiles" :key="profile.id" :value="profile.id">{{ profile.name }} · {{ profileModelLabel(profile) }}</option></select></label><div v-if="adapterId === 'comfyui' && selectedProfileIsTurbo" class="uk-text-warning uk-text-small uk-margin-small-top">Turbo 4-step экономит VRAM, но может снизить детализацию — используйте как draft, пока не сравнили 8-step quality-профиль.</div>
      <button v-if="adapterId === 'comfyui' && selectedProfileId" type="button" class="uk-button uk-button-default uk-margin-small-top" @click="preflightProfile">Проверить профиль</button><span v-if="preflightQualityHint" class="quality-hint uk-text-small">Класс профиля: {{ preflightQualityHint === 'quality-8step' ? '8-step quality' : preflightQualityHint === 'draft-4step' ? '4-step draft' : 'не определён' }}</span><span v-if="preflightOptimizationNodes.length" class="optimization-hint uk-text-small">Доступные ускорители: {{ preflightOptimizationNodes.join(', ') }}</span>
      <details v-if="adapterId === 'comfyui'" class="studio-advanced uk-margin-top"><summary>Расширенные настройки workflow</summary><details class="studio-revisions uk-margin-top"><summary>Профили и кандидаты · {{ workflowProfileCandidates.length }}</summary><article v-for="profile in workflowProfileCandidates" :key="profile.id" class="uk-margin-small-top"><strong>{{ profile.name }}</strong><span class="uk-text-small"> · {{ profile.active ? 'активен' : 'кандидат' }} · r{{ profile.revision }} · {{ profileModelLabel(profile) }}</span><div class="uk-margin-small-top"><button type="button" class="uk-button uk-button-text" @click="testWorkflowProfileCandidate(profile)">Проверить live schema</button><button v-if="!profile.active" type="button" class="uk-button uk-button-text" @click="profile.reference_bindings?.workbenchKind ? activateWorkbenchProfile(profile) : activateProfileRevision(profile.revision, profile.id)">Активировать</button></div></article><p v-if="!workflowProfileCandidates.length" class="uk-text-small uk-text-muted">Пока нет сохранённых workflow profiles.</p></details><label class="uk-display-block uk-margin-top">Workflow JSON<textarea v-model="workflowJson" class="uk-textarea uk-margin-small-top" rows="5" placeholder="API-format graph with MiniMaxH3ReferenceToVideo"></textarea></label><label class="uk-button uk-button-default uk-margin-small-top">Импортировать JSON из файла<input type="file" accept="application/json,.json" class="uk-hidden" @change="importWorkflowJson"></label><p class="uk-text-small uk-text-muted uk-margin-small-top">Импорт только заполняет редактор. Профиль появится в каталоге после сохранения и проверки.</p><div v-if="selectedProfileId && profileRevisions.length" class="studio-revisions uk-margin-top"><strong>История ревизий</strong><div v-for="revision in profileRevisions" :key="revision.revision" class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-top"><span>r{{ revision.revision }} · <code>{{ revision.graph_hash.slice(0, 12) }}</code></span><button type="button" class="uk-button uk-button-text" @click="activateProfileRevision(revision.revision)">Активировать</button></div></div><div class="uk-grid-small uk-child-width-1-2@s uk-margin-top" uk-grid><label>Название профиля<input v-model="profileName" class="uk-input uk-margin-small-top"></label><div class="uk-flex uk-flex-bottom"><button type="button" class="uk-button uk-button-default" :disabled="!workflowJson.trim()" @click="saveWorkflowProfile">Сохранить профиль</button></div></div><div class="uk-grid-small uk-child-width-1-2@s uk-margin-top" uk-grid><label>Image node IDs<input v-model="imageNodeIds" class="uk-input uk-margin-small-top" placeholder="7,8,9"></label><label>Audio node IDs<input v-model="audioNodeIds" class="uk-input uk-margin-small-top" placeholder="10,11"></label><label>Video node IDs<input v-model="videoNodeIds" class="uk-input uk-margin-small-top" placeholder="12,13"></label></div></details>
      </section>
      <footer class="editor-footer"><div><span class="studio-status" role="status"><span class="status-dot"></span>{{ visibleStatus }}</span><small v-if="adapterId === 'comfyui' && !comfyReady">ComfyUI недоступен — задачу нельзя подготовить.</small></div><button class="uk-button uk-button-primary" :disabled="!prompt.trim() || status === 'submitting' || (adapterId === 'comfyui' && !comfyReady)">{{ status === 'submitting' ? 'Подготавливаем…' : 'Подготовить задачу' }}</button></footer>
      <label v-if="job && status === 'awaiting approval'" class="uk-display-inline-block uk-margin-top uk-margin-left">Повторы после ошибки<input v-model.number="retryBudget" type="number" min="0" max="10" step="1" class="uk-input uk-form-small studio-retry-input"></label><button v-if="job && status === 'awaiting approval'" type="button" class="uk-button uk-button-secondary uk-margin-top uk-margin-left" @click="approveJob">Утвердить</button>
      <details v-if="result" class="studio-technical uk-margin-top"><summary>Технические сведения</summary><pre class="uk-margin-small-top">{{ result }}</pre></details>
      <div v-if="resultPayload?.assets?.length" class="uk-card uk-card-secondary uk-card-body uk-margin-top"><strong>Выберите финальный дубль</strong><div v-for="asset in resultPayload.assets" :key="asset.id" class="uk-margin-small-top"><button type="button" class="uk-button uk-button-text" @click="previewAssetVersion(asset)">{{ asset.logicalName }} · {{ asset.mimeType }}</button><button type="button" class="uk-button uk-button-default uk-margin-small-left" @click="selectFinalTake(resultPayload.job_id, asset.id)">{{ resultPayload.selected_asset_version_id === asset.id ? 'Выбран' : 'Выбрать' }}</button><div class="uk-text-small uk-text-muted"><code>{{ asset.sha256?.slice(0, 16) }}</code> · источник {{ asset.provenance?.source || asset.provenance?.adapter || 'зафиксирован' }}</div></div><div v-if="resultPayload.selected_asset_version_id" class="uk-margin-small-top">Выбранная версия: {{ resultPayload.selected_asset_version_id }}</div><div v-if="previewUrl && previewAsset" class="uk-margin-top"><video v-if="previewAsset.mimeType?.startsWith('video/')" class="uk-width-1-1" controls playsinline :src="previewUrl"></video><audio v-else-if="previewAsset.mimeType?.startsWith('audio/')" controls class="uk-width-1-1" :src="previewUrl"></audio><img v-else-if="previewAsset.mimeType?.startsWith('image/')" class="uk-width-1-1" :src="previewUrl" :alt="previewAsset.logicalName"><a class="uk-button uk-button-default uk-margin-small-top" :href="previewUrl" :download="previewAsset.logicalName">Скачать ассет</a></div></div>
    </form>
    <aside v-if="projects.length" class="studio-inspector" aria-label="Инспектор шота"><button v-if="selectedAssetIds.length" type="button" class="uk-button uk-button-text layout-action" @click="markSelectedAsLayout">Назначить выбранное как Layout</button><span v-if="selectedLayoutCount" class="layout-count">{{ selectedLayoutCount }} Layout reference</span>
      <div class="inspector-heading"><div><span class="panel-eyebrow">МЕДИА</span><h2>Референсы</h2></div><span class="asset-count">{{ selectedReferences.length }}/{{ allMediaAssets.length }}</span></div>
      <div class="inspector-tabs"><button type="button" :class="{ 'is-active': inspectorTab === 'references' }" @click="inspectorTab = 'references'">Медиатека</button><button type="button" :class="{ 'is-active': inspectorTab === 'takes' }" @click="inspectorTab = 'takes'">Дубли</button></div><select v-if="inspectorTab === 'references'" v-model="mediaKindFilter" class="uk-select uk-form-small media-kind-filter" aria-label="Фильтр типа ассета"><option value="all">Все типы</option><option value="actor">Персонажи</option><option value="scene">Локации</option><option value="prop">Предметы</option><option value="audio">Аудио</option><option value="layout">Layout</option><option value="reference">Референсы</option><option value="video">Видео</option></select><p v-if="activeWorkbenchKind === 'image-edit'" class="uk-text-small uk-text-muted">Порядок выбора сохраняется: первое изображение — базовый кадр, следующие — дополнительные референсы.</p>
      <section v-if="inspectorTab === 'references'" class="media-panel"><div v-if="visibleMediaAssets.length" class="reference-list">
        <label v-for="asset in visibleMediaAssets" :key="asset.id" class="studio-reference-card"><input v-model="selectedAssetIds" class="uk-checkbox" type="checkbox" :value="asset.id" @change="markShotReferencesEdited"><span class="reference-icon">{{ (asset.mimeType || asset.mime_type || '').startsWith('video/') ? '▶' : (asset.mimeType || asset.mime_type || '').startsWith('audio/') ? '♫' : '▧' }}</span><span class="reference-copy"><strong>{{ asset.logicalName || asset.provenance?.logicalName || asset.storageKey || asset.storage_key || 'Без имени' }}</strong><small>{{ asset.asset_kind || 'reference' }} · {{ (asset.mimeType || asset.mime_type || 'asset').replace('/', ' · ') }}<template v-if="asset.byteSize || asset.byte_size"> · {{ Math.round(Number(asset.byteSize || asset.byte_size) / 1024) }} KB</template></small></span><select v-model="referenceRoles[asset.id]" class="uk-select uk-form-small" :disabled="isMultiRoleReference(asset.id)" :aria-label="`Роль ассета ${asset.logicalName || asset.id}`" @change="markShotReferencesEdited"><option v-if="(asset.mimeType || asset.mime_type || '').startsWith('audio/')" value="audio">Аудио</option><option v-else-if="(asset.mimeType || asset.mime_type || '').startsWith('video/')" value="video">Видео</option><template v-else><option value="picture">Кадр</option><option value="first-frame">First Frame</option><option value="last-frame">Last Frame</option><option value="actor">Персонаж</option><option value="set">Локация</option><option value="prop">Предмет</option></template></select><details class="reference-provenance"><summary>i</summary><code>{{ asset.sha256?.slice(0, 12) }}</code></details></label>
      </div><div v-else class="empty-media"><strong>Пока нет референсов</strong><p>Добавьте кадр, видео или звук — они останутся в локальной медиатеке.</p></div><div class="media-import-meta"><select v-model="importAssetKind" class="uk-select uk-form-small" aria-label="Тип нового ассета"><option value="reference">Референс</option><option value="actor">Персонаж</option><option value="scene">Локация</option><option value="prop">Предмет</option><option value="audio">Аудио</option><option value="layout">Layout</option><option value="video">Видео</option></select><input v-model="importAssetTags" class="uk-input uk-form-small" placeholder="Теги через запятую" aria-label="Теги нового ассета"></div><label class="media-upload" :class="{ 'is-loading': importingAsset }"><input type="file" :disabled="importingAsset" @change="importAsset"><span>{{ importingAsset ? 'Добавляем…' : '＋ Добавить референс' }}</span><small>Локальная неизменяемая версия</small></label></section>
      <section v-else class="takes-panel"><article v-if="resultExecutionEvidence" class="uk-card uk-card-secondary uk-card-body uk-margin-small-bottom"><div class="uk-flex uk-flex-between uk-flex-middle"><strong>Происхождение результата</strong><span class="uk-text-small uk-text-warning">Нужен просмотр</span></div><div class="uk-margin-small-top uk-text-small"><div v-if="resultExecutionEvidence.workflow?.profileId">Профиль: <code>{{ resultExecutionEvidence.workflow.profileId }}</code></div><div v-if="resultExecutionEvidence.workflow?.mode || resultExecutionEvidence.workflow?.workbenchKind">Режим: {{ resultExecutionEvidence.workflow.mode || resultExecutionEvidence.workflow.workbenchKind }}</div><div v-if="resultExecutionEvidence.workflow?.profileGraphHash">Профильный graph hash: <code>{{ resultExecutionEvidence.workflow.profileGraphHash.slice(0, 16) }}</code></div><div v-if="resultExecutionEvidence.workflow?.effectiveGraphHash">Отправленный graph hash: <code>{{ resultExecutionEvidence.workflow.effectiveGraphHash.slice(0, 16) }}</code></div><div v-if="resultExecutionEvidence.settings">Параметры: {{ resultExecutionEvidence.settings.width ?? '—' }}×{{ resultExecutionEvidence.settings.height ?? '—' }}<template v-if="resultExecutionEvidence.settings.frameCount"> · {{ resultExecutionEvidence.settings.frameCount }} кадров ({{ (resultExecutionEvidence.settings.frameCount / 24).toFixed(2) }} с)</template><template v-if="resultExecutionEvidence.settings.seed !== undefined"> · seed {{ resultExecutionEvidence.settings.seed }}</template></div><div v-if="resultExecutionEvidence.runtime?.comfyuiVersion || resultExecutionEvidence.runtime?.pytorchVersion">Runtime: ComfyUI {{ resultExecutionEvidence.runtime.comfyuiVersion || '—' }}<template v-if="resultExecutionEvidence.runtime.pytorchVersion"> · PyTorch {{ resultExecutionEvidence.runtime.pytorchVersion }}</template></div><div v-for="device in executionEvidenceMemoryDevices" :key="device.name">VRAM наблюдение · {{ device.name }}: минимум свободно {{ (device.minimumObservedFreeBytes / 1024 ** 3).toFixed(1) }} / {{ (device.vramTotalBytes / 1024 ** 3).toFixed(1) }} GiB</div></div><p class="uk-text-small uk-text-muted uk-margin-small-top uk-margin-remove-bottom">Техническое происхождение, не оценка качества. VRAM — наблюдение за устройством и другими процессами за время job, не peak конкретного workflow. Перед выбором дубля проверьте изображение и звук.</p></article><div v-if="resultPayload?.assets?.length"><div class="take-toolbar"><p>Просмотрите варианты и выберите финальный дубль.</p><div><button type="button" class="take-nav" :disabled="resultAssets.length < 2" @click="previewTakeAt(-1)" aria-label="Предыдущий дубль">←</button><span>{{ activeTakeIndex >= 0 ? activeTakeIndex + 1 : '—' }} / {{ resultAssets.length }}</span><button type="button" class="take-nav" :disabled="resultAssets.length < 2" @click="previewTakeAt(1)" aria-label="Следующий дубль">→</button></div></div><div v-for="(asset, index) in resultAssets" :key="asset.id" class="take-row" :class="{ 'is-previewed': activeTakeIndex === index, 'is-final': resultPayload.selected_asset_version_id === asset.id }"><button type="button" class="take-name" @click="previewAssetVersion(asset)"><span class="take-number">{{ String(index + 1).padStart(2, '0') }}</span><span>{{ asset.logicalName }}</span></button><button type="button" class="uk-button uk-button-default" @click="selectFinalTake(resultPayload.job_id, asset.id)">{{ resultPayload.selected_asset_version_id === asset.id ? 'Финальный' : 'Выбрать' }}</button></div></div><div v-else class="empty-media"><strong>Здесь появятся дубли</strong><p>Откройте результат задачи из очереди, чтобы просмотреть и утвердить финальный вариант.</p></div></section>
    </aside>
  </main>
</template>

<style>
:root { color-scheme: dark; --bg:#111418; --surface:#181c22; --surface-raised:#20252d; --line:#303742; --text:#f1f4f7; --muted:#97a1af; --accent:#63a7ff; --accent-deep:#367ed7; --success:#58c994; --danger:#ed7a87; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); font-family:Inter, ui-sans-serif, system-ui, sans-serif; }
.studio-shell { display:grid; grid-template-columns:272px minmax(530px, 1fr) 318px; grid-template-rows:auto 1fr; gap:24px; max-width:1680px; min-height:100dvh; margin:0 auto; padding:18px 24px 30px; }
.studio-topbar { grid-column:1 / -1; min-height:48px; display:flex; align-items:center; gap:28px; border-bottom:1px solid var(--line); padding-bottom:16px; }
.studio-brand { display:inline-flex; align-items:center; gap:10px; color:var(--text); font-weight:650; text-decoration:none; letter-spacing:-.02em; }
.studio-mark { display:grid; place-items:center; width:29px; height:29px; border:1px solid color-mix(in srgb,var(--accent) 75%,white); border-radius:8px; color:var(--accent); font-size:10px; letter-spacing:.02em; }
.studio-breadcrumb { display:flex; gap:9px; align-items:center; min-width:0; color:var(--muted); font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.topbar-health{display:flex;align-items:center;gap:10px;margin-left:auto;color:var(--muted);font-size:11px;white-space:nowrap}.topbar-health span{display:inline-flex;align-items:center;gap:5px}.topbar-health i{width:6px;height:6px;border-radius:50%;background:currentColor}.topbar-health .is-ok{color:var(--success)}.topbar-health .is-warn{color:#d9a75e}.topbar-health .is-bad{color:var(--danger)}
.studio-breadcrumb span,.studio-breadcrumb strong { overflow:hidden; text-overflow:ellipsis; }.studio-breadcrumb strong{color:var(--text);font-weight:600}.studio-breadcrumb i{font-style:normal;color:#59616d}.studio-header-actions{margin-left:0;display:flex;gap:8px;align-items:center}.studio-header-actions .uk-button{white-space:nowrap}
.panel-eyebrow,.studio-kicker { display:block; color:var(--muted); font-size:10px; font-weight:700; letter-spacing:.13em; }.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.studio-library,.studio-inspector,.studio-editor { min-width:0; }.studio-library{position:sticky;top:16px;align-self:start}.library-project{padding-bottom:18px;border-bottom:1px solid var(--line)}.library-project .panel-eyebrow{margin-bottom:9px}.library-actions{display:flex;gap:4px;margin-top:7px}.library-actions .uk-button{font-size:12px;padding:0}.library-heading{display:flex;justify-content:space-between;margin:20px 0 9px;color:var(--text);font-size:13px;font-weight:600}.library-heading span:last-child{color:var(--muted);font-weight:400;font-size:11px}
.scene-group{margin-bottom:13px}.scene-row{display:flex;align-items:center;min-height:30px;padding:0 5px;border-radius:6px}.scene-row.is-active{background:#252c36}.scene-title{min-width:0;flex:1;border:0;background:transparent;color:var(--muted);font-size:12px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.tree-actions{opacity:.25;display:flex}.scene-row:hover .tree-actions{opacity:1}.tree-button{border:0;background:transparent;color:var(--muted);padding:3px 4px;cursor:pointer}.tree-button:disabled{opacity:.25;cursor:not-allowed}.shot-row{width:100%;display:flex;align-items:center;gap:9px;padding:9px 8px;margin:2px 0;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--text);text-align:left;cursor:pointer}.shot-row:hover{background:#1d222a}.shot-row.is-active{background:#263c58;border-color:#34587e;box-shadow:inset 2px 0 var(--accent)}.shot-index{color:var(--muted);font-size:10px;font-variant-numeric:tabular-nums}.shot-copy{min-width:0}.shot-copy strong,.shot-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.shot-copy strong{font-size:13px;font-weight:550}.shot-copy small{margin-top:2px;color:var(--muted);font-size:11px}.library-add{margin-top:22px;padding-top:14px;border-top:1px solid var(--line)}.library-add summary{cursor:pointer;color:var(--accent);font-size:13px;font-weight:600;list-style:none}.library-add form{display:grid;gap:7px;margin-top:12px;padding-top:11px;border-top:1px solid #252b34}.library-add label{display:grid;gap:4px;color:var(--muted);font-size:11px}.library-add .uk-button{justify-self:start;font-size:11px;min-height:30px}
.studio-editor{padding:0 4px}.editor-heading{display:flex;align-items:start;justify-content:space-between;gap:20px;margin:4px 0 18px}.editor-heading h1{margin:4px 0 3px;color:var(--text);font-size:clamp(28px,3vw,38px);letter-spacing:-.045em;line-height:1.05}.editor-heading p{margin:0;color:var(--muted);font-size:13px}.shot-stage{position:relative;display:flex;align-items:flex-end;min-height:228px;overflow:hidden;padding:22px;border:1px solid #343b48;border-radius:14px;background:radial-gradient(circle at 72% 20%,#274565 0,transparent 36%),linear-gradient(135deg,#1f252e,#15191f)}.shot-stage.has-reference{background:radial-gradient(circle at 8% 100%,#453952 0,transparent 38%),radial-gradient(circle at 86% 20%,#244b67 0,transparent 38%),#171b22}.stage-grid{position:absolute;inset:0;opacity:.18;background-image:linear-gradient(90deg,transparent 49.8%,#91b6d7 50%,transparent 50.2%),linear-gradient(#91b6d7 1px,transparent 1px);background-size:100% 100%,100% 50%;mask-image:linear-gradient(to bottom,black,transparent)}.stage-content{position:relative;max-width:390px}.stage-label{display:block;margin-bottom:8px;color:#b5cff1;font-size:10px;font-weight:700;letter-spacing:.12em}.stage-content strong{display:block;font-size:22px;line-height:1.15;letter-spacing:-.025em}.stage-content p{margin:8px 0 0;color:#b5c0cf;font-size:13px;line-height:1.45}.stage-meta{position:absolute;right:18px;bottom:16px;display:flex;gap:7px}.stage-meta span{padding:5px 8px;border:1px solid #4e5d70;border-radius:99px;background:#11192380;color:#bfcbda;font-size:10px}.editor-tabs{display:flex;gap:18px;border-bottom:1px solid var(--line);margin-top:25px}.editor-tabs button,.inspector-tabs button{position:relative;border:0;background:transparent;color:var(--muted);padding:0 0 11px;font-size:13px;cursor:pointer}.editor-tabs button.is-active,.inspector-tabs button.is-active{color:var(--text);font-weight:600}.editor-tabs button.is-active:after,.inspector-tabs button.is-active:after{position:absolute;right:0;bottom:-1px;left:0;height:2px;background:var(--accent);content:''}.editor-panel{padding:20px 0}.field-label{display:block;margin-bottom:8px;color:var(--text);font-size:15px;font-weight:600}.shot-prompt{min-height:180px;padding:15px!important;font-size:15px!important;line-height:1.55!important}.field-hint{margin:8px 0 0;color:var(--muted);font-size:12px}.director-intro{display:flex;justify-content:space-between;align-items:start;gap:16px}.director-intro h2{margin:0;font-size:17px;letter-spacing:-.02em}.director-intro p{margin:4px 0 0;color:var(--muted);font-size:12px}.runtime-state{padding:5px 8px;border-radius:99px;font-size:11px}.runtime-state.is-ok{background:#183526;color:var(--success)}.runtime-state.is-bad{background:#44252c;color:var(--danger)}.editor-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:6px;padding:18px 0;border-top:1px solid var(--line)}.editor-footer .uk-button-primary{min-height:43px;padding:0 18px;font-size:13px}.studio-status{display:inline-flex;align-items:center;gap:7px;color:var(--muted);font-size:12px}.status-dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}.editor-footer small{display:block;margin-top:5px;color:var(--danger);font-size:11px}.studio-advanced{padding:14px;margin-top:16px;background:#151a20;border:1px solid var(--line);border-radius:9px}.studio-advanced summary{cursor:pointer;color:var(--muted);font-size:12px}.studio-revisions{padding-top:10px;border-top:1px solid var(--line)}.studio-technical{font-size:12px;color:var(--muted)}.studio-technical pre{max-height:180px;overflow:auto;white-space:pre-wrap;background:#12161b;border:1px solid var(--line);border-radius:8px;padding:10px}.studio-retry-input{width:76px;display:block;margin-top:4px}
.studio-inspector{position:sticky;top:16px;align-self:start;padding:17px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.inspector-heading{display:flex;justify-content:space-between;align-items:start}.inspector-heading h2{margin:3px 0 0;font-size:20px;letter-spacing:-.03em}.asset-count{display:grid;place-items:center;min-width:34px;height:24px;border-radius:7px;background:#28313c;color:var(--muted);font-size:11px}.inspector-tabs{display:flex;gap:16px;margin-top:18px;border-bottom:1px solid var(--line)}.media-panel,.takes-panel{padding-top:7px}.reference-list{max-height:calc(100dvh - 290px);overflow:auto}.studio-reference-card{display:grid;grid-template-columns:auto 28px minmax(0,1fr) 88px 18px;align-items:center;gap:8px;padding:11px 0;border-bottom:1px solid #2d343e;cursor:pointer}.studio-reference-card:last-child{border-bottom:0}.reference-icon{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;background:#263b51;color:#8bc2ff;font-size:12px}.reference-copy{min-width:0}.reference-copy strong,.reference-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.reference-copy strong{font-size:12px;font-weight:600}.reference-copy small{margin-top:2px;color:var(--muted);font-size:10px}.studio-reference-card .uk-select{width:88px;min-width:0;height:30px;padding-left:7px;font-size:10px}.reference-provenance{position:relative;font-size:10px;color:var(--muted)}.reference-provenance summary{display:grid;place-items:center;width:18px;height:18px;border:1px solid #46505d;border-radius:50%;cursor:pointer}.reference-provenance code{position:absolute;z-index:2;right:0;margin-top:4px;padding:5px 7px;border:1px solid var(--line);border-radius:5px;background:#11151a}.media-upload{display:flex;flex-direction:column;gap:3px;margin-top:14px;padding:14px;border:1px dashed #4b596b;border-radius:9px;color:var(--accent);cursor:pointer}.media-upload input{position:absolute;width:1px;height:1px;opacity:0}.media-upload span{font-size:13px;font-weight:600}.media-upload small{color:var(--muted);font-size:10px}.media-upload.is-loading{opacity:.6;pointer-events:none}.empty-media{padding:19px 2px;color:var(--muted);font-size:12px}.empty-media strong{color:var(--text);font-size:13px}.empty-media p{margin:6px 0 0;line-height:1.45}.takes-panel>p{color:var(--muted);font-size:12px}.take-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid var(--line)}
.studio-onboarding{grid-column:1/-1;align-self:stretch;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100dvh - 142px);padding:56px 20px 44px;text-align:center}.studio-onboarding h1{margin:10px 0 8px;color:var(--text);font-size:clamp(38px,5vw,54px);font-weight:620;letter-spacing:-.055em;line-height:1.04}.studio-onboarding>p:not(.project-create-error){max-width:610px;margin:0;color:var(--muted);font-size:14px;line-height:1.65}.studio-onboarding form{display:flex;gap:8px;width:min(540px,100%);margin:25px auto 0}.studio-onboarding .uk-input{flex:1;min-width:0;min-height:46px;padding:0 14px}.studio-onboarding form .uk-button{min-height:46px;padding:0 16px;white-space:nowrap}.project-create-error{width:min(540px,100%);margin:9px auto 0;color:var(--danger);font-size:12px;text-align:left}.onboarding-next{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:min(700px,100%);margin-top:42px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);text-align:left}.onboarding-next span{display:grid;gap:6px;padding:14px 16px}.onboarding-next strong{color:var(--text);font-size:12px;font-weight:580}.onboarding-next small{color:var(--muted);font-size:11px}.onboarding-local{display:flex;align-items:center;gap:9px;width:min(700px,100%);margin-top:16px;padding:11px 14px;border-radius:6px;background:#15191d;color:var(--muted);font-size:11px;text-align:left}.onboarding-local span{color:var(--accent);font-size:15px}.studio-empty-footer{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;min-height:34px;padding-top:11px;border-top:1px solid var(--line);color:#6e7984;font-size:9px;letter-spacing:.08em}.studio-empty-footer span:last-child{font-size:10px;letter-spacing:0}
.studio-tools-panel h2{margin:7px 0 20px;font-size:22px;letter-spacing:-.035em}.studio-tools-panel .director-chat{margin-bottom:18px}.studio-tools-panel .asset-workbench{margin:14px 0}.studio-tools-panel .workflow-wizard{margin-top:14px}
.studio-shell .uk-input,.studio-shell .uk-select,.studio-shell .uk-textarea{border-color:var(--line);border-radius:8px;background:#171c22;color:var(--text)}.studio-shell .uk-input:focus,.studio-shell .uk-select:focus,.studio-shell .uk-textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px #63a7ff24}.studio-shell .uk-button{border-radius:7px;transition:background-color .15s ease,border-color .15s ease,transform .15s ease}.studio-shell .uk-button-primary{border:0;background:var(--accent-deep);color:white}.studio-shell .uk-button-primary:hover{background:var(--accent)}.studio-shell .uk-button-default{border-color:#566171;color:var(--text);background:transparent}.studio-shell .uk-button-text{color:var(--accent)}.studio-shell .uk-button:active{transform:translateY(1px)}.uk-offcanvas-bar{background:#171c22}.uk-offcanvas-bar .uk-card-secondary{background:#222933;border-radius:10px}
@media(max-width:1180px){.studio-shell{grid-template-columns:240px minmax(0,1fr);gap:20px}.studio-inspector{grid-column:1 / -1;position:static}.reference-list{max-height:320px}.studio-inspector{display:block}.studio-reference-card{grid-template-columns:auto 28px minmax(0,1fr) 105px 18px}}
@media(max-width:720px){.studio-shell{display:block;padding:14px}.studio-topbar{gap:12px;flex-wrap:wrap}.studio-breadcrumb{order:3;width:100%}.studio-header-actions{margin-left:auto}.studio-header-actions .uk-button-text{display:none}.studio-header-actions .uk-button{font-size:11px;padding:0 9px}.studio-library,.studio-inspector{position:static;margin-top:20px}.studio-editor{margin-top:26px}.library-add form{max-width:330px}.editor-heading{margin-top:0}.shot-stage{min-height:190px}.studio-reference-card{grid-template-columns:auto 28px minmax(0,1fr) 78px 18px}.studio-reference-card .uk-select{width:78px}.editor-footer{align-items:flex-end}.studio-onboarding{min-height:calc(100dvh - 180px);padding:58px 0 36px}.studio-onboarding h1{font-size:38px}.studio-onboarding>p:not(.project-create-error){font-size:13px}.studio-onboarding>p br{display:none}.studio-onboarding form{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}.studio-onboarding form .uk-button{width:100%}.onboarding-next{grid-template-columns:1fr;margin-top:30px}.onboarding-next span{padding:11px 14px}.onboarding-local{line-height:1.5}.studio-empty-footer{gap:14px;align-items:flex-start;flex-direction:column}.studio-empty-footer span:last-child{font-size:10px}}
@media(prefers-reduced-motion:reduce){.studio-shell .uk-button{transition:none}}
.stage-preview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.62;filter:saturate(.8)}.shot-stage.has-reference .stage-grid{z-index:1}.shot-stage.has-reference .stage-content,.shot-stage.has-reference .stage-meta{z-index:2}.shot-stage.has-reference:after{position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,16,22,.9),rgba(12,16,22,.2) 72%);content:''}
.take-toolbar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0 8px;color:var(--muted);font-size:11px}.take-toolbar p{margin:0;line-height:1.35}.take-toolbar>div{display:flex;align-items:center;gap:6px;white-space:nowrap}.take-nav{width:25px;height:25px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--text);cursor:pointer}.take-nav:disabled{opacity:.35;cursor:not-allowed}.take-row{border:1px solid transparent;border-radius:8px;padding:8px 6px}.take-row.is-previewed{border-color:#426b96;background:#202f40}.take-row.is-final{box-shadow:inset 2px 0 var(--success)}.take-name{display:flex;align-items:center;gap:8px;min-width:0;border:0;background:transparent;color:var(--text);cursor:pointer;text-align:left;font-size:11px}.take-name span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.take-number{color:var(--muted);font-variant-numeric:tabular-nums}
.shot-row-wrap{display:flex;align-items:center;border:1px solid transparent;border-radius:8px;margin:2px 0}.shot-row-wrap.is-active{background:#263c58;border-color:#34587e;box-shadow:inset 2px 0 var(--accent)}.shot-row-wrap:hover{background:#1d222a}.shot-row-wrap .shot-row{flex:1;margin:0;border:0}.shot-row-wrap.is-active .shot-row{background:transparent}.shot-tools{display:flex;gap:1px;padding-right:5px;opacity:0}.shot-row-wrap:hover .shot-tools,.shot-row-wrap.is-active .shot-tools{opacity:.8}.shot-tools button{border:0;background:transparent;color:var(--muted);padding:3px;cursor:pointer;font-size:11px}.shot-tools button:disabled{opacity:.25;cursor:not-allowed}
.queue-history{border-top:1px solid var(--line);padding-top:14px}.history-row{padding:10px 0;border-bottom:1px solid var(--line);line-height:1.35}.history-row:last-child{border-bottom:0}
.timeline-strip{margin:14px 0;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:#171c22}.timeline-header{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:10px;letter-spacing:.12em}.timeline-header small{letter-spacing:0;font-size:11px}.timeline-track{display:flex;gap:6px;margin-top:10px;overflow-x:auto;padding-bottom:2px}.timeline-shot{display:grid;gap:3px;min-width:130px;padding:9px 10px;border:1px solid var(--line);border-radius:7px;background:#20262e;color:var(--text);text-align:left;cursor:pointer}.timeline-shot:hover,.timeline-shot.is-active{border-color:var(--accent);background:#263c58}.timeline-shot span,.timeline-shot small{color:var(--muted);font-size:10px}.timeline-shot strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.timeline-shot em{display:block;color:var(--muted);font-style:normal;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prompt-readiness{display:flex;justify-content:space-between;align-items:start;gap:12px}.prompt-score{padding:5px 9px;border:1px solid var(--line);border-radius:99px;color:var(--muted);font-size:11px}.prompt-score.is-ready{border-color:#357b59;background:#173426;color:var(--success)}
.media-kind-filter{margin-top:10px;font-size:11px}
.media-import-meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px}.media-import-meta .uk-input,.media-import-meta .uk-select{font-size:11px}
.quality-hint{display:inline-block;margin:9px 0 0 8px;color:var(--muted)}
.optimization-hint{display:block;margin-top:6px;color:var(--muted);font-size:10px}
.layout-action{margin-bottom:6px;font-size:11px}
.layout-count{display:block;margin-bottom:6px;color:var(--muted);font-size:10px}
.h3-preflight{margin-top:1rem;padding:.85rem 1rem;border:1px solid var(--line);border-radius:8px;background:#151a20;color:var(--text);font-size:.82rem}.h3-preflight>div{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}.h3-preflight span,.h3-preflight p,.h3-preflight small{color:var(--muted)}.h3-preflight ul{margin:.6rem 0 0;padding-left:1.15rem}.h3-preflight-errors{color:#f0a3aa}.h3-preflight-warnings{color:#e2bd7a}.h3-preflight p{margin:.55rem 0 0}.h3-preflight small{display:block;margin-top:.55rem}
.h3-events{margin-top:1.5rem;padding:1rem;border:1px solid var(--line);border-radius:9px;background:#151a20}.h3-event-row{display:grid;gap:.7rem;margin-top:.8rem;padding:.85rem;border:1px solid #343c46;border-radius:8px}.h3-event-row header{display:flex;justify-content:space-between;align-items:center}.h3-event-row label{display:grid;gap:.35rem;font-size:.78rem;color:var(--muted)}.h3-event-range{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}.h3-event-error{color:#f0a3aa;font-size:.82rem}
.h3-event-review{margin-top:.9rem;padding:.75rem;border:1px solid var(--line);border-radius:7px;font-size:.8rem}.h3-event-review p{margin:.35rem 0 0;color:var(--muted)}.h3-event-review.is-incomplete{border-color:#886348}.h3-event-review.is-structured{border-color:#3d7554}
.director-timeline-detail{margin-top:10px;border-top:1px solid var(--line);padding-top:9px;color:var(--muted);font-size:11px}.director-timeline-detail>summary,.director-event-list>summary{cursor:pointer}.director-timeline-detail>summary span{color:#d5b875}.director-timeline-rows{display:grid;gap:5px;margin-top:9px;max-height:310px;overflow:auto}.director-timeline-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding:7px;border:1px solid var(--line);border-radius:6px;background:#1d222a}.director-timeline-row>button{display:grid;gap:3px;min-width:0;border:0;background:transparent;color:var(--text);text-align:left;cursor:pointer}.director-timeline-row>button.is-active strong{color:var(--accent)}.director-timeline-row>button span,.director-timeline-row>button small{color:var(--muted);font-size:10px}.director-timeline-row>button strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.director-event-list{max-width:300px}.director-event-list ol{display:grid;gap:5px;max-height:180px;overflow:auto;margin:6px 0;padding-left:22px}.director-event-list li{padding-left:2px}.director-event-list li span,.director-event-list li strong,.director-event-list li small{display:block}.director-event-list li span,.director-event-list li small{color:var(--muted);font-size:10px}.director-event-list li strong{color:var(--text);font-size:10px;font-weight:500}.director-timeline-note{margin:8px 0 0;font-size:10px;color:var(--muted)}
</style>
