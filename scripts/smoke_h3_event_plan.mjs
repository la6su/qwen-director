import assert from 'node:assert/strict';
import { normalizeH3EventPlan, compileH3TimedEvents, reviewH3EventCausality } from '../packages/contracts/src/h3-event-plan.ts';
import { compileH3BasePrompt, compileH3Ref2VAPrompt } from '../packages/contracts/src/prompt.ts';

const plan = {
  schemaVersion:'qwendirector-h3-event-plan/v1', frameRate:24, frameCount:124,
  events:[
    { id:'choice', startFrame:0, endFrame:48, action:'The creator compares two images on the monitor.', endState:'The cursor rests over one selected image.', sourceRef:'AE2-BEAT-04', sourceTiming:'unverified' },
    { id:'commit', startFrame:48, endFrame:124, action:'The creator clicks once and the selected image settles.', endState:'One image remains steady in the center display.' },
  ],
};

assert.deepEqual(normalizeH3EventPlan(plan, 124), plan);
const timed = compileH3TimedEvents(plan, 124);
assert.match(timed, /same uninterrupted shot/);
assert.match(timed, /frame 48 \(00:02\.000000\)/);
assert.match(timed, /Source AE2-BEAT-04 timing is unverified/);
assert.match(timed, /No verified lyric or audio timing source is assigned/);
assert.ok(!/\[Shot 2\]/.test(timed));
assert.deepEqual(reviewH3EventCausality(plan), {
  schemaVersion:'qwendirector-h3-event-causality-review/v1',
  status:'incomplete', semanticAssessment:'not-performed',
  gaps:['choice:entryState','choice:trigger','commit:entryState','commit:trigger','commit:continuityFromPrevious'],
});
const causalPlan = { ...plan, events:[
  { ...plan.events[0], entryState:'Two variations are visible.', trigger:'The pointer reaches the preferred variation.' },
  { ...plan.events[1], entryState:'The preferred variation is under the pointer.', trigger:'The creator chooses it.', continuityFromPrevious:'The pointer remains over the same variation after the first event.' },
] };
assert.equal(reviewH3EventCausality(causalPlan).status, 'structured-for-human-review');
assert.match(compileH3TimedEvents(causalPlan, 124), /The trigger is: The creator chooses it/);

const base = compileH3BasePrompt({ prompt:'A dark studio with one steady monitor.', eventPlan:plan }, { mode:'i2va', frameCount:124 });
assert.ok(base.includes(timed));
const reference = compileH3Ref2VAPrompt({ prompt:'A dark studio.', eventPlan:plan }, [], 124);
assert.ok(reference.includes(timed));
assert.throws(() => normalizeH3EventPlan({ ...plan, events:[{ ...plan.events[0], endFrame:47 }, plan.events[1]] }), /H3_EVENT_RANGE_GAP_OVERLAP_OR_TOO_SHORT/);
assert.throws(() => normalizeH3EventPlan({ ...plan, events:[{ ...plan.events[0], startFrame:1 }, plan.events[1]] }), /H3_EVENT_RANGE_GAP_OVERLAP_OR_TOO_SHORT/);
assert.throws(() => normalizeH3EventPlan({ ...plan, frameCount:120 }), /H3_EVENT_PLAN_FRAME_COUNT_INVALID/);
assert.throws(() => normalizeH3EventPlan(plan, 192), /H3_EVENT_PLAN_FRAME_COUNT_MISMATCH/);
assert.throws(() => normalizeH3EventPlan({ ...plan, events:[{ ...plan.events[0], sourceTiming:'verified', sourceRef:undefined }, plan.events[1]] }), /H3_EVENT_VERIFIED_SOURCE_REQUIRED/);
assert.throws(() => compileH3BasePrompt({ prompt:'[Shot 1] Opening. [Shot 2] At 00:02.000, cut away.', eventPlan:plan }, { mode:'i2va', frameCount:124 }), /H3_EVENT_PLAN_MULTI_SHOT_PROMPT_CONFLICT/);
console.log('smoke_h3_event_plan: OK');
