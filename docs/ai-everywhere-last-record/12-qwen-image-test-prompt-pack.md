> **Архив / предыдущая версия:** Исторический пакет генераций предыдущего сценария. Сохраняется только для provenance и разбора ошибок; prompts, роли Picture N, resolution, jobs и outputs не переносить в новую версию.

# Qwen Image 2.1 — test pack и фактические результаты

> Обновлено 2026-11-16: ниже сохранены исходные candidate prompts и добавлены фактические jobs/QC. Старое вводное «без отправки jobs» больше неактуально. Все результаты имеют lineage в новом QwenDirector Project; отсутствие `selected_asset_version_id` означает, что output не назначен выбранным anchor автоматически.

Все prompts ниже — **candidate v1**, не факт об уже полученных кадрах. Пять outputs создаются последовательно и отбираются визуально до любых H3 jobs. `image-generate` профили `last-record-qwen-image21-character-sheet-v1` (1024×1024) и `last-record-qwen-image21-keyframe-16x9-v1` (1376×768) прошли live schema test и активированы; это не доказывает качество кадра. В QwenDirector `prompt` — полный positive text для `image-generate`; поля camera/action/composition/lighting — метаданные и не должны автоматически прибавляться к нему. Seeds сохранять в immutable job snapshot, первый seed задаётся явно и меняется только по результату QC. Негативный prompt хранится в выбранном graph; его точную ревизию и hash записывать в job manifest.

## P1 — `LR-C01-A` / hero face anchor / 1024×1024

**Positive prompt (English):**

> Photorealistic casting portrait for a gritty contemporary London music film. A young male visual artist in his late twenties to early thirties, lean build, distinct natural facial proportions, short dark hair, honest skin texture with pores and small asymmetries, alert but tired eyes after a late working night. He is an observant, practical person, not a fashion model and not performing for camera. Neutral dark waterproof jacket with simple collar, no logo, no jewellery that draws attention. Chest-up three-quarter view, head and both ears visible, shoulders level, neutral expression with restrained concentration. One soft practical tungsten lamp from camera left and cool night fill from a window, believable shadow falloff, no coloured neon. 50 mm photographic perspective, eye-level camera, modest depth of field, subdued charcoal and sodium-amber palette, fine organic grain. Single person, clean unobtrusive background, enough space around head for later reference crops. Preserve a credible face suitable for repeated acting shots.

**QC:** one face, both ears, natural eye spacing, consistent jaw/nose/skin; no beautification, no uncanny symmetry, no exaggerated «rapper» gestures. Chosen output becomes the sole identity anchor for C01-B/C/D. Do not create three divergent faces and call them one sheet.

## P2 — `LR-C02-A` / DJ face anchor / 1024×1024

**Positive prompt (English):**

> Photorealistic casting portrait for a grounded London pirate-radio record-store film. An older male DJ and record-shop owner in his early sixties, naturally aged face, short grey hair, believable skin texture and under-eye fatigue, calm direct gaze, compact practiced posture. He has decades of experience handling records; he is active, attentive and fully capable, not a frail mentor stereotype. Dark graphite work shirt under a worn brown cardigan, no costume nostalgia, no oversized headphones or flashy jewellery. Chest-up three-quarter view with both ears visible, neutral expression while listening to someone just outside frame. One warm practical lamp from the record counter, cool spill from the wet street through a real shop window, dense but readable shadows. 50 mm eye-level photograph, subtle film grain, restrained colour. Exactly one person, no text, no props covering face.

**QC:** reads as distinct from C01 in age, posture and silhouette; dignified, specific, no caricature. Hands will be developed as a separate insert rather than accepted from this portrait.

## P3 — `LR-V01-NIGHT` / bike identity transfer / image-edit pending graph gate

**Reference role:** `<Picture 1>` = user-provided `references/photo/fixedgear-bike.jpeg`, AssetVersion `a652857d-09bc-4ee0-a045-6fa546a34b77`. Use a qualified Qwen Image 2.1 **image-edit** graph after verifying LoadImage dimensions/roles; do not send this to text-only image-generate while claiming exact bike provenance. Source image is 1280×960, so inspect actual image-edit graph input resizing/crop and effective TextEncode resolution before submit.

**Edit instruction (English):**

> Use <Picture 1> only for the exact identity and mechanical geometry of the fixed-gear bicycle. Preserve its black frame proportions, pale wrapped drop handlebar, deep dark FRONT rim with white markings, slimmer REAR rim with tan sidewall, silver crank and stem, bottle cage, wheelbase, saddle height and orientation. Place the same bicycle in a wet industrial London street at night, locked beside a record-shop wall under a sodium streetlamp. Make the rain, pavement reflections, wall and practical light photorealistic. Replace the original daytime white wall, green bench and blue corner completely. Do not add a second bicycle, a derailleur, suspension, impossible brakes, floating parts or invented readable brand lettering. Keep both wheels complete in frame, side profile, no rider. A plain lock and small night light may be added only as separate practical props without altering bicycle identity.

