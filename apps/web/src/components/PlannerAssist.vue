<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps<{ token?: string; prompt: string }>();
const emit = defineEmits<{ apply: [sections: Record<string, string>, decisionHash: string] }>();
const busy = ref(false); const message = ref('');
async function plan() { if (!props.prompt.trim()) { message.value = 'Сначала опишите бриф'; return; } busy.value = true; try { const response = await fetch('/v1/planner/plan', { method:'POST', headers:{'content-type':'application/json', ...(props.token ? { authorization:`Bearer ${props.token}` } : {})}, body:JSON.stringify({ prompt: props.prompt, model:'local-planner' }) }); const body = await response.json(); if (!response.ok) throw new Error(body.code || 'PLANNER_FAILED'); emit('apply', body.sections, body.decisionHash); message.value = `Готово · ${body.decisionHash.slice(0, 12)}`; } catch (error) { message.value = String(error); } finally { busy.value = false; } }
</script>
<template><div class="planner-assist"><button type="button" class="uk-button uk-button-text" :disabled="busy" @click="plan">{{ busy ? 'Разбираем…' : 'Разложить бриф локальным planner' }}</button><span v-if="message" class="uk-text-small uk-text-muted">{{ message }}</span></div></template>
<style scoped>.planner-assist{display:flex;align-items:center;gap:10px;margin-top:8px}</style>
