# QwenDirector

Локальная режиссёрская студия для планирования и производства AI-видео. Проекты, сцены, шоты, референсы и результаты принадлежат студии, а не конкретной модели.

**Статус на 2026-11-16:** QwenDirector содержит локальные project/scene/shot каталоги, workflow revisions, references/Media Pool, ручное job approval, durable worker lifecycle, CAS provenance, H3 event planning и derived timeline. Production readiness и границы подтверждений ведутся в [отдельном аудите](docs/production-readiness-audit.md). Реальная генерация через локальный ComfyUI подтверждалась ранее для отдельных конфигураций; mock E2E и schema preflight сами по себе не доказывают приемку нового пользовательского production workflow. Модель и workflow следующего клипа не зафиксированы: AI-Everywhere начинается заново с новым сценарием и аудиотреком.

H3 event plans и монтажная timeline — производные структуры внутри существующей модели Project → Scene → Shot. Event/audio timing без подтверждённого источника отображается как непроверенный и не запускает generation автоматически.

## Начать здесь

### Быстрый старт для разработки

Инструкция для чистой установки на Windows 11, macOS и Linux: [docs/start-local.md](docs/start-local.md). Для Windows понадобятся Git, Node.js LTS, npm и Docker Desktop. Секреты и локальные данные остаются на машине разработчика.

Для Codex и других агентов сначала прочитайте [AGENTS.md](AGENTS.md), затем [контекст следующей сессии](docs/next-session.md). Не используйте лабораторные адреса и пути из заметок как настройки для чужого компьютера.

**Интеграция с Kadr остаётся отдельным треком:** предложение описано в [docs/kadr-integration.md](docs/kadr-integration.md) и не меняет текущую автономную QwenDirector архитектуру.

1. [Контекст следующей сессии](docs/next-session.md).
2. [Production-readiness audit](docs/production-readiness-audit.md).
3. [Продукт и границы MVP](docs/product-brief.md).
4. [Архитектура и протокол исполнения](docs/architecture.md).
5. [Решение: собственное ядро или форк](docs/decision-records/ADR-001-architecture.md).
6. [Этапы и критерии готовности](docs/roadmap.md).
7. [Эксплуатация лаборатории](docs/operations.md).
8. [Контракт адаптера](docs/workflow-adapter-contract.md).
9. [Сверка reference-проектов и backlog](docs/reference-parity.md).
10. [Лаборатория оптимизации H3](docs/h3-optimization-lab.md).
11. [Правила работы агента](AGENTS.md).
12. [Режиссёрские подсказки и MiniMax H3](docs/director-method.md).
13. [Новая точка старта AI-Everywhere](docs/ai-everywhere/README.md).
14. [Методика сценарной разработки и review](docs/scenario-review-method.md).

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
npm run preflight:active-workflows
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

`/health` — liveness, `/ready` — готовность generation path (ComfyUI + storage); недоступный optional planner отражается `degraded`, но не блокирует image/video jobs. `check:production` — автономный gate кода, схемы, безопасности и durable lifecycle; `check:lab` — gate живой H3-лаборатории (runtime/schema/profile/reference/worker). `preflight:active-workflows` сверяет каждый активный сохранённый H3 и workbench workflow с текущей схемой ComfyUI; читает БД в `READ ONLY` и вызывает только `/object_info`, без submit задач. `cas:gc-report` формирует только dry-run отчёт и ничего не удаляет. Manifest скачивается как attachment с `no-store` и содержит исходный `job_id`.

Для явного планирования каталога доступны `POST /v1/projects`, `POST /v1/projects/:projectId/scenes`, `POST /v1/scenes/:sceneId/shots` и PATCH-маршруты переименования. При запуске job из UI передаются IDs существующего каталога; повторный submit с тем же `idempotencyKey` возвращает replay и не создаёт дубликат.

PostgreSQL smoke-команды и `check:production`/`check:lab` требуют отдельную локальную тестовую БД: задайте `QWEN_TEST_DATABASE_URL` и `DATABASE_URL` одинаковыми URL loopback PostgreSQL, имя БД должно оканчиваться на `_test`. Проверка откажется выполнять миграции и smoke на рабочей БД. Пример: `postgresql://<user>:<password>@127.0.0.1:54329/qwendirector_test`. Миграции, CAS reports, smoke-job reports и backup preflight также требуют явный `DATABASE_URL` и не выбирают базу через Unix socket или неявный default. Для `cas:gc-report` с `_test` БД задайте изолированный `QWEN_ASSET_ROOT` и передайте `--allow-test-db`; без обоих параметров отчёт откажется считать production CAS сиротами относительно пустой тестовой базы.
