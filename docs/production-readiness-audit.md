# Production-readiness audit

Дата аудита: 2026-09-10.

| Требование | Текущее доказательство | Статус |
|---|---|---|
| Project/scene/shot UX | catalog API, timeline UI, prompt revisions, export smoke | Подтверждено |
| Immutable workflow profiles | profile revisions, graph hash, activation/preflight smoke | Подтверждено |
| References и Media Pool | typed AssetVersion import, H3 bindings, lineage smoke | Подтверждено |
| Durable jobs | PostgreSQL state machine, approval, lease/fencing, cancel/reconcile/retry smoke | Подтверждено |
| CAS/provenance/recovery | 16/16 CAS present; backup verify и isolated restore rehearsal | Подтверждено |
| Runtime health | `/ready`, runtime nodes/inventory, fail-closed checks | Подтверждено |
| MiniMax H3 через PVE ComfyUI | Live R2V E2E с двумя references; Draft 4-step и Quality 8-step profiles | Подтверждено для локальной лаборатории |
| Generic workbench profile lifecycle | `/v1/workbenches/validate`, `/profiles`, `/test`, `/activate`; digest/boundary/runtime guards | Контракт подтверждён, реальные графы не импортированы |
| Generic durable job routing | `workbenchKind` сохраняется в job plan, generic branch не проходит H3 parser | Контракт подтверждён smoke-проверкой |
| Реальные Actor/Scene/Prop adapters | Каталог canonical upstream имён и общий ComfyWorkbenchExecutor | Осталось: локальные графы и runtime E2E |
| Layout study + AssetVersion lineage | Typed Layout contract и CAS lineage primitives | Осталось: реальный Layout graph и end-to-end asset creation |
| Production acceptance gates | `check:production`, `check:lab`, typecheck/build — проходят | Подтверждено для single-worker контура |
| Второй физический worker | Не нужен для целевого single-node PVE профиля | Будущий HA-трек |
| Длительные fault/load drills | Есть короткие mock/load smoke, длительный прогон не выполнен | Осталось |
| RPO/RTO/retention/quota SLA | Механизмы и лимиты есть, целевые значения для большой библиотеки не согласованы | Осталось |

Для целевого single-node production необходимо закрыть fault/load drills и согласовать RPO/RTO/retention; второй worker относится только к будущему HA-профилю. Локальный single-worker продуктовый контур уже воспроизводимо проверен.

## Финальная parity-цель

Definition of Done для следующего цикла: Actor/Scene/Prop workbenches с реальными adapter/output contracts; отдельный Layout study graph, создающий AssetVersion с lineage; H3 wizard с runtime test перед activation; planner с decision provenance; и полный release/lab gate без регрессий. Контрактные API уже реализованы, но acceptance не объявляется завершённым до фактических графов и E2E. Второй worker и portable desktop package остаются отдельными расширениями и не входят в single-node acceptance.
