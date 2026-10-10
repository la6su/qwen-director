# Эксплуатация и аудит

## Текущий статус

Текущий локальный контур уже работает на PostgreSQL: API, worker, filesystem CAS, runtime/readiness checks и ComfyUI MiniMax H3 E2E подтверждены. Инвентаризация ниже остаётся источником эксплуатационных фактов и должна обновляться при смене узлов; Proxmox-кластеры и часть аппаратной топологии — исходные сведения пользователя, а не автоматически подтверждённый inventory.

Подтверждённые локальные endpoints: API `127.0.0.1:4310`, llama.cpp `127.0.0.1:8081`, ComfyUI/PVE `192.168.10.165:8188`. Последний runtime check показал ComfyUI H3 capabilities и успешную persistence-проверку. Backup/verify и CAS GC пока выполняются операционными командами вручную.

Быстрый read-only smoke API перед/после обслуживания: `npm run smoke:api-load` (100 параллельных запросов `/health` и `/ready`; число задаётся `QWEN_LOAD_REQUESTS`, максимум 1000). Он не запускает GPU-задачи и не меняет данные.

Единый локальный production-check: `npm run check:production`. Он применяет отсутствующие миграции, запускает release gate, capability-aware multi-node smoke и read-only API load smoke; GPU-задачи не создаются.

Для LAN-доступа задавать `QWEN_API_TOKEN` через защищённый environment/systemd credential store; токен не помещать в `.env.example`, логи или plan snapshots. Без токена API предназначен только для loopback-dev.

Operator Media Pool import использует `/v1/assets/import`: лимит задаётся `QWEN_MAX_IMPORT_BYTES` (default 100 MiB), SHA-256 проверяется до CAS promotion, повторный SHA возвращает существующий AssetVersion. Worker output upload ограничен `QWEN_MAX_OUTPUT_BYTES` (default 512 MiB) до записи в staging. Ошибочные staging-файлы очищаются storage; orphan GC выполняется только после grace-period dry-run отчёта.

Для защиты очереди задавать `QWEN_MAX_PENDING_JOBS` (целое неотрицательное число; `0` — без лимита). При достижении лимита новые director jobs получают `429 JOB_QUOTA_EXCEEDED`; существующие jobs не изменяются.

Для повторного запуска failed job использовать `POST /v1/jobs/:id/retry` с actor. Retry разрешён только в пределах `retry_budget` последнего approval, переводит job в `awaiting_approval` и всегда требует нового ручного approval; автоматического GPU-запуска endpoint не выполняет.

## Инвентаризация

Для каждого узла заполнить: alias, cluster, VM/container/host, OS, GPU UUID/name/VRAM/driver, доступность GPU внутри worker environment, RAM, диск/free space, endpoint локального исполнителя, модели/digests, workflows/digests, владелец и разрешённое concurrency. Не помещать токены и приватные адреса в публичные отчёты.

```sh
hostnamectl
uname -a
nvidia-smi --query-gpu=uuid,name,memory.total,memory.free,driver_version --format=csv
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINTS
df -h
node --version
npm --version
python3 --version
docker --version
docker compose version
```

Команды запускать только на уже доступной машине; не делать сетевое сканирование, SSH-подключения или изменения passthrough автоматически. Отсутствующая команда — наблюдение, не повод установить пакет. Версии и API Ollama/ComfyUI проверить по локальной установленной документации и разрешённым endpoints.

## Необязательный disposable Compose

[docker-compose.dev.yml](../docker-compose.dev.yml) сохранён только для временной разработки, если понадобится быстро поднять отдельный PostgreSQL. Он не нужен для runtime: предпочтительный путь — нативный PostgreSQL/systemd либо отдельный PVE/PCT-сервис. `pull_policy: never` предотвращает автоматическую загрузку отсутствующего образа. API, worker и llama.cpp в Compose не заявлены.

На Ubuntu/Sway API, worker и llama.cpp запускаются отдельными systemd user units. ComfyUI остаётся в PVE `pct 103` и управляется средствами контейнера.

Для optional Comfy MCP использовать отдельное Python-окружение `~/.venvs/qwen-director`, управляемое `uv`; оно не является частью Node workspace и не должно попадать в git:

```sh
uv venv ~/.venvs/qwen-director --python 3.14
uv pip install --python ~/.venvs/qwen-director/bin/python comfy-mcp==0.10.0 comfy-cli==1.22.0 mcp==2.3.0
~/.venvs/qwen-director/bin/comfy-mcp --help
```

Для удалённого PCT задавать MCP-процессу `COMFYUI_URL=http://192.168.10.165:8188`. Текущий Codex MCP entry `comfy` ограничивает инструменты read-only allowlist (`server_info`, `discover`, `list_workflow_slots`, `list_workflow_notes`) и использует prompt approval. После изменения конфигурации требуется новая Codex-сессия. MCP server_info не является live health probe удалённого ComfyUI; проверять его отдельным HTTP/API запросом. Не включать submit, upload, установку моделей/custom nodes или lifecycle-команды без отдельного разрешения.

