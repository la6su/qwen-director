# Референс Director Studio и переносимые идеи

Основной UX и execution-референс теперь [ai2764/Director-Studio](https://github.com/ai2764/Director-Studio), зафиксированный для аудита на `main` commit `aa4ac92fc4835b6b0a36bb2ee0f29f081d895244` (проверено 2026-09-09). В репозитории не найден файл `LICENSE`, поэтому лицензию и перенос кода считаем неподтверждёнными. README описывает local-first workspace на FastAPI/React: typed asset library, Actor/Scene/Prop/Layout workflows, шестисекционный H3 prompt, ComfyUI MCP, durable jobs и exclusive VRAM coordination.

Прежний [MiniMax-H3-Director-Cut-Studio](https://github.com/karuvanan/MiniMax-H3-Director-Cut-Studio) остаётся вторичным UX-источником.

## Что берём как продуктовые идеи

- project-level timeline с явными Shot Units и длительностью;
- отдельные логические Media Pool и фактические слоты workflow;
- prompt compiler из режиссёрских полей: камера, действие, композиция, свет, звук, переход;
- reference bindings с ролями и стабильными идентификаторами;
- preview/final take и ручное принятие результата;
- импорт/экспорт design JSON и воспроизводимый manifest;
- semantic enrichment как отдельный слой наблюдений и выводов с отметкой stale.

## Что не копируем в ядро

Director Studio ориентирован на MiniMax H3 Ref2VA и конкретные workflow JSON. В QwenDirector Shot, GenerationSpec и AssetVersion не содержат H3 node IDs, фиксированное число media slots, обязательный cloud runtime или абсолютные пути. H3-совместимый prompt compiler может быть отдельным adapter/skill, а не доменной моделью.

## План адаптации

1. Сначала реализовать собственную timeline/domain модель и immutable revisions.
2. Добавить importer только после фиксации исходного commit и лицензии; сохранять неизвестные поля в `sourceMetadata`.
3. Перенести UX-идеи через DTO и adapter contract, не копируя persistence и execution code.
4. Проверить один design JSON на контрольной сцене: Shot order, длительности, media roles, prompt revisions и output manifest.

## Сверка на 2026-09-09

| Возможность референса | QwenDirector сейчас | Следующий безопасный шаг |
|---|---|---|
| Timeline, Shot Units, prompt-поля | Есть project → scene → shot read-model, порядок, длительность и шесть режиссёрских полей | Добавить полноценное редактирование shot notes/revisions и multi-shot batch submit |
| Typed asset library / Actor / Scene / Prop / Layout | Есть общий Media Pool и immutable AssetVersion для image/audio/video; специализированных workbench-пайплайнов нет | Выделить typed asset roles и отдельные Actor/Set/Prop/Layout workflow adapters |
| Picture/Audio references и физические slots workflow | Есть выбор image/audio AssetVersion и H3 reference bindings; роли пока выводятся из MIME | Добавить явные роли reference, лимиты slots и preview-контроль перед submit |
| Custom workflow import → validate → use | Есть загрузка API-format JSON в редактор, сохранение profile, H3 preflight и immutable snapshot | Добавить пошаговый выбор terminal output/H3 node и UI управления revision history |
| Submit в ComfyUI | Есть adapter boundary, approved immutable workflow snapshot и подтверждённый H3 E2E | Расширить adapter contract на Actor/Scene/Prop/Layout и единый output mapping |
| Долгие рендеры и восстановление | Есть PostgreSQL jobs, approval, attempts, lease/fencing, cancel, reconcile и node capabilities | Добавить durable VRAM/concurrency lock и отдельный операторский recovery drill |
| Ollama conversational planning | Есть локальный llama.cpp executor для completion; диалогового shot planner нет | Ввести отдельный Director Agent service с сохранением prompt revision и ручным approval |
| Official H3 API и packaged launcher | Реализован локальный PVE ComfyUI H3; cloud API и portable desktop launcher сознательно отсутствуют | После стабилизации local-first ядра добавить provider adapter и reproducible Linux/Electron package |
| Воспроизводимость результата | Manifest SHA-256 связан с CAS AssetVersion, final take выбирается явно, доступен export | Добавить batch export проекта и retention policy для больших библиотек |

Публичный README референса также подчёркивает локальный runtime, отдельные workflow и модельные файлы, а не включённые в исходный код веса. Это согласуется с local-first политикой QwenDirector, но конкретная совместимость моделей и лицензий не предполагается.
