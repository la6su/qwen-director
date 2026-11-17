<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PlannerContinuityAudit, PlannerContinuityContext } from '@qwendirector/contracts/planner';

type AgentTurn = { role: 'user' | 'assistant'; content: string; provenance?: { model?: string; toolsUsed?: string[] } };
type Session = { id: string; turns: AgentTurn[]; version: number };
const props = defineProps<{ token?: string; projectId?: string; shotId?: string; brief: Record<string, string> }>();
type PlannerProposal = { sections: Record<string, string>; continuityAudit: PlannerContinuityAudit; continuityContext?: PlannerContinuityContext; continuityContextHash?: string; decisionHash: string; sessionId: string; provenance: { source: string; model?: string; toolsUsed?: string[]; createdAt: string } };
const emit = defineEmits<{ apply: [decision: PlannerProposal] }>();
const busy = ref(false);
const notice = ref('');
const instruction = ref('');
const sessionId = ref('');
const turns = ref<AgentTurn[]>([]);
const proposal = ref<PlannerProposal | null>(null);
const proposalBase = ref<Record<string, string> | null>(null);
const labels: Record<string, string> = { prompt:'Бриф', camera:'Камера', action:'Действие', composition:'Композиция', lighting:'Свет', sound:'Звуковая среда', music:'Музыка', transition:'Переход' };
const continuityLabels: Record<string, string> = { shotScale:'Крупность', cameraAxis:'Угол камеры', screenDirection:'Экранный вектор', actionPhase:'Фаза действия', focalCenter:'Центр внимания', lightingColorBridge:'Световой/цветовой мост', motionTempo:'Темп движения', actionCausality:'Причинная структура событий' };
const continuityStatuses: Record<string, string> = { 'continuity-consistent':'стык выглядит согласованным', 'review-required':'нужна проверка стыка', 'not-enough-context':'недостаточно контекста' };
const checkResults: Record<string, string> = { consistent:'согласовано', review:'проверить', 'not-applicable':'нет данных' };
const changedSections = computed(() => Object.keys(labels).filter((key) => proposal.value && proposalBase.value && proposal.value.sections[key] !== proposalBase.value[key]));
const projectKey = computed(() => `qwendirector-agent-session:${props.projectId || 'unbound'}:${props.shotId || 'project'}`);
const proposalIsCurrent = computed(() => Boolean(proposal.value && proposalBase.value && Object.keys(labels).every((key) => String(props.brief[key] ?? '') === proposalBase.value?.[key])));
let loadEpoch = 0;

function headers() {
  return { 'content-type':'application/json', ...(props.token ? { authorization:`Bearer ${props.token}` } : {}) };
}
async function loadSession() {
  const epoch = ++loadEpoch;
  const id = localStorage.getItem(projectKey.value) ?? '';
  sessionId.value = id;
  turns.value = [];
  if (!id) return;
  try {
    const response = await fetch(`/v1/planner/sessions/${id}`, { headers:headers() });
    if (epoch !== loadEpoch) return;
    if (response.status === 404) {
      localStorage.removeItem(projectKey.value);
      sessionId.value = '';
      return;
    }
    if (!response.ok) throw new Error('DIRECTOR_SESSION_LOAD_FAILED');
    const session = await response.json() as Session;
    if (epoch === loadEpoch) turns.value = session.turns ?? [];
  } catch (error) { if (epoch === loadEpoch) notice.value = String(error); }
}
watch(projectKey, () => {
  proposal.value = null;
  proposalBase.value = null;
  void loadSession();
}, { immediate:true });