Если ComfyUI MCP недоступен или его transport закрыт, production-контур не считается остановленным: worker использует прямой ComfyUI HTTP API (`/prompt`, `/history`, `/view`, `/interrupt`) через `ComfyPromptExecutor`/`ComfyWorkbenchExecutor`. MCP остаётся optional discovery/authoring каналом и не является единственной точкой выполнения.

Примеры unit-файлов находятся в [`deploy/systemd`](../deploy/systemd), включая API, worker и web preview. Шаблоны используют явный NVM PATH (systemd user не читает интерактивный shell profile); API также требует `QWEN_API_AUTOSTART=true`. Перед установкой нужно проверить путь к checkout, собрать web (`npm run build:web`), а также проверить пути к llama.cpp/GGUF и права каталога моделей.

Для текущего checkout после разрешённой установки units:

```sh
mkdir -p ~/.config/systemd/user
cp deploy/systemd/qwendirector-api.service.example ~/.config/systemd/user/qwendirector-api.service
cp deploy/systemd/qwendirector-worker.service.example ~/.config/systemd/user/qwendirector-worker.service
cp deploy/systemd/qwendirector-web.service.example ~/.config/systemd/user/qwendirector-web.service
systemctl --user daemon-reload
systemctl --user enable --now qwendirector-api.service qwendirector-worker.service qwendirector-web.service
systemctl --user status qwendirector-api.service qwendirector-worker.service qwendirector-web.service
```

Сохранённые исходники текущего ComfyUI mirror находятся в локальной игнорируемой папке `.data/comfyui-workflows/`. Это UI-format JSON; workflow следует экспортировать из ComfyUI через `Save (API format)` и проверить `/v1/workbenches/validate` перед созданием профиля. MCP `list_workflow_slots` может падать на части UI-графов из-за JSON envelope от установленного comfy-cli, поэтому сверять исходную структуру и node inventory напрямую.

## Generic workbench import lifecycle

1. Загрузить API-format JSON Actor/Scene/Prop/Layout из локального ComfyUI.
2. Вызвать `POST /v1/workbenches/validate` и сохранить возвращённый SHA-256 digest.
3. Создать неактивный профиль через `POST /v1/workbenches/profiles` с `expectedDigest`.
4. Выполнить `/v1/workbenches/profiles/:id/test`, затем `/activate` только после успеха.
5. Запустить director job с `workflowProfileId` и `workflowReferenceBindings.workbenchKind`.

Тест обязателен: он проверяет digest, boundary и наличие нужных классов в живом ComfyUI. Outputs worker проходят общий fencing/manifest/CAS путь и сохраняют AssetVersion provenance.

Для повторяемой установки тех же user-units можно запустить `./scripts/install_user_units.sh`. Скрипт не останавливает вручную запущенные процессы и не запускает сервисы автоматически.

После изменения кода перезапускать API/worker адресно: `systemctl --user restart qwendirector-api.service` или `systemctl --user restart qwendirector-worker.service`; API unit перед стартом выполняет `npm run db:migrate`, ComfyUI в PVE не перезапускается автоматически.

Будущий запуск после разрешённой подготовки зависимостей:

```sh
cp .env.example .env
# Отредактировать .env: задать локальный пароль.
docker compose -f docker-compose.dev.yml --profile dev config --quiet
docker compose -f docker-compose.dev.yml --profile dev up -d postgres
# Остановить, сохранив volume:
docker compose -f docker-compose.dev.yml --profile dev stop
```

Не использовать `down -v` для обычной остановки. PostgreSQL без TLS допускается только в loopback-dev. Для нескольких узлов БД остаётся закрытой, workers подключаются к API по TLS/VPN с отдельными credentials. Bind API на loopback — default; LAN expose требует конфигурации auth и маршрута. API поддерживает локальный TLS через парные `QWEN_TLS_CERT_FILE` и `QWEN_TLS_KEY_FILE`; при задании только одного файла запуск отклоняется.

## Ресурсы и отказ

Перед claim проверяются requirements и reservations; перед submit — фактический диск/VRAM/model/workflow. OOM не приводит к скрытому снижению разрешения. При disk-full новые jobs приостанавливаются, временные данные удаляются только по проверенной retention policy. Контролировать queue age, heartbeat age, attempt durations, free disk, adapter errors и quarantined devices. Логи структурированные с job/attempt IDs, без prompt bodies и credentials по умолчанию.

Потеря узла: запретить новые назначения → пометить stale → проверить внешние run IDs → подтвердить остановку/завершение → вернуть ресурс. Не освобождать GPU только по истечению lease. Отмена без адресного backend API требует эксклюзивного backend instance либо ручного решения.

## Backup и восстановление

### Процедура миграций

