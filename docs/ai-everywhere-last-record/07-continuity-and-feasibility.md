# Continuity, character assets и production feasibility — draft v2

**Статус:** препродакшн-план, не генерационный пакет. Содержит новую редакцию сценария без мастерской, радио, проектора и домашней комнаты. H3 video jobs не запускались в рамках этого пересмотра. Точный клуб и маршрут между ним и магазином не определены.

## Идентичность и asset IDs

| ID | Элемент | Источник истины / роль | Инварианты |
|---|---|---|---|
| `LR-C01` | Молодой автор/курьер | **Первичный identity source:** оригинальная фотография `hero-reference-pexels-7061987.jpg`, AssetVersion `31ba354f-72fd-4d43-a87e-a8d19477a4b1`; отдельный от bike reference | лицо и вплетённые scalp-close cornrows считываются с original source; не заменять другим Pexels лицом, кудрями или синтетическим портретом; костюм/рюкзак — отдельная continuity спецификация после source actor review |
| `LR-C02` | Пожилой владелец-DJ | **Identity source:** `references/visual/last-record/incoming-online/dj-reference-pexels-8173263.jpg` (original internet photo); это лицо/возрастовой тип, не wardrobe/body/location/acting source. Создать новый character sheet от исходника и проверить визуально | своё лицо, возраст и пластика рук; не общий «седой наставник», не лицо курьера, не технический/одежный клон; старый generated anchor `c9c7e1a6-70db-4aac-b9fc-066abeb69de0` не использовать как authority |
| `LR-V01` | Fixed gear пользователя | `references/photo/fixedgear-bike.jpeg` плюс 2 вспомогательных фото только для понимания ракурса | matte black frame, fixed drivetrain/chain, bullhorn с pale mint wrap, carbon front wheel, надпись Dura-Ace, подтверждённые пользователем компоненты; ровно один велосипедист |
| `LR-P01` | Виниловый дабплейт и переноска | Новый prop anchor после получения точного вида конверта/пластинки | одна физическая 12-inch vinyl; плоская неиллюстрированная защитная оболочка героя, нейтральная этикетка без выдуманного текста; не создавать ему отдельную artwork sleeve; переноска стабильно одна |
| `LR-P02` | Клубная дека | Реальные опорные фото современного turntable/mixer, отдельные от shop listening deck | platter, tonearm, cartridge, mixer, channels и доступные руки геометрически стабильны |
| `LR-L01` | Последний магазин | Фасадный Rough Trade photo и выбранный QD location anchor v3 (`cec501fd-e39e-4dac-b607-c4edd9466a0c`); derivative v1 (`a4711717-0720-471d-91a0-33a213ec7d6c`) и более читаемый review candidate v2 (`057833fe-ee5d-4d5f-b584-2829663c0a41`). Sister Ray Geograph — только интерьерная глубина; Phonica crop — одна listening deck; Klaus G shelf/covers-research — sleeve references. | Держать геометрию v3: две витрины + центральная утопленная дверь, глубокая ночь. Вывеска `THE LAST RECORD` — векторный композит, афиши — точные local cover plates в увеличенных уличных рамах, пустой U-образный rack — справа у края. v2 не считать user-selected до просмотра; clean anchor и v1 не удалять. Герой оставляет велосипед у входа, не у стойки; в следующий H3 frame не добавлять второй велосипед. Не передавать схемы image inputs; не копировать Rough Trade branding или буквы модели. Не строить composite из разных storefronts как единую документальную локацию; никакого эфира/радиобудки |
| `LR-L02` | Клубная площадка | Пользователю нравится внешний образ M.O.T.; сюжетная площадка и interior не утверждены | интерьер можно собрать из подходящих других references, но вход, booth, колонки, dancefloor и exit должны образовать одну географию; не выдавать composite за буквальный MOT |

Имена/коды — предложенные стабильные production IDs, не готовые генерационные prompts. Старый Media Pool и отклонённые takes автоматически не считаются ref. Пользовательские фото велосипеда авторитетны; авторитетный bike source не заменяется интернет-фото.

## Character sheet strategy: раздельные reference masters, а не мелкий коллаж

«Character sheet» — производственный asset package, не один магический лист, который одинаково надёжно сохраняет лицо, одежду, руки и позы. Для LR-C01 identity authority уже задан пользователем конкретным исходным фото Pexels 7061987: оно несёт лицо и причёску, а не только hairstyle. Синтетический portrait `a0634de2-d0c6-45cc-b7c9-5d14bfb20efa` и hair-transfer output ANCHOR-09 не являются его identity assets. Любые производные ракурсы/кадры должны создаваться от исходного actor reference и проходить отдельный крупноплановый QC.

