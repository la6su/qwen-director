# Контракт workflow adapter v1 (проект)

Это спецификация будущего TypeScript-контракта, не готовый SDK. Реализация разместится в `packages/contracts` и `packages/workflow-adapters`. JSON Schema проверяет входы/выходы; неизвестный major отклоняется, minor допускает только согласованные добавления.

## Переносимый вход

```ts
type AssetRef = { assetVersionId: string; sha256: string; role: string };
type GenerationSpec = {
  schemaVersion: '1.0';
  shotId: string;
  promptRevisionId: string;
  modality: 'text' | 'image' | 'video' | 'audio' | 'previs';
  inputs: AssetRef[];
  intent: { prompt: string; negativePrompt?: string };
  output: { mimeType: string; width?: number; height?: number;
    durationSeconds?: number; fps?: number };
  seed?: number;
  adapterOptions: Record<string, unknown>; // namespaced, валидирует адаптер
};
```

GenerationSpec не содержит IP, device ordinal или локальных путей. ExecutionPlan отдельно фиксирует adapter ID/version, workflow ID/digest, model IDs/digests, requirements (VRAM/disk/concurrency), resolved parameters, retry budget, output limits и hash GenerationSpec. Node выбирается по совместимости. Любое изменение содержательных параметров меняет plan hash и требует approval.

## Интерфейс исполнителя

| Метод | Поведение |
|---|---|
| `describe()` | Версии контракта, modalities, options schema, support cancel/lookup |
| `probe(context)` | Локальные capabilities, модели/digests, backend version и health |
| `validate(spec)` | Проверка входов и совместимости без генерации |
| `plan(spec, capabilities)` | Полный execution plan и оценка ресурсов; неопределённости явно |
| `prepare(plan, context)` | Проверка файлов/hash, backend и ресурсов; без submit/скачиваний |
| `submit(plan, attemptKey)` | Запуск, durable receipt с externalRunId/correlation key |
| `lookup(attemptKey, receipt?)` | Найти существующий запуск или вернуть unknown/absent |
| `poll(receipt)` | queued/running/succeeded/failed/cancelled/unknown и progress |
| `cancel(receipt)` | requested/confirmed/unsupported; не обещает мгновенную остановку |
| `collect(receipt)` | Output manifest, локальные staging-файлы и provenance |
| `cleanup(receipt)` | Только временные файлы этой попытки по политике retention |

Context даёт scoped asset reader, staging writer, logger, abort signal и ссылки на секреты. Адаптер не изменяет Job/Approval/Asset напрямую. API принимает результаты после проверки fencing. Abort signal останавливает локальное ожидание, но не доказывает отмену backend job.

## Envelope и результат

Каждая команда worker содержит `protocolVersion`, `jobId`, `attemptId`, `attemptKey`, `fencingToken`, `planHash`, `leaseExpiresAt`. Heartbeat включает sequence number; progress может повторяться и не определяет окончательный статус.

Output manifest: `schemaVersion`, job/attempt IDs, plan hash, список `{logicalName, mimeType, byteSize, sha256, stagingHandle}`, фактические параметры и provenance. Staging handles не разрешают произвольный доступ к файловой системе. API проверяет ownership, hash, размер, ожидаемый media type и лимиты; commit создаёт immutable AssetVersion. Пустой или частичный вывод не считается success, если это прямо не разрешено output schema.

Provenance обязателен: input asset hashes/revision IDs, prompt revision, adapter/backend versions, model/workflow digests (или explicit unknown), requested/effective seed и параметры, external run ID, node/device, времена submit/start/end, выходные hashes. Prompt snapshot хранится локально с контролем доступа; секреты никогда не включаются.

Project-level source media — отдельные ссылки на `AssetVersion`, не shot inputs и не generation outputs. Для каталога используются роли `master_audio`, `reference`, `source_video`, `deliverable`; API проверяет согласованность MIME для master audio и source video. Проектный export включает эти ссылки и их provenance.

## Ошибки, повтор и отмена

