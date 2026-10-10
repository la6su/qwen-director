# Сверка с Director Studio

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

Upstream README описывает также optional official API, несколько LLM providers и GPU/LLM lifecycle coordination. Это не нужно для local-first target: облачные/API providers остаются выключенными, пока пользователь отдельно их не разрешит.

## Предлагаемые этапы к автономной локальной H3-генерации

1. **Один проверенный golden shot.** Прочитать реальный ComfyUI inventory, live-preflight одного совместимого Ref2AV/R2V API profile, убедиться в моделях/LoRA, H3 boundary, SaveVideo output и reference bindings. MCP применять для read-only разбора; generation оставить worker adapter. Не менять workflow и не подавать job до зелёного preflight.
2. **Замкнуть один shot lifecycle.** В UI подготовить structured H3 prompt, refs и параметры; зафиксировать immutable input snapshot и graph hash; оценить ограничение attempts/disk/time; потребовать manual approval; выполнить submit/poll/cancel/reconcile и CAS commit; показать provenance и дать оператору выбрать take. Повтор submit должен быть idempotent, неизвестный submit outcome не должен запускать слепой повтор.
3. **Добавить локального Director agent.** Подключить текущий llama.cpp через provider-neutral interface. Инструменты агента — только project/asset/workflow reads и typed planning APIs. Пусть он формирует script → scenes → shots → H3 prompt candidates и explainable repair proposals; каждое изменение создаёт revision/decision provenance. Запись в БД, approval и GPU submit проходят существующие API/job lifecycle, не прямые tool side effects.
4. **Ограниченный batch.** После ручного одобрения shot plan и максимального N jobs агент ставит jobs последовательно с лимитом времени/диска/повторов, учитывает failed/cancelled/unknown outcomes и останавливается на заданных условиях. Финальный выбор видео остаётся за владельцем.
5. **Continuity и монтаж.** Передавать только утверждённые AssetVersions и reference roles между соседними shots; вести continuity notes/seed/profile provenance. Затем отдельный deterministic FFmpeg stage собирает shot order, trims, audio и codec и пишет export manifest. Генерация clips ещё не равна готовому ролику.
6. **Расширить assets.** Импортировать и принять по одному Actor → Prop → Scene → Layout API-format workflow, добавить output slots → CAS AssetVersion lineage и live E2E. Это улучшит планирование, но не блокирует первый H3 shot.
7. **Приёмка на Porsche 718 Spyder RS.** Оформить brief, storyboard и refs; сделать одобренный короткий draft; провести визуальную и аудиооценку. Для quality профиля выполнить минимум три повторения на одинаковом входе и сохранить latency/VRAM/quality оценки, затем выбрать default. Только после этого включать bounded batch automation.

Под «автономностью» здесь понимается локальный агент, который исполняет заранее одобренный и ограниченный план с восстановлением состояния. Неограниченные GPU-запуски и автоматический выбор финального take не входят в текущий MVP-контракт с ручными approvals.

## Ближайшее действие

Сначала подтвердить текущую live-конфигурацию ComfyUI и пройти preflight одного H3 profile без submit. Существующие заметки говорят, что после очистки quality 8-step profile проходит, а draft/R2V отклоняются из-за отсутствующей `minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors`; перед любым запуском эти данные нужно перепроверить на живом inventory. Для первого Porsche shot нужен подготовленный brief, reference assets и явно подтверждённый короткий generation job.
