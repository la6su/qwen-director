# QwenDirector

Локальная режиссёрская студия для планирования и производства AI-видео в домашней лаборатории. Проекты, сцены, шоты, референсы и результаты принадлежат студии, а не конкретной модели.

**Статус на 2026-11-15:** локальный single-worker контур работает на PostgreSQL: project/scene/shot catalog, immutable workflow profiles/revisions, references/Media Pool, approval/lease/fencing/cancel/reconcile, CAS AssetVersion/provenance, runtime health/recovery, structured logs, optional TLS, migrations, quotas и systemd hardening gates реализованы. Реальный MiniMax H3 R2V E2E и durable job lifecycle подтверждены; H3 PDD Acc 8-step + 3D latent upscale QC baseline сохранён как исторический quality candidate. В продолжающемся пользовательском анализе текущий лучший вариант пока — стандартный Ref2V с INT8 pruned UNET + Pika Flex; это не финальный выбор и не глобальный default. QwenDirector импортирует и проверяет этот профиль, показывает model stack рядом с именем workflow и сохраняет обычный manual approval до GPU submit. Локальный Planner Assist использует llama.cpp, PostgreSQL session history, read-only контекст выбранного проекта/workflow и видимый диалог для итеративной правки shot plan; произвольный свободный чат и write/job tools не добавлены. ComfyUI на workstation обновлён до официального v0.45.0; сохранённый Pika Flex graph прошёл live schema/preflight после обновления, generation не запускалась. Workflow wizard и typed workbench execution поддерживают явный saver-node → output-slot mapping; mock E2E подтверждает сохранение node/slot provenance через worker CAS manifest. Следующий обязательный блокер — подключить реальные локальные production Actor/Scene/Prop/Layout графы и пройти на одном выбранном графе полный ручной approval → ComfyUI generation → durable CAS lineage; импорт AIMixer demo отдельно ограничен отсутствующими source refs. Single-worker acceptance уже имеет production/lab gates; полный SLA требует длительных fault/load drills и согласованных RPO/RTO/retention. Второй физический worker нужен только для будущего HA.

## Начать здесь

### Быстрый старт для разработки

Инструкция для чистой установки на Windows 11, macOS и Linux: [docs/start-local.md](docs/start-local.md). Для Windows понадобятся Git, Node.js LTS, npm и Docker Desktop. Секреты и локальные данные остаются на машине разработчика.

Для Codex и других агентов сначала прочитайте [AGENTS.md](AGENTS.md), затем [контекст следующей сессии](docs/next-session.md). Не используйте лабораторные адреса и пути из заметок как настройки для чужого компьютера.

**Интеграция с Kadr остаётся отдельным треком:** предложение описано в [docs/kadr-integration.md](docs/kadr-integration.md) и не меняет текущую автономную QwenDirector архитектуру.

1. [Контекст следующей сессии](docs/next-session.md).
2. [Production-readiness audit](docs/production-readiness-audit.md).
3. [Продукт и границы MVP](docs/product-brief.md).
4. [Режиссёрская карта Porsche 718 Spyder RS](docs/director-treatment-718-spyder-rs.md).
5. [Архитектура и протокол исполнения](docs/architecture.md).
6. [Решение: собственное ядро или форк](docs/decision-records/ADR-001-architecture.md).
7. [Этапы и критерии готовности](docs/roadmap.md).
8. [Эксплуатация лаборатории](docs/operations.md).
9. [Контракт адаптера](docs/workflow-adapter-contract.md).
10. [Сверка с Director Studio и parity backlog](docs/reference-parity.md).
11. [Лаборатория оптимизации H3](docs/h3-optimization-lab.md).
12. [Правила работы агента](AGENTS.md)
13. [Режиссёрские подсказки и MiniMax H3](docs/director-method.md)

## Каркас

- `apps/web` — Vue 3 + Vite; TresJS/Three.js появятся на этапе превиза.
- `apps/api` — Node.js LTS + Fastify: проекты, утверждения, очередь и планировщик.
- `apps/worker` — исходящее соединение с API, запуск адаптеров на узле через нативный процесс/systemd.
- `packages/domain` — сущности и переходы состояний.
- `packages/contracts` — версионированные DTO и схемы валидации.
- `packages/workflow-adapters` — mock, ComfyUI и будущие исполнители.
- `packages/storage` — интерфейс локального content-addressed хранилища.
- `packages/config` — проверка конфигурации и безопасные значения по умолчанию.

Выбран npm workspace. Runtime не зависит от Docker: PVE/PCT изолирует ComfyUI, а Ubuntu/Sway запускает llama.cpp, API и workers нативно через systemd. Python — только тонкий адаптер при необходимости; бизнес-логика остаётся в TypeScript.

## Проверить без сети

```sh
python3 scripts/check_skeleton.py
```

Проверка читает локальные документы и JSON. Это не тест работающего приложения. [Compose](docker-compose.dev.yml) содержит только опциональную dev-БД; запускать его на текущем этапе не требуется. Перед будущим запуском скопировать [.env.example](.env.example) в `.env`, заменить пароль и проверить наличие разрешённого локального образа.

## Production gates локального контура

```sh
npm run check:production
npm run check:lab
npm run check:release
npm run check:migrations
npm run probe:h3-inventory
curl -fsS http://127.0.0.1:4310/ready
BACKUP=$(npm run -s backup:local | sed -n 's/.* at \([^ ]*\) (.*/\1/p')
npm run backup:verify -- "$BACKUP"
npm run backup:catalog-check -- "$BACKUP"
npm run cas:gc-report
npm run staging:gc-report
```

Production user-units устанавливаются через `bash scripts/install_user_units.sh`; API/worker/web не стартуют автоматически этим скриптом, чтобы не прерывать активную лабораторию. После проверки ручных процессов units запускаются `systemctl --user start qwendirector-api.service qwendirector-worker.service qwendirector-web.service`.

`/health` — liveness, `/ready` — готовность generation path (ComfyUI + storage); недоступный optional planner отражается `degraded`, но не блокирует image/video jobs. `check:production` — автономный gate кода, схемы, безопасности и durable lifecycle; `check:lab` — gate живой H3-лаборатории (runtime/schema/profile/reference/worker). `cas:gc-report` формирует только dry-run отчёт и ничего не удаляет. Manifest скачивается как attachment с `no-store` и содержит исходный `job_id`.

Для явного планирования каталога доступны `POST /v1/projects`, `POST /v1/projects/:projectId/scenes`, `POST /v1/scenes/:sceneId/shots` и PATCH-маршруты переименования. При запуске job из UI передаются IDs существующего каталога; повторный submit с тем же `idempotencyKey` возвращает replay и не создаёт дубликат.
