# worker

TypeScript worker для локальных исполнителей. Регистрирует node, поддерживает heartbeat и capability-aware claim, выполняет durable attempts через HTTP hooks API и не подключается к БД напрямую.

Поддерживаемые execution paths:

- `llama.cpp` — локальное текстовое выполнение через `QWEN_LLAMA_URL`;
- `comfyui` — загрузка references, инъекция immutable H3 workflow snapshot и polling/collect финального output через `COMFYUI_URL`.

Запуск из checkout:

```sh
npm --workspace apps/worker run start
```

Для постоянного запуска используй пример unit-файла [`deploy/systemd/qwendirector-worker.service.example`](../../deploy/systemd/qwendirector-worker.service.example). Worker не запускает job без ручного approval и не хранит состояние в собственной БД.

См. [архитектуру](../../docs/architecture.md) и [следующую сессию](../../docs/next-session.md).
