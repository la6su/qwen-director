<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type AgentTurn = { role: 'user' | 'assistant'; content: string; provenance?: { model?: string; toolsUsed?: string[] } };
type Session = { id: string; turns: AgentTurn[]; version: number };
const props = defineProps<{ token?: string; projectId?: string; brief: Record<string, string> }>();
const emit = defineEmits<{ apply: [sections: Record<string, string>, decisionHash: string] }>();
const busy = ref(false);
const notice = ref('');
const instruction = ref('');
const sessionId = ref('');
const turns = ref<AgentTurn[]>([]);
const labels: Record<string, string> = { prompt:'Бриф', camera:'Камера', action:'Действие', composition:'Композиция', lighting:'Свет', sound:'Звуковая среда', music:'Музыка', transition:'Переход' };
const projectKey = computed(() => `qwendirector-agent-session:${props.projectId || 'unbound'}`);
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
watch(projectKey, () => { void loadSession(); }, { immediate:true });

function resetConversation() {
  localStorage.removeItem(projectKey.value);
  sessionId.value = '';
  turns.value = [];
  notice.value = 'Начат новый диалог';
}
async function plan() {
  if (!props.brief.prompt?.trim()) { notice.value = 'Сначала опишите shot'; return; }
  busy.value = true;
  notice.value = '';
  try {
    const requestHeaders = headers();
    if (!sessionId.value) {
      const created = await fetch('/v1/planner/sessions', { method:'POST', headers:requestHeaders, body:JSON.stringify({projectId:props.projectId || undefined}) });
      const session = await created.json();
      if (!created.ok) throw new Error(session.code || 'DIRECTOR_SESSION_FAILED');
      sessionId.value = session.id;
      localStorage.setItem(projectKey.value, session.id);
    }
    const response = await fetch('/v1/planner/assist', {
      method:'POST', headers:requestHeaders,
      body:JSON.stringify({ ...props.brief, message:instruction.value.trim(), sessionId:sessionId.value }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.code || 'PLANNER_FAILED');
    emit('apply', body.sections, body.decisionHash);
    instruction.value = '';
    await loadSession();
    const toolLabel = body.provenance.toolsUsed?.length ? ' · проект и workflow прочитаны' : '';
    notice.value = `Предложение подготовлено локально · ${body.provenance.model}${toolLabel}`;
  } catch (error) { notice.value = String(error); }
  finally { busy.value = false; }
}

function assistantSections(content: string): Array<{ label:string; value:string }> {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return Object.entries(labels).flatMap(([key, label]) => typeof parsed[key] === 'string' && parsed[key] ? [{label, value:parsed[key] as string}] : []);
  } catch { return [{label:'Ответ', value:content}]; }
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
        <dl v-else><template v-for="section in assistantSections(turn.content)" :key="section.label"><dt>{{ section.label }}</dt><dd>{{ section.value }}</dd></template></dl>
      </article>
    </div>
    <label class="director-chat__input">
      <span>Уточните shot plan</span>
      <textarea v-model="instruction" class="uk-textarea" rows="2" maxlength="3000" placeholder="Например: камера ниже, действие спокойнее, сохранить сет и свет"></textarea>
    </label>
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
</style>
