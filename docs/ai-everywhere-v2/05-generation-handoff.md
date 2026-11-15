# AI Everywhere v2 — generation handoff (plan only)

Версия: 0.1 · Статус: `PLAN ONLY / BLOCKED UNTIL CREATIVE APPROVAL` · Дата: 2026-11-15
Источники: `01-song-beat-map.md`, `02-director-treatment.md`, `03-storyboard-shot-bible.md`, v22 provenance, local Qwen/H3 skill guides.
Утверждено: существующие opening images остаются starting material; master track и v22 immutable.
Непроверено: выбранный сценарий/кадры, точные вокальные cutpoints, provider capabilities для каждого конкретного graph, необходимость новых assets.

## Не запускать сейчас

Пока пользователь не утвердит treatment + beat map + storyboard, никакой Qwen Image 2.1, MiniMax H3, ComfyUI workflow, GPU job или платный ресурс не запускать. Этот файл — производственный план, не исполненный generation package.

## Приоритеты ключевых изображений

Только кадры, которые доказывают поворот истории; между ними использовать уже имеющиеся кадры и монтажные состояния, где они годятся.

| Priority | Candidate frame | Shot/beat | Purpose & frame state | References / risks |
|---|---|---|---|---|
| K01 | Room-to-screen opening anchor | `AE2-S001…004`, `AE-B001…005` | Открыть реальную комнату; неподвижная пара мониторов; экран ещё не раскрывает мир. Существующие opening shots — сохранить и проверить пригодность без замены. | `AE-LOC-01`, `AE-LOC-02`, approved starting still `f3c53ea0-5624-490c-b3d9-7d65fb620b2d`. Не смешивать две фотографии как один вид. |
| K02 | Three-variant selection state | `AE2-S008…010`, `AE-B009…012` | Читаемо показать варианты с повторяющейся композицией и один выбранный кадр. Изображения могут быть реальными frame thumbnails/пост-слоем; генератор не должен рисовать мелкий UI. | Существующие selection-board `62b50221-0678-4cd9-9fb3-6173dfa8140e`, workstation `c3998cf9-e83e-43d1-b375-0cabbbdf07bf`. Проверить текст/hand interaction; бумажный реквизит не подтверждён. |
| K03 | Chosen first-world keyframe | `AE2-S011`, `AE-B013` | Один завершённый мир с тремя планами, причинно связанный с экранной рамкой/реальным мотивом; композиция должна отличаться от очередного generic skyline. | Existing worlds: ring `56914d01…`; labyrinth `5662b9a5…`; suspended spires `d452fa8e…`; room refs narrow-role. Не создавать новый до переоценки текущих. |
| K04 | Overload/repetition state | `AE2-S019…022`, `AE-B017…018` | Контрастные, но намеренно похожие previews показывают потерю различий; герой останавливает их. Это монтаж/graphic treatment, а не обязательная новая AI world image. | `AE-020/021` candidates; без псевдо-UI, символов, лишних лиц/пальцев. |
| K05 | Bridge decision close frame | `AE2-S023…026`, `AE-B019…020` | Реальный предмет + лицо героя + один неподвижный выбранный кадр. Содержательная точка тишины и форма для match cut. | Face RefMod `973e1f6f…`, room/workstation photo. Крупное лицо отдельным ref; не ставить сложный lip sync. |
| K06 | Final synthesis frame | `AE2-S027…031`, `AE-B021` | Композиционно собрать только ранее выбранные мотивы и вернуть линию/рамку к монитору. Это не новый город и не максимизация частиц. | Existing `AE-048/052` candidates; проверить наследование формы от K03/K05. |
| K07 | Completed room outro frame | `AE2-S032…033`, Outro | Реальная комната и тот же fixed workstation показывают готовое изображение на экране; герой прекращает работу. | `photo-room.jpeg`, `photo-monitors.jpeg`, current shot 58. Удержать последний кадр; no new effect after song. |

## shot_ir and storyboard_frames

Универсальная семантика одного кадра (provider-neutral):

```yaml
shot_id: AE2-S011
beat_ids: [AE-B013]
lyric_source: LYR-13
assets: [AE-CHR-01, AE-WORLD-01, AE-LOC-02]
intent: first authored world emerges from the selected monitor frame
start_state: fixed monitor holds the selected static composition; protagonist is present in room
action: hard cut on the selected frame boundary; continue its visible diagonal as camera path into one coherent world
end_state: foreground, midground and far anchor remain legible; no further world switch
camera: low 3/4 wide tracking, one continuous dominant move
duration: editorial target from beat map; exact cutpoint UNVERIFIED
continuity: screen hardware fixed; match only selected contour/vector; identity reference if hero is medium/close
```

Storyboard frames are single observable instants, not mood boards: `K01` screen dark/hero hand poised; `K02` three similar frames and one separated selection; `K03` same selected contour at the threshold/full-world cut; `K04` overprinted repeated vanishing points; `K05` real object and face beside one still; `K06` inherited motifs joined in one composition; `K07` final image contained inside the fixed monitor. Before approval, mark each frame `PROPOSED`, with its lyric beat and assets.

