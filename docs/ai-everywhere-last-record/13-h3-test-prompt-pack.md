> **Архив / предыдущая версия:** Исторический пакет тестовых H3 jobs предыдущего сценария. Сохраняется как provenance/QC; job/profile/hash не являются рекомендацией или разрешением для новой версии.

# MiniMax H3 — motion test pack and routing

Большинство разделов ниже — prompt candidates, не сгенерированные takes. Фактически сгенерирован один H3 test: `LR-L03-M01`, job `e5371ed8-7f50-481c-b7f3-ba8ce5f46f78`, profile `ai-everywhere-last-record-h3-shop-track-v1`, graph SHA `2f0d7272a52b53c1e378e00f8baa3636637986281e5fa73c1640d937f3f9ba51`, output AssetVersion `f7992401-0378-4cd3-8bc2-c1fd8269d155`. MP4 1280×720, 24 fps, 124 frames (~5.17 s). Просмотр контакта кадров: география магазина сохраняется, но недостаточно детализации/читаемости; пользователь назвал общее качество слабым. Take не выбран, это только QC evidence. Не запускать этот профиль повторно без осознанной переработки качества. Отдельный `last-record-h3-ref2va-pika-candidate-v1`, graph SHA `9a3974c524e85478a56bb7c92ef0d598930c5d9735d99472653670987c5ee4af`, прошёл read-only schema/runtime preflight, но active=false и video job на нём не создавался. Его локальный граф задаёт 5 s input, вычисляет 124 frames на сетке `17k+5`, 24 fps (~5.17 s), 16:9 через ResolutionSelector. Точную выходную ширину/высоту проверить по first output; одного preflight недостаточно. При необходимости exact first+last action квалифицировать отдельный FL2VA profile; прежний `ai-everywhere-h3-fl2va-pdd8-first-last` не использовать только потому, что он active.

**Общее для всех source clips:** один dominant physical action на source; no new speech, no subtitles, no new music. `overall_soundscape` описывает только возможные location/Foley cues для генератора; на финальном монтаже H3 audio не подменяет исходный MP3. `non_diegetic_music: N/A`; непрерывный master добавляется отдельно в 24 fps timeline. Все выбранные first-frame/character refs должны существовать как CAS AssetVersion с hash, ролью и выбранным QC status. Negative constraints не заменяют покадровый QC. Editorial source handles: 12–24 frames head/tail там, где реально возможно; окончательная длительность кадра может быть меньше source.

## H3-T1 / `LR-002` — герой у мастерской, проверка футляра

**Mode:** Ref2VA candidate, `<Picture 1>` = selected C01 face/wardrobe anchor only. Если нужен точный первый кадр мастерской, выбрать I2VA/FL2VA после отдельного profile gate, а не объявлять этот one-image Ref2VA первым кадром.

```text
subject_definitions:
<Subject 1> is the same young male visual artist defined by <Picture 1>; preserve his face, hairline, dark waterproof jacket and diagonal bag strap.
<Picture 1> is the approved identity reference for the artist, not a location reference.

summary:
One grounded five-second live-action source shot outside a record-cutting workshop at night. The artist checks the sealed red record case before riding away.

retention_analysis:
Preserve <Subject 1>'s facial geometry and jacket. Use <Picture 1> only for identity; the workshop, case and wet street are newly specified scene elements. Do not transfer any background from <Picture 1>.

detailed_description:
[Shot 1] A medium three-quarter view at human height beside a real workshop doorway. Warm light falls from inside onto damp pavement. The artist holds a rigid red record case close to his body, checks that the zipper edge is fully closed, then lowers the case into a dry diagonal bag. His gaze briefly moves from the bag toward the street. The camera remains mostly still with a slight natural handheld adjustment; the single action ends with both hands free and the bag secured. Believable weight and finger contact. No screen glow, no magical light, no extra people entering frame.

overall_soundscape:
Quiet wet street, soft zipper and fabric movement, distant traffic; no dialogue or vocalization.

non_diegetic_music:
N/A
```

**QC:** face stable, bag not changing sides, case physically fits, hand count normal, camera stays still as prompted. Select a final 2–4 s editorial section only after checking the entire source and its handles.

## H3-T2 / `LR-003/004` — fixed gear in motion

**Mode:** one-image Ref2VA only after a **new night bike keyframe** has been selected using user photo as source. `<Picture 1>` = approved 16:9 bike+rider keyframe. The raw 4:3 daylight reference alone does not define night composition.

