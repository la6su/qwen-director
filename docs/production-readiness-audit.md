# Production-readiness audit

Дата сверки: 2026-11-16. Это инженерная оценка текущего локального single-worker контура, не творческая приёмка музыкального клипа.

## Текущие доказательства

| Требование | Актуальное доказательство | Статус |
|---|---|---|
| Project/scene/shot и prompt revision | PostgreSQL catalog API, timeline UI, `smoke:shot-prompt` и полный `check:production` | Подтверждено контрактом и DB smoke |
| Bounded local Director planner | PostgreSQL version-fenced sessions; текущий shot, его reference roles и соседние shots передаются в локальный prompt context; Planner `consistent` continuity claims требуют typed montage evidence по текущему и соседним shots | Контракт и mock-provider path подтверждены; новая evidence-проверка прошла typecheck/build и загружена в локальный API, но DB-backed negative/positive receipt smoke ещё не выполнен; llama.cpp сейчас optional/unavailable, свободные tools/job writes не реализованы |
| Immutable workflow profiles | Revisions, graph digest, runtime activation/preflight; live `preflight:active-workflows` проверил 13/13 активных H3 и Qwen Image profiles | Подтверждено для активного локального каталога |
| References и Media Pool | Typed AssetVersion, MIME/role/order validation, H3 slots и workbench image bindings; DB/runtime smokes | Подтверждено контрактом; качество результата зависит от выбранных refs |
| Durable jobs | PostgreSQL job plan, manual approval, attempt lease/fencing, idempotency, cancel, unknown/reconcile и retry; production gate | Подтверждено для single-worker lifecycle |
| Immutable prompt/workflow snapshot | `smoke:workflow-job-plan` проверяет soundscape/music sections и сохранение plan после последующей правки shot; `smoke:profile-job-source` проверяет profile/I2VA injection | Подтверждено на изолированной DB |
| CAS и provenance | Свежая read-only сверка production DB: 313 AssetVersions, 313 файлов присутствуют, 0 missing в `./.data/assets` | Подтверждено на момент сверки; backup restore остаётся отдельной периодической проверкой |
| Runtime / ComfyUI | API `/health` — OK, `/ready` — ready с optional llama.cpp degradation; локальный ComfyUI доступен, queue empty; 13/13 active profile preflight | Подтверждено сейчас read-only |
| H3 generation | Ранее зафиксированы реальные локальные H3 R2V runs и durable result lineage; текущие active H3 profiles проходят schema/model preflight | Подтверждён historical E2E; новый submit в этой сверке не выполнялся |
| Qwen Image workbench execution | `smoke:workbench-image-edit-e2e`: approved job → mock ComfyUI → CAS manifest; активные Qwen image profiles проходят runtime schema preflight | Mock E2E подтверждён; новая реальная image generation здесь не выполнялась |
| Generic workbench profile/job contracts | Catalog, validate, test/activate, immutable profile snapshot и generic job routing покрыты API/DB smoke | Контракт подтверждён; специализированные production graphs ещё не предоставлены |
| Реальные Actor/Scene/Prop/Layout graphs | Проверен Director Studio HEAD `b8d5a73abbc199594d06206a4db57a66a216ab8e`; GitHub License API/root LICENSE не обнаружены, и локальных graph imports нет | Открыто: нужен собственный graph либо пользовательский локальный импорт с установленным правом использования |
| Layout → AssetVersion lineage | Typed slots и CAS primitives есть; реального Layout graph E2E нет | Открыто вместе с импортом графа |
| Production engineering gates | `check:production` прошёл на loopback `qwendirector_test`, включая migration/release/build, durable lifecycle, worker/workbench mocks и CAS safety; live profile preflight отдельно прошёл 13/13 | Подтверждено для перечисленного объёма; это не заменяет реальный GPU render acceptance |
| Длительные fault/load drills | Короткие нагрузочные и отказные smokes есть; длительный soak не проводился | Открыто |
| RPO/RTO/retention/quota SLA | Механизмы и лимиты существуют; целевые значения для библиотеки и процесса восстановления не согласованы | Открыто как эксплуатационное решение |

