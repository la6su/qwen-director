# QwenDirector

Локальная режиссёрская студия для планирования и производства AI-видео в домашней лаборатории. Проекты, сцены, шоты, референсы и результаты принадлежат студии, а не конкретной модели.

**Статус на 2026-10-10:** локальный single-worker контур работает на PostgreSQL: project/scene/shot catalog, immutable workflow profiles/revisions, references/Media Pool, approval/lease/fencing/cancel/reconcile, CAS AssetVersion/provenance, runtime health/recovery, structured logs, optional TLS, migrations, quotas и systemd hardening gates реализованы. Реальный MiniMax H3 R2V E2E и durable job lifecycle подтверждены; новый пользовательски одобренный H3 PDD Acc 8-step + 3D latent upscale QC baseline сохранён вместе с graph, provenance и CAS output в `docs/next-session.md` и `docs/h3-optimization-lab.md`. Это quality candidate, не глобальный default. Следующий обязательный продуктовый блокер — импорт локальных Actor/Scene/Prop/Layout Comfy-графов и подтверждение durable job → CAS lineage E2E; контракты и generic executor готовы. Single-worker acceptance уже имеет production/lab gates; полный SLA требует длительных fault/load drills и согласованных RPO/RTO/retention. Второй физический worker нужен только для будущего HA.

## Начать здесь

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

`/health` — liveness, `/ready` — проверка ComfyUI, llama.cpp и PostgreSQL. `check:production` — автономный gate кода, схемы, безопасности и durable lifecycle; `check:lab` — gate живой H3-лаборатории (runtime/schema/profile/reference/worker). `cas:gc-report` формирует только dry-run отчёт и ничего не удаляет. Manifest скачивается как attachment с `no-store` и содержит исходный `job_id`.

Для явного планирования каталога доступны `POST /v1/projects`, `POST /v1/projects/:projectId/scenes`, `POST /v1/scenes/:sceneId/shots` и PATCH-маршруты переименования. При запуске job из UI передаются IDs существующего каталога; повторный submit с тем же `idempotencyKey` возвращает replay и не создаёт дубликат.