Коды: `INVALID_INPUT`, `UNSUPPORTED`, `RESOURCE_UNAVAILABLE`, `BACKEND_UNAVAILABLE`, `OOM`, `DISK_FULL`, `TIMEOUT`, `OUTPUT_INVALID`, `CANCEL_UNSUPPORTED`, `EXECUTION_UNKNOWN`. Error envelope включает stage, retryable hint, safe message, backend run ID и диагностическую ссылку без секретов. Решение о retry принимает оркестратор.

Автоповтор допустим при подтверждённом отсутствии запуска либо подтверждённой терминальной ошибке и оставшемся approved budget; backoff и max attempts хранятся в плане. При неизвестном результате submit — lookup/reconcile, затем needs_attention, если доказательств недостаточно. Разные attempts используют разные attempt keys; повтор submit одной попытки обязан искать уже начатый run. Адаптер без backend idempotency объявляет это ограничение и не маскирует его.

## ComfyUI mapping

Workflow template хранится как версионированный JSON с digest и allowlisted custom nodes. Mapping связывает поля GenerationSpec с конкретными node inputs; эти node IDs не попадают в Shot. Prepare проверяет наличие нужных custom nodes, моделей, допустимых путей и форматов. Никаких auto-install custom nodes, downloads или произвольных HTTP URL из пользовательского workflow.

Профили workflow сохраняются как неактивные кандидаты. `POST /preflight` и `POST /test` проверяют graph/runtime без изменения active state. Отдельная активация revision сначала повторно проходит live schema/model/LoRA preflight и только затем разрешает использовать граф для новых jobs; новый профиль не становится выбором по умолчанию при сохранении.

Для MiniMax H3 Ref2VA API сохраняет director fields и скомпилированный prompt в immutable job plan snapshot. Локальная конвенция делит текст на шесть смысловых полей, назначает reference assets ограниченным ролям и отдельно передаёт soundscape и музыку; нативный H3 узел получает обычный текстовый prompt, не schema-validated объект. H3 длительность UI округляется к кадрам `17k+5` при 24 fps. Монтажные проверки остаются advisory и не меняют workflow graph или sampler параметры.

Comfy UI workflow import проверяет primitive widget types и enum values по текущему `/object_info`; graph со stale widget order отклоняется до сохранения profile. Поддержка plugin `MiniMaxH3Director` требует отдельной versioned boundary и явного remapping embedded timeline references в immutable AssetVersion inputs.

Submit сохраняет correlation key, если backend поддерживает metadata, и возвращённый prompt/run ID в локальном журнале. Точные endpoints и возможности history/interrupt проверяются по установленной версии в discovery. Для глобального interrupt нужен выделенный экземпляр; невозможность адресной отмены явно видна UI. Outputs копируются из разрешённого backend output root с защитой от traversal/symlink escape, затем загружаются в asset API.

### Локальный H3 RefMod I2V boundary

Профиль с `referenceBindings.mode = "refmod-i2v"` фиксирует API-format graph с одним `MiniMaxH3ImageToVideo`, `MiniMaxH3RefModsLoader`, `MiniMaxH3RefModApply`, `RandomNoise` и `SaveVideo`. Валидация требует два разных доступных RefMod names и связанные `LoadImage` bindings; профильный preflight сверяет их с dropdown inventory ComfyUI. Worker загружает только image AssetVersion refs, предназначенные для кадров/окружения; actor/vehicle identity задаются именами immutable RefMods из profile snapshot. `LoadImage` refs инъецируются в связанные узлы и остаются tensor links на входах `first_frame`/`last_frame`. Node IDs остаются только в graph/profile boundary, а не в Shot. Plan snapshot сохраняет graph hash, RefMod names, bindings и AssetVersion IDs; job проходит обычные approval, lease/fencing и CAS commit.

### Локальный H3 FL2VA boundary

