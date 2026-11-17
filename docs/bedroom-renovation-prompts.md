# Промты фаз спальни (MiniMax H3 Ref2VA)

Промты на английском, подготовлены для шести отдельных VEDA клипов. В каждый job передавать две картинки: `<Picture 1>` — утверждённый стартовый кадр фазы, `<Picture 2>` — утверждённый конечный кадр этой фазы. Для первой фазы использовать `00-raw-room-start.png`; для последней — утверждённый вариант `99-reference-finished-room.png` либо `final-render-user.png`. Между соседними фазами один и тот же кадр должен быть end предыдущей и start следующей. Клип — один непрерывный locked-off take, 5.875 секунды, без внутренних склеек.

Постоянные ограничения всех шести фаз: vertical 9:16, locked tripod, один и тот же объектив/позиция/перспектива; окно слева; фиксированные размеры комнаты и кровати; два рабочих из wardrobe board (A: седина, navy jacket, beige trousers, brown boots; B: молодой/выше/стройнее, white T-shirt, khaki trousers, dark shoes). Масштаб реалистичный относительно двуспальной кровати. Лица естественные, но не акцентировать их; не просить blank/faceless faces. Без третьего рабочего, жёлтого жилета, чёрной футболки, duplicate limbs, pop-in, скачков геометрии, материал-morph и цифрового glow.

## Фаза 1 — покраска стены и первые рейки

subject_definitions:
<Subject 1> is the same compact bedroom from <Picture 1> and <Picture 2>, with the large window on the left, the centered rear wall, and the fixed doorway-level camera composition.
<Subject 2> is Worker A from the wardrobe reference board: an older, medium-build man with short gray hair, a worn navy work jacket with a small white back mark, beige-brown work trousers, a dark tool belt, and brown boots.
<Subject 3> is Worker B from the wardrobe reference board: a taller, slimmer young man with short brown hair, a plain white short-sleeve T-shirt with a small black back mark, light khaki trousers, and dark work shoes.
<Picture 1> is the exact opening-frame anchor: the bare plaster room, concrete floor, exposed ceiling wires, and left window.
<Picture 2> is the phase-end anchor: the same room with the rear wall painted deep muted green and the first restrained rectangular trim lines in place.

summary:
[keyframe completion + reference generation] In one 5.875-second continuous vertical locked-off timelapse, <Subject 2> paints the rear wall of <Subject 1> while <Subject 3> prepares the trim; the room changes only through visible, physical work and converges to <Picture 2>.

retention_analysis:
<Subject 1> (entire clip): fully_preserved - fixed architecture, left window, proportions, and camera placement remain unchanged.
<Subject 2> (entire clip): fully_preserved - navy jacket, beige trousers, brown boots, and deliberate work pace remain stable.
<Subject 3> (entire clip): fully_preserved - white T-shirt, khaki trousers, dark shoes, taller slim build, and quicker pace remain stable.
<Picture 1>: exact first-frame composition and raw-room state.
<Picture 2>: exact final-frame composition and partially finished green rear wall.

detailed_description:
The whole 5.875-second clip is one uninterrupted fixed-camera vertical 9:16 shot. At 00:00 the image matches <Picture 1>: a compact, realistically proportioned bedroom with the large window at frame left, uneven pale plaster, a bare concrete floor, and exposed wires at the ceiling center. The camera does not pan, tilt, zoom, or change lens perspective. <Subject 2> enters from a lower side edge at believable scale, lays down a drop cloth, loads a paint roller, and makes quick but physically continuous overlapping passes across the rear wall. Wet paint is slightly darker and visibly textured before settling to a deep muted green. <Subject 3> remains distinct in a white tee and khaki trousers, measuring and preparing only short wall trim pieces near the floor, then briefly assists at the edge of frame. The two people never occupy the same position. By the final second, simple narrow rectangular moulding pieces are visibly being fixed over the painted wall; no complete room makeover happens instantly. At 00:05.875, match <Picture 2>: unchanged camera and room, green rear wall, first trim rectangles, unfinished areas still plausible. Keep sunlight from the left window natural and stable; tools and materials remain physically present. Workers leave through a frame edge if they exit.