function resetConversation() {
  localStorage.removeItem(projectKey.value);
  sessionId.value = '';
  turns.value = [];
  proposal.value = null;
  proposalBase.value = null;
  notice.value = 'Начат новый диалог';
}
function discardProposal() {
  proposal.value = null;
  proposalBase.value = null;
  notice.value = 'Предложение отброшено; поля шота не изменены.';
}
function applyProposal() {
  if (!proposal.value || !proposalBase.value) return;
  if (!proposalIsCurrent.value) {
    proposal.value = null;
    proposalBase.value = null;
    notice.value = 'Поля шота изменились после подготовки предложения. Оно устарело и не применено; запустите Director ещё раз.';
    return;
  }
  emit('apply', proposal.value);
  proposal.value = null;
  proposalBase.value = null;
  notice.value = 'Предложение применено к полям шота.';
}
async function plan() {
  const requestKey = projectKey.value;
  const requestEpoch = loadEpoch;
  const requestProjectId = props.projectId;
  const requestShotId = props.shotId;
  const requestBrief = { ...props.brief };
  const briefSignature = JSON.stringify(Object.keys(requestBrief).sort().map((key) => [key, requestBrief[key]]));
  const currentBriefSignature = () => JSON.stringify(Object.keys(props.brief).sort().map((key) => [key, props.brief[key]]));
  const requestMessage = instruction.value.trim();
  const requestIsCurrent = () => projectKey.value === requestKey && loadEpoch === requestEpoch && currentBriefSignature() === briefSignature && instruction.value.trim() === requestMessage;
  if (!requestBrief.prompt?.trim()) { notice.value = 'Сначала опишите shot'; return; }
  busy.value = true;
  notice.value = '';
  try {
    const requestHeaders = headers();
    let requestSessionId = sessionId.value;
    if (!requestSessionId) {
      const created = await fetch('/v1/planner/sessions', { method:'POST', headers:requestHeaders, body:JSON.stringify({projectId:requestProjectId || undefined}) });
      const session = await created.json();
      if (!created.ok) throw new Error(session.code || 'DIRECTOR_SESSION_FAILED');
      requestSessionId = session.id;
      localStorage.setItem(requestKey, requestSessionId);
      if (requestIsCurrent()) sessionId.value = requestSessionId;
    }
    const response = await fetch('/v1/planner/assist', {
      method:'POST', headers:requestHeaders,
      body:JSON.stringify({ ...requestBrief, message:requestMessage, sessionId:requestSessionId, shotId:requestShotId || undefined }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.code || 'PLANNER_FAILED');
    if (!requestIsCurrent()) {
      if (projectKey.value === requestKey) notice.value = 'Поля shot изменились — старое предложение не применено. Запустите Director ещё раз.';
      return;
    }
    proposalBase.value = Object.fromEntries(Object.keys(labels).map((key) => [key, String(requestBrief[key] ?? '')]));
    proposal.value = { sections: body.sections, continuityAudit: body.continuityAudit, continuityContext: body.continuityContext, continuityContextHash: body.continuityContextHash, decisionHash: body.decisionHash, sessionId: requestSessionId, provenance: body.provenance };
    instruction.value = '';
    await loadSession();
    if (projectKey.value === requestKey) {
      const toolLabel = body.provenance.toolsUsed?.length ? ' · проект и workflow прочитаны' : '';
      notice.value = `Предложение подготовлено локально · ${body.provenance.model}${toolLabel}. Проверьте изменения перед применением.`;
    }
  } catch (error) {
    if (requestIsCurrent()) {
      const message = String(error);
      notice.value = message.includes('PLANNER_AUDIT_UNSUPPORTED_CONSISTENCY_CLAIM')
        ? 'Проверка стыка не подтверждена: добавьте отсутствующие поля во вкладке «Режиссура» или попросите Planner отметить её как требующую просмотра.'
        : message;
    }
  }
  finally { busy.value = false; }
}

function assistantMessage(content: string): { sections:Array<{label:string;value:string}>; audit?:PlannerContinuityAudit } {
  try {
    const parsed = JSON.parse(content) as { sections?:Record<string,unknown>; continuityAudit?:PlannerContinuityAudit };
    const source = parsed.sections ?? parsed as Record<string,unknown>;
    return { sections:Object.entries(labels).flatMap(([key, label]) => typeof source[key] === 'string' && source[key] ? [{label, value:source[key] as string}] : []), audit:parsed.continuityAudit };
  } catch { return { sections:[{label:'Ответ', value:content}] }; }
}
</script>

<template>
  <section class="director-chat" aria-label="Локальный Director">
    <header class="director-chat__header">
      <strong>Локальный Director</strong>
      <span>{{ projectId ? 'Контекст проекта включён' : 'Без выбранного проекта' }}</span>
      <button v-if="turns.length" type="button" class="uk-button uk-button-text" :disabled="busy" @click="resetConversation">Новый диалог</button>
    </header>
    <div v-if="turns.length" class="director-chat__history" aria-live="polite">
      <article v-for="(turn, index) in turns" :key="`${index}-${turn.role}`" class="director-chat__turn" :class="`is-${turn.role}`">
        <span class="director-chat__role">{{ turn.role === 'user' ? 'Вы' : `Director${turn.provenance?.model ? ` · ${turn.provenance.model}` : ''}` }}</span>
        <p v-if="turn.role === 'user'">{{ turn.content }}</p>
        <template v-else><dl><template v-for="section in assistantMessage(turn.content).sections" :key="section.label"><dt>{{ section.label }}</dt><dd>{{ section.value }}</dd></template></dl><aside v-if="assistantMessage(turn.content).audit" class="director-chat__audit"><strong>Проверка стыка · {{ continuityStatuses[assistantMessage(turn.content).audit?.status ?? ''] }}</strong><ul><li v-for="(check, key) in assistantMessage(turn.content).audit?.checks" :key="key"><b>{{ continuityLabels[key] ?? key }}:</b> {{ checkResults[check.result] }} — {{ check.note }}</li></ul><small>Автоматическая подсказка; финальное решение остаётся за режиссёром.</small></aside></template>
      </article>
    </div>
    <label class="director-chat__input">
      <span>Уточните shot plan</span>
      <textarea v-model="instruction" class="uk-textarea" rows="2" maxlength="3000" placeholder="Например: камера ниже, действие спокойнее, сохранить сет и свет"></textarea>
    </label>
    <section v-if="proposal" class="director-chat__proposal" aria-label="Предложение локального Director">
      <header><strong>Предложение · {{ changedSections.length }} изменённых {{ changedSections.length === 1 ? 'поле' : 'полей' }}</strong><span>Исходные поля сохранены до вашего решения.</span></header>
      <p v-if="!proposalIsCurrent" class="director-chat__stale" role="status">Исходные поля изменились. Это предложение устарело, его нельзя применить.</p>
      <p v-if="!changedSections.length" class="director-chat__unchanged">Модель не предложила отличий от текущего брифа.</p>
      <details v-for="key in changedSections" :key="key" class="director-chat__diff" open>
        <summary>{{ labels[key] }}</summary>
        <div><span>Сейчас</span><p>{{ proposalBase?.[key] || '—' }}</p></div>
        <div><span>Предложено</span><p>{{ proposal.sections[key] || '—' }}</p></div>
      </details>
      <aside class="director-chat__audit"><strong>Проверка стыка · {{ continuityStatuses[proposal.continuityAudit.status] }}</strong><ul><li v-for="(check, key) in proposal.continuityAudit.checks" :key="key"><b>{{ continuityLabels[key] ?? key }}:</b> {{ checkResults[check.result] }} — {{ check.note }}</li></ul><small>Это автоматическая подсказка, не утверждение художественного качества или согласование шота.</small></aside>
      <footer><button type="button" class="uk-button uk-button-primary" :disabled="!proposalIsCurrent || busy" @click="applyProposal">Применить предложение</button><button type="button" class="uk-button uk-button-default" :disabled="busy" @click="discardProposal">Отбросить</button></footer>
    </section>
    <footer class="director-chat__footer">
      <button type="button" class="uk-button uk-button-primary" :disabled="busy" @click="plan">{{ busy ? 'Обсуждаем с локальной моделью…' : turns.length ? 'Предложить следующую версию' : 'Предложить shot plan' }}</button>
      <span v-if="notice" role="status">{{ notice }}</span>
    </footer>
  </section>
</template>

<style scoped>
.director-chat{display:grid;gap:10px;padding:14px;border:1px solid rgba(174,187,202,.2);background:rgba(12,17,23,.82)}
.director-chat__header,.director-chat__footer{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.director-chat__header strong{font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.director-chat__header span,.director-chat__footer span{font-size:11px;color:#9da9b7}
.director-chat__header button{margin-left:auto}
.director-chat__history{display:grid;gap:8px;max-height:300px;overflow:auto}
.director-chat__turn{padding:9px 11px;background:rgba(255,255,255,.035);border-left:2px solid #586575}
.director-chat__turn.is-assistant{border-color:#95a9c0}
.director-chat__role{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#aebdce}
.director-chat__turn p,.director-chat__turn dd{margin:4px 0 0;font-size:12px;line-height:1.5;color:#e3e8ed;white-space:pre-wrap}
.director-chat__turn dl{display:grid;grid-template-columns:74px 1fr;gap:4px 9px;margin:7px 0 0}
.director-chat__turn dt{font-size:10px;text-transform:uppercase;color:#9da9b7}
.director-chat__turn dd{margin:0}
.director-chat__input{display:grid;gap:5px;font-size:11px;color:#aeb9c5}
.director-chat__footer{min-height:32px}
.director-chat__audit{margin-top:10px;padding:8px 10px;border-left:2px solid #95a9c0;background:rgba(255,255,255,.035)}
.director-chat__audit ul{display:grid;gap:3px;margin:6px 0;padding-left:18px;font-size:11px;line-height:1.45;color:#cbd4de}
.director-chat__audit small{font-size:10px;color:#9da9b7}
.director-chat__proposal{display:grid;gap:9px;padding:11px;border:1px solid rgba(174,187,202,.25);background:rgba(255,255,255,.025)}
.director-chat__proposal>header,.director-chat__proposal>footer{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.director-chat__proposal>header{justify-content:space-between}.director-chat__proposal>header strong{font-size:11px}.director-chat__proposal>header span,.director-chat__unchanged{font-size:10px;color:#9da9b7}
.director-chat__diff{display:grid;gap:6px;padding:8px 10px;background:rgba(255,255,255,.035)}
.director-chat__diff summary{font-size:11px;font-weight:600;cursor:pointer}.director-chat__diff>div{display:grid;grid-template-columns:74px 1fr;gap:8px}.director-chat__diff>div span{font-size:10px;color:#9da9b7}.director-chat__diff p{margin:0;font-size:11px;line-height:1.45;color:#e3e8ed;white-space:pre-wrap}
.director-chat__stale{margin:0;padding:7px 9px;border-left:2px solid #ed7a87;color:#f0b2ba;font-size:11px}
</style>