Для прямой first/last-frame генерации используется отдельный `fl2va-i2v` boundary на `MiniMaxH3ImageToVideo`, без RefMod nodes. В API graph оба входа `first_frame` и `last_frame` должны быть подключены к разным `LoadImage`; profile сохраняет эти два node binding в этом же порядке и hash неизменённого graph. На job references обязательно передаются ровно два изображения с явными ролями `first-frame` и `last-frame`; Worker загружает оба в ComfyUI и назначает файлы в порядке ролей, не полагаясь на порядок медиатеки. Остальные аудио, видео и изображения для этого boundary запрещены.

FL2VA принимает длительность от 124 кадров на сетке `(frames - 5) % 17 === 0` при 24 fps. Prompt compiler добавляет alignment line: First Frame на `0.00 s`, Last Frame на `frames / 24` с округлением до двух знаков. Preflight сверяет API schema, обязательные nodes и доступность LoRA; Ref2VA Pika Flex LoRA запрещена на FL2VA graph, а профиль обязан содержать подходящий FL2VA model stack. Профиль не становится default и проходит обычную ручную активацию; generation job сохраняет оба AssetVersion, alignment prompt, graph hash и параметры в immutable plan, затем использует общие approval, attempt/lease/fencing, cancellation, output collection и CAS lineage.

### Локальный H3 I2VA boundary

`MiniMaxH3ImageToVideo` с единственным подключённым `first_frame → LoadImage` является I2VA; с двумя различными подключениями `first_frame` и `last_frame` — FL2VA. I2VA profile автоматически связывает ровно один loader с `first_frame`, а job требует ровно один image AssetVersion с ролью `first-frame`. FL2VA сохраняет существующий контракт ровно двух кадров с ролями `first-frame` и `last-frame` в том же порядке, что и node inputs. Оба режима отвергают отсутствующий/неверный first frame, одинаковые frame nodes и графы с несовместимыми RefMod nodes. Для I2VA и FL2VA число кадров должно быть не меньше 56 и лежать на сетке `17k+5`.

Базовые H3 режимы I2VA/FL2VA используют prompt compiler с первой строкой alignment (только для keyframe mode), затем в точном порядке `integrated_multimodal_description`, `overall_soundscape`, `non_diegetic_music`. Ref2VA остаётся отдельной шестисекционной схемой, а `compileDirectorPrompt` предназначен для нережимных workbench briefs и не используется для H3 video prompt. Компиляция не доказывает качество результата; sampler/profile revision и ручное approval остаются неизменными.

### H3 R2V двухэтапный VEDA boundary

Для `video_mmh3_r2v_2Stage-VEDA` API-граф должен содержать один `MiniMaxH3ReferenceToVideo`, два `RandomNoise`, `MMH3UltimateUpscale`, `VedaSparseAttention` и два `VHS_VideoCombine`. Boundary проверяет upstream conditioning и latent второго прохода, отдельный промежуточный output и финальный saver после `VAEDecode` от upscaler. Упорядоченные `LoadImage` refs связываются с последовательными H3 slots `ref_images.ref_image_0..N`; каждый слот должен вести ровно к одному уникальному loader. Worker обновляет prompt в `PrimitiveStringMultiline`, сохраняя `StringConcatenate` prefix; длительность задаётся через подключённый `PrimitiveFloat` и графовый aligner, resolution — через `ResolutionSelector` и его megapixel input. Изменение sampler/LoRA/attention/upscale параметров остаётся частью immutable graph revision. При заданном seed одинаковое значение применяется к обоим noise nodes; без seed сохраняются значения из графа. Collect сохраняет только финальный `VHS_VideoCombine`, не промежуточное видео. Runtime preflight требует VEDA/upscale и VHS nodes, затем проверяет LoRA inventory.

Quality metadata профиля вычисляется по фактическому `BasicScheduler.steps` (включая поддерживаемые switch/primitive links) и установленной LoRA. Несовпадение шагов и LoRA отображается как `unknown`; label LoRA сам по себе не подтверждает sampling steps. FL2VA LoRA применима только к FL2VA I2V workflow, Ref2VA — только к соответствующему Ref2V workflow.

## Приёмочные сценарии