**QC:** overlay against source geometry; deep rim remains front; tan rear sidewall remains; crank and fork plausible. Any incorrect side swap or garbled lettering is reject or graphic repair, not «creative variation».

## P4 — `LR-L03-MASTER` / store geography / 1376×768

**Positive prompt (English):**

> Photorealistic wide establishing frame inside a small legendary underground record shop on its final night. A compact physical room with two distinct vinyl turntables and a simple mixer against the left side wall, dry record counter between entrance and DJ position, a real front door and large street-facing window, a portable projector on a stable crate near the entrance, a plain white projection screen deeper in the shop. Through the window a small group of real people waits in a wet industrial courtyard; the screen is partly visible from that courtyard and its sightline can be improved by moving the crate. Old records, cardboard sleeves and practical wiring are present but never clutter the walking path or hide the second deck. Cold fluorescent ceiling light mixes with one warm counter lamp and sodium street reflection. Grounded UK jungle/pirate-radio atmosphere, detailed tactile materials, believable room scale, no cyberpunk, no LED walls, no holograms. Wide 24 mm view from the front door at human height; clear geographic relationship among counter, two decks, screen, window and people. 16:9 frame with central safe composition for later vertical crop.

**QC:** draw a top-down map from the image; if impossible, reject. Both decks and exterior line of sight must be legible. Compare exterior reverse view before using as set anchor.

## P5 — `LR-L02-ROUTE` / industrial route / 1376×768

**Positive prompt (English):**

> Photorealistic nighttime industrial London route for a gritty jungle music film. One coherent wet brick industrial district. A full-width steel mesh gate blocks one service lane; a visible chain and central padlock close both leaves. There is no side gate or pedestrian passage through this barrier. The open public street remains behind camera for a route back and a detour around the block; the record-shop destination belongs to a separate warm storefront on the public lane, not beyond the locked yard gate. Real sodium streetlight, sparse cold warehouse fluorescent spill, wet asphalt with physically plausible reflections, deep shadows with readable paths. No skyline montage, no arbitrary landmarks, no neon signs or digital effects. Wide 28 mm view from the approaching cyclist's side of the gate, strong left-to-right travel direction, enough street geometry to understand why the rider must turn back to the public road and take a longer route around the block. No people or bicycle in this first location anchor; architecture and route only.

**QC:** direct path blocked by the full-width gate; open approach remains available on the camera side for returning to the street. Do not require a through-gate detour or place the shop beyond this barrier. Retain one gate design, central chain/padlock and brick piers; keep wet material detail natural. The route still needs a separate public-street keyframe and action coverage before production.

## Next edit sheets after anchor selection

C01-B and C02-B: one face anchor each as `<Picture 1>`, request front/profile/3/4 in **separate** images rather than an uncontrolled collage; preserve ear, nose, jaw, hairline. C01-C: selected face and approved bike prop as separately labelled references only if graph supports two inputs; otherwise generate a grounded still from approved face and edit bike into it. C02-D: separate hands and record detail. L03 exterior reverse view from same set anchor. P01 label and readable text by composite, not diffusion. Every edit profile requires its own mode/hash/input-role/runtime check; the active old room and RefMod edits are not silently reused.

## Фактический P1 — герой LR-C01-A

Пользователь выбрал образ темнокожего Black British мужчины в практичной уличной одежде. Выбранный anchor — AssetVersion `34b0b14e-745b-444e-b901-0df6aff4a49a`, SHA-256 `442aab6655b57524c5cabffc7fe198971ea865efe35a051f78ba4f7c00cb40c4`, job `75c1f73f-a862-42c4-8ab6-8a27ffe65f03`, seed `6419028`, Qwen Image 2.1 image-generate 1024×1024. Визуальный просмотр: правдоподобная кожа, короткая стрижка, тёмная куртка и ночной бетонный фон; годится как casting/identity anchor. Межшотная/видеостабильность ещё не проверена.

## Фактический P1-B — derived identity sheet candidate

Job `3b10f4e9-3866-417b-8fcf-a7abed18e1b0`, shot `LR-C01-B`, attempt `935f80ce-f6fa-4609-8047-56c208d2b3e4`, profile `last-record-qwen-image21-identity-sheet-edit-v1`, graph hash `d2b3b25315e8630bedad89a46845c052b2dc2858db5965b47864db7fe77ad84b`, seed `6419030`, input `<Picture 1>` = actor AssetVersion `34b0b14e-745b-444e-b901-0df6aff4a49a`. Output AssetVersion `58a94805-6951-47b2-b19a-37af6933d1f4`, SHA-256 `951446da3e787173e8439491366c733609809746124887ff6909bf6d78c8a22f`, 1,485,950 bytes. Plan: 1024×768; output фактически **1024×1024**, четыре вертикальных вида (front, 3/4, profile, rear) с белыми разделителями. Ручной визуальный QC: все четыре изображения читаются как один человек; лицо, skin tone, hair и wardrobe достаточно стабильны для сопоставления. Ограничения: профиль/вид со спины — дополнительные ракурсы, не запрошенный состав; квадратный формат и линии нельзя принимать за production frame. Сохранить как рабочий reference, не назначать выбранным без отдельного решения пользователя. Manifest сообщает `qualityControl.status=not-performed`; это не отменяет сделанный ручной просмотр и не превращается в автоматический PASS.

