# Сверка с Director Studio

## Актуализация 2026-11-15

Проверен публичный upstream README и его текущий HEAD `b8d5a73abbc199594d06206a4db57a66a216ab8e` (2026-11-14). GitHub License API отвечает 404, поэтому право копировать код или bundled workflow не предполагается. Ничего из upstream не переносилось. README называет актуальные bundled workflow: `qwen_actor_asset_workbench.api.json`, `QwenEdit2511_MultiAngle_SceneRef.api.json`, `qwen_prop_master.api.json`, текущий `qwen_image_21_layout.api.json` и legacy `ref_frame_layout.api.json` как отдельный pipeline. QwenDirector catalog теперь указывает текущий Layout-файл. Установленных копий всех четырёх asset/layout graphs на этой машине не найдено; для реализации нужны собственные workflow graphs или явный review точных локальных импортов.

Дата: 2026-10-10. Upstream: публичный `main` [ai2764/Director-Studio](https://github.com/ai2764/Director-Studio), README и `docs/ARCHITECTURE.md`, просмотренные в эту дату. SHA `main` не зафиксирован. Файл LICENSE в репозитории не найден (путь `/LICENSE` отвечает 404); право повторного использования исходников или workflow не предполагается. Ни код, ни workflow из upstream не копировались.

## Сравнение текущих возможностей

| Область | Director Studio (upstream) | QwenDirector (локальный checkpoint) |
|---|---|---|
| Продукт | Локальная agentic filmmaking-студия для shot planning, reusable assets, H3 prompts и image/video jobs | Локальный каталог Project → Scene → Shot, timeline, Media Pool и durable production jobs |
| H3 | Локальный ComfyUI через MCP, опциональный официальный MiniMax API, built-in/custom Ref2AV, reference pictures/audio и source-video continuation | Реальный ComfyUI H3 worker path и R2V E2E ранее подтверждены. Worker исполняет через прямой Comfy HTTP; настроенный Codex MCP read-only и не является его transport |
| H3 workflow | Wizard обнаруживает inputs/outputs, проверяет/тестирует граф; continuation имеет отдельные контракты | Import wizard, H3 boundary/reference binding checks, immutable profile revisions, runtime test/preflight/activate |
| Director agent | Разговорный Harness/LLM agent планирует shots, рассматривает references, пишет prompt и вызывает инструменты | Есть bounded локальный Planner Assist с PostgreSQL session history, read-only контекстом проекта, выбранного shot, reference roles и соседних shots, а также активных workflow profiles; произвольный tool loop и write/job tools не реализованы |
| Assets/workbenches | Реальные Actor, Scene, Prop, Layout и voice workflows, typed output slots | Typed Media Pool, workbench UI/contracts, profile/executor/job boundaries; реальные API-format Actor/Scene/Prop/Layout graphs и live E2E не импортированы |
| Durable execution | Jobs, pause/cancel/recovery описаны upstream | PostgreSQL jobs, approval, leases/fencing, idempotency, cancel/reconcile, CAS AssetVersion и provenance — более строгая основа для локального bounded execution |
| Finished video | Подготовка shot/prompts и генерация есть | Нет завершённой цепочки storyboard → continuity → batch shots → local assembly/export; текущий Porsche shot list пуст |

## Дополнение: DeepSeek Harness Director plugin (2026-10-26)

Проверен публичный [`ai2764/dsh-director`](https://github.com/ai2764/dsh-director), версия 0.1.76, commit `cb3525fef18c7d2f7d347765ef388e1ea87919f4`; просмотрены workflow/review/asset/GPU source modules и focused tests. Это плагин для DeepSeek Harness Web, а не отдельный durable production backend. Код в QwenDirector не переносился.

| Возможность плагина | Состояние QwenDirector | Вывод |
|---|---|---|
| Разговорный агент с инструментами для планирования, чтения assets/workflows и отправки ComfyUI jobs | Локальный Planner Assist показывает PostgreSQL session conversation для итеративной правки shot plan, использует read-only контекст выбранного проекта и активных workflow profiles, сохраняет turns с version check; свободный произвольный чат и write/job tools ещё не реализованы | Следующий продуктовый шаг — review object для явного подтверждения версии shot plan перед durable job; создание/утверждение jobs пока остаётся ручным |
| Shot/reference review card; версии proposal; явное подтверждение конкретной карточки и clip до managed H3 submit | Есть approval durable job, immutable workflow revision и prompt snapshot; отдельного review proposal/card с `card_id`/`clip_id` нет | Перенести идею отдельного creative approval перед созданием/утверждением job, связав её с неизменяемым входом |
| Проверка фактических reference bytes/order, dialogue, duration, dimensions и continuity против подтверждённого clip | QD хранит AssetVersion IDs/roles и immutable job plan; нет такого clip-card binding/checklist UI | Усилить pre-submit проверку связности shot, refs и H3 параметров |
| Инспекция API workflow и socket schema; проверка путей от H3/context до сохранённого video output | QD импортирует profile revision и проверяет базовые H3 boundary классы/LoRA; нет общего node-schema inspector и проверки всего execution path | Следующий workflow этап должен валидировать конкретные входы/выходы и связи, а не только наличие классов |
| Встроенные media/review views, локальный asset registry и staging выбранных refs с проверкой байтов | Есть Media Pool/CAS/provenance, но нет сопоставимой review-карточки в разговоре | UX и staged reference bindings — полезный образец; CAS и fencing QD сохранять как источник истины |
| ComfyUI monitoring с unload LLM и проверкой завершения GPU handoff | Durable worker monitor есть; подтверждённого LLM unload/VRAM-release протокола для shared GPU нет | Добавлять только как отдельный runtime capability/lease; очередь плагина process-local и слабее durable job lifecycle QD |

Идеи для QD: review-card как версионированный domain object, явное подтверждение `shot + references + workflow + clip`, workflow inspector с проверкой node schemas/graph paths и media review рядом с durable job. В реализации plugin восстанавливает approval по Harness session event log, блокирует managed H3 без текущей card/clip approval, и проверяет graph против `/object_info`; tests покрывают устаревшую card, изменение dialogue, ошибки Comfy и гонку creative edit во время preflight. GPU handoff ждёт idle queue и фактического VRAM headroom после unload/free. Не переносить внутреннюю Harness интеграцию, UI hooks или process-local job monitor. README указывает MIT для оригинальной реализации; это не является основанием копировать код без отдельной проверки точного commit, LICENSE и нужных сторонних материалов.

Upstream README описывает также optional official API, несколько LLM providers и GPU/LLM lifecycle coordination. Это не нужно для local-first target: облачные/API providers остаются выключенными, пока пользователь отдельно их не разрешит.

## Предлагаемые этапы к автономной локальной H3-генерации

1. **Один проверенный golden shot.** Текущий лучший по оценке пользователя — стандартный H3 Ref2V с `minimax_h3_ref2va_pruned_int8_convrot` + `pika_h3_flex_ref2va_v1_bf16`; оценка предварительная, пользователь продолжает сравнения. Сохранённый ComfyUI workflow проходит локальный import, `/object_info` schema preflight, H3 boundary и snapshot input injection. То же подтверждено live после обновления ComfyUI workstation до официального v0.45.0. Не объявлять production default и не переключать активный profile до завершения анализа и отдельного решения пользователя. PDD и VEDA остаются альтернативными экспериментальными графами.
2. **Замкнуть один shot lifecycle.** В UI подготовить structured H3 prompt, refs и параметры; зафиксировать immutable input snapshot и graph hash; оценить ограничение attempts/disk/time; потребовать manual approval; выполнить submit/poll/cancel/reconcile и CAS commit; показать provenance и дать оператору выбрать take. Повтор submit должен быть idempotent, неизвестный submit outcome не должен запускать слепой повтор.
3. **Добавить локального Director agent.** Подключить текущий llama.cpp через provider-neutral interface. Инструменты агента — только project/asset/workflow reads и typed planning APIs. Пусть он формирует script → scenes → shots → H3 prompt candidates и explainable repair proposals; каждое изменение создаёт revision/decision provenance. Запись в БД, approval и GPU submit проходят существующие API/job lifecycle, не прямые tool side effects.
4. **Ограниченный batch.** После ручного одобрения shot plan и максимального N jobs агент ставит jobs последовательно с лимитом времени/диска/повторов, учитывает failed/cancelled/unknown outcomes и останавливается на заданных условиях. Финальный выбор видео остаётся за владельцем.
5. **Continuity и монтаж.** Передавать только утверждённые AssetVersions и reference roles между соседними shots; вести continuity notes/seed/profile provenance. Затем отдельный deterministic FFmpeg stage собирает shot order, trims, audio и codec и пишет export manifest. Генерация clips ещё не равна готовому ролику.
6. **Расширить assets.** Импортировать и принять по одному Actor → Prop → Scene → Layout API-format workflow, добавить output slots → CAS AssetVersion lineage и live E2E. Это улучшит планирование, но не блокирует первый H3 shot.
7. **Приёмка на Porsche 718 Spyder RS.** Оформить brief, storyboard и refs; сделать одобренный короткий draft; провести визуальную и аудиооценку. Для quality профиля выполнить минимум три повторения на одинаковом входе и сохранить latency/VRAM/quality оценки, затем выбрать default. Только после этого включать bounded batch automation.

Под «автономностью» здесь понимается локальный агент, который исполняет заранее одобренный и ограниченный план с восстановлением состояния. Неограниченные GPU-запуски и автоматический выбор финального take не входят в текущий MVP-контракт с ручными approvals.

## Ближайшее действие

Текущий live `/object_info` подтверждает наличие стандартного INT8 pruned UNET и Pika Flex LoRA. Dry-run сохранённого Pika Flex workflow проходит schema и injection без enqueue. Пользователь продолжает quality-анализ; не запускать сравнительные GPU jobs и не менять активный профиль до его решения. Приложение показывает в выборе профиля извлечённые diffusion/LoRA model names, чтобы graph hash не был единственным способом понять model stack.

## Дополнение: ComfyUI MiniMax H3 Prompt Enhancer T8 (2026-11-16)

Проверен [sotaihub/comfyui-minimax-h3-prompt-enhancer-T8](https://github.com/sotaihub/comfyui-minimax-h3-prompt-enhancer-T8) на `main`, SHA `6244a7319977f9b617f071bbd7a662eec03a7fff`; прочитаны README_EN, LICENSE и руководство Prompt Relay. В установленном `/mnt/AI_FAST/comfyui/custom_nodes` директории T8 нет. `LICENSE.txt` содержит `All rights reserved` и запрещает копирование, изменение и распространение без отдельного письменного разрешения; код, skill-тексты, templates и assets не устанавливались и не переносились.

### Что применимо к QwenDirector

- **Prompt Inspector:** наиболее ценный паттерн для локального контура — статические предупреждения без LLM-вызова и без оценки художественного качества. У QD уже есть mode-specific H3 prompt compiler, workflow boundary validation и continuity audit; следующий естественный слой — preflight сформированного shot prompt с понятными ошибками/предупреждениями до ручного approval.
- **Original → Strict rewrite:** уровни rewrite `strict / balanced / creative` полезны как UX-модель, но для QD безопасен только opt-in строгий refinement: хранить исходный prompt, показывать diff, не менять факты references/lyrics/mode/длительность и сохранять результат отдельной revision до применения. Balanced/creative могут добавить незаказанные образы и расходятся с exact-intent shot planning.
- **Relay timeline:** T8 разделяет global prompt, локальные event prompts, time ranges, frame count и report; это лучше, чем сваливать длинный монтаж в одну prompt-строку. В QD нужно делать собственный provider-neutral typed `DirectorTimelinePlan`, различать event и shot, валидировать таймкоды/24-fps grid и импортировать в уже существующие `Project → Scene → Shot` + immutable jobs. Не привязывать контракт к T8 node/socket API: у QD уже есть отдельный AIMixer v5 parser, который не является T8 Relay parser.
- **Performance cues:** связка trigger → reception → primary response → settled state применима к планам с персонажами. Вводить её условно для acting/dialogue shots и ограничивать наблюдаемыми cues; не добавлять этот каркас к пейзажам, предметке и архитектуре. Текущий Planner уже задаёт видимые entry/action/exit состояния, поэтому это развитие существующего shot IR, а не отдельный parallel director.
- **Ограниченный quality correction:** однократный retry с сохранением draft может пригодиться позже, но только для структурных ошибок, на локальном провайдере, с явным diff/approval и запретом менять lyric text, locked facts и число shots. Проверка/коррекция может добавить LLM-вызов; её нельзя трактовать как проверку физики или реального качества видео.

### Что не переносить

Не устанавливать T8 или его bundled материалы, не копировать реализацию и не включать облачные provider/API-key flows. Сам проект описывает совместимость с cloud endpoints и возможность дополнительных correction calls; это не соответствует default local-first QD. Сам README отдельно оговаривает, что текстовая проверка не подтверждает сложную семантику, физику или качество отрендеренного видео, а Prompt Relay не гарантирует hard cuts или синхронизацию губ. Поэтому T8 — источник идей по раздельным compiler/review/timeline слоям, не готовая автономная генерация и не quality oracle.

### Решение

Принять в backlog собственные QD-реализации статического Prompt Inspector и typed Relay-подобного shot-plan export/import; сохранить текущие Planner/approval/durable job границы. Не менять проектные prompts, активные workflow profiles, ComfyUI installation или пользовательский сценарий в рамках этого reference audit.

### Реализовано: локальный H3 prompt preflight (2026-11-16)
- В редакторе брифа добавлена статическая подсказка для активного H3 workflow: режим профиля, выровненная длина в кадрах/секундах, пустые поля действия/камеры, а также фактические sound/music defaults компилятора для известных multimodal режимов.
- Проверка advisory-only: не вызывает LLM, не меняет prompt, не блокирует job и отдельно сообщает, что не оценивает семантику или качество будущего видео. Неопределённый профиль не получает ложных утверждений о sound defaults.
- T8 идея применена независимо; его код и материалы не переносились. Следующие точечные кандидаты: typed timeline import/export и conditional acting cue fields после проверки текущего shot contract.
- Дополнительно применён performance-cue приём: локальный Planner предлагает цепочку `trigger → reception → primary response → settled state` только для явно актёрского/реакционного шота. Для предметки, пейзажей и архитектуры она не навязывается; cues остаются предложением модели и должны опираться на бриф и references.
- Planner Assist теперь хранит сгенерированный shot plan как временный UI-кандидат и показывает diff относительно исходных полей. Изменения применяются только явной кнопкой; устаревший кандидат после изменения полей нельзя применить, при смене project/shot он очищается. Это независимый review pattern, не перенос T8-кода.
- H3 preflight разбирает compiled preview: H3 sections, нумерацию shots, timed cuts относительно длины клипа, keyframe alignment и пределы референсных labels. Те же проверки API повторяет до durable job creation и сохраняет inspector version/report в immutable plan/hash. Для RefMod исправлена маршрутизация к Ref2VA compiler, а Ref2VA больше не дублирует начальный `[Shot 1]`; compiler Last Frame alignment автоматически указывает последний описанный shot. Это структурная проверка, не quality oracle.

### Актуализация: приоритеты после реализации T8-inspired slices (2026-11-16)

T8 остаётся только источником идей. Его `LICENSE.txt` запрещает копирование и модификацию без отдельного письменного разрешения; ни код, ни bundled skills/templates/assets не переносились. В репозитории T8 quality check — структурная оценка prompt, а не доказательство физической правдоподобности или качества видео; дополнительная correction попытка способна вызвать ещё один LLM-запрос. Эти границы следует сохранять и в собственных функциях.

| Идея | Состояние QwenDirector | Следующий полезный узкий шаг |
|---|---|---|
| Структурный H3 prompt inspection | Уже реализован в UI и повторяется API до durable job; report входит в immutable job plan/hash | Не дублировать; расширять только на воспроизводимом кейсе дефекта |
| Relay / разбивка временных событий | `qwendirector-h3-event-plan/v1`, Planner context/receipt и полная project Director Timeline реализованы; audio/lyric timing остаётся явно непроверенным | Добавить versioned JSON export/import именно в текущий Shot contract, с dry-run diff и валидацией frame grid; без новой timeline-модели |
| Причинность действия | Event plan требует видимые entry/trigger/continuity/end-state поля; Planner Assist проверяет полноту как advisory | Совместно с creative review добавить одно поле «что зритель должен понять/почувствовать к выходу из шота»; не выводить его автоматически из кадров |
| Prompt quality check + repair | Схемные ошибки блокируются; creative review ограничен continuity metadata и пользовательским рассмотрением proposal | Следующий рекомендуемый slice: расширить существующий Planner response компактным `creativeReview` (цель шота, наблюдаемое изменение, риск перегруза, reference/invariant risk). Использовать тот же локальный planner-вызов, не делать вторую модельную коррекцию; замечания не менять текст и не блокировать job |
| Однократная автоматическая коррекция | Не реализована | Пока отложить: возможны выдуманные детали, изменение lyrics/references и дополнительная стоимость/задержка. Если вернуться — только локально, opt-in, с оригиналом, diff и отдельным применением пользователем |
| Типовые acting cues | Условная trigger → reception → response → settled-state инструкция уже добавлена в local Planner | Расширять только после наблюдаемого провала на конкретном shot; не навязывать предметке и среде |

Для creative review сохранять три раздельных статуса: `observed` (есть входные данные), `review` (нужно решение человека), `unverified` (данных недостаточно). Это оценка плана по тексту/структурированным метаданным, не визуальный QC; не запускать vision-модель и не утверждать, что готовый кадр прошёл проверку. Первая версия должна быть advisory, версионированной в planner receipt и не изменять shot/job без явного применения.

## Сверка с Imagination Studio by keys+Wasserman (2026-11-16)

Проверен публичный [`drowzeys/Imagination-Studio-by-keys-Wasserman`](https://github.com/drowzeys/Imagination-Studio-by-keys-Wasserman): README, MCP contract, production guide и лицензия. Проект описывает локальный production app с Story/Production, image/video/sound, finishing/export, MCP-управлением очередью и recipe qualification. В заявленной лицензии основного репозитория — Apache-2.0; модели и bundled компоненты сохраняют собственные лицензии и ограничения. Ничего не устанавливалось и код не переносился.

| Идея reference | Что уже есть в QwenDirector | Что можно реализовать здесь |
|---|---|---|
| Один queue владеет render lifecycle; agent работает через API/MCP, не обходит очередь отдельными скриптами | Durable job/worker path, idempotency, lease/fencing, manual approval, CAS manifest | Сохранить именно этот принцип; добавить единый локальный API для `job status`, preview/review и queue plan, чтобы автономный агент мог работать без прямого DB/ComfyUI управления |
| Memory-aware admission: измеренный headroom и peak, floor, освобождение только собственных idle modules, ожидание/отказ с причиной | `/v1/runtime` отдаёт VRAM snapshot; workflow-план имеет concurrency/disk requirements, но нет проверенной peak-модели по profile | Приоритетный infra slice: записывать per-profile peak VRAM из завершённых jobs; сначала показывать advisory estimate, затем вводить opt-in admission policy с минимальным memory floor. Не вызывать глобальную очистку памяти до подтверждённого ownership и измерений |
| Recipe-based feature qualification — отдельные opt-in renders; успешный профиль не объявляется проверенным только по наличию модели | Активные профили проходят `/object_info`/boundary preflight; исторически есть реальные H3 jobs и mock E2E, но текущий live graph preflight сам по себе не доказывает render | Сделать qualification record, привязанный к workflow revision hash, runtime version, параметрам и result AssetVersion/QC; success/error остаётся доказательством только этой конкретной конфигурации |
| Beat-aware rough cut: анализ трека с confidence, выбор пригодных takes и экспорт EDL/FCPXML/пакета для Resolve | Есть 24 fps Director Timeline, H3 event timing и существующий пользовательский EDL; аудио/слова явно не считаются проверенными автоматически | Сначала provider-neutral beat-map artifact с confidence и source hash; затем draft EDL generator только из одобренных clip versions, с exact source in/out/handles. Lyric sync остаётся `UNVERIFIED` без аудио/слуховой проверки |
| Night shift: пакетное выполнение недостающих шотов после освобождения очереди | Есть durable queue, manual approvals, отмена/повтор и shot catalog | Добавить versioned BatchPlan только после memory admission и качества: конкретный набор `approved` shot snapshots, сериализованный порядок, pause/cancel и per-shot outputs. Никогда не одобрять автоматически созданные LLM-планы или новые prompts |
| Фильмовая сущность хранит сцены, shots, takes и статус выбора | QD Project/Scene/Shot, references, asset lineage и derived project timeline | Расширять через versioned film/production metadata, если появится точный рабочий сценарий; не заводить параллельный каталог и не превращать сценарную подготовку любого клипа в миграцию каталога |

### Приоритет применения

1. **Измеряемая workflow qualification** — самый маленький шаг к доказуемому real ComfyUI E2E: сохранить runtime/graph provenance и успешный output для одной явно одобренной конфигурации.
2. **Profile resource history/advisory** — накопить фактические peak memory/time metrics до введения scheduler gate; не угадывать их по одной текущей VRAM snapshot.
3. **Beat map → draft EDL** — после появления утверждённого монтажного плана и выбранных source takes; результатом сначала должен быть reviewable manifest/EDL, не финальный автосмонтированный ролик.
4. **Batch/night-shift execution** — только поверх подтверждённых планов, текущих approvals и resource policy.

Transferable design principles: очередь — единственный render owner; job outputs и editorial takes привязаны к неизменяемым AssetVersion IDs; capacity checks возвращают фактическую причину ожидания/отказа; qualification — отдельное опциональное доказательство; монтажный export остаётся draft до ручного review. Не переносить TensorFold runtime, GPU assumptions для DGX Spark/M5, launcher/update scripts или model-install flow в QwenDirector.