Mock обязан детерминированно воспроизводить success, error, timeout, duplicate submit, delayed completion, lost submit response, unsupported cancellation и corrupt output. Contract tests проверяют отсутствие двойного commit, отказ stale fencing, повторяемость lookup, выход без секретов и отсутствие внешнего egress. Реальный adapter проходит тот же набор применимых сценариев плюс один утверждённый локальный smoke workflow.

Первые backend targets реализуются в `packages/workflow-adapters/src/backend.ts`: локальный `LlamaCppAdapter` (text) и `ComfyUiAdapter` (image/video/audio/previs), endpoints задаются локальной конфигурацией. Оба сначала выполняют `probe`; llama adapter читает `/v1/models`, ComfyUI adapter — `/system_stats` и устройства. `router.ts` выбирает только reachable backend с заявленной modality. Adapter не скачивает модели и отклоняет внешний `workflowUrl`.

Comfy MCP можно использовать как optional control plane для local discovery/search workflows, submit graphs и получения outputs через stdio. Cloud connection и credits не включаются в local-first baseline; durable queue, approvals, provenance, fencing и storage остаются в QwenDirector. Источник: [Comfy MCP](https://comfy.org/mcp/).

## H3 качество и длительность

UI передаёт длительность как секунды. Для обычных H3 profiles worker принимает зафиксированное число кадров; VEDA-профиль выравнивает его в последовательность `17k+5` при 24 fps (5 секунд дают 124 кадра) и связывает с graph duration input. Разрешение, seed и references являются job inputs; sampler, scheduler, LoRA, steps, VAE и codec принадлежат immutable workflow profile и не должны неявно изменяться адаптером. Quality-профили с большим числом steps активируются отдельно после проверки VRAM, а не автоматически.

## AIMixer MiniMaxH3Director timeline v5

`packages/workflow-adapters/src/minimax-director-timeline.ts` разбирает `timeline_data` AIMixer как read-only вход. Поддерживается только `version: 5`; неизвестная версия, пустой список сегментов, повторяющиеся ID, пересекающиеся диапазоны и некорректное число кадров отклоняются. Результат сохраняет исходный JSON snapshot, упорядоченные диапазоны кадров, локальные prompts, task type, continuity marker и дедуплицированный список media с областями применения.

UI предоставляет отдельный импорт файла workflow в выбранную сцену. Пользователь сопоставляет каждый `input` media с уже существующим AssetVersion; сервер проверяет UUID, наличие и MIME, после чего транзакционно создаёт `shot_import_batches`, один draft shot на сегмент и `shot_reference_assets` по scope. Исходный timeline digest и media mapping digest обеспечивают идемпотентное повторение; тот же source с другим mapping возвращает conflict. Сегменты хранят frame range, fps, canvas, global/local/negative prompts и continuity в `source_metadata`; исполняемый prompt объединяет global и local prompt. При создании обычного QD job сохранённые shot refs используются, если пользователь явно не прислал свой список.

Импорт только подготавливает и выбирает первый shot. Он не создаёт jobs, не активирует профиль и не отправляет workflow в ComfyUI; каждый job остаётся под обычным manual approval и текущей проверкой workflow profile. Video/audio references сохраняются как AssetVersion связи, однако не становятся автоматически нодами H3: необходимое workflow binding настраивается отдельно. Импорт принимает только ComfyUI workflow UI JSON с `MiniMaxH3Director` и embedded timeline v5. Файл workflow не сохраняется как исполняемый graph, а model/LoRA/sampler/runtime widgets не переносятся в QD profile.

`input` assets можно выбрать из Media Pool или импортировать прямо из файла в браузере: API проверяет лимит 100 MiB и CAS content hash, а importer проверяет MIME по виду reference. Также можно восстановить refs локальной командой `npm run import:aimixer-references` (dry-run по умолчанию; `--commit` работает, когда ComfyUI refs доступны). Пути `output`/`temp` timeline не импортируются как входные refs. Изменения схемы требуют миграции 021. Parser и исходный snapshot сохраняют исходные кадры/порядок сегментов, но пока нет редактируемого preview/reorder UI и нет worker-side исполнения AIMixer graph.

Для восстановления references есть `npm run import:aimixer-references`: по умолчанию он только скачивает refs с loopback ComfyUI, проверяет статусы/размеры и печатает результат. Режим `--commit` доступен только при наличии всех references; он передаёт их через локальный `/v1/assets/import`, требует `QWEN_IMPORT_ACTOR` и возвращает mapping SHA-256 → AssetVersion ID. `COMFYUI_URL` ограничен localhost. QwenDirector endpoint берётся из `QWEN_API_URL`, затем `QWEN_API_BASE_URL`, или по умолчанию `http://127.0.0.1:4310`; endpoint также ограничен localhost. Импортирует каждый blob отдельно с content dedupe; связывание с shot plan остаётся следующим отдельным шагом.

## ComfyUI UI-workflow conversion

`POST /v1/workflows/convert` получает `object_info` живой ComfyUI, переводит UI JSON в API graph и проверяет типы классов, входов и links до сохранения профиля. Для widget значений сначала используется `widgets_values_named`, если тип значения соответствует schema. Если named-значение имеет неверный примитивный тип, допускается fallback на одноимённый positional UI widget только когда он сам типово совместим (`STRING`, `INT`, `FLOAT`, `BOOLEAN`); значения не приводятся принудительно. Если оба варианта не проходят schema, импорт завершается ошибкой. Это покрывает некоторые сохранённые custom-node graphs, где named metadata отстаёт от реального widget array, не ослабляя итоговую schema validation.

`ComfyWorkbenchExecutor` сохраняет `outputNodeId` для каждого файла ComfyUI. Профиль хранит явное отображение saver-node ID → типизированный slot. Для одного saver разрешён default slot первого контракта; несколько saver-узлов требуют полного отображения с уникальными slots до сохранения профиля/создания job. Collector проверяет, что каждый назначенный saver действительно вернул файл, и сохраняет slot, node ID и workbench provenance в каждом descriptor до worker CAS upload. UI workflow wizard показывает выбор Actor/Scene/Prop/Layout и отдельный slot для каждого saver. Это привязка по устойчивой топологии graph, не по случайному порядку Comfy output files; batch-файлы от одного saver наследуют его slot.

## Qwen Image 2.1 image-edit workbench

Локальный `image_edit_QwenImage21.json` — ComfyUI UI workflow с одним `Image Edit (Qwen Image 2.1)` subgraph. Импортёр разворачивает definitions в API graph, сохраняя boundary links, значения виджетов и уникальные node IDs. Для image-edit profile обязательны `LoadImage`, `TextEncodeQwenImage21` и `SaveImageAdvanced`; references связываются с упорядоченными image loaders. Worker подменяет текст в активном `TextGenerate`; если encoder подключён к enhancer, связь сохраняется, иначе prompt задаётся напрямую в `TextEncodeQwenImage21`. Нельзя заменять linked input encoder строковым значением: это отключает часть исходного workflow, хотя enhancer всё ещё может выполняться отдельно. Output собирается из saver node и получает slot `image`. Это отдельный workbench kind и не меняет H3 workflow contract.

Рекомендуемый режим Qwen Image 2.1 edit — использовать latent output `TextEncodeQwenImage21` (output 2), чтобы размер sampler следовал reference после resize. При `resolution=0` encoder сохраняет исходный размер, округлённый до кратного 32; положительное значение задаёт ориентировочную площадь и меняет размер reference. `image-edit` profile preparation распознаёт только однозначный `ComfySwitchNode` с encoder output 2 на одной ветви и `EmptyLatentImage` на другой, затем записывает в candidate graph выбранную image-edit ветвь. Исходный graph не мутируется; выбранная ветвь входит в graph hash и immutable job snapshot. Неоднозначные или иные switch wiring отклоняются, автоматическая подмена width/height не выполняется. Нулевой `resolution` разрешён как штатный auto-size sentinel; положительное значение проверяется по шагу 32 согласно текущей локальной `/object_info`.

UI-only preview `ImageCompare` исключается при Comfy UI→API conversion и не становится исполняемым dependency/output. Saved input graph в `.data/comfyui-workflows/image_edit_QwenImage21.json` имел `custom_size` switch включённым, `resolution=0`, а custom latent dimensions `1659×948`; profile preparation выбирает encoder latent path, поэтому неиспользуемые custom canvas values не применяются. Candidate list включает и workbench profiles; их live schema test и activation проходят через workbench routes, а сам activation повторно проверяет runtime schema. Это подготовка workflow semantics, не доказательство качества картинки; перед первым job нужны корректные роли входных AssetVersion и обычное manual approval.

Для Qwen Image edit reference-порядок значим: первый `LoadImage` задаёт базовую композицию и output aspect; последующие референсы должны использоваться по назначенной роли. `compileQwenImageEditPrompt` добавляет роль `actor`/`set`/`prop`/`layout` и разрешает переносить явно запрошенную пространственную раскладку; запреты на сохранение исходной композиции, ракурса или света добавляются только когда соответствующее поле не переопределено режиссёром. Это важно для задач вроде `photo-room.jpeg` (база-комната) + `photo-monitors.jpeg` (layout рабочего стола) или обратной расстановки, когда точный стол должен стать основной композицией.

Диагностика шума Qwen Image на AI Everywhere: два дубля с одинаковыми prompt/seed/settings, включая повтор с `--disable-pinned-memory`, дали идентичные пиксели; OOM не было. При переключении только `TextEncodeQwenImage21.resolution` с `0` на `1024` выход стал чистым на эффективной сетке `1376×768`. На данном исходнике это изолирует чувствительность к эффективной сетке/reference token budget; не считать результат универсальным правилом для всех изображений. Для новых кадров сохранять исходный image-edit граф, использовать `resolution=1024` с reference latent и проверять реальную выходную геометрию. Нельзя обвинять кратность 32 как таковую: входы уже были кратны 32.

Локальный текстовый рендер на Qwen Image 2.1 использует отдельный `image-generate` workbench: `UNETLoader`, Qwen CLIP/VAE, `QwenImage21Cache`, `TextEncodeQwenImage21`, `EmptyLatentImage`, sampler и `SaveImageAdvanced`. Этот путь не использует `QwenImageTextToImageApi` и внешние провайдеры. Для всех non-H3 workbench-типов кроме `image-edit` сохраняется обычный director prompt; запрещено применять к ним H3 Ref2VA-разметку (`subject_definitions`, `retention_analysis` и другие поля). `image-edit` использует отдельный Qwen edit compiler. Граф, seed и prompt входят в immutable job snapshot; результат остаётся в обычном approval/lease/CAS lifecycle.

Для нового героя AI Everywhere используется отдельная генерация Qwen Image, не существующий `character_01`. Утилита `H3RefModCreateFromFolder` сохраняет RefMod как побочный файловый результат в `models/refmods/<subfolder>` и может дать уникальное имя при совпадении. Это не ComfyUI output (`images`/`videos`), поэтому текущий worker collector автоматически не импортирует `.safetensors`. После проверки шести ракурсов RefMod нужно импортировать через локальный `/v1/assets/import` с SHA-256 и lineage от исходного кадра/ракурсов, затем связать с проектом; имя и фактический путь сохранённого файла следует читать из результата/лога узла, а не угадывать по запрошенному имени.

Subgraph importer ограничивает глубину восемью уровнями и должен завершать импорт ошибкой при некорректной топологии. Реальная проверка доступных классов/inputs требует ComfyUI `/object_info`. UI сохраняет импортированный graph как неактивный candidate и может включить его в durable image-edit job через immutable graph snapshot; job остаётся под обычным ручным approval. Runtime preflight и фактическое generation следует подтвердить на работающем ComfyUI/worker.
# Prompt routing for workbenches

`image-generate` treats the Director form's `prompt` field as the complete positive image prompt. Camera, action, composition, lighting, sound, and transition remain immutable shot metadata and must not be appended to that prompt by the worker. If the job has no Director prompt, the worker preserves the prompt already stored in the workflow graph. `image-edit` continues to use its compiled edit instructions and reference roles.
