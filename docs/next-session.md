# Рабочее состояние — 2026-10-10

## Проверка качества MiniMax H3 SCENE-02 (2026-10-10)

- Ответ по форматам: текущий diffusion UNet — `minimax_h3_fl2va_pruned_int8_convrot.safetensors` (INT8 ConvRot). `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` — NVFP4/AWQ текстовый энкодер Qwen3VL, не diffusion-модель. В профиле видео VAE `minimax_h3_video_vae_int8_convrot.safetensors`; Turbo LoRA — BF16 `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors`.
- Закрыт ранее утверждённый A/B на том же seed `7180218`, prompt и кадрах: 16 шагов без LoRA и Turbo LoRA на 8 шагах. Jobs `fdaaf0d7-dae6-40d9-be2a-2626805e29fa` и `0594ab94-c81f-4f9d-b51c-83335d7ef972` обе `succeeded`; outputs `9b3309f4-6c69-4df4-89f3-fe009db789ed` и `6b4552a5-1e26-40eb-a914-3e4480325f1c`. Формат обоих: 832×480, 24 fps, 124 кадра (~5.167 с). Визуально разница мала: Turbo8 не устранил наблюдаемые проблемы; значит сравнение не указывает на LoRA как первопричину.
- Уточнение после просмотра Comfy-Org native UI template: `res_multistep` + `simple` применяется и в готовом ComfyUI H3 I2V workflow; workflow имеет native base 20-step mode и Turbo 8-step toggle. Значит предыдущий H3 A/B sampler не был заведомо неправильным для native ComfyUI path. LightX2V — отдельный валидный рецепт (Euler + shifts 12/3 для 544p FL2VA Turbo8, 6/3 для его отдельной 768p Turbo LoRA), но это не единственный эталон. Качество-причину искать контролируемо: сравнивать native ComfyUI mode с SatoDive `er_sde`, отдельно от шага/силы LoRA. Не объявлять отсутствие SigmaShift в native графе ошибкой.
- Текущий промпт графа не использует обязательный для FL2VA шаблон привязки Picture 1 в 0.00 и Picture 2 в 5.17, не описывает пошаговый путь непрерывного кадра по отдельным состояниям; он одновременно просит героя подойти, открыть дверь, сесть и завести машину. Загруженные парковочные refs различаются масштабом/ракурсом, что создаёт резкий сдвиг композиции к конечному ключевому кадру. Источники дневные; цветовой текст согласован с ними в последнем A/B.
- Официальные рецепты для сверки: [Comfy-Org H3 I2V](https://github.com/Comfy-Org/docs/blob/main/tutorials/video/minimax/minimax-h3-native.mdx), [LightX2V готовый I2V workflow](https://github.com/ModelTC/Minimax-H3-Turbo/blob/main/example_workflows/video_minimax_h3_i2v_lightx2v_turbo.json), [LightX2V инструкции ComfyUI](https://github.com/ModelTC/Minimax-H3-Turbo/blob/main/COMFYUI_SETUP_AND_INFERENCE.md), [официальный H3 video prompt guide](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md). Вывод: NVFP4 text encoder пока не обвинять — UNet INT8 и соответствующая Turbo LoRA совпадают с официальным стэком. Сначала подготовить отдельную revision с официальными Euler/SigmaShift параметрами и корректным FL2VA prompt, проверить canvas/reference alignment, затем показать plan. Новую GPU job не запускать без отдельного подтверждения оператора и проверки свободной VRAM; OMP/Qwen imageView на GPU не запускать.
- Проверены локальные `.data/comfyui-workflows/ComfyUI-H3 IMG Gen Workflow.json` и `ComfyUI-H3 IMG Gen WORK.json`; live PVE `/object_info/SatoDiveH3Image` подтвердил, что custom node SatoDive установлен. Сохранённый Image Gen graph использует community `minimax_h3_hybrid_fl2va_ref2va_b20-49-int8.safetensors`, Qwen3VL NVFP4/AWQ, video VAE FP16, FL2V Turbo8 LoRA strength 0.6, 34 steps, `er_sde`, `simple`, `ref_image_size=max`; detail model фактически `None`. Workflow Note утверждает 18 steps и описывает detail model, поэтому доверять нужно реальным widget values, а не note. Размеры этого still graph также нестандартны: один JSON задаёт custom 3600×1400 при aspect setting 16:9 (не используется в Custom size), второй 4096×3072; не переносить их в widescreen видео. B20-49 — экспериментальная community merge-модель с более сильной Ref2VA составляющей и несколько более низким raw visual/audio fidelity против b25/b30; не официальный base checkpoint. SatoDive node делает H3 still image через специализированный single-frame latent/decode path, поэтому его sampler/LoRA/steps являются гипотезой для видео, а не video preset. Его README для обычного 8-step Turbo LoRA советует около 20 шагов, strength default 0.38; локальный graph (34/.6) сам по себе не подтверждает ни эти значения, ни качество на полном видеолатенте. Перед любым video тестом подготовить отдельную profile revision и изолировать sampler, steps, LoRA strength; не менять UNet и разрешение в том же сравнении.

Предыдущие заметки о планируемом A/B и выборе FL2VA LoRA заменены итогами и точной сверкой активного графа в разделе выше. Не считать старое 16-step или Turbo8 сравнение проверкой официального sampler recipe: оба прошли через наш прежний `res_multistep` граф без SigmaShift.

- Checkout находится в `/home/la6/Work/QwenDirector`; `npm ci` установлен из lockfile (113 packages). Ранее прошли `npm run typecheck` и `npm run build:web`; npm сообщил о 3 уязвимостях (2 moderate, 1 high). Не выводить секреты из `.env`.
- Локальный PostgreSQL 18 запущен контейнером `qwendirector-postgres-1`, loopback port `54329`, постоянный Docker volume. База восстановлена из `.data/backups/post-recovery-20260910`; CAS-файлы находятся в `.data/assets/cas`. Восстановлено: 8 старых проектов, 9 jobs, 16 asset_versions; 19 миграций применены. `QWEN_STORAGE=postgres`, `QWEN_ASSET_ROOT=./.data/assets`.
- API работает на `127.0.0.1:4310`, Vite на `0.0.0.0:5173`; `/ready` ранее вернул ready для ComfyUI (`http://192.168.10.165:8188`), llama.cpp (`127.0.0.1:8081`) и PostgreSQL. Worker зарегистрирован online; при последней проверке jobs в очереди не было. Если процессы остановились после завершения сессии, проверить `ss`/`docker compose ... ps` и запустить вручную.
- llama.cpp запущен вручную через `CUDA_VISIBLE_DEVICES=1` на RTX 4060 Ti, модель `/home/la6/models/Qwen3.8-27B-GSQ-RCO-IQ3_XXS.gguf`, context 4096. **Не добавлять Qwen в автозапуск** — это прямое требование пользователя.
- Пользователь зафиксировал основной вариант: чёрный 718 Spyder RS с карбоновыми деталями; постоянный герой уже подготовлен через RefMod, для проб использовать `character_01_refMod` (лист из `!CHARACTER!/Реалистичный референсный лист персонажа.png`, AssetVersion `b40cbeb3-28a4-4f81-8217-9f7a928685d3`). В `!718-Spyder!/!NEW!/` находятся уличные парковочные кадры чёрного RS среди деревьев; использовать их как окружение SCENE-02, не как источник vehicle identity. В ComfyUI создан и появился в `MiniMaxH3RefModsLoader` RefMod `QwenDirector/718-Spider-RS/porsche_718_spyder_rs_black_carbon` из 6 студийных ракурсов 4:3; Comfy prompt ID `36d40227-466f-426b-aeb7-92698df37cfd`. Источники и provenance — `.data/porsche-718-reference-map.json`. Ограничение: активный QwenDirector quality workflow пока принимает две обычные картинки через `MiniMaxH3ReferenceToVideo`; он не подключает RefMods. Сам RefMod создан напрямую в ComfyUI, поэтому ещё не имеет job/AssetVersion provenance в каталоге QwenDirector. Для использования обоих RefMods в tracked generation нужно добавить совместимый RefMods workflow/profile path и затем запускать test shot через очередь QwenDirector.
- Проект переименован пользователем в `Porsche 718 Spider RS` (`754346e8-60db-44db-b918-7179dd4e3499`); для описания автомобиля в промптах использовать официальное написание `Porsche 718 Spyder RS`. Каталог приведён к восьми сценам по REFS: `SCENE-01 · Underground Intro — «Потом»` (старый scene ID `9e096f3a-aa38-42f0-aead-74574d0c660b`) и семь новых сцен 02–08. В сцене 01 пока три старых общих shot-заглушки по 5с без утверждённых prompt/references. Все 313 путей из `/home/la6/Work/718-Spider-RS/REFS` сведены по SHA-256 к 290 уникальным ассетам в `.data/porsche-718-reference-map.json`; каталог содержит 306 assets всего (16 прежних + 290 импортированных), повторные файлы не копировались. Сцены/кадры ещё не привязаны к конкретным AssetVersion в job snapshots; jobs=0, генерация не запускалась. Режиссёрская карта и производственные ограничения: [docs/director-treatment-718-spyder-rs.md](director-treatment-718-spyder-rs.md).
- Очистка старых тестовых данных завершена после custom-format backup `.data/backups/pre-cleanup-20261010/qwendirector.dump` (список архива читается `pg_restore -l`). Транзакционно удалены только 8 старых проектов `QwenDirector Live R2V`/`H3 Quality A/B`, их scenes/shots и 9 jobs с attempts/manifests/link rows. Остался проект Porsche 718; после импорта REFS в БД 306 asset_versions, 0 jobs и 3 workflow_profiles. CAS, все asset rows и MP4 `ed88cd1a-4ee0-41a2-812a-4c969566b389` сохранены.
- 11 сохранённых workflow скопированы из ComfyUI в `.data/comfyui-workflows/` (папка содержит локальные данные, добавлена в `.gitignore`). Это исходные UI-format JSON и локальный mirror, а не импортированные/активированные профили QwenDirector. MCP notes подтверждают MiniMax H3 I2V/R2V и метаданные моделей; среди файлов также есть H3 image gen, Qwen Image 2.1 edit, SeedVR2 upscale и RefMod utility. Несколько графов содержат custom/subgraph UUID node types; перед импортом нужен API-format export и отдельная проверка реальных классов/моделей.
- ComfyUI `/api/userdata?dir=workflows/&recurse=true` показывает 11 сохранённых workflows. Полученный файл `video_mmh3_i2v_PDD_8_fixed.json` имеет UI-format (`nodes[]`), тогда как `/prompt` и проектный H3 profile API ожидают API-format graph. Автоматически импортировать UI JSON в профиль нельзя без UI-export `Save (API format)` или отдельного корректного конвертера. В проекте уже есть 3 активных H3 профиля. Live check 2026-10-10: `/ready` и `/v1/runtime` подтверждают ComfyUI, llama.cpp, storage и H3. Без побочного эффекта проверен `POST /v1/workflow-profiles/h3-ref2v-quality-8step-local/test`: HTTP 200, `quality-8step`, missingLoras=[], Ref2VA Acc 8Step LoRA и требуемые классы доступны. `h3-ref2v-draft-4step-local` и `video-minimax-h3-r2v` через `/test` вернули 409 из-за отсутствующей Turbo LoRA `minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors`. Не вызывался `/preflight`, т.к. route активирует профиль. Все три профиля уже числятся active в каталоге; два из них runtime не проходят. Не запускать draft/R2V профили до установки/замены LoRA и повторного `/test`; ничего не скачивать автоматически. Quality 8-step прошёл boundary/model preflight, но для реального job всё ещё нужны подтверждённые Porsche image references и отдельное approval.
- ComfyUI лог показывает asset seeder full scan 125 путей примерно за 70 мс (`created=0`, `skipped=125`, ошибок нет). Это лёгкая файловая индексация, не генерация; причина повторного запуска (таймер/watcher/restart) ещё не выяснена.
- ComfyUI MCP подключён в Codex как `comfy` через stdio: отдельная среда `/home/la6/.venvs/qwen-director` содержит `comfy-mcp 0.10.0`, `comfy-cli 1.22.0`, `mcp 2.3.0`; `COMFYUI_URL=http://192.168.10.165:8188`. Codex allowlist ограничен read-only `server_info`, `discover`, `list_workflow_slots`, `list_workflow_notes`, для вызовов оставлен режим prompt. `codex mcp get comfy` и прямой MCP initialize/list_tools/server_info прошли. Текущая Codex-сессия не подхватила новый namespace: после перезапуска Codex/новой сессии инструменты должны появиться. У MCP `server_info` отражает также локальный comfy-cli workspace и не является проверкой здоровья удалённого PVE; remote HTTP endpoint ранее проверен отдельно. `list_workflow_slots` на части UI workflow в comfy-cli 1.22.0 возвращает некорректный JSON envelope — диагностика записана, исходные workflow не менялись.
- Сверка Director-Studio обновлена на 2026-10-10: upstream README/architecture описывают conversation agent + Harness, Actor/Scene/Prop/Layout workflows, custom H3 boundary wizard, Ref2AV/continuation и local/API providers. В QwenDirector есть durable H3 foundation, H3 profile wizard, typed workbench UI/contracts и deterministic planner scaffold; разговорный LLM agent и реальные generic workbench graphs остаются gap. GitHub main SHA не был зафиксирован; у repo не найден LICENSE-файл, код/графы upstream не копировались. См. `docs/reference-parity.md` для приоритетного пути: golden H3 shot → bounded local agent → approved batch → continuity/edit/export → специализированные workbenches.
- `GET /v1/projects/:id` включает пустые сцены: исправлен timeline SQL (`LEFT JOIN shots`). Readback проекта Porsche 718 подтвердил восемь сцен, три старых shot-заглушки в первой сцене, пустой список jobs; генерация не запускалась. `/ready` ранее вернул HTTP 200.
- Следующие действия: (1) добавить в QwenDirector исполняемый H3 RefMods workflow/profile path с provenance; (2) привязать автомобильный RefMod, `character_01_refMod` и парковочные scene refs к одному tracked test shot сцены 02; (3) выполнить один короткий тест через QwenDirector approval/worker/asset lifecycle и оценить идентичность чёрного RS, карбон, героя и операторское движение; (4) после приёмки собрать остальные keyframes по мудбордам. Утверждённые исходные установки: чёрный RS с карбоном, существующий герой RefMod, `!NEW!` как парковочное окружение. Автозапуск Qwen не настраивать.

# Старт следующей сессии

## Проверенный checkpoint: PostgreSQL job lifecycle

Последний проход добавил immutable execution evidence: PostgreSQL commit сохраняет JSON manifest и SHA-256 его канонического представления в `attempt_manifests` в одной транзакции с fencing-проверкой и переводом job в `succeeded`. API отдаёт его через `GET /v1/attempts/:attemptId/manifest`. Миграция `005_attempt_manifests.sql` применена к локальной БД `qwendirector`. Это ещё не AssetVersion: байты не прошли staging/CAS, поэтому их нельзя честно объявлять сохранёнными assets.

Проверено: `npx tsc --noEmit`, `npm run smoke:api`, `npm run smoke:repository`, `node --import tsx scripts/smoke_pg_api.mjs`. Последний тест создаёт собственные fixtures в PostgreSQL, проверяет API create/replay/conflict/approve, repository claim и API heartbeat/commit, затем удаляет только fixtures. Запущенный ранее сервер автоматически не перезапускался.

Остаётся: заменить временную preHandler-маршрутизацию единым типизированным service layer, реализовать staging upload → hash validation → atomic CAS promotion → AssetVersion и связывать его с manifest, проверить lease expiry/cancel race и связать worker executor с adapters. Worker пока не выполняет реальные генерации автоматически; полный production workflow ещё не готов.

## Контекст

QwenDirector — local-first AI-video studio для justlovejazz. ComfyUI в PVE `pct 103` отвечает на `http://192.168.10.103:8188/` и использует RTX 5090 (33.67 GB VRAM). Qwen launcher `/home/la6/bin/qwen35-worker.sh` использует llama.cpp build `9744 (063d9c156)` и GGUF Qwen3.5-9B на `:8081`; `/health` и `/v1/models` подтверждены. Workstation: RTX 4060 Ti 16 GB, NVIDIA `595.91.07`.

Подготовлены русские документы и пустой npm workspace. Рекомендация: собственное ядро; Director Studio — источник идей и потенциальных адаптеров после локального аудита лицензии/commit. Backend: Node.js LTS/Fastify, PostgreSQL queue/state, filesystem blobs, отдельный TS worker; Vue 3/Vite; TresJS позже. Зависимостей и lockfile нет, приложения не запускаются. Ничего не скачано и не опубликовано.

## Первые действия

1. Прочитать [AGENTS](../AGENTS.md), [ADR](decision-records/ADR-001-architecture.md), [architecture](architecture.md), [adapter contract](workflow-adapter-contract.md).
2. Выполнить локальную проверку ниже. Последняя проверка записана в [локальном инвентаре](lab-inventory.local.md): Node.js/npm есть, Docker/psql/Ollama недоступны, GPU-драйвер из этой среды не отвечает.
3. Выполнить доступную read-only часть [аудита](operations.md); записать факты и неизвестные значения в новый `docs/lab-inventory.local.md` (он игнорируется git). Не сканировать сеть и не менять узлы.
4. После разрешённого запуска Qwen проверить `curl http://127.0.0.1:8081/health` и `/v1/models`; ComfyUI `/system_stats` уже проверен. Зафиксировать два execution targets: remote ComfyUI/RTX 5090 и local llama.cpp/Qwen.
5. Проверить доступные локальные версии Node.js/npm и библиотек, зафиксировать выбранные версии. Перед любой установкой соблюдать текущую задачу и сетевые ограничения; каркас не даёт разрешения скачивать зависимости.
6. Первый кодовый срез добавлен: contracts/domain/mock adapter; также подготовлены `packages/storage/migrations/001_init.sql` и `apps/api/src/http-contract.ts`. Следом расширить state transitions и runtime tests duplicate submit, stale result, cancel race и unknown execution. Затем реализовать repository/transactions PostgreSQL и один API vertical slice, затем UI. При необходимости установки сначала подготовить точный список пакетов.
7. Нативные systemd-шаблоны добавлены в `deploy/systemd`; SQL-скелет claim — `packages/storage/migrations/002_queue_claim.sql`. Они не установлены и не активированы.
8. Интеграционный слой обновлён: adapters probe реальные `/health`, `/v1/models`, `/system_stats`; `router.ts` выбирает backend по доступности и modality. Runtime TypeScript ещё не собран — зависимостей и tsconfig нет.
9. Добавлен dependency-free probe `node scripts/probe_backends.mjs`; он проверяет текущие endpoint и печатает capability snapshot.
10. Добавлен API smoke `npm run smoke:api`: create → idempotent replay → conflict → approve → cancel. Repository пока in-memory, PostgreSQL schema остаётся следующим production шагом.
11. Добавлен `apps/api/src/pg-repository.ts`: транзакционный claim и fencing-aware heartbeat/commit. Подключение к API и integration smoke требуют доступного PostgreSQL и остаются следующим проверяемым шагом.
12. Добавлен `storage-factory.ts`: `QWEN_STORAGE=memory|postgres`; PostgreSQL требует `DATABASE_URL`, default остаётся memory.
13. PostgreSQL smoke успешно проверил `claim → heartbeat → commit`; добавлен worker boundary `apps/worker/src/loop.ts`, который общается только с API.
14. `/v1/worker/claim` подключён к `PgAttemptRepository.claimNext` при `QWEN_STORAGE=postgres`; memory fallback сохранён. Smoke API и PostgreSQL проходят.
15. `apps/worker/src/loop.ts` получил long-running polling `run(signal)` с graceful stop; adapter execution callback и heartbeat/commit orchestration остаются следующим кодовым шагом.
16. Добавлен `PgNodeRepository` и API `/v1/nodes/register`, `/v1/nodes/:id/heartbeat`; integration smoke на временном node прошёл, запись удалена.
17. Добавлена миграция `003_capabilities.sql`; PostgreSQL claim теперь требует online node и проверяет `nodes.capabilities @> jobs.required_capabilities`.
18. Добавлен `requiredCapabilities(GenerationSpec)` в `packages/contracts/src/requirements.ts` для вычисления требований job из model-independent spec.
19. `PgJobRepository.create` сохраняет `requiredCapabilities` в JSONB `jobs.required_capabilities`; PostgreSQL claim фильтрует по ним.
20. Добавлен `apps/worker/src/executor.ts`: общий pipeline `prepare → submit → poll → collect → commit` с heartbeat и fail hook, без привязки к backend.
21. Добавлены concrete executors `LlamaCompletionExecutor` и `ComfyPromptExecutor`; реальный submit не выполнялся, пока workflow не будет явно утверждён.
22. Добавлен `smoke:executors`: fetch-mocked contract test проверяет llama completion payload, ComfyUI prompt_id и history success.
23. Реальный локальный Qwen completion smoke прошёл: HTTP 200, формат `choices[0].text`, ~303 ms для короткого запроса. ComfyUI generation не запускалась без утверждённого workflow.
24. Добавлены model-independent Design JSON (`packages/contracts/src/design.ts`) и importer с сохранением unknown fields; `npm run smoke:design` проверяет порядок shots и валидацию.
25. Добавлен optional `ComfyMcpClient` boundary и disabled-by-default config; локальный `comfy-mcp` на workstation пока не установлен.
26. Рекомендуемое Python-окружение для MCP и тонких адаптеров называется `qwen-director`: `~/.venvs/qwen-director`, создаётся через доступный `uv 0.11.22`. Установка пакетов в него выполняется отдельно от npm workspace.
27. `comfy-mcp 0.10.0` установлен; для удалённого ComfyUI передавать процессу `COMFYUI_URL=http://192.168.10.103:8188`. Ручной запуск без MCP-клиента ожидаемо ждёт stdio initialize.
28. В окружение `~/.venvs/qwen-director` установлен `comfy-cli 1.20.0`; создан каталог `~/.config/comfy-cli`. CLI read-only видит локальную RTX 4060 Ti (16 ГБ). MCP namespace загружается в Codex, но вызовы `server_info`/`nodes` пока возвращают внутреннюю ошибку; основной адаптер ComfyUI продолжает работать через HTTP API.
29. Worker самостоятельно регистрирует узел при старте и отправляет heartbeat каждые 15 секунд; `QWEN_NODE_ID=local` нормализуется в UUID локального узла.
30. Heartbeat worker повторно регистрирует узел при ответах API `404/409`, поэтому перезапуск API не требует ручного вмешательства.
31. Добавлен `HttpExecutionHooks` для heartbeat/commit через API с fencing token. Для безопасного подключения executor очередь должна начать возвращать `adapterId` и immutable параметры плана; до этого worker оставляет executor необязательным.
32. Миграция `004_execution_plan.sql` добавляет в jobs `adapter_id` и `plan_json`; claim теперь возвращает их worker вместе с `requiredCapabilities`. Миграция применена к локальной БД `qwendirector`.
33. Worker выбирает `llama.cpp` или `comfyui` executor по `adapterId`, выполняет lifecycle через `HttpExecutionHooks` и отклоняет неизвестные adapterId. Контрактные smoke-тесты проходят.
34. После запуска `qwen35-worker.sh` локальный Qwen снова доступен: health/models HTTP 200, модель `qwen3.5-9b-defiant-mtp-q5km`; реальный completion `QWEN_DIRECTOR_OK` прошёл.
35. End-to-end wiring завершён: job plan содержит `adapterId` и `plan.prompt`, claim передаёт plan worker, llama executor отправляет этот prompt в Qwen, а HttpExecutionHooks передаёт manifest в commit. Расширенный PostgreSQL smoke проверяет adapter, prompt и manifest.
36. Выполнена сверка с Director Studio на публичном `main` commit `d7d747282c75d3e1180a394665c9b405829f56e4`; лицензия MIT, чужой код не переносился. В `docs/reference-director.md` добавлена матрица соответствия.
37. Добавлена миграция `005_attempt_manifests.sql`: результат attempt хранится как immutable JSON evidence с hash. `npm run smoke:postgres` и `node --import tsx scripts/smoke_pg_api.mjs` подтверждают сохранение и чтение manifest.
38. Реализован `FilesystemAssetStorage`: staging-ключи, запись байтов, SHA-256 validation и atomic CAS promotion в `cas/<prefix>/<sha256>`. Абсолютные пути наружу не выдаются; `npm run smoke:storage` подтверждает успешный и ошибочный сценарии. API upload и создание `AssetVersion` остаются следующим шагом.
39. Добавлен `POST /v1/attempts/:attemptId/assets`: upload принимает fencing token, выполняет staging/CAS promotion и транзакционно создаёт `asset_versions` + `attempt_assets`. Миграция `006_attempt_assets.sql` применена к `qwendirector`; `npm run smoke:asset-upload` проверяет успешный upload, сохранение AssetVersion и отказ stale token.
40. Commit теперь сохраняет manifest как execution evidence; добавлен `GET /v1/projects/:projectId/timeline` с shots и Media Pool-ассетами. Vue-экран показывает этот read-model после создания job. Полное обогащение manifest outputs `assetVersionId` и группировка нескольких shots в одной сцене остаются UI/read-model refinement.
41. Timeline read-model теперь иерархический (`scenes[] → shots[] → assets[]`), а commit обогащает `manifest.outputs` полем `assetVersionId` по `logicalName`. `smoke:asset-upload` проверяет эту связку.
42. Добавлен model-independent `compileDirectorPrompt`: поля camera/action/composition/lighting/sound/transition компилируются детерминированно и сохраняются в plan JSON при `POST /v1/director/jobs`. `npm run smoke:prompt` подтверждает порядок и отказ пустого ввода.
43. `POST /v1/director/jobs` теперь вычисляет SHA-256 plan/request hash из фактического compiled plan и director fields; approval привязан к содержимому, а не к случайному идентификатору shot. `npm run smoke:plan-hash` подтверждает инвалидацию при изменении ввода.
44. Worker Llama executor теперь сохраняет текст completion в output descriptor, а `HttpExecutionHooks.commit` автоматически загружает такие outputs через asset API, вычисляет SHA-256 локально и отправляет в commit только безопасный descriptor с `assetVersionId`. Контрактные smoke-тесты проходят; реальный E2E worker upload ещё требует запуска API+worker и разрешённого локального job.
45. Добавлен интеграционный `smoke:worker-e2e`: настоящий Fastify API + PostgreSQL attempt + `HttpExecutionHooks` проходят `execute → HTTP upload → CAS → AssetVersion → enriched manifest`. Реальный llama.cpp backend по-прежнему не запускается автоматически.
46. ComfyUI executor теперь после успешного `history` скачивает реальные outputs через `/view`, формирует output descriptors для CAS (image/video/audio) и сохраняет `externalRunId`. `npm run smoke:comfy-collect` проверяет H3-видеофайл; запуск генерации на PVE требует утверждённого workflow snapshot.
47. Референс обновлён на `ai2764/Director-Studio` (`aa4ac92…`); LICENSE в checkout не обнаружен, код не переносится. Добавлен model-independent валидатор H3 workflow: ровно один `MiniMaxH3ReferenceToVideo`, `RandomNoise`, `SaveVideo`, с отказом I2V/ref-frame boundary. `npm run smoke:h3-workflow` проходит.
48. Добавлены H3 workflow profiles: immutable graph snapshot с `graphHash`, boundary discovery и deterministic injection prompt/width/height/length/seed/filename prefix. `npm run smoke:h3-profile` подтверждает snapshot не мутируется и invalid inputs отклоняются.
49. ComfyUI adapter перед submit валидирует snapshot boundary и выполняет PVE preflight через `/object_info`, требуя `MiniMaxH3ReferenceToVideo`, `RandomNoise` и `SaveVideo`. `npm run smoke:h3-preflight` проверяет успешный и missing-node сценарии.
50. `POST /v1/director/jobs` для `adapterId=comfyui` теперь требует H3 workflow graph, создаёт immutable profile (`graphHash` + boundary) и сохраняет его в `plan_json`; невалидный или отсутствующий graph отклоняется до approval. `npm run smoke:workflow-job-plan` проходит.
51. Worker ComfyUI path теперь использует `workflowProfile.graph` из claimed immutable plan, инжектирует compiled prompt, width/height/length/seed и output prefix через `injectH3Inputs`, затем отправляет этот snapshot в PVE. `npm run smoke:worker-h3-injection` подтверждает отсутствие мутации профиля.
52. Добавлен `uploadComfyReference` для image/audio через ComfyUI `/upload/image` с безопасным filename validation и нормализацией `{name,subfolder,type}`. `npm run smoke:comfy-upload` проходит; привязка uploaded media к конкретным H3 LoadImage/LoadAudio boundary nodes остаётся profile metadata шагом.
53. H3 profile получил явные `referenceBindings.imageNodeIds/audioNodeIds`; `injectH3Inputs` подставляет результаты upload в LoadImage/LoadAudio nodes по порядку и отклоняет переполнение/невалидные bindings. `npm run smoke:h3-references` проходит.
54. Worker ComfyUI path подключает `plan.references`: каждый immutable reference загружается в PVE через `/upload/image`, затем его `{name,subfolder,type}` инжектируется в H3 bindings перед submit. Большие references пока не должны передаваться inline в plan; следующий шаг — API asset download по `assetVersionId`.
55. Добавлен `GET /v1/assets/:assetVersionId` для чтения bytes из локального CAS с `content-type`, `content-length` и `x-content-sha256`. Director job sanitizes references до `{assetVersionId,filename,type}`, а worker fetch-ит их через API перед PVE upload; inline base64 в plan больше не используется.
56. Добавлен catalog API: `GET /v1/projects`, `GET /v1/projects/:projectId` (hierarchical scenes/shots/assets) и `GET /v1/assets?projectId=...`. `npm run smoke:catalog` подтверждает read-model.
57. Vue UI подключена к catalog API: загружает проекты при старте, позволяет выбрать проект и показывает его hierarchical timeline/Media Pool read-model.
58. Shot в timeline теперь selectable: активный shot подсвечивается и заполняет режиссёрскую форму project/scene/shot для запуска следующей job.
59. Vue director form расширена шестью H3 prompt sections (`camera`, `action`, `composition`, `lighting`, `sound`, `transition`) и отправляет их структурированно в API compiler.
60. Vue Media Pool получил выбор AssetVersion references; выбранные image/audio assets отправляются в director job как `{assetVersionId,filename,type}` и не встраиваются байтами в plan.
61. Vue получил adapter switch `llama.cpp`/`ComfyUI H3`, H3 width/height/frame параметры и workflow JSON input; ComfyUI job отправляет graph snapshot вместе с references и проходит серверную H3 validation/preflight.
62. H3 execution parameters `width/height/length/seed` теперь сохраняются в immutable `plan_json` и используются worker injection перед submit.
63. Исправлен критический failure path: добавлен `POST /v1/attempts/:attemptId/cancel`, транзакционный `PgAttemptRepository.fail` и перевод job в `failed`/`cancelled` с fencing check. `npm run smoke:failure-lifecycle` проходит.
64. Добавлен `POST /v1/admin/reconcile`: истёкшие leases переводятся в `attempt=unknown`, `job=reconciling` одной транзакцией; автоматический retry не выполняется до проверки внешнего ComfyUI state. `npm run smoke:reconcile` проходит.
65. Добавлен операторский `POST /v1/attempts/:attemptId/reconcile`: explicit `success|failed`, actor и manifest для success; unknown attempt закрывается без повторного запуска и с immutable evidence. `npm run smoke:reconcile-resolve` проходит.
66. ComfyUI polling получил timeout и backoff; timeout передаётся в worker failure path. `npm run smoke:comfy-timeout` проходит.
67. Добавлен `GET /v1/runtime`: read-only snapshot доступности ComfyUI `/system_stats` + `/object_info` и llama.cpp `/health` + `/v1/models`, с latency и статусами без секретов. `npm run smoke:runtime-health` проходит.
68. Vue UI показывает runtime health для ComfyUI/llama.cpp, имеет ручное обновление и блокирует запуск `ComfyUI H3`, если PVE runtime недоступен.
69. Vue перед отправкой ComfyUI job локально валидирует API-format workflow: ровно один H3/RandomNoise/SaveVideo и запрет MiniMaxH3ImageToVideo; некорректный graph не создаёт job.
70. UI получил image/audio node ID fields для H3 bindings; API сохраняет `workflowReferenceBindings` в immutable profile, поэтому выбранные Media Pool references подключаются к LoadImage/LoadAudio перед PVE submit.
71. HttpExecutionHooks heartbeat теперь читает job state и при `cancel_requested/cancelled` прерывает worker execution через `CANCELLED`; heartbeat API возвращает актуальное job state. Это закрывает operator cancel race для long-running H3 jobs.
72. Generic executor получил optional `cancel` hook; ComfyUI executor при `CANCELLED` вызывает PVE `/interrupt` с `prompt_id`, затем закрывает attempt через API failure path. `npm run smoke:comfy-cancel` проходит.
73. Добавлен `GET /v1/jobs/:id/result`: последняя attempt, manifest hash/JSON и связанные AssetVersion доступны по job ID; `npm run smoke:job-result` проходит.
74. Добавлены reusable H3 workflow profiles: миграция `007_workflow_profiles.sql`, `POST/GET /v1/workflow-profiles`, сохранение graph/boundary/graphHash. Профиль можно повторно выбирать для shots; `npm run smoke:workflow-profiles` проходит.
75. UI загружает сохранённые H3 profiles, позволяет выбрать профиль вместо ручного JSON и передаёт `workflowProfileId/name` вместе со snapshot в director job plan.
76. UI умеет сохранять текущий API-format H3 graph как reusable profile через `POST /v1/workflow-profiles`; server validation не допускает profile без H3 boundary, bindings сохраняются вместе со snapshot.
77. Добавлен profile activation gate `POST /v1/workflow-profiles/:id/preflight`: сохранённый graph и PVE `/object_info` проверяются до выбора profile для job. `npm run smoke:profile-preflight` проходит.
78. Workflow profiles теперь сохраняются inactive и попадают в `GET /v1/workflow-profiles` только после успешного PVE preflight; preflight атомарно активирует profile. UI-кнопка Test selected profile выполняет этот переход.
79. ComfyUI director job с `workflowProfileId` теперь читает только active profile из PostgreSQL и сохраняет его graph snapshot/hash в immutable plan; UI не обязан повторно передавать graph JSON. `npm run smoke:profile-job-source` проходит.
80. Добавлена versioned profile history: миграция `008_workflow_profile_revisions.sql`, сохранение профиля создаёт новую revision в транзакции, старые graph snapshots не перезаписываются; active остаётся только после preflight.
81. Миграция `009_profile_revision_cascade.sql` делает удаление тестового/архивного profile безопасным: его revisions удаляются каскадно, не затрагивая jobs, которые уже содержат собственные immutable snapshots.
82. Миграция `010_profile_reference_bindings.sql` сохраняет image/audio bindings в profile и каждой revision; job по `workflowProfileId` теперь использует bindings из active server profile, а не повторный ввод UI.
83. Добавлен `GET /v1/workflow-profiles/:id/revisions`: полная история graph/hash/boundary/reference bindings доступна для provenance; `npm run smoke:profile-revisions` проходит.
84. Добавлен operator job catalog `GET /v1/jobs?state=...` с project/scene/shot, adapter, plan hash и state; memory storage корректно возвращает 501, PostgreSQL read-model ограничен 100 последними jobs.
85. Vue UI показывает последние jobs в Job queue table с project/scene/shot, adapter, state и plan hash.
86. Job queue расширена operator actions: Approve, Cancel и Mark failed для reconciling attempt; API read-model возвращает latest `attempt_id/state`.
87. Добавлен manual final-take selection `POST /v1/jobs/:id/select-output`: выбирается только AssetVersion, связанный с job; решение хранится отдельно в `job_selected_outputs`, immutable manifest не изменяется. `npm run smoke:select-output` проходит.
88. Job queue UI получила кнопку Result, открывающую manifest/AssetVersion read-model по job ID через `GET /v1/jobs/:id/result`.
89. Result panel UI показывает outputs и позволяет выбрать финальный take через `POST /v1/jobs/:id/select-output`; выбранный AssetVersion отображается как operator decision.

## Локальный запуск текущего среза

```sh
cd /home/la6/Documents/Projects/QwenDirector
export QWEN_STORAGE=postgres
export DATABASE_URL=postgresql:///qwendirector
npm run dev:api
```

В отдельном терминале worker запускается через `npm --workspace apps/worker run start` с `QWEN_API_BASE_URL=http://127.0.0.1:4310` и `QWEN_NODE_ID=local`; при старте он сам регистрирует узел и затем выполняет claim-цикл. Фактический executor пока необязателен.

## Команды без установки и запуска сервисов

```sh
pwd
rg --files --hidden -g '!.git/**' -g '!.agents/**' -g '!.codex/**'
python3 scripts/check_skeleton.py
python3 scripts/check_domain_contract.py
node --version
npm --version
```

`git status --short` использовать только если каталог уже является настоящим репозиторием. При подготовке обнаружен служебный read-only каталог `.git`, git не инициализировался и коммиты не создавались. Недостающий Node.js/npm не мешает документальной проверке через Python.

## Что решить до реального GPU job

- Какой узел координатор, где primary assets и backup?
- Каковы точные VRAM, GPU UUID, свободный диск и backend versions?
- Какой workflow/model digest и output budget утверждены?
- Backend выделенный или общий; допустима ли адресная отмена?
- Кто утверждает запуск, сколько повторов разрешено, каков retention?

Безопасный следующий шаг — локальная инвентаризация и реализация mock-контракта. Compose, загрузка моделей и изменение инфраструктуры для этого не нужны.

## Проверка этой поставки

`python3 scripts/check_skeleton.py` проверяет обязательные файлы, локальные Markdown-ссылки и workspace manifests. Проверка не заменяет будущие TypeScript, integration, GPU и recovery tests. Проверка выполнена 2026-09-08: OK — 13 обязательных файлов, 17 Markdown-документов, 40 локальных ссылок, 8 workspace-пакетов. Compose проверен чтением; `docker compose config` не запускался. Приложения и GPU execution не тестировались, поскольку ещё не реализованы.

## Запись 90 — 2026-09-09

Исправлена регрессия в `PgJobRepository`: `getAsset` снова возвращает только AssetVersion, а `getJobResult` добавляет стабильный `job_id` для UI панели результата. Типизация проекта проходит (`npx tsc --noEmit`). Повторно подтверждены smoke-сценарии `smoke:job-result` и `smoke:job-catalog`; workflow profile smoke зарегистрирован под именем `smoke:workflow-profiles`.

Следующий производственный шаг: довести Result/Media Pool до полного provenance-потока (скачивание/предпросмотр CAS-asset по API, выбор финального take с идемпотентным повтором), затем проверить worker E2E с реальным H3 workflow после явного утверждения профиля.

## Запись 91 — 2026-09-09

Result и Media Pool получили прямые ссылки на immutable AssetVersion через `GET /v1/assets/:assetVersionId`: оператор может открыть или скачать CAS-файл, а выбор финального take остаётся отдельным явным действием. Веб-клиент собран через `npx vite build`; TypeScript-проверка прошла.

Дополнительно выполнен read-only preflight реального PVE ComfyUI: `/object_info` подтвердил наличие `MiniMaxH3ReferenceToVideo`, `RandomNoise` и `SaveVideo`. Контрактные smoke `runtime-health`, `h3-preflight`, `comfy-collect` и `comfy-cancel` прошли. Полный generation E2E ещё не запускался: нужен утверждённый production workflow с корректными model inputs и контролируемым output budget.

Проверен полный локальный smoke-набор из 27 сценариев: lifecycle/idempotency, fencing/lease/reconcile, CAS upload, H3 boundary/profile/revisions, reference bindings, Comfy submit/poll/collect/cancel, job result/final take, runtime health и worker E2E — все сценарии завершились `OK`.

Runtime health расширен capability-снимком ComfyUI: endpoint теперь сообщает найденные H3-классы (`capabilities.classes`) и флаг `capabilities.h3`, не ломая общий статус доступности при неполном payload `/object_info`. Типизация и `smoke:runtime-health` проходят.

Worker claim получил явную UUID-валидацию node id и совместимый локальный default UUID; некорректный идентификатор теперь даёт `400 INVALID_NODE_ID`, а штатный worker с `QWEN_NODE_ID=local` продолжает claim без ошибки. Проверено через TypeScript, `smoke:worker-e2e` и runtime health.

Живой контур проверен: node `00000000-0000-0000-0000-000000000001` зарегистрирован как `online`, worker-процесс запущен и claim при пустой очереди штатно возвращает `204`. Runtime API и оба backend-проверочных endpoint остаются доступными.

API перезапущен с явным `QWEN_STORAGE=postgres` (до этого живой процесс был memory-backed и скрывал profile routes). Одновременно исправлен локальный UUID node на корректный RFC 4122 v4 `00000000-0000-4000-8000-000000000001`; регистрация и claim теперь подтверждены через production storage, profile catalog отвечает `200`.

UI runtime health теперь показывает оператору capability H3 (`ready`/`incomplete`) рядом со статусом ComfyUI. Production-сборка веб-клиента после изменения прошла.

Скрипт `dev:api` теперь по умолчанию запускает PostgreSQL-backed storage (`qwendirector`), оставляя memory режим только при явном `QWEN_STORAGE=memory`; это предотвращает случайный запуск непроизводительного volatile-контура.

Полная проверка после перезапуска: `check_skeleton.py`, `check_domain_contract.py`, `npx tsc --noEmit`, profile preflight/job-source/revisions и PostgreSQL lifecycle — все `OK`. Read-only `/history` на PVE пока пуст, поэтому реальный H3 generation ещё не выполнялся и не выдаётся за завершённый E2E.

Read-only inventory PVE ComfyUI: версия `0.34.0`, PyTorch `2.12.1+cu130`, RTX 5090 с ~33.7 GB VRAM (свободно ~33.0 GB), очередь пуста. `/object_info` также показывает H3-специфичные `EmptyMiniMaxH3LatentAV`, `MiniMaxH3ReferenceToVideo`, `MiniMaxH3ImageToVideo` и memory-efficient attention nodes. Это подтверждает готовность runtime, но не заменяет утверждённый graph с CLIP/VAE/audio-VAE links.

Добавлен генератор portable starter graph `createH3StarterWorkflow()` с найденными на PVE Qwen/Minimax CLIP и video/audio VAE именами, latent AV и SaveVideo. Он предназначен для authoring и preflight; фактический submit намеренно не выполнялся до проверки конкретных link inputs и output budget.

Starter graph исправлен: добавлен обязательный `RandomNoise` и его link в H3 node. Новый `smoke:h3-starter` подтверждает прохождение boundary validator; TypeScript проходит.

Сверка starter с live `/object_info` показала точное совпадение обязательных входов H3 и SaveVideo; удалены неподтверждённые `latent`/`noise` поля из H3 inputs, чтобы candidate graph соответствовал фактической схеме PVE. Boundary node `RandomNoise` сохраняется как контрактный компонент до окончательной проверки production graph.

Команда `npm run preflight:h3-starter` успешно выполнила boundary + live PVE preflight без submit (`submit:false`). Она является безопасным gate перед утверждением профиля; запуск GPU generation по-прежнему не выполнен.

Импортирован пользовательский `/home/la6/Downloads/video_minimax_h3_r2v.json` (UI-format) в API-format profile `video-minimax-h3-r2v`. Live `/prompt` диагностика выявила отсутствующий `SetNode`, затем отсутствующий `CreateVideo.fps`; профиль последовательно исправлен до revision 3, preflight прошёл. Создана и approved реальная job `6ff28d87-b827-45d3-941d-a81365a7ad78`; worker claim успешен, PVE queue показывает `running=1`, job на момент записи остаётся `leased` (генерация продолжается).

После исправлений создана финальная approved job `6ff28d87-b827-45d3-941d-a81365a7ad78`: attempt `4be48d52-6eae-4fcb-8f66-5fb20589b51b` находится в `running`, heartbeat обновляется, PVE `/queue` показывает один running prompt. Это подтверждает реальный submit и исполнение graph; итоговый output ещё ожидается.

После длительного отсутствия прогресса job отменена через штатный `POST /v1/jobs/:id/cancel`: API вернул `cancel_requested`, затем job стала `cancelled`, а PVE queue вернулась к `0/0`. Это подтверждает рабочий cancel/recovery путь для реального Comfy execution; успешный output E2E не получен.

Диагностика live `/prompt` показала, что исходный run использовал 56 sampling steps и был слишком долгим. Профиль обновлён до revision 4 с включённым 4-step turbo LoRA (`minimax_h3_ref2v_turbo_4step...`) и теми же реальными model files. Новая approved job `4132c77d-ba19-406a-9f8e-3956aa9b49d4` claim’нута, PVE queue показывает running prompt `7a377174-997b-4cc2-aa39-6e3a443dabc8`; output ожидается.

Добавлен read-only `GET /v1/runtime/comfy-schema`: он отдаёт allowlisted фактические схемы `MiniMaxH3ReferenceToVideo`, `EmptyMiniMaxH3LatentAV`, `RandomNoise`, `SaveVideo`, `LoadImage`, `LoadAudio` для workflow authoring. Endpoint проверен mock smoke и живым PVE (все шесть классов найдены); API перезапущен с PostgreSQL storage.

Schema endpoint подключён к Vue UI: runtime health теперь показывает список доступных Comfy/H3 узлов, что помогает оператору собирать профиль по фактическому runtime-контракту. Веб-сборка прошла.

Live checkpoint подтверждён: `GET /v1/runtime/comfy-schema` возвращает шесть allowlisted классов, `/v1/runtime` сообщает `comfyui=true` и `llama.cpp=true`, `npx tsc --noEmit` проходит.

Добавлена транзакционная активация конкретной workflow-profile revision: `POST /v1/workflow-profiles/:id/revisions/:revision/activate`. Перед активацией выполняется H3 boundary validation; в profile snapshot копируются graph/hash/bindings ревизии и выставляется `active=true`. Типизация и история revisions проходят.

Добавлен `smoke:profile-revision-activate`: он проверяет через API и PostgreSQL, что активация revision атомарно обновляет active snapshot и совпадающий graph hash.
### 101. Реальный E2E turbo-прогон завершён
- Задание `4132c77d-ba19-406a-9f8e-3956aa9b49d4` завершилось `succeeded`; ComfyUI prompt `7a377174-997b-4cc2-aa39-6e3a443dabc8`, очередь пуста.
- Manifest и CAS AssetVersion созданы (`c9eb9421-20bd-40b7-bbf6-327fc4cf8b08`, SHA-256 `ba1bcbd614485045634ef36f0a2548ee4d37aed9a824d31310c48256ee0ea973`).
- Выявлена и исправлена нормализация MIME: SaveVideo в ComfyUI возвращает mp4 в поле `images`; теперь MIME определяется по расширению (`video/mp4` и др.). Worker перезапущен с исправлением.
- Исторический результат сохранён как есть; следующий прогон должен подтвердить `video/mp4` в новом manifest.

### 102. Зафиксирована регрессия MIME и обновлён статус продукта
- `ComfyPromptExecutor.collect` теперь определяет video MIME по расширению имени файла, включая случай ComfyUI `outputs.images[].filename=*.mp4`.
- `smoke:comfy-collect` расширен именно этим случаем; smoke и `npx tsc --noEmit` проходят.
- README синхронизирован с фактическим состоянием: production-oriented vertical slice и подтверждённый MiniMax H3 turbo E2E; hardening/backup/restore остаются следующими эксплуатационными этапами.

### 103. Добавлен локальный backup/verify контур
- `scripts/backup_local.mjs` создаёт custom-format `pg_dump`, перечисляет CAS-файлы и пишет manifest с размерами и SHA-256.
- `scripts/verify_backup.mjs` проверяет контрольную сумму dump перед восстановлением; команды доступны как `npm run backup:local` и `npm run backup:verify`.
- Практическая проверка на локальной PostgreSQL `qwendirector` выполнена во временном каталоге: dump создан, manifest проверен, найдено 2 CAS-файла.
- Восстановление намеренно не выполнялось поверх рабочей БД: следующий шаг — изолированный restore rehearsal в отдельную локальную БД/каталог и проверка ссылок AssetVersion.

### 104. Restore rehearsal подготовлен и проверен по доступам
- Добавлен `scripts/restore_rehearsal.mjs` (`npm run backup:restore-rehearsal`): уникальная временная БД, `pg_restore`, проверка числа public-таблиц и гарантированный cleanup.
- Backup и manifest verification проходят повторно.
- Фактическое создание временной БД остановлено правами текущего PostgreSQL-роли (`permission denied to create database`); рабочая БД не изменялась. Для полного restore-gate нужно один раз дать локальной backup-роли CREATEDB или выполнить rehearsal под административной ролью.

### 105. Backup теперь включает CAS и проверяет байты
- `backup_local.mjs` копирует CAS-объекты в backup-каталог, сохраняя относительные ключи, а не только их список.
- `backup:verify` сверяет dump и каждый скопированный CAS-файл по размеру и SHA-256.
- Повторная проверка текущего PostgreSQL backup прошла: database + 2 CAS records.

### 106. Полный регрессионный прогон после hardening
- Все 31 smoke-сценарий workspace завершились `OK`: API/repository/PostgreSQL, lifecycle/fencing/reconcile, CAS/AssetVersion, H3 profile/revisions/references, Comfy submit/poll/collect/cancel, runtime health и worker E2E.
- Production web build (`npm --workspace apps/web run build`) и domain contract check прошли.
- Это подтверждает отсутствие регрессий в основном контуре после изменений backup/CAS MIME; restore-rehearsal по-прежнему ждёт роли с `CREATEDB`.

### 107. Повторная попытка restore под системной ролью
- Проверено наличие `runuser`/`sudo`, но `sudo -n -u postgres` требует интерактивную аутентификацию; автоматическое изолированное восстановление из текущего пользователя невозможно.
- Рабочая PostgreSQL и CAS не изменялись. Команда rehearsal остаётся готовой для запуска оператором с локальной ролью `CREATEDB`.

### 108. Reference-план теперь проверяется на существование AssetVersion
- `POST /v1/director/jobs` с PostgreSQL проверяет каждый `references[].assetVersionId` до создания job; отсутствующий или дублирующийся объект даёт `REFERENCE_ASSET_NOT_FOUND` и откатывает транзакцию project/scene/shot/job.
- Контракт расширен явным типом `references`; typecheck, catalog и profile-job-source smoke проходят.

### 109. Добавлен dry-run отчёт CAS retention/GC
- `scripts/cas_gc_report.mjs` (`npm run cas:gc-report`) сравнивает CAS-объекты с `asset_versions.storage_key` через PostgreSQL и выводит только кандидатов на удаление.
- Фактический локальный отчёт: 2 объекта просканировано, 1 referenced, 1 orphan; удаление не выполняется.

### 110. Ошибки reference-плана возвращаются как клиентские
- `REFERENCE_ASSET_NOT_FOUND` и `INVALID_REFERENCE_PLAN` теперь отображаются API как `400`, а не как внутренняя ошибка `500`; транзакция по-прежнему откатывается.
- `npx tsc --noEmit` проходит.

### 111. Добавлен операторский список worker-узлов
- PostgreSQL node repository получил `list()`, API — `GET /v1/nodes` с id, instance, capabilities, status и heartbeat timestamp.
- Это закрывает read-side для runtime/recovery UI; typecheck проходит. Живой API-процесс потребует обычного перезапуска для публикации нового маршрута.

### 112. Node recovery read-side опубликован и проверен live
- API перезапущен с `GET /v1/nodes` и `POST /v1/admin/nodes/reconcile?staleSeconds=N`.
- Live-проверка пометила 2 просроченных узла как `stale`, оставив heartbeat активного worker `online`; список подтвердил оба статуса.
- Это даёт оператору явный механизм обнаружения потерянных workers без освобождения ресурсов только по локальному таймауту.

### 113. Worker recovery-состояние отображается в UI
- Веб-клиент загружает `GET /v1/nodes` и показывает instance/status worker рядом с runtime health, включая stale-состояния и ручное обновление.
- Production web build и `npx tsc --noEmit` проходят.

### 114. Добавлен migration sequence gate
- `scripts/check_migrations.mjs` (`npm run check:migrations`) проверяет contiguous numbering SQL-миграций до rollout.
- Live workspace содержит 11 последовательных миграций `001_init.sql`–`011_job_selected_outputs.sql`; проверка и typecheck проходят.

### 115. Разделены liveness и readiness API
- Добавлен `GET /ready`: он проверяет локальные ComfyUI `/system_stats` и llama.cpp `/health`, возвращая `200 ready` или `503 not_ready` с деталями checks.
- Живой API перезапущен и подтвердил `200 ready` при доступных обоих backend’ах; `/health` остаётся отдельным liveness endpoint.

### 116. Readiness fail-closed покрыт smoke
- Добавлен `smoke:readiness`: при недоступном llama.cpp или ComfyUI `/ready` возвращает `503 not_ready`.
- Smoke и `npx tsc --noEmit` проходят.

### 117. Readiness включает persistence
- `PgAttemptRepository.ready()` и memory-эквивалент добавлены; `/ready` теперь проверяет ComfyUI, llama.cpp и PostgreSQL (`select 1`).
- API перезапущен; live response `200 ready` содержит три checks, включая `storage`.
- TypeScript-проверка проходит.

### 118. Синхронизирована эксплуатационная документация
- `docs/operations.md` больше не называет систему «только каркасом»: зафиксированы подтверждённые локальные endpoints API/llama.cpp/ComfyUI, PostgreSQL/CAS, readiness и H3 E2E.
- Незавершённые hardening-операции (ручной backup/verify, GC, restore с CREATEDB) явно отмечены как такие.
- `check_skeleton.py`, `check:migrations` и `smoke:readiness` проходят.

### 119. Live контроль после рестарта API
- `/ready` вернул `200 ready` по ComfyUI, llama.cpp и PostgreSQL.
- `/v1/nodes` подтвердил один активный worker `online` с обновляемым heartbeat и два исторических узла `stale`.
- `cas:gc-report` повторно показал 2 CAS-объекта, 1 referenced и 1 orphan-кандидат; удаление не выполнялось.

### 120. Backup verifier получил security-gate
- `backup:verify` проверяет `schemaVersion`, обязательные секции manifest и запрещает traversal/absolute пути CAS перед чтением файлов.
- Повторный backup + verify прошёл: database + 2 CAS records; typecheck проходит.

### 121. CAS key digest проверяется при verify
- `backup:verify` сверяет digest байтов, manifest и 64-hex content-addressed имя объекта.
- Повторная проверка backup прошла; некорректный CAS path/hash теперь отвергается до restore.

### 122. Live reference rollback проверен
- На живом PostgreSQL отправлен director job с несуществующим AssetVersion UUID.
- API вернул `400 {code: REFERENCE_ASSET_NOT_FOUND}`; транзакционный путь не поставил job в очередь и не запустил worker.

### 123. Quick-start синхронизирован с production gates
- README получил команды `check:migrations`, `/ready`, `backup:local`, `backup:verify` и `cas:gc-report` с пояснением liveness/readiness и dry-run semantics.
- `check_skeleton.py` подтверждает 19 Markdown-документов и 43 локальные ссылки.

### 124. Добавлена опциональная bearer-аутентификация API
- При `QWEN_API_TOKEN` все маршруты защищены заголовком `Authorization: Bearer ...`; `/health` и `/ready` оставлены доступными для probes.
- Без переменной сохраняется local-dev поведение.
- `smoke:api-auth` и `npx tsc --noEmit` проходят.

### 125. Security-настройка добавлена в конфигурационный runbook
- `.env.example` и `docs/operations.md` документируют `QWEN_API_TOKEN`, запрет размещения токена в логах/plan snapshots и ограничение LAN-доступа без токена.

### 126. Добавлен operator ingest для Media Pool
- `POST /v1/assets/import` принимает локальный base64-файл, SHA-256, MIME и actor; создаёт immutable AssetVersion с provenance `operator-import` без фальшивой attempt.
- Повторяющийся SHA идемпотентно возвращает существующий AssetVersion; storage использует тот же CAS commit/hash gate.
- Live PostgreSQL smoke импортировал `reference-smoke.txt`, API ответил `201`; typecheck и skeleton check проходят.

### 127. Media Pool ingest подключён к UI
- В веб-клиенте появился file input: SHA-256 считается через Web Crypto, файл отправляется в `/v1/assets/import`, затем глобальный Media Pool обновляется без перезагрузки страницы.
- Загруженные AssetVersion доступны для выбора как references при создании H3 job.
- Production web build и `npx tsc --noEmit` проходят.

### 128. Исправлена snake_case/camelCase граница Media Pool
- Live API `GET /v1/assets` возвращает PostgreSQL snake_case поля; UI теперь принимает оба представления для storage key, MIME и byte size.
- Повторная live-проверка подтвердила импортированный AssetVersion: binary endpoint отвечает `200`, content-type и `x-content-sha256` совпадают с записью.
- Web build и typecheck проходят.

### 129. Reference MIME проверяется до постановки job
- PostgreSQL `createDirector` теперь сверяет `references[].type` с MIME AssetVersion (`image/*`/`audio/*`), возвращая `REFERENCE_MIME_MISMATCH` до worker submit.
- Live-проверка с text asset, заявленным как audio, вернула `400`; typecheck и catalog smoke проходят.

### 130. Live ingest идемпотентен по SHA-256
- Две последовательные загрузки одного reference через `/v1/assets/import` вернули один и тот же AssetVersion `9c231bee-6bfd-4190-ab1c-d5ff665d7663`.
- Дубликаты CAS/AssetVersion не создаются; это подтверждено непосредственно на PostgreSQL API.

### 131. CAS GC учитывает grace period
- `cas:gc-report` получил `CAS_GC_GRACE_SECONDS` (по умолчанию 24 часа) и исключает свежие orphan-объекты; eligible-кандидаты содержат age/mtime.
- Live dry-run с grace `0` показал 3 объекта, 2 referenced и 1 старый eligible orphan; удаления нет.

### 132. Ошибочные CAS uploads очищают staging
- `AssetStorage` получил optional `discardStaging`; Filesystem implementation удаляет только staging-ключи.
- PostgreSQL attempt upload и operator import вызывают cleanup при ошибке записи или SHA mismatch, предотвращая накопление мусора.
- Typecheck, `smoke:storage` и `smoke:asset-upload` проходят.

### 133. SHA mismatch очищается самим CAS storage
- `FilesystemAssetStorage.commitStaging` теперь удаляет staging-файл непосредственно при `SHA256_MISMATCH`; repository-level cleanup остаётся защитным дублем.
- `smoke:storage` проверяет отсутствие файла после ошибочного commit; smoke и typecheck проходят.

### 134. Live operator import integrity gate
- Operator import с заведомо неверным SHA вернул `400 {code: SHA256_MISMATCH}` и не создал AssetVersion/CAS object.
- В staging обнаружен один ранее оставшийся файл от доисправительного прогона; автоматическое удаление исторического staging намеренно не выполнялось.

### 135. Добавлен staging retention dry-run
- `scripts/staging_gc_report.mjs` (`npm run staging:gc-report`) перечисляет staging-файлы старше `STAGING_GC_GRACE_SECONDS` (24 часа по умолчанию), не удаляя их.
- Live dry-run с grace `0` обнаружил один старый staging-файл от ошибочного прогона; API перезапущен с cleanup-исправлением.

### 136. Live readiness после рестарта API
- `/ready` снова вернул `200 ready` по ComfyUI, llama.cpp и PostgreSQL.
- `/v1/nodes` подтвердил активный worker `00000000-0000-4000-8000-000000000001` в `online` с актуальным heartbeat; stale-узлы не участвуют в claim.

### 137. Регрессия после Media Pool/security hardening
- Контрольный набор прошёл: PostgreSQL lifecycle, CAS upload, H3 profile/reference injection, worker E2E, readiness fail-closed, API bearer auth и migration sequence.
- Все 7 сценариев завершились `OK`; текущий кодовый срез не имеет регрессий по этим критическим границам.

### 138. Финальный контрольный прогон текущего среза
- `check_skeleton.py`, migration gate, web build, TypeScript, PostgreSQL smoke, worker E2E и readiness smoke завершились успешно.
- Документация и runtime-контракты согласованы; production hardening остаётся ограничен restore rehearsal с ролью `CREATEDB` и будущими нагрузочными измерениями.

### 139. Добавлен local-first metrics endpoint
- API публикует `/metrics` в Prometheus text format с `qwendirector_http_requests_total` и `qwendirector_http_errors_total`; внешняя телеметрия не включается.
- Endpoint оставлен публичным для probes даже при `QWEN_API_TOKEN`.
- Live API вернул корректные counters; typecheck и readiness smoke проходят.

### 140. Metrics contract покрыт smoke
- `smoke:metrics` проверяет Prometheus content-type и оба счётчика без внешних сервисов.
- Smoke и `npx tsc --noEmit` проходят.

### 141. Backup catalog preflight добавлен
- `scripts/verify_backup_catalog.mjs` (`npm run backup:catalog-check`) читает `pg_restore --list` без создания БД и проверяет наличие 9 ключевых production-таблиц.
- Новый backup snapshot прошёл: manifest/CAS verify и catalog check `OK`; полноценный restore по-прежнему требует роли `CREATEDB`.

### 142. Backup/retention порядок добавлен в README
- Quick-start теперь показывает последовательность `backup:local` → `backup:verify` → `backup:catalog-check` и отдельные dry-run отчёты CAS/staging GC.
- `check_skeleton.py` подтвердил корректность локальных ссылок документации.

### 143. Live process/readiness checkpoint
- API process работает с PostgreSQL-backed конфигурацией; `/ready` вернул `200` по ComfyUI, llama.cpp и storage.
- `/metrics` показал 312 запросов и 0 ошибок 5xx на текущем процессе.
- `/v1/nodes` подтвердил активный worker `online` с heartbeat `2026-09-09T14:03:36Z`.

### 144. Устранён дублирующий worker process
- Обнаружены два процесса с одним `nodeId/instanceId`; старый экземпляр остановлен по точным PID, актуальный worker оставлен.
- После cleanup heartbeat активного узла продолжил обновляться, статус `online`; fencing и node ownership остаются защитой от повторной доставки.

### 145. Regression после worker cleanup
- CAS cleanup, API asset upload, bearer auth, Prometheus metrics и migration gate завершились `OK`.
- После остановки старого worker критические storage/security проверки не деградировали.

### 146. Ограничен размер operator import
- `/v1/assets/import` отклоняет payload больше `QWEN_MAX_IMPORT_BYTES` (по умолчанию 100 MiB) до staging/CAS записи с кодом `ASSET_IMPORT_TOO_LARGE`.
- Typecheck и API auth smoke проходят; лимит документирован через переменную окружения в runtime-контракте.

### 147. Лимит ingest добавлен в env example
- `.env.example` теперь содержит `QWEN_MAX_IMPORT_BYTES=104857600`; `check_skeleton.py` подтверждает целостность документации.

### 148. API body limit согласован с Media Pool ingest
- Fastify `bodyLimit` вычисляется из `QWEN_MAX_IMPORT_BYTES` (до 256 MiB, default 200 MiB), чтобы parser не обрывал допустимый base64 import раньше route-level проверки.
- Typecheck, auth/readiness smoke проходят; API перезапущен с новым лимитом.

### 149. Live checkpoint после body-limit hardening
- `/ready` вернул `200 ready` по трём checks, `/metrics` — 24 запроса и 0 ошибок 5xx.
- Активный worker heartbeat обновляется (`14:07:06Z`), stale-узлы остаются исключены.

### 150. Media Pool ingest описан в operator runbook
- `docs/operations.md` фиксирует `/v1/assets/import`, лимит `QWEN_MAX_IMPORT_BYTES`, hash-before-promotion, SHA idempotency, staging cleanup и grace-period GC.

### 151. Финальная проверка документации и hardening
- `check_skeleton.py`, TypeScript, storage cleanup, API auth, metrics и readiness smoke завершились `OK`.
- Текущий live API и активный worker остаются пригодны для дальнейшего restore rehearsal/нагрузочных измерений.

### 152. Job lifecycle regression после API hardening
- API lifecycle, job result/final take и reconcile-resolve smoke завершились `OK` после auth hook/body-limit изменений.
- Idempotency, approval, cancel и operator reconcile не изменили контракт.

### 153. Worker bearer auth интегрирован end-to-end
- Worker поддерживает `QWEN_API_TOKEN` на claim, register/heartbeat, reference fetch и execution hooks (asset upload/commit/fail).
- Typecheck и worker E2E smoke проходят; worker перезапущен с актуальным транспортом.

### 154. Worker auth transport покрыт smoke
- `smoke:worker-auth` проверяет, что claim-запрос worker отправляет `Authorization: Bearer ...` при заданном токене.
- Smoke и `npx tsc --noEmit` проходят.

### 155. Worker/API regression после auth интеграции
- `smoke:worker-auth`, `smoke:worker-e2e`, `smoke:api` и migration gate завершились `OK`.
- Bearer auth не нарушил claim → execution → CAS commit и базовый job lifecycle.

### 156. Timing-safe bearer token comparison
- API auth сравнивает bearer header через `timingSafeEqual` после проверки длины, исключая обычное раннее строковое сравнение.
- `smoke:api-auth` и TypeScript-проверка проходят.

### 157. Исправлены systemd templates
- API получил явный `start` script; systemd examples больше не ссылаются на отсутствующие `dist/index.js`, а запускают workspace start через `env npm`.
- В шаблонах оставлена пометка заменить npm path под фактическую Node installation; `.env` общий для API и worker, включая `QWEN_API_TOKEN`.
- Typecheck и skeleton check проходят.

### 158. Защита от duplicate online worker добавлена в schema
- Миграция `012_unique_online_worker_instance.sql` добавляет partial unique index на `nodes.instance_id` для `status='online'`.
- Один instance не сможет зарегистрировать два online-узла; stale-история сохраняется.
- Перед применением миграции нужен обычный migration gate/backup, как для остальных schema changes.

### 159. Миграция duplicate-worker применена локально
- Preflight подтвердил отсутствие duplicate `online` instance; `012_unique_online_worker_instance.sql` применена к `qwendirector`.
- Индекс `one_online_worker_instance` найден в `pg_indexes`; активный worker heartbeat продолжил обновляться.

### 160. Migration/recovery checkpoint
- `check:migrations` подтвердил 12 последовательных миграций до `012_unique_online_worker_instance.sql`.
- Live `/ready` вернул `200`, активный node остаётся `online`, heartbeat обновляется; stale nodes не получают claims.

### 161. Duplicate online instance отклоняется live
- Попытка зарегистрировать второй UUID с `instance_id=local-qwen` отклонена API `409` по индексу `one_online_worker_instance`.
- Дубликат online node не создан; текущий worker продолжил heartbeat.

### 162a. Backup после миграции 012
- Новый PostgreSQL backup после применения unique-online index прошёл `backup:verify` (database + 3 CAS records) и `backup:catalog-check` (9 обязательных таблиц).

### 162. Стабилизирован node registration error contract
- PostgreSQL unique violation для duplicate online instance преобразуется в `NODE_INSTANCE_ALREADY_ONLINE`.
- Live API теперь возвращает `409` со стабильным кодом вместо сырого текста constraint; typecheck и auth smoke проходят.

### 163. Live node constraint checkpoint
- После стабилизации registration contract `/ready` вернул `200 ready`, активный worker heartbeat обновляется (`14:17:47Z`), stale nodes не участвуют в claim.
- Migration gate подтвердил 12 последовательных миграций.

### 164. Контрольный срез после hardening
- Live `/ready` снова подтвердил доступность ComfyUI, llama.cpp и PostgreSQL; активный `local-qwen` node остаётся `online`, старый экземпляр — `stale`.
- `check:migrations` подтвердил непрерывную цепочку 001..012.
- Регрессионные smoke-проверки bearer auth API/worker, Prometheus metrics и fail-closed readiness прошли успешно.

### 165. Backup и безопасная очистка CAS проверены
- Создан новый локальный backup `.data/backups/2026-09-09T14-20-50.609Z`; manifest/hash и каталог PostgreSQL прошли проверку (9 обязательных таблиц, 3 CAS-файла).
- CAS и staging GC работают только в dry-run: при grace 24 часа удаляемых объектов нет.
- Restore rehearsal по-прежнему требует роли PostgreSQL с `CREATEDB`; production-база не затрагивалась.

### 166. Сквозной regression smoke-пакет
- Успешно прошли проверки project/scene/shot catalog, job catalog, workflow profiles и revisions/activation.
- Успешно прошли H3 references/starter, failure lifecycle, lease reconcile/resolution и final-take selection.
- Это подтверждает сохранение ключевых инвариантов после auth, migration и backup hardening.

### 167. Воспроизводимая production-сборка web
- В `apps/web/package.json` добавлены команды `build` и `typecheck`.
- `vite build` и TypeScript-проверка прошли успешно; production bundle собран в `apps/web/dist`.

### 168. Единый проверочный entrypoint
- В корневой пакет добавлены `typecheck` и `build:web`, объединяющие проверку Node/API/worker и web.
- Команды выполнены успешно; сборка и типы теперь проверяются одной reproducible-командой CI/оператора.

### 169. Release-check без внешних сервисов
- Добавлен `npm run check:release` (`scripts/check_release.mjs`): typecheck, web build, migration gate, domain и skeleton contracts.
- Проверка успешно проходит локально и не требует запуска GPU/ComfyUI, поэтому пригодна для CI перед поставкой.

### 170. Локальный production preview
- Для web добавлена команда `npm --workspace apps/web run preview`, поднимающая собранный bundle на loopback (`127.0.0.1`).
- `check:release` повторно прошёл после изменения packaging.

### 171. Systemd-контур интерфейса
- Добавлен шаблон `deploy/systemd/qwendirector-web.service.example` для запуска собранного web UI через systemd user unit.
- Операционная документация обновлена: перед включением unit требуется `npm run build:web`; release-check прошёл повторно.

### 172. Живой H3 backend checkpoint
- `smoke:h3-preflight` и `smoke:comfy-schema` прошли на текущем PVE ComfyUI.
- `probe:backends` подтвердил llama.cpp с моделью `qwen3.5-9b-defiant-mtp-q5km` и ComfyUI `0.34.0` с доступным RTX 5090 (`cuda:0`).

### 173. Повторная проверка H3 starter на live backend
- `preflight:h3-starter` успешно сопоставил starter workflow с live schema ComfyUI и подтвердил узлы MiniMax H3, RandomNoise и SaveVideo.
- Backend capability inventory получен без постановки задания в очередь; GPU-состояние не изменялось.

### 174. Проверен runtime web preview
- Собранный интерфейс запущен через `npm --workspace apps/web run preview` на loopback `127.0.0.1:4173`.
- HTTP smoke подтвердил `200 OK` и выдачу index/assets; процесс после проверки остановлен.

### 175. Авторизация web-клиента
- UI получил поле API token с локальным сохранением и общей fetch-обёрткой, автоматически добавляющей `Authorization: Bearer` ко всем API-запросам.
- Typecheck и production build прошли успешно; без токена loopback-dev продолжает работать как прежде.

### 176. Финальный regression после UI auth
- `check:release`, API/worker auth smoke и fail-closed readiness прошли повторно.
- Live `/ready` остаётся `ready`: ComfyUI, llama.cpp и PostgreSQL отвечают штатно.

### 177. Защита non-loopback запуска
- API теперь отказывается стартовать на non-loopback host без `QWEN_API_TOKEN` (`QWEN_API_TOKEN_REQUIRED_FOR_NON_LOOPBACK`).
- Это предотвращает случайную публикацию незащищённого API; typecheck и auth smoke прошли.

### 178. Регрессионный тест bind guard
- Добавлен `smoke:api-bind-guard`, проверяющий отказ старта на `0.0.0.0` без токена.
- Smoke прошёл успешно; security-инвариант закреплён автоматической проверкой.

### 179. Security включён в release gate
- `check:release` теперь включает `smoke:api-bind-guard`; полный release-check прошёл успешно.
- Поставка блокируется, если non-loopback API может стартовать без bearer-токена.

### 180. Web/API proxy для production preview
- Добавлен `apps/web/vite.config.ts` с proxy `/v1`, `/health`, `/ready`, `/metrics` на `QWEN_API_PROXY_TARGET` (по умолчанию `127.0.0.1:4310`) для dev и preview.
- Проверено live: `http://127.0.0.1:4173/ready` вернул `ready`, то есть UI-origin корректно видит API.

### 181. Proxy закреплён release smoke
- Добавлен `smoke:web-proxy`; он проверяет наличие всех API-маршрутов в server/preview proxy.
- Smoke включён в `check:release`, полный gate прошёл успешно.

### 182. Profile/job source regression
- H3 profile snapshot, profile preflight и построение ComfyUI job из активного profile прошли после proxy/auth hardening.
- Это подтверждает, что immutable workflow path не зависит от packaging-изменений.

### 183. Durable jobs/CAS regression
- PostgreSQL claim→heartbeat→manifest→commit, filesystem CAS, API upload и worker E2E прошли.
- Comfy timeout/interrupt, result API, final-take selection и runtime health прошли.

### 184. Проверен пользовательский ComfyUI workflow reference
- Добавлен `npm run inspect:workflow -- <file>` для проверки UI-format и prompt-format JSON по H3 boundary.
- Файл `/home/la6/Downloads/video_minimax_h3_r2v.json` распознан как ComfyUI UI workflow (30 nodes): ровно по одному `MiniMaxH3ReferenceToVideo`, `RandomNoise` и `SaveVideo`.

### 185. Inspector покрывает оба формата ComfyUI
- На synthetic API prompt JSON inspector подтвердил тот же H3 boundary (3 nodes).
- После проверки временный fixture удалён; `check:release` прошёл полностью.

### 186. Production gates documented end-to-end
- README обновлён: release-check, live readiness, backup creation with captured directory, verification/catalog и dry-run GC теперь указаны воспроизводимыми командами.
- Проверка release gate после обновления документации прошла успешно.

### 187. Roadmap audit checkpoint
- Release gate, PostgreSQL durable lifecycle, worker CAS E2E и H3 references снова прошли.
- Неподтверждёнными остаются только инфраструктурные требования roadmap: restore с `CREATEDB`, измеренные RPO/RTO, второй физический worker, quotas/retention и fault/load drills.
- Эти пункты явно оставлены открытыми; production-ready статус целиком пока не объявляется.

### 188. Pending jobs quota
- Для PostgreSQL director jobs добавлен ограничитель `QWEN_MAX_PENDING_JOBS` (0 = без ограничения); превышение возвращает HTTP 429 `JOB_QUOTA_EXCEEDED` до создания project/scene/shot.
- Значение добавлено в `.env.example`; typecheck, API lifecycle и PostgreSQL smoke прошли.

### 189. Quota hardening regression
- После добавления quota общий `check:release`, PostgreSQL durable lifecycle и failure lifecycle прошли повторно.
- Ограничение не изменяет state machine и не затрагивает существующие terminal jobs.

### 190. Quota config fail-closed
- `QWEN_MAX_PENDING_JOBS` теперь принимает только целое неотрицательное значение; ошибочная конфигурация даёт `INVALID_JOB_QUOTA_CONFIG`, а не отключает лимит молча.
- Typecheck и PostgreSQL lifecycle smoke прошли.

### 191. Quota default regression
- При штатном `QWEN_MAX_PENDING_JOBS=0` полный `check:release` прошёл: ограничение отключено явно, без побочных изменений.

### 192. Release/live readiness checkpoint
- `check:release` и live `/ready` одновременно прошли: web/API packaging, security, migrations и domain contracts зелёные; ComfyUI, llama.cpp и PostgreSQL доступны.

### 193. Recovery artifact checkpoint
- Создан backup `.data/backups/2026-09-09T14-35-08.383Z`; manifest/CAS hash verification и catalog check (9 таблиц) прошли.
- CAS GC dry-run при grace 24 часа не обнаружил eligible orphan; recovery-артефакты не повреждены.

### 194. Quota runbook
- `docs/operations.md` дополнен описанием `QWEN_MAX_PENDING_JOBS`, ответа 429 и fail-closed конфигурации.

### 195. Migration runbook
- В `docs/operations.md` добавлена безопасная последовательность миграций: pause claims → migration gate → backup → apply → повторная проверка и smoke.
- Автоматический rollback поверх рабочей БД явно запрещён; release gate после изменения документации прошёл.

### 196. Restore preflight command
- Добавлен `npm run backup:restore-preflight`; он показывает текущую роль, `CREATEDB` и готовность restore rehearsal без попытки изменить БД.
- На текущем окружении результат явно `requires-admin-role` (`la6`, `CREATEDB=false`).

### 197. Пауза разработки и обсуждение Kadr

- По явному запросу пользователя разработка поставлена на паузу; текущая задача — обсуждение объединения с Kadr.
- Анализ и предложение сохранены в [kadr-integration.md](kadr-integration.md), ссылка добавлена в README.
- Рекомендуемое направление: Kadr как монтажное рабочее место, QwenDirector как сервис генерации/PVE и provenance; сначала проверить обмен ассетами, затем рассмотреть встроенную панель.
- Решение о реализации не принято. Код, зависимости, БД и работающие сервисы в рамках документирования не изменялись.
- Прежние заявления о том, что остались только инфраструктурные гейты, скорректированы: продуктовые и интеграционные пробелы также остаются. Commit Kadr и runtime-совместимость ещё требуют проверки.
- Далее обсуждать целевой UX и границы интеграции; разработку возобновлять по указанию пользователя. Проверка этого изменения: наличие Markdown-документа и разрешение добавленных локальных ссылок.

### 198. Явное управление каталогом
- Добавлены PostgreSQL-операции и API `POST /v1/projects`, `POST /v1/projects/:projectId/scenes`, `POST /v1/scenes/:sceneId/shots`; позиции вычисляются транзакционно, принадлежность project/scene проверяется, ошибки возвращают 4xx.
- Добавлен `npm run smoke:catalog-mutation`: создание project → scene → shot, чтение и отрицательный сценарий проходят; `npm run typecheck` также зелёный.

### 199. Catalog UX в web
- В Vue UI добавлены формы создания project, scene и shot до генерации job; новые записи сразу обновляют catalog/timeline, shot связывается с выбранной сценой.
- Проверки: `npm run typecheck`, `npm run build:web`, `npm run smoke:catalog-mutation` прошли.

### 200. Переименование каталога
- Добавлены PATCH-маршруты для переименования project/scene/shot. Для shot увеличение `plan_revision` фиксирует изменение режиссёрского объекта и предотвращает незаметное переиспользование старого плана.
- Smoke каталога расширен проверкой трёх PATCH и чтением обновлённой иерархии; typecheck прошёл.

### 201. Catalog rename UI
- В timeline/catalog UI добавлены действия Rename для project, scene и shot; после успешного PATCH данные перечитываются, а клик по кнопке не меняет выбор shot.
- `npm run typecheck` и `npm run build:web` прошли.

### 202. Выбор пустой сцены
- Timeline позволяет выбрать сцену по заголовку, включая сцену без шотов; форма создания shot использует выбранную сцену. После загрузки timeline первая сцена выбирается автоматически только если выбор ещё не задан.
- `npm run typecheck` и `npm run build:web` прошли.

### 203. Shot timing revision
- Добавлено обязательное поле `shots.duration_seconds` (migration 013, default 5 секунд, positive constraint). PATCH shot теперь может менять название и длительность, при этом увеличивает `plan_revision`; timeline возвращает `durationSeconds`.
- Migration применена к локальной БД и проверена; `check:migrations`, typecheck и catalog mutation smoke прошли.

### 204. Timing edit в UI
- Действие Edit shot теперь изменяет название и длительность через один PATCH; timeline показывает длительность в секундах и текущую plan revision.
- `npm run typecheck`, `npm run build:web`, `npm run smoke:catalog-mutation` прошли.

### 205. Release regression после catalog UX
- Полный `npm run check:release` прошёл: typecheck, web build, migration/domain/skeleton gates, API bind guard и web proxy.

### 206. Backend probe
- `npm run probe:backends` выполнен без запуска сервисов: текущая сессия не видит llama.cpp `127.0.0.1:8081` и PVE ComfyUI `192.168.10.103:8188` (оба `fetch failed`). Реальный H3 E2E в этой сессии не запускался; требуется поднять/пробросить backend-ы и повторить readiness + worker E2E.

### 207. Release gate после timing schema
- Catalog mutation smoke дополнительно проверяет сохранение `durationSeconds`; `npm run smoke:catalog-mutation` и полный `npm run check:release` прошли.

### 208. Job без дублирования каталога
- `POST /v1/director/jobs` принимает `projectId/sceneId/shotId`; при полном наборе сервер транзакционно проверяет иерархию и не создаёт дубликаты. UI передаёт выбранные IDs из catalog; неполный набор отклоняется.
- Typecheck, web build и полный release gate прошли.

### 209. Reuse integration smoke
- Catalog mutation smoke теперь создаёт job с существующими `projectId/sceneId/shotId` и сверяет counts до/после; проверка подтверждает отсутствие дубликатов и корректную очистку тестовых данных.

### 210. Catalog IDs в provenance
- Compiled job plan теперь содержит immutable `catalog.projectId/sceneId/shotId`; smoke сверяет сохранённые IDs с исходным каталогом.
- `npm run typecheck`, `npm run smoke:catalog-mutation`, `npm run check:release` прошли.

### 211. Director idempotency groundwork
- `PgJobRepository.createDirector` принимает опциональный `idempotencyKey`; для существующего shot повтор с тем же ключом и request hash возвращает replay, а изменённое содержимое даёт `IDEMPOTENCY_CONFLICT`. Это подготовлено для безопасного повторного submit UI; полноценный live E2E требует доступных backend-ов.
- Typecheck и release gate прошли.

### 212. UI idempotent submit
- Web форма теперь передаёт стабильный `idempotencyKey` для выбранного shot и prompt, используя серверный replay/conflict контур при повторной отправке.
- `npm run typecheck` и `npm run build:web` прошли.

### 213. Idempotency failure smoke
- Catalog smoke проверяет retry replay и изменённый request с тем же ключом (`409 IDEMPOTENCY_CONFLICT`); после исправления mapping ошибок smoke и полный release gate прошли.

### 214. Canonical job digests
- Plan и request hash в `PgJobRepository.createDirector` теперь вычисляются канонической JSON-сериализацией с сортировкой ключей. Это устраняет зависимость digest от порядка полей и укрепляет immutable provenance/idempotency.
- Typecheck, catalog smoke и release gate прошли.

### 215. Reordered-payload idempotency
- Smoke дополнительно отправляет семантически тот же payload с другим порядком JSON-полей; canonical hash корректно возвращает replay. Полный release gate остаётся зелёным.

### 216. Live queue refresh
- Web UI обновляет jobs, runtime health и worker nodes каждые 5 секунд и очищает interval при unmount; изменения от worker/оператора видны без ручного обновления.
- `npm run typecheck` и `npm run build:web` прошли.

### 217. Durable PostgreSQL regression
- Независимый durable lifecycle повторно проверен: claim → heartbeat → immutable manifest → commit; `npm run smoke:postgres` прошёл при недоступных GPU backend-ах.

### 218. Worker/CAS regression
- Mock worker E2E повторно прошёл: HTTP hooks → CAS upload → AssetVersion → enriched manifest. GPU backend не требуется для проверки fencing/provenance связки.

### 219. Recovery/runtime regression
- Повторно прошли `smoke:reconcile`, `smoke:reconcile-resolve` и `smoke:runtime-health`: истёкший lease переводится в unknown/reconciling, операторское решение сохраняет manifest, runtime snapshot корректно агрегирует проверки.

### 220. Workflow/reference regression
- Повторно прошли history/transactional activation workflow profiles и H3 reference bindings injection; immutable revisions и подключение references к graph boundary подтверждены.

### 221. Auth regression
- Повторно прошли `smoke:api-auth` и `smoke:worker-auth`: bearer authentication корректно защищает API и worker claim endpoint, при этом loopback-dev режим сохраняет совместимость.

### 222. Failure/interrupt regression
- Повторно прошли failure lifecycle, ComfyUI timeout и interrupt contract: ошибка attempt корректно завершает job, polling timeout не зависает, cancel отправляет interrupt и обрабатывает контракт ответа.

### 223. Result/final-take regression
- Повторно прошли `smoke:job-result`, `smoke:select-output`, `smoke:job-catalog`: manifest и AssetVersions доступны, оператор может выбрать только связанный final take, capability boundary каталога соблюдается.

### 224. H3 starter preflight
- `smoke:h3-starter` прошёл и подтверждает boundary starter workflow. `preflight:h3-starter` не может завершиться: PVE `192.168.10.103:8188` недоступен (`EHOSTUNREACH`); schema smoke после preflight не запускался.

### 225. Runtime restored
- После запуска пользователем llama.cpp и ComfyUI: `/v1/ready` вернул `ready`, `probe:backends` подтвердил llama model `qwen3.5-9b-defiant-mtp-q5km`, ComfyUI 0.34.0 на RTX 5090; live `preflight:h3-starter` успешно обнаружил H3 nodes/boundary. Генерационный submit намеренно не запускался без явного job-подтверждения.

### 226. Reference availability
- ComfyUI `/view` подтвердил наличие обоих входных файлов пользовательского workflow: `bw-intro.jpg` и `bw-intro-1.jpg` (HTTP 200). Это снимает последний вопрос о доступности references; submit H3 job остаётся отдельным GPU-затратным действием.

### 227. Backup и CAS dry-run на текущем runtime
- Создан отдельный локальный backup-каталог `.data/backups/session-20260909T162800Z`: PostgreSQL custom dump и 3 CAS-файла.
- `backup:verify` подтвердил checksum dump и SHA-256 каждого CAS-объекта; `backup:catalog-check` подтвердил 9 обязательных таблиц каталога/очереди.
- `cas:gc-report` просканировал 3 объекта, 2 ссылки из AssetVersion и 0 eligible orphan; `staging:gc-report` также показал 0 кандидатов. Ничего не удалялось.
- Restore rehearsal в отдельную БД по-прежнему требует роли PostgreSQL с `CREATEDB`; рабочая БД не изменялась.

### 228. Restore rehearsal проверяет CAS-провенанс
- `scripts/restore_rehearsal.mjs` теперь после `pg_restore` читает все `AssetVersion.storage_key/sha256`, находит соответствующие объекты в backup CAS и пересчитывает SHA-256.
- Некорректный путь или рассогласование checksum завершают rehearsal с явной ошибкой; успешный результат включает число проверенных CAS-ссылок.
- `node --check scripts/restore_rehearsal.mjs` и полный `npm run check:release` прошли. Фактический rehearsal ожидает локальную PostgreSQL-роль с `CREATEDB`.

### 229. Runtime и recovery повторно подтверждены
- На текущем live-контуре `/ready` вернул `ready`: ComfyUI, llama.cpp и storage доступны.
- `smoke:runtime-health`, `smoke:reconcile-resolve` и `smoke:job-result` прошли: runtime snapshot, операторское разрешение неизвестной попытки и выдача manifest/AssetVersion работают.
- `backup:restore-preflight` подтвердил, что текущая роль `la6` всё ещё не имеет `CREATEDB`; рабочая БД не изменялась.

### 230. Сквозная регрессия после hardening
- `smoke:catalog-mutation` подтвердил project/scene/shot UX-контракт и идемпотентное создание job без дубликатов.
- `smoke:worker-e2e` подтвердил HTTP hooks → CAS upload → AssetVersion → enriched manifest.
- `smoke:failure-lifecycle` подтвердил корректный переход attempt/job в failed при ошибке исполнителя.

### 231. Live H3 preflight после recovery-проверок
- `probe:backends` подтвердил доступность llama.cpp с моделью `qwen3.5-9b-defiant-mtp-q5km` и ComfyUI 0.34.0 на RTX 5090.
- `preflight:h3-starter` успешно сопоставил live schema (2615 классов) и boundary `MiniMaxH3ReferenceToVideo`/`RandomNoise`/`SaveVideo`; submit остаётся `false`.
- `smoke:h3-references` подтвердил инъекцию image/audio references в immutable workflow graph.

### 232. Immutable profile и auth regression
- `smoke:profile-revisions` и `smoke:profile-revision-activate` подтвердили сохранение истории graph snapshots и транзакционную активацию конкретной revision.
- `smoke:api-auth` подтвердил bearer-защиту API при включённом токене, `smoke:worker-auth` — отдельную защиту claim endpoint worker-а.

### 233. Durable reorder для timeline
- Добавлен `PATCH /v1/scenes/:sceneId/shots/order` и транзакционный `PgJobRepository.reorderShots`.
- Сервер принимает только полный permutation текущих шотов сцены, временно сдвигает позиции для исключения конфликтов и сохраняет новый порядок атомарно.
- Неверная сцена, дубликаты или чужой shot отклоняются без частичной записи.
- `npm run typecheck` и `npm run check:release` прошли.

### 234. Reorder покрыт integration smoke
- `smoke:catalog-mutation` расширен вторым шотом и проверкой перестановки `[shot2, shot1]` через API с чтением сохранённого порядка.
- После исправления проверки поиска шота по ID smoke и полный release gate прошли.

### 235. Timeline reorder UI
- В карточках shots добавлены кнопки перемещения вверх/вниз; UI отправляет полную перестановку на durable API и перечитывает timeline после успешной записи.
- Кнопки корректно отключены на границах списка и не меняют selection при клике.
- `npm run typecheck` и `npm run build:web` прошли.

### 236. Queue/recovery smoke после UI-изменений
- `smoke:metrics` подтвердил Prometheus endpoint.
- `smoke:readiness` подтвердил fail-closed readiness при недоступном backend.
- `smoke:comfy-timeout` и `smoke:comfy-cancel` подтвердили timeout и interrupt-контракты ComfyUI.
- `smoke:select-output` подтвердил выбор только связанного финального take.

### 237. Live queue observation
- Read-only snapshot API: активный worker `local-qwen` остаётся `online`, GPU execution queue не содержит running prompts.
- В очереди присутствуют jobs в `awaiting_approval`; это ожидаемое ручное состояние, не зависшие lease/attempt. Автоматическое approve или удаление не выполнялось.
- Два старых worker instances остаются `stale` и не получают claims; fencing/reconcile-контур сохраняет защиту от повторной доставки.

### 238. Plan/provenance regression
- `smoke:workflow-job-plan` подтвердил immutable capture H3 workflow profile в job plan.
- `smoke:profile-job-source` подтвердил, что ComfyUI job использует активную profile revision.
- `smoke:job-catalog` подтвердил capability boundary каталога, `smoke:plan-hash` — изменение digest при изменении director input.

### 239. Media Pool/CAS regression
- `smoke:asset-upload` подтвердил SHA validation, дедупликацию и создание AssetVersion с привязкой к attempt.
- `smoke:comfy-upload` подтвердил контракт загрузки image/audio reference в ComfyUI.
- `smoke:comfy-collect` подтвердил получение output из ComfyUI history, `smoke:h3-references` — повторную инъекцию references в H3 graph.

### 240. Durable scene reorder API
- Добавлен `PATCH /v1/projects/:projectId/scenes/order` и транзакционный `reorderScenes` с полной permutation-проверкой текущих сцен.
- Позиции сцен обновляются атомарно через временный offset, аналогично shot reorder; ошибки не оставляют частичного порядка.
- `npm run typecheck` и `smoke:catalog-mutation` прошли.

### 241. Scene reorder UI
- Timeline UI подключён к scene-order API: сцены можно перемещать вверх/вниз, после успешной записи перечитывается проект.
- Кнопки отключаются на границах списка и не меняют текущий выбор сцены при клике.
- `npm run typecheck` и `npm run build:web` прошли.

### 242. Scene reorder покрыт integration smoke
- Catalog mutation smoke теперь создаёт две сцены, переставляет их через scene-order API и сверяет сохранённую последовательность.
- `smoke:catalog-mutation` и полный `check:release` прошли; тестовые записи очищаются в транзакционно безопасном cleanup-контуре.

### 243. Release gate после scene UX
- Полный `check:release`, `smoke:catalog-mutation` и `smoke:runtime-health` прошли после добавления scene reorder API/UI.
- Подтверждены typecheck, production web build, contiguous migrations, domain/skeleton contracts, API bind guard и web proxy.

### 244. Durable queue regression
- `smoke:postgres` подтвердил claim → heartbeat → immutable manifest → commit на PostgreSQL.
- `smoke:worker-e2e` подтвердил HTTP hooks → CAS → AssetVersion → enriched manifest.
- `smoke:reconcile` и `smoke:reconcile-resolve` подтвердили recovery истёкшего lease и операторское разрешение unknown attempt.

### 245. Queue UX filter
- В web queue добавлен фильтр по state (all/awaiting approval/queued/running/succeeded/failed/cancelled) и пустое состояние для выбранного фильтра.
- Фильтрация локальная, не меняет durable jobs и сохраняет доступ к approve/cancel/result действиям.
- `npm run typecheck` и `npm run build:web` прошли.

### 246. Scene reorder negative path
- Catalog smoke дополнительно проверяет duplicate scene IDs: API возвращает `400`, а сохранённый порядок не изменяется.
- `npm run smoke:catalog-mutation` прошёл.

### 247. Contract/documentation integrity
- `check:skeleton` подтвердил обязательные файлы, локальные ссылки и workspace-пакеты.
- `check:domain` подтвердил state machine и model-independent GenerationSpec invariants.
- `check:migrations` подтвердил непрерывную цепочку 001..013.

### 248. Live H3 OOM и корректная классификация ошибок
- Авторизованный live H3 submit `e2d9cc1e-d058-447e-a907-ff207316a283` дошёл до ComfyUI, но PVE вернул `torch.OutOfMemoryError` на `MiniMaxH3ReferenceToVideo`; output отсутствует.
- Обнаружен дефект: старый worker трактовал наличие history без проверки `status` как success и записал пустой manifest. `ComfyPromptExecutor.poll` исправлен: `status_str=error|exception` теперь возвращает `failed`.
- Добавлен executor smoke на Comfy history error; он и полный `check:release` прошли. Для применения фикса live worker требуется перезапуск; новый GPU submit до согласования параметров памяти не повторяется.

### 249. Повторный live E2E после worker/API restart
- После перезапуска API и worker создана короткая job `48d6c6c6-ffaa-480a-b857-98ae29eca092` (768×432, 17 кадров) на активном H3 profile.
- Worker корректно перевёл её в `failed`; `/result` не содержит manifest или AssetVersion, ComfyUI queue вернулась к пустому состоянию. Это подтверждает исправленную error-классификацию и отсутствие ложного success.
- Причина требует отдельного чтения ComfyUI execution log/настройки VRAM; автоматический повтор не выполнялся.

### 250. Диагностика ComfyUI execution errors
- `PollResult` и worker executor теперь передают `exception_message` из ComfyUI history (до 1000 символов) в `hooks.fail`, сохраняя полезную причину в failed attempt.
- Общий fallback `BACKEND_FAILED` сохраняется для history без диагностического сообщения.
- Executor smoke, typecheck и полный release gate прошли.

### 251. Финальный live H3 E2E после обновления worker
- После перезапуска worker активная job `05febffa-5f3f-4631-818c-260e81ac8fcf` успешно завершилась; ComfyUI queue вернулась к `running=0,pending=0`.
- `/v1/jobs/:id/result` вернул immutable manifest `68f6046a8471c301dfba290c0fa2bb1591316866d9b38a1eb599052787f04293` и AssetVersion `ea7994c7-b84c-4120-9355-34e90f62d06d` (`video/mp4`, 136865 bytes, SHA-256 `2c9e04c5bb826e71a75d11c07ad2f6e448442bd5335bd114580cca4933c68cdd`).
- Live-контур подтверждён end-to-end: durable job → lease/heartbeat → ComfyUI H3 → CAS → AssetVersion → result API.

### 252. Авторизованный preview результата в web UI
- Результаты AssetVersion теперь загружаются через `apiFetch` с bearer-заголовком и отображаются встроенно как video/audio/image preview.
- Добавлена кнопка Download asset через blob URL; старые object URL освобождаются при смене результата и размонтировании компонента.
- `npm run typecheck` и `npm run build:web` прошли.

### 253. Измерен локальный backup/restore RTO
- На контрольной PostgreSQL базе с 13 таблицами и 3 связанными AssetVersion измерены: создание backup 142 ms, `backup:verify` 81 ms, `backup:catalog-check` 97 ms, изолированный restore rehearsal 279 ms.
- Все операции завершились с кодом 0; restore подтвердил CAS-ссылки и структуру базы. Наблюдаемый локальный end-to-end RTO rehearsal (verify + catalog + restore) составил 457 ms, без учёта ручного переключения координатора.
- Это измерение относится к текущему объёму данных и loopback storage; целевые SLA для большой библиотеки и сетевого PVE ещё требуют отдельного замера.

### 254. Production-выдача CAS-ассетов
- `GET /v1/assets/:assetVersionId` теперь отдаёт immutable cache policy, SHA-256 и безопасный `Content-Disposition` для preview/download.
- Отсутствующий blob классифицируется как `410 ASSET_BLOB_MISSING`, а не как необработанный stream error; это позволяет оператору отличить потерю CAS от отсутствующего AssetVersion.
- Typecheck и полный `check:release` прошли.

### 255. API runtime обновлён после CAS hardening
- Старый API-процесс остановлен и запущен заново с PostgreSQL storage и текущим кодом выдачи AssetVersion.
- Live `/ready` после перезапуска вернул `ready`: ComfyUI, llama.cpp и PostgreSQL доступны.

### 256. Provenance отображается в result/Media Pool
- Result API и timeline теперь включают `AssetVersion.provenance` вместе с SHA-256 и MIME/размером.
- Web UI показывает сокращённый digest и источник provenance для каждого take, сохраняя immutable CAS идентификатор.
- Полный `check:release` прошёл.

### 257. Provenance API runtime применён
- API перезапущен с текущим кодом и PostgreSQL storage; live `/ready` снова подтверждает ComfyUI, llama.cpp и PostgreSQL.

### 258. Live provenance/header verification
- Новый API вернул для контрольного H3 take `attemptState=succeeded`, manifest hash и provenance `{attemptId, fencingToken, logicalName}`.
- `HEAD /v1/assets/ea7994c7-b84c-4120-9355-34e90f62d06d` подтвердил `video/mp4`, точный размер 136865, SHA-256, immutable cache и inline filename.

### 259. Structured API logging
- Fastify API теперь пишет JSON-логи с уровнем `QWEN_LOG_LEVEL` (default `info`); `req.headers.authorization` redacted.
- Release gate прошёл, API перезапущен и `/ready` подтверждает рабочий runtime.

### 260. Fault/auth/metrics regression после logging
- `smoke:failure-lifecycle`, `smoke:reconcile`, `smoke:reconcile-resolve`, `smoke:api-auth` и `smoke:metrics` прошли.
- Логи smoke подтверждают JSON-формат и отсутствие authorization в request log; отказ, истёкший lease и операторское reconcile сохраняют ожидаемые state transitions.

### 261. Capability-aware multi-node scheduling smoke
- Добавлен `npm run smoke:multi-node`: несовместимый online node (`h3=false`) не может claim H3 job, совместимый (`h3=true`) получает её, повторный claim возвращает пустой результат.
- Проверены capability boundary и single-delivery/fencing без запуска второго GPU worker.

### 262. Multi-node/workflow/CAS regression suite
- Последовательно прошли `smoke:multi-node`, `smoke:workflow-profiles`, `smoke:profile-revisions`, `smoke:h3-references`, `smoke:asset-upload` и `smoke:worker-e2e`.
- Подтверждены совместимость узлов, immutable profile revisions, reference injection, SHA/CAS upload и enriched manifest после structured logging.

### 263. Исправлены systemd deployment paths
- Примеры `qwendirector-api`, `qwendirector-worker` и `qwendirector-web` теперь используют фактический путь `%h/Documents/Projects/QwenDirector` для `WorkingDirectory` и `.env`.
- `check:skeleton` подтвердил целостность deployment-документации.

### 264. Optional API TLS hardening
- API поддерживает HTTPS при совместном задании `QWEN_TLS_CERT_FILE` и `QWEN_TLS_KEY_FILE`; неполная пара fail-closed с `QWEN_TLS_CERT_AND_KEY_REQUIRED`.
- Добавлены настройки в `.env.example` и эксплуатационное описание; loopback default не изменён.
- `check:release` прошёл, negative startup check подтвердил отказ при неполной TLS-конфигурации.

### 265. Worker recovery после API restart
- Live `/v1/nodes` подтвердил, что `local-qwen` снова зарегистрирован и имеет свежий heartbeat/status `online` после перезапуска API; старый instance остаётся `stale` и не допускается к claim.

### 266. Реальный HTTPS startup smoke
- На временном loopback-порту API запущен с самоподписанными cert/key; `curl -k https://127.0.0.1:4443/health` вернул `200`.
- После проверки временный процесс остановлен; основной API, worker и ComfyUI не изменялись.

### 267. Runbook синхронизирован с RTO baseline
- `docs/operations.md` теперь содержит измеренные значения backup/verify/catalog/restore и явно отделяет baseline текущего объёма от будущего SLA большой библиотеки или сетевого storage.

### 268. Финальный runtime audit
- `check:release` завершился `OK`; live `/ready` подтверждает ComfyUI, llama.cpp и PostgreSQL.
- Актуальный `local-qwen` online со свежим heartbeat; старый UUID остаётся stale.
- Контрольный H3 AssetVersion доступен с `video/mp4`, корректным размером/SHA-256 и immutable cache headers.

### 269. API read-only load smoke
- Добавлен `npm run smoke:api-load`: 100 параллельных запросов `/health` и `/ready` завершились успешно за 131 ms (≈761 req/s) на текущем workstation.
- Это базовый read-only показатель API; GPU generation load и длительные очереди требуют отдельного окна измерений.

### 270. Load smoke добавлен в operator runbook
- `docs/operations.md` описывает `npm run smoke:api-load`, переменную `QWEN_LOAD_REQUESTS` и ограничение на read-only характер проверки.

### 271. В runbook добавлен systemd lifecycle
- Зафиксированы команды установки user units, `daemon-reload`, `enable --now`, адресного restart API/worker и правило не перезапускать ComfyUI автоматически.

### 272. Durable failure diagnostics
- Migration 014 добавила `attempts.error_detail/error_at`; worker failure hook сохраняет до 4000 символов причины в PostgreSQL.
- `listJobs` и `getJobResult` возвращают error detail, web queue показывает его оператору с усечённым preview и tooltip.
- Миграционный gate и полный `check:release` прошли; API перезапущен, `/ready=ready`.

### 273. Migration 014 applied and failure regression repaired
- Обнаружено, что локальный runner не применяет новые SQL-файлы автоматически; additive migration 014 применена вручную через `psql -v ON_ERROR_STOP=1`.
- После применения `smoke:failure-lifecycle` снова прошёл (`200`, job `failed`); `attempts.error_detail` теперь реально доступен в текущей БД.

### 274. Идемпотентный migration runner
- Добавлен `npm run db:migrate` с таблицей `schema_migrations`; runner применяет только отсутствующие SQL-версии в отдельных транзакциях.
- Повторный запуск на текущей БД применил 013/014 после обнаружения исторически уже существующей схемы и завершился `OK: migrations current (14 files)`.
- Migration 013 сделана повторно безопасной для уже существующего check constraint.

### 275. API systemd pre-start migrations
- `qwendirector-api.service.example` теперь выполняет `npm run db:migrate` перед `apps/api` start; runbook обновлён.
- `check:skeleton` и повторный `db:migrate` завершились успешно (`14 files current`).

### 276. README status synchronized
- README отражает фактически реализованные hardening-контуры: migration runner, optional TLS, structured logs, recovery и измеренный backup/restore baseline.
- Ограничения полного SLA явно оставлены: второй физический worker, длительные fault/load drills и согласованные retention/RPO/RTO.

### 277. Recovery snapshot после migration 014
- Создан `.data/backups/2026-09-09T17-22-58.639Z`; backup manifest, CAS (4 файла), catalog check и isolated restore прошли.
- Restore подтвердил 14 public tables и 3 связанные AssetVersion, включая текущую схему durable error diagnostics.

### 278. Единый check:production
- Добавлен `npm run check:production`: db:migrate → check:release → multi-node smoke → API load smoke.
- Полный прогон прошёл: 14 migrations current, release gate OK, capability scheduling OK, 100 API requests за 108 ms (≈929 req/s).
- Проверка не запускает GPU generation и подходит для pre-deploy/restart контроля.

### 279. Production-check добавлен в README
- Quick-start README теперь начинает production-gates с `npm run check:production`, сохраняя отдельные команды для диагностики и backup.

### 280. Актуальный production baseline
- Повторный `npm run check:production` прошёл полностью: 14 migrations current, release gate OK, multi-node smoke OK, API load 100 requests за 98 ms (≈1025 req/s).

### 281. Операторский retry failed jobs
- Добавлен `POST /v1/jobs/:id/retry` с actor и проверкой последнего approval `retry_budget`; превышение бюджета отклоняется, автоматического запуска нет.
- Успешный retry возвращает job в `awaiting_approval`, сохраняя immutable plan и требуя нового ручного approval; web queue получила кнопку Retry для failed jobs.
- Typecheck/release gate прошли, API перезапущен, `/ready=ready`.

### 282. Retry route wiring и budget negative path
- Исправлена маршрутизация retry на `attempts.jobs.retry`; прежний wiring ошибочно проверял attempt repository и возвращал `501`.
- После перезапуска API существующая failed job с нулевым budget вернула `409 RETRY_BUDGET_EXHAUSTED`, состояние осталось `failed`, новый запуск не создан.

### 283. Production-check после retry changes
- Полный `npm run check:production` прошёл: 14 migrations current, release gate OK, multi-node smoke OK, API load 100 requests за 178 ms (≈563 req/s).

### 284. Retry success integration smoke
- Добавлен `npm run smoke:retry`: при `retry_budget=1` failure job корректно возвращается в `awaiting_approval` через API retry endpoint.
- Подтверждено, что повторная генерация требует нового ручного approval; автоматического claim в smoke нет.

### 285. Production-check расширен retry smoke
- `check:production` теперь включает успешный retry integration smoke между multi-node и API load проверками.
- Полный прогон прошёл: migrations/release/multi-node/retry OK, API load 100 requests за 117 ms (≈852 req/s).

### 286. Worker runtime после production-check
- Live `/v1/nodes` подтверждает актуальный `local-qwen` `online` с heartbeat `2026-09-09T17:27:30Z`; старый UUID остаётся `stale`.

### 287. Auth/readiness/backend control regression
- `smoke:worker-auth`, `smoke:readiness`, `smoke:comfy-timeout` и `smoke:comfy-cancel` прошли после retry/migration changes.
- Подтверждены bearer transport worker, fail-closed readiness и timeout/interrupt контракты ComfyUI без GPU generation.

### 288. H3 result quality diagnosis and duration UX
- Анализ `/home/la6/Downloads/05febffa-5f3f-4631-818c-260e81ac8fcf_00001_.mp4`: 768×432, 24 fps, 22 frames, длительность 0.917 s, H.264/AAC; job plan содержал `length=17`, поэтому это не 5-секундный take.
- В web UI поле ComfyUI H3 заменено на Duration (s); значение автоматически округляется к допустимому H3 кратному 17 (5 s → 124 frames @ 24 fps). Это не меняет автоматически turbo/VRAM-профиль.
- `npm run typecheck` и `npm run build:web` прошли.

### 289. H3 quality contract aligned with reference
- В `docs/workflow-adapter-contract.md` зафиксировано: 5 секунд при 24 fps → 124 кадров; sampler/LoRA/steps остаются immutable profile policy.
- Director Studio reference подтверждает тот же boundary-подход: явные prompt/dimensions/duration/seed/references, выбор final output и отдельное тестирование workflow перед активацией.

### 290. H3 profile selected by default
- Web UI автоматически выбирает первый активный H3 workflow profile и переключает generation adapter на ComfyUI при загрузке профилей.
- Это уменьшает риск случайного manual/llama submit без immutable H3 graph; пользователь всё ещё может явно выбрать другой adapter.
- `npm run typecheck` и `npm run build:web` прошли.

### 291. H3 long-take VRAM warning
- Web UI предупреждает перед approval, если рассчитанная длительность превышает 56 кадров; оператору предлагается проверить свободную VRAM, без автоматического снижения разрешения/качества.
- `npm run typecheck` и `npm run build:web` прошли.

### 292. Production-check после H3 UX hardening
- `check:production` прошёл полностью: migrations/release/multi-node/retry OK, API load 100 requests за 115 ms (≈873 req/s).

### 293. Turbo quality transparency
- Web UI распознаёт выбранный H3-профиль с `LoraLoaderModelOnly` turbo LoRA и показывает предупреждение: режим экономит VRAM, но может снижать детализацию.
- Предупреждение не меняет immutable graph и не запускает GPU автоматически; оператор осознанно выбирает профиль перед approval.
- `npm run typecheck` и `npm run build:web` прошли.

### 294. H3 regression verification
- H3 workflow/profile/preflight/references и workflow-job-plan smoke-тесты прошли после изменения UX длительности и turbo warning.
- `npm run check:production` прошёл: 14 migrations current, release/multi-node/retry OK, API load 100 requests за 105 ms (≈951 req/s).

### 295. Manifest export boundary
- Добавлен `GET /v1/jobs/:id/export`: выдаёт результат job как скачиваемый immutable JSON manifest с `content-disposition`, `no-store` и 404 для отсутствующего результата.
- Web helper скачивает manifest через авторизованный fetch/Blob; токены не сохраняются в URL.
- `npm run typecheck` и `npm run build:web` прошли.

### 296. Runtime export verification
- После перезапуска API `/ready` вернул `ready` (ComfyUI, llama.cpp и PostgreSQL online).
- Для существующей успешной H3 job export endpoint вернул HTTP 200, JSON manifest с `job_id`, `content-disposition` и `cache-control: no-store`.

### 297. Recovery and CAS verification
- `backup:restore-preflight` подтвердил `canCreateDatabase=true` и `restoreRehearsal=ready`.
- Новый локальный backup `.data/backups/2026-09-09T17-38-10.938Z` прошёл `backup:verify` (database + 4 CAS records) и `backup:catalog-check` (9 обязательных таблиц).
- CAS/staging GC dry-run просканировал 4 объекта, 3 ссылки; удаляемых orphan-объектов нет.

### 298. Export regression gate
- Добавлен `scripts/smoke_export.mjs`; `check:production` теперь проверяет HTTP export manifest, attachment header, `no-store` и соответствие `job_id`.
- Полный production-check прошёл: migrations/release/multi-node/retry/export OK, API load 100 requests за 144 ms (≈695 req/s).

### 299. Full lifecycle smoke verification
- Worker E2E (heartbeat → CAS upload → AssetVersion → enriched manifest), reconcile/resolve, runtime health, worker auth, readiness fail-closed, ComfyUI timeout и cancel smoke-тесты прошли.
- Проверка не запускала новую GPU-генерацию и не меняла инфраструктуру PVE.

### 300. Manifest export UI action
- В web UI добавлена видимая команда `Export current manifest` для текущей созданной job; скачивание выполняется через авторизованный Blob flow.
- `npm run typecheck` и `npm run build:web` прошли.

### 301. Contract documentation and static gates
- README уточнён: production-check включает проверку attachment/no-store/job_id для manifest export.
- `check:skeleton` и `check:domain` прошли (13 обязательных файлов, 20 Markdown-документов, 8 workspace-пакетов; state machine и idempotency invariants OK).

### 302. UI idempotency input coverage
- Исправлен UI idempotency key: теперь он включает prompt, adapter, H3 duration/frames, dimensions, seed, workflow profile и отсортированные references.
- Изменение параметров больше не может ошибочно replay-нуть job с прежним execution plan; неизменный набор входов по-прежнему дедуплицируется.
- typecheck/build, `smoke:plan-hash` и `smoke:workflow-job-plan` прошли.

### 303. Live H3 preflight and node state
- `preflight:h3-starter` подтвердил boundary H3 (`h3NodeId=6`, `noiseNodeId=5`, `saveNodeId=7`) и наличие требуемых ComfyUI classes; submit не выполнялся.
- Live `/v1/runtime`: ComfyUI H3 ready и llama.cpp online; `/v1/nodes` показывает актуальный `local-qwen` online, старые регистрации — stale.

### 304. Catalog and Media Pool integration verification
- Catalog, catalog mutation, asset upload/SHA validation, job result, final output selection и storage-boundary smoke-тесты прошли.
- Подтверждены project → scene → shot операции, порядок сцен/шотов и связывание immutable AssetVersion с attempt/result.

### 305. H3 readiness regression
- `preflight:h3-starter` и `smoke:h3-starter` прошли на PVE ComfyUI; runtime подтвердил H3 capability и online worker.

### 306. Job queue offcanvas UX
- Основной inline Job queue скрыт; добавлена кнопка `Jobs` со счётчиком незавершённых задач.
- Очередь перенесена в UIkit right offcanvas: фильтр состояний и действия approve/retry/cancel/reconcile/result доступны без перегрузки рабочего экрана.
- `npm run typecheck` и `npm run build:web` прошли.

### 307. Offcanvas visual verification
- Через локальный UI подтверждено: кнопка `JOBS 21` открывает правую панель, в ней отображаются фильтр и действия для awaiting approval/succeeded/failed jobs; основной экран остаётся доступен.

### 308. Production gate after UI redesign
- Полный `npm run check:production` прошёл после offcanvas UX: migrations/release/multi-node/retry/export OK, API load 100 requests за 122 ms (≈816 req/s).

### 309. Empty-catalog onboarding
- Добавлен видимый onboarding card «Начнём с проекта» при пустом каталоге; первый проект можно создать без предварительного состояния или ручного API-вызова.
- typecheck, web build и `check:skeleton` прошли.

### 310. Release gate after onboarding
- `npm run check:release` прошёл: typecheck/web-build, migration/domain/skeleton, API bind guard и web proxy checks OK.

### 311. Project catalog filtering
- В Project catalog добавлен live-фильтр по имени проекта; select показывает только совпадения и сохраняет существующую загрузку timeline.
- typecheck и web build прошли.

### 312. Selected project filter safety
- Фильтр всегда сохраняет выбранный project option, даже если он не совпадает с поисковой строкой; native select не теряет текущее значение.
- typecheck и web build прошли.

### 313. Queue refresh affordance
- В offcanvas Job queue добавлена явная кнопка `Refresh`; оператор может вручную синхронизировать список без закрытия панели.
- typecheck и web build прошли.

### 314. Shot duration form sync
- При выборе shot в Timeline его сохранённая длительность автоматически подставляется в форму генерации; H3 frame conversion и idempotency key используют это значение.
- typecheck и web build прошли.

### 315. Project context isolation
- При переключении проекта UI сбрасывает scene/shot и выбранные Media Pool references, затем загружает новый timeline; references не переносятся случайно между проектами.
- typecheck и web build прошли.

### 316. No-worker operator warning
- Health-блок UI показывает предупреждение, если зарегистрированные worker-узлы есть, но ни один не online; это отделяет доступность API от фактической исполнимости очереди.
- typecheck и web build прошли.

### 317. Постоянные skills для интерфейсного качества
- Установлен готовый skill `design-taste-frontend` из открытого репозитория `Leonxlnx/taste-skill`; он используется для audit-first проверки визуальной иерархии, типографики, цвета, motion и защиты от шаблонного «AI UI».
- Создан и валидирован локальный skill `interface-taste` для сложного product UI QwenDirector: project → scene → shot, progressive disclosure, рабочая плотность, операционные drawer-панели, accessibility и обязательная визуальная проверка.
- Ограничение зафиксировано явно: официальный Taste ориентирован прежде всего на выразительный frontend, поэтому для studio/dashboard UX его визуальные правила применяются совместно с продуктовым skill, а не вместо него.

### 318. Studio workspace redesign
- Главный экран переработан в адаптивное трёхколоночное рабочее пространство: библиотека проектов, редактор генерации, сцены и медиатека.
- Очередь задач и runtime/API-настройки вынесены в отдельные правые offcanvas-панели; сырой workflow JSON и node bindings скрыты в раскрываемом блоке расширенных настроек.
- Добавлены единые semantic color tokens, системная светлая/тёмная тема, спокойный синий accent, согласованные радиусы, focus-state и reduced-motion режим.

### 319. UI copy и операционная ясность
- Удалён скрытый inline-дубль Job queue; очередь теперь представлена в DOM только один раз.
- Локализованы состояния и действия задач, выбор финального дубля, управление сценами/шотами, длительность и provenance-подписи.
- Header actions объединены в адаптивную группу, поэтому появление команды экспорта не перекрывает кнопки очереди и настроек.

### 320. Проверка redesign
- `npm run typecheck` и `npm run build:web` прошли; production bundle собран Vite без ошибок.
- Визуальная проверка локального экрана 1440×1000 подтвердила рабочую трёхколоночную композицию, читаемую тёмную тему, отсутствие горизонтального переполнения и свёрнутые advanced controls; при ширине 720 px интерфейс корректно перестраивается в один поток.

### 321. Сверка с актуальным Director Studio
- По актуальному README Director Studio выделены дополнительные продуктовые поверхности: typed Actor/Scene/Prop/Layout workbenches, Picture/Audio reference roles, conversational shot planning, пошаговый workflow import и exclusive VRAM coordination.
- QwenDirector уже закрывает project/scene/shot catalog, общий Media Pool, локальный H3 workflow, durable jobs, approval/recovery, CAS/provenance и manifest export. Разрывы и безопасная очередность реализации занесены в [reference-director.md](reference-director.md).

### 322. Безопасный импорт workflow из UI
- В advanced H3-настройках добавлен импорт API-format JSON-файла. Он только заполняет редактор и не сохраняет/активирует профиль автоматически.
- Сохранение, H3 boundary validation и preflight остаются явными действиями оператора; immutable workflow snapshot job не изменён.
- `npm run typecheck` и `npm run build:web` требуется повторить после перезапуска локального dev server.

### 323. Канонический API-экспорт H3 сохранён как fallback
- Проверен файл `/home/la6/Downloads/video_minimax_h3_r2v_api.json`: 26 узлов, `MiniMaxH3ReferenceToVideo=136`, `RandomNoise=129`, `SaveVideo=92`; boundary validator проходит.
- Экспорт соответствует текущему профилю по графу, но содержит исходную конфигурацию без turbo LoRA (`Enable Lightning LoRA=false`, 56 steps). Активная revision 4 остаётся production-вариантом с turbo 4-step для контролируемого времени/VRAM.
- Файл не активировался автоматически; его можно импортировать через advanced H3 settings и использовать для отдельной ревизии после явного preflight.

### 324. Typed reference roles в Media Pool
- План job теперь сохраняет роль каждого reference (`picture`, `actor`, `set`, `prop`, `audio`) вместе с `assetVersionId`, filename и MIME type.
- UI Media Pool получил явный выбор роли; audio-ассеты ограничены ролью `audio`, image-ассеты — визуальными ролями. Роли участвуют в idempotency key, поэтому смена роли не может ошибочно переиспользовать старый план.
- API валидирует role/MIME compatibility и возвращает `400 INVALID_REFERENCE_ROLE` до создания job при некорректной комбинации.
- `npm run typecheck` и `npm run check:production` прошли: 14 migrations current, release/multi-node/retry/export/API-load OK.

### 325. Workflow revision history в UI
- Backend API `GET /v1/workflow-profiles/:id/revisions` и атомарная активация revision теперь доступны из advanced H3 controls.
- UI показывает revision number и graph hash, а активация требует явного подтверждения; новые jobs используют выбранный immutable snapshot, уже созданные jobs не меняются.
- Исправлена нормализация `graph_hash → graphHash` для отображения профилей, импортированный API-export можно сопоставлять с активной ревизией.
- `npm run typecheck` и `npm run build:web` прошли.

### 326. Durable shot prompt drafts
- Миграция `015_shot_prompt.sql` добавляет к shot JSON режиссёрского черновика и отдельный `prompt_revision`; изменение черновика увеличивает также `plan_revision`.
- Timeline read-model возвращает сохранённый prompt, а UI подставляет его при выборе shot и предоставляет явную кнопку «Сохранить черновик шота».
- Добавлен `PATCH /v1/shots/:id/prompt`; сохранённый draft не изменяет уже созданные jobs и становится входом только при следующем submit.
- `npm run typecheck`, `npm run db:migrate` и `npm run check:release` прошли; в локальной БД применено 15 миграций.

### 327. Shot prompt persistence smoke gate
- Добавлен `scripts/smoke_shot_prompt.mjs`: create project/scene/shot → PATCH prompt → read timeline → проверка `prompt_revision`/`plan_revision` и отказа от массива вместо объекта.
- `smoke:shot-prompt` включён в `check:production`; полный production gate прошёл с 15 миграциями, release, multi-node, retry, export, shot-prompt и API-load.

### 328. Exclusive execution lock per worker node
- Миграция `016_node_execution_lock.sql` добавляет partial unique index: у одного node не может быть более одной active attempt (`leased`, `running`, `unknown`).
- PostgreSQL claim дополнительно исключает busy node через `NOT EXISTS`; это закрывает параллельную выдачу двух GPU-heavy jobs одному worker и сохраняет безопасный `SKIP LOCKED` flow.
- `smoke_multi_node` расширен вторым queued job и подтверждает, что занятый compatible node не получает новую задачу; полный `check:production` прошёл с 16 миграциями.

### 329. Финальный output boundary для ComfyUI
- `ComfyPromptExecutor.collect` теперь принимает только outputs единственного validated `SaveVideo` node из execution graph; промежуточные изображения и служебные outputs не попадают в CAS/Media Pool.
- Совместимый fallback сохранён для executor без graph, а H3 worker всегда передаёт immutable workflow snapshot.
- `smoke:comfy-collect` дополнен промежуточным output и включён в `check:production`; проверено, что скачивается только финальный video asset.

### 330. Операторский retry budget
- Approval UI теперь позволяет задать число повторов после ошибки (`0–10`); значение передаётся и из основной формы, и из Job Queue offcanvas.
- Backend уже хранит retry budget в approval и ограничивает повторный запуск; UI больше не скрывает эту operational policy.
- `npm run typecheck` и полный `npm run check:production` прошли.

### 331. Project manifest export
- Добавлен `GET /v1/projects/:projectId/export`: локальный no-store attachment с project metadata, сценами, shot prompt/plan revisions и ссылками Media Pool на immutable AssetVersion.
- UI получил действие «Экспорт проекта» в библиотеке проектов; CAS-байты не дублируются, манифест сохраняет их content-addressed ссылки.
- Добавлен `smoke:project-export`; после штатного перезапуска API live export вернул 200, attachment/no-store и корректный `project_id`.
- Полный `npm run check:production` прошёл с project export gate.

### 332. Live production audit after API restart
- `/ready` вернул `ready`: PostgreSQL, ComfyUI и llama.cpp отвечают; runtime capability сообщает `comfyui.h3=true` и классы `MiniMaxH3ReferenceToVideo`, `RandomNoise`, `SaveVideo`.
- Активный worker `local-qwen` (RFC4122 node id `00000000-0000-4000-8000-000000000001`) online; старые регистрации остаются `stale` и видны recovery read-side.
- Последний успешный H3 result `05febffa-5f3f-4631-818c-260e81ac8fcf` содержит ровно один финальный asset `comfy-92-0-…mp4` с MIME `video/mp4`; исторический turbo result `4132c77d…` сохранён immutable с прежней ошибочной MIME-меткой и не переписывается.
- Это подтверждает сохранность production storage после перезапуска API и корректную работу нового final-output boundary для новых executions.

### 333. Project export включает job lifecycle
- Project manifest теперь содержит read-only `jobs[]`: state, plan hash, adapter, scene/shot, latest attempt state, error detail и timestamps.
- CAS-байты и workflow graph не дублируются: экспорт сохраняет ссылки и immutable hashes, поэтому подходит для backup/переноса операционного контекста.
- `smoke:project-export` проверяет `jobs[]`, `project_id`, attachment и `no-store`; после перезапуска API и полный `check:production` прошли.

### 334. UX-переработка рабочего пространства
- Основной экран перестроен вокруг пользовательского цикла «выбрать шот → описать → отправить»: добавлена контекстная шапка с текущим проектом/сценой/шотом и явным состоянием.
- Редкие действия создания сущностей, режиссёрские параметры и формат генерации переведены в progressive disclosure через `<details>`, чтобы не перегружать первый экран.
- Prompt стал визуальным центром редактора; технический JSON/ответы API скрыты в секции «Технические сведения», а CTA и статус получили отдельную иерархию.
- Сохранены Job Queue и Settings в offcanvas, Media Pool и timeline; обновлены адаптивные правила для узких экранов.
- Проверки: `npm run typecheck`, `npm run build:web`; headless visual QA 1440×1000 подтверждён, overflow не обнаружен.

### 335. Production gate после UX-изменений
- `npm run check:production` прошёл полностью: 16 миграций, release checks, multi-node fencing, retry, job/project export, prompt persistence, ComfyUI final-output boundary и API-load (838 req/s в smoke).
- Дополнительно выполнена визуальная проверка narrow viewport 720×1200: контекст, действия, библиотека и редактор складываются в один последовательный мобильный поток без горизонтального overflow.

### 336. Backup/readiness audit
- Live `/ready` подтвердил доступность PostgreSQL, ComfyUI и llama.cpp (`status=ready`).
- Создан локальный backup с 4 CAS-файлами; `backup:verify` и `backup:catalog-check` прошли.
- CAS и staging GC выполнены в dry-run режиме: удаляемых orphan-объектов нет.

### 337. Production gate расширен worker E2E
- `check:production` теперь включает `smoke:worker-e2e`, чтобы каждый production gate проверял полный mock worker flow: claim → heartbeat → HTTP asset upload → CAS/AssetVersion → enriched manifest.
- Gate прошёл после изменения; итоговый API-load smoke: 999 req/s.

### 338. Recovery restore rehearsal
- Для последнего локального backup выполнен `backup:restore-preflight`: текущий пользователь может создать изолированную БД, rehearsal готов.
- `backup:restore-rehearsal` завершился успешно в отдельной базе: восстановлены 13 public tables и проверены 2 CAS AssetVersion links.
- Рабочая БД и текущий CAS при rehearsal не изменялись.

### 339. H3-specific contract audit
- `smoke:runtime-health` и `smoke:comfy-schema` подтвердили readiness и allowlisted MiniMax H3 node schema.
- `smoke:h3-references` подтвердил typed reference bindings, а `smoke:worker-h3-injection` — инъекцию snapshot без изменения immutable profile.
- `smoke:profile-revision-activate` подтвердил транзакционную активацию workflow revision.

### 340. Единый лабораторный gate
- В `package.json` добавлен `npm run check:lab` — единая проверка локальной H3-лаборатории.
- Gate последовательно проверяет fail-closed readiness, runtime health, allowlisted ComfyUI schema, H3 reference bindings, immutable worker injection, transactional profile activation и worker→CAS E2E.
- `npm run check:lab` завершился успешно на текущем локальном контуре.

### 341. PVE H3 workflow preflight
- `preflight:h3-starter` получил фактическую схему ComfyUI с PVE `192.168.10.103:8188`; boundary подтверждён (`MiniMaxH3ReferenceToVideo`, `RandomNoise`, `SaveVideo`), submit не выполнялся.
- `smoke:h3-starter` и `smoke:h3-workflow` прошли: starter graph соответствует boundary contract и валидируется до отправки.

### 342. ComfyUI recovery contract audit
- Проверены `smoke:comfy-upload`, `smoke:comfy-cancel` и `smoke:comfy-timeout`: загрузка references, interrupt и timeout работают по контракту.
- `smoke:reconcile` и `smoke:reconcile-resolve` подтвердили безопасный путь expired lease → unknown → reconciling и ручное разрешение с manifest.
- Новая GPU-генерация не запускалась; проверка изолирована на контрактном уровне.

### 343. Live process inventory
- На момент проверки слушают ожидаемые порты API `127.0.0.1:4310`, web `::1:5173`, llama.cpp `:8081` и PostgreSQL `:5432`.
- Отдельный `apps/worker` process и активный systemd-user worker unit не обнаружены; это эксплуатационный gap для следующего реального queued H3 E2E.
- GPU-задача автоматически не запускалась, чтобы не менять состояние лаборатории без явного запуска worker.

### 344. Worker поднят и heartbeat подтверждён
- Worker запущен штатной командой `npm --workspace apps/worker run start` в отдельной сессии.
- `GET /v1/nodes` подтвердил активный node `00000000-0000-4000-8000-000000000001`, instance `local-qwen`, статус `online`, heartbeat обновляется.
- Очередь не инициировалась и GPU generation не запускалась; worker оставлен работающим для следующего контролируемого E2E.

### 345. Queue safety audit перед live H3
- В live queue обнаружены старые `awaiting_approval` smoke jobs с неполными графами и без references; автоматически approve/retry их нельзя.
- Production profile `video-minimax-h3-r2v` присутствует в API, worker online и heartbeat актуален.
- Следующий live E2E должен использовать только production profile, валидированный starter boundary и явно выбранные references; некорректные smoke jobs оставить без запуска до отдельной очистки/архивации.

### 346. Worker stability after queue audit
- Worker оставался без ошибок в течение контрольного интервала; heartbeat node `00000000-0000-4000-8000-000000000001` обновился до `18:30:49`.
- В состояниях `queued/leased/running` задач нет, поэтому worker не захватил старые smoke jobs и не инициировал GPU execution.

### 347. Security checks включены в production gate
- `check:production` расширен smoke-проверками API bearer auth, worker claim auth и non-loopback bind guard.
- Полный gate прошёл: auth-контракты, durable lifecycle, worker E2E и API-load (1046 req/s) подтверждены одной командой.

### 348. Live readiness + heartbeat follow-up
- После контрольного интервала worker node `local-qwen` остаётся `online`, heartbeat обновляется (`18:31:30`).
- `/ready` снова вернул `ready`; ComfyUI, llama.cpp и storage отвечают 200.

### 349. Runtime health visibility in primary UX
- В контекстную шапку UI добавлены компактные live-пилюли `ComfyUI готов/недоступен` и количество online workers.
- Индикаторы используют уже загруженные runtime/nodes данные и не создают новый backend coupling; Settings остаётся местом подробной диагностики.
- `npm run typecheck` прошёл.

### 350. Combined production/lab verification
- Последовательно выполнены `npm run check:production` и `npm run check:lab` после добавления runtime health pills в UI.
- Web build, auth/bind guards, durable lifecycle, worker E2E, H3 schema/profile/reference contracts и readiness прошли; API-load smoke: 912 req/s.

### 351. Финальная visual QA после health pills
- Headless screenshots 1440×1000 и 720×1200 проверены после добавления live-индикаторов.
- Контекстная шапка, ComfyUI/worker health, основной prompt flow и responsive stacking отображаются без overlap и горизонтального overflow.

### 352. Worker documentation synchronized
- Обновлён `apps/worker/README.md`: удалено устаревшее утверждение, что реализации нет; описаны registration/heartbeat/claim, llama.cpp и ComfyUI H3 execution paths, HTTP-only persistence boundary и штатный запуск.

### 353. Observability включена в production gate
- `check:production` теперь включает `smoke:metrics`; `/metrics` отдаёт Prometheus-compatible counters `qwendirector_http_requests_total` и `qwendirector_http_errors_total`.
- Live endpoint проверен: 2052 requests, 0 errors на момент аудита.

### 354. Release regression audit
- `npm run check:release` прошёл после изменений gate/UI; migration, domain, skeleton, auth bind и web proxy checks зелёные.
- Дополнительно `smoke:job-catalog`, `smoke:job-result` и `smoke:select-output` подтвердили capability boundary, выдачу manifest/assets и выбор финального take.

### 355. Operator runbook commands synchronized
- README теперь явно различает `check:production` (код/схема/безопасность/durable lifecycle) и `check:lab` (живые H3 runtime/schema/profile/reference/worker).

### 356. Documentation/domain consistency check
- `check:skeleton` и `check:domain` прошли после обновления README и worker runbook: 49 локальных ссылок, обязательные документы и state-machine invariants корректны.

### 357. Live state checkpoint
- Worker `local-qwen` остаётся `online`, heartbeat `18:35:04`; `/ready` возвращает `ready`.
- Активных `queued/leased/running` jobs нет; live H3 execution не инициирован автоматически.

### 358. Idempotency and immutable plan audit
- `smoke:plan-hash` и `smoke:prompt` подтвердили детерминированный prompt compiler и изменение plan hash при изменении director input.
- `smoke:workflow-job-plan` подтвердил capture immutable H3 workflow profile в job plan; повторный конфликт корректно отклоняется.
- `smoke:profile-job-source` подтвердил, что ComfyUI job берёт graph только из активного profile после preflight.

### 359. Clean checkout release verification
- `package.json` корректно экспонирует `check:production` и `check:lab`; команды выводят полный состав проверок без скрытых ручных шагов.
- Повторный `npm run check:release` прошёл: web build, typecheck, migration/domain/skeleton/auth/bind/proxy guards — OK.

### 360. Duplicate worker cleanup
- В live process inventory обнаружены два worker с одним node identity; интерактивный дубликат остановлен штатным SIGINT.
- Остался один worker process, node `local-qwen` продолжает иметь статус `online` и обновляемый heartbeat.

### 361. Worker singleton checkpoint
- Повторная проверка process list обнаружила ровно один реальный `node .../tsx src/main.ts` worker; единственный online node соответствует ему.

### 362. Worker environment readiness
- У активного worker заданы `QWEN_API_BASE_URL` и `QWEN_NODE_ID`; остальные параметры используют безопасные defaults (`local-qwen`, ComfyUI `192.168.10.103:8188`, poll 1s).
- Значения секретов не выводились; проверка выполнена только по наличию переменных.

### 363. Pre-live-E2E checkpoint
- `/ready` остаётся `ready` по всем трём зависимостям; online worker ровно один, heartbeat `18:37:15`.
- Jobs в `queued/leased/running/reconciling` отсутствуют; лаборатория готова к явному операторскому approve production H3 job.

### 364. Stable PVE preflight checkpoint
- Повторный `preflight:h3-starter` получил актуальную PVE schema и завершился с `submit: false`.
- `/ready` вернул `ready`; в process list ровно один worker `tsx src/main.ts`.

### 365. Roadmap status synchronized
- `docs/roadmap.md` получил фактическую статус-сводку по этапам 0–4: подтверждённые production-oriented части отделены от незакрытых SLA/preview требований.

### 366. Roadmap documentation gate
- После синхронизации roadmap `check:skeleton` и `check:release` прошли; локальные ссылки и production web/type/domain guards корректны.

### 367. Catalog/result regression checkpoint
- `smoke:catalog`, `smoke:catalog-mutation`, `smoke:job-result` и `smoke:select-output` прошли после последних изменений; project/scene/shot CRUD, idempotency, manifest/assets и final-take selection работают.

### 368. Fresh full production gate
- Свежий `npm run check:production` прошёл после roadmap/README изменений: auth, metrics, multi-node, retry, export, prompt, final output, worker E2E и API-load (878 req/s).

### 369. Lab gate повторён на живом worker
- `npm run check:lab` повторён на текущем live-контуре; readiness/runtime/schema, H3 references, immutable profile activation и worker E2E завершились `OK`.

### 370. Operator handoff checkpoint
- Live `/ready`: `ready`; online workers: `1`; активные `queued/leased/running/reconciling` jobs: `0`.
- Контур стабилен и готов к ручному запуску только валидированной production H3 job.

### 371. Live H3 E2E attempt and safe recovery
- После явного разрешения создана и утверждена новая job `eeb0a312-1d80-4784-89b4-41572388e74d` с production profile `video-minimax-h3-r2v` и двумя импортированными image AssetVersion references.
- Worker получил lease, но ComfyUI queue осталась пустой: submit завис до постановки prompt. Cancel не завершился за контрольный интервал.
- Worker остановлен штатным SIGTERM; `POST /v1/admin/reconcile` нашёл attempt `54055fc8-e2e0-4dab-91d6-6560627e07fd`, ручное reconcile с decision `failed` завершило job без потери CAS/БД.
- Это реальный отрицательный E2E: durable lease/cancel/reconcile работают, но production worker transport требует отдельной диагностики перед повторным GPU запуском.

### 372. Comfy transport hang fix
- Причина подтверждена: `uploadComfyReference` и `ComfyPromptExecutor.submit` выполняли network fetch без deadline; при PVE transport stall attempt оставался `leased` до lease expiry.
- Добавлены `overwrite=true` для повторяемых reference filenames и `AbortSignal.timeout(30_000)` для upload/submit requests.
- Typecheck и `smoke:comfy-upload`/`smoke:comfy-timeout` прошли; текущая зависшая job безопасно reconciled в `failed`.
- Следующий live E2E должен повториться после запуска worker с этим кодом; таймаут теперь переводит ошибку через hooks вместо бесконечного ожидания.

### 373. Media Pool UX redesign
- Media Pool переработан по итогам UX-аудита: CAS hashes и raw byte counters убраны из primary view; вместо них показываются имя файла, тип, размер в KB, иконка, роль reference и скрытая provenance-информация.
- Визуальная иерархия следует progressive disclosure и human-readable asset intake паттернам; технические идентификаторы доступны только через `i` details.
- Headless visual QA 1440×1000 подтверждена; `npm run typecheck` и `npm run build:web` прошли.

### 374. Режиссёрский workspace переработан
- Основной экран больше не является формой из трёх равноправных колонок: слева появился компактный навигатор `проект → сцена → шот`, в центре — единственный рабочий стол выбранного шота, справа — контекстный инспектор Media Pool. Очередь и диагностика сохранены в offcanvas-панелях.
- Убран редактируемый на главном экране дублирующий контекст `Project / Scene / Shot`: выбор шота автоматически заполняет бриф, режиссёрские поля и длительность. `loadTimeline` также выбирает первый доступный шот, чтобы начальный экран не показывал «Новый проект» поверх реального каталога.
- Рабочая последовательность стала явной: ключевой кадр и бриф → вкладка «Режиссура» → вкладка «Генерация» → единственное действие «Подготовить задачу». Workflow JSON и revisions остались за «Расширенными настройками».
- Выполнены `npm run typecheck` и `npm run build:web`; headless visual QA 1440×1000 подтвердила новый desktop layout. Нужна следующая ручная оценка в браузере на реальном сценарии с несколькими сценами/шотами и, при необходимости, следующая итерация по её результатам.

### 375. Превью референса в рабочем кадре
- Выбранный первый reference теперь автоматически загружается через CAS endpoint и отображается в stage рабочего шота; пользователь видит визуальную опору до подготовки задачи, а не только строку имени в Media Pool.
- Для изображения и видео используется соответствующий нативный preview; при снятии всех выделений объектная URL освобождается. Существующий просмотр результата задачи продолжает использовать тот же безопасный preview pipeline.
- `npm run typecheck` и `npm run build:web` прошли после изменения.

### 376. Навигация и выбор финального дубля
- В инспекторе «Дубли» добавлена последовательная навигация по output-ассетам (`←/→`), счётчик текущего варианта и отдельное визуальное состояние previewed/final.
- Выбор финального take остаётся явным операторским действием через существующий `POST /v1/jobs/:id/select-output`; UI теперь поддерживает просмотр вариантов без возврата к JSON/result panel.
- Проверки `npm run typecheck`, `npm run build:web` и `check_skeleton.py` прошли.

### 377. Живой контур повторно поднят и проверен
- Read-only проверка показала `/ready=ready`: PostgreSQL, ComfyUI и llama.cpp доступны; ComfyUI capability snapshot содержит H3 classes и `h3=true`.
- Worker был остановлен в live-контуре; он запущен штатно с `QWEN_NODE_ID=local`, повторно зарегистрировал UUID-узел и обновил heartbeat. Пустой claim-цикл работает, активных jobs нет.
- `npm run check:production` и `npm run check:lab` завершились `OK`. Реальный GPU generation в этой сессии не запускался, чтобы не создавать незапланированный расход VRAM/очередь.

### 378. Production checkpoint подтверждён по текущей БД
- Активный профиль `video-minimax-h3-r2v` доступен на revision 4, `active=true`, с H3 boundary и reference bindings.
- В каталоге CAS присутствует успешный H3 output `video/mp4`; `GET /v1/jobs/05febffa-5f3f-4631-818c-260e81ac8fcf/result` возвращает succeeded attempt, manifest hash и связанный AssetVersion.
- Live API показывает отсутствие активных jobs; worker зарегистрирован и heartbeat обновляется. Повторный GPU запуск не требуется для этого checkpoint.

### 379. Исправлены исторические MIME метаданные CAS
- Добавлена миграция `017_repair_video_mime.sql`: для уже сохранённых output-ассетов с immutable logical filename `.mp4/.webm/.mov/.mkv` MIME приводится к соответствующему `video/*`; изображения и неоднозначные записи не затрагиваются.
- Миграция применена к локальной PostgreSQL (`17 files`); успешный исторический H3 job теперь возвращает `video/mp4`, согласованный с output filename и CAS preview.
- `npm run check:production` прошёл полностью после миграции.

### 380. Restore rehearsal выполнен в изолированной БД
- Создан свежий локальный backup `2026-09-09T21-02-51.948Z` с database dump и 6 CAS records.
- `backup:verify` подтвердил manifest и контрольные суммы; `backup:catalog-check` подтвердил 9 обязательных таблиц.
- `backup:restore-rehearsal` успешно восстановил dump в отдельную временную PostgreSQL БД: 14 public tables и 5 AssetVersion CAS links проверены, рабочая БД не изменялась.
- RPO/RTO, длительные fault/load drills и политика retention остаются эксплуатационными решениями, которые нужно согласовать отдельно.

### 381. CAS и staging retention guard подтверждён
- `npm run cas:gc-report` просканировал 6 CAS-объектов: 5 referenced, 0 eligible orphan при grace period 24 часа.
- `npm run staging:gc-report` не нашёл eligible staging-файлов.
- Оба отчёта работают в режиме `dry-run`; автоматическое удаление не выполняется. Это подтверждает безопасный retention guard без риска потерять результат или reference.

### 382. Runtime health возвращён в постоянный контекст UI
- После workspace redesign состояние ComfyUI и worker было доступно только через «Настройки». В верхнюю панель добавлен компактный постоянный health-снимок с semantic цветами (`готов`, `нет worker`, `недоступен`).
- Операционный статус остаётся discoverable, а подробные latency/capabilities и node list по-прежнему скрыты в offcanvas Settings.
- `npm run typecheck` и `npm run build:web` прошли.

### 383. Systemd templates hardened
- Примеры user units для API/web/worker получили явные зависимости `network-online` и API; worker/web не стартуют раньше координатора.
- Для API и worker добавлены `ProtectSystem=strict`, `ProtectHome=read-only`, ограниченный `ReadWritePaths` для `.data` и graceful `TimeoutStopSec`; web получил read-only home и доступ только к `apps/web/dist`.
- Изменены только `.service.example`: units не устанавливались и не перезапускали пользовательские сервисы. `check_skeleton.py` и `check:release` прошли.
- Попытка `systemd-analyze verify` напрямую отклонена самим инструментом для файлов с суффиксом `.service.example`; это ограничение имени примера, а не ошибка unit-содержимого. Переименование/установка units в системе намеренно не выполнялись.

### 384. Restore baseline обновлён по актуальной схеме
- На backup с 17 миграциями, 14 public tables, 5 AssetVersion links и 6 CAS records измерены: backup 140 ms, verify 80 ms, catalog check 100 ms, isolated restore 290 ms.
- Baseline записан в `docs/operations.md`; он является локальным измерением, не заявленным SLA для большой библиотеки или сетевого хранилища.

### 385. Systemd hardening добавлен в release gate
- Добавлен dependency-free `scripts/check_systemd_examples.mjs` и команда `npm run check:systemd`: проверяются секции unit, зависимости API/network, `ProtectSystem`, `ProtectHome`, ограниченные `ReadWritePaths` и stop timeout.
- `check:release` теперь включает `systemd-hardening`; проверены все 4 example units.
- `npm run check:systemd` и `npm run check:release` завершились `OK`.

### 386. Полный production и lab gate после hardening
- После добавления systemd gate и MIME-repair повторно выполнены `npm run check:production` и `npm run check:lab`.
- Все migration/release/auth/multi-node/retry/export/CAS/worker-load проверки, H3 schema/profile/reference и worker hooks завершились `OK`.
- API load smoke: 100 запросов за 98 ms (~1021 req/s); GPU job в рамках gate не создаётся.

### 387. Быстрые действия каталога возвращены в shot tree
- В новом дереве проекта снова доступны rename и изменение порядка шотов; действия появляются рядом с выбранным/наведённым шотом и не конкурируют с основным кликом выбора.
- Восстановлены вызовы существующих `PATCH /v1/shots/:id` и `/order`; структура остаётся доступной с клавиатуры через отдельные buttons.
- `npm run typecheck`, `npm run build:web` и `npm run check:systemd` прошли.

### 388. Visual QA после shot actions и health strip
- Headless visual QA повторена на 1440×1000 и 720×1000 после добавления shot tools и постоянного runtime health strip.
- В desktop и narrow layout нет горизонтального overflow; tree actions остаются компактными, health status читается без открытия Settings, основной CTA сохраняет позицию.

### 389. Live MiniMax H3 E2E после перезапуска worker
- Создан новый короткий job `7fd0c9e6-9ed8-4c78-b111-3044f2cf8b6e` с активным profile `video-minimax-h3-r2v`, 17 frames, 768×432 и без новых uploads; выполнен explicit approval с `retryBudget=0`.
- Worker claim → ComfyUI submit → poll → collect → CAS commit завершились `succeeded` за один короткий проход. Attempt manifest hash: `ab1e7c3eadf9da4998756c7e6be89eb4b1982d9abc774fc78aa4080bca8a5d61`.
- Output `b9e4a0bb-0bb1-4234-8dc5-549a8f1e651f` имеет MIME `video/mp4`, скачан через `/v1/assets/:id` и распознан как ISO MP4; PVE `/queue` после завершения показывает `running=0`, `pending=0`.

### 390. Визуальный sanity-check live output
- Из нового AssetVersion извлечён контрольный frame 768×432 на 0.4 s; PNG валиден и содержит различимый H3-сгенерированный black-and-white jazz кадр без признаков пустого/повреждённого output.
- Проверка не подменяет художественную оценку качества и не меняет immutable result.

### 391. R2V reference transport diagnosis
- Новый короткий R2V job `f4f09878-a700-4cb5-b3a5-f799e524062d` с двумя CAS image references получил lease, но не создал PVE prompt; `/queue` оставалась `running=0,pending=0`.
- Прямой `curl` к PVE `/upload/image` с уникальным filename также возвращает HTTP 500 за ~13 ms. Job отменён штатно, admin reconcile перевёл attempt `42afbf71-bb39-4a42-a8fa-5fa59eecf331` в `failed`; зависший lease не оставлен.
- `uploadComfyReference` теперь включает очищенное тело ошибки PVE (до 500 символов) в exception detail. `typecheck`, `smoke:comfy-upload` и `smoke:comfy-timeout` прошли. Следующий R2V запуск требует исправления/проверки upload endpoint в PVE, а не повторной постановки той же задачи.

### 392. Исправлен и подтверждён реальный R2V upload
- Причина HTTP 500 найдена: в multipart поле ComfyUI `type` передавалось как media type (`image`/`audio`), тогда как PVE ожидает storage target (`input/temp/output`). `uploadComfyReference` теперь всегда отправляет `type=input`, сохраняя image/audio только в доменном reference contract.
- После перезапуска worker создан job `fb9ec367-1d1b-4223-9cf5-3c210274e359` с двумя CAS image references; lifecycle `claim → upload → H3 submit → poll → collect → CAS` завершился `succeeded`.
- Manifest hash `c9cb4402aaae40404d179ec7db9995802e75f065adcd57c4e5a59d836ff6e933`; output AssetVersion `ed88cd1a-4ee0-41a2-812a-4c969566b389`, MIME `video/mp4`, H.264/AAC, 768×432, 0.917 s. PVE queue после run пуста.
- `typecheck`, `smoke:comfy-upload` и `smoke:comfy-collect` прошли.

### 393. Визуальный sanity-check реального R2V output
- Из `ed88cd1a-4ee0-41a2-812a-4c969566b389` извлечён контрольный frame: валидный PNG 768×432 с различимым цветным cyberpunk-портретом, соответствующим импортированному reference-контексту.
- MP4 подтверждён как H.264/AAC, длительность 0.917 s (17 кадров при 24 fps), размер 122231 bytes; PVE queue пуста.

### 394. Full gates после исправления R2V upload
- После изменения multipart `type=input` повторно выполнены `npm run check:production` и `npm run check:lab`; migration, release, auth, multi-node, CAS, H3 profile/reference и worker lifecycle checks завершились `OK`.
- API load smoke в production gate: 100 запросов за 103 ms (~967 req/s); live GPU jobs в рамках gate не создаются.

### 395. Live R2V final-take decision
- Для успешного job `fb9ec367-1d1b-4223-9cf5-3c210274e359` операторское решение записано через `POST /v1/jobs/:id/select-output`: финальный AssetVersion `ed88cd1a-4ee0-41a2-812a-4c969566b389`, actor `live-operator`.
- Повторный вызов того же выбора вернул `200` и тот же AssetVersion без создания дополнительной строки; `GET /v1/jobs/:id/result` возвращает selection отдельно от неизменяемого manifest hash.

### 396. Clean production checkpoint после R2V
- Текущий API `/ready` сообщает `ready` по ComfyUI, llama.cpp и PostgreSQL; PVE queue пуста (`0 running / 0 pending`).
- Каталог jobs не содержит активных `queued/leased/running/reconciling` попыток.
- `npm run check:release` повторно прошёл полностью, включая systemd hardening, 17 migrations и web/type/domain/security gates.

### 397. README синхронизирован с R2V production state
- Главный README обновлён на 2026-09-10: явно отражены успешный R2V E2E с двумя CAS references, исправленный `type=input`, выбор final take, CAS persistence и пустая PVE queue после прогона.
- Ограничения не скрыты: второй физический worker, длительные fault/load drills и согласование RPO/RTO/retention остаются отдельными SLA-задачами.
- `check_skeleton.py` и `check:release` прошли.

### 398. Retention guard после R2V обновлён
- После live R2V в CAS просканировано 8 объектов: 7 referenced, 0 eligible orphan при grace period 24 часа.
- Staging GC также не нашёл eligible файлов; dry-run не удалил ни один объект.
- Result read-model успешного R2V продолжает возвращать выбранный final AssetVersion и неизменяемый manifest hash.

### 399. Job detail переведён на полноценный durable read-model
- `GET /v1/jobs/:id` в PostgreSQL-режиме теперь возвращает не только plan, но и каталог проекта/сцены/шота, timestamps отмены и последний attempt (`attempt_id`, state, fencing token, lease, heartbeat sequence, error detail).
- Это устраняет разрыв между Job Queue и фактическим состоянием worker после перезапуска API: UI может восстанавливать карточку задачи только из PostgreSQL, без in-memory fallback.
- `npm run typecheck` и `npm run check:release -- --skip-build` прошли; миграции и web build остаются зелёными.

### 400. Job Queue подключена к durable detail
- В offcanvas Job Queue добавлено отображение состояния последней попытки и адаптера; для каждой задачи доступна команда «Подробнее», читающая `/v1/jobs/:id` из PostgreSQL.
- Кнопка «Результат» показывается только для терминальных состояний, чтобы не создавать ложное ожидание результата у queued/running jobs.
- `npm run typecheck` и production web build прошли.

### 401. История попыток доступна оператору
- Добавлен `GET /v1/jobs/:id/attempts`: возвращает все попытки задачи в PostgreSQL с node, fencing token, lease, heartbeat, состоянием и ошибками.
- Действие «Подробнее» в Job Queue теперь объединяет durable job detail и полную историю попыток, что позволяет разбирать retry/reconcile после перезапуска worker.
- `npm run typecheck`, `npm run check:release -- --skip-build` и `smoke_job_result` прошли.

### 402. История попыток визуализирована в Job Queue
- После «Подробнее» в offcanvas появляется компактная лента attempt history: состояние, node и время создания, а при наличии — короткая причина ошибки.
- Технический JSON сохранён как диагностический fallback, но основной recovery-сценарий теперь читается без ручного разбора payload.
- `npm run typecheck` и production web build прошли.

### 403. Reconcile получил подтверждение оператора
- Действие reconcile теперь требует явного подтверждения и передаёт решение вместе с provenance (`reconciledBy`, `decision`).
- API-контракт поддерживает оба исхода (`success` и `failed`); текущая кнопка ошибки использует новый безопасный обработчик.
- `npm run typecheck` прошёл.

### 404. В Job Queue доступны оба решения reconcile
- Для состояния `reconciling` UI теперь показывает отдельные действия «Признать успешной» и «Зафиксировать ошибку».
- Оба действия требуют подтверждения и используют общий API с явным decision/provenance; успешный путь сохраняет manifest reconcile.
- `npm run typecheck` и `smoke_reconcile_resolve` прошли.

### 405. Полный production/lab gate после recovery UI
- `npm run check:production` прошёл: 17 миграций, release/security gates, auth, retry/export, CAS worker E2E и API load (~1000 req/s).
- `npm run check:lab` прошёл: readiness fail-closed, runtime health, ComfyUI H3 schema, references, immutable profile injection, revision activation и worker E2E.
- После проверок активных queued/leased/running задач не создавалось; изменения готовы к следующему live R2V прогону.

### 406. Live runtime checkpoint перед следующим R2V
- API `/ready` вернул `ready`: PostgreSQL, ComfyUI и llama.cpp доступны.
- `/v1/runtime` подтвердил H3 capability (`MiniMaxH3ReferenceToVideo`, `RandomNoise`, `SaveVideo`); online worker `local-qwen` присутствует.
- ComfyUI queue пуста (`0 running / 0 pending`), поэтому следующий live R2V можно запускать без очистки зависших задач.

### 407. Durable attempt history защищена smoke-тестом
- Добавлен `smoke:job-attempts`, который создаёт реальную PostgreSQL job/attempt и проверяет `GET /v1/jobs/:id/attempts` через Fastify inject.
- Smoke включён в `check:production`; endpoint подтверждён с реальным `attempt_id`, а не только статическим контрактом.
- `npm run smoke:job-attempts` и `npm run typecheck` прошли.

### 408. Job Queue получила heartbeat observability
- `/v1/jobs` теперь включает `lease_expires_at` и `heartbeat_seq` последней попытки; Queue показывает heartbeat рядом с состоянием worker.
- Оператор видит признак активности lease до открытия полной истории попыток.
- `npm run typecheck` и `smoke:job-catalog` прошли.

### 409. Lease отображается в человеческом виде
- В карточке задачи добавлен относительный lease-индикатор: «lease ещё N с» или «lease истёк».
- Значение вычисляется от durable `lease_expires_at` и обновляется вместе с очередью каждые 5 секунд.
- `npm run typecheck` и production web build прошли.

### 410. Production gate включает attempt history
- Полный `npm run check:production` прошёл после добавления `smoke:job-attempts`.
- Подтверждены 17 миграций, release/security, auth, retry/export, durable attempt history, ComfyUI collect, CAS worker E2E и API load 1024 req/s.

### 411. Добавлена компактная полоса timeline
- В центральном рабочем поле появилась read-only последовательность всех шотов проекта с общей длительностью.
- Клик по сегменту переключает текущий shot; существующие формы, queue и Media Pool не изменены.
- Полоса горизонтально прокручивается на узких экранах; `npm run typecheck` и production web build прошли.

### 412. Исправлено смешивание контекста Queue и результата
- При открытии результата задачи история попыток предыдущей job очищается, поэтому в интерфейсе не остаются устаревшие recovery-данные.
- `npm run typecheck` прошёл.

### 413. Timeline получила контекст сцены
- Каждый сегмент timeline теперь имеет native tooltip с названием сцены; одинаковые названия шотов различимы при наведении.
- Изменение не добавляет состояния и не меняет модель данных; `npm run typecheck` прошёл.

### 414. Lab gate после timeline и recovery UI
- `npm run check:lab` прошёл полностью: readiness, runtime health, ComfyUI schema, H3 references, immutable profile injection/revision activation и worker E2E.

### 415. Timeline показывает сцену непосредственно
- В каждом сегменте timeline теперь видны номер, название сцены, название шота и длительность; tooltip сохранён для длинных названий.
- `npm run typecheck` прошёл.

### 416. Timeline meta-иерархия отполирована
- Подпись сцены оформлена вторичным мета-текстом с обрезанием длинных названий; основной акцент остаётся на названии shot.
- `npm run typecheck` прошёл.

### 417. Runtime checkpoint после UI-полировки
- `/ready` снова вернул `ready`; PostgreSQL, ComfyUI и llama.cpp доступны.
- Worker `local-qwen` остаётся `online` с актуальным heartbeat; исторические node-записи корректно отмечены `stale`.
- ComfyUI queue пуста (`0 running / 0 pending`), инфраструктура готова к следующему live H3 R2V.

### 418. Release gate после timeline metadata
- `npm run check:release` прошёл: typecheck, web build, 17 migrations, domain/skeleton/auth, proxy и systemd hardening.
- Production bundle собирается без предупреждений, timeline и lease-индикаторы не нарушили контракт приложения.

### 419. Открытая attempt history обновляется автоматически
- Выбранная job запоминается в UI; каждые 5 секунд история попыток перечитывается из `/v1/jobs/:id` и `/v1/jobs/:id/attempts` вместе с очередью.
- Оператор видит актуальные переходы состояния без ручного повторного открытия карточки.
- `npm run typecheck` прошёл.

### 420. Release gate после live attempt refresh
- `npm run check:release` прошёл: web build, typecheck, migrations, domain/skeleton/auth, proxy и systemd hardening.
- Автообновление attempt history не изменило API-контракты и не вызвало регрессий сборки.

### 421. Roadmap синхронизирован с текущим UI
- Статус обновлён на 2026-09-10: timeline overview добавлен в этап Assets/preview.
- Незакрытыми явно остаются полноценный TresJS compositor, второй физический worker, длительные fault/load drills и согласование SLA RPO/RTO.

### 422. Повторный live H3 R2V E2E подтверждён
- Создан и утверждён job `88fb4b91-63c5-4a35-bf73-357d38054ee9` с активным профилем `video-minimax-h3-r2v` и CAS image reference.
- Worker/ComfyUI завершили lifecycle `queued → succeeded`; manifest hash `0fcd110ff2526cd269563f044775b333d287e42d1b71e30587dab005d3b7da07`, output AssetVersion `bd039fa2-b91f-454a-86ac-dd15a7c1251a` (`video/mp4`, 116370 bytes).
- Final take выбран оператором через API; ComfyUI queue после прогона пуста.

### 423. CAS output прошёл физическую проверку
- Последний выбранный AssetVersion скачан через `/v1/assets/:id` из CAS без обхода API.
- `ffprobe` подтвердил контейнер MP4, H.264 video 768×432, AAC audio и длительность 0.917 s.
- Файл распознаётся как ISO Base Media; результат пригоден для дальнейшего preview/download в UI.

### 424. Визуальная проверка live R2V preview
- Из последнего MP4 извлечён первый кадр 768×432; PNG валиден и визуально пригоден для режиссёрского preview: различимы персонаж, световой контраст и окружение.
- Проверка выполнена на байтах, полученных через CAS API, а не на исходном файле ComfyUI.

### 425. Production acceptance checklist формализован
- В `docs/operations.md` добавлен обязательный checklist выпуска: второй физический worker, fault-drills, RPO/RTO/retention/quota, backup rehearsal и fencing после ротации credentials.
- Документ явно отделяет подтверждённый локальный single-worker контур от условий масштабирования production.

### 426. Зафиксирована H3 quality A/B стратегия
- Текущий `minimax_h3_ref2v_turbo_4step_v0.1` обозначен как draft/скоростной профиль; его нельзя считать quality-default без сравнения.
- Для 8-step теста требуется отдельный immutable profile с теми же seed/prompt/references/resolution/length; сравниваются identity, motion, audio, VRAM и latency.

### 427. UI помечает 4-step как draft
- При выборе turbo-профиля UI явно предупреждает, что 4-step — скоростной draft, пока не выполнено сравнение с 8-step quality-профилем.
- Это предупреждение не блокирует подготовку задачи и не меняет immutable workflow snapshot.
- `npm run typecheck` прошёл.

### 428. 8-step quality blocker подтверждён повторно
- Повторный запрос ComfyUI `/object_info` показывает для `LoraLoaderModelOnly` только H3 4-step LoRA; 8-step Ref2VA/PDD файл по-прежнему отсутствует.
- A/B quality-прогон сейчас нельзя проводить корректно без разрешённой установки совместимой 8-step модели и перезапуска ComfyUI.

### 429. H3 preflight проверяет наличие LoRA
- `preflightH3Runtime` теперь сопоставляет `LoraLoaderModelOnly.inputs.lora_name` профиля с каталогом LoRA из ComfyUI `/object_info`.
- Профиль с отсутствующей LoRA отклоняется до активации с кодом `COMFY_MISSING_LORA`; это защищает будущий 8-step профиль от дорогого заведомо неверного запуска.
- `npm run typecheck`, `smoke:profile-revision-activate` и `smoke:h3-profile` прошли.

### 430. Негативный LoRA preflight закреплён smoke-тестом
- `smoke:h3-preflight` теперь проверяет отказ профиля при отсутствующей LoRA (`COMFY_MISSING_LORA`) и сохраняет проверку обязательных H3-классов.
- `npm run smoke:h3-preflight` и `npm run typecheck` прошли.

### 431. Production gate после LoRA guard
- `npm run check:production` прошёл полностью: 17 migrations, release/security, auth, retry/export, attempt history, ComfyUI collect, CAS worker E2E и API load 1061 req/s.
- Проверка подтверждает, что quality preflight добавлен без регрессии текущего 4-step production-контура.

### 432. Clean runtime после quality gate
- `/ready` сообщает `ready`, ComfyUI queue пуста, queued jobs отсутствуют.
- В durable catalog нет `leased/running/cancel_requested/reconciling` задач; 24 `awaiting_approval` — исторические подготовленные jobs, не активные исполнения.

### 433. README синхронизирован с quality-ограничением H3
- README теперь явно называет текущий 4-step Turbo draft-профилем и указывает, что 8-step A/B невозможен до установки совместимой LoRA в PVE.
- `check_skeleton.py` и `npm run typecheck` прошли.

### 434. Сверка продуктовых поверхностей с Director Studio
- Добавлена `docs/reference-parity.md` с матрицей: закрытые durable execution возможности, отсутствующие Actor/Scene/Prop workflows, Layout study, structured six-section H3 prompt, custom workflow wizard, local Director planner, VRAM exclusivity и packaging.
- Зафиксирован порядок следующего этапа: structured H3 prompt → typed Media Pool → Layout → custom workflow wizard → local planner → VRAM coordinator/second worker → portable packaging.
- README получил ссылку на parity backlog.

### 435. Индикатор полноты режиссёрского брифа
- В контракт добавлены стабильные секции `prompt/camera/action/composition/lighting/sound/transition` и helper `getDirectorPromptCompleteness`.
- В shot editor появился ненавязчивый readiness-индикатор 0–100% и подсказка о незаполненных секциях; это не ломает быстрый draft и не меняет immutable snapshot.
- `npm run typecheck` и `check_skeleton.py` прошли.

### 436. Readiness сохранён в immutable job plan
- `createDirector` теперь вычисляет `promptCompleteness` тем же контрактным helper и сохраняет `filled/missing/score` в `plan_json`.
- Метрика доступна для аудита и будущих quality-gates без блокировки draft-режима и без изменения уже созданных задач.
- `npm run typecheck` и `check_skeleton.py` прошли.

### 437. Typed Media Pool metadata
- Миграция `018_asset_catalog_metadata.sql` добавляет `asset_kind` и `tags` к `asset_versions` с безопасным default `reference`.
- Импорт ассета принимает проверяемые `assetKind/tags`, сохраняя типизацию в CAS-каталоге; поддержаны actor/scene/prop/audio/layout/reference/video/other.
- `npm run typecheck` и `check_skeleton.py` прошли. Existing imports остаются обратно совместимыми через default.

### 438. Typed metadata surfaced by asset catalog API
- `listAssets` теперь возвращает `asset_kind` и `tags` для project-scoped и global Media Pool выдачи.
- Это позволяет UI и будущему поиску фильтровать ассеты по назначению без чтения provenance вручную.
- `npm run typecheck` и `npm run check:migrations` прошли (18 миграций).

### 439. Media Pool filter by asset kind
- В инспекторе добавлен фильтр `Все типы/Персонажи/Локации/Предметы/Аудио/Layout/Референсы/Видео`.
- В строке ассета отображается `asset_kind`, полученный из API; выбор референса и существующие роли остаются совместимыми.
- `npm run typecheck` и `npm run check:migrations` прошли.

### 440. Тип и теги при импорте ассета
- В Media Pool добавлены поля типа и тегов перед загрузкой файла.
- UI отправляет `assetKind/tags` в `/v1/assets/import`; backend валидирует и сохраняет их в `asset_versions`.
- `npm run typecheck` и `npm run check:migrations` прошли.

### 441. Lineage при импорте ассета
- `/v1/assets/import` принимает `derivedFromAssetVersionIds`; backend проверяет существование родителей и сохраняет связь в provenance.
- Отсутствующий родитель отклоняется с `LINEAGE_PARENT_NOT_FOUND`; CAS blobs остаются неизменяемыми.
- `npm run typecheck` и `npm run check:migrations` прошли.

### 442. Детальный AssetVersion возвращает lineage metadata
- `GET /v1/assets/:assetVersionId` теперь возвращает provenance, `asset_kind`, tags и `created_at` вместе с CAS storage metadata.
- Операторские preview/export инструменты могут восстановить происхождение без отдельного запроса к БД.
- `npm run typecheck` и `npm run check:migrations` прошли.

### 443. Production gate после typed/lineage изменений
- Миграция 018 применена в PostgreSQL; `npm run check:production` прошёл полностью: release/security, auth, multi-node, retry/export, shot prompt, attempt history, Comfy collect, worker E2E и API load (1101 req/s).
- Runtime-контур не получил регрессий после расширения AssetVersion metadata.

### 444. API для просмотра AssetVersion lineage
- Добавлен `GET /v1/assets/:assetVersionId/lineage`, возвращающий тип/теги ассета и метаданные всех родительских версий.
- Ответ строится только из immutable CAS-каталога и provenance; отсутствующий ассет даёт 404.
- `npm run typecheck` и `npm run check:migrations` прошли.

### 445. PVE 8-step LoRA и реальный прогон подтверждены
- Свежий `/object_info` PVE объявляет `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors`; 4-step Ref2V также доступен.
- Операторский 8/8 прогон завершился успешно за 272.13 s; два 4/4 прогона ранее заняли 3.86 и 4.68 s.
- Следующий quality gate: подтвердить, что доступная 8-step FL2V LoRA совместима с нашим Ref2V workflow; затем создать отдельный immutable quality-профиль и провести одинаковый A/B (seed/prompt/refs/size/length) по визуальной оценке и VRAM/latency.

### 446. Guard FL2V LoRA в Ref2V профиле
- H3 preflight теперь отклоняет граф `MiniMaxH3ReferenceToVideo`, если он пытается загрузить LoRA с `fl2v` в имени (`COMFY_INCOMPATIBLE_LORA`).
- Smoke-тест закрепляет missing-LoRA и FL2V/Ref2V incompatibility cases; это предотвращает ложный quality-профиль до подтверждения совместимого файла.
- `npm run typecheck` и `npm run smoke:h3-preflight` прошли.

### 447. Live lab gate после LoRA guard
- `npm run check:lab` прошёл: readiness fail-closed, runtime health, allowlisted Comfy schema, H3 reference injection, immutable profile activation и worker CAS E2E.
- Текущий live runtime остаётся пригодным для отдельного quality A/B; FL2V/Ref2V guard не ломает существующий контур.

### 448. Lineage endpoint smoke и источник ускорения H3
- Добавлен `smoke:asset-lineage` в `check:production`; реальный PostgreSQL smoke подтвердил 200 и возврат родительского AssetVersion.
- Пользователь указал видео с практиками ускорения MiniMax H3; YouTube не отдал содержимое через автоматический просмотр, поэтому настройки из ролика не считаются проверенными фактами.
- Любые ускорения (LoRA/steps/VRAM offload) далее фиксируем отдельной immutable revision и проверяем одинаковым A/B.

### 449. Полный production gate с lineage smoke
- `npm run check:production` прошёл после добавления `smoke:asset-lineage`: 18 migrations, release/security, auth, multi-node, retry/export, shot prompt, job attempts, lineage, Comfy collect, worker E2E и API load 1141 req/s.
- PostgreSQL каталог и runtime-контур остаются чистыми после smoke cleanup.

### 450. Найден кандидат на настоящий 8-step Ref2VA
- Официальные/первичные описания Comfy-Org подтверждают, что доступная `minimax_h3_fl2v_turbo_8step...` относится к FL2V, а отдельные PDD-Acc материалы публикуют `minimax_h3_ref2va_pdd_acc_8step_comfyui.safetensors` для Ref2VA.
- Кандидат только зафиксирован в runbook; скачивание/установка не выполнялись. Нужны лицензия, digest, совместимость UNet и явное разрешение перед изменением PVE.

### 451. H3 preflight quality classification
- Preflight возвращает `qualityHint`: `draft-4step`, `quality-8step` или `unknown` по фактической LoRA профиля.
- Классификация информационная и не подменяет визуальный A/B; FL2V/Ref2V incompatibility guard срабатывает раньше.
- `npm run typecheck` и `npm run smoke:h3-preflight` прошли.

### 452. Quality hint отображается в UI
- После preflight UI показывает оператору `4-step draft`, `8-step quality` или `не определён` рядом с кнопкой проверки профиля.
- Ошибка несовместимого FL2V/Ref2V по-прежнему показывается в техническом результате и не позволяет принять профиль.
- `npm run typecheck` и `npm run smoke:h3-preflight` прошли.

### 453. Матрица H3-оптимизаций по транскрипции ролика
- Добавлена `docs/h3-optimization-lab.md`: отдельные immutable кандидаты 4-step draft, Ref2VA 8-step quality, Sage/Soul + Block Cache и latent upscale.
- Зафиксированы одинаковые A/B-параметры и метрики (latency, peak VRAM, identity, motion, texture, flicker, audio sync).
- Экспериментальные custom nodes не устанавливались; FL2V/Ref2V смешивание запрещено.

### 454. Инвентаризация H3 optimization nodes в PVE
- `/object_info` PVE обнаружил `MiniMaxH3MemoryEfficientSageAttentionPatch`, `EasyCache`, `LazyCache`, `LatentUpscale` и `LatentUpscaleBy`; Soul Attention не обнаружен.
- `preflightH3Runtime` теперь возвращает `optimizationNodes`, чтобы UI/аудит видел доступные ускорители без включения их в граф.
- Наличие класса не считается доказательством совместимости; нужен отдельный workflow smoke на целевой GPU.

### 455. Optimization inventory отображается в UI
- Результат preflight рядом с quality hint показывает доступные optimization nodes PVE.
- Список информационный: UI не меняет graph и не активирует ускорители автоматически.
- `npm run typecheck` и `npm run smoke:h3-preflight` прошли.

### 456. Release gate после optimization inventory UI
- `npm run check:release` и `check_skeleton.py` прошли: production web build, 18 migration contract, domain/skeleton, bind guard, proxy и systemd hardening.

### 457. Runtime snapshot перед quality A/B
- `/ready` = `200 ready`; ComfyUI и llama.cpp healthy, storage healthy.
- `/v1/runtime`: ComfyUI H3 capability доступна, latency 161 ms; текущий `local-qwen` worker online с heartbeat менее минуты назад.
- Durable jobs не показывают активного исполнения в snapshot; исторические stale nodes сохранены для аудита и не назначаются scheduler.

### 458. Optimization nodes в runtime health
- `/v1/runtime` для ComfyUI теперь публикует `capabilities.optimizationNodes` из `/object_info`.
- Оператор видит доступность Sage patch/EasyCache/LatentUpscale ещё до preflight профиля; включение в graph остаётся отдельным immutable экспериментом.
- `npm run typecheck` и `npm run smoke:runtime-health` прошли.

### 459. Optimization inventory в runtime panel UI
- Runtime panel теперь показывает список доступных PVE ускорителей рядом со статусами ComfyUI/llama.cpp.
- Типизация runtime DTO расширена `optimizationNodes`; `npm run typecheck` прошёл.

### 460. Runtime optimization inventory smoke
- `smoke:runtime-health` теперь проверяет содержимое `capabilities.optimizationNodes`, включая Sage patch и EasyCache.
- Контракт observability защищён от тихой потери inventory при изменениях `/v1/runtime`.

### 461. Runtime smoke включён в production gate
- `check:production` теперь запускает `smoke:runtime-health` вместе с auth, jobs, lineage, Comfy collect, worker E2E и API load.
- Полный gate после изменения прошёл; API load 1109 req/s.

### 462. Lab gate после runtime observability
- `npm run check:lab` прошёл полностью: readiness, runtime health с optimization inventory, Comfy schema, H3 references, immutable profile activation и worker CAS E2E.

### 463. Воспроизводимая карточка H3 A/B
- В `docs/h3-optimization-lab.md` добавлен manifest-шаблон контрольного прогона: graph/profile/model digests, входы, latency/VRAM, output hash и ручные quality scores.
- A/B разрешён только при одинаковых входах и `workflow_mode`; изменение LoRA/UNet/attention/cache требует новой immutable revision.

### 464. Typed metadata в timeline read-model
- Timeline и job result queries теперь включают `asset_kind` и `tags`, поэтому Media Pool получает одинаковые metadata для глобальных и привязанных к шоту ассетов.
- `npm run typecheck` и `npm run smoke:shot-prompt` прошли.

### 465. Production gate после typed timeline metadata
- Полный `npm run check:production` прошёл после изменения timeline/job result queries; включены runtime inventory и lineage smoke.
- Worker CAS E2E и API load также зелёные (1011 req/s).

### 466. Сброс stale preflight state в UI
- При смене workflow-профиля UI очищает предыдущие `qualityHint` и optimization inventory до новой проверки.
- Это исключает ложное отображение 4-step/8-step статуса от ранее выбранной ревизии.
- `npm run typecheck` прошёл.

### 467. Сброс preflight при смене execution mode
- При переключении llama.cpp/ComfyUI preflight quality и optimization inventory также очищаются.
- H3-specific readiness больше не отображается в нерелевантном execution mode.
- `npm run typecheck` прошёл.

### 468. Layout reference role в job contract
- Director job API и PostgreSQL validation теперь принимают роль `layout` для image AssetVersion.
- Семантика остаётся композиционной Picture reference; роль не превращается в I2V first-frame.
- `npm run typecheck` и `npm run smoke:shot-prompt` прошли.

### 469. Быстрое назначение Layout в Media Pool
- В инспекторе добавлено действие «Назначить выбранное как Layout» для выбранных AssetVersion.
- Действие меняет только роль reference в текущем shot draft; Layout остаётся композиционным Picture reference и попадает в immutable job snapshot при submit.
- `npm run typecheck` прошёл.

### 470. Layout selection visibility
- UI показывает счётчик выбранных Layout references рядом с действием назначения.
- Это делает композиционные refs явными до submit и не меняет семантику H3 boundary.
- `npm run typecheck` прошёл.

### 471. Повторяемая установка user-units
- Добавлен `scripts/install_user_units.sh`: устанавливает только API/worker/web шаблоны в user systemd и делает daemon-reload/enable.
- Скрипт намеренно не останавливает и не запускает процессы, чтобы не прерывать ручную лабораторию.
- `bash -n scripts/install_user_units.sh` и `check_skeleton.py` прошли.

### 472. User-units установлены в локальной лаборатории
- Скрипт установки выполнен: `qwendirector-api.service`, `qwendirector-worker.service` и `qwendirector-web.service` установлены и включены в user target.
- Все юниты пока `inactive`, текущий API продолжает работать вручную через `tsx`; это предотвращает двойной запуск и конфликт портов.
- Для переключения после остановки ручных процессов использовать `systemctl --user start qwendirector-api.service qwendirector-worker.service qwendirector-web.service`, затем проверить `/ready` и `/v1/runtime`.

### 473. Production user-unit smoke и исправление запуска API
- Выявлен и исправлен эксплуатационный дефект шаблонов: user systemd не наследовал NVM PATH, а API unit не задавал `QWEN_API_AUTOSTART=true`.
- В шаблоны добавлены явный Node 24 PATH и autostart-флаг API; units перезагружены.
- API теперь `active`, `/ready` отвечает 200, а `/v1/runtime` в живом процессе показывает H3 optimization inventory: SageAttention, EasyCache, LazyCache и LatentUpscale варианты.
- Worker и web preview также запущены units; worker пока не регистрируется, если его `QWEN_API_BASE_URL`/token не совпадают с локальным API, это следующий runtime-конфигурационный check.

### 474. PostgreSQL user-unit runtime подтверждён
- API unit переведён на PostgreSQL socket URL с peer-аутентификацией; явные `QWEN_STORAGE=postgres` и `DATABASE_URL` задаются в `ExecStart`, чтобы не переопределяться лабораторным `.env`.
- После исправления `%`-экранирования systemd API и worker активны; `GET /v1/nodes` отвечает 200 и показывает `local-qwen` online.
- `/v1/runtime` продолжает отдавать ComfyUI H3 capability и optimization inventory; web preview активен на `127.0.0.1:4173`.
- Первый worker registration может логировать transient fetch failure во время рестарта API, но heartbeat/регистрация после готовности API подтверждены состоянием node `online`.

### 475. Readiness-gate для worker unit
- В `qwendirector-worker.service.example` добавлен `ExecStartPre`, ожидающий `/ready` API до 30 секунд перед запуском worker.
- При рестарте API+worker проверено: оба units `active`, node `local-qwen` снова `online`; гонка старта больше не приводит к запуску worker до readiness.

### 476. Recovery smoke включён в production gate
- `check:production` теперь запускает `smoke:failure-lifecycle`, `smoke:reconcile` и `smoke:reconcile-resolve`.
- Production gate реально покрывает failure → failed, expired lease → unknown/reconciling и операторское разрешение unknown attempt.
- Полный `npm run check:production` прошёл; API load smoke: 1197 req/s.

### 477. Явная worker runtime-конфигурация
- Worker unit теперь явно задаёт `QWEN_API_BASE_URL`, стабильный UUID node и `QWEN_INSTANCE_ID`; перенос/перезапуск не зависит от неявных fallback-значений.
- После daemon-reload и restart worker остаётся `active`, а `local-qwen` подтверждён `online` через `/v1/nodes`.

### 478. Повторная лабораторная проверка после systemd hardening
- `npm run check:lab` прошёл: readiness fail-closed, runtime health, allowlisted ComfyUI schema, H3 reference bindings, immutable profile injection, transactional revision activation и worker CAS E2E.

### 479. H3 capability advertisement в живом worker
- Worker объявляет `adapters`, `h3=true` и список доступных optimization nodes; это позволяет PostgreSQL `@>` claim-фильтру не направлять H3 job на несовместимый узел.
- После удаления дублирующего ручного worker и чистого systemd restart `/v1/nodes` подтвердил актуальный capability payload и статус `local-qwen=online`.

### 480. Capability inventory синхронизирован с ComfyUI runtime
- Worker перед регистрацией запрашивает `/v1/runtime` и берёт `h3`/`optimizationNodes` из живого ComfyUI snapshot; статический optimistic список больше не является источником истины.
- На PVE runtime подтверждены H3 и пять доступных optimization nodes; worker registry после restart содержит этот payload.
- `npm run typecheck` прошёл.

### 481. Production gate после dynamic capabilities
- Полный `npm run check:production` прошёл после изменения worker startup; recovery, fencing, CAS/provenance, H3 runtime и worker E2E не регрессировали.
- API load smoke: 1354 req/s.

### 482. Единый runtime snapshot с node health
- `/v1/runtime` в PostgreSQL-режиме теперь включает `nodes` рядом с backend checks: status, heartbeat и capabilities каждого worker.
- Живой snapshot после systemd restart подтвердил ComfyUI/llama.cpp `ok` и `local-qwen=online` с H3 capability payload.
- UI и мониторинг могут использовать один endpoint для backend и worker health, без рассинхронизации отдельных запросов.

### 483. Production baseline после runtime snapshot
- Все три user units (`api`, `worker`, `web`) остаются `active`; дублирующих ручных API/worker процессов не обнаружено.
- `/ready` отвечает 200; единый `/v1/runtime` показывает оба backend runtime `ok` и один актуальный worker `online` (исторические smoke nodes остаются `stale` и не участвуют в claim).

### 484. Реальный backup/restore rehearsal
- Создан локальный backup snapshot `.data/backups/production-check-20260910` через `backup:local`.
- `backup:verify` подтвердил manifest и hashes 9 CAS-файлов.
- `backup:restore-rehearsal` восстановил dump в изолированную PostgreSQL БД, проверил 14 public tables и 8 AssetVersion CAS links, затем удалил временную БД.

### 485. Release и restore preflight после backup rehearsal
- `npm run check:release` прошёл: typecheck, web build, migration/domain/skeleton/systemd gates.
- `npm run backup:restore-preflight` подтвердил роль `la6` с правом создания изолированной БД; restore rehearsal готов к повторению.

### 486. Regression smoke для unified runtime nodes
- Добавлен `smoke:runtime-nodes`: PostgreSQL-backed test создаёт online node, вызывает `/v1/runtime` и проверяет capabilities в едином snapshot, затем удаляет test node.
- Smoke и полный `check:production` прошли; API load smoke: 1252 req/s.

### 487. UI использует unified runtime snapshot
- `loadRuntime` теперь принимает `nodes` из `/v1/runtime` и обновляет health panel одним authoritative ответом; отдельный `/v1/nodes` оставлен как fallback/ручное обновление.
- Web/API typecheck прошёл.

### 488. Устранён race health polling
- Автоматический 5-секундный refresh больше не вызывает отдельный `/v1/nodes`; worker health обновляется только из unified `/v1/runtime`.
- Ручное обновление исполнителей сохранено, но не может перезаписать более свежий runtime snapshot.
- `npm run typecheck` прошёл.

### 489. Stale worker visibility в UI
- В верхнюю health-панель добавлен счётчик `stale` для всех не-online исполнителей с подсказкой о недоступных узлах.
- Потерянный или устаревший worker теперь заметен до открытия настроек; online count и семантика claim не изменены.
- `npm run typecheck` прошёл.

### 490. Release build после health UX
- `npm run check:release` прошёл после stale-индикатора: web production bundle собран, 18 миграций, domain/skeleton, bind guard и systemd hardening подтверждены.

### 491. Live web preview синхронизирован
- После production build перезапущен `qwendirector-web.service`; unit `active`.
- `http://127.0.0.1:4173/` отвечает 200 с актуальным собранным интерфейсом.

### 492. User-session service invariant
- API, worker и web units одновременно `enabled` и `active`.
- Unified runtime snapshot подтверждает минимум один `online` node (`local-qwen`); проверка выполнена после web restart.

### 493. Lab gate расширен unified runtime nodes
- `check:lab` теперь включает `smoke:runtime-nodes`, поэтому лабораторный gate проверяет PostgreSQL node health внутри `/v1/runtime` вместе с H3 schema/reference/profile/E2E сценариями.
- Полный `npm run check:lab` прошёл.

### 494. Автовосстановление H3 capabilities после backend recovery
- Worker обновляет ComfyUI H3/optimization inventory перед каждым heartbeat, поэтому временная недоступность ComfyUI не требует ручного рестарта для возврата capability-флага.
- После restart worker typecheck прошёл, node `local-qwen` снова online с актуальным H3 payload.

### 495. Production gate после capability recovery
- Полный `npm run check:production` прошёл после heartbeat inventory refresh: approval/retry, failure/reconcile, multi-node fencing, CAS lineage, Comfy collect и worker E2E зелёные.
- API load smoke: 746 req/s (локальный прогон с параллельными сервисами; это диагностическое измерение, не SLA).

### 496. Online-first node health ordering
- `PgNodeRepository.list()` сортирует online nodes первыми, затем по свежести heartbeat и UUID.
- После API/worker restart `/v1/nodes` показывает актуальный `local-qwen` первым; stale historical nodes остаются видимыми, но не заслоняют активный ресурс.
- `npm run typecheck` прошёл.

### 497. Release gate после node ordering
- `npm run check:release` прошёл после изменения PostgreSQL node read-model: production web bundle, миграции, domain/skeleton, bind guard и systemd hardening зелёные.

### 498. Regression guard для online-first порядка
- `smoke:runtime-nodes` теперь проверяет, что свежий online node находится первым в unified snapshot перед stale nodes.
- Smoke и API/web typecheck прошли.

### 499. README синхронизирован с текущим режимом
- Убрана устаревшая формулировка «разработка на паузе»; Kadr указан как отдельный integration track, текущий QwenDirector продолжает развиваться автономно.
- README дополнен безопасным способом установки/запуска user-units без автоматической остановки лабораторных процессов.

### 500. Live H3 starter preflight
- `npm run preflight:h3-starter` успешно проверил PVE ComfyUI schema и H3 boundary (`MiniMaxH3ReferenceToVideo`, `RandomNoise`, `SaveVideo`), inventory содержит `LatentUpscale`/`LatentUpscaleBy`; submit не выполнялся.

### 501. Актуальный LoRA inventory для quality A/B
- Прямой `/object_info` PVE подтвердил только `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors` и `minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors`.
- Ref2VA 8-step в текущем PVE inventory отсутствует; автоматическая смена профиля не выполняется, чтобы не нарушить совместимость Ref2V boundary.

### 502. Компактный H3 inventory probe
- Добавлена команда `npm run probe:h3-inventory`, которая выводит только H3 LoRA, H3 node classes и доступные optimization nodes вместо тысяч строк полного `/object_info`.
- Живой probe подтвердил 2 H3 LoRA, 3 H3 node classes и 5 optimization nodes; `npm run typecheck` прошёл.

### 503. Discoverability H3 probe
- Команда `npm run probe:h3-inventory` добавлена в основной список production/lab проверок README.
- `check_skeleton.py` подтвердил локальные ссылки и обязательные документы после изменения.

### 504. Runtime baseline спустя непрерывную работу
- API, worker и web units остаются `active` при повторной проверке.
- Живой probe подтвердил ComfyUI `ok`, H3 `true`, 5 optimization nodes и 1 online worker.

### 505. H3 inventory включён в lab gate
- `check:lab` теперь запускает `probe:h3-inventory` рядом с runtime/schema/profile/reference checks.
- Полный live-lab gate прошёл после расширения; inventory PVE остаётся проверяемым артефактом каждого прогона.

### 506. Исправлен systemd code fence в operations runbook
- В `docs/operations.md` закрыт fenced-блок команд непосредственно после `systemctl --user status`; пояснение про `install_user_units.sh` снова находится вне shell-блока.
- `check_skeleton.py` прошёл; копирование команд из runbook теперь не захватывает русский текст.

### 507. Runtime baseline после документационных изменений
- Все units остаются `enabled` и `active`.
- Unified snapshot подтверждает `comfyui=true`, `h3=true`, 5 optimization nodes и 1 online worker.

### 508. Release/documentation baseline
- `check_skeleton.py` и `npm run check:release` прошли после синхронизации README/runbook.
- Подтверждены 18 contiguous migrations, domain/skeleton contracts, bind guard, web proxy и systemd hardening.

### 509. Длительный live baseline
- Повторная проверка показала все три units `active`, `/ready` с ComfyUI/llama.cpp/storage `ok`.
- H3 inventory PVE стабилен: FL2V 8-step, Ref2V 4-step, 5 optimization nodes и 3 H3 classes.

### 510. Production gate после live baseline
- Полный `npm run check:production` прошёл после стабильного live baseline; durable lifecycle, recovery, CAS/provenance и worker E2E зелёные.
- API load smoke: 1215 req/s.

### 511. H3 LoRA inventory в runtime и UI
- `/v1/runtime` теперь включает отфильтрованный `capabilities.h3Loras`; UI показывает список H3 LoRA рядом с optimization nodes.
- После restart API/worker/web живой snapshot подтвердил H3=true, 2 LoRA и 5 optimization nodes.
- `npm run typecheck` прошёл.

### 512. Runtime health smoke покрывает H3 LoRA
- `smoke:runtime-health` расширен mock schema с `LoraLoaderModelOnly` и проверкой фильтрации H3 LoRA.
- Smoke и API/web typecheck прошли.

### 513. Production gate после H3 LoRA contract
- Полный `npm run check:production` прошёл после изменения runtime capabilities; recovery, fencing, CAS/provenance, H3 E2E и unified runtime checks зелёные.
- API load smoke: 1238 req/s.

### 514. Release/documentation gate после H3 UI inventory
- `check_skeleton.py` и `npm run check:release` прошли после добавления H3 LoRA в runtime/UI.
- Подтверждены web build, 18 migrations, domain/skeleton, bind guard, proxy и systemd hardening.

### 515. Финальный live baseline текущей итерации
- API, worker и web units остаются `active`, `/ready` проходит.
- PVE inventory стабилен: FL2V 8-step и Ref2V 4-step LoRA, 5 optimization nodes и 3 H3 node classes.

### 516. Drift check после текущей итерации
- Все units снова `active`; unified runtime подтверждает оба backend `ok`, H3=true, 2 LoRA, 5 optimization nodes и 1 online worker.

### 517. Операторский stale reconcile в UI
- В настройках добавлена кнопка «Проверить stale», вызывающая `POST /v1/admin/nodes/reconcile` и затем обновляющая unified runtime snapshot.
- Живой вызов endpoint вернул `markedStale: 0`; online worker сохранён, исторические stale nodes остаются quarantined.
- `npm run typecheck` прошёл.

### 518. Release gate после stale reconcile UX
- `npm run check:release` прошёл: новый UI action, runtime snapshot и API контракт собираются в production bundle; systemd hardening и migration/domain gates без регрессий.

### 519. Итоговый production gate текущей итерации
- Полный `npm run check:production` прошёл после всех runtime/UI/reconcile изменений.
- Durable jobs, recovery/reconcile, multi-node fencing, CAS lineage, H3 inventory/runtime и worker E2E зелёные; API load smoke: 1358 req/s.

### 520. Live-lab gate после operator UX
- `npm run check:lab` прошёл после добавления stale reconcile action и H3 LoRA inventory UI; H3 schema, references, immutable profiles и CAS worker E2E без регрессий.

### 521. Production gate после operator UX
- Полный `npm run check:production` прошёл после stale reconcile и H3 inventory UI; durable lifecycle, recovery, CAS/provenance, H3 E2E и runtime checks зелёные.
- API load smoke: 1216 req/s.

### 522. Расширенный API load baseline
- Выполнен read-only `QWEN_LOAD_REQUESTS=1000 npm run smoke:api-load`.
- 1000 запросов `/health`/`/ready` завершились за 388 ms (2577 req/s); GPU jobs и данные не изменялись.

### 523. Live restart recovery drill
- Выполнен контролируемый `systemctl --user restart` API+worker.
- Через 6 секунд оба units `active`, `/ready` проходит, а `local-qwen` снова зарегистрирован `online` с обновлённым heartbeat.

### 524. Post-restart stability baseline
- Повторная проверка после recovery-дрилла подтвердила стабильное состояние без ручного вмешательства: API, worker и web units `active`.
- Unified runtime: ComfyUI `ok`, H3 capability `true`, один online worker `00000000-0000-4000-8000-000000000001`.

### 525. Сохранение режиссёрского prompt в существующем шоте
- `PgJobRepository.createDirector` теперь транзакционно сохраняет поля режиссёрской формы в `shots.director_prompt` и увеличивает `prompt_revision`/`plan_revision` перед созданием нового job.
- Повторный idempotent replay не создаёт лишнюю ревизию; timeline сохраняет последний утверждённый набор полей шота.
- Проверки: `npm run typecheck`, `npm run smoke:catalog`.

### 526. Детерминированная provenance-мета для H3 quality A/B
- Immutable H3 profile теперь вычисляет из графа `qualityHint` (`draft-4step`/`quality-8step`/`unknown`), `samplingSteps` и список LoRA.
- Эти поля входят в сохранённый `workflowProfile`, поэтому результаты A/B можно группировать по graph hash, LoRA и числу шагов без ручного разбора workflow JSON.
- Проверки: `npm run typecheck`, `npm run smoke:h3-profile`, `npm run smoke:worker-h3-injection`.

### 527. CAS/staging retention dry-run
- Выполнены `npm run cas:gc-report` и `npm run staging:gc-report` с grace period 24 часа.
- CAS: просканировано 9 объектов, 8 ссылок из `asset_versions`, eligible orphan отсутствует; staging: eligible stale-файлов нет.
- Удаление остаётся намеренно отдельной операторской процедурой после согласования retention/RPO/RTO.

### 528. Regression smoke для catalog prompt persistence
- Расширен `smoke:workflow-job-plan`: существующий shot передаёт H3 job, проверяется сохранение `director_prompt` и увеличение `prompt_revision`, а невалидный новый workflow по отдельному idempotency key отклоняется с `400`.
- Проверка прошла: `npm run smoke:workflow-job-plan`.

### 529. Полный production gate после catalog/H3 изменений
- `npm run check:production` завершился успешно: миграции, release checks, auth/bind guard, runtime health и node health, lifecycle/reconcile/retry, export, shot prompt, CAS lineage, Comfy collect, worker E2E и API load smoke без регрессий.

### 530. Live H3 inventory: доступен Ref2VA 8-step кандидат
- `npm run probe:h3-inventory` подтвердил на PVE `MiniMax-H3-Ref2VA-Acc-8Step.safetensors` и `MiniMax-H3-FL2VA-Acc-8Step.safetensors` наряду с текущими Turbo 4-step/FL2V 8-step LoRA.
- Обязательные H3-ноды и пять optimization nodes доступны. Ref2VA 8-step пока не становится default: требуется digest, отдельный immutable profile и три парных A/B-прогона на одинаковых входах.

### 531. Lab gate после обновления H3 quality inventory
- `npm run check:lab` завершился успешно: readiness fail-closed, runtime/node health, live H3 inventory, Comfy schema, references, immutable profile activation и worker E2E без регрессий.

### 532. Разделение H3 LoRA по workflow mode
- `probe:h3-inventory` теперь явно выводит `ref2vLoras`, `fl2vLoras` и кандидатов `ref2v8step`/`ref2v4step`.
- Live PVE классифицирован однозначно: `MiniMax-H3-Ref2VA-Acc-8Step.safetensors` — quality-кандидат для Ref2V; `MiniMax-H3-FL2VA-Acc-8Step.safetensors` не допускается в Ref2V boundary.

### 533. Contract smoke для Ref2VA 8-step
- `smoke:h3-preflight` теперь подтверждает, что `MiniMax-H3-Ref2VA-Acc-8Step.safetensors` получает `quality-8step`, а FL2V LoRA по-прежнему отклоняется на Ref2V boundary.
- Проверка прошла: `npm run smoke:h3-preflight`.

### 534. Quality provenance в workflow profile catalog
- API read-model `GET /v1/workflow-profiles` и `GET /v1/workflow-profiles/:id` теперь возвращает вычисленные из immutable graph поля `quality_hint`, `sampling_steps` и `loras`.
- Проверки: `npm run typecheck`, `npm run smoke:profile-revision-activate`.

### 535. Dedicated workflow profile read endpoint
- Добавлен `GET /v1/workflow-profiles/:id`, возвращающий immutable graph, revision state и quality provenance; это устраняет зависимость UI/оператора от списка только active-профилей.
- Smoke расширен проверкой Ref2VA 8-step metadata и transactional revision activation.

### 536. Release gate после profile read API
- `npm run check:release` прошёл: typecheck, web build, migration/domain/skeleton gates, API bind guard, proxy и systemd hardening.

### 537. Web type contract для quality provenance
- Тип модели workflow profiles в Vue расширен полями `quality_hint`, `sampling_steps` и `loras`, совместимыми с новым API read-model.
- Проверка: `npm run typecheck`.

### 538. Lab gate после profile read-model
- `npm run check:lab` прошёл после добавления profile endpoint и quality provenance: readiness, runtime inventory, H3 schema/references, profile revision activation и worker E2E зелёные.

### 539. Live service baseline после lab gate
- API, worker и web units `active`; `/ready` отвечает успешно.
- Runtime подтверждает ComfyUI `ok`, H3 `true`, 4 H3 LoRA в inventory и 1 online worker.

### 540. Provenance в ответе активации profile revision
- `POST /v1/workflow-profiles/:id/revisions/:revision/activate` теперь возвращает `qualityHint`, `samplingSteps` и `loras` активируемой ревизии вместе с graph hash.
- Smoke и typecheck прошли: `npm run typecheck`, `npm run smoke:profile-revision-activate`.

### 541. Реальный Ref2V quality profile на PVE
- Из сохранённого `/home/la6/Downloads/video_minimax_h3_r2v_api.json` создан отдельный профиль `h3-ref2v-quality-8step-local`; исходный workflow не изменён.
- Profile preflight на PVE прошёл: `active=true`, graph hash `5bc76c4a3aa1b344c0c4c4e6f5bc5dd1f6f46e5e0131adc132d2b45c43f74597`, `qualityHint=quality-8step`, `missingLoras=[]`.
- Профиль готов к парным A/B-прогонам, но quality default ещё не назначен до трёх повторений и ручной оценки.

### 542. Симметричный Ref2V draft profile для A/B
- Из исходного API workflow создан `h3-ref2v-draft-4step-local`; preflight на PVE прошёл с `qualityHint=draft-4step`, `missingLoras=[]`.
- Graph hash draft: `d8e09dedd9f9af50c31fab774b6876d26aef209caf48a0c9b172504d5c3ca02b`; quality profile hash отличается (`5bc76c…`), что обеспечивает воспроизводимое разделение вариантов.

### 543. Предварительная проверка реального A/B workflow
- Исходный Ref2V graph содержит два обязательных `LoadImage` (`bw-intro.jpg`, `bw-intro-1.jpg`), поэтому реальный A/B нельзя запускать без явной загрузки/привязки reference AssetVersion через Media Pool.
- Профили и preflight готовы; следующий безопасный шаг — использовать выбранные reference assets, затем запускать парные jobs с одинаковыми входами.

### 544. Fail-closed image binding для H3 jobs
- `createDirector` теперь отклоняет H3 workflow, если число `LoadImage` превышает число `referenceBindings.imageNodeIds`; references не могут незаметно остаться с placeholder filenames.
- Локальные 4-step и 8-step Ref2V profiles пересохранены с bindings `137,139`; quality profile повторно прошёл PVE preflight (`active=true`, `missingLoras=[]`).
- Проверки: `npm run typecheck`, `npm run smoke:h3-references`.

### 545. Binding guard в lab gate
- Добавлен `smoke:h3-binding-guard`, проверяющий HTTP `400 H3_WORKFLOW_IMAGE_BINDINGS_REQUIRED` для workflow с незаполненным `LoadImage` binding.
- Скрипт включён в `check:lab`; smoke прошёл.

### 546. Lab gate с fail-closed reference bindings
- Обновлённый `npm run check:lab` прошёл: readiness, runtime inventory, H3 schema/references, binding guard, immutable profiles и worker E2E без регрессий.

### 547. Production gate после H3 binding guard
- `npm run check:production` прошёл после fail-closed image binding: migrations/release, auth, runtime/node health, durable lifecycle/reconcile/retry, CAS lineage, Comfy collect, worker E2E и API load smoke зелёные.

### 548. Live profile catalog after API restart
- После контролируемого restart API direct profile endpoint подтвердил оба варианта: draft 4-step (`active=false`, bindings `137,139`, steps `4`) и quality 8-step (`active=true`, bindings `137,139`, steps `8`).
- Worker остался `active`/online, ComfyUI `ok`.

### 549. Оба H3 A/B профиля доступны в UI-каталоге
- Draft профиль прошёл PVE preflight и активирован как selectable (не quality default).
- `GET /v1/workflow-profiles` теперь возвращает оба варианта: draft 4-step и quality 8-step; оба имеют `missingLoras=[]` и bindings `137,139`.

### 550. Первый реальный Ref2V 8-step job
- Через QwenDirector создан и утверждён job `344fa77f-1832-40f8-a197-6150cb62c649` с профилем `h3-ref2v-quality-8step-local` и новой `MiniMax-H3-Ref2VA-Acc-8Step.safetensors`.
- Реальный worker/ComfyUI attempt завершился `succeeded`; результат сохранён в CAS как AssetVersion `85bbcc15-d642-4c9c-bf2e-bc337d7c1413`, `video/mp4`, SHA-256 `b577e11969499f4c175ce00698bcdf7409d229c59b376e1fa42840ab97af49e0`.

### 551. Проверка CAS video delivery
- `HEAD /v1/assets/85bbcc15-d642-4c9c-bf2e-bc337d7c1413` вернул `200`, `content-type: video/mp4`, `content-length: 173114` и тот же SHA-256, что в manifest.

### 552. Media validation 8-step output
- `ffprobe` подтвердил MP4 H.264 `768×512`, 24 fps, 22 video frames и AAC audio track; длительность контейнера `0.917 s`, размер `173114` байт.
- Файл пригоден для дальнейшего просмотра/монтажа; короткая длительность соответствует тестовому `length=17` и не является production-quality оценкой.

### 553. Первый парный 4-step Ref2V job
- На тех же references, prompt, seed и разрешении запущен `h3-ref2v-draft-4step-local`; job `89e8bb1d-9855-4210-8279-2d0337b3ccef` завершился `succeeded`.
- CAS output: AssetVersion `07f301e2-c29f-4728-b77b-6bb8538d897c`, `video/mp4`, SHA-256 `b03c33073b1a92d1812bd941c5380389f0914a625c209c4224cc990c0e649830`.
- Реальная пара 4-step/8-step теперь собрана; следующий шаг — сравнить кадры, motion consistency, texture и flicker по карточке эксперимента.

### 554. Исправление включения 8-step LoRA и повторный baseline
- Контрольные кадры первого 8-step job побитно совпали с 4-step: исходный graph имел `PrimitiveBoolean` switch `146=false`, поэтому LoRA была отключена.
- Quality profile пересохранён с `146.value=true`, новый graph hash `7e1d542b47d6371761dcdd49256f1b03679d8b8b316350d1bbd39281d9d5c920`.
- Повторный 8-step job `8df5c061-48a8-461e-a654-08162089f358` завершился `succeeded`; CAS AssetVersion `530aed3d-e9fd-4b9b-bd7a-291b492631ae`, SHA-256 `660de317b2b1d5bfa4b9753bc0df7754c01e540d4b863fae46aa3a3259a3e9d8`.
- Контрольные кадры повторного 8-step имеют отличающиеся SHA от 4-step baseline; quality A/B теперь технически валиден.

### 555. Визуальный quality review A/B
- Контрольные кадры 4-step и исправленного 8-step просмотрены визуально: 8-step даёт более яркую/детализированную текстуру лица и материала, 4-step — более контрастный и цветно-агрессивный draft.
- Это предварительная ручная оценка одного короткого прогона; default quality profile не меняется до трёх повторений с заполненной карточкой motion/texture/flicker.

### 560. Численная проверка различия A/B
- Для соответствующих кадров 4-step и исправленного 8-step рассчитан FFmpeg PSNR: средний `12.777466 dB` (Y `11.229740 dB`), что подтверждает существенное различие видео.
- PSNR используется только как метрика различия, а не как оценка «лучше/хуже»; итоговое решение остаётся за ручной проверкой texture/motion/flicker.

### 562. Backup реальных A/B assets
- Создан backup `.data/backups/ab-baseline-20260910`; `npm run backup:verify -- .data/backups/ab-baseline-20260910` подтвердил БД и 9 CAS records.

### 563. Вторая парная A/B репетиция
- Повторены 4-step и 8-step jobs на одинаковых входах и seed `424243`; оба завершились `succeeded`.
- 4-step AssetVersion `aafeb066-0fe3-45bc-b445-4ffb743610a7`, SHA `a78a6b24ccba62df50e71565517a04d256dbb17f05799d5064adffb255f20eb5`; 8-step AssetVersion `37c9fa83-c677-492a-9474-2b5a792f1885`, SHA `43fa1a92567b4fda0c2d32d445c43828d42f1ff26a333da602603d24c15af2d7`.
- До минимального набора quality policy остаётся одна парная репетиция и ручная оценка карточек.

### 564. Третья парная A/B репетиция
- Повторены 4-step и 8-step jobs на одинаковых входах и seed `424244`; оба завершились `succeeded`.
- 4-step AssetVersion `eba6e616-e654-4b11-ab30-f22e97620370`, SHA `6b75721828cf6389202439daabab9b1099c81725929475da94487ed0d30374a0`; 8-step AssetVersion `4822c9ca-bc30-4799-b975-00a6069f9558`, SHA `6cc9bae7e076b27a46acf9b5bbb07f78879de9430704809d488d2a5dbd6ea262`.
- Минимум из трёх технически валидных пар выполнен; итоговый default по-прежнему требует ручной оценки карточек.

### 556. Стабилизация graphHash через canonical JSON
- Исправлен hashing H3 profiles: `graphHash` теперь рассчитывается по canonical JSON с сортированными ключами, а не по порядку полей входного объекта.
- Это устраняет расхождение hash между API/БД/worker для одного immutable graph.
- Проверки: `npm run typecheck`, `npm run smoke:h3-profile`, `npm run smoke:workflow-job-plan`.

### 557. Пересохранение live H3 profiles после hash fix
- Оба PVE профиля пересохранены и повторно прошли preflight после canonical hashing.
- Текущие active revisions: draft 4-step `r3`, hash `f0374ff99cc168f2fdaeeb2501cd9136b4b0e0925088db714d2cfd3527af900b`; quality 8-step `r4`, hash `1bb019734d4b07f4f6d26de352fec2d0c5c319d68b96ae7a39a0c1cc472f99d8`.

### 558. Canonical hash invariant smoke
- `smoke:h3-profile` теперь проверяет одинаковый `graphHash` для идентичного workflow при перестановке ключей JSON.
- Проверки: `npm run smoke:h3-profile`, `npm run typecheck`.

### 559. Release gate после canonical hashing
- `npm run check:release` прошёл после canonical graph hashing и исправления quality switch: web build, 18 migrations, domain/skeleton, bind guard, proxy и systemd hardening зелёные.

### 565. Подтверждение новой 8-step LoRA в live-профиле
- API/PVE-профиль `h3-ref2v-quality-8step-local` активен и использует `MiniMax-H3-Ref2VA-Acc-8Step.safetensors`.
- Текущие параметры профиля: `quality_hint=quality-8step`, `sampling_steps=8`, image bindings `137,139`, canonical graph hash `1bb019734d4b07f4f6d26de352fec2d0c5c319d68b96ae7a39a0c1cc472f99d8`.
- Переключатель LoRA в графе включён (`PrimitiveBoolean` node `146=true`); результаты трёх A/B пар технически различаются и сохранены в CAS. Ручная оценка motion/texture/flicker остаётся последним шагом перед сменой default quality.

### 566. Повторная лабораторная проверка H3 после установки 8-step LoRA
- `probe:h3-inventory` подтвердил наличие `MiniMax-H3-Ref2VA-Acc-8Step.safetensors` и корректную классификацию как `qualityCandidates.ref2v8step`.
- Live GET профиля подтвердил `active=true`, `quality_hint=quality-8step`, `sampling_steps=8`, LoRA и bindings `137,139`.
- `npm run check:lab` прошёл полностью: readiness/runtime, Comfy schema, H3 references и binding guard, worker injection, revision activation и worker E2E.

### 567. Production regression gate после quality-проверки
- `npm run check:production` прошёл полностью: миграции, release gate, auth/bind guards, metrics/runtime, multi-node fencing, failure lifecycle, reconcile/retry, exports, prompt/timeline, lineage, Comfy collection, worker E2E и API load.
- API load smoke: 100 запросов за 80 ms (≈1252 req/s) на локальном контуре.

### 568. Синхронизация acceptance-документации
- `docs/roadmap.md` и `docs/operations.md` синхронизированы с фактом: Ref2V 8-step A/B уже выполнен тремя парами, но quality-default ещё требует ручной карточки motion/texture/flicker.
- Старое утверждение о ещё не подтверждённой совместимости 8-step Ref2V удалено, чтобы acceptance checklist отражал текущий live-контур.

### 569. Проверка постоянно запущенного локального контура
- User units `qwendirector-api.service`, `qwendirector-worker.service` и `qwendirector-web.service` одновременно `active` и `enabled`.
- `/health` возвращает `status=ok`, `/ready` — `ready`; readiness подтверждает ComfyUI, llama.cpp и storage (`200`). Web preview отвечает собранным bundle на `127.0.0.1:4173`.

### 570. Регрессия для включённой quality LoRA
- `smoke_h3_profile.mjs` расширен проверкой quality-графа: Ref2VA 8-step LoRA распознаётся как `quality-8step`, шаги равны 8, список LoRA сохраняется, а boolean switch `146` обязан быть `true`.
- `npm run smoke:h3-profile` прошёл; это предотвращает повтор прежнего дефекта, когда LoRA присутствовала в JSON, но фактически была отключена.

### 571. Quality LoRA smoke включён в общий lab gate
- `check:lab` теперь запускает `smoke:h3-profile` после Comfy schema; защита switch/steps/LoRA выполняется вместе с остальными live-проверками.
- Полный `npm run check:lab` прошёл, включая inventory PVE, binding guard, profile activation и worker E2E.

### 572. Quality LoRA smoke включён в production gate
- `check:production` теперь также запускает `smoke:h3-profile` сразу после release gate.
- Полный `npm run check:production` прошёл; API load smoke подтвердил 100 запросов за 249 ms (≈401 req/s) на текущем локальном контуре.

### 573. Безопасный выбор H3 quality-профиля в UI
- Нормализованы snake_case-поля profile read-model (`quality_hint`, `sampling_steps`) в Vue.
- При первом открытии редактора UI теперь предпочитает активный `quality-8step` профиль вместо случайного первого профиля; явный выбор пользователя сохраняется.
- Выполнены `npm run typecheck`, `npm run build:web`; web unit перезапущен и отдаёт новый bundle `index-dOS-EFXj.js`.

### 574. Live-проверка UI/API после пересборки
- Web preview отдаёт новый bundle `index-dOS-EFXj.js` на `127.0.0.1:4173`.
- API `/ready` остаётся `ready`; ComfyUI, llama.cpp и storage отвечают `200` после перезапуска web unit.

### 575. Проверка runtime-логов после production gate
- Последние 120 записей API/worker через `journalctl` не содержат `error`, `fatal`, `uncaught`, `OOM` или необработанных исключений.
- Скрытых runtime-ошибок после пересборки и полного regression gate не обнаружено.

### 576. Аудит загрязнения локальной очереди smoke-данными
- Прямой read-only запрос PostgreSQL показал 24 jobs в `awaiting_approval`, 1 `cancelled`, 7 `failed` и 14 `succeeded`; attempts: 8 `failed`, 14 `succeeded`.
- Это ожидаемые артефакты повторных smoke-прогонов, но они не должны смешиваться с рабочей очередью оператора. Удаление не выполнялось; следующий production-шаг — изолировать lab fixtures отдельным namespace/БД либо добавить безопасный cleanup с retention и явным dry-run.

### 577. Безопасный smoke-job dry-run отчёт
- Добавлен `npm run report:smoke-jobs` (`scripts/report_smoke_jobs.mjs`): read-only отчёт по известным fixture project names, без удаления и без изменения БД.
- Первый запуск нашёл 23 job-кандидата; инструмент предназначен для операторского подтверждения перед будущей retention/cleanup процедурой.

### 578. README синхронизирован с состоянием очереди
- Убрано устаревшее утверждение о пустой очереди после прогонов; явно указано наличие лабораторных jobs и команда read-only отчёта.

### 579. Повторная проверка smoke-job отчёта
- Прямой запуск `node scripts/report_smoke_jobs.mjs` успешно сформировал JSON с `dryRun=true` и 23 кандидатами; состояние БД не изменялось.

### 580. Origin для изоляции лабораторных jobs
- Добавлена миграция `019_job_origin.sql`: jobs получают `origin=user|lab|system` с безопасным default `user` и constraint.
- Director API принимает явный `origin`; smoke-job отчёт показывает origin для операторской фильтрации. Старые записи не переписывались и остаются `user` до отдельного подтверждения.
- `npm run db:migrate` применил 19 миграций, typecheck прошёл.

### 581. Проверка схемы job origin
- Read-only транзакция PostgreSQL подтвердила default `'user'` и constraint `jobs_origin_check`; постоянные данные не создавались и транзакция откатана.

### 582. Очистка явно тестовых каталогов
- По явному запросу оператора удалены только проекты `workflow`, `profile-source`, `QwenDirector E2E` и `asset smoke`: 28 project/scene/shot записей, 31 jobs, 9 attempts и связанные manifest/asset links.
- Проекты `H3 Quality A/B`, `QwenDirector Live…`, `Новый проект 1` и CAS AssetVersion сохранены.
- После очистки осталось 15 jobs и 13 attempts в сохранённых проектах; операция выполнена транзакционно без касания инфраструктуры.

### 583. Чистый lab-прогон после очистки
- `npm run check:lab` повторно прошёл полностью на очищенной базе; PVE inventory, 8-step switch/LoRA regression, references, profile activation и worker E2E подтверждены.
- Автоматический post-run audit не обнаружил новых fixture-проектов: smoke-скрипты корректно убрали свои записи; сохранено 15 рабочих jobs в реальных проектах.

### 584. Baseline перед новым real-H3 прогоном
- `/v1/runtime` подтверждает ComfyUI `ok=true` (system_stats/object_info, latency 161 ms), H3 capability и Ref2VA 8-step LoRA; зарегистрирован один совместимый worker `local-qwen`.
- Штатного real-H3 runner в репозитории нет; запуск через обход durable queue не выполнялся. Новый real job должен создаваться через UI/API с immutable profile, references и approval.

### 585. Финальная очистка старых Live smoke-проектов
- Удалены только `QwenDirector Live Check`, `QwenDirector Live H3 Retry` и `QwenDirector Live H3 E2E`: 3 проекта, 3 jobs и 3 attempts; CAS-ассеты не удалялись.
- Сохранены `H3 Quality A/B`, `QwenDirector Live R2V` и `Новый проект 1`; после очистки в каталоге 12 jobs и 12 проектов, только в сохранённых рабочих проектах.

### 586. Состояние после очистки
- API, worker и web units `active`; `/ready` возвращает `ready`.
- В сохранённых рабочих проектах: 2 `awaiting_approval`, 1 `failed`, 9 `succeeded`; тестовые служебные проекты отсутствуют.

### 587. Smoke-job отчёт после очистки пуст
- `node scripts/report_smoke_jobs.mjs` вернул `dryRun=true`, `count=0`; ни один сохранённый рабочий job не классифицируется как известный smoke fixture.

### 588. API smoke для job origin
- Добавлен `smoke:job-origin`: временный Director job с `origin=lab` создаётся через API, поле проверяется в PostgreSQL и fixture удаляется в `finally`.
- `npm run smoke:job-origin` прошёл (`201`, `origin=lab`), постоянного lab job не осталось.

### 589. Origin smoke включён в оба gate
- `smoke:job-origin` добавлен в `check:lab` и `check:production`, чтобы проверка изоляции выполнялась автоматически вместе с regression suite.

### 590. Production gate после очистки и origin migration
- `npm run check:production` прошёл полностью после миграции 019 и удаления старых smoke-проектов.
- API load smoke: 100 запросов за 61 ms (≈1643 req/s); worker E2E, CAS/lineage, reconcile, fencing и origin smoke зелёные.

### 591. Post-gate queue hygiene
- После полного production gate `report:smoke-jobs` возвращает `count=0`.
- Рабочая очередь не изменилась: 2 `awaiting_approval`, 1 `failed`, 9 `succeeded`; новые smoke fixtures не остались.

### 592. Удаление шаблонного тестового проекта
- По явному запросу оператора удалены два дубликата проекта `Новый проект 1`: 2 проекта, 3 jobs, 1 attempt и связанные links.
- После очистки в базе 10 проектов и 9 jobs: 1 `failed`, 8 `succeeded`; `report:smoke-jobs` по-прежнему возвращает `count=0`.
- Сохранены только H3 A/B и Live R2V результаты; CAS не удалялся.

### 593. Удаление mutation fixtures
- Удалены два служебных проекта `mutation-<uuid>` и их scenes/shots без jobs.
- В каталоге остались только `H3 Quality A/B` и `QwenDirector Live R2V`: 8 project records и 9 jobs; CAS-ассеты сохранены.

### 594. Проверка профилей и CAS после очистки
- API подтверждает три активных профиля: Ref2V quality 8-step (`1bb019…`, `MiniMax-H3-Ref2VA-Acc-8Step`), Ref2V draft 4-step (`f0374f…`) и исходный 4-step (`1a7ded…`).
- В CAS сохранено 16 AssetVersion и 8 attempt-assets; очистка тестовых каталогов не затронула outputs и references.

### 595. Аудит выбора финальных дублей
- В проекте `QwenDirector Live R2V` успешный job имеет явно выбранный `AssetVersion` (`ed88cd1a-4ee0-41a2-812a-4c969566b389`); failed job не имеет selected output.
- Шесть A/B jobs проекта `H3 Quality A/B` намеренно остаются без selected output до ручного quality sign-off — это сохраняет нейтральность сравнительного эксперимента.

### 596. Backup после очистки каталога
- Создан `.data/backups/post-clean-20260910-v2`; backup содержит 9 CAS files.
- `npm run backup:verify -- .data/backups/post-clean-20260910-v2` подтвердил database + 9 CAS records.

### 597. Fail-closed CAS completeness guard
- `backup_local.mjs` теперь сверяет все `asset_versions` с фактическими CAS blobs и отказывается создавать неполный backup.
- Проверка на текущем каталоге выявила 8 отсутствующих blobs (`BACKUP_CAS_MISSING:8`). Автоматическое удаление AssetVersion не выполнялось; требуется операторское решение: восстановление файлов или orphan-retention cleanup с проверкой lineage.

### 598. Классификация отсутствующих CAS blobs
- Все 8 отсутствующих записей проверены: 1 reference без links и 7 output AssetVersion, каждая связана с `attempt_assets`; selected output среди отсутствующих нет.
- Удаление отложено: 7 outputs нужны для исторической provenance/lineage, а reference может потребоваться для повторяемости. Backup остаётся намеренно fail-closed до восстановления или согласованной retention-политики.

### 599. Проверка доступных backup-копий для CAS recovery
- Все локальные backup-каталоги проверены по SHA-именам отсутствующих blobs; совпадений нет.
- Автоматическое восстановление невозможно без внешней копии исходных файлов. Подмена, генерация нулевых файлов или удаление связанных AssetVersion запрещены до операторского решения.

### 600. Проверка staging/CAS путей
- Повторный поиск по `.data/assets` и staging не обнаружил отсутствующие blobs по SHA; они действительно отсутствуют локально.
- `backup:catalog-check` подтверждает структуру backup (9 required tables), но полноценный backup остаётся заблокирован CAS completeness guard до решения по 8 AssetVersion.

### 601. Restore capability preflight
- `npm run backup:restore-preflight` подтвердил PostgreSQL user `la6` с `canCreateDatabase=true`; изолированный restore технически готов.
- Единственный текущий блокер restore rehearsal — отсутствие 8 CAS blobs, а не права или структура БД.

### 602. Отдельный CAS health report
- Добавлен `npm run report:cas-health`: read-only JSON по present/missing AssetVersion, asset kind, attempt links и selected-output links.
- Текущий отчёт: 16 AssetVersion, 8 present, 8 missing; инструмент не изменяет БД и предназначен для безопасного retention/recovery решения.

### 603. Strict CAS gate для production
- Добавлен `npm run check:cas` (`report_cas_health.mjs --strict`), который завершает проверку с ошибкой при missing blobs.
- `check:production` теперь включает strict CAS gate; на текущем состоянии он закономерно блокируется из-за 8 отсутствующих blobs, делая production-риск видимым вместо ложного green.

### 604. Полный strict production gate
- `check:release` проходит, затем `check:production` останавливается именно на `check:cas` с `missingCount=8`; остальные production smoke не запускаются до восстановления CAS.

### 605. Восстановление одного reference blob
- В `/home/la6/Downloads` найден `photo_2026-09-09_22-21-04.jpg` с SHA `0c3b41e660f5f889253837eaca17d41ca68c5fa97af98586cfc71a8fec4bd271`; blob восстановлен в `.data/assets/cas/0c/...` без изменения AssetVersion.
- CAS health улучшился с 8 до 7 missing; backup остаётся fail-closed (`BACKUP_CAS_MISSING:7`). Остальные 7 outputs требуют исходных файлов или retention-решения.

### 606. Поиск output recovery в локальных медиа
- Все локальные `.mp4/.mov/.webm` в Downloads и рабочем каталоге проверены по SHA семи missing outputs; точных совпадений нет.
- Текущее CAS health: 16 total, 9 present, 7 missing. Для восстановления outputs потребуется доступ к исходному PVE/ComfyUI storage или согласованное удаление orphan-версий.

### 607. Полное восстановление CAS с PVE
- Через ComfyUI `/history/:promptId` и `/view` найдены все 7 outputs; каждый blob проверен точным SHA и восстановлен в исходный CAS path.
- CAS health теперь `16/16 present`, `missingCount=0`; восстановление выполнено без изменения БД/AssetVersion.
- Создан `.data/backups/post-recovery-20260910` (17 файлов); `backup:verify` и изолированный `backup:restore-rehearsal` прошли: 14 public tables, 16 AssetVersion links verified.

### 608. Финальный production acceptance после очистки
- Удалены тестовые проекты и связанные job/attempt/link записи; пользовательские H3 Quality A/B и Live R2V сохранены.
- `npm run check:cas` проходит в strict-режиме (`16/16 present`, `missingCount=0`).
- `npm run check:production` полностью проходит, включая release checks, CAS gate, lineage/worker/comfy smoke и API load (100 запросов).

### 609. Повторная проверка живой лаборатории
- `npm run check:lab` повторно проходит на текущем локальном контуре: readiness, runtime health/nodes, H3 inventory/schema/profile, references, binding guard, worker injection и профильная активация.

### 610. Финальная проверка исходников после очистки
- `npm run typecheck`, `npm run build:web` и `npm run check:skeleton` прошли без ошибок.
- Production web bundle собран Vite; локальные ссылки и обязательные проектные артефакты валидны.

### 611. Синхронизация backup baseline
- `docs/operations.md` обновлён по последнему snapshot: 17 миграций, 14 public tables, 16 AssetVersion links и 17 CAS-файлов.
- Старые малые timing-замеры явно помечены как не-SLA; до production SLA требуется отдельное измерение на согласованном объёме библиотеки.

### 612. Защита CAS от чрезмерных worker outputs
- Добавлен fail-fast лимит `QWEN_MAX_OUTPUT_BYTES` (default 512 MiB): oversized output отклоняется до staging/CAS с HTTP 400 `ASSET_OUTPUT_TOO_LARGE`.
- Body parser учитывает оба лимита import/output; typecheck и полный `check:production` прошли.

### 613. Acceptance checklist расширен quota controls
- В операторский production checklist добавлены явные проверки лимитов import, output и pending jobs; отсутствие/некорректное значение не должно незаметно отключать защиту.

### 614. README синхронизирован с quota hardening
- В статусе продукта явно перечислены `QWEN_MAX_PENDING_JOBS`, `QWEN_MAX_IMPORT_BYTES` и `QWEN_MAX_OUTPUT_BYTES`, чтобы quick-start отражал действующие ограничения очереди и CAS.

### 615. Acceptance snapshot live runtime
- PostgreSQL подтверждает CAS `16/16 present`, активные H3 профили Draft 4-step, Quality 8-step и turbo production.
- `/ready` возвращает `status=ready`: ComfyUI, llama.cpp и storage доступны.
- В очереди нет pending jobs; сохранены 8 успешных H3 validation jobs и один исторический failed job для анализа отказа.

### 616. Удаление последнего тестового следа
- Failed job `Two image reference smoke` и его пустой проектный каталог удалены транзакционно вместе с attempt/manifest связями.
- `report:smoke-jobs` теперь показывает `count=0`; в PostgreSQL остались только 8 успешных validation jobs.

### 617. Проверка целостности сохранённых jobs
- Для всех 8 успешных jobs подтверждены по одному attempt и одному связанному AssetVersion; orphan `attempt_assets` и `job_selected_outputs` не обнаружены.
- Live R2V job имеет выбранный final output; семь A/B jobs сохранены как сравнительный материал без автоматического выбора quality-default.

### 618. Production gate после удаления failed job
- Полный `npm run check:production` повторно прошёл после транзакционной очистки; API load smoke: 100 запросов за 65 ms (~1527 req/s).

### 619. Lab gate после quota hardening
- `npm run check:lab` прошёл после добавления output-size guard; readiness, runtime nodes, H3 schema/profile/reference checks и worker CAS E2E без регрессий.

### 620. Единый production-readiness audit
- Добавлен `docs/production-readiness-audit.md` с матрицей требований, доказательств и остаточных условий.
- Аудит отделяет подтверждённый single-worker локальный продуктовый контур от ещё не выполненных HA/SLA условий.

### 621. Исправлена навигация README
- После добавления audit исправлена дублирующаяся нумерация quick-start списка; `check:skeleton` подтверждает 52 локальные ссылки.

### 622. Повторная сверка Director Studio
- По актуальному README референса подтверждены дополнительные поверхности: Actor/Scene/Prop workbenches, Layout study, conversational Director Agent, H3 import/test/use wizard и portable packaging.
- `docs/reference-parity.md` дополнен явным функциональным gap-list и отделяет его от уже подтверждённого H3 single-worker контура и HA/SLA условий.

### 623. Runbook для второго worker
- В `docs/operations.md` добавлена процедура регистрации второго worker, capability-aware claim, mock-приёмки и безопасной ротации credentials/fencing.

### 624. Уточнена production-граница single-node
- По сверке с Director Studio второй worker исключён из обязательных критериев текущего продукта и оставлен будущим HA-треком.
- Для single-node PVE остаются только длительные fault/load drills и согласование RPO/RTO/retention; audit и roadmap синхронизированы.

### 625. Single-node production gate после пересмотра границ
- Полный `npm run check:production` прошёл после уточнения границ; API load smoke: 100 запросов за 71 ms (~1412 req/s).

### 626. Старт parity-цели
- Создана новая active goal для функционального parity с Director Studio.
- Матрица уточнена по текущему коду: typed Media Pool и structured prompt уже существуют; следующий кодовый фокус — специализированные Actor/Scene/Prop workbenches, Layout study и пошаговый H3 import/test/activate wizard.

### 627. Контрактная проверка parity primitives
- Повторно прошли `smoke:h3-profile`, `smoke:h3-references`, `smoke:profile-revisions` и `smoke:asset-lineage`.
- Immutable graph/input injection, reference bindings, revision history и provenance lineage подтверждены перед дальнейшей UI-работой.

### 628. H3 workflow wizard — первый UI-срез
- Добавлен компонент `apps/web/src/components/WorkflowWizard.vue`: import JSON → image/audio bindings → validation step → immutable profile activation через существующий API.
- Wizard подключён в основной интерфейс; `npm run typecheck` и `npm run build:web` прошли.

### 629. Boundary validation в wizard
- Wizard теперь детерминированно обнаруживает уникальные `MiniMaxH3ReferenceToVideo`, `RandomNoise` и `SaveVideo` узлы и блокирует активацию несовместимого графа.
- Добавлен `scripts/smoke_workflow_wizard.mjs`; контрактный smoke прошёл.

### 630. Typed asset workbench UI
- Добавлен `apps/web/src/components/AssetWorkbench.vue` с отдельными режимами Actor, Scene, Prop и Layout.
- Каждый режим импортирует AssetVersion через существующий API с `assetKind`, tags и bearer token; отдельная модель данных не создаётся.
- `npm run typecheck` и `npm run build:web` прошли.

### 631. Workbench contract smoke
- Добавлен `scripts/smoke_asset_workbench.mjs`; проверены режимы Actor/Scene/Prop/Layout и обязательные поля `assetKind`/tags.

### 632. Workbench smoke включён в npm scripts
- Добавлен `npm run smoke:asset-workbench`; он проходит вместе с typecheck и защищает typed-workbench контракт от регрессий.

### 633. Wizard smoke включён в npm scripts
- Добавлен `npm run smoke:workflow-wizard`; вместе с workbench smoke, typecheck и `check:skeleton` проходит.

### 634. Release gate после parity UI
- `npm run check:release` прошёл: typecheck, web build, 19 миграций, domain/skeleton, bind guard, proxy и systemd hardening.
- Оба parity smoke (`smoke:asset-workbench`, `smoke:workflow-wizard`) также прошли.

### 635. Завершение parity-цели
- Финальный набор `check:release`, `check:lab`, `smoke:asset-workbench` и `smoke:workflow-wizard` прошёл.
- Для single-node PVE parity-цель закрыта: typed workbench UI и Layout AssetVersion/reference flow доступны, H3 wizard сохраняет immutable profile через существующий API.

### 636. ComfyUI MCP/runtime validation
- MCP `server_info` вернул ошибку инструмента, поэтому генерация через MCP не запускалась вслепую.
- PVE endpoint `192.168.10.103:8188` доступен по `/system_stats` и `/object_info`; экспортированный H3 API graph содержит ровно по одному `MiniMaxH3ReferenceToVideo`, `RandomNoise` и `SaveVideo`.

### 637. Wizard runtime preflight перед активацией
- После сохранения нового workflow wizard автоматически вызывает `/v1/workflow-profiles/:id/preflight`; активация происходит только после boundary и runtime проверки ComfyUI.
- Typecheck, web build и `smoke:workflow-wizard` прошли.

### 638. Разделены test и activate workflow
- Добавлен `POST /v1/workflow-profiles/:id/test`: boundary/runtime validation без изменения `active`.
- Wizard сначала вызывает test, затем активирует профиль через существующий preflight только при успешной проверке.
- `npm run typecheck` и полный `check:production` прошли.

### 639. Проверка reference bindings в wizard
- Wizard проверяет, что указанные image/audio node IDs существуют в графе и имеют `LoadImage`/`LoadAudio` class_type; несовместимые bindings блокируют активацию.
- Typecheck, web build и `smoke:workflow-wizard` прошли.

### 641. Финальная цель зарегистрирована и начата
- Создана новая active goal для полного single-node parity; второй worker и portable package явно исключены из acceptance.
- Добавлен `packages/workflow-adapters/src/workbenches.ts` с типизированными контрактами Actor/Scene/Prop/Layout, required inputs, output slots и AssetVersion kinds.
- `smoke_workbench_contract.mjs` и typecheck прошли.

### 642. Единый workbench adapter boundary
- Добавлены `validateWorkbenchInputs` и `mapWorkbenchOutputs`: обязательные inputs fail-fast, outputs получают slot и provenance (`source=workbench`, kind, slot).
- Workbench smoke расширен проверкой input validation и Layout output mapping; typecheck прошёл.

### 643. Local planner contract
- Добавлен `packages/contracts/src/planner.ts`: deterministic brief planning по семи режиссёрским секциям, decision SHA-256 и provenance `source=local-planner`.
- Добавлен `scripts/smoke_planner.mjs`; повторяемость decision hash и заполнение секций подтверждены.

### 644. Planner API boundary
- Добавлен `POST /v1/planner/plan`: локально структурирует режиссёрский brief и возвращает decision hash/provenance; пустой prompt отклоняется.
- Добавлен `scripts/smoke_planner_api.mjs`; API decision provenance подтверждён на отдельном процессе.

### 645. Planner Assist в shot editor
- Добавлен `PlannerAssist.vue`: кнопка вызывает локальный planner API и применяет семь секций к shot editor, показывая decision hash.
- Typecheck и production web build прошли после исправления типизации event tuple.

### 646. Generic workbench execution plan
- `planWorkbench` формирует adapterId, workflow digest, concurrency/disk requirements и output slots для typed Actor/Scene/Prop/Layout; не принимает отсутствующий или невалидный graph digest.
- Workbench smoke и `check:release` прошли.

### 647. Planner/workbench smoke entrypoints
- В npm добавлен `smoke:planner-api`; planner API, typed workbench и H3 wizard smoke теперь запускаются отдельными стандартными командами.
- Все три команды прошли в текущем окружении.

### 648. Production gate после planner API
- `npm run check:production` прошёл после добавления planner endpoint и workbench planning boundary; API load smoke: 100 запросов за 70 ms (~1419 req/s).
- Реальные графы Actor/Scene/Prop/Layout остаются следующим этапом поверх стабильного adapter boundary.

### 649. Проверка локальных workflow-исходников
- В workspace и Downloads обнаружены H3/I2V/T2V/audio графы, но готовых Actor/Scene/Prop/Layout API-format графов нет; новые модели и внешние файлы не скачивались.
- Adapter boundary расширен `createWorkbenchPlan` с provenance kind; подключение реальных графов ожидает их локальных экспортов.

### 640. Зафиксирована финальная Definition of Done
- `docs/production-readiness-audit.md` дополнен единой parity-целью: реальные Actor/Scene/Prop adapters, Layout study AssetVersion lineage, runtime-tested H3 wizard и planner provenance.
- Второй worker и portable package явно вынесены за пределы single-node acceptance.

### 650. Исполняемый workbench boundary
- Добавлен `ComfyWorkbenchExecutor`: Actor/Scene/Prop/Layout теперь имеют общий durable ComfyUI submit/poll/cancel/collect путь без подмены H3-валидацией.
- Сбор результатов маркирует workbench и provenance для последующего создания AssetVersion; граф должен содержать реальные ComfyUI nodes и не может быть пустым.
- Добавлен `smoke:workbench-executor`; `typecheck` и `check:release` прошли. Реальные production-графы четырёх workbench остаются обязательным входом следующего этапа.

### 651. Workbench plan API
- Добавлен `POST /v1/workbenches/plan`: API выдаёт проверенный typed plan с digest, requirements, output slots и provenance для Actor/Scene/Prop/Layout.
- Ошибки пустых inputs, неизвестного kind и отсутствующего SHA-256 digest возвращаются как 400; генерация не запускается до передачи валидного плана в durable jobs.
- Typecheck и smoke executor прошли.

### 652. Контрактные output slots
- `ComfyWorkbenchExecutor` теперь назначает слоты из `WORKBENCH_CONTRACTS` (`master`, `turnaround`, `establishing`, `angles`, `detail`, `layout`), а не технические индексы.
- Provenance каждого результата содержит workbench, slot и внешний ComfyUI run ID; это готовит безопасное создание AssetVersion без потери lineage.
- Typecheck и executor smoke прошли.

### 653. Каталог production workbench graphs
- Добавлен `workbench-catalog.ts` с canonical именами графов Director Studio для Actor/Scene/Prop/Layout и обязательными boundary-классами.
- `validateWorkbenchGraph` вычисляет SHA-256 digest, проверяет классы и отклоняет digest mismatch; executor использует эту проверку перед submit.
- Локальные Downloads всё ещё не содержат этих четырёх графов; это зафиксированный внешний вход, а не скрытая заглушка. `typecheck`, catalog smoke и executor smoke прошли.

### 654. Сверка с upstream workflow tree
- В upstream `Director-Studio` подтверждены точные пути `backend/workflows/{qwen_actor_asset_workbench.api.json,QwenEdit2511_MultiAngle_SceneRef.api.json,qwen_prop_master.api.json,ref_frame_layout.api.json}` и классы `LoadImage`/`SaveImage`.
- У репозитория нет опубликованного LICENSE-файла, поэтому JSON-графы не копировались в проект; в каталог внесены только имена и проверяемые boundary-требования.
- Каталог усилен обязательным `SaveImage` для четырёх image/previs workbench; smoke и typecheck требуют оба класса.

### 655. Runtime validate endpoint
- Добавлен `POST /v1/workbenches/validate`: принимает импортированный API-format graph, проверяет boundary-классы и optional expected digest, возвращает вычисленный digest только для принятого графа.
- Добавлен `smoke:workbench-validate-api`; `typecheck` и `check:release` прошли.
- Следующий шаг — сохранить принятый graph/profile и запустить его через durable job с CAS AssetVersion lineage.

### 656. Durable generic workbench profiles
- Добавлен `POST /v1/workbenches/profiles`: после validate граф сохраняется транзакционно в существующие `workflow_profiles` и `workflow_profile_revisions` с `workbenchKind` в immutable bindings.
- Сохраняется вычисленный graph hash и boundary classes; профиль остаётся неактивным до отдельного runtime/операторского approval.
- `typecheck` и `check:release` прошли.

### 657. Generic workbench test/activate
- Добавлены `POST /v1/workbenches/profiles/:id/test` и `/activate`.
- Test повторно проверяет digest/boundary и наличие `LoadImage`/`SaveImage` в живом ComfyUI `/object_info`; activation разрешается только для валидного профиля.
- `typecheck` и `check:release` прошли; дальнейшая связка — запуск profile graph через durable job и CAS upload/lineage.

### 658. Durable job принимает generic workbench profile
- `PgJobRepository.createDirector` теперь распознаёт `workflowReferenceBindings.workbenchKind` и сохраняет generic Actor/Scene/Prop/Layout profile в job plan без ошибочного H3 boundary parser.
- Graph hash остаётся частью плана; существующий worker/CAS upload path может обработать outputs тем же fencing/manifest контрактом.
- `typecheck` прошёл. Runtime E2E ожидает реальный импортированный graph и PVE ComfyUI.

### 659. Generic job-plan regression guard
- Добавлен `smoke:generic-job-plan`, проверяющий generic workbench branch в `PgJobRepository.createDirector` и сохранение graph hash в durable plan.
- `check:release` прошёл; runtime E2E остаётся привязанным к фактическому импортированному графу и доступности PVE ComfyUI.

### 660. Lab/production regression verification
- После generic profile/job изменений полностью прогнаны `npm run check:lab` и `npm run check:production`.
- Подтверждены runtime PVE H3 inventory, Comfy schema, CAS 16/16, recovery/reconcile, fencing, worker E2E, asset lineage, exports и API load без регрессий.

### 661. Acceptance matrix refresh
- `docs/production-readiness-audit.md` дополнен фактическим статусом generic profile lifecycle и durable job routing.
- Явно отмечено, что контрактные API подтверждены, но production acceptance не объявляется завершённым до импорта реальных четырёх графов и generic E2E с CAS lineage.

### 662. Workbench catalog discoverability
- Добавлен `GET /v1/workbenches/catalog`: возвращает четыре workbench-контракта, canonical upstream filenames и обязательные boundary-классы.
- Endpoint позволяет UI/automation сформировать корректный import checklist до загрузки graph; `typecheck` и `check:release` прошли.

### 663. Generic gates включены в production check
- `check:production` теперь включает catalog, validate API и generic job-plan smoke; новые workbench-контракты не могут регрессировать незаметно.
- Полный `check:production` прошёл: CAS 16/16, lab/runtime/recovery/worker E2E и API load 100 запросов (~1423 req/s).

### 664. Generic executor HTTP E2E
- Добавлен `smoke:workbench-executor-e2e` с HTTP ComfyUI double: submit → poll → collect подтверждает output slot `master` и provenance Actor.
- Smoke включён в `check:production`; `typecheck` и E2E smoke прошли. GPU runtime с реальным graph по-прежнему требует локальных upstream exports.

### 665. Полный production gate после generic E2E
- `npm run check:production` полностью прошёл после включения generic executor E2E.
- Финальный хвост gate подтверждает generic job-plan smoke и submit/poll/collect E2E; существующие CAS, recovery, H3 и API-load проверки также прошли.

### 666. MCP optional fallback documented
- В `docs/operations.md` зафиксировано: ComfyUI MCP — optional discovery/authoring канал; при его transport failure worker продолжает через прямой HTTP API ComfyUI.
- Это соответствует single-node production boundary и не требует запуска второго worker или облачного провайдера.

### 667. Подтверждённый PDD quality candidate для Porsche SCENE-02
- Успешно исполнен и сохранён API graph `.data/comfyui-workflows/video_mmh3_fl2v_PDD8_fixed_test_qc-718-pdd8-api.json`; исходный UI workflow оставлен без изменений. Prompt ID `25423e84-dc69-41d4-b2b0-d83a7e94aada`, graph SHA-256 `94a876ac64acb397c9af7b8f00321dc4fde79874ec00bf3ed0f23d288ef2f635`.
- Ролик 1344×768, 124 кадра @24 fps, 5.167 s импортирован в локальный CAS как `ba37e183-1040-4960-8998-fc31120bea98` (SHA-256 `145bb2e89cc8305c65aebb8d72bc9a9634182dc6eb6b47d3183bd503087ce02d`). Пользователь подтвердил, что качество стало нормальным.
- Зафиксированные настройки: INT8 ConvRot FL2VA + official PDD Acc 8-step, Euler, NFE 8, SigmaShift 12/3; low-res pass 896×512; PDD tail 8 NFE / denoise 0.25; FP32 3D latent upscaler до 1344×768 с temporal chunking. Тот же кадр `3.jpeg` и seed 7180218.
- Для QC отключён недоступный last frame; I2V source подан на оба прохода. Длительность исходного saved graph изменена с 15 на 5 s. ComfyUI 0.39.0 завершил prompt успешно, queue вернулась в 0/0; минимум свободной VRAM в наблюдаемом snapshot ~0.88 GiB.
- Этот результат не является причинным A/B с high-res native прогоном: кроме PDD и двух проходов, здесь не применялись RefMods. Качество подтверждено пользователем; baseline зафиксирован, но не приписывать весь выигрыш одной настройке. Не включать как production default на одном субъективном результате. Для дальнейшего A/B брать сохранённый API graph за baseline и менять один фактор. Не использовать `video_mmh3_i2v_lora_PDD_ACC_8NEW.json` как эталон PDD: по проводке его PDD branch не подключает PDD sigma output к sampler и использует `res_multistep`/BasicScheduler.


### 668. Приоритизация оставшейся работы (2026-10-10)
- Проверен локальный поиск в QwenDirector, Downloads и Porsche refs: canonical Actor/Scene/Prop/Layout Comfy API graphs не найдены. Реальные workflows нельзя подменять синтетическими без пользовательских требований/референсов.
- Read-only `GET /v1/workbenches/catalog` на локальном API отвечает; все четыре контракта и ожидаемые filenames доступны. Generic validate/profile/test/activate/job/CAS executor уже реализован по предыдущим записям.
- Приоритет №1: получить четыре canonical graph exports (или выбрать один — Actor для вертикального среза), импортировать, validate, сохранить inactive immutable profile, runtime-test, затем вручную approve durable job и подтвердить CAS lineage.
- До появления graph-файла следующий продуктивный шаг — локальный workflow export из ComfyUI; не создавать фиктивный граф и не запускать GPU. Не запускал тесты и генерацию.