## image_requests (planned)

`Qwen Image 2.1` is a still/keyframe tool here, not the motion engine. Prefer image-edit on an approved starting image for room/monitor shots; use text-to-image only for a selected full-frame world if existing source frames cannot meet the approved design.

1. **K02 selection-state image/edit** — preserve actual room and screen hardware; show only three image candidates if UI is composited from known outputs in post. Acceptance: 2 monitors in correct geometry, no floating display, no generated legible UI, chosen frame distinguishable by composition not brightness alone.
2. **K03 world keyframe** — only if an existing v22 AssetVersion cannot be reused. Explicit foreground/midground/background, one route and one world anchor. Acceptance: frame reads as a single specific world, clear physical path, no text, no duplicate skyline, no unrelated digital ornament.
3. **K05 face/action keyframe** — separate face reference for identity; hands only if the reference photo proves the pose and table clearance. Acceptance: recognizable face at intended frame size, natural home posture, correct clothing, no gesture artifact, room light is still readable.
4. **K06 synthesis keyframe** — ideally image-edit of K03 or existing selected frame, not an unconstrained new scene. Acceptance: only motifs seeded earlier, coherent architecture/perspective, legible dark texture and a single warm authored accent.

Image prompt order from local h3/image reference principles: identity → location and physical anchors → framing → frozen action state → light/material → continuity locks. Negative lists are secondary; state positively what remains fixed. All source photos and existing generated images are immutable inputs; save any future output as a new AssetVersion with parent lineage.

## video_requests and provider_requests (planned, not runnable)

| Request family | Candidate mode | Provider/profile status | Rules and acceptance |
|---|---|---|---|
| Room workstation motion, when the beginning/end frame show same physical geometry | MiniMax H3 `I2VA` for a single anchored move; `FL2VA` only when both frames form a physically traversable camera path | Local ComfyUI graph/profile must be checked live after approval. No job submitted. | Camera moves; monitor, stands, keyboard, mouse and table stay fixed. First/last frame are preserved; no screen floats, rotates, slides or spills onto desk. One camera move, one dominant human action. |
| Character/world interaction or multiple narrow-role references | H3 `Ref2VA` with labels split by role: one face/identity anchor, one scene/world anchor, at most one room/hardware anchor when needed | Current user-provisional baseline remains standard Ref2V INT8-pruned + Pika Flex, not final default. Confirm exact workflow/node/LoRA compatibility from saved local graph before compiling parameters. | Do not mix Pika Flex with unverified turbo stack. User’s model preference is provisional. Face/ref image does not also define room. No T2VA for shots whose room/identity must hold. |
| Full-frame selected world | H3 `I2VA` from approved K03/K06 keyframe; use independent clips and hard editorial cuts for incompatible spaces | Profile compatibility unverified until live schema preflight. | Preserve chosen contour, axis, motion phase and dark material detail. Camera move has start/action/end. Audio from H3 discarded; only master audio used in edit. |
| Very short hit/flash/reload | Prefer NLE cut/retime from stable existing material; do not ask H3 to create many tiny unrelated shots | Existing assets first; exact beat locations unverified | No separate generation if edit can create the timing cleanly. Add handles before retime; inspect interpolation/flicker. |

### Output contract after approval

For each provider request record `request_id`, stable shot/beat/asset IDs, immutable input snapshot, exact reference roles, workflow revision/hash, model/LoRA/sampler compatibility, target duration/fps/resolution, first/last state, acceptance and retry limit. No request is executable until mode and workflow parameters are verified against current `/object_info` and the approved local graph. Preserve `idempotency`, durable job/attempt/lease/fencing, cancellation and CAS provenance as required by QwenDirector architecture.

## quality_gate

**Creative blockers**

- Seven scene goals and causal links are accepted; each chorus has a distinct result, bridge changes behavior, outro resolves.
- Beat map phrase boundaries are checked against actual master audio; no active word is cut.
- Opening shots are treated as starting material, with a user-approved decision on exactly what stays.
- Every proposed shot has one readable dramatic function; no cool-scifi-only shots.

**Image/motion blockers**

- Correct fixed room layout and monitor geometry for the chosen view; real location refs are not merged incorrectly.
- Hero identity, face/wardrobe/light continuity; no distant generated face asked to carry expression.
- Each video request has feasible start→action→end, one dominant move and approved source handles.
- Screen vector, axis, object states, phase, focal attention, light bridge, retime and model drift reviewed against adjacent shots.
- No unsupported UI/text, extra people/limbs/monitors, floating equipment, identity rewrite, or unmotivated world swap.

**Delivery blockers**

- Non-destructive timeline references original source AssetVersions/time ranges.
- Original master audio remains bit-identical; no generated clip audio replaces it.
- EDL tail mismatch reconciled; all shots reviewed; export manifest only after every blocking item passes.

Current gate: `BLOCKED` intentionally. No new generation, new image assets, ComfyUI execution or GPU spend has occurred in this planning pass.
