import assert from 'node:assert/strict';

process.env.QWEN_STORAGE = 'memory';
process.env.QWEN_API_AUTOSTART = 'false';
process.env.QWEN_LLAMA_URL = 'http://local-llm.test';
process.env.QWEN_LLAMA_MODEL = 'qwen-local';
const originalFetch = globalThis.fetch;
let mode = 'success';
const calls = [];
const continuityAudit = {
  status: 'not-enough-context',
  checks: Object.fromEntries(['shotScale','cameraAxis','screenDirection','actionPhase','focalCenter','lightingColorBridge','motionTempo','actionCausality'].map((id) => [id, { result: 'not-applicable', note: 'Контекст для проверки не передан.' }])),
};
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).endsWith('/v1/models')) return new Response(JSON.stringify({ data: mode === 'no-model' ? [] : [{ id: 'qwen-local' }] }), { status: 200 });
  if (String(url).endsWith('/v1/chat/completions')) {
    if (mode === 'invalid-json') return new Response(JSON.stringify({ model: 'qwen-local', choices: [{ message: { content: '{"prompt":"only a prompt"}' } }] }), { status: 200 });
    if (mode === 'invalid-audit') return new Response(JSON.stringify({ model: 'qwen-local', choices: [{ message: { content: JSON.stringify({ sections: { prompt:'A shot', camera:'', action:'', composition:'', lighting:'', sound:'', music:'', transition:'' }, continuityAudit:{ status:'continuity-consistent', checks:{} } }) } }] }), { status: 200 });
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'qwen-local');
    const latest = JSON.parse(body.messages.at(-1).content);
    assert.ok(['A room reveal','A decisive selection'].includes(latest.brief.prompt));
    assert.ok(['Составь shot plan по текущему брифу.','Опусти камеру ниже.'].includes(latest.request));
    const audit = mode === 'causal-consistent' ? { status:'continuity-consistent', checks:{...continuityAudit.checks,actionCausality:{result:'consistent',note:'Причинные поля заполнены; смысловая убедительность автоматически не оценивалась.'}} } : continuityAudit;
    return new Response(JSON.stringify({ model: 'qwen-local', choices: [{ message: { content: JSON.stringify({ sections: { prompt: 'A quiet room reveal.', camera: 'Slow locked dolly.', action: 'The curtains move gently.', composition: 'Wide symmetrical frame.', lighting: 'Soft morning light.', sound: 'Room tone.', music: 'N/A', transition: 'Fade in.' }, continuityAudit:audit }) } }] }), { status: 200 });
  }
  throw new Error('unexpected planner URL');
};
const { app } = await import('../apps/api/src/index.ts');
const { planBriefWithLocalModel } = await import('../apps/api/src/local-planner.ts');
const { buildPlannerContinuityContext, compileProjectDirectorTimeline, normalizeMontageShotMetadata } = await import('../packages/contracts/src/planner.ts');
try {
  const typedMontage = normalizeMontageShotMetadata({ shotScale:'mcu_1st', cameraAxisDeg:35, screenDirection:'left-to-right', actionPhase:'hand reaches the mouse', focalCenter:{xPercent:62,yPercent:44}, lightDirection:'monitor key from screen-left', colorBridge:'amber edge to next shot', motionTempo:'slow' });
  assert.equal(typedMontage.cameraAxisDeg, 35);
  assert.throws(() => normalizeMontageShotMetadata({ cameraAxisDeg:360 }), /SHOT_MONTAGE_METADATA_INVALID/);
  assert.throws(() => normalizeMontageShotMetadata({ focalCenter:{xPercent:101,yPercent:50} }), /SHOT_MONTAGE_METADATA_INVALID/);
  const response = await app.inject({ method: 'POST', url: '/v1/planner/assist', payload: { prompt: 'A room reveal', message:'Опусти камеру ниже.' } });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().provenance.source, 'llama.cpp');
  assert.equal(response.json().provenance.model, 'qwen-local');
  assert.equal(response.json().continuityAudit.status, 'not-enough-context');
  assert.equal(JSON.parse(JSON.parse(calls[1].init.body).messages.at(-1).content).request, 'Опусти камеру ниже.');
  assert.match(response.json().decisionHash, /^[a-f0-9]{64}$/);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.url.startsWith('http://local-llm.test/')));
  const memoryOnly = await app.inject({ method:'POST', url:'/v1/planner/sessions', payload:{} });
  assert.equal(memoryOnly.statusCode, 501);
  assert.equal(memoryOnly.json().code, 'DIRECTOR_SESSION_STORAGE_REQUIRED');
  await planBriefWithLocalModel({ prompt:'A room reveal' }, undefined, { project:{name:'Test set',focusedShot:{current:{shotId:'current',montageMetadata:typedMontage,montageMetadataStatus:'available'},previous:{shotId:'previous',montageMetadata:{shotScale:'wide',cameraAxisDeg:10},montageMetadataStatus:'available'}}}, workflows:[{id:'pika'}], history:[{role:'assistant',content:'Use the existing scene'}] });
  const requestBody = JSON.parse(calls.at(-1).init.body);
  assert.ok(requestBody.messages.some((message) => message.content.includes('Test set')));
  assert.ok(requestBody.messages.some((message) => message.content.includes('"cameraAxisDeg":35')));
  assert.ok(requestBody.messages.some((message) => message.content.includes('montageMetadataStatus')));
  assert.ok(requestBody.messages.some((message) => message.content.includes('continuityAudit')));
  assert.ok(requestBody.messages.some((message) => message.content.includes('actionCausality')));
  assert.ok(requestBody.messages.some((message) => message.content === 'Use the existing scene'));
  const eventPlan = { schemaVersion:'qwendirector-h3-event-plan/v1', frameRate:24, frameCount:56, events:[{ id:'beat-1', startFrame:0, endFrame:56, entryState:'Cursor rests over one frame.', trigger:'The creator clicks once.', action:'The selected image holds steady.', endState:'The image remains selected.' }] };
  const continuityContext = buildPlannerContinuityContext([{shotId:'current',title:'Selection',durationSeconds:56/24,prompt:{prompt:'A decisive selection',eventPlan}}], 'current');
  const projectTimeline = compileProjectDirectorTimeline('project-1', [
    { sceneId:'scene-1', title:'First', shots:[{ shotId:'shot-1', title:'Selection', durationSeconds:1.9, prompt:{prompt:'A decisive selection',eventPlan}, references:[{id:'asset-1',role:'first-frame'}] }] },
    { sceneId:'scene-2', title:'Second', shots:[{ shotId:'shot-2', title:'Room response', durationSeconds:1.5, prompt:{prompt:'The room reacts.'} }] },
  ]);
  assert.equal(projectTimeline.scope, 'project');
  assert.equal(projectTimeline.frameCount, 92);
  assert.deepEqual(projectTimeline.segments.map(({shotId,sceneId,startFrame,endFrame}) => ({shotId,sceneId,startFrame,endFrame})), [
    {shotId:'shot-1',sceneId:'scene-1',startFrame:0,endFrame:56},
    {shotId:'shot-2',sceneId:'scene-2',startFrame:56,endFrame:92},
  ]);
  assert.equal(projectTimeline.segments[0].timingStatus, 'event-plan-overrides-catalog-duration');
  assert.equal(projectTimeline.segments[0].events[0].startFrame, 0);
  assert.equal(projectTimeline.segments[0].events[0].endFrame, 56);
  assert.equal(projectTimeline.segments[0].references[0].assetVersionId, 'asset-1');
  assert.equal(projectTimeline.segments[0].joinToNext.transitionType, 'unspecified');
  assert.equal(projectTimeline.segments[0].joinToNext.reviewStatus, 'insufficient-metadata');
  assert.equal(projectTimeline.segments[1].timingStatus, 'catalog-duration-unplanned');
  mode = 'causal-consistent';
  const causalDecision = await planBriefWithLocalModel({ prompt:'A decisive selection' }, undefined, { project:{name:'Test set',focusedShot:{continuityContext}}, workflows:[{id:'pika'}] });
  const causalBody = JSON.parse(calls.at(-1).init.body);
  assert.ok(causalBody.messages.some((message) => message.content.includes('The creator clicks once.')));
  assert.equal(causalDecision.continuityAudit.checks.actionCausality.result, 'consistent');
  assert.equal(causalDecision.continuityContext.current.eventPlan.review.semanticAssessment, 'not-performed');
  await assert.rejects(() => planBriefWithLocalModel({ prompt:'A decisive selection' }, undefined, { project:{focusedShot:{continuityContext:{current:{shotId:'invalid',eventPlanStatus:'invalid'}}}} }), /PLANNER_AUDIT_UNSUPPORTED_CONSISTENCY_CLAIM:actionCausality/);
  mode = 'success';
  mode = 'invalid-json';
  const invalid = await app.inject({ method: 'POST', url: '/v1/planner/assist', payload: { prompt: 'A room reveal' } });
  assert.equal(invalid.statusCode, 502);
  assert.equal(invalid.json().code, 'PLANNER_OUTPUT_INVALID');
  mode = 'invalid-audit';
  const invalidAudit = await app.inject({ method: 'POST', url: '/v1/planner/assist', payload: { prompt: 'A room reveal' } });
  assert.equal(invalidAudit.statusCode, 502);
  assert.equal(invalidAudit.json().code, 'PLANNER_OUTPUT_INVALID');
  mode = 'no-model';
  const unavailable = await app.inject({ method: 'POST', url: '/v1/planner/assist', payload: { prompt: 'A room reveal' } });
  assert.equal(unavailable.statusCode, 503);
  assert.equal(unavailable.json().code, 'PLANNER_LOCAL_MODEL_UNAVAILABLE');
  console.log('OK: local llama planner returns bounded typed proposals and rejects invalid/unavailable output');
} finally {
  globalThis.fetch = originalFetch;
  await app.close();
}