```text
subject_definitions:
<Subject 1> is the exact fixed-gear bicycle in <Picture 1>: black frame, pale wrapped drop bar, deep dark front rim with white markings, slimmer rear rim with tan sidewall.
<Subject 2> is the rider in <Picture 1>, wearing the approved dark jacket and securely fitted diagonal dry bag.
<Picture 1> is the approved nighttime 16:9 bike-and-rider composition anchor.

summary:
One five-second grounded cycling source on wet industrial pavement at night, travelling screen left to right.

retention_analysis:
Preserve the bicycle's front/rear rim asymmetry, frame proportions, handlebar shape and rider costume from <Picture 1>. Preserve the bag position and travel direction. Street architecture may extend naturally but must remain one district.

detailed_description:
[Shot 1] Low side three-quarter view of the rider pedalling a fixed-gear bicycle along wet asphalt, screen left to right. Both pedals keep rotating with the rear wheel; no freewheeling with motionless cranks. The diagonal bag is tight against the rider's back and does not swing into spokes. The deep front wheel passes a sodium streetlight reflection; the rider reduces speed smoothly before a closed loading-yard gate visible ahead. Camera tracks parallel for a short distance, then allows the bicycle to slow within the same frame. Real water spray is modest. No jumps, no fisheye wheel warping, no traffic collision, no change of bicycle identity.

overall_soundscape:
Soft tire hiss on wet asphalt, light chain movement and distant night traffic; no voices.

non_diegetic_music:
N/A
```

**QC:** deep wheel remains FRONT every frame; frame/crank/leg physics; streetlight reflection plausible; no new readable logo generated. If the wide source contains a stable detail phase, select 2–4 s from it; otherwise create a separate detail source that can sustain 2–4 s.

## H3-T3 / `LR-009/010` — DJ receives the vinyl record

**Mode:** Ref2VA candidate with `<Picture 1>` = selected DJ identity + shop lighting anchor. The vinyl record handoff is split into simple coverage: this source ends before any precise needle move.

```text
subject_definitions:
<Subject 1> is the older record-shop DJ in <Picture 1>; preserve his selected face, hair, clothing and deliberate posture.
<Picture 1> is the approved DJ identity and shop-light reference.

summary:
One restrained five-second performance source during the last pirate-radio evening, showing the DJ accept the record without theatrical approval.

retention_analysis:
Preserve <Subject 1>'s identity and the practical warm shop light. A rigid red record case and paper sleeve enter from off-screen; do not invent a second record or change the shop layout.

detailed_description:
[Shot 1] Medium shot across a narrow dry record counter. The older DJ finishes securing a cable near the mixer, wipes one hand on a cloth, then accepts a paper record sleeve from the younger artist just outside frame. He takes the sleeve by its edges, checks it under the warm counter lamp and places it beside the free turntable. His eyes move once toward the people visible through the street window. Camera locked, slight natural breathing motion only. One continuous gesture with clear starting and ending positions. No smiling blessing, no anger, no speech, no impossible record handling.

overall_soundscape:
Low shop room tone, soft paper sleeve movement and a distant street ambience; no dialogue.

non_diegetic_music:
N/A
```

**QC:** DJ face/garment stable, one sleeve, two physical hands, free deck unchanged; crop before any malformed needle/fader action.

## H3-T4 / `LR-015/016` — handover at the deck

**Mode:** likely FL2VA **after** separate graph/first-last-frame preflight. Do not submit to the one-image Ref2VA candidate as an identity-critical two-person transition. First frame: DJ occupies the deck, young artist holds his record. Last frame: DJ has stepped aside and artist stands at the same deck, record supported by him. Generate separate reaction shot and hand insert; no expectation of multi-shot consistency in one prompt.

**English action core for later FL2VA prompt:**

> In one uninterrupted medium-wide physical action, the older DJ keeps his active channel steady, offers one headphone cup to the young artist, then moves half a step sideways to free the adjacent turntable. The young artist initially extends the paper sleeve toward him, stops when the DJ does not take it, lowers his own hand and steps into the freed position. Both remain in the same shop geometry and lighting. The turntables do not swap sides. Camera remains on the same side of their interaction axis. No dialogue, no dramatic nod, no supernatural lighting change.

**QC:** both faces, deck position, sleeve and hand continuity. If it fails, use three independent sources plus NLE coverage; do not regenerate an expensive long take hoping for exact hands. The final editorial pieces remain 2–4 s each.

## H3-T5 / `LR-018/019` — screen film realism proof

**Mode:** separate one-image Ref2VA sources from selected 16:9 keyframes, never a single prompt containing three cuts. Source A: same rider approaches brick arch with exact bike; use a low, smooth side track that settles as he slows. Source B: low front-rim detail; use a locked camera and let wheel rotation provide the movement. Source C: actor notices a closing shop door and slows; use a static three-quarter view so the change in his speed and gaze reads clearly. The film inside the film can be entered full-frame only after the real public screen is shown. Each source retains actor identity, bike geometry, arch count, direction and practical weather. Generated VFX limited to controlled reflection/lighting treatment; no fantasy object or digital portal. For source C, face performance and brake/deceleration need a selected first frame and simple one-action prompt. Review motion at 0%, 25%, 50%, 75%, 100% and at intended editorial in/out; select only 2–4 s final shots.

## Generation gate for all five

1. Chosen profile ID/revision/hash; live `/ready`, worker heartbeat and queue; per-profile `/object_info` test. 2. Source AssetVersion IDs and labels in immutable job snapshot; exact frame size and roles. 3. QwenDirector `awaiting_approval` → штатное approval → worker lease/fencing → CAS result; no direct Comfy prompt submit. 4. Inspect final output and lineage, reject with explicit reason or select. 5. Only selected stills/takes can be parents of subsequent jobs. The above prompts are provisional until their pictures exist; they must not describe unobserved reference details as facts.