Для каждого человека подготовить:

1. **Identity portrait master:** одиночный крупный neutral head-and-shoulders кадр с фронтом и мягким 3/4 сведением без широкоугольной деформации; база для лица и характерной фактуры кожи.
2. **Full-body wardrobe reference:** один человек в простой нейтральной позе, весь силуэт и обувь видны, фон простой; костюм повторяется как отдельная жёсткая спецификация.
3. **Turnaround views:** отдельные frontal/profile/back views того же принятого identity anchor. Если строятся контактным листом — оригиналы каждого view хранять отдельно, не полагаться на мелкие панели для H3.
4. **Performance expressions:** 2–3 отдельных состояния, характерных сцене (герой сдерживает ожидание/берёт риск; DJ сосредоточен/делает выбор). Не увеличивать число лицевых референсов до появления реального identity drift.
5. **Action hands:** отдельные крупные источники рук с правильной кожей/суставами для задач рук. Поза hand-on-turntable не должна подменять общий character identity.

Сначала принимается один портрет-identity anchor на человека; потом от него выводятся виды/одежда. Никогда не просить один текстовый prompt нарисовать двух героев, bicycle, shop, signage, covers и точную геометрию аппаратуры в одном collage. Финальные sheets должны иметь и full-res master, и проверенные отдельные crops с provenance/role tags.

## Qwen Image 2.1: что сейчас знает локальный граф

Проверены локальные файлы workflow, не активный runtime profile:

- `workflows/qwen_image_2.1_text_to_image.api.json` — пустая базовая заготовка: `EmptyLatentImage` 1024×1024, `TextEncodeQwenImage21.resolution=1024`, Qwen Image 2.1 T2I, seed/steps заданы в graph. Её нельзя считать high-resolution character-sheet workflow.
- `workflows/last_record_qwen_image21_storyboard_two_character_shop_v1.api.json` — staging candidate: output canvas 1376×768 (1.056 MP); edit encoder `resolution=1024`; три картинки (scene + hero + DJ); graph text всё ещё описывает старый магазин с экраном/проектором. Этот graph не соответствует новому screenplay и не выбран для storyboard.
- `workflows/h3_refmod_create.api.json` — параметр `ref_resolution=1024`, `pool_h/pool_w=16`; трактовку разрешения и влияние на token budget нужно подтвердить в установленном `H3RefModCreateFromFolder` node, не угадывать.

Comfy-Org Qwen Image 2.1 documentation подтверждает native image output вплоть до 2048×2048; T2I canvas задаётся Resolution Selector и megapixel target. Для image edit размер первого изображения зависит от `resolution`: `0` сохраняет его размер с округлением до 32; положительное значение — pixel budget, а не линейная ширина/высота. Поэтому текущие 1024 могут означать около 1 MP и съёмку мелких деталей, не «1024 px». Для пользовательского фиксированного кадра 16:9 разумный кандидат теста — около `2048×1152` (≈2.36 MP), но только после read-only validation нового графа и фактического node schema/VRAM feasibility. Qwen 2.1 outputs существенно выше native 2K не рекомендовать: официальная инструкция предупреждает о падении prompt adherence за обученным размером.

### Рекомендуемые классы разрешений (предложение, не активированный workflow)

| Asset | Canvas candidate | Почему |
|---|---:|---|
| Square face identity portrait | 1536×1536 или 2048×2048 | крупное лицо/волосы/кожа с достаточно большим числом пикселей; Qwen 2.1 умеет native 2K, но full 4 MP дороже |
| 16:9 cinematic/location keyframe | 2048×1152 | соответствует выбранной картинке мастера и даёт около 2.36 MP вместо current 1.056 MP |
| Full-body/wardrobe anchor | примерно 1536×2048, вертикальный | сохраняет тело/одежду/обувь; отдельный head anchor остаётся квадратным |
| Asset detail (hands, decks, label) | 1536–2048 по длинной стороне в кадре с нужным ratio | детали читаются; точный текст/маркировки делают композитом, не generative typography |
| H3 reference still/crop | high-resolution master сохранён; upload/crop scale — по фактическому H3 graph | не уменьшать мастер исходник; отдельно валидировать реальный H3 reference preprocessing |

