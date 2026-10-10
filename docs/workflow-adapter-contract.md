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

## Ошибки, повтор и отмена

Коды: `INVALID_INPUT`, `UNSUPPORTED`, `RESOURCE_UNAVAILABLE`, `BACKEND_UNAVAILABLE`, `OOM`, `DISK_FULL`, `TIMEOUT`, `OUTPUT_INVALID`, `CANCEL_UNSUPPORTED`, `EXECUTION_UNKNOWN`. Error envelope включает stage, retryable hint, safe message, backend run ID и диагностическую ссылку без секретов. Решение о retry принимает оркестратор.

Автоповтор допустим при подтверждённом отсутствии запуска либо подтверждённой терминальной ошибке и оставшемся approved budget; backoff и max attempts хранятся в плане. При неизвестном результате submit — lookup/reconcile, затем needs_attention, если доказательств недостаточно. Разные attempts используют разные attempt keys; повтор submit одной попытки обязан искать уже начатый run. Адаптер без backend idempotency объявляет это ограничение и не маскирует его.

## ComfyUI mapping

Workflow template хранится как версионированный JSON с digest и allowlisted custom nodes. Mapping связывает поля GenerationSpec с конкретными node inputs; эти node IDs не попадают в Shot. Prepare проверяет наличие нужных custom nodes, моделей, допустимых путей и форматов. Никаких auto-install custom nodes, downloads или произвольных HTTP URL из пользовательского workflow.

Submit сохраняет correlation key, если backend поддерживает metadata, и возвращённый prompt/run ID в локальном журнале. Точные endpoints и возможности history/interrupt проверяются по установленной версии в discovery. Для глобального interrupt нужен выделенный экземпляр; невозможность адресной отмены явно видна UI. Outputs копируются из разрешённого backend output root с защитой от traversal/symlink escape, затем загружаются в asset API.

### Локальный H3 RefMod I2V boundary

Профиль с `referenceBindings.mode = "refmod-i2v"` фиксирует API-format graph с одним `MiniMaxH3ImageToVideo`, `MiniMaxH3RefModsLoader`, `MiniMaxH3RefModApply`, `RandomNoise` и `SaveVideo`. Валидация требует два разных доступных RefMod names и связанные `LoadImage` bindings; профильный preflight сверяет их с dropdown inventory ComfyUI. Worker загружает только image AssetVersion refs, предназначенные для кадров/окружения; actor/vehicle identity задаются именами immutable RefMods из profile snapshot. `LoadImage` refs инъецируются в связанные узлы и остаются tensor links на входах `first_frame`/`last_frame`. Node IDs остаются только в graph/profile boundary, а не в Shot. Plan snapshot сохраняет graph hash, RefMod names, bindings и AssetVersion IDs; job проходит обычные approval, lease/fencing и CAS commit.

Quality metadata профиля вычисляется по фактическому `BasicScheduler.steps` (включая поддерживаемые switch/primitive links) и установленной LoRA. Несовпадение шагов и LoRA отображается как `unknown`; label LoRA сам по себе не подтверждает sampling steps. FL2VA LoRA применима только к FL2VA I2V workflow, Ref2VA — только к соответствующему Ref2V workflow.

## Приёмочные сценарии

Mock обязан детерминированно воспроизводить success, error, timeout, duplicate submit, delayed completion, lost submit response, unsupported cancellation и corrupt output. Contract tests проверяют отсутствие двойного commit, отказ stale fencing, повторяемость lookup, выход без секретов и отсутствие внешнего egress. Реальный adapter проходит тот же набор применимых сценариев плюс один утверждённый локальный smoke workflow.

Первые backend targets реализуются в `packages/workflow-adapters/src/backend.ts`: локальный `LlamaCppAdapter` (`127.0.0.1:8081`, text) и удалённый `ComfyUiAdapter` (`192.168.10.103:8188`, image/video/audio/previs). Оба сначала выполняют `probe`; llama adapter читает `/v1/models`, ComfyUI adapter — `/system_stats` и устройства. `router.ts` выбирает только reachable backend с заявленной modality. Adapter не скачивает модели и отклоняет внешний `workflowUrl`.

Comfy MCP можно использовать как optional control plane для local discovery/search workflows, submit graphs и получения outputs через stdio. Cloud connection и credits не включаются в local-first baseline; durable queue, approvals, provenance, fencing и storage остаются в QwenDirector. Источник: [Comfy MCP](https://comfy.org/mcp/).

## H3 качество и длительность

UI передаёт длительность как секунды, адаптер преобразует её в валидное число кадров H3 (кратное 17 при 24 fps). Для 5 секунд целевое значение — 124 кадра. Разрешение, seed и references являются job inputs; sampler, scheduler, LoRA, steps, VAE и codec принадлежат immutable workflow profile и не должны неявно изменяться адаптером. Quality-профили с большим числом steps активируются отдельно после проверки VRAM, а не автоматически.