**Проверенная локальная копия для просмотра:** `/tmp/last-record-identity-sheet.png`; CAS/UI остаются авторитетными источниками output и provenance.

## Фактический P2 — кандидат anchor пожилого DJ

Job `7aa2083f-7b90-4ab2-82c6-3647f23ca217`, shot `LR-C02-A`, attempt `0102822f-735e-4c59-9aba-74cb98d988ce`, profile `last-record-qwen-image21-character-sheet-v1`, graph hash `42d093a90ac6039a64240b72a82dadd53aa25a9b18c8932164d58044018250ec`, seed `6419031`, 1024×1024, без input refs. Job прошёл штатные состояния `awaiting_approval → queued → leased/running → succeeded`. Output AssetVersion `8ee78d36-e8c0-47c5-8ec6-f5661f262462`, SHA-256 `f7727969acb33eb7b3588a6c64bcb4e085f8545590c4ba22703f2e9724886134`, 1,485,950 bytes. Ручной visual review: возраст и зрелость читаются, лицо/кожа естественны, фигура и кардиган отделяют его от C01, фон связывает его с магазином; candidate пригоден для дальнейшего character-sheet edit. Ограничение: полки и практическая лампа в портрете — только background flavor, не утверждённая геометрия LR-L03. `selected_asset_version_id=null`, manifest QC — `not-performed`; это кандидат после ручного просмотра, не финальный selection.

**Просмотренная локальная копия:** `/tmp/last-record-dj-face-anchor.png`.

## P2-B / C02-A2 — skin and hair refinement, rejected

Job `3f4f564f-d1af-443a-bbe6-0930a28f8689`, input `8ee78d36-e8c0-47c5-8ec6-f5661f262462`, profile `last-record-qwen-image21-character-refine-v1`, graph hash `93524dac25ecc32c54c09d931293e2c1fe9d1dc4b77acea925ede0e0ba751c79`, seed `6419032`. Output AssetVersion `35a62e44-0b7e-43e1-b45c-32971cc4af03`, SHA-256 `9f9b24d5445082d65d4ec345fea670467c68a87efdf35c43277f3679d13e136a`. Ручной просмотр: близок к source и не устраняет отмеченную пользователем синтетичность кожи; reject as insufficient improvement. Копия `/tmp/last-record-dj-refine.png`.

## P2-C / C02-A3 — restrained texture edit, rejected

Job `664bdf6d-1b9b-4c52-b65c-fbd49040e9d9`, input original `8ee78d36-e8c0-47c5-8ec6-f5661f262462`, profile `last-record-qwen-image21-skin-texture-refine-v1`, graph hash `d3dfcc154e02b6426f14aed2cfff4fc18e7e20a0914d5e9489745e5f5b4b0666`, seed `6419033`, denoise `0.58`. Output AssetVersion `00cb48cf-8530-4442-899d-d5424ac8973e`, SHA-256 `bf39952882f1d27bc191d75edc13a17466c08f326a431b2e50eac6905af59fbf`. Фактический output — повторяющаяся мозаика с множественными лицами; reject. Этот граф+режим не повторять для дальнейшего тонкого skin edit.

## P2-D / C02-A4 — независимый natural-skin вариант

Job `739d4ed9-750c-4fc1-8cdd-91f50e8e243b`, image-generate profile `last-record-qwen-image21-character-sheet-v1`, graph hash `42d093a90ac6039a64240b72a82dadd53aa25a9b18c8932164d58044018250ec`, seed `6419034`. Output AssetVersion `6c4d1b80-a7f8-49aa-a7d9-69411eaf1657`, SHA-256 `a3f3f3059b128b317e6f00afc20df5f3d2b447710aded357d29b1fece133ef4c`. Это fresh casting image, поэтому сходство с C02-A не обещается. Ручной просмотр: кожа чище, но лицо остаётся несколько гладким; стрижка и общий возраст читаются. Копия `/tmp/last-record-dj-natural-skin-alt.png`.

## P2-E / C02-A5 — предпочтительный skin candidate

Job `efb33f94-af50-4e68-88b4-dffef53d8461`, image-generate profile `last-record-qwen-image21-character-sheet-v1`, graph hash `42d093a90ac6039a64240b72a82dadd53aa25a9b18c8932164d58044018250ec`, seed `6419035`. Output AssetVersion `c9c7e1a6-70db-4aac-b9fc-066abeb69de0`, SHA-256 `a37cfc61cde3f9de4751e8c6f6c55d536fe41e904362f5870e3ca14ec7319400`. Ручное сравнение трёх успешных лицевых кандидатов: этот вариант даёт более неравномерную и правдоподобную фактуру кожи и тонкие линии; сохраняется небольшая генеративная гладкость. Рекомендован к рассмотрению как новый C02 identity anchor, но не выбран автоматически; при выборе C02-B sheet необходимо строить только от одного выбранного anchor. Копия `/tmp/last-record-dj-neutral.png`.