Это не требование сделать всё 2K: для итогового H3 шота решают H3 runtime limits, входная роль, Aspect ratio, VRAM и approved workflow. До проверки H3 profile каждый размер в production package остаётся proposed.

## RefMod и сохранение качества

- RefMod не становится выше по деталям только от увеличения входного character sheet. Нужны: чистый принятый портрет, достаточно крупные face crops без blur/многослойной компрессии, отдельный wardrobe/full-body reference, реалистичные стабильные входные размеры и проверка output motion.
- В `h3_refmod_create.api.json` сейчас `ref_resolution=1024`; размер этого параметра может быть пространством preprocessing/tokenization, не выходным разрешением RefMod. Прежде чем менять его, прочитать `object_info` для установленной версии H3RefModCreateFromFolder, сопоставить с фактической имплементацией и проверить supported multiples/range. Никакой runtime-параметр тут пока не менялся.
- Не делать RefMod из большого контакт-листа с мелким лицом, одновременно из персонажа+велосипеда+магазина. Сначала отдельные RefMods/References по ролям; в H3 shot использовать только реально поддерживаемые роли, нужные конкретному кадру.
- Высокое разрешение не чинит ошибочные pose, лицо или устройство велосипеда. QC сравнивает исходники и результат при native 100% zoom и обычном display fit; слабые images reject с конкретной причиной.

## Ночная экспозиция и управляемая глубина резкости

Глубокая ночь — утверждённый общий вайб. Плотная тень скрывает лишнее в кадре естественно, но не применяется как способ спрятать плохие лица или geometry.

- Практический источник мотивирован: натриевый streetlamp, витрина/лампа прилавка, клубный worklight/fixture. Цветовые и световые transitions поддерживают путь магазин → клуб.
- У каждого плана заявляется focus subject и plane: лицо / руки с винилом / колесо / вывеска / дальний отклик. Задавать объективную оптическую логику, близость объекта, точки foreground–midground–background и величину размытия, а не generic «cinematic shallow depth».
- Герой и объект ключевого действия остаются в одной плоскости резкости, если действие должно читаться вместе. Рефокус — от конкретного предмета к конкретному человеку только в момент смены эмоционального фокуса.
- Широкий establishing сохраняет читаемую географию и signage; глубину резкости допускается увеличивать, если зрителю нужно прочитать расстояние/топологию магазина или клуба.
- На тёмной коже сохраняются мелкие детали света и естественная текстура; не заполнять лицо плоским белым светом и не проваливать тени в клиппинг.
- «Foreground detailed, background soft» используется для фокус-иерархии, не для скрытия несогласованных людей/предметов. Background extras не должны содержать заметные сломанные детали.

## Камерная грамматика по физике действия

Набор движений выбирается на уровне каждого шота по событию, а не вставляется в prompts как каталог глаголов.

| Операция | Применять когда | Здесь уместно |
|---|---|---|
| Static hold | зритель читает деталь, слушание/ожидание, передача ценности | DJ закрывает магазин; private listen; короткая реакция на трек |
| Push-in | персонаж делает выбор или внимание сдвигается к важному предмету | герой решает поставить запись сам; не использовать серией на всех лицах |
| Pull-out | выявить пространственную/социальную стоимость решения | после handoff раскрыть, что герой теперь перед целым залом |
| Track/truck with subject | удерживать кинетическое движение и географию | ночной велосипедный маршрут; от зала к booth |
| Pan/tilt/pedestal | следовать реальному объекту/движению в вертикали или панораме пространства | показать путь от двери в магазин, силуэт клуба или взгляд из booth в зал |
| Arc | смена отношения/кругового мотива при фиксированной оси | единичная рифма винил ↔ колесо, если движение физически исполнимо |
| Zoom | только если реальный оптический zoom и осознанный эффект перспективы | иначе не подменять им push-in/truck |
| Handheld shake | передать вибрацию/присутствие оператора, подкрепить телесное действие | дозированно на дороге или в танцполе; не постоянная дрожь |
| POV/roll | строго субъективное движение или дезориентация | не применять, если оно ломает реализм/ориентацию истории |

На storyboard/shot bible для каждого shot фиксировать subject, lens/фокусное как предложенную величину, focus plane, DoF (shallow/medium/deep с причиной), start/end focus, camera move, стартовую и конечную позицию, реальный screen direction, foreground occlusion, exposure detail, continuity anchors и QC criteria. Число фокусного/диафрагмы не объявлять фактической камерной симуляцией до проверки generation model; писать визуальную цель и физическое ограничение, а не обещать объективную достоверность по словам в prompt.