Перед изменением схемы остановить новые claims, выполнить `npm run check:migrations`, создать backup (`npm run backup:local`), затем применить миграции штатным migration runner. После применения повторить `check:migrations`, `backup:catalog-check` для нового snapshot и smoke-контур. При ошибке миграции не выполнять автоматический rollback поверх рабочей БД: восстановить backup в отдельную БД, проверить совместимость worker protocol и переключать координатор только после ручного решения.

Целевые SLA RPO/RTO для большой библиотеки пока не согласованы. Последний подтверждённый локальный baseline выполнен на snapshot с 17 миграциями, 14 public tables, 16 AssetVersion links и 17 CAS-файлами; `backup:verify` и изолированный `backup:restore-rehearsal` прошли. Старые замеры времени на малом snapshot не следует использовать как SLA для текущего объёма, сетевого или крупного хранилища — требуется повторное измерение после согласования объёма библиотеки. Базовый план: остановить новые claims, дождаться завершения uploads/commits или перевести исполнение в обслуживание; зафиксировать согласованный dump БД и snapshot blobs, workflow manifests и конфигурации без plaintext credentials. Сохранить backup manifest с hashes, schema version и временем. Кэши worker не являются первичным хранилищем.

Восстанавливать сначала в отдельную локальную БД и каталог; проверить все referenced hashes и контрольный проект. До включения scheduling сверить незавершённые attempts с журналами workers, сменить instance epoch/credentials при необходимости и отклонять старые fencing tokens. Только после проверки переключить координатор. Не накатывать backup поверх единственной рабочей копии. Секреты резервируются отдельно защищённым способом.

### Ввод второго worker

После появления второго узла worker регистрируется отдельным `instanceId` через `POST /v1/nodes/register` с минимально необходимым capability-набором. Затем он должен отправить heartbeat, пройти `smoke:multi-node`/capability-aware claim и выполнить контролируемую mock-задачу. До этих проверок узел не переводится в рабочий scheduling pool. Credential хранится только в локальном окружении worker; при ротации старый instance epoch и fencing tokens должны быть отклонены.

## Обновления и данные

## Production acceptance checklist

### H3 quality A/B policy

Профиль `video-minimax-h3-r2v` с LoRA `minimax_h3_ref2v_turbo_4step_v0.1` считать быстрым draft-профилем, а не единственным production quality-профилем. Для сравнения создавать отдельную immutable revision/profile на 8 шагов с тем же seed, разрешением, длиной, prompt и references; сравнивать лицо/identity, motion consistency, audio и время/VRAM. Не менять 4-step граф задним числом: queued/running jobs должны сохранять исходный snapshot.

Лабораторное обновление 2026-09-10: PVE объявляет совместимую `MiniMax-H3-Ref2VA-Acc-8Step.safetensors`; профиль `h3-ref2v-quality-8step-local` активен. Выполнены три технически валидные пары с одинаковыми seed/prompt/references/size/length; 8-step заметно отличается от 4-step и даёт более читаемую детализацию на просмотренных кадрах. Это ещё не автоматическое назначение quality-default: оператор должен завершить ручную карточку motion/texture/flicker по всем трём парам.

По внешней проверке найден отдельный кандидат именно для Ref2VA: `minimax_h3_ref2va_pdd_acc_8step_comfyui.safetensors` из проекта PDD-Acc. Его не устанавливаем автоматически; перед любым изменением нужно подтвердить лицензию, digest, совместимость с текущим UNet и разрешение оператора.

Перед объявлением production-ready оператор должен подтвердить все пункты:

- второй физический worker зарегистрирован с отдельным instance/credential и прошёл capability-aware claim;
- выполнены fault-drill для restart worker/API, истёкшего lease, stale completion, cancel race и потери ответа submit;
- согласованы RPO/RTO и retention/quota policy для БД, CAS originals, variants, staging и logs;
- backup/restore rehearsal выполнен на отдельном пути с проверкой hashes, schema version и контрольного проекта;
- после переключения credentials старые fencing tokens отклоняются, а queue age/heartbeat/attempt duration доступны оператору.
- лимиты `QWEN_MAX_IMPORT_BYTES`, `QWEN_MAX_OUTPUT_BYTES` и `QWEN_MAX_PENDING_JOBS` заданы явно для окружения и проверены на безопасное fail-closed поведение.

Текущая локальная проверка закрывает протокол, mock fault paths и один физический worker; пункты выше являются обязательными условиями масштабирования за пределы этой лаборатории.

Миграции должны иметь preflight, backup и проверку совместимости workers. Перед запуском API применять идемпотентный runner `npm run db:migrate`; он ведёт таблицу `schema_migrations` и выполняет только отсутствующие версии. Неизвестная версия протокола — отказ регистрации. Retention раздельна для оригиналов, вариантов, staging и logs; значения утвердить после замера объёмов. GC сначала формирует отчёт, учитывает ссылки и grace period. При первой реализации приоритет — восстановление из backup; обратная SQL-миграция не считается автоматически безопасной.