overall_soundscape:
Quiet interior room tone, muted roller strokes, light tool handling, and faint footsteps; no speech.

non_diegetic_music:
N/A

## Фаза 2 — панельная обшивка и потолочная люстра

subject_definitions:
<Subject 1> is the same compact bedroom and locked camera from the phase-one end frame.
<Subject 2> is Worker A in the stable navy jacket, beige-brown trousers, tool belt, and brown boots.
<Picture 1> is the approved phase-one end frame with green paint and initial trim.
<Picture 2> is the phase-two end frame with finished restrained wall panelling, ceiling trim, and centered plaster medallion; the chandelier is not installed yet.

summary:
[keyframe completion + reference generation] <Subject 2> and <Subject 3> finish restrained ceiling cornice details and fit the plaster medallion in one continuous 5.875-second locked shot, progressing from <Picture 1> to <Picture 2>.

retention_analysis:
<Subject 1> (entire clip): fully_preserved - room dimensions, left window, and camera remain fixed.
<Subject 2> (entire clip): fully_preserved - same older worker and navy/beige/brown wardrobe.
<Picture 1>: precise opening state.
<Picture 2>: precise empty-room endpoint with completed wall and ceiling details, centered plaster medallion, and no chandelier yet.

detailed_description:
This is one continuous 5.875-second vertical 9:16 timelapse from the fixed tripod. Begin exactly at <Picture 1>. Exactly one person is visible in this phase: <Subject 2>. Worker A remains the only human in every frame; Worker B does not appear anywhere, including reflections, partial bodies, or background silhouettes. Preserve the deep green panelled wall and bare concrete floor. <Subject 2> works from one stable ladder under the ceiling rose, applying plaster finish around the existing medallion and completing a small section of ornate ceiling moulding with visible hand-tool passes. The ladder remains grounded and stable. The surface progresses gradually from rough patch to painted plaster; no wall or floor material changes. Keep the ceiling work above the worker's head, at believable scale. Leave the electrical point prepared for a later chandelier installation: do not hang a chandelier, turn on new lights, bring in furniture, or begin flooring. At 00:05.875 match <Picture 2>: completed cornice and centered plaster medallion, same green panels, bare concrete floor, no chandelier and no furniture. No extra person, duplicated figure, mirror reflection, morphing, floating ladder, or geometry warp.

overall_soundscape:
Soft room tone, light plastering and hand-tool sounds, a small ladder creak, and faint footsteps; no speech.

non_diegetic_music:
N/A

## Фаза 3 — укладка паркета

subject_definitions:
<Subject 1> is the same finished-wall, unfurnished bedroom with a fixed window-left camera.
<Subject 2> is Worker A in the navy work jacket and beige-brown trousers.
<Subject 3> is Worker B in the white tee and light khaki trousers.
<Picture 1> is the approved empty-room end frame from phase 2, with a bare concrete floor.
<Picture 2> is the phase-three endpoint with continuous natural-oak herringbone flooring and the upholstered double-bed frame positioned against the rear wall; the bed has no mattress yet.

summary:
[keyframe completion + reference generation] The workers install and finish the oak floor, then carry in and set down the empty double-bed frame through visible physical stages, preserving the bedroom and camera while transitioning from <Picture 1> to <Picture 2>.

retention_analysis:
<Subject 1> (entire clip): fully_preserved - walls, window, ceiling fixture, and perspective remain constant.
<Subject 2> (entire clip): fully_preserved - stable navy/beige/brown appearance and deliberate pace.
<Subject 3> (entire clip): fully_preserved - stable white/khaki/dark appearance and faster pace.
<Picture 1>: concrete floor opening frame.
<Picture 2>: finished parquet and empty bed-frame endpoint; this floor material remains unchanged in all later phases.