## Пространства, оси и таймлайн

- В магазине — один компактный интерьер, читаемый фасад и одна ось: герой / listening deck / DJ. Ни радио, ни booth-handoff, ни экран/проектор.
- Наружный anchor LR-S03-EST-01: фасад с двумя витринами, центральной дверью, тремя низкими постерными рамками и пустым bike rack у правого края; вывеска читается как `THE LAST RECORD`. Герой всё равно останавливает велосипед непосредственно у входа по сценарию, стойка — только часть уличной обстановки.
- Клуб — отдельный интерьер и новая ось. Сначала establishing привязывает вход, dancefloor, speaker, booth и две позиции людей; только после этого движемся/режем между ними.
- Движение велосипеда и экранное направление закрепить для каждого сегмента маршрута. Не менять handedness велосипеда, направление движения и место переднего/заднего колеса на монтажной склейке.
- До выбора адресов путь магазина → клуба — монтажный ellipsis; не генерировать route map с ложными расстояниями.
- 24 fps final timeline; source generation length и timeline clip length различать. 2–4 s — ориентир для большинства планов; короткие inserts и более длинные holds разрешены по музыкальной и драматической функции.
- Audio master remains exact continuous input; music marker audio evidence in `01-music-cue-sheet.md`; phrase timing/downbeat/manual visual cue `UNVERIFIED` until NLE conform.

## Технический gate перед любым будущим production batch

Перед каждым уже выбранным конкретным workflow/profile заново проверить `/ready`, worker, queue, точный `COMFYUI_URL`, profile mode/revision/hash, input roles, frame dimensions, multiples of 32, runtime node compatibility и конкретный seed/snapshot. Текстовый план или schema pass не эквивалентны generation/QC. Не запускать Comfy MCP submit пока его target не совпадает с актуальным worker endpoint. Сохранять manual approval, idempotency, lease/fencing, cancellation/reconciliation, immutable job snapshot и CAS/provenance. Здесь generation не происходила.

## Текущая проектная и workflow-проверка (2026-11-16, обновлено 17:37 UTC)

- Новый Project `8dc7d22f-7e16-426c-b5f8-f897edb692b5`: первичный receipt был 7 narrative scenes / 4 linked sources / 0 jobs, позднее superseded. Live GET 2026-11-16 21:58 UTC показал 8 scenes / 16 project assets / 14 jobs: `LR-PRE-00` содержит character portrait/location candidates, а `LR-S02` — технический bike ControlNet/Ref2VA shot с matched baseline. Portraits and shop anchor требуют художественного утверждения/QC; bike A/B unselected. Полный storyboard и story-shot coverage для текущего сценария отсутствуют.
- Последняя runtime-проверка: `/ready=ready/degraded`, required ComfyUI/storage OK, optional llama.cpp offline; worker `local-qwen` online; ComfyUI `/system_stats` и `/object_info` 200; очередь пуста. Свободная VRAM около 2.76 GB — узкий запас, перед любым generation проверить снова; `/ready` не обещает успешный inference.
- Read-only profile tests `/v1/workbenches/profiles/:id/test` пройдены: `last-record-qwen-image21-keyframe-16x9-v1`, mode `image-generate`, catalog revision 1, graph hash `7f00250c5f1802e6fd2caec8bca5c49b56273890059ed8e51533ca8e4fc5ee0c`, 1376×768 / encoder 1024, 9 reachable nodes; `last-record-qwen-image21-character-sheet-v1`, mode `image-generate`, revision 1, hash `42d093a90ac6039a64240b72a82dadd53aa25a9b18c8932164d58044018250ec`, 1024×1024. Оба графа — чистая генерация без image input roles, поэтому не сохраняют лицо по референсу; schema/runtime test не является visual QC.
- Для full-body/turnaround/storyboard edits нужен отдельно проверенный image-edit граф с реально подключёнными identity inputs. Размеры 1024/1376 ограничены относительно желаемой детализации; high-res aspirations проверять на фактическом workflow, не менять профиль или VRAM-настройки без проверки.
- Перед каждым production job повторить `/ready`, worker/queue/VRAM и profile test; пройти штатные QD immutable snapshot, approval, lease/fencing, cancel/reconcile и CAS/provenance. Одно имя active profile не доказывает пригодность.
- Старый QwenDirector Project `88a4fdec-156b-4f4b-abd9-e04328a512e1` оставлен нетронутым; его assets/jobs сохраняются только как provenance прошлой версии.
