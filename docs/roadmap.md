# Этапы реализации

Этапы последовательны; оценка сроков возможна после аудита. MVP работает с одним worker, но сразу использует сетевой контракт и durable attempts. Multi-node не откладывает проектирование протокола, а проверяет его на нескольких узлах.

## Фактический статус на 2026-09-10

- **0 Discovery:** частично подтверждён — PVE ComfyUI, PostgreSQL, llama.cpp и локальные storage endpoints проверены; полная инвентаризация второго физического worker ещё не выполнена.
- **1 MVP vertical slice:** подтверждён — project/scene/shot UX, durable jobs, approval, CAS/provenance, references, export и реальный H3 E2E зафиксированы в `docs/next-session.md`.
- **2 Multi-node:** протокол и fencing подтверждены smoke-тестами; второй физический worker отложен как будущий HA-трек, длительные fault drills остаются эксплуатационным gap.
- **3 Assets/preview:** Media Pool, typed asset metadata/filter, CAS preview, lineage API и read-only timeline overview реализованы; TresJS-превиз и полноценный timeline compositor ещё не закрыты.
- **4 Production hardening:** backup/restore rehearsal, auth/TLS guards, retention dry-run, metrics и runbooks подтверждены; H3 optimization inventory/preflight guards добавлены. Три технически валидные Ref2V A/B пары выполнены, но quality-default, согласованные RPO/RTO, quotas и длительные load/fault drills требуют отдельного решения.

## 0. Discovery и аудит лаборатории

Результаты: локальная инвентаризация узлов/GPU/VRAM/дисков/сети, endpoints и версии Ollama/ComfyUI, список моделей и digest, один разрешённый workflow, анализ Director Studio при наличии checkout, ADR с уточнениями, зафиксированные версии инструментов.

Готовность: выбраны координатор и первый worker, подтверждены пути хранения и свободное место; согласованы offline-зависимости, сетевой доступ, лимиты запуска и recovery expectations. Есть матрица «требование → наблюдение → решение», неизвестные данные явно отмечены. Ничего не установлено на GPU-узлах без отдельной задачи.

## 1. MVP: вертикальный сценарий

Результаты: Vue UI, Fastify API, migrations, PostgreSQL queue, filesystem storage, версии сценария/промпта, загрузка референсов, approval, mock-worker и один ComfyUI adapter. Экспорт manifest + выбранных ассетов.

Готовность: проект из двух шотов проходит draft → approval → generation → выбор результата; UI показывает ошибки и происхождение. Повторный POST не создаёт job; рестарт API сохраняет очередь; отменённый job не принимает поздний результат. Одинаковый шот получает варианты от mock и ComfyUI без изменения схемы Shot. Изменение плана инвалидирует approval. Тесты используют mock для отказов; реальный smoke выполняется только на разрешённом локальном workflow.

## 2. Multi-node

Результаты: registration/credentials, capability discovery, device reservations, heartbeat, leases/fencing, локальный журнал worker, reconcile, ограниченные retries и UI доступности узлов.

Готовность: два worker на разных узлах получают только совместимые задачи; одна GPU не назначается двум job. Проверены разрыв связи, рестарт worker/API, зависшая генерация, stale completion, cancel/success race и потеря ответа submit. Нет слепого повторного запуска при неизвестном состоянии. Потерянный узел виден пользователю, ресурс удерживается до сверки. Отзыв токена закрывает node API.

## 3. Ассеты и превиз

Результаты: типы/теги/фильтр/варианты/lineage, proxy previews, timeline shot planning; TresJS/Three.js для камеры, композиции, света и экспорта референса. Превиз — ещё один источник AssetVersion.

Готовность: замена превиз-референса создаёт новую revision, не изменяя старые генерации; manifest восстанавливает связи. На целевой workstation проверены рендерер и fallback, lifecycle cleanup, memory/performance budget. WebGPU не считается обязательным до проверки совместимости; WebGL-путь предусматривается как отдельный проверяемый сценарий.

## 4. Production hardening

Результаты: backup/restore, auth/TLS, quotas, retention/GC, structured logs/metrics, schema migrations/rollback plan, security review workflow и importer, operator runbook.

Готовность: восстановление БД и blobs на отдельный локальный путь воспроизводит контрольный проект; измерены RPO/RTO и согласованы с пользователем. Проверены disk-full, повреждённый upload, ротация credentials, migration failure и длительная очередь. Логи не содержат секретов; egress по умолчанию закрыт; удаление assets требует отсутствия ссылок и имеет dry-run. Нагрузочные бюджеты утверждены по измерениям, а не по названию GPU.

## Первый рабочий срез

Начать с TypeScript contracts + mock adapter + state machine tests, затем migrations и API, затем минимальный UI. Не начинать с 3D-редактора или интеграции всех моделей. [Следующая сессия](next-session.md) содержит команды и ограничения.