detailed_description:
One continuous fixed 9:16 shot, 5.875 seconds. Start exactly on <Picture 1>. The walls, panels, cornice, centered ceiling medallion, and window do not shift. Exactly two workers may appear: <Subject 2> and <Subject 3>, each only once; no clone, extra silhouette, reflection, or third person. <Subject 3> sweeps and clears the concrete, then carries a small stack of short oak boards into the lower edge of frame. <Subject 2>, working low to the floor, lays herringbone parquet in a coherent pattern that visibly grows from the window side outward; boards arrive one by one and never replace the floor in a dissolve. A brief glimpse of adhesive comb marks and a realistic sanding pass may appear, followed by a thin oil finish that darkens the oak momentarily before settling to a natural matte tone. In the final part, both workers carry in one upholstered double-bed frame and lower it against the rear wall. Do not add a mattress, duvet, nightstands, or art yet. Keep construction dust subtle and localized. At 00:05.875, match <Picture 2>: a complete continuous oak herringbone floor and empty upholstered double-bed frame; the floor remains unchanged in all later clips.

overall_soundscape:
Quiet room tone, broom swishes, soft board placement, short sanding buzz, and footsteps; no speech.

non_diegetic_music:
N/A

## Фаза 4 — люстра, матрас, постель и ковёр

subject_definitions:
<Subject 1> is the completed bedroom with stable green panelling, chandelier, and oak herringbone floor.
<Subject 2> is Worker A in the navy jacket and beige-brown work trousers.
<Subject 3> is Worker B in the white tee and khaki trousers.
<Picture 1> is the approved end frame from phase 3, with the finished oak floor and empty upholstered double-bed frame.
<Picture 2> is the approved frame with chandelier, mattress, pillows, bedding, and a cream rug, but without later wall art and nightstands.
<Picture 3> is a close-up crop from the user's final-render reference, defining the exact chandelier: slim central brass stem, organic branching gold arms, tiny warm bulbs, and dense hanging strands of translucent white petal-shaped crystals.

summary:
[keyframe completion + reference generation] The workers install the chandelier, bring in the mattress, make the bed in visible steps, and roll out a cream rug from <Picture 1> to <Picture 2>.

retention_analysis:
<Subject 1> (entire clip): fully_preserved - fixed room geometry, camera, walls, chandelier, and parquet.
<Subject 2> (entire clip): fully_preserved - older worker's navy/beige/brown wardrobe remains unchanged.
<Subject 3> (entire clip): fully_preserved - taller young worker's white/khaki/dark wardrobe remains unchanged.
<Picture 1>: opening composition with a bare upholstered double-bed frame and finished parquet.
<Picture 2>: endpoint with a properly sized finished double bed, the chandelier from <Picture 3>, and rug.
<Picture 3>: exact chandelier design reference; use its fixture shape and materials without copying the unrelated artwork visible behind it.

detailed_description:
One uninterrupted 5.875-second vertical shot from the same tripod. Start exactly at <Picture 1>, preserving the finished oak floor and upholstered double-bed frame. Exactly two workers may appear: <Subject 2> and <Subject 3>, each only once; never generate a third person, a duplicate, or a reflection. For the chandelier installation, Worker A uses one short two-step wooden stool placed fully on the parquet in the narrow aisle beside the bed, with all four feet on the floor and clear space from the bed. No ladder or scaffold appears. Worker A stands on the stool only; Worker B stays off-frame until the chandelier is secured. Neither worker steps, kneels, sits, or climbs on the bed, bed frame, or mattress, and no tool or prop rests on the bed. Assemble the exact fixture from <Picture 3>: a slim central brass stem, organic branching gold arms, tiny warm bulbs, and many translucent white petal-shaped crystal drops hanging in layered cascading strands. Do not substitute a conventional candle-arm chandelier, a globe fixture, or a sparse modern pendant. Once the fixture is secured, Worker B enters and carries in one mattress; both workers lower it onto the frame while standing on the floor, with visible weight compression. A fitted sheet is pulled over the corners, duvet settles after one gentle shake, and pillows are placed individually. Finally, Worker B unrolls one cream rug and nudges it into a plausible position at the foot of the bed. The bed builds progressively; never replace it in a dissolve. Preserve worker identities, realistic scale relative to the bed, and the exact room perspective. At 00:05.875 match <Picture 2>: the chandelier exactly matches <Picture 3>, the double bed is made with natural folds, and a cream rug lies on the unchanged parquet; no wall art or nightstands yet.