## Проверенные команды и границы

- `npm run check:production` и `npm run check:lab` запускались с `DATABASE_URL` и `QWEN_TEST_DATABASE_URL`, указывающими на loopback `qwendirector_test`. Оба gate прошли; их CAS smoke относится к тестовой БД/тестовому storage и не является production CAS inventory. `check:lab` также получил live H3 inventory/schema и проверил worker H3 injection без submit.
- Production CAS inventory выполнен отдельно через `npm run report:cas-health` с локальной production `DATABASE_URL`; операция только читает записи и проверяет существование файлов.
- `npm run preflight:active-workflows` читает активные профили и вызывает локальный ComfyUI `/object_info`; `/prompt`, GPU submit, обновление workflow и изменение AssetVersion не выполнялись.
- `/ready` сообщает `degraded: true` только потому, что optional llama.cpp сейчас недоступен; обязательные ComfyUI и storage checks успешны.
- Новый AI-Everywhere сценарий, исходное аудио, shot order и generation ещё не предоставлены/не утверждены; production readiness audit не задаёт за пользователя creative approval или picture lock.

## Следующие инженерные шаги

1. Закрыть живой approved-job → ComfyUI → CAS путь на одном выбранном H3 или Qwen Image profile только после явного выбора материала и approval; сохранить полный provenance, render result и QC.
2. Для Actor/Scene/Prop/Layout либо создать оригинальные локальные графы на доступных установленных нодах, либо принять предоставленные владельцем графы после проверки источника и runtime; не копировать upstream workflow без установленной лицензии.
3. Добавить длительный worker/lease/restart soak и записать наблюдаемые recovery результаты, не меняя существующие generation assets.
4. Согласовать и записать RPO/RTO/retention/quota цели перед объявлением эксплуатационной готовности.

Общий вывод: локальный single-worker software contour и durable orchestration воспроизводимо проверяются. Полная автономная генерация ещё не доказана end-to-end на текущей реальной пользовательской задаче: остаются реальные approved GPU acceptance, специализированные workbench graphs и длительный эксплуатационный soak.

### Дополнение: Workbench generation-path validation (2026-11-16)
- Усилена статическая граница Actor/Scene/Prop/Layout: каждый saver теперь должен иметь восходящую link-цепочку к узлу sampler из известного набора. Это отсекает LoadImage → SaveImage passthrough и случайно отключённый sampler.
- Реальные специализированные workflow-графы по-прежнему отсутствуют; наличие связного sampler path не доказывает schema/runtime/QC. Для production нужны доступный граф, live `/object_info` preflight, ручной approval и сохранённый CAS результат.
- Расширение того же статического execution-path gate применено к `image-edit`/`image-generate`: каждый saver достижим от sampler; для Qwen text-to-image проверены positive/negative encoder outputs и latent из `EmptyLatentImage`. Live active graph inventory просмотрен read-only; 2 active image-generate профиля соответствуют этим связям.

### Дополнение: H3 sampled-output path validation (2026-11-16)
- H3 I2VA/FL2VA/Ref2VA теперь требуют связанный execution path: один sampler должен вести к SaveVideo и получать conditioning/latent от H3 вместе с RandomNoise. RefMod-путь дополнительно обязан провести H3 conditioning и загруженные RefMods через `MiniMaxH3RefModApply` к тому же sampler.
- Проверен live read-only gate `node --env-file=.env --import tsx scripts/preflight_active_workflows.mjs`: все 13/13 активных H3 и Qwen Image profiles прошли runtime `/object_info`/boundary validation. Очередь и графы не менялись, workflow submit/generation не выполнялись.
- Mock smoke fixtures для H3 обновлены под связную sampler→decode→video-save топологию; suite в этой сессии не запускался.
