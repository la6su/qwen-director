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
| Director agent | Разговорный Harness/LLM agent планирует shots, рассматривает references, пишет prompt и вызывает инструменты | Есть deterministic `/v1/planner/plan` scaffold и Planner Assist; нет conversational LLM tool loop и persisted agent conversation |
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