overall_soundscape:
Soft room tone, measured footsteps, fabric rustle, a muted frame set-down, and bedding movement; no speech.

non_diegetic_music:
N/A

## Фаза 5 — картина, тумбы и тёплые светильники

subject_definitions:
<Subject 1> is the same green-paneled bedroom with the completed double bed and oak floor.
<Subject 2> is Worker B from the wardrobe reference board: the taller, slimmer young man with short brown hair, a plain white short-sleeve T-shirt with a small black back mark, light khaki trousers, and dark work shoes.
<Picture 1> is the phase-four end frame with bedding finished and the rear wall still undecorated.
<Picture 2> is the fully styled bedroom endpoint based on the selected final design reference.

summary:
[keyframe completion + reference generation] Worker B adds the final wall art, nightstands, warm lighting, and a few restrained accessories one item at a time, ending at <Picture 2>.

retention_analysis:
<Subject 1> (entire clip): fully_preserved - bed, green panels, chandelier, window, floor, and camera remain stable.
<Subject 2> (entire clip): fully_preserved - same younger worker identity and white/khaki/dark wardrobe.
<Picture 1>: stable starting arrangement before final decoration.
<Picture 2>: target final arrangement and lighting.

detailed_description:
One continuous 5.875-second locked 9:16 shot. Start exactly at <Picture 1>. Exactly one worker is visible in this phase: <Subject 2>. Worker A does not appear anywhere, including reflections, partial bodies, or background silhouettes. Worker B, in the same white T-shirt and khaki trousers, hangs one large botanical framed print above the headboard, checks it with a small level, and makes one slight correction. He places one nightstand at a time on either side of the bed and positions a lamp on each; each lamp is plugged in and switched on with a short warm-up. Install the two matching wall sconces only if visible in <Picture 2>, with a brief physical mounting action and no exposed wires afterward. Add a modest vase, two books, and a small tray one by one with slight placement adjustments. Maintain realistic scale and leave walking space beside the double bed. No object materializes in a dissolve. Worker B exits through a side edge before the final second. At 00:05.875, match <Picture 2>: finished bed, wall art, paired nightstands and lamps, warm lighting, restrained accessories, and unchanged floor/camera. No extra person, duplicate, reflection, hovering decor, or distorted hands.

overall_soundscape:
Quiet room tone, soft footsteps, frame handling, a small level tap, furniture set-downs, and lamp switches; no speech.

non_diegetic_music:
N/A

## Фаза 6 — чистый финальный hold

subject_definitions:
<Subject 1> is the completed bedroom as shown in <Picture 1> and <Picture 2>, with its green wall, double bed, oak herringbone floor, chandelier, window, and selected finishing details.
<Picture 1> is the exact first frame of the final hold, with workers and tools already outside the room.
<Picture 2> is the exact final-frame composition and finish target.

summary:
[keyframe completion] A quiet 5.875-second real-time final hold of the completed bedroom, matching <Picture 1> at the beginning and <Picture 2> at the end without introducing new objects or camera movement.

retention_analysis:
<Subject 1> (entire clip): fully_preserved - all finished-room objects, materials, colors, and geometry remain unchanged.
<Picture 1>: exact opening state of the empty finished room.
<Picture 2>: exact ending composition; only tiny natural environmental motion is permitted.

detailed_description:
One uninterrupted fixed vertical 9:16 real-time shot lasting 5.875 seconds. The room is already complete and no people, tools, or packaging are visible. Match <Picture 1> at 00:00 and hold the composition; the camera is bolted to a tripod with absolutely no pan, tilt, zoom, stabilization drift, or perspective shift. The curtains move only a few millimeters from gentle indoor airflow. A few dust motes drift through the window beam, and the chandelier crystals catch tiny natural highlights. Daylight remains soft and physically consistent. No objects appear, disappear, move position, change material, or change color. At 00:05.875 settle on the exact finished-room framing of <Picture 2>.

overall_soundscape:
Low quiet indoor room tone with faint airflow; no footsteps, tools, or speech.

non_diegetic_music:
N/A
