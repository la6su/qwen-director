### QwenDirector: durable H3 profile → job → live ComfyUI preflight (2026-11-15)
- Пользовательская цель остаётся автономным local-first video pipeline с durable jobs, immutable workflow snapshots, ручным approval и CAS provenance. Последний ранее синхронизированный code slice: `4c97574`; текущие preflight изменения и их проверка описаны ниже.
- Закрыта проверка, прежде заблокированная отсутствием отдельной тестовой БД: локально обнаружена `qwendirector_test`; `smoke:profile-job-source` запущен с временно построенным loopback URL, изменяющим только имя БД на `_test`. Он прошёл: inactive H3 profile → revision activation на mocked schema → durable job `awaiting_approval` → восстановление immutable profile snapshot → injection prompt/seed/saver path. Никакого ComfyUI submit не было.
- Live read-only ComfyUI `127.0.0.1:8188` сообщает v0.45.0, очередь `0/0`, RTX 5090. `/object_info` подтверждает наличие MiniMax H3 reference/image-to-video nodes и точных H3 base/LoRA/PDD файлов для текущих tracked кандидатов. Tool `server_info` одновременно показывает `COMFYUI_URL=192.168.10.165`; это другой/неидентифицированный target для MCP submit, поэтому его нельзя использовать для запуска. Только local loopback endpoints использованы для чтения.
- Исправлены два preflight fail-open: I2VA выбирает `MiniMaxH3ImageToVideo` (раньше для I2VA ошибочно запрашивался R2V class), а H3 graph обязан иметь инъецируемый prompt binding. Проверка без prompt раньше проходила до worker `prepare`, создавая job, которая гарантированно падала бы. Теперь profile preflight отклоняет её до создания generation job.
- `preflightH3Runtime` сверяет graph-установленные имена UNET, checkpoint, CLIP/VAE, LoRA и MiniMax H3 PDD с live choice catalogs; отсутствующий/неотдаваемый model catalog приводит к явной ошибке до queue submit. Обновлён `smoke:h3-preflight` для missing prompt/base UNET/PDD и несовместимых LoRA; тест изолирует I2VA в schema без Ref2VA node. `smoke:profile-job-source` расширен и прошёл на `qwendirector_test`: реальные PostgreSQL profile revisions/activation mock schema → durable R2V + I2VA jobs → first-frame AssetVersion role → immutable snapshots → prompt/reference/seed/saver injection. Оба job остаются `awaiting_approval`; worker/Comfy submit не вызывается.
- Проверки: `smoke:profile-job-source`, `smoke:h3-preflight`, `smoke:h3-workflow`, `smoke:workbench-executor-e2e`, `typecheck`, `build:web`, `git diff --check`; обе tracked H3 candidates прошли прямой read-only live preflight на local ComfyUI (модели/LoRAs не отсутствуют).
- PostgreSQL-backed путь manual approval → worker → ComfyUI protocol → CAS collection теперь закрыт `smoke:h3-worker-e2e`: persisted first-frame AssetVersion загружен в mock ComfyUI, I2VA prompt/seed/dimensions/SaveVideo prefix проверены, fake output сохранён как durable AssetVersion и прочитан обратно. `smoke:worker-e2e` также больше не подменяет `_test` URL на рабочую БД. Оба smoke запускаются только через loopback URL с именем БД `qwendirector_test`; live GPU generation не выполнялась. Remote MCP submit target `192.168.10.165` остаётся неидентифицирован и не использовался.
- Доступные текущие проверки: `smoke:h3-worker-e2e`, `smoke:worker-e2e`, `smoke:profile-job-source`, `smoke:h3-preflight`, `smoke:h3-workflow`, `smoke:workbench-executor-e2e`, `typecheck`, `build:web`; прогнать перед синхронизацией этой итерации. Следующий блокер для production acceptance — один выбранный реальный workflow/profile, проверенные refs, явное пользовательское approval и известный локальный Comfy endpoint. AI Everywhere treatment/beat map/storyboard остаются `PROPOSED / UNAPPROVED`; не запускать новые генерации до творческого утверждения.

### AI Everywhere v2: музыкальная история + авторский AI-showreel (2026-11-15)
- Пользователь уточнил формат: клип одновременно должен работать как музыкальная история и как авторский AI-showreel, демонстрируя режиссуру, генерацию, анимацию, предметную/архитектурную съёмку, консистентность героя, VFX и монтаж через действия и доказуемые результаты, без перечня эффектов/инструментов. Креативная формула: `ONE ROOM. INFINITE WORLDS.` Комната остаётся источником мотивов и материальным якорем; принятый старт «из темноты комнаты → тёмный экран → цифровой мир» сохраняется.
- Прочитан локальный `/home/la6/.codex/skills/brand-promo-video-generator/SKILL.md`. В treatment/shot bible перенесена story-spine `Intent → Process → Capabilities → Result → Proof → Identity`; Hub-only производство не заявляется. `references/field-guide.md` в установленном skill отсутствует. `docs/ai-everywhere-v2/02-director-treatment.md` и `03-storyboard-shot-bible.md` обновлены до v0.2 / `PROPOSED / UNAPPROVED`: добавлены причинная матрица showreel-доказательств и coverage gaps; existing assets остаются кандидатами до конкретного QC.
- Новая рамка раскрывает режиссуру, генерацию/отбор, камеру/монтаж, предметную и архитектурную съёмку, identity continuity и мотивированные VFX как причинные эпизоды истории. В coverage указаны конкретные beat/shot IDs, существующие источники и честные пробелы; наличие запланированного proof-shot само по себе не заявляет, что качество уже подтверждено. Следующий творческий шаг: сопоставить каждый capability-shot с фактически просмотренным v22 source clip и сократить повторы; затем синхронизировать beat map с master audio и оставить неподтверждённые вокальные времена `UNVERIFIED`.
- Shot-bible showreel coverage теперь ссылается на полные v22 EDL shot UUID и source AssetVersion UUID из `/tmp/AI-Everywhere-full-2m45-v22.edl.json`: selection board `62b50221…` + workstation return `74a4b66b…`; product inserts `08f2d339…` / `29475e99…` / `aee0e4b8…` / `d4d7e7bf…`; identity/workstation `340cd335…` / `50cf47d8…` / `794aaf3e…` / `29c52556…`; world/VFX/final candidates mapped individually. Это provenance crosswalk и выборочный midpoint/EDL review, не сертификация целых takes; отбор героя, чистота предметной пластики, межшотная консистентность и VFX в движении требуют отдельного playback QC.
- При непосредственном просмотре midpoint contact sheets заметно, что два автомобильных шота (`08f2d339…`, `7e4ec5c0…`) почти дублируют боковой L→R план одного типа машины на синей мокрой дороге; максимум один должен покрывать эту функцию, второй — только если полный take даёт другой монтажный смысл. Selection board показывает наличие вариантов, но не делает авторский отказ/выбор зрительно ясным. Эти наблюдения добавлены в `04` и `03`; полное движение по-прежнему `UNREVIEWED`. Проверено автоматически: все 31 EDL/source пары из showreel matrix точно соответствуют парам в immutable v22 EDL.
- Мастер `/home/la6/AI-Everywhere.mp3` снова проверен (164.520 s, прежний SHA совпадает). Добавлен `scripts/analyze_master_audio.py` и `audio-markers.json`: 271 отсортированный spectral-flux transient candidate с временными/frame coordinates для ручной прослушки; 23 lyric IDs остаются без интервалов с `UNVERIFIED_NO_LOCAL_ASR`. В локальном окружении не найден whisper/Vosk runtime или их model files, зависимости не устанавливались. Это не beat lock и не vocal alignment, а конкретный индекс для следующего аудиопроверочного прохода.
- Никакая генерация, монтаж или изменение EDL не выполнялись. Начальные кадры остаются `APPROVED AS STARTING MATERIAL`; весь новый treatment/shot bible — `PROPOSED / UNAPPROVED`. Approval сценария/beat map/storyboard требуется прежде новых генераций.

### H3 I2VA boundary и multimodal prompt contract (2026-11-15)
- В ответ на технический аудит AI Everywhere проверен действующий локальный `h3-prompt-writing` skill и его `references/base-en.txt`. Подтверждено: базовый H3 video prompt должен содержать ровно три core sections в заданном порядке; FL2VA — alignment line плюс те же три sections. Локальный Ref2VA компилятор уже использовал отдельную шестисекционную схему.
- Исправлен boundary `MiniMaxH3ImageToVideo`: только `first_frame` теперь определяется как I2VA и получает одну image binding; два разных кадра остаются FL2VA. Сохранены frame order checks, правильные роли reference assets, 24-fps `17k+5` validation, immutable profile graph, job snapshot и обычный manual approval. Wizard и shot submission различают I2VA от FL2VA.
- Добавлен `compileH3BasePrompt` для I2VA/FL2VA; FL2VA теперь использует структурированные multimodal sections, а I2VA prompt начинает с требуемого alignment line. `compileDirectorPrompt` сохранён для обычных Director/workbench prompt, чтобы не ломать существующие вызовы.
- Прочитанный локальный Qwen Image 2.1 UI workflow `.data/comfyui-workflows/image_edit_QwenImage21.json` преобразован в памяти через текущий loopback ComfyUI `/object_info` (HTTP 200), без записи/submit. Обнаружены две workflow-boundary ошибки: sampler switch по умолчанию выбирал `EmptyLatentImage`, а UI-only `ImageCompare` с незаполненным preview input попадал в runtime graph. Добавлена строгая нормализация только однозначной пары `TextEncodeQwenImage21 output 2` ↔ `EmptyLatentImage` для semantic `image-edit`; profile хранит выбранную encoder branch, custom canvas не изменяется. `resolution=0` принят как реальный auto-size sentinel из `/object_info`, где он округляет reference dimensions до 32. Сам локальный workflow файл не менялся.
- Найден и закрыт adjacent UX blocker: workbench profiles сохранялись в БД, но H3 candidate catalog их исключал, поэтому image-edit candidate нельзя было выбрать/активировать через UI. Catalog теперь включает все профили, карточка workbench направляет live test/activation в соответствующие API routes, а API activation сам повторно проверяет ComfyUI `/object_info`. После сохранения wizard обновляет каталог; профиль всё ещё требует явного test и activation.
- Проверки после изменений: `npm run typecheck`, `npm run build:web`, `smoke:h3-workflow`, `smoke:h3-profile`, `smoke:cinematic`, `smoke:worker-h3-injection`, `smoke:workflow-import`, `smoke:workbench-catalog`, `smoke:workbench-validate-api` и `git diff --check` прошли. В памяти преобразованный локальный `image_edit_QwenImage21.json` прошёл profile structural validation и runtime `/object_info`: 17 executable nodes, output slot `image`, reference-image latent branch, `resolution=0`; API smoke подтвердил, что normalized graph возвращается отдельно и исходный graph не меняется. `smoke:profile-job-source` не запускался: текущий `.env` адресует loopback-БД `qwendirector`, не `_test`; отдельный `QWEN_TEST_DATABASE_URL` отсутствует. Предохранитель верно отказал, рабочую БД не затрагивали. GPU generation, ComfyUI queue submit, profile activation и внешняя публикация не выполнялись.
- Следующий шаг: проверить одинокий I2VA через read-only profile/API mocks и build UI, затем продолжить gap-аудит generation pipeline. Открытые крупные блокеры остаются: production workbench graphs, полный end-to-end approved job → real ComfyUI → CAS (только после выбора graph и approval), аудио/музыкальная sync карта AI Everywhere и creative approval revised script.

### AI Everywhere v2 — сценарий и монтажная карта (creative approval pending)
- Создан отдельный пакет `docs/ai-everywhere-v2/`: `00-skill-application-log.md`, `01-song-beat-map.md`, `02-director-treatment.md`, `03-storyboard-shot-bible.md`, `04-v22-creative-and-edit-audit.md`, `05-generation-handoff.md`. Это `PROPOSED / UNAPPROVED`, а не picture lock и не готовая генерация. В `02` добавлен связный литературный сценарий из семи сцен: действия героя, препятствия и переходы; технические инструкции вынесены в storyboard/handoff.
- Все первые материалы остаются неизменными; слова песни не переписаны. Пользователь сообщил, что первые кадры готов принять: в документах opening пара обозначена `APPROVED AS STARTING MATERIAL / NOT PICTURE LOCK`, без замены или нового рендера. Перед любыми новыми Qwen Image/H3 jobs дождаться утверждения revised treatment, beat map и storyboard.
- Master `/home/la6/AI-Everywhere.mp3` доступен, 164.520 s; SHA-256 `5369d3fead4b4c335be16e90d1089f8bc085abe4cb328e1fb5b1a79e40bdc154`. EDL grid хранит 140 BPM / onset estimate 139.85 / phase ~0.08 s, но свежая грубая локальная RMS novelty проверка неоднозначна (около 136.36 и 142.86 BPM); ни downbeat, ни вокальные атаки не подтверждены. Все phrase sync `UNVERIFIED`; см. `01-song-beat-map.md`. EDL/video master подтверждены по путям и hashes в `00`.
- Просмотрены midpoint контакт-листы всех 58 сегментов v22 и их EDL descriptions; это не полный просмотр движений/прослушивание песни. В `04` перечислены конкретные сценарные проблемы, технические QC gates и 58 строк dispositions с `UNREVIEWED` take statuses; export manifest не создан. EDL сообщает 10 post-audio hold frames, но другое поле/заметка сообщает 12 — сверить перед будущей сборкой.
- Прочитаны локальные `/home/la6/.codex/skills/music-video-subtitle-generator/SKILL.md` (Hub runtime отсутствует, поэтому применены только переносимые правила) и `/home/la6/.codex/skills/h3-prompt-writing/SKILL.md` + `references/base-en.txt`, `references/ref-en.txt`. Все семь `zhangzhangco/film-production-skills` (`SKILL.md` + `references/field-guide.md`) проверены как удалённые на commit `47b2a6a432235e716fa2aa0d08eefae76fdb34fd`, но локально `NOT INSTALLED`; `minimax-h3-director`, Sokolov/Medyinsky local references также не установлены/не найдены. Детали в `00`.
- Следующий шаг: пользователь читает `02` как сценарий и `03` как визуальную карту, отмечает утверждённые/отклонённые решения. После creative approval — прослушать master и разметить вокальные фразы/удары, затем non-destructive re-edit plan от v22 и только потом запрашивать генерацию конкретных gaps.

### AI Everywhere: viewing master v22 · лабиринт вычислений и цифровой собор
- Текущий viewing master проекта `a654d533-63f0-463d-bbec-aab87b231d06`: video AssetVersion `0d3b54e4-9a8a-4d2a-a091-206701ac028b`, authoritative EDL `42ceb6a4-e1dc-47d2-aa4b-5db720035f5b`. Файлы `/tmp/AI-Everywhere-full-2m45-v22-1080p.mp4` и `/tmp/AI-Everywhere-full-2m45-v22.edl.json`; SHA-256 video `b3191be9c4d3abef3d855e5df372cdb11f782b928ac8605878b5d1402204eaca`, EDL `46d8ca762c7a530c9340ec0c5a83343b4093e1883f1144512ae3c5b986b34100`. v21 и ранние версии сохранены.
- AE-014 (timeline frame 1029, 125 frames) заменён на отдельный «Обсидиановый вычислительный лабиринт» по строке “changed the game”. Qwen Image still job `1f31643d-18a3-437b-b4fd-8b74789f4b05`, AssetVersion `a00dfe32-dfa7-4f46-9217-9b65fc4d478a`, 1344×768/40 steps. H3 Pika Flex full take job `3b12ba3c-c8db-4a7a-94bc-eadc717a10e6` дрейфует в дневной Манхэттен на хвосте, поэтому взяты кадры 0–108 и 16-кадровое удержание чистого 108-го кадра. Производный сегмент `5662b9a5-3d52-4619-bada-aa730ec78be4`; длительность и музыкальная граница сохранены. Проверены участки 0/40/80/108 и соседние склейки.
- В v22 также сохранена правка v21 для AE-023–024B: камера подъезжает к неподвижному экрану рабочего места, экранный собор раскрывается полноэкранно, затем следует водно-базальтовая деталь. Master AAC не перекодировался: извлечённый пакетный SHA совпадает с предыдущей версией `6b686b1ad4362ee78f38905cec658d358aa0dd1dbe7d55f171b55e013b3a6e42`.
- `ffprobe`: H.264 1920×1080/24 fps, 3960 кадров / 165.000 s; AAC 164.520 s. EDL непрерывен: 58 сегментов, 3950 picture frames и 10 кадров финального hold. v22 зарегистрирован в Media Pool и связан с проектом как deliverable. Это просмотрочный cut, не picture lock: полный просмотр/прослушивание, точные вокальные атаки и вдохи, повторяемость оставшихся миров ещё требуют QC.
- ComfyUI оставлен работающим; optional llama.cpp не запускался. Следующий шаг: построить полный v22 контакт-лист, пройти остальные секции на повторы/слабые планы и сверить монтаж с мастер-треком; сохранять правки новой версией, не менять AAC.

### AI Everywhere: viewing master v21 · историческая версия; superseded by v22
- Текущий viewing master проекта `a654d533-63f0-463d-bbec-aab87b231d06`: video AssetVersion `0d4166b4-a1a6-4d72-8537-5a19a80a8efa`, authoritative EDL `767efac3-e72f-4f2d-8345-6fb481e08c32`. Файлы `/tmp/AI-Everywhere-full-2m45-v21-1080p.mp4` и `/tmp/AI-Everywhere-full-2m45-v21.edl.json`. Video SHA-256 `708c236f55f19388c9098ea9f07fb4df5cbecf2d1999afc1acbe3411d3687965`; EDL SHA-256 `3f32ac34612b3c43387a7cf6e07a1595d56286ad7dbb99a5b2dbe5dbe96561b1`. v20 и все прежние версии сохранены; v21/EDL связаны с проектом как deliverables.
- AE-023 использует мониторный keyframe Candidate K, Qwen Image Edit job `7b45f962-a81d-4b06-ac17-4b80f91b6c36`, AssetVersion `a2baf513-fdc7-446f-b806-af4d2189bd96`. Источник — реальный dark-workstation still Candidate F + spire-world still Candidate I. Видимые изменения ограничены главным landscape display; геометрия обоих мониторов, стойки, клавиатуры, мыши и стола сохранена. Candidate I world still: job `b6df9d3d-c83f-463d-9b10-3107ee268105`, AssetVersion `d452fa8e-780f-45e7-b22c-f14c6c5be930` — чёрно-стеклянные парящие шпили, зеркальная вода, кобальтовые токи, одно янтарное солнце.
- AE-023 physical camera push: H3 job `8256c841-9281-4f49-8bd0-5b7e3d5d5f78`, AssetVersion `0b2605e3-bb5f-4f20-ac02-d3b15a055b2d`, 124 frames/5.167 s, Ref2VA INT8-pruned + Pika Flex. Выбраны первые 82 frames (`3.417 s`); камера идёт к неподвижному монитору, клавиатура/край стола дают параллакс, экранный мир удерживается. На frame 1894 hard cut раскрывает именно этот spire-world.
- AE-024A: H3 Pika Flex job `e18f2f6a-28ba-41e9-9d6d-a5c2f1b20485`, AssetVersion `d89976dc-0fd6-47f2-a6a9-435c1d4b564a`; выбран такт 41 frame. Spire silhouettes и центральная ось остаются читаемыми. AE-024B: H3 job `d2207627-f060-45c4-a220-80443b7809fe`, AssetVersion `1c663d45-cc89-45ca-97ed-b054e1c7ab26`; взят отрезок frames 41–81 для более выраженного низкого движения над мокрым базальтом и кобальтовой водой. Кобальтовый вектор ведёт в AE-025. Все выбранные job outputs помечены `codex-autonomous`; master audio отдельно.
- Связанный QC: четыре transition boundary пары 1811/1812, 1893/1894, 1934/1935 и 1975/1976 проверены контакт-листом `/tmp/ae-v21-transition-qc.jpg`; preproduction contact sheets: `/tmp/ae023-l-contact.jpg`, `/tmp/ae024a-i-fast-8.jpg`, `/tmp/ae024a-i-mid-8.jpg`, `/tmp/ae024b-h2-mid-8.jpg`. Вся трёхсегментная замена занимает прежние кадры и не меняет музыкальную сетку.
- `ffprobe`: H.264 `1920×1080`, 24 fps, 3960 frames / `165.000 s`; AAC `164.520 s`. Пакетный SHA-256 master AAC, извлечённый одним и тем же `ffmpeg -c copy -f data`, совпал с v20 (`6b686b1ad4362ee78f38905cec658d358aa0dd1dbe7d55f171b55e013b3a6e42`). EDL непрерывен: 58 segments, 3950 picture frames и tail до 3960. Полный 2:45 просмотр/прослушивание, вокальные атаки/дыхание и QC прочих повторных миров ещё не выполнены; это viewing cut, не picture lock.
- Локальный API `/v1/ready` и ComfyUI отвечали; optional llama.cpp не запускался. ComfyUI оставлен работать. После этой фиксации продолжать полный мастер QC с обычной скорости и устранять повторные визуальные миры по музыкальным секциям; перед новой видео-заменой использовать сохранённый EDL v21 как базу.

### AI Everywhere: viewing master v20 · историческая версия; superseded by v21
- Текущий viewing master проекта `a654d533-63f0-463d-bbec-aab87b231d06`: video AssetVersion `fdb366b7-2085-4063-a347-4c84019f11e1`, authoritative EDL AssetVersion `95547c61-ff18-40ae-8ed6-e12033c0116d`. Файлы: `/tmp/AI-Everywhere-full-2m45-v20-1080p.mp4`, `/tmp/AI-Everywhere-full-2m45-v20.edl.json`. v19 и прежние версии сохранены.
- AE-001 keyframe отредактирован локальной Qwen Image 2.1: job `976f2a7b-32e2-47e1-8ccc-fadd4fcf174a`, image AssetVersion `74d132c9-3e58-43f4-8de5-68241a4ddf81`. Внутри неизменного landscape-монитора показан кольцевой кобальтовый мир из AE-023; экран/стойка/комната/герой/клавиатура/мышь сохранены. Просмотр still подтвердил, что мир находится за стеклом, а не парит над столом.
- AE-001 video AssetVersion `56914d01-2f6e-45b7-b543-5613400eaf4b`: 82 frames, 1920×1080/24. Скоростной editorial push-in завершается perspective-normalized кадром экрана. AE-012 video AssetVersion `b13419bf-d318-4916-8012-5d7a7b21dbf9`: 82 frames; первый кадр совпадает с последним кадром AE-001, короткий растворённый portal transition раскрывает общий вид, затем выполняется плавный pull-out. Это редакторская анимация still, не motion из MiniMax H3. Пробные H3 версии из v19 отвергнуты по движению/скачку экспозиции.
- QC: H.264 High `1920×1080`, `yuv420p`, 24 fps, 3960 frames / `165.000 s`; AAC длится `164.520 s`, его извлечённый bitstream идентичен v19 (SHA-256 `266a2e8cc79c3a77638fd4628b9cdadb71c692dd7b2593c4a3e034e4e828d635`). Видео SHA-256 `bb511050f8c06dbfb10237531c2e0a4dbb483c5eeb1a6c93e7b667eb1e88638f`; EDL SHA-256 `c682fb3ba512037cde096a26c524b08223e78b76b3466b09441de280bb4352fd`. Boundary frames 81/82 сравнивались: RMSE `0.00255` по нормализованным каналам; проверены также начало, середина, pull-out и стык с AE-013. EDL непрерывен: 58 сегментов, 3950 picture frames плюс delivery tail до 3960.
- Полный контакт-лист центров 58 шотов: `/tmp/qwendir_qc/v20-all-shots-contact.jpg`. QC нашёл новый приоритет: повтор Blue Meridian/wireframe skyline сконцентрирован примерно на `00:39–01:15`; похожая river-arch композиция возвращается позднее, а workstation shots AE-023/AE-055 снова показывают почти один экранный мир. Это остаётся заметной визуальной повторяемостью, поэтому v20 — промежуточный viewing cut.
- После локального Qwen Image edit вызван ComfyUI `/free` с `unload_models=true, free_memory=true` (HTTP 200); `/system_stats` после очистки также вернул 200. ComfyUI оставлен запущенным; `llama.cpp` не запускался.
- Ограничение: пока улучшены только первые два шота. Полный просмотр и прослушивание 2:45, точная разметка вокальных атак/вдохов, оценка повторов миров и музыкальная синхронизация остаются обязательными до picture lock. Следующий проход — просмотреть на обычной скорости весь клип по музыкальным секциям; исправлять дальше слабые/повторные кадры отдельными версиями, сохранить master AAC неизменным. ComfyUI не останавливать, `llama.cpp` не запускать.

### AI Everywhere: viewing master v19 · superseded by v20
- Исторический viewing master проекта `a654d533-63f0-463d-bbec-aab87b231d06`: video AssetVersion `ba18f6ac-d3bc-4c17-8732-070290d89882`, authoritative EDL AssetVersion `59718537-128a-4e83-ba32-da29854c8ae5`. Файлы: `/tmp/AI-Everywhere-full-2m45-v19-1080p.mp4`, `/tmp/AI-Everywhere-full-2m45-v19.edl.json`. v18 и более ранние версии сохранены.
- AE-012 (frames 82–163 / 3.417–6.833 s) теперь раскрывает отдельный цифровой мир: подвешенное кобальтовое ядро в кольцевом обсидиановом городе, чёрно-стеклянная дорога и маленькое янтарное затмение. Qwen Image 2.1 keyframe V4: job `addb7074-fc19-4a7d-8d3a-610281453953`, AssetVersion `ff536457-77ad-4c51-9af5-13146280b0be`, `1344×768`, стороны кратны 32, 40 шагов, seed `11503202`. Новый 82-кадровый 1080p участок `d59bb259-d07f-4f1f-b734-5069f97d1012` создан контролируемым редакторским push-in: короткая начальная полка, smooth speed ramp и 1.30× приближение к ядру. Референсные связи исходного still → клип отражены в CAS lineage.
- H3 motion QC на этом мире выявил конкретные ограничения: Pika Flex Ref2VA почти удержал still без считываемого продвижения камеры (`3fd81f87-ada8-4116-9ed5-b10e69b86329`); PDD 8-step FL2VA показал крупный скачок общей экспозиции на средних кадрах (`0309887e-5d65-45ec-853a-624b75b1b0f4`). Оба дубля оставлены в истории jobs/Media Pool и отвергнуты; ни один не попал в v19. В v19 используется Qwen still плюс проверенное редакторское движение, без генерационного мерцания.
- Проверки: H.264 High `1920×1080`, `yuv420p`, 24 fps, 3960 кадров / `165.000 s`. AAC bitstream совпадает с v18 (SHA-256 `e53c3cb2cd0a245bfa0b85629ad1e66ebaa44efa2c77c02b8c84642e6e5eae74`). Видео SHA-256 `12288c49eab5583a590b465a1f057b9a29c98c15f3b2b5e0f9512851f6992580`; EDL SHA-256 `592ebadb5ee78640a2843ee5b0d16459c4cc3881d38cd4f2e6bb52dcf74dae28`. EDL по-прежнему имеет 58 смежных сегментов, 3950 picture frames и delivery hold до 3960. Проверен контакт-лист кадров 0/81/82/83/163/164: workstation push завершается на прежнем экранном изображении, далее на восьмидольном cut начинается самостоятельный кольцевой город, после чего hard cut продолжает исходный монтаж. Это viewing cut, не picture lock: полного просмотра/прослушивания 2:45 на обычной скорости и точной вокальной разметки ещё нет.
- v19 video и authoritative EDL прикреплены к Media Pool с lineage от v18, AE-012 участка, нового still и prior EDL. Следующий шаг: отдельный обычный просмотр интро со звуком, затем продолжить QC повторов экранных миров и финального close-up героя; любые правки сохранять новой версией.

### AI Everywhere: alternate viewing master v18 · superseded by v19
- Предыдущий viewing master: video AssetVersion `e5f8b360-2e8b-4f8f-9dc7-b8e4c286667b`, EDL `c3b08e3b-f968-4dd9-bc02-884e264f6362`; файлы `/tmp/AI-Everywhere-full-2m45-v18-1080p.mp4` и `/tmp/AI-Everywhere-full-2m45-v18-final.edl.json`. v17 сохранён. Первичный импорт EDL `4e17c308-0b91-43df-a94c-117ff4e5043b` superseded из-за shot-ID mapping; authoritative остаётся `c3b08e3b-f968-4dd9-bc02-884e264f6362`.
- Режиссёрская правка: открытие переставлено на уже готовую пару AE-011/AE-012 — наезд камеры к неподвижной мастерской, где landscape-экран показывает чёрно-стеклянный город с кобальтовой рекой и янтарным проходом, затем hard match cut в тот же полноэкранный город. Это отвечает строке «whole world on my screen» и делает цифровой мир главным объектом кадра. Другая пара, бывшие AE-001/AE-002 (wireframe на мониторе → Blue Meridian waterfall city), перенесена после contact-sheet выбора take; клипы используются по одному разу, без дублирования. Cut на frame 82 равен 3.417 s: по предварительной фазе `~0.105 s` восьмой удар ожидается около 3.534 s, cut опережает его примерно на 2.8 кадра — пока расчётное соответствие pre-cut правилу, не подтверждённый lyric sync.
- Проверки: H.264 `1920×1080`, 24 fps, 3960 кадров / 165 s. EDL имеет 58 смежных сегментов, 3950 picture frames и 10 выходных hold-кадров; total container count — 3960. AAC bitstream совпадает с v17 (`SHA-256 6b686b1ad4362ee78f38905cec658d358aa0dd1dbe7d55f171b55e013b3a6e42`). Видео SHA-256 `3d78d230f43d477d1d54f9084a9a67369cc4eeda002958bdbfae3abbc13227d1`; authoritative EDL SHA-256 `94ae6203cf7840c90ef53da322b1733211c75b455e16a57390432dfcc739133c`. Проверен 13-кадровый контакт-лист с границами открытия, переходами в Blue Meridian и новым участком после selection board. Кадр монитора совпадает по миру с следующим полноэкранным шотом; дальние смены мира сохраняют сине-янтарный мост. Полный просмотр/прослушивание ещё не выполнен.
- v18 video и authoritative EDL прикреплены к проекту; lineage видео указывает v17, AE-011/AE-012 source clips и переехавшую wireframe/Blue Meridian пару; EDL указывает v17 EDL и video v18. v17 и более ранние мастера сохранены.
- Следующий шаг: продолжать качество самого мира и монтажный QC: полный визуальный проход по 2:45, повторяемость экранного контента, speed-ramp/переходы и вокальные атаки; не объявлять picture lock.

### AI Everywhere: alternate viewing master v17 · superseded by v18
- Текущий viewing master проекта `a654d533-63f0-463d-bbec-aab87b231d06`: video AssetVersion `7de4b26b-21ce-499f-967d-685e149391fd`; EDL `674a8ac2-9f48-4bac-abd7-ada121e145fb`. Файлы: `/tmp/AI-Everywhere-full-2m45-v17-1080p.mp4`, `/tmp/AI-Everywhere-full-2m45-v17.edl.json`. v16 оставлен доступным в Media Pool и на диске.
- В первых 82 кадрах (0–3.417 s, восемь музыкальных долей) прежний статичный workstation composite заменён существующим H3/Pika Flex camera push `0ff27109-8b6e-4519-aaa0-dc6de3b72e8b`. Физический наезд заканчивается экранным цифровым wireframe-пространством; на следующей восьмидольной границе hard cut открывает Blue Meridian waterfall city. Камера двигается, мониторы и предметы стола остаются неподвижными.
- Проверено: 1920×1080 H.264, 24 fps, 3960 кадров / 165 s; AAC поточно совпадает с v16 (`SHA-256 6b686b1ad4362ee78f38905cec658d358aa0dd1dbe7d55f171b55e013b3a6e42`). Видео SHA-256 `61bcccbbf2e9d565f9a80d29287e3223cf62e9672c146a6e903f73f17cd05c59`; EDL SHA-256 `bbc385c52febbe6ce0385317913a7755594f8bbed080caf02acfd0ff24a364b3`. Проверены contact sheet старта и граничные кадры 0/81/82/83/163: кадр 81 ещё на экране, кадр 82 уже внутри города; скачка объектов комнаты через cut нет. Это локальный A/B и визуальный контроль стыка, не полный просмотр ролика со звуком.
- v17 и EDL прикреплены к проекту как deliverables; lineage сохраняет родителей v16, исходного camera-push и EDL v16. Ранее записанное замечание остаётся: на самом мониторе в push показано абстрактное синее wireframe-поле с повторяющимися сферами. Оно работает как визуальный порог в полноценный цифровой город, но не считается финально утверждённым качеством самого цифрового мира.
- Следующий этап: продолжить монтажный QC всего ролика (просмотр со звуком пользователем/через локальный плеер, которого здесь нет), проверить повторяемость экранных миров, вокальные атаки и VFX continuity; сохранять новые изменения отдельной версией. Не объявлять picture lock.

# Рабочее состояние — 2026-11-15

### AI Everywhere: viewing master v16 · город в финальном припеве
- Новый viewing master проекта `a654d533-63f0-463d-bbec-aab87b231d06`: video AssetVersion `3c089039-0966-44c6-801e-417ddb0b0108`; EDL `6e7a57be-d674-4920-82e6-985b953b39e3`. Файлы: `/tmp/AI-Everywhere-full-2m45-v16-1080p.mp4`, `/tmp/AI-Everywhere-full-2m45-v16.edl.json`.
- В AE-041 (frames 3126–3207, 130.25–133.67 s) убран третий повтор плана героя спиной. На финальном припеве теперь короткий низкий проход через чёрно-стеклянный город из ранее сгенерированного MiniMax H3/Pika Flex take `83ebabc7-060f-4756-8669-8769286dd38d`; 124 исходных кадра ретаймлены до 82 кадров. Синий вектор и янтарное отверстие продолжаются в AE-042 с порталами. Остальной монтаж и титровые окна сохранены.
- Проверки v16: H.264 `1920×1080`, 24 fps, 3960 кадров / `165.000 s`; декодированный AAC совпадает с v15 (`e53c3cb2cd0a245bfa0b85629ad1e66ebaa44efa2c77c02b8c84642e6e5eae74`). Видео SHA-256 `69eff3b9f99a455b7d26f5a5f53822ff393710294c1759f5a3bfd1ff7568dcff`; EDL SHA-256 `61bf6bbbcbff4fdf36a22ba57894a8c6bae0d4c04fe8292847320eb9c3f4f94a`. Проверен 6.92-секундный A/B участок, граничные кадры и контакт-лист; геометрия, цветовой вектор и handoff к порталам читаются. Дополнительно осмотрен весь ролик на сетке 1 кадр/с: крупных выпавших/пустых отрезков нет; намеренные статичные удержания сохранены. Это визуальный скрининг, а не просмотр и прослушивание в реальном времени.
- Повторный локальный beat-анализ MP3 без ASR: восемь 20-секундных окон, 5 ms hop, интерполированная autocorrelation дают оценки `140.12–140.45 BPM`, медиана `140.21 BPM`; период `~0.428 s`, 96 тактов занимают `~164.58 s` против `164.52 s` аудио. Оценка фазы около `0.105 s` близка к прежней рабочей оценке `0.08 s`. Это подтверждает каркас 140 BPM; текстовые атаки, вдохи и lip/lyric alignment не распознаны.
- v16 и EDL связаны с проектом и lineage в CAS. Это viewing cut, не picture lock: полный просмотр 2:45 с прослушиванием мастер-трека и ручная проверка вокальных атак/дыханий ещё не завершены. Следующий шаг — повторный проход целиком, затем отдельный аудит повторов макро-стекла и ярких VFX; сохранять версии, не фиксировать lyric sync по одной только сетке 140 BPM.

### QwenDirector: typed Comfy saver bindings
- Закрыл найденную неоднозначность multi-output workbench: `ComfyWorkbenchExecutor` сохраняет `outputNodeId`, а slots назначаются по explicit map saver node → slot, не по порядку файлов. Single-saver profile получает первый контрактный slot по умолчанию; несколько saver nodes требуют полной карты с уникальными slots. Отсутствующий файл назначенного saver завершает collect ошибкой до commit.
- API хранит output bindings в boundary/revision, custom director job включает карту в immutable plan, worker передаёт её executor. Workflow wizard для импортированного Comfy graph теперь позволяет выбрать Actor/Scene/Prop/Layout и назначить slot каждому saver; batch assets от одного saver остаются в одном семантическом slot. Контракт обновлён.
- Прогоны: `npm run typecheck` — OK; `npm run smoke:workbench-catalog` — OK (single default, обязательная карта multi-output, duplicate slot rejection); `npm run smoke:workbench-executor-e2e` — OK (Comfy возвращает узлы в обратном порядке, slots остаются правильными); `npm run smoke:generic-job-plan` — OK; `npm run build:web` — OK; `npm run smoke:worker-e2e` подтвердил, что slot/output node provenance проходит в CAS manifest. `npm run smoke:readiness` — OK: planner optional, Comfy unavailable всё ещё fail-closed.
- Runtime API и worker перезапущены с прежним `.env`: API `/health` — OK, ComfyUI `/system_stats` + `/object_info` — OK на loopback, один worker online, Comfy queue `0/0`. `/ready` теперь HTTP 200 `ready`, `degraded: true` только из-за недоступного optional planner endpoint `llama.cpp`; ComfyUI и storage обязательные checks готовы. Planner/llama не запускать. Live API `/v1/workbenches/validate` подтвердил 200 для полной карты и 400 `WORKBENCH_OUTPUT_BINDINGS_INCOMPLETE` без неё. Ни profile/job, ни GPU generation этим изменением не запускались; ручное approval сохранено.
- Контроль diff: `git diff --check` — OK; `npm run smoke:workbench-validate-api` — OK. Затем рассмотреть реальный workflow только если доступен локальный production graph и ясны refs. Текущий проектный блокер: production Actor/Scene/Prop/Layout graphs не найдены в локальном каталоге, а AIMixer demo лишён семи исходных media refs; не подменять их похожими файлами.


### AI Everywhere: viewing master v15 · поздняя фаза Blue Meridian
- Текущий viewing master проекта `a654d533-63f0-463d-bbec-aab87b231d06`: video AssetVersion `5d7673ab-797e-4e9c-a163-1cb2cb2e0d8a`; EDL `0a1834f7-8960-4bc3-a96d-745bcb72f6e6`; новый источник AE-048 `7bf2124a-2dfa-44b2-a4fc-f00674225930`. Файлы: `/tmp/AI-Everywhere-full-2m45-v15-1080p.mp4`, `/tmp/AI-Everywhere-full-2m45-v15.edl.json`.
- В AE-048 (frames 3372–3453, 140.50–143.92 s) вместо повторного проигрывания первых секунд дороги использована поздняя фаза того же H3 take: река уже проявилась и развивается под каменной аркой. Новый silent source 82 кадра, 1344×768, 24 fps; timeline и master audio сохранены.
- QC: проверены кадры до/на/после замены, её середина и переход обратно в реальную рабочую станцию; композиционный переход чистый. `ffprobe`: H.264 `1920×1080`, 24 fps, 3960 кадров / `165.000 s`. Декодированный AAC совпадает с предыдущим master: `e53c3cb2cd0a245bfa0b85629ad1e66ebaa44efa2c77c02b8c84642e6e5eae74`. Master SHA-256 `152094ebfcdf9e2d80009ecbdb7189a41daac35a8a348a23d780994643bcb8c9`; EDL SHA-256 `d9e1ed0056d30ea4caae52f41d62ee3ede6cfd745f31d45715d9112fe646d10d`.
- Lineage v15 подтверждён API: мастер от v14, EDL v15, AE-048 и исходного аудио; EDL от EDL v14 и AE-048. Три версии подключены к проекту.
- Повторный source-аудит обнаружил три возвращения к одной статичной пластине в разные части песни (17.17 s / 109.71 s / короткая перебивка 126.83 s). Быстрые монтажные вставки могут быть осознанными, но средний повтор всё ещё недостаточно выразителен; рассмотрю замену на уже существующий тематически подходящий детальный шот при следующем монтажном проходе. Это не picture lock.
- Следующий проход: просмотреть v15 целиком с мастер-дорожкой в нормальном темпе; вручную отметить вокальные входы, дыхания, speed ramps и смысловые переходы. Системный локальный Whisper/forced aligner не найден; не заявлять точность lyric sync без прослушивания. Затем пройти оставшиеся повторы в порядке заметности, сохранить удачные авторские мотивы, проверить крупные планы/пальцы/экраны и пересобрать новый viewing master только при содержательном улучшении.


### История: AI Everywhere viewing master v14 · digital world lives on the screen
- Предыдущий viewing master проекта `a654d533-63f0-463d-bbec-aab87b231d06`: video AssetVersion `66741292-0a24-403b-a895-8f834b87ab08`, EDL `817d0916-3eee-4a70-a210-dc60ce399c3b`. Файлы `/tmp/AI-Everywhere-full-2m45-v14-1080p.mp4`, `/tmp/AI-Everywhere-full-2m45-v14.edl.json`; v13 и ранние версии сохранены.
- AE-052 (frames 3782–3863) теперь показывает динамическую кристаллическую обсерваторию: Qwen Image 2.1 keyframe `9870c68f-2755-4dec-b38e-ca14293d3011`; H3 I2VA 8-step source `e96483fb-5413-4a52-a051-2a1206255485`; silent 82-frame montage clip `8060cadc-6f47-44dd-933e-0b30d89c9f41`. Prompt/workflow snapshot `9c8ed707-c40a-4a00-8c6f-45a1a5d7f7e6`.
- AE-053 (frames 3864–3949) возвращает тот же последний кадр AE-052 на закреплённый landscape monitor рабочей станции; композит AssetVersion `3b1d9a3a-22fa-4ba2-9fc3-a9880f52dd6b`. Hard match cut переводит digital-wide в реальную комнату, а второй экран сохраняет предшествующий мир. AE-050 остаётся установочным wide, AE-051 — тихим крупным планом героя; повтор одного и того же неподвижного workstation plate заменён развитием «лицо → движение внутри digital world → результат остаётся на мониторе».
- QC ключевых точек: начало/середина/конец AE-052, последний кадр → AE-053, финальный hold. H.264 `1920×1080`, 24 fps, 3960 кадров / 165.000 s; AAC-дорожка декодируется в тот же SHA-256, что v13: `e53c3cb2cd0a245bfa0b85629ad1e66ebaa44efa2c77c02b8c84642e6e5eae74`. Master SHA-256 `6095deec55bdae0e8be502435ce5a8930703f30a639555d54e5c8bec6454cc71`; EDL SHA-256 `17a71d9b272dc6dbd21a99d65832f7b62d53967d560f98abe04beb4032b92898`.
- EDL сохраняет 58 сегментов, тайминг, 2:45 и единственную авторскую master-дорожку. Это viewing cut, ещё не picture lock. Завершённые QC v14: outro и его match cut; полный просмотр/прослушивание v15 ещё впереди.

### История: AI Everywhere full viewing master v13 · вход через экран в чёрно-стеклянный мир
- Актуальный просмотрочный master проекта `a654d533-63f0-463d-bbec-aab87b231d06`: video AssetVersion `117fbd61-ea4e-4391-888a-5c8a93432ab0`, EDL `0a8fd249-62e0-49b3-8f35-5dcb8bb12b5f`; v12 и прежние версии сохранены. Локальные файлы `/tmp/AI-Everywhere-full-2m45-v13-1080p.mp4`, `/tmp/AI-Everywhere-full-2m45-v13.edl.json`.
- Новый AE-011 screenworld segment AssetVersion `7748fc08-2cf1-4766-ba47-7171572e0172`. Он сохраняет исходный H3 camera push и короткий жест рукой на мыши; содержимое только главного landscape-монитора заменено покадровым перспективным композитом ключевого кадра чёрно-стеклянного мира. Камера и все физические предметы остаются на исходных местах. FL2VA-перегенерация отклонена: долго удерживала общий план и резко меняла изображение в конце.
- QC: просмотрены кадры AE-011 в начале, середине и конце, плюс монтажный стык с AE-012. Углы экрана следуют наезду; в конце экранный мир открывается hard match cut в тот же полноэкранный мир. Портретный монитор остаётся вторичным синим simulation-layer. Видеоряд v13 — 1920×1080, 24 fps, 3960 кадров / 165.000 s; AAC-дорожка декодируется в тот же SHA-256, что v12: `e53c3cb2cd0a245bfa0b85629ad1e66ebaa44efa2c77c02b8c84642e6e5eae74`. Master SHA-256 `39deddf370c8feb458f5fef34995edb9a8a2dd164e8c955a88ca7e6cfb48ade1`; EDL SHA-256 `b4b8c370acb53cd2c5ee878f097fb44e8f3cdd999027c5c732f299a8ee2fc89e`.
- EDL сохраняет 58 сегментов, музыкальную сетку и границы склеек; обновлён только AE-011 на frames 783–864. Авторский звук остаётся единственным master audio. Это полный viewing cut, ещё не picture lock: полный просмотр 2:45 и проверка вокальных атак/дыханий остаются впереди.
- Исторический QC-план v13: полный просмотр с аудио и аудит outro перенесены в v14; см. текущий checkpoint выше.
- Новый образ AE-012: Qwen Image 2.1 text-to-image keyframe `398c0c88-4051-4dc1-9f55-c08c7ca28231` (1344×768, 40 шагов); MiniMax H3 Ref2VA INT8 + Pika Flex, 6 шагов, 124 кадра: `065521e6-2b6e-4c36-aa06-f616e27f02b4`. Взята вторая версия: физический низкий dolly над чёрной водой, параллакс башен, проход через янтарный портал; первый дубль удерживал композицию и был отклонён как недостаточно подвижный. Генерационный звук исключён.
- Заменён только AE-012, timeline frames 865–946 / 36.042–39.458 s. Исходные 124 кадра сведены к 82 кадрам с коэффициентом `1.512195`; остальные 57 монтажных сегментов и положение склеек сохранены. AE-013 остаётся осознанным жёстким переходом в wireframe-слой, следующий AE-014 раскрывает архитектурный город.
- QC: `ffprobe` подтверждает H.264 1920×1080, 24 fps, 3960 кадров / 165.000 s; AAC-дорожка побайтно совпадает с v11 (SHA-256 декодированного аудио `e53c3cb2cd0a245bfa0b85629ad1e66ebaa44efa2c77c02b8c84642e6e5eae74`). Проверены кадры у границ AE-011/012/013; переход из неподвижного монитора в самостоятельное пространство читается, геометрия нового мира стабильна, ближние башни создают параллакс. После портала намеренный hard cut на wireframe требует оценки при полном просмотре. Master SHA-256 `542aad5dc8dd89b755ef58cf622539ecac9d6a722d27cbe3113ec1df08840a08`; EDL SHA-256 `34afe55ed6862fba3f093bd614ad33adf9cb691549d7c9ee61c94f4173335011`. Provenance перепроверен: Qwen keyframe создан text-to-image без входного изображения; H3 source выведен от этого keyframe. Предыдущие ошибочно связанные записи помечены в Media Pool как superseded.
- EDL v12 содержит 58 сегментов и прежнюю временную сетку. Полный просмотр 2:45, проверка вокальных атак/дыханий и оценка на большом экране остаются следующими QC-этапами; это просмотрочный master, не picture lock.
- История v11: открывающие 164 кадра показывают реальную рабочую станцию с перспективно вписанным городом на неподвижных дисплеях; AE-002 жёстко режет в полноэкранный цифровой город. Мониторы, клавиатура, мышь и комната не двигаются. На H3 FL2VA take добавлен 20% центральный push-in вместе с музыкальным speed ramp; генерационный звук удалён. Все кадры открытия сохранены в v12.
- AE-002: Qwen Image 2.1 keyframe AssetVersion `c972934c-927d-452e-96dc-6e63d580cdef`; FL2VA last frame `34b60feb-602a-492b-b605-e5c2c752a83d`; MiniMax H3 job `47e6f19d-a184-42b6-97b7-bdf2eb1f1724`, output AssetVersion `cc3fd424-b03a-429e-8733-3d2809c7e4ae`. Pika Flex Ref2VA candidate `81229d06-cfaa-47c3-9f4e-9a20499590e2` отклонён: модель добавила воображаемый монитор вокруг полноэкранного города. Для чистого match cut оставлен FL2VA с first/last-frame контролем.
- Композит комнаты зарегистрирован как `a4c9c4db-9c0c-49b4-88c0-cc91f9382b02`; v11 master SHA-256 `319e2e522e80e44aa03f5d2dfd62765faac90ebb7aca76ef4084f6fc51c6466f`; EDL SHA-256 `38e078aa13bdaca6af006838d85cf0566d6496821ea4a41c1768dece56b16523`. `ffprobe`: H.264 `1920×1080`, 24 fps, 3960 кадров / `165.000 s`; авторская AAC-дорожка `164.520 s`; финальный кадр и контейнер доводят мастер до 2:45. Проверены переходы AE-001/002 и AE-010/011/012, финальный hold и изменение масштаба наездов.
- На отметке 32.625 s (AE-011, frames 783–864) кадрирование исходного реального workstation take продолжает движение камеры к неподвижному landscape-монитору. Короткий жест руки на мыши оставлен; герой и верхняя одежда выходят из кадра до полноэкранного цифрового кадра. Новый segment AssetVersion `0ff27109-8b6e-4519-aaa0-dc6de3b72e8b`; существующее H3 видео комнаты не перегенерировалось.
- EDL v11 содержит 58 непрерывных сегментов / 3950 монтажных кадров, затем 10 кадров доставки; хвост v10 после кадра 864 сохранён. Проверка против каталога подтвердила все 58/58 shot ID и все source AssetVersion, включая исходные MP4, связанные как `source_video`. Master SHA-256 `319e2e522e80e44aa03f5d2dfd62765faac90ebb7aca76ef4084f6fc51c6466f`; EDL SHA-256 `38e078aa13bdaca6af006838d85cf0566d6496821ea4a41c1768dece56b16523`.
- `ffprobe`: H.264 `1920×1080`, 24 fps, 3960 кадров / `165.000 s`; AAC — авторский трек `164.520 s`, без сгенерированного звука. На стыке вручную проверены кадры 782/783/864/865 и промежуточные 800/823/844: новый наезд логично уходит из плана seeds в экран и затем на цифровую пластину. Это просмотрочная версия, не picture lock. Полный просмотр 2:45 и точная сверка слов, вдохов и титров ещё впереди. Сетка 140 BPM остаётся рабочей, vocal alignment — provisional; локальные Whisper/forced aligner и модели не обнаружены, ничего не устанавливалось. Продолжать с v11, master audio не менять.
- ComfyUI v0.45.0 работает локально на `127.0.0.1:8188` (RTX 5090), QD API `4310`, worker online; очередь при финальной проверке пуста. После рендера `/free` вернул HTTP 200 с `unload_models=true, free_memory=true`; ComfyUI остался запущен. `llama.cpp` не запускался.
- Видео H.264 `1920×1080`, 24 fps, 3960 кадров / `165.000 s`; master AAC `164.520 s`, финальный кадр удерживается до `02:45.000`. Это upscale текущих HD исходников с одним детализированным HQ шотом; upscale сам не восстанавливает отсутствующие детали.
- Onset spectral-flux autocorrelation: пик 139.85 BPM; каркас 140 BPM, фаза ~0.08 s. Средние 62 такта слегка conform-нуты на 5 кадров (`0.196%`). Точные вокальные атаки и дыхания остаются непроверенными: локальный Whisper/forced aligner и его модели не установлены; скачивать модель не разрешено настройками проекта.
- Хук-титр `AI EVERYWHERE` показан в коротких окнах кадров 347–366, 2964–2983 и 3004–3023. Визуально проверен, но синхронизация по слогам остаётся provisional до прослушивания.
- AE-052 остаётся на строке `But the movie's right there`: Qwen Image 2.1 (`1344×768`, 40 шагов) создал кристаллический мегаполис над ночным океаном. Источник `04732646-3f76-4dd2-af50-5c06f8e5cae4`, конечный кадр `b75f7c6b-82ef-4cef-89b5-8fc4543fdd1c`.
- AE-052 HQ MiniMax H3 job `35c9b3be-6fbf-4b0c-8d3c-f8dce46107d5`, attempt `c04a10a2-ac98-44d6-aa99-926b3a12728f`, выбран source AssetVersion `32d8dfc8-e86d-4790-85f3-8c653eebd305`. FL2VA PDD 8-step, 1344×768, 124 frames / 5.17 s; старт/середина/конец просмотрены: архитектура стабильна, волна/свет движутся. В финальном cut AE-052 заменяет AE-046 в bars 87–88 на “But the movie’s right there”; 82 выходных кадра / 3.417 s, сгенерированное аудио отброшено.
- AE-041 в v8 перестал повторять начальные кадры AE-017: взят уже сгенерированный хвост того же принятого H3 take, source frames 42–123, где герой естественно поворачивается из заднего плана в профиль, а световая диагональ перемещается. Длительность и музыкальная сетка не менялись. Start/mid/end AE-041 и переход к AE-042 просмотрены.
- AE-053 дополняет кульминацию: чёрное стеклянное плато, монолитные пластины, внутренне светящаяся сфера и янтарный световой поток. Qwen Image 2.1 keyframe `1344×768` / 40 шагов, asset `e0e01d7c-c2f4-4461-86dd-85a1cafce8d8`; MiniMax H3 FL2VA PDD 8-step / 124 кадра, video `0e6afb55-7707-48d8-a30d-057e1b560470`. Шот заменяет почти чёрный AE-039, длительность в мастере неизменна; title cue windows сохранены. Начало, середина и конец H3 take просмотрены; форма монолитов и горизонт стабильны, средний световой импульс очень яркий и требует просмотра на обычной скорости.
- v8 подтверждён `ffprobe`: H.264 `1920×1080`, 24 fps, 3960 кадров / 165 секунд; AAC 164.52 секунды плюс 0.48 секунды финального hold. Проверены кадры AE-039/AE-041, соседние монтажные переходы и возврат к физической комнате. v8 не является picture lock. Следующие задачи — пройти весь ролик по секциям на обычной скорости, проверить световой импульс и повторяющиеся образы, после чего подтвердить вокальные атаки и графику на слух. Точные word-level таймкоды пока не подтверждены: локальный Whisper/forced aligner не установлен.
- ComfyUI v0.45.0 работает локально на `127.0.0.1:8188` (RTX 5090), QD API `4310`, worker `local-qwen` online; очередь ComfyUI пуста. После генераций вызван local `/free` с `unload_models=true, free_memory=true`; endpoint ответил 200. ComfyUI не останавливать. `llama.cpp` не запускался. Comfy MCP настроен на remote target `192.168.10.165`; генерации этой сессии шли через local QD worker.

### Исторический checkpoint v1.6: bars 11–72, AE-029…038 (2026-11-15)
- Сценарий обновлён до [v1.6](music-video-ai-everywhere-script.md). AE-029/030: реальные отпечатки на столе → макро выбранного янтарного кадра. AE-031: close-up реальной клавиатуры → hard cut по синему мосту. AE-035/038: плоская физическая стеклянная пластина и отражённый цифровой мир, без её генеративного морфинга.
- Создан и покадрово проверен AE-029 image-edit через `image_edit_QwenImage21`, 40 steps, 1344×768. Output AssetVersion `b0879bf5-64ce-4e1c-b2ff-86a5354f07e1`: три маленьких production stills лежат перед клавиатурой; клавиатура, мышь и два монитора на местах; экспозиция тёмная, но читаемая. Экранные детали размыты и не служат героем кадра.
- AE-029/030 собраны из этой принятой пластины детерминированным 2D push: video AssetVersions `5b2f78e5-fd10-4d5f-ba78-010edf72e643` и `78f0b2de-ae1c-4e3d-a9df-441c087b5d92`, по 82 кадра / 3.417 s / 1024×576 / 24 fps. Для AE-030 берётся крупный план первого отпечатка с аркой; движения/руки не добавлялись.
- AE-031 первая H3 версия отвергнута: яркий прямоугольник выглядел как несуществующая клавиша. В монтаже заменена на crop утверждённой клавиатуры `b981d731-eca3-4b7d-bf4e-c15b76849803`, а переход в код сделан cut на синюю линию AE-032. AE-032 (job `d9bab3a6-b422-4030-a3b7-efc64a78d020`, asset `c1c378a9-141f-4565-90a6-64396ba8fe15`) показывает непрерывную дорогу и раскрытие города без морфинга. AE-033 (job `8b72409b-4acd-4e32-9d9c-99f82723b1b1`) сохраняет лицо; выбран 41-кадровый тёмно-грейдированный диапазон `aee9b39d-8770-4be3-9a0b-c2f4d04eff5e`. AE-034 (job `6978813b-6416-4c18-8046-582747881176`, asset `2b5d2e6f-6cf6-4b09-b6de-6a2ad339888f`) — тёмный силуэт и одна появляющаяся точка на экране.
- AE-035 сырой H3 take (job `7a2415c6-41bd-4018-b2db-05fc272daff2`) отклонён из-за меняющейся формы капли. В монтаж выбран deterministic macro push asset `1d511524-0d2d-4eaa-b35a-aa52c079bc75` от стеклянного still `2630d9d6-0f34-47ad-b381-ac3a38673cd0`. AE-036 (job `6eeca259-37b8-4390-9ede-6db02069e97a`, asset `53341b93-49c1-47ed-816e-1eb661e629e8`) оставлен: blue road line убедительно раскрывается в Blue Meridian river/arch и даёт переход по lyric accent. AE-037 (job `491f6d4b-4b75-456d-9784-bcc332cd704d`, asset `dde85ea2-d439-436e-9644-d8acc923e264`) прошёл face/identity QC. AE-038 сырой H3 take (job `747a0d89-da18-407a-aaef-e362f89d2b86`) отклонён: поднимал пластину вертикально. Выбран плоский still с deterministic push, asset `57666650-976e-47f9-9320-d2125150d881`.
- Рабочий монтаж расширен до bars 11–72: `/tmp/AI-Everywhere-verse2-bridge-62bar-v1.mp4`, 2545 кадров / 106.042 s / 1024×576 / 24 fps; continuous master audio начинается в 17.143 s, H3 audio исключён. Video AssetVersion `0f9c075b-076d-413c-b488-22030d199b8f`, EDL `eb8ea3ab-4bde-49f8-af87-ce015ca96d2b`; оба linked как deliverables. Cut boundaries 92.3–106.0 s просмотрены: силуэт → пластина → road-to-world reveal → face → wide plate.
- Это рабочий continuity preview, а не финальный мастер; тактовая сетка 140 BPM и вокальные границы остаются provisional. Полная beat/vocal alignment по master ещё не выполнена.
- API `/ready` отвечает `not_ready` только по выключенному llama.cpp; ComfyUI 0.45.0 доступен на `0.0.0.0:8188`, QwenDirector API отвечает, генерационные jobs завершаются. Llama запускать не нужно. Перед уходом проверить очередь ComfyUI и освободить модели через `/free`, не останавливая сервер.
- Продолжить автономно: полностью покрыты Verse 2 и Bridge до bars 72. Каталог Final Chorus + Outro пока неполон: привести сцену в соответствие с AE-039…050, затем генерировать/выбирать шоты по отдельности, проверять каждый take и собирать bars 73–96. Полная цель 2:45 ещё не достигнута.

### AI Everywhere: переход «архив вариантов → выбранный цифровой мир» (2026-11-15)
- На дату этого исторического контрольного среза карта была v0.8; текущая режиссёрская карта обновлена до [сценария v1.6](music-video-ai-everywhere-script.md) и описана выше. Сквозной переход реальность↔цифровой мир строится через экран/стекло, отражение и направленный свет; в кульминационных кадрах цифровая среда может проступать поверх реальной по общей перспективе, сохраняя жёсткими исходные предметы, экранный вектор и монтажную ось. Контраст «темнота → свет», сдержанный янтарный знак человеческого выбора, крупность, фаза и темп движения остаются общими правилами.
- Проверен FL2VA camera-motion candidate: job `e97938cc-fe4d-42bd-8677-1ce2776cf2a4`, attempt `a24200ee-437e-4eff-8b68-26a0b83eadd2`, manifest hash `e97f8d1c0b17fb7b28fd5d3fb5f99aed673b6f8ccc60f6cc9238fc6a60c7d1c9`, 124 кадра / 5.167 s / 1344×768. Из исходного city still сделана пара reference кадра 1 и того же вида с центральным 13% приближением; отдельный custom graph на базе FL2VA PDD8 профиля не менял глобальные настройки. Начало/середина/конец сверены: кадр реально приближается к last-frame, горизонт и силуэты башен устойчивы, янтарный свет появляется на одной башне без широкой полосы. Output AssetVersion `f43d7701-cda4-48b9-94e6-da32c05fe9db`, SHA-256 `f13599176f723f9b1ae44577752e2a327e49d8089ed8492bb51c0c7119dab010`; он selected и linked в Media Pool как `source_video`, но остаётся QC-кандидатом до просмотра в темпе и проверки в монтаже.
- Для Verse 1 добавлены каталогные шоты AE-007 (силуэт автора), AE-011 (камера подходит к неподвижным мониторам) и AE-013 (широкий цифровой город). AE-007 сгенерирован локально в Ref2V с отдельными face/headless-body/city references: job `1d717489-8362-4040-a164-ae9f83e034a2`, output AssetVersion `97fa50a8-35f6-4bf9-b4e0-27ac28faf248`, 56 кадров / 2.333 s / 1024×576; контрольные кадры чистые, читается силуэт в худи и короткие волосы.
- Подтверждён существующий AE-011 insert `af76de0d-8fe6-4951-b93d-898d638d7a69`: камера физически приближается к экрану, мониторы и предметы на столе остаются на месте; на экране абстрактный 3D-мир. Вместе с выбранной стеклянной пластиной, переходом в широкий город и FL2VA dolly-in это закрывает связку «реальная рабочая станция → отражение/стекло → цифровой мир».
- Собран новый Verse 1 rough cut до входа в первый припев: `AI-Everywhere-verse1-bar11-to-first-chorus-rough-cut-v1.mp4` (741 кадр / 30.875 s / 24 fps / 1024×576) и EDL JSON. Shot order: рождение города → силуэт → машина → хром → выбор вариантов → камера к монитору → стеклянная пластина → широкий город → FL2VA dolly-in. Все девять EDL shot IDs совпали с live catalog; видео и EDL имеют lineage на десять исходников, включая master audio. Media Pool video AssetVersion `9cc9102f-8264-48dd-b53c-70ae8858c15e`, EDL AssetVersion `d3ed7bad-7d85-4af0-a37a-41662f95033f`.
- Стык 18-секундной последовательности визуально просмотрен контакт-листом: мосты синего цвета/диагонали и янтарный акцент ведут из комнаты в цифровой город; физические мониторы не двигаются. Audio непрерывный из master, звук генераций выключен. Тактовая сетка около 140 BPM остаётся provisional: полный прослушивающий просмотр и точное совпадение слов/downbeat пока не подтверждены. Старые 13-bar v2 и EDL v4 — предыдущие версии, superseded.
- Сцена Chorus 1 синхронизирована со сценарием v0.8. В каталоге девять production-шотов: AE-015 занимает два такта (3.429 s), AE-016 разделён на две самостоятельные однотактовые части AE-016A и AE-016B (по 1.714 s), AE-017–022 сохраняют по два такта. У каждого сохранены generation prompt, основной ход камеры, VFX-ограничения и монтажная проверка Соколова. Для всех генераций использован локальный кандидат Standard INT8 + Pika Flex; персонажный RefMod удаляется из per-job graph для environment shots.
- AE-015: job `dcbd4a22-28b9-43ad-8f27-3a3c85a6c94b`, attempt `e040bdfa-c6ab-4e52-934b-702cfc3011c4`, manifest `0331d8d14268108cd8c58b28ba05005a3d5aac59dcd31d3ef775298b1b6be310`, output `7244e5c8-7bfb-48c6-aa2d-773e31d0c272`, 124 frames / 1344×768. QC: цельный тёмный город и хорошая синяя линия; явного camera parallax нет. Оставлен как намеренный широкий hold после движения AE-014; для монтажа берутся первые 82 кадра до позднего появления мелких зданий. Скрипт описывает его как «движение → удержание».
- AE-016A: job `434ad17c-c50d-4fa1-a5f7-aae6394000c8`, attempt успешен без ошибок, output `9ca35fdf-8d05-4c5b-aa95-eeac60d55ec5`, 124 frames / 1344×768. Один автомобиль пересекает мокрую улицу слева направо; выбран источник frames 30–70, 41 кадр. AE-016B: job `e98f2acd-4d42-4bbe-8457-25f633f75ca7`, output `00cef9fb-eced-4fe9-b4df-8cfaba745316`; стеклянная пластина остаётся горизонтальной и опёртой, синий свет возникает на кромке; выбран тот же 41-frame диапазон. Обе сцены идут отдельными job graphs без RefMod.
- Собран актуальный Verse 1 → bar 34 preview `AI-Everywhere-verse1-chorus1-silhouette-24bar-v1.mp4`: 987 frames / 41.125 s / 24 fps / 1024×576, master audio с 17.143 s, generated H3 audio исключён. EDL содержит 13 сегментов; все shot IDs есть в live catalog. Video AssetVersion `cb8a0142-4760-4e30-9ae2-37a147488744`, EDL `38058569-f1ce-405f-94e0-683315ac349f`; у обоих lineage к предыдущему 22-bar video/EDL, AE-017 source и master audio. Стык осмотрен contact sheet: стеклянная деталь переходит в одиночный силуэт с видимой головой и тем же синим городским мотивом.
- AE-017 сгенерирован на Standard INT8 + Pika Flex и RefMod героя: job `429b109b-a227-46b9-bfb4-2a4daad3eef4`, attempt успешен без ошибки, manifest `1478035b2c4ea62e7279b205b697e8817583cdd7356c0b5f96d3c7d2f9d9917e`, output `e25d3622-7bc1-4d82-8764-b68316d740ed`, 124 frames / 1344×768. Использованы face anchor `54a628b8-2dcd-4d4d-9d01-c0025b067092` и headed hero/city anchor `2124961d-f5de-429e-a6b0-cad48f94c431`. В контрольных кадрах один персонаж, голова видна, hoodie и синий городской мотив сохранены. Арка от заднего ракурса к боковому читается без пересечения оси; силуэт намеренно остаётся широким. Это QC candidate, не финальный master.
- Уточнена режиссура AE-012–013 в [сценарии](music-video-ai-everywhere-script.md), версия v0.4: реальный стеклянный носитель остаётся плоским и опёртым, один синий sweep заканчивается на изображении выбранного wireframe-города; затем отдельный широкий low-angle shot раскрывает цифровую среду. Это осознанный скачок крупности через hard cut на синем мотиве, а не морфинг пластины в архитектуру. Отражение/цвет/вектор света связывают физический и цифровой планы, без ложного обещания непрерывного пролёта камеры.
- Из трёх still-вариантов выбран seed `920301` как текущий motion candidate. Создан durable H3 job `fc25c70e-1f5c-4968-ae73-d8c4e0f3e7f6`, attempt `8d74442a-b4e4-4df1-b42b-1522b5133e3f`, Pika Flex Ref2V, один image/set reference, 124 кадра / 24 fps / 1024×576. Манифест `c48228f1f3cac2ea3f3e546806ca671078fa46235e7847fed9369dfb09407113`; raw video AssetVersion `7f1d9bdb-c982-4d72-87b4-99eb5231ca00`, SHA-256 `738ccb9252e3530fb9f42237013b8b1eeeaddd526eb07536d0d771c8d25c7fb0`.
- Контроль кадров в начале/середине/конце: камера делает читаемый наезд, герой-пластина увеличивается, остаётся горизонтальной и визуально опёртой на тёмный лоток; контур и город в целом сохраняются. Около середины есть один яркий синий sweep. Это годный motion preview для монтажа, но пока не финальный high-quality master; доп. глитч/строб/тряску к sweep не наслаивать.
- Собран двухшотный 4-bar preview `AI-Everywhere-selected-plate-to-digital-world-4bar-preview-v1.mp4`: первый двухтактовый план ускорен до 82 кадров (1.512×), затем 82 кадра существующего forward track по тому же синему wireframe-миру. Hard cut на `frame 82`, 164 кадра / 6.833333 s / 24 fps / 1024×576. На стыке масштаб раскрывается из макро в широкий низкий городской план; это графический/цветовой мост, не точное совмещение всей композиции.
- Использован единый срез master audio `AI-Everywhere.mp3` с `32.571 s`, до `39.404333 s`; звук H3 удалён. Preview и EDL пока имеют provisional sync по рабочей сетке 140 BPM; границы lyric/downbeat нужно подтвердить прослушиванием. Preview AssetVersion `6482fd79-e094-4582-a93e-d9355982e108`, SHA-256 `03265200cf2aef193e1a571524a48614aaaa6cc179af7ebcb483e7525e84aad1`. EDL AssetVersion `86184168-9209-43a4-b2a0-dfd57b25347e`, SHA-256 `0ca8954fbde1dc79bb94c4ccb745695c2593768a3bf1b35b1e6ca47c1721a0f5`. Raw motion preview, монтажный файл и EDL связаны с AI Everywhere Media Pool.
- AE-018 выполнен локально на Standard INT8 + Pika Flex без RefMod: job `e93e72eb-f650-485d-a268-e4abb65f1392`, attempt `469f8b8c-a9e8-4a77-bcb5-45ef3df7685e`, manifest `1cf4fab0711208ee9b44fa145aa572abd1e8b1e3d2766c35f6c0b528e3c11d9d`, raw video AssetVersion `ee968096-604b-4d21-86ad-2afce054d4b7`, 124 кадра / 1344×768. Для каталога оставлен environment-only graph с двумя focused references: мокрая улица и continuity-anchor цифрового города. Первый некорректно вложенный prompt был отменён до запуска; финальный job использует штатную схему H3 Ref2V. После завершения очередь ComfyUI проверена пустой, модели выгружены через `/free`.
- QC AE-018: выбран участок source frames 42–123 (82 кадра). Один автомобиль проходит слева направо; горизонтальный синий световой шов мотивирует проявление wireframe-города вдоль той же дорожной перспективы. Контакт-лист стыка подтверждает последовательность «силуэт → мокрая улица → световой шов → цифровая сетка»; камера/rig не появились, H3-аудио удалено. Скрипт уточнён: это намеренный VFX-мост смешения сред, машина и предметная геометрия остаются жёсткими. Полный экранный просмотр и проверка по master на слух ещё впереди.
- Собран и linked в Media Pool новый provisional preview `AI-Everywhere-verse1-chorus1-digital-bridge-26bar-v1.mp4`: 1069 кадров / 44.541667 s / 24 fps / 1024×576; master audio начинается с 17.143 s, звук H3 исключён. Video AssetVersion `bc2de825-4fce-453d-b3e8-705f20cd3116`, SHA-256 `2b137393ddbeaad726441eab918f1215808fe9b80e113819671aa2e322a6b861`; EDL AssetVersion `6f576491-d5f9-4f16-8003-fc04653d0816`, SHA-256 `ac53c1dc895abf75cc4dd84cf1ddfe1ae4f69dd545f213fce3aeb925fdcd9769`. EDL содержит 14 сегментов; shot IDs сверены с проектным каталогом. Оба новых assets имеют lineage на предыдущие 24-bar video/EDL, AE-018 source и master audio. Тактовая сетка 140 BPM и lyric/downbeat sync всё ещё provisional.
- AE-019 сгенерирован на Standard INT8 + Pika Flex без RefMod: job `67d144a4-c616-4bb2-a6f5-f51734132d92`, attempt `f9e407da-3966-45cf-8b52-49fb8ae54f52`, manifest `51ef813fbcb5befbe67c94f7a2644fa35d8b1e7a5ef9d44af4ce67ccde36d75e`, raw AssetVersion `21bec32c-0ee3-4d9e-b1dc-c7f5cfbc7129`, 124 кадров / 1344×768. Использованы focused glass + city references, без персонажа.
- QC AE-019: H3 удержал glass bevel → тот же городской skyline, но внутренние монтажные склейки были недостаточно явными. Поэтому cut собран в пост как 10 кадров отражения на стекле, 10 кадров 2.1× центра той же башни (`b554546a-bbbe-4b6e-8c08-18a6bb99780d`) и 62 кадра широкого skyline с движущейся линией. Это два явных hard cuts, укрупнение/раскрытие по Соколову и один continuity-anchor; геометрия башни остаётся неизменной. Проверен контакт-лист входа/двух стыков/финала, но просмотр в реальном музыкальном темпе остаётся обязательным.
- Собран новый provisional preview `AI-Everywhere-verse1-chorus1-digital-montage-28bar-v1.mp4`: 1151 кадр / 47.958333 s / 24 fps / 1024×576; непрерывный master audio с 17.143 s по 65.101333 s, H3 audio исключён. Video AssetVersion `a4b8fa74-abef-4e40-9264-d44f4bd601a4`, SHA-256 `1fa2b19138bcc43691ae91825155781d48bd439e83b7296347ef55920025265a`; EDL AssetVersion `87940163-6588-4784-ad47-416658702bc2`, SHA-256 `fb1f12834b10de5478c40de5aac7a186350151913befa4dfd5ad02af0025e8b7`. EDL содержит 17 сегментов; все shot IDs сверены с каталогом, lineage preview/EDL включает предыдущую пару, AE-018, AE-019 raw/crop и master.
- AE-020 сгенерирован на Standard INT8 + Pika Flex без RefMod: job `6dff177e-5698-45cb-be14-f2866f4fe8e4`, attempt `12f12112-ef8e-42e5-b522-6e998cc5086a`, manifest `9b4c68c72eeda9540625ec01eee5cf8682dab11ff36360cfe836cd8141585717`, raw AssetVersion `f1b5187f-a872-4bf2-b8a9-9e9a253d5cdc`, 124 кадров / 1344×768. Использованы тот же центральный городской anchor и focused glass reference.
- QC/монтаж AE-020: вместо ненадёжных внутренних cutpoints выбран ритмичный сборочный приём по одному якорю: 19 кадров затемнённого города → 19 кадров 2.1× crop стеклянного отражения (`83bf53c0-6144-4475-b026-d7ad72b5802c`) → 44 кадра широкого города, ускоренные из 54 кадров источника с коэффициентом 1.227. Контакт-лист проверил оба стыка и возврат к той же башне.
- Собран и linked в Media Pool `AI-Everywhere-verse1-chorus1-reload-30bar-v1.mp4`: 1233 кадра / 51.375 s / 24 fps / 1024×576; master audio без разрыва с 17.143 s по 68.518 s, H3 audio удалён. Video AssetVersion `f68965ad-c6e7-4193-ab03-d6546a6155db`, SHA-256 `2676129c433a83791fe630f60c6a2ece7e8ecbce6a04912ccf93c3b3e7b64417`; EDL AssetVersion `2a523de3-6d5e-49e9-b3ef-35b0c2e1f910`, SHA-256 `10ea71cb92d11ebf6e3f0c2988736c60c87ba9fa1afa265d2c9fb8afdd3b8562`. EDL содержит 20 непрерывных сегментов; все shot IDs сверены с проектным каталогом, lineage ведёт к 28-bar паре, AE-020 raw/crop и master.
- AE-021 сгенерирован на Standard INT8 + Pika Flex без RefMod: job `39d6f505-fdfb-4638-87c7-65d6b421198a`, attempt `904ccce7-0d3b-4830-ac81-2f605fcddfb9`, manifest `b25620b59b47ddb1818660fcaf513d6b974ab03127b0d3ff245f256936d3e744`, raw AssetVersion `72f58cdc-6971-43ec-ad8e-7eedce917f01`, 124 кадров / 1344×768. Два focused references связывают неподвижную стеклянную кромку с прежним городским continuity-anchor.
- QC/монтаж AE-021: source frames 0–23 дают 24-кадровую резкую деталь; отдельный hard cut на source frame 66 начинает 58-кадровый общий план уже после завершения стеклянного sweep. Контакт-лист подтверждает continuity синей линии и центрального города, без морфинга. В широком участке есть небольшое brightening нескольких зданий; следить, чтобы это не превратилось в ненамеренный всплеск при общем грейде.
- Собран и linked в Media Pool `AI-Everywhere-verse1-chorus1-glass-bridge-32bar-v1.mp4`: 1315 кадров / 54.791667 s / 24 fps / 1024×576; master audio непрерывный с 17.143 s по 71.934667 s, H3 audio исключён. Video AssetVersion `34af0274-9abf-4e14-b1bd-153f9686f61a`, SHA-256 `fd695ad340304706c2d607da656bc665bbedb8cf86bd467c1ca661ab2c3145bc`; EDL AssetVersion `58c655e1-8b57-41c4-b0b4-8f4c735a5bfc`, SHA-256 `f9acdefebd4932860c1e7c6ee558022b6d8f30f216481569f7931cb249dfb5ad`. EDL содержит 22 непрерывных сегмента, shot IDs сверены с каталогом; lineage ведёт к 30-bar паре, AE-021 raw и master.
- AE-022 сгенерирован на Standard INT8 + Pika Flex без RefMod: job `3b038000-c901-4774-bb17-d655653d57b3`, attempt `4e61b32c-c1d1-495e-9a3d-4635d92fb3b9`, manifest `0d9beba6f0297d27a0f921b460f06fff859d0be8c849aa9bb78b90700d8607dc`, raw AssetVersion `f0d3361f-c313-45ef-9e49-a4a8b9bfe549`, 124 кадров / 1344×768. Использованы два environment continuity-anchor изображения города; персонаж не добавлялся.
- QC AE-022: полный проход поднимает один центральный skyline из почти чёрного кадра в собранный синий город; верхняя часть остаётся тёмной, яркость сосредоточена у земли и башен. Выбран полный source с равномерным retime в 1.512× для точной длины двух тактов; контакт-лист подтверждает постепенное раскрытие и короткое удержание в финале. Выраженного янтарного знака в генерированном master нет, не считать его обязательным присутствующим элементом в этом дубле.
- Собран и linked в Media Pool `AI-Everywhere-verse1-chorus1-resolution-34bar-v1.mp4`: 1397 кадров / 58.208333 s / 24 fps / 1024×576; master audio непрерывный с 17.143 s по 75.351333 s, H3 audio исключён. Video AssetVersion `bf490e93-5592-4dac-9950-2b58ca6ea9c1`, SHA-256 `405886946af54ee6816d06a6c4c63f310e7c5e133c240fdb928f5707288145c8`; EDL AssetVersion `4eddf2c4-af22-4098-a400-78ab27671893`, SHA-256 `b3b5f3de1caba3cc7939e75574b7e8acd6ac936dcff6d3e4bd56cf91b3bd1b50`. EDL содержит 23 непрерывных сегмента; shot IDs сверены с каталогом, lineage ведёт к 32-bar паре, AE-022 raw и master.
- После AE-022 queue ComfyUI пуст, модели выгружены; `/system_stats` показывает 30.7 GiB свободной VRAM. `git diff --check` для обновлённых сценария и журнала пройден.
- Следующий активный шаг: начать сцену Verse 2 (bars 45–60), сохранив синюю линию как монтажный мотив, но вернуть физическую комнату через её отражение в выключенном мониторе. На первых двух тактах дать короткое затухание широкого skyline в реальную деталь; затем построить чередование лунного отражения, солнечного блика и мокрой дороги под строки Verse 2. Перед финальной склейкой первого припева в темпе проверить AE-018–022; синхронизация пока provisional. Полный клип 2:45 не собран.
- Предыдущий 13-bar v1 помечен `SUPERSEDED` в Media Pool из-за текста, сгенерированного внутри контакт-листа; asset и lineage сохранены. Вместо него создан clean selection board `AI-Everywhere-selected-seed-board-v1.mp4` из четырёх stills: исходный цифровой город + три plate candidates. Labels `BASE / INPUT`, `TAKE 01–03` и выборочный цветовой кант нанесены как контролируемая графика. Янтарная рамка фиксируется на TAKE 01 / seed `920301`; следующий H3 macro shot начинается с почти того же кадра. Board AssetVersion `f33e89ce-70bd-4c72-bb17-446e20ac978d`, SHA-256 `88694a9c4ccfee97bb4635810c34be06748ef329f58f057a7c74a8eb67222a02`.
- Текущий `AI-Everywhere-verse1-13bar-rough-cut-provisional-sync-v2.mp4` собран заново: 534 frames / 22.25 s / 1024×576. Он сохраняет девять прежних тактов, заменяет генерационный contact-sheet на clean board и продолжает его H3 macro plate → wide digital-world forward track; master audio идёт непрерывно с `17.143 s` на `22.25 s`, сгенерированный звук выключен. Видео AssetVersion `e7ad7f98-d350-4c96-b268-ec72ac6fccf0`, SHA-256 `2d332921aff1df2ae93746bed1284d21bdb4ea2b06669f4e2c9b9cdd4ec8f039`. Текущий EDL v4 AssetVersion `098cbb30-03fc-4483-b5be-dab36af03c44`, SHA-256 `57af1043ddccb7caefcc8186e34d2aa35fe351c587eaa9f4f4a560706ed0499a`; live catalog audit подтвердил 7/7 существующих shot IDs. EDL v1–v3 помечены superseded, их provenance сохранён. Визуальный контакт-лист швов показывает, что TAKE 01 и первый H3 кадр совпадают по образу; sweep яркий и требует full-speed review. Синхронизация provisional; beat grid 140 BPM ещё не равна подтверждённым lyric/downbeat in-points.
- EDL auditor выявил и устранил реальный contract mismatch: в импортированном EDL был typo в одном macro-shot ID; v4 теперь сверяет все сегменты с live scene catalog. Заодно исправлен `PgAttemptRepository.createShot()` в `apps/api/src/pg-repository.ts`: валидированный `durationSeconds` раньше игнорировался при INSERT и подменялся БД default 5 s; теперь значение сохраняется. Текущий route-совместимый shot duration у AE-014 выставлен в `5.143 s` через PATCH. Изменение SQL пока не runtime-restarted и тесты не запускались; проверить его на следующем безопасном API reload.
- AE-014 в каталоге `d720ff73-e8e7-47b7-9531-63c2b39446f0` имеет duration `5.143 s`; последний prompt revision соответствует FL2VA dolly-in. Ref2V дубль дал свет, но не читаемое движение; его не считать успешным camera take. FL2VA кандидат выше — первый подтверждённый вариант с движением, но ещё без полного ритмического монтажа.
- Следующее: продолжить из AE-014 в Chorus 1 (сценарные AE-015+): каждый повтор припева должен менять крупность/точку обзора, а первый подъём раскрывает цифровые пространства через match по синей диагонали/свету. Сначала уточнить входы по master listening, затем генерировать отдельные управляемые шоты с handles и собрать обновлённые EDL/video; контроль — ось, крупность, фаза, темп, направление движения и визуальный мост по Соколову. Текущий 18-bar файл — rough cut с provisional sync, не мастер; полный 2:45 клип не собран.

### AI Everywhere: durable city-birth shot и монтажный beat preview (2026-11-15)
- Текущий локальный execution path проверен: QwenDirector API `/health=ok`, `/v1/runtime/comfy-schema` читает `object_info` с ComfyUI на `127.0.0.1:8188`, единственный worker online; перед генерацией очередь была `0/0`, RTX 5090 имела около 17.46 GB свободной VRAM. `comfy-cli` MCP отдельно сообщает remote target `192.168.10.165`; генерации в этой сессии шли только через локальный QwenDirector job API и не отправлялись на этот неиспользуемый target.
- Для отсутствующего shot `bcebd3dc-88fa-48ac-a215-c40d8787ee55` создан и проверен keyframe job `20094ff7-90a2-4a33-90ab-b523d7f7c8be`: Qwen Image 2.1 INT8, 25 steps, 1376×768, seed `930701`; durable attempt `28f421c4-07dc-4b27-a4ad-38825af4d1ff` завершён `succeeded`. Output AssetVersion `dc0e77be-5dfa-4b85-b318-bbe0530d8870`, SHA-256 `70fffb82dd67acded895fbbd687dea5ad2c3487821f685f0a202793002b6470c`; 100% визуальная проверка показывает чистую wireframe-архитектуру без комнаты/мониторов/людей/видимых генерационных дефектов. Он добавлен в Media Pool как `reference`.
- На основе keyframe выполнен shot job `a3cd6ac2-6185-466f-81dd-6235a7732ab8`, durable attempt `ea51397a-3498-413b-863e-bb8adfb9adca`: Pika Flex Ref2V, один set reference, без character RefMod, 124 кадра / 5.167 s / 1024×576. Он использует отдельную immutable custom graph revision, взятую из активного Ref2V профиля; сам профиль и глобальный model default не менялись. Job и attempt — `succeeded`; manifest SHA-256 `547778f012062f5d7eb7a465c6a3805d08aa3fc0076cb480fc20b87ce10ea7f3`, raw video AssetVersion `ad01574c-082b-4779-b683-cb9c36a91093`, SHA-256 `327c34b984997bb53180a491e69966633cbd6cddba0cdea946614462753d55ae`.
- Контроль кадров на `0.35 / 2.50 / 4.80 s` показывает увеличение/параллакс башни и один blue energy sweep с отражённым streak по полу. Shot остаётся motion preview, не master: последний sweep яркий и требует оценки в общей последовательности; отдельно добавлять строб/глитч/тряску не нужно.
- Сделан two-bar beat preview с master audio `AI-Everywhere-city-birth-2bar-provisional-sync-v1.mp4`: 82 кадра, 24 fps, 1024×576, 3.416667 s, исходный H3 motion retimed примерно в 1.512×; audio берётся из master с `17.143 s`, генерированный звук исключён. Preview AssetVersion `fcdc05eb-3586-4ce5-8ae3-a4848d034e0e`, SHA-256 `fba29e3d7272a055455be3f534bcb5f9f6a61d4b4a1d8e9753c8d8eff224cd64`; его EDL JSON AssetVersion `8dc77d5f-c7bc-4adf-9a43-4c83b8a529dc`, SHA-256 `6a59cad3a9774566182febb149da52f78792ac409025b0260281847e16f432c5`. Оба добавлены в project Media Pool; keyframe и raw H3 clip тоже связаны с проектом.
- Дополнительно собрана первая аудио-видеопроверка перехода `wet street → macro chrome → contact sheet`: 205 кадров / 8.541667 s / 24 fps / 1024×576, hard cuts на границах 82+41 кадров, один непрерывный срез master audio с `22.285714 s`. AssetVersion `e1c96682-34c4-439b-882b-93c8f2efe29c`, SHA-256 `2db6e2abf6e02143460f80aa2eac7307a00439bfdb3861cdfe2a8c0e14870e26`; linked в Media Pool как `deliverable`.
- В качестве связующего shot проверен существующий digital-world forward-track AssetVersion `87c413b9-af80-4759-97ea-014c096f90b0`: 3.416667 s / 82 frames / 1024×576; три контрольных кадра показывают проход камеры с изменением параллакса. Из keyframe, этого движения, wet-street car, macro chrome и contact-sheet собран последовательный 9-тактовый rough cut `AI-Everywhere-verse1-9bar-rough-cut-provisional-sync-v1.mp4`: 370 кадров / 15.416667 s / 24 fps / 1024×576. Порядок длительностей — 82+82+82+41+83 кадров; последний контакт-лист удержан на 1 дополнительный кадр. Audio — непрерывный master slice с `17.143 s`, все cut points сохранены hard.
- 9-тактовый preview AssetVersion `bcbbb7f7-0cd0-420a-bec4-7e316c7a1042`, SHA-256 `ace2c2bd0b733deb8febb49b889372ec4d31e63aa62a87125f809469f6f5243a`; EDL AssetVersion `19284d42-34b2-447e-8ed3-0648982db2cb`, SHA-256 `6725e88ce4bdf77556ec4ad30052eb401c298f37657e4a90712900b1da72aac3`. Оба добавлены в project Media Pool как `deliverable`, EDL содержит shot IDs, frame ranges, исходные AssetVersion IDs, retime и provisional audio offset.
- Монтажная привязка пока provisional: длительность файла и локальная onset-autocorrelation дают рабочую область около 140 BPM (период ~0.427–0.428 s); текущие in-points выбраны с ~0.10 s предударным lead. Vocal/downbeat phase не подтверждена прослушиванием/forced alignment, поэтому ни один preview нельзя называть финально синхронизированным. Обе последовательности — варианты для дальнейшей сборки, не утверждённый master.
- Следующий шаг: покадрово и на нормальной скорости просмотреть 9-тактовый cut, особенно стык skyline → abstract forward-track и яркий blue sweep в финале первого shot; затем сопоставить границы с прослушанными lyric phrases и поправить in-points. После проверки продолжить следующие отдельные шоты Verse 1, H3 generated audio отбрасывать, единственный master track сохранять непрерывным. Общий 2:45 клип ещё далеко не собран: текущий rough cut покрывает только 15.4 s.

### AIMixer recovery importer: актуальное состояние и endpoint default (2026-11-15)
- Повторный dry-run `npm run import:aimixer-references` по фактическому plugin timeline v5 нашёл `0/7` refs; все семь `GET /view?type=input` вернули `404`. Имена также не найдены в локальных ComfyUI input/output/temp каталогах и в QwenDirector CAS по логическим именам. Ни один blob/job/shot не импортирован и не создан.
- API `/health` отвечает `ok`, `/v1/nodes` показывает единственный worker online. Значит, текущий blocker — именно исходные media refs, а не API/worker.
- Найдена конфигурационная ошибка recovery CLI: `scripts/import_aimixer_references.mjs` по умолчанию использовал API `127.0.0.1:8080`, тогда как контракт/локальная установка используют `4310`. Исправлено чтение `QWEN_API_URL` → `QWEN_API_BASE_URL` → loopback `4310`; договор описан в `docs/workflow-adapter-contract.md`. Нужен `node --check`/`git diff --check`; live commit не запускать, пока refs не разрешены и `QWEN_IMPORT_ACTOR` не задан явно.
- Безопасный следующий путь: восстановить именно исходные семь файлов либо явным mapping предоставить точные новые AssetVersion refs с сохранением оригинальных segment IDs/prompts; не подставлять сходные/сгенерированные картинки. Затем выполнить dry-run, импорт всех refs, mapping в CAS и idempotent AIMixer shot import; profile snapshot и GPU job остаются отдельным approval шагом.

### AI Everywhere: сценарий клипа и screenwriting skills (2026-11-15)
- Создан [music-video-ai-everywhere-script.md](music-video-ai-everywhere-script.md): сценарная дуга, паспорт персонажа/трёх пространств, непрерывность реквизита и света, расчётный таймлайн на 96 тактов, 50 шот-ID (`AE-001`–`AE-050`), монтажная грамматика и покадровые quality gates. Исходные lyrics не переписаны; действия/образы явно помечены как режиссёрские предложения.
- Сценарий `AI-Everywhere-detailed-director-script-v0.1.md` импортирован в CAS. После исправления одной неточной цитаты лирики актуальная immutable revision — AssetVersion `81045ff7-291b-49ac-8348-168973731010`, SHA-256 `1a4ad03edcaac954f04f2655c1f01129c81475d3aa8ad8d8b9a0d27ff8d91fbd`, lineage от master audio и двух фотографий пространства; revision привязана к project Media Pool как deliverable. Предыдущая версия сохранена в CAS.
- После добавления VFX-раздела локальный сценарий обновлён до v0.2 и повторно синхронизирован в CAS/AI Everywhere Media Pool: AssetVersion `723f654c-137f-4f42-8afa-851e7b7f08de`, SHA-256 `a110e851a00ec8dcb57fa26d91d83da3d4bd97d87fa0c3031d99739efd536158`, 62,153 bytes, role `deliverable`, lineage на revision-2, исходный master и обе фотографии пользователя. Промежуточная загрузка имела display name v0.2 при внутреннем заголовке 0.1; immutable asset не удалялся, его ссылка переименована в `v0.1-pre-vfx-label`, текущим считать только AssetVersion `723f654c-137f-4f42-8afa-851e7b7f08de`.
- Таймлайн исходит из ранее измеренных `164.520 s` и рабочей оценки около 140 BPM: 96 тактов дают `164.571 s`, расхождение ~`51 ms`; точные vocal/downbeat times ещё не прослушаны и в сценарии отмечены как provisional, не выдаются за точный forced alignment. Целевой мастер — 2:45 с `0.480 s` финальным hold.
- По просьбе пользователя исследованы публичные сценарные skills. Для применимой методики выбраны `structure-screenplay`, `shape-story-blueprint` и `plan-camera-shots` из `zhangzhangco/film-production-skills`; они структурируют исходник, сохраняют источник/неопределённость, создают continuity, состояния start→action→end и исполнимую камеру. Вместе с локальными `music-video-subtitle-generator` и `h3-prompt-writing` использованы как инструкции; ничего не устанавливалось.
- Сравнил найденные сценарные skills: [Screenwriter & Dramaturg](https://github.com/gaojesse999/ai-scripts/tree/main/skills/screenwriter-skill) заточен под полнометражный/серийный сценарий и имеет нерелевантное для нас поведение по умолчанию; [Produce AI Video](https://github.com/62656456/ai-film-skills/tree/main/skills/produce-ai-video) ближе к задаче, потому что проводит от анализа сценария через режиссёрский пакет и сегментацию до генерации, монтажа и просмотра готового видео. Используем оттуда применимые принципы, не устанавливая и не копируя чужой skill целиком; текущий music-video skill предупреждает, что его Hub execution-инструкции требуют MiniMax Hub, поэтому здесь переносим только production-правила.
- По новой режиссёрской установке добавлен раздел «VFX-партитура» в сценарий: эффекты привязаны к смыслу песни/музыкальным событиям, строятся по принципу «из темноты свет», сохраняют геометрию и физические anchors; точный текст/UI/графика идут отдельным композитным слоем, сложный speed ramp — в NLE. Прописаны конкретные VFX-задачи для AE-003–004, AE-013, AE-019–020, AE-023–025, AE-028, AE-031–032, AE-035–038 и AE-043–044, плюс критерии проверки трекинга, масок, бликов и стыков. Это новый постановочный контракт, а не заявление о готовом VFX.
- Повторно просмотрен установленный каталог workflow. `MiniMax+H3+Director.json` найден в ComfyUI, но это UI-format 15-node graph для отдельного фантазийного тестового storyboard, не AI Everywhere; все его 7 image refs отсутствуют (`/view` 404 в предыдущем recovery audit), поэтому его нельзя назначать профилем проекта или импортировать как актуальный shot plan. Реальные Actor/Scene/Prop/Layout графы ожидаемых имён под `/mnt/AI_FAST/comfyui/user/default/workflows`, Downloads и `workflows/` не найдены.
- Обновлена сверка Director Studio по публичному README, текущий upstream HEAD `b8d5a73abbc199594d06206a4db57a66a216ab8e` от 2026-11-14; GitHub License API вернул 404, поэтому code/workflow reuse не предполагается. Текущий Layout workflow upstream — `qwen_image_21_layout.api.json`, а `ref_frame_layout.api.json` обозначен отдельно как legacy pipeline. В `WORKBENCH_WORKFLOW_SPECS.layout.fileName` исправлено имя на актуальный candidate. Графов на локальном диске нет, required-class gate пока остался базовым/недостаточным; следующий шаг — собственная class/output contract validation после получения реального графа.
- Read-only вызов QD `POST /v1/workflows/convert` на сохранённом UI graph обнаружил узкую границу импорта: ComfyUI `widgets_values_named` содержит строки вместо Boolean в двух `MiniMaxH3Director` полях, тогда как одноимённые positional widget values имеют Boolean и совпадают с runtime schema. Добавлен type-safe fallback на positional value только при несовместимом named primitive и валидном positional primitive; принудительных преобразований нет. Правило добавлено в `docs/workflow-adapter-contract.md`. API перезапущен в отдельной tmux-сессии с project `.env`; `/health` ok, worker online, layout catalog отдаёт `qwen_image_21_layout.api.json`, ожидающий job `15d61d48-6cf6-434f-aeef-8ccbabe26a74` сохранился в `awaiting_approval`. После перезапуска read-only convert для этого локального 15-node UI demo вернул HTTP 200, сократил граф до 9 исполняемых узлов и 8 классов; профиль, shot и GPU job не создавались. Это подтверждает UI→API conversion, но не готовность demo timeline: семь references отсутствуют и содержание не относится к AI Everywhere.
- Runtime на момент проверки: ComfyUI `0.45.0` на RTX 5090 с ~17.46 GB свободной VRAM; queue пуста. В durable jobs 61 запись: 53 succeeded, 5 cancelled, 2 failed, 1 awaiting_approval. Не трогать pending approval. Следующий продуктовый шаг — получать/создавать собственные Actor/Scene/Prop/Layout graphs и пройти schema → profile → approved durable job → CAS для каждого.
- Изучение `ComfyWorkbenchExecutor.collect` показало, что выходам (`master`, `angles`, `layout`) назначаются slots по позиции файла в собранном массиве. Это не доказывает смысл multi-output результата. Ограничение добавлено в workflow contract: для multi-output profile нужен стабильный mapping output-node ID → slot и проверка полноты/уникальности до принятия результата.
- Shot planner (`apps/api/src/local-planner.ts`) дополнительно учит согласовывать детализацию с крупностью: выделять один hero subject, выносить мелкие лица/руки/фактуры в читаемые планы и сохранять фактуру теней. `npm run typecheck` и `git diff --check` прошли.
- Для shot `Storm in a folder и отбор версии среди многих` три Qwen Image 2.1 jobs завершились: `c357065b-9474-4296-aa2d-72d2385372e5` seed `920301`, `89718fef-37a7-4ac4-94f7-a2c0bd95c22d` seed `920302`, `be3897c1-d8b5-4aae-980c-0777a42ad195` seed `920303`; все `1376×768`, 25 steps, одинаковый prompt/profile. На полном кадре просмотрены все варианты: все три образно читаются как стопка glass plates/выбор одного города; `920301` сейчас выглядит наиболее сбалансированным, но это мой candidate, не пользовательское утверждение.
- Триптих-сравнение AssetVersion `89e7146e-aaf3-4324-a412-30bd36ce3740` (SHA-256 `f1b22a3951d8b2f21c7cd2ef8bd50f9d51268cfd9c82be89e2536283b96fca99`) добавлен в CAS и AI Everywhere Media Pool с lineage от трёх seed assets. Следующий правильный шаг: сверить вокальные границы и downbeat master-трека, уточнить таймлайн 96 тактов, затем перевести сценарный draft в QD timeline shots с точными длительностями/continuity; только после этого запускать следующий массовый batch. Не собирать финальный ролик из preview и не принимать `920301` без пользовательского просмотра.

### Локальный shot planner: качество детализации (2026-11-15)
- Системная инструкция локального planner в `apps/api/src/local-planner.ts` теперь учитывает детализацию как первое ограничение режиссуры: выделять читаемый hero subject и несколько значимых деталей, согласовывать фактуру с крупностью, выносить лица/руки/интерфейсы/тонкие узоры в планы, способные их разрешить, и не перегружать общие планы.
- Зафиксировано, что low-key свет должен сохранять фактуру в тенях и мотивированные блики; темнота направляет взгляд, но не маскирует дефекты. Planner должен указывать identity/geometry invariants только на основе имеющихся references.
- Planner теперь также получает VFX-политику: эффекты только по брифу/лирике/драматургическому акценту, с визуальным anchor и границами действия; точные надписи/UI/masks идут в tracked comp, атмосферный генеративный эффект допустим при устойчивой геометрии; не складывать glitch/shake/strobe/particles/morph в один акцент. Кодовая инструкция не меняет форму API ответа и не запускает GPU.
- Planner сохраняет lyrics дословно, начинает с intended audience perception и видимого изменения кадра, требует entry/action/exit state, отделяет shot от сегмента с монтажными cut и помечает beat sync как provisional без точных аудиометок.
- Это улучшает подготовку shot prompt, но не подменяет просмотр генерации и ручную приёмку результата; модельный workflow, шаги и профиль ComfyUI не менялись. Архитектура/контракты не менялись.
- Следом продолжить AI Everywhere: сделать монтажную сверку car → macro chrome → contact sheet на визуальном стыке и собрать следующий детальный шот только после выбора функции/музыкального окна; не принимать статичный контакт-лист за готовый клип и не объявлять beat sync без точных меток аудио.

### AI Everywhere: Qwen image-generate и H3 prompt injection (2026-11-15)
- В `PgJobRepository.createDirector` обнаружен и устранён дефект маршрутизации: non-H3 `image-generate` ошибочно получал H3 Ref2VA schema. Только `image-edit` использует Qwen edit compiler; остальные workbench-типы получают обычный director prompt. Проверено на durable `plan_json`: обычный английский Qwen Image prompt, без `subject_definitions`/`retention_analysis`.
- В `injectH3Inputs` найден второй существенный дефект: для H3 Ref2VA/FL2VA текст мог оставаться в статическом linked `PrimitiveStringMultiline`, несмотря на корректный prompt в durable job. Worker теперь обновляет string prompt node, сохраняя линк; неизвестный тип binding завершает job понятной ошибкой вместо тихого игнорирования. Для фактического изменения пройдены `npm run typecheck` и `git diff --check`.
- API был перезапущен без `.env`, из-за чего runtime терял PostgreSQL соединение; повторно запущен с project `.env`, durable job state проверен. Worker также перезапущен с project `.env`; API `/v1/nodes` подтвердил online worker. Секреты из `.env` не переносить в вывод/документы.
- Qwen image-generate job `3b05fe44-5dac-4c52-9a44-415f230932db` завершён: keyframe цифрового мира AssetVersion `e68f5971-98ff-4091-9bb8-754192ee5956`, 1376×768, 25 steps. H3 preview job `fd0df48d-4454-4e7b-be7e-ea05c87a63f4` завершён: AssetVersion `ee118327-cc2c-4a72-8267-8b10f2cbb9c7`, 1024×576, 124 frames/24fps, pruned INT8 + Pika Flex Ref2VA, один world reference. Контактный лист показывает мало camera parallax, преимущественно light pulsing; дубль оставлен как preview, motion take не принят.
- Усиленный H3 motion test job `5bc6c838-edc8-4055-bcd0-55b80223cabc` завершён: AssetVersion `46ed11f3-5e16-45ae-a6ce-647f464c560d`, 1024×576, 124 frames/24fps. Spot-check кадров 0, 60 и 123 подтверждает читаемый foreground parallax: ближняя башня перемещается/увеличивается относительно horizon, линии отражённой сетки проходят через нижний кадр; грубого морфинга в этих точках не заметил, полного покадрового QC не было. В timeline shot переименован в `Внутри цифрового мира — forward tracking v2`.
- Из v2 собран silent 82-frame (`3.4167 s`) candidate по условной 140-BPM сетке; AssetVersion `87c413b9-af80-4759-97ea-014c096f90b0`, импортирован в CAS с lineage от H3-видео и привязан к проекту как deliverable. Downbeat/vocal sync всё ещё гипотеза; master audio не вшит.
- Для Verse 1 выполнена detail insert через Qwen Image 2.1: job `3db70b7e-1ee6-469b-b391-94d941b347fa`, AssetVersion `4f9f1978-8fe9-4660-b272-d1e182d393f6`, `1376×768`, 25 steps; shot `29475e99-5c53-4a4c-8c5d-fb3f27848f99` переименован в `Перебивка — макро мокрого хрома и синей сетки`, запланирован на ~1.714 s. H3 motion preview `c973e905-38e8-4f1d-be06-e5cdff7e84b8` завершён, AssetVersion `e223ab24-2faa-4e17-a995-e84a6eb72350`, `1024×576`, 124 frames / 24 fps; выборочные кадры показывают скольжение отражённой сетки и сохранённый hero-droplet без грубой деформации. 6-step результат остаётся preview, не final-detail master.
- One-bar silent retime macro вставки `AI-Everywhere-macro-chrome-onebar-v1.mp4`: AssetVersion `48623724-84d5-46e9-94ee-2c7bfb0bbdd3`, 41 кадр / `1.7083 s` (~3× из 5.167 s); добавлен в project Media Pool как deliverable, lineage ведёт к H3 preview. Его musical point пока не выбран по реальной песне.
- `docs/music-video-ai-everywhere.md` расширен световой дугой «из темноты свет», перебивками по Соколову, отдельными деталями/крупностями и приёмочными критериями качества. H3 6-step 0.6MP-уровня здесь рассматривается только как превиз; финальное качество ещё надо получить/оценить на фактическом видеодубле и отдельно проверить детали, геометрию и читаемость движения.
- Следующий шаг: подготовить shot «Машины движутся по ритму drum machine» или низкий wet-street wide и связать его с macro insert через экранный вектор и color/form bridge; проверить второй край cut по Соколову (крупность, ось, направление, темп). Затем сделать полную покадровую QC macro-видео и, после подбора первых шотов, вручную разметить музыкальную точку на master. H3 6-step / 0.6MP остаётся previz; для финального качества нужны принятые фактические motion renders, не proxy.

### AI Everywhere: подтверждение первого push-in и следующий cut (2026-11-15)
- Пользователь принял workstation still как «более-менее уже»; не возвращаться к повторной генерации этого же ключевого кадра без конкретной причины. Результаты предыдущего прохода и asset IDs зафиксированы ниже.
- Проверены живые runtime и проектный timeline: ComfyUI `/system_stats` + `/object_info` отвечает, API на `127.0.0.1:4310` отвечает; проект `a654d533-63f0-463d-bbec-aab87b231d06` содержит выбранный opening shot и следующие draft shots. Master `~/AI-Everywhere.mp3` — 164.520 s, stereo/48 kHz; локальный PCM-анализ обнаружил первый заметный сигнал примерно на 0.20 s после почти тихого старта. Это не word-level разметка.
- Длина уже созданного 2-тактового монтажного candidate 3.4167 s отличается от двух тактов сетки 140 BPM (3.429 s) примерно на 12.4 ms. Downbeat и совпадение края с вокалом ещё не подтверждены прослушиванием или локальным forced alignment; не объявлять этот candidate финально синхронизированным.
- Производственное решение следующего кадра записано в `docs/music-video-ai-everywhere.md`: после push-in до стекла — отдельный hard cut внутрь самостоятельного абстрактного цифрового 3D-мира. Не морфировать физический монитор/стол/комнату в город. Дальше подготовить короткий самостоятельный H3-шот и смонтировать поверх master audio только после привязки к музыкальному акценту.
- ASR/forced-alignment пакетов и модели локально не обнаружено; сетевые транскрипции не использовались. `llama.cpp` не запускать, пока пользователь явно не поменяет прежнее решение. Никакая GPU-генерация в этой сессии не запускалась.
- Следующий шаг: на workstation выполнить прослушивание начала master и разметить первые вокальные фразы/удары; при недоступности ручной проверки оставить отметки как интервальные гипотезы. Затем выбрать из существующего `01 — Intro` shot `Пустой экран превращается в целый skyline` либо создать отдельный digital-world shot, собрать один самостоятельный короткий H3 preview, проверить его кадры и только затем менять длительность/позицию в rough cut.

### AI Everywhere: Qwen keyframe compiler и первый FL2VA наезд (2026-11-15)
- Пользователь загрузил реальную комнату `~/photo-room.jpeg`; импортирована в CAS и связана с AI Everywhere project как scene reference, AssetVersion `cbcaa418-d57f-4946-b1dd-355c9da45a8f`, SHA-256 `080f60a00b99e9163564842c8c88aa11b7d8e8eaf6425fc468d6894321f01ea9`.
- Исправлен конфликт в `compileQwenImageEditPrompt`: предыдущая общая инструкция запрещала переносить layout/композицию с каждого последующего image ref и безусловно фиксировала исходные camera/light. Теперь prompt назначает роли `actor`/`set`/`prop`/`layout`, разрешает явно запрошенную раскладку и сохраняет только те инварианты, которые режиссёр не переопределил. `npm run typecheck` прошёл.
- После проверки четырёх постановочных вариантов выбранный пользователем workstation still — job `f255fc0a-7bb2-42e0-aebf-b4ae3273d01f`, AssetVersion `f3c53ea0-5624-490c-b3d9-7d65fb620b2d`, `1184×896`. Основной компоновочный источник — `photo-monitors.jpeg`; photo-room вторичный. Кадр содержит пару дисплеев, клавиатуру, мышь, наушники и объекты стола; он принят пользователем как «более-менее уже» и выбран в shot как рабочий source. Он не передал весь фон/ракурс комнаты и потому рассматривается как workstation close shot.
- Из выбранного изображения детерминированно сделаны First Frame `cc325b2a-e9d9-4ebc-b2e3-f91dd6efbefc` и close Last Frame `f44c26ae-cd3f-429a-9b3b-f6c4bec9fec3`, оба `1344×768`, CAS lineage от выбранного still. Active H3 profile `ai-everywhere-h3-fl2va-pdd8-first-last` прошёл live preflight; это отдельный 8-step FL2VA preview, он не заменяет Ref2VA + INT8 + Pika Flex текущего quality candidate.
- Job `ff0181b2-bc75-46c0-a370-5afbfa6acd61` завершился до Comfy submit с `H3_WORKFLOW_REQUIRES_ONE_H3_NODE:0`: job snapshot был корректен, но долгоживущий worker был запущен до актуальной FL2VA поддержки. После штатного перезапуска worker создан новый job `451404d4-c422-4e34-b2bd-2a6a1ab2e15d`; он succeeded. MP4 AssetVersion `af76de0d-8fe6-4951-b93d-898d638d7a69`, H.264/AAC, 1344×768, 24 fps, 5.167 s. Проверены кадры 0.1/2.5/5.0 s: camera push читается, экраны остаются физически закреплёнными, composition сходится к широкому монитору без пересечения стекла; H3 AAC не включать в финальный микс.
- Собран отдельный silent 140-BPM two-bar edit candidate: 82 кадра, 1344×768, 24 fps, 3.4167 s, AssetVersion `99e526a8-18a2-492d-b77d-3102dbc27e60`, derivative от H3 MP4. Это монтажная гипотеза до точной сверки downbeat/vocal timestamps, не выбранный финальный дубль.
- Локальные сервисы оставлены работающими и закреплены в tmux: ComfyUI session `comfyui`, QwenDirector API `qd-api`, актуальный worker `qd-worker`. Не запускать повторный FL2VA job без причины: сначала дать пользователю оценить motion candidate; затем продолжить beat/vocal mapping intro и собирать следующий короткий контрастный shot.

### AI Everywhere: переносимые правила production skills (2026-11-15)
- Изучены официальные MiniMax H3 skills: [Brand Promo](https://github.com/MiniMax-AI/MiniMax-H3/blob/main/skills/brand-promo-video-generator/SKILL.md), [Music Video Subtitle Generator](https://github.com/MiniMax-AI/MiniMax-H3/blob/main/skills/music-video-subtitle-generator/SKILL.md), [Handdrawn Live-Video Generator](https://github.com/MiniMax-AI/MiniMax-H3/blob/main/skills/handdrawn-live-video-generator/SKILL.md). Все три описаны авторами как требующие MiniMax Hub; в локальном QwenDirector применяем переносимые production-принципы без Hub routing или внешней генерации.
- Для AI Everywhere зафиксированы: мастер-трек как единая финальная дорожка; исходные lyrics без переписывания; точная lyric typography отдельным монтажным слоем; визуальные шоты по реальным beat/vocal таймкодам; единый монтаж отдельных клипов вместо длинной цепочки latent Extend; происхождение assets и continuity review. Handdrawn live-action fusion оставлен опциональным локальным акцентом бриджа, не стилем всего MV.
- Спектральная autocorrelation по восьми 20-секундным окнам даёт стабильный темп около 140 BPM. 96 тактов 4/4 при 140 BPM занимают 164.57 s против MP3 164.52 s; сетка сильная рабочая гипотеза. Точный downbeat и вокальные границы ещё требуют сверки на слух. В концепте базовая длительность монтажа теперь 1–2 такта (1.71–3.43 s), с более частыми cut в припеве и намеренно разреженным бриджем.
- Концепт обновлён в `docs/music-video-ai-everywhere.md`. Реализован durable H3 FL2VA boundary: режим `fl2va-i2v`, проверка прямых разных `LoadImage` links к First/Last Frame, immutable ordered bindings, worker-side role mapping, длина `17k+5`, alignment prompt, schema preflight и H3 output collection. UI workflow wizard распознаёт и импортирует граф; Media Pool позволяет назначить роли кадров. Migration `023_fl2va_frame_roles.sql` применена в lab DB; текущее live-исполнение описано в верхнем актуальном разделе этой заметки.
- `npm run typecheck` прошёл на этом этапе. Последующая live-проверка profile, Comfy schema, GPU generation и CAS lineage завершена и описана выше. Остаются просмотр motion candidate и точная привязка монтажа к downbeat/vocal timestamps.

### AI Everywhere: двухкадровый наезд на монитор (2026-11-15)
- Пользователь поправил направление: требуется движение камеры вперёд к неподвижному монитору, а не движение/рост самого монитора. Ref2VA текстом для этого недостаточно надёжен; следующий видеопроход должен использовать согласованные First/Last Frames (FL2VA) и простой прямой dolly.
- Получен `~/photo-monitors.jpeg`: AssetVersion `52c8b3ce-b7b7-4eef-b3c8-b04b8655fcab`, точная пара дисплеев на столе — широкий центральный + вертикальный слева. Референс комнаты `d5d16a6a-a1a9-4cac-80a0-e2fd3369e506` сам содержит свои экраны; когда H3 видел обе фотографии сразу, он складывал источники и добавлял лишний экран.
- Video Ref2VA take `7a150949-2c7d-4bb2-b161-e57be90d6898` (job `1ed0ec49-2f0f-4381-aa24-0458eb337938`) показал, что prompt-only exclusions не устраняют экраны из room ref. Qwen Image Edit pass дал чистый room still `a3626ad6-7c05-4efb-a239-1b8684f96bae` (job `2cd18da8-f618-4739-8d3c-c097d3bc5b58`), 960×544; он убрал крупный чёрный foreground display, но пару мониторов всё ещё надо проверить/доработать до использования как FL2VA endpoint.
- Активирован workflow profile `ai-everywhere-h3-pika-refmod-room-preview`, revision 3, hash `2c9d8848bbad8364a4b81cb0317b954af8de5cd0b18b86e263138fb1b469d472`; он добавляет `photo-monitors.jpeg` как четвёртый Ref2VA input. Отдельно сохранён и активирован Qwen Image Edit workbench `ai-everywhere-room-keyframe-edit`, где sampler переведён на reference latent (switch=false), 25 steps и два source images; этот workflow следует использовать для подготовки пары согласованных кадров.
- Следующий конкретный шаг: после live preflight подготовить/утвердить opening frame с парой экранов и close endpoint как согласованный перспективный кадр вокруг центрального монитора; создать FL2VA candidate с правильным FL2VA stack. Обычный 124-frame preview job должен получить два изображения с явными frame roles, прямой camera dolly prompt и ручное approval. Не использовать Ref2VA portal transform для этого движения. После стабильного landing point цифровой мир пускать отдельным shot/cut.
- Preview остаются невыбранными; мастер-песня отдельна. После Comfy `/free` queue пуста и GPU usage вернулась к 834 MiB.

### RefMod и первый H3 preview-shot (2026-11-15)
- Исправлена причина landscape-выходов: прежние jobs `044debde-dcb3-4e64-9967-8c606db2f7d7` и `76c9fc49-0d18-44b5-904e-6d52c93a2b08` заменяли LoadImage на исходный 1536×1088 asset; выбранная высота latent не меняла размер reference latent. Эти широкие результаты не включать в RefMod. Вертикальные jobs использовали anchor `2a23962c-58c0-4c61-93e9-d331543864f1` и выдали 768×1152.
- Актуальные изображения RefMod: face close-up `54a628b8-2dcd-4d4d-9d01-c0025b067092`; vertical headless front `5a30a255-bb9a-443e-b11e-cc1bd712c71a`; vertical headless left profile `7f80d8e1-491d-4ae5-94e9-934cb06ddc13`; vertical rear view `f53e715e-39d0-47bf-a198-a8a5f2eea383` (с головой, пользователь согласился временно оставить). Шумный headless rear v3 `80c80f2a-6c33-40e5-90f1-25b6f7e8fee6` исключён из набора. Отдельная неутверждённая заявка `15d61d48-6cf6-434f-aeef-8ccbabe26a74` осталась awaiting_approval; не запускать.
- В локальной ComfyUI собран RefMod `QwenDirector/AI-Everywhere/ai_everywhere_hero.safetensors`, 697,584 bytes. Порядок файлов: `00_face_identity_anchor.png`, `01_front_headless.png`, `02_left_profile_headless.png`, `03_back_fullbody.png`. RefMod asset в QwenDirector `973e1f6f-3b05-499e-bb21-c2db2e2ab799`, SHA-256 `0fd53b6a99c159011265a9f02e6e1c00b2d77e8d284f7c61a7c0c47a6947aba9`, project role `reference`, lineage на четыре входа. Сборка была запущена локальным `H3RefModCreateFromFolder`, затем sidecar импортирован в CAS; это не durable `refmod-create` job. Текущий API процесс не знает новый workbench kind (POST profile ответил `UNKNOWN_WORKBENCH:refmod-create`), поэтому не считать новый collector runtime-верифицированным.
- Создан workflow [`h3_pika_refmod_ai_everywhere_preview.api.json`](../workflows/h3_pika_refmod_ai_everywhere_preview.api.json) и active profile `ai-everywhere-h3-pika-refmod-preview`, revision 1, hash `34bcb9337ea5edf462eb36863a7d46d75ea3a157917003e85a87ab805d64a97c`. Модель `minimax_h3_ref2va_pruned_int8_convrot.safetensors` + `pika_h3_flex_ref2va_v1_bf16.safetensors`; RefMod loader/apply и bindings на face/front refs включены. Live preflight прошёл, profile revision активирована.
- Через QwenDirector создан и одобрен preview shot в Intro: job `3d5b0dcc-27c2-4462-adc4-0c6b97f3950d`, shot `b8302556-18fe-4e02-a0be-6a8f5c71b109`, 124 frames, 960×544, 24 fps. Статус succeeded. Asset `e6f0e8a5-f224-4796-97c3-dacdf662daea`, MP4 H.264/AAC, 956,782 bytes, 5.167 s. Контрольные кадры: лицо и худи устойчивы, дождливая домашняя студия читается, skyline раскрывается внутри монитора; видимой порчи фона/кистей на контрольных кадрах нет. Master song не зашит; он остаётся отдельной монтажной дорожкой. Это preview, не выбранный final take.
- Пользователь считает общий кадр приемлемым, но хочет более интересное и соответствующее его комнате окружение; он пришлёт фото комнаты. Подготовлена неактивная основа [`h3_pika_refmod_ai_everywhere_room_preview_candidate.api.json`](../workflows/h3_pika_refmod_ai_everywhere_room_preview_candidate.api.json) с третьим `Picture` binding. После получения комнаты обновить её как environment anchor; увеличить монитор в композиции и показать процесс «пустой canvas → wireframe grid → вырастающий skyline → готовый город» внутри экрана. Не генерировать новый take до добавления пользовательского room reference.
- После рендера Comfy queue пустая; `/free` с `unload_models=true, free_memory=true` вернул RTX 5090 к 834 MiB used. llama.cpp не запускался.
- Следующий рабочий блок: разметить Intro/Verse 1 по реальному аудио, выбрать очередные 5–8s шоты, использовать active Pika+RefMod profile; сохранить master mp3 отдельно и собирать черновой NLE montage только после таймкодинга. Не запускать длинные серии Extend.

### Диагностика артефактов Qwen Image edit (2026-11-15)
- Уточнение по первичной гипотезе: согласование latent/reference было полезной коррекцией, но не устранило фон. Исходный asset `11741902-f1c9-4886-8eb9-080ee2a4e3fc` визуально чистый. Aligned 1536×1088, 25-step результат (`e32eae19-0506-4b6d-9504-38c2bfac52bf`, asset `4a18177b-959b-42bd-b850-290daf782895`) сохранил выраженную фиолетовую рябь на фоне. При 40 шагах с тем же aligned graph/размером/seed (`687e5539-f24d-4863-a941-d64a0c414a0a`, asset `1e589d62-6bad-4eee-b8d3-1f1942c864dd`) лицо и одежда стали чище, но фон существенно не изменился. Исполнения прошли без OOM.
- Вертикальный опыт: исходник детерминированно обрезан по центру до 725×1088 и уменьшен/подогнан до 768×1152; производный reference asset `2a23962c-58c0-4c61-93e9-d331543864f1` имеет SHA-256 `b3c757e4a9551b5423ef3bc84dd89a362769d4f0725c4f55d862f1fea9c700db` и lineage на исходный anchor. Candidate `ai-everywhere-qwen-image-edit-refmod-portrait-768x1152-40step`, revision 1, hash `63ccee0c90ec02b6e356983be0002a6ca909d277b1e3378d281bb03dccb56290`, прошёл live schema preflight, затем был активирован; предыдущие профили не менялись. Durable job `ba8126a7-e75c-4c2f-b6bf-e2a5ad37bb24` завершилась успешно, asset `eae44905-3ff6-4679-8f6e-152751a145c6`, 768×1152, SHA-256 `6448cdcac6dacd5aa60e8e1e4d08e0ad72ebf85fda0eec705e6aa90b14e4d630`. Визуально лицо/одежда и пропорции сохранены, фон ровный без прежней крупной цветной ряби. В опыте одновременно изменились aspect ratio и число пикселей (1536×1088 → 768×1152), поэтому причина улучшения пока не изолирована; для персонажного portrait reference такой формат сейчас предпочтителен.
- После портретной генерации ComfyUI удерживал около 25.9 GiB VRAM. Очередь проверена пустой, затем `POST /free` с `unload_models=true, free_memory=true`; через 5 секунд RTX 5090 показывала 828 MiB всего, из них 816 MiB у ComfyUI, 0% загрузки. Значит, штатная выгрузка сработала и практически освободила VRAM; память после рендера полезно очищать, но она не является причиной уже записанных артефактов. `llama.cpp` не запускать по просьбе пользователя.
- В логах `[INFO] Using RAM pressure cache` — информационный выбор режима кэша. `MMH3-UltimateUpscale Ignored ... .pth (only .safetensors is supported)` означает, что одноимённый H3 upscaler пропускает найденные pickle `.pth` веса и не может использовать их; это не сбой текущего Qwen Image edit графа и не источник артефактов. Не переименовывать `.pth` в `.safetensors`; эти веса требуют совместимого формата/официальной конвертации, если понадобится данный H3 upscaler.
- Защита `validateWorkbenchGraph(image-edit)` в текущей реализации требует активный latent route от `TextEncodeQwenImage21` output 2 и выдаёт `IMAGE_EDIT_SAMPLER_MUST_USE_REFERENCE_LATENT` при выборе `EmptyLatentImage`. Это проектная безопасная настройка для согласования reference сетки; официальная Qwen workflow допускает custom-size режим при близких размерах, поэтому перед расширением контракта на произвольные image-edit графы нужно проверить фактическую геометрию reference и sampler, а не объявлять любой empty latent безусловно неверным.
- ComfyUI v0.45 доступен локально на `0.0.0.0:8188`; API на `127.0.0.1:4310`, web на `0.0.0.0:5173`, worker online. `.env` остаётся локальным ignored конфигом с `COMFYUI_URL=http://127.0.0.1:8188`; не публиковать значения. Проверять GPU очередь и запускать ComfyUI image-edit можно без llama.cpp.
- Пользователь уточнил preferred character-sheet подход: сначала отдельный face close-up как identity anchor, затем вертикальные body views без головы для силуэта и одежды. Исторические кандидаты `f659fc8d-0391-45b5-8574-fe5aa2bcd206` (неестественная пустая горловина) и `3ce8d4b5-d6eb-4c5b-964b-07510b5d3e94` (старый кроп) не входят в созданный RefMod. Актуальные face/front/side/back asset IDs и RefMod перечислены в разделе «RefMod и первый H3 preview-shot» выше.
- Отдельная node `MiniMaxH3DirectorFaceRefine` в установленном AIMixer pack отслеживает и пересэмпливает лица уже в финальных видео-кадрах; она дополняет face identity reference, но не заменяет его. Источник: [AIMixer Director README](https://github.com/AIMixer/ComfyUI_MiniMaxH3_Director/blob/main/README_EN.md) и локальный `custom_nodes/ComfyUI_MiniMaxH3_Director/nodes/director_face_refine.py`.
- Исправление catalog: три последних direct API submit (`ba8126a7-e75c-4c2f-b6bf-e2a5ad37bb24`, `acb62d45-70f1-4d1f-8169-5936a8f01266`, `28161d3f-9480-434e-9e35-7b0113b12f90`, также back job `2253cc35-fa4e-4995-b51a-0d6fb81e63b3`) передали project/scene/shot names без существующих IDs, поэтому repository завёл duplicate project catalog entries. Все используемые asset references/output были отдельно связаны с настоящим project ID, но jobs остаются привязаны к дубликатам. Записи не удалять и provenance не переписывать; в новых jobs передавать `projectId=a654d533-63f0-463d-bbec-aab87b231d06`, pre-production `sceneId=7b7fe909-c4f7-4029-8ded-f46728127830`, и существующий shot ID, когда он подходит. Следующий software slice — сделать этот путь менее ошибочным/явно валидировать каталогные IDs.
- Осталось архитектурное ограничение durable RefMod creation: `H3RefModCreateFromFolder` пишет `.safetensors` побочным файлом в `models/refmods/` и не возвращает его как обычный image/video output. В этой сессии RefMod был собран локально и затем импортирован в CAS с SHA/lineage, но не через durable worker attempt. В коде начат `refmod-create` workbench/collector; активный API процесс пока старый и не принимает этот kind (`UNKNOWN_WORKBENCH`). Для следующей продуктовой доработки перезапустить API/worker на актуальном коде, завершить и проверить secure collector; уже собранный RefMod и активный H3 profile не пересоздавать. Live QD `/v1/runtime`: ComfyUI healthy, llama.cpp down (по просьбе не запускать), worker online.

### Черновой проект клипа AI Everywhere (2026-11-14)
- По пользовательскому тексту и `/home/la6/AI-Everywhere.mp3` создан QwenDirector project `AI Everywhere — music video` (`a654d533-63f0-463d-bbec-aab87b231d06`): 6 музыкальных секций, 24 черновых шота без выдуманных таймкодов и отдельная `PRE-PRODUCTION` сцена для RefMod assets. Master audio импортирован локально и закреплён за проектом как AssetVersion `4aeb59be-8b2a-4702-955b-b397a8b8f0e8`, `audio/mpeg`, 4,219,126 bytes, SHA-256 `5369d3fead4b4c335be16e90d1089f8bc085abe4cb328e1fb5b1a79e40bdc154`.
- MP3: 2:44.52, stereo 48 kHz; production target 2:45, последние 0.48 s — video hold/silence after master audio. Уточнённая спектральная autocorrelation даёт около 140 BPM (half-time около 70), с 96 тактами почти точно на длительность файла; downbeat, lyric-to-time alignment и секционные cuts всё ещё требуют прослушивания. 16:9 — пока допущение.
- Добавлена миграция `022_project_asset_links.sql`, API `POST /v1/projects/:projectId/assets`, project asset read model и включение связанных исходников в project export. Master audio закреплён за проектом с ролью `master_audio`; это каталогная связь, она не передаёт песню как reference в H3 jobs. `npm run db:migrate` применил миграцию 022 к локальной БД `127.0.0.1:54329/qwendirector`; API readback подтвердил soundtrack проекта.
- Для 24 draft shots заполнены отдельные English visual prompt fields; композиция, действие, свет и монтажный мост сформулированы без lyrics-in-image и без таймкодов. Промпты остаются черновыми и не были отправлены в генерацию.
- Пользователь выбрал нового анонимного героя для RefMod. Добавлен локальный text-to-image graph [`qwen_image_2.1_text_to_image.api.json`](../workflows/qwen_image_2.1_text_to_image.api.json) и `image-generate` workbench; он использует локальные INT8/VAE/CLIP, без `QwenImageTextToImageApi` или внешнего провайдера. Profile candidate сохранён inactive, runtime preflight прошёл на 9 классах ComfyUI.
- Job `3280154d-acef-41ed-a2ce-3ba9661d1ba0` (`seed=218274`, 1024², 25 steps) создан со снимком графа для full-body 3/4 reference героя. Состояние `awaiting_approval`; ComfyUI worker online и ждёт, GPU submit не было. Это подготовительный кадр, не часть 2:45 edit timeline. После ручного approval: проверить изображение, затем через `image_edit_QwenImage21` подготовить шесть ракурсов одинакового aspect ratio; после QC сформировать и каталогизировать RefMod.
- Уточнение пользователя: нужен новый герой, не `character_01`. Проверка установленного `H3RefModCreateFromFolder` подтвердила, что `.safetensors` пишется побочным файлом в `models/refmods/<subfolder>` и не попадает в обычный ComfyUI output collector. После сборки его надо отдельно импортировать в локальный `/v1/assets/import` с SHA-256 и lineage, затем привязать к проекту; имя может получить суффикс при совпадении.
- Qwen edit candidate `ai-everywhere-qwen-image-edit-refmod-views` импортирован из локального workflow, сохранён inactive и прошёл runtime preflight на 16 узлах. В import graph prompt encoder подключён через локальный `TextGenerate`, поэтому worker теперь подменяет prompt в активном TextGenerate, а не оставляет старый bedroom prompt; worker перезапущен и online.
- Исправлен hash workflow profile после PostgreSQL JSONB readback через canonical JSON digest; повторный read-back preflight image-generate profile прошёл. Проверки среза: `npm run typecheck`, `npm run build:web`, `npm run check:migrations`, `git diff --check`, runtime profile preflights (9 и 16 nodes) и API readback. GPU generation не запускалась.
- Создан [treatment](music-video-ai-everywhere.md): visual arc, палитра, типографика и маршрут pre-production → короткие H3 сегменты → монтаж поверх одного master track. В ComfyUI запущен штатный v0.45.0 на RTX 5090, `/object_info` доступен; единственный job клипа пока ждёт approval, queue submit не было. Strata и DSH ACP/MCP процессы остановлены; системный `dsh-superagent.service` остался running, потому что текущий пользователь не имеет прав на остановку unit. QwenDirector API работает на loopback; UI на LAN. Текущий сохранённый provisional H3 profile — INT8 pruned + Pika Flex candidate, `active=false`; автоматически не активировался.

### Подготовка image_edit_QwenImage21 к durable job (2026-11-14)
- Исследован установленный `/mnt/AI_FAST/comfyui/user/default/workflows/image_edit_QwenImage21.json`: это UI-граф с одним subgraph `Image Edit (Qwen Image 2.1)`, тремя внешними `LoadImage`, внутренним `TextEncodeQwenImage21` и внешним `SaveImageAdvanced`. Конвертер раньше отклонял все workflow с definitions, поэтому этот готовый локальный workflow нельзя было импортировать.
- Конвертер UI→API теперь разворачивает ComfyUI subgraphs через boundary input/output links, сохраняет root widget values и переименовывает внутренние node IDs с namespace; повреждённые boundary links дают ошибку вместо молчаливого повреждения графа. Поддержан вывод `SaveImageAdvanced` в сборщике результатов.
- Добавлен отдельный `image-edit` workbench contract/catalog profile с обязательными `LoadImage`, `TextEncodeQwenImage21`, `SaveImageAdvanced`; job planner и worker распознают этот kind, передают references в `LoadImage`, prompt — в Qwen encoder и job-scoped prefix — в saver. H3 Ref2V profile/model defaults не менялись.
- WorkflowWizard распознаёт Qwen Image API graph после импорта и отправляет его в workbench profile storage как неактивный candidate. Граф можно сразу использовать для создания image-edit job: kind выводится и валидируется на API, а job остаётся в стандартном `awaiting_approval`. Сохранение candidate само не активирует его.
- Проверка: `npm run typecheck`, `npm run build:web`, `git diff --check` прошли. ComfyUI сейчас остановлен, поэтому реальный convert против `/object_info`, runtime profile test и generation не проверялись. Следующий шаг — запустить ComfyUI/worker штатно, импортировать локальный JSON через UI, проверить `/object_info`, создать image-edit job с локальным AssetVersion и пройти ручное approval. GPU generation пока не запускалась.
- Во время live-проверки API оказался остановлен; восстановлен штатно через локальную `.env` конфигурацию, без вывода её значений. Сейчас `/health` API и Vite отвечают HTTP 200; API слушает loopback `127.0.0.1:4310`, UI — LAN `0.0.0.0:5173`. ComfyUI `8188` и worker остаются остановлены, Strata `8080` работает.

### Pen.dev и первый UX-срез (2026-11-14)
- Через DSH Agent подключён Pen MCP в macOS Pen.app. Новый отдельный документ сохранён как `/Users/la6/Documents/qwen-director.pen`; доска `/Users/la6/Documents/newpen.pen` (LA6) не менялась. В QwenDirector-документ добавлен экран первого проекта и live previews desktop/mobile для `http://192.168.1.149:5173/`.
- По живому preview исправлено размещение: PlannerAssist, AssetWorkbench и WorkflowWizard теперь доступны из отдельного offcanvas «Инструменты» и не участвуют в CSS grid основного экрана. Пустое состояние проекта стало центральным стартовым экраном с единственным CTA, шагами процесса и local-first примечанием; ошибка создания показывается рядом с формой.
- Исправлено вводящее в заблуждение состояние worker: UI считает executor доступным только при статусе `online` и heartbeat не старше 30 секунд (тот же порог использует `PgNodeRepository.markStale`). Через штатный локальный reconcile `markedStale=1`; `local-comfy-worker` теперь `stale`, heartbeat `2026-11-14T19:19:20Z`, интерфейс показывает `0 worker / 1 stale`. Для возврата worker потребуется его обычная регистрация.
- Проверены desktop preview, мобильная ширина 390 px без горизонтального переполнения, DOM-геометрия, `npm run typecheck`, `npm run build:web`, `git diff --check`. Dev Vite перезапущен на `0.0.0.0:5173`; API остаётся на `127.0.0.1:4310`. Тесты и GPU jobs не запускались. Первый проект пока не создан; следующий UI-срез — рабочая композиция активного shot editor и связанные с ним media previews.

### AIMixer Director timeline → draft shots (2026-11-14)
- Dev web поднят с `--host 0.0.0.0` для проверки с Mac: `http://192.168.1.149:5173/` (LAN IP может измениться). Проверены HTTP 200 страницы и `/health` через Vite proxy. API остаётся на `127.0.0.1:4310`; PostgreSQL опубликован только на loopback.
- UFW active. Прежний allow TCP/5173 был привязан к `enp10s0`, тогда как LAN NIC — `enp9s0`; пользователь применил scoped rule `sudo ufw allow in on enp9s0 from 192.168.1.0/24 to any port 5173 proto tcp comment 'qwen-director-web'` и подтвердил доступ с Mac. API и PostgreSQL наружу не открыты.
- По запросу пользователя проверена очередь ComfyUI: `0 running / 0 pending`. ComfyUI v0.45.0 остановлен штатным Ctrl-C в tmux `comfyui`; worker остановлен следом, чтобы не заявлять доступность H3 executor. QD API/Postgres/Vite оставлены для UI preview.
- Локальный Strata запущен (`0.0.0.0:8080`), `/health` и `/v1/models` отвечают, модель `qwen3.8-flash-next-iq3_xxs` загружена. Свободно около 12 GiB RAM после старта. DSH superagent доступен; он выполнил source-only UX review, но более узкий follow-up review истёк по таймауту. Pen MCP доступен по SSH bridge на macOS, файл проекта описан выше.
- Добавлен UI import для ComfyUI workflow JSON с `MiniMaxH3Director` timeline v5: сегменты становятся черновыми shots выбранной сцены, а media references требуют явного сопоставления с существующими AssetVersion. Server проверяет MIME, сохраняет привязки и source metadata, импорт транзакционный/idempotent; повтор с другой mapping отклоняется.
- Добавлен прямой импорт локального reference-файла из timeline UI в CAS/Media Pool с SHA-256 dedupe, MIME-проверкой и лимитом 100 MiB. Это снимает требование, чтобы hash-файл уже находился в ComfyUI input; ранее все 7 проверенных AIMixer refs отвечали 404.
- Создание jobs, активация профиля и submit в ComfyUI не происходят при импорте. Создание job из shot читает сохранённые refs по умолчанию и оставляет обычное manual approval. Video/audio refs хранятся, но workflow node binding для них остаётся отдельным блокером.
- Добавлен отдельный read-only каталог H3 workflow candidates. В редакторе кандидат можно live-проверить и активировать только явным подтверждением; активация повторно проверяет структуру, установленные узлы и LoRA. Обычный `/preflight` теперь не меняет active state.
- В loopback dev-БД `qwen-director-dev-postgres-1` до миграции было 20 версий, 0 проектов/shots/jobs/assets и 1 Director session. Миграция 021 применена штатным runner. Не подключался к старым контейнерам БД и не касался CAS legacy-файлов.
- Текущий профиль `h3-ref2v-int8-pika-flex-provisional` сохранён как revision 1 с `active=false`: 21 API node, 2 image bindings, INT8 pruned Ref2V + Pika Flex. Живой `/object_info` preflight вернул 200, `missingLoras=[]`, `qualityHint=unknown`; GET каталога показывает его как candidate, а active list остаётся пустым. Пользовательский provisional выбор не стал default.
- До последующей остановки по запросу пользователя ComfyUI отвечал на localhost:8188; API слушал `127.0.0.1:4310`, Vite — `0.0.0.0:5173` (LAN: `http://192.168.1.149:5173/`). Страница и `/health` через Vite proxy возвращали HTTP 200. `/ready` сообщал `not_ready` из-за недоступного llama.cpp; ComfyUI и storage были готовы.
- До остановки worker работал с `COMFYUI_URL=http://127.0.0.1:8188` как `local-comfy-worker`. Очередь была пуста; dev-БД содержала 0 проектов и 0 jobs. После остановки stale-регистрация синхронизирована штатным reconcile; текущее состояние указано в верхнем UX-срезе.
- Повторный live preflight `h3-ref2v-int8-pika-flex-provisional` успешен (`missingLoras=[]`, `qualityHint=unknown`), профиль остаётся `active=false`. GPU generation не выполнялась. Для первого реального прогона ещё нужны проект/shot с локальными refs, ручная активация выбранной revision и обычное утверждение job.
- Ранее после изменений кода проходили `npm run typecheck`, `npm run build:web` и `git diff --check`; в этом проходе тесты и GPU jobs не запускались.

### Workbench runtime schema preflight (2026-11-14)
- `/v1/workbenches/profiles/:id/test` теперь сверяет каждый class_type и input графа с установленным ComfyUI `/object_info`: неизвестные классы/inputs и отсутствующие обязательные inputs возвращают `WORKBENCH_RUNTIME_SCHEMA_MISMATCH` с ограниченным списком узловых причин.
- Проверка охватывает имена и обязательность inputs; типы значений, socket compatibility/links, custom-node semantics и реальные Motion Context/MultiRef fixtures пока не проверяются. Предварительно-заполненные/скрытые Comfy inputs могут отличаться от API export и требуют проверки на реальных профилях.
- `npm run smoke:workbench-catalog` и `npm run typecheck` прошли. Живой ComfyUI profile test не запускался.
- Та же сверка class_type/input names теперь применяется к H3 workflow в `preflightH3Runtime`, поэтому сохранённый H3 profile preflight ловит дрейф схемы до активации/запуска. `npm run smoke:h3-preflight` прошёл; typecheck после этого дополнительного изменения ещё выполнить.
- Проверка распространяется и на `ComfyWorkbenchExecutor.prepare` — runtime исполнения Actor/Scene/Prop/Layout теперь защищён тем же `/object_info` контрактом. Повторно прошли `npm run typecheck`, `npm run smoke:workbench-catalog`, `npm run smoke:h3-preflight` и `npm run smoke:executors`.
- ShotWorkspace examples подтверждают два полезных продукта: отдельный snapshot/review shot plan до применения и Workflow Interface, подключающий только необходимые entry wires при сохранении внутренних context/controller цепочек. Примеры Motion Context и MultiRef опубликованы как UI-format workflows, а QD сейчас принимает API graph; прямой импорт этих примеров не поддерживается и требует отдельного безопасного converter/adapter этапа. Никакие upstream workflow JSON и style ZIP не копировались.
- Runtime schema preflight дополнен проверкой API graph links: source node и output slot должны существовать, а socket types должны совпасть по `/object_info` (wildcard `*` разрешает совместимость). Smoke покрывает валидный линк, несовпадающий тип и отсутствующий source. Повторно прошли `npm run smoke:workbench-catalog`, `npm run smoke:h3-preflight`, `npm run typecheck`.
- Общая schema validation вынесена в `comfy-schema.ts` и теперь применяется к H3 и RefMod runtime preflight также; links проверяются одинаково для всех Comfy executors. Проверки: `npm run typecheck`, `smoke:workbench-catalog`, `smoke:h3-preflight`, `smoke:h3-refmod-profile`, `smoke:executors` прошли. Не проверены на живом `/object_info` из установленной ComfyUI.
- Поддержаны Comfy динамические inputs: `COMFY_AUTOGROW_V3` (включая именованные values) и `COMFY_DYNAMICCOMBO_V3` (включая selected-mode fields). Live read-only check против `http://127.0.0.1:8188/object_info` подтвердил один сохранённый локальный 33-node/27-class API graph; артефакт не выводился и не менялся. Для списка DB workflow profiles проверка невозможна: PostgreSQL socket `/var/run/postgresql/.s.PGSQL.5432` сейчас отсутствует; API на `127.0.0.1:4310` также не запущен.
- Live schema также выявила дефект `createH3StarterWorkflow`: H3 node отдаёт LATENT/CONDITIONING напрямую в SaveVideo, вход которого ожидает VIDEO. Стартер проходит structural H3 class-count check, но не является исполняемым видео-графом. Следующий шаг — заменить/удалить ложный starter на проверенный локальный API-format generation graph и покрыть full output-path validation; не submit-ить старый starter.
- ComfyUI update audit по запросу пользователя: `git fetch origin master`; local app commit совпадает с upstream `08ff3c11b3a85eb07c2c06f21cb378ac2e086840` (2026-10-09), ahead/behind `0/0`; на origin/master новых коммитов нет. Рабочий runtime оставлен без перезапуска. Сохранены три существующие локальные правки в `comfy/ldm/minimax/model.py`, `comfy/model_detection.py`, `comfy/text_encoders/qwen_image21.py`; `git diff --check` чистый. Обновлять зависимости отдельно без выявленной необходимости не стал.
- Итоговая проверка после поддержки динамических schema inputs: `npm run typecheck`, `smoke:workbench-catalog`, `smoke:h3-preflight`, `smoke:h3-refmod-profile`, `smoke:executors` прошли; live `/object_info` HTTP 200 подтвердил 33 узла/27 классов сохранённого API graph. PostgreSQL и QD API не запущены, поэтому активные DB-профили не сверены; генерацию не запускали.
- Закрыт ложноположительный H3 starter smoke: удалены неиспользуемый `createH3StarterWorkflow` (H3 LATENT напрямую в VIDEO saver), его поверхностный smoke и runtime preflight script. H3 schema smoke теперь явно отклоняет такой несовместимый output link. Проверки после удаления: `npm run typecheck`, `smoke:h3-preflight`, `smoke:h3-profile`, `smoke:h3-workflow`, `smoke:workbench-catalog` прошли. Следующий правильный шаг — добавить verified native API graph import/export либо предоставить starter, основанный на утверждённом локальном API graph, затем пройти полный local generation lifecycle.
- Workflow импорт в web принимает теперь как прямой ComfyUI API graph, так и QD workflow artifact envelope с `graph`; UI-format (`nodes`/`links`) явно отклоняется с инструкцией экспортировать API format, вместо помещения всего envelope в editor. App quick import и H3 wizard используют общий helper. `npm run typecheck`, `smoke:workflow-import`, `smoke:workflow-wizard`, `npm run build:web` прошли. Это убирает friction при реимпорте сохранённого job graph, но не реализует UI-format converter и не заменяет live H3 profile generation E2E.
- UI-format Comfy импорт реализован через `POST /v1/workflows/convert` с runtime `/object_info`: преобразуются widget values (массив и keyed object), links/слоты, Get/Set aliases и bypass; отключённые/несвязанные узлы удаляются до проверки. API и H3 wizard используют этот маршрут; собственный Smoke API проверяет конвертацию и отсечение disconnected nodes. Локальный VEDA UI workflow dry-run конвертировался в 43 узла/32 класса и прошёл полный live schema validation, но `validateH3Workflow` затем отклонил его из-за отсутствующих активных image-reference nodes. Workflow не сохранён и не отправлен в очередь. Проверки: `typecheck`, `smoke:workflow-import`, `smoke:workflow-conversion-api`, `smoke:workflow-wizard`, `smoke:h3-preflight`, `build:web` прошли. Следом разрешить реальную reference binding модель для video/audio context либо выбрать утверждённый H3 API graph с активными image refs и закрыть durable job lifecycle.

### Подготовка документации и локального старта для PR (2026-10-26)
- Добавлена пошаговая инструкция чистого запуска на Windows 11/PowerShell и macOS/Linux в `docs/start-local.md`: Node/npm, Docker Desktop/Compose, локальная PostgreSQL, запуск API/web/worker, остановка и частые ошибки. Она явно объясняет, что mock не генерирует видео, а ComfyUI и модели настраиваются отдельно.
- README направляет новичков к quickstart, а Codex — к `AGENTS.md` и session context. В `.env.example` удалён лабораторный IP и абсолютный локальный путь; ComfyUI задан loopback-адресом, пример `DATABASE_URL` согласован с портом Compose. Удалён `pull_policy: never`, иначе чистая машина не смогла бы получить образ PostgreSQL.
- Сохранены все уже имевшиеся пользовательские изменения. `.env` не открывался и не добавлялся. Проверить отдельно перед PR: review полного diff, секретный скан отслеживаемых файлов, `npm ci`, `npm run typecheck`, `npm run build:web`, `npm run check:skeleton`; проверить запуск quickstart на Windows 11. Эти проверки в текущем проходе не запускались.
- Ограничение: это инструкция разработки с mock/PostgreSQL; она не является подтверждением работоспособности GPU workflow или production readiness. В PR описать только изменения из проверенного diff и не прикладывать содержимое `.env`, лабораторные заметки, `.data/`, модели и производственные ассеты.

## Проверка качества MiniMax H3 SCENE-02 (2026-10-10)

- Ответ по форматам: текущий diffusion UNet — `minimax_h3_fl2va_pruned_int8_convrot.safetensors` (INT8 ConvRot). `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` — NVFP4/AWQ текстовый энкодер Qwen3VL, не diffusion-модель. В профиле видео VAE `minimax_h3_video_vae_int8_convrot.safetensors`; Turbo LoRA — BF16 `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors`.
- Закрыт ранее утверждённый A/B на том же seed `7180218`, prompt и кадрах: 16 шагов без LoRA и Turbo LoRA на 8 шагах. Jobs `fdaaf0d7-dae6-40d9-be2a-2626805e29fa` и `0594ab94-c81f-4f9d-b51c-83335d7ef972` обе `succeeded`; outputs `9b3309f4-6c69-4df4-89f3-fe009db789ed` и `6b4552a5-1e26-40eb-a914-3e4480325f1c`. Формат обоих: 832×480, 24 fps, 124 кадра (~5.167 с). Визуально разница мала: Turbo8 не устранил наблюдаемые проблемы; значит сравнение не указывает на LoRA как первопричину.
- Уточнение после просмотра Comfy-Org native UI template: `res_multistep` + `simple` применяется и в готовом ComfyUI H3 I2V workflow; workflow имеет native base 20-step mode и Turbo 8-step toggle. Значит предыдущий H3 A/B sampler не был заведомо неправильным для native ComfyUI path. LightX2V — отдельный валидный рецепт (Euler + shifts 12/3 для 544p FL2VA Turbo8, 6/3 для его отдельной 768p Turbo LoRA), но это не единственный эталон. Качество-причину искать контролируемо: сравнивать native ComfyUI mode с SatoDive `er_sde`, отдельно от шага/силы LoRA. Не объявлять отсутствие SigmaShift в native графе ошибкой.
- Текущий промпт графа не использует обязательный для FL2VA шаблон привязки Picture 1 в 0.00 и Picture 2 в 5.17, не описывает пошаговый путь непрерывного кадра по отдельным состояниям; он одновременно просит героя подойти, открыть дверь, сесть и завести машину. Загруженные парковочные refs различаются масштабом/ракурсом, что создаёт резкий сдвиг композиции к конечному ключевому кадру. Источники дневные; цветовой текст согласован с ними в последнем A/B.
- Официальные рецепты для сверки: [Comfy-Org H3 I2V](https://github.com/Comfy-Org/docs/blob/main/tutorials/video/minimax/minimax-h3-native.mdx), [LightX2V готовый I2V workflow](https://github.com/ModelTC/Minimax-H3-Turbo/blob/main/example_workflows/video_minimax_h3_i2v_lightx2v_turbo.json), [LightX2V инструкции ComfyUI](https://github.com/ModelTC/Minimax-H3-Turbo/blob/main/COMFYUI_SETUP_AND_INFERENCE.md), [официальный H3 video prompt guide](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md). Вывод: NVFP4 text encoder пока не обвинять — UNet INT8 и соответствующая Turbo LoRA совпадают с официальным стэком. Сначала подготовить отдельную revision с официальными Euler/SigmaShift параметрами и корректным FL2VA prompt, проверить canvas/reference alignment, затем показать plan. Новую GPU job не запускать без отдельного подтверждения оператора и проверки свободной VRAM; OMP/Qwen imageView на GPU не запускать.
- Проверены локальные `.data/comfyui-workflows/ComfyUI-H3 IMG Gen Workflow.json` и `ComfyUI-H3 IMG Gen WORK.json`; live PVE `/object_info/SatoDiveH3Image` подтвердил, что custom node SatoDive установлен. Сохранённый Image Gen graph использует community `minimax_h3_hybrid_fl2va_ref2va_b20-49-int8.safetensors`, Qwen3VL NVFP4/AWQ, video VAE FP16, FL2V Turbo8 LoRA strength 0.6, 34 steps, `er_sde`, `simple`, `ref_image_size=max`; detail model фактически `None`. Workflow Note утверждает 18 steps и описывает detail model, поэтому доверять нужно реальным widget values, а не note. Размеры этого still graph также нестандартны: один JSON задаёт custom 3600×1400 при aspect setting 16:9 (не используется в Custom size), второй 4096×3072; не переносить их в widescreen видео. B20-49 — экспериментальная community merge-модель с более сильной Ref2VA составляющей и несколько более низким raw visual/audio fidelity против b25/b30; не официальный base checkpoint. SatoDive node делает H3 still image через специализированный single-frame latent/decode path, поэтому его sampler/LoRA/steps являются гипотезой для видео, а не video preset. Его README для обычного 8-step Turbo LoRA советует около 20 шагов, strength default 0.38; локальный graph (34/.6) сам по себе не подтверждает ни эти значения, ни качество на полном видеолатенте. Перед любым video тестом подготовить отдельную profile revision и изолировать sampler, steps, LoRA strength; не менять UNet и разрешение в том же сравнении.

Предыдущие заметки о планируемом A/B и выборе FL2VA LoRA заменены итогами и точной сверкой активного графа в разделе выше. Не считать старое 16-step или Turbo8 сравнение проверкой официального sampler recipe: оба прошли через наш прежний `res_multistep` граф без SigmaShift.

- Checkout находится в `/home/la6/Work/QwenDirector`; `npm ci` установлен из lockfile (113 packages). Ранее прошли `npm run typecheck` и `npm run build:web`; npm сообщил о 3 уязвимостях (2 moderate, 1 high). Не выводить секреты из `.env`.
- Локальный PostgreSQL 18 запущен контейнером `qwendirector-postgres-1`, loopback port `54329`, постоянный Docker volume. База восстановлена из `.data/backups/post-recovery-20260910`; CAS-файлы находятся в `.data/assets/cas`. Восстановлено: 8 старых проектов, 9 jobs, 16 asset_versions; 19 миграций применены. `QWEN_STORAGE=postgres`, `QWEN_ASSET_ROOT=./.data/assets`.
- API работает на `127.0.0.1:4310`, Vite на `0.0.0.0:5173`; `/ready` ранее вернул ready для ComfyUI (`http://192.168.10.165:8188`), llama.cpp (`127.0.0.1:8081`) и PostgreSQL. Worker зарегистрирован online; при последней проверке jobs в очереди не было. Если процессы остановились после завершения сессии, проверить `ss`/`docker compose ... ps` и запустить вручную.
- llama.cpp запущен вручную через `CUDA_VISIBLE_DEVICES=1` на RTX 4060 Ti, модель `/home/la6/models/Qwen3.8-27B-GSQ-RCO-IQ3_XXS.gguf`, context 4096. **Не добавлять Qwen в автозапуск** — это прямое требование пользователя.
- Пользователь зафиксировал основной вариант: чёрный 718 Spyder RS с карбоновыми деталями; постоянный герой уже подготовлен через RefMod, для проб использовать `character_01_refMod` (лист из `!CHARACTER!/Реалистичный референсный лист персонажа.png`, AssetVersion `b40cbeb3-28a4-4f81-8217-9f7a928685d3`). В `!718-Spyder!/!NEW!/` находятся уличные парковочные кадры чёрного RS среди деревьев; использовать их как окружение SCENE-02, не как источник vehicle identity. В ComfyUI создан и появился в `MiniMaxH3RefModsLoader` RefMod `QwenDirector/718-Spider-RS/porsche_718_spyder_rs_black_carbon` из 6 студийных ракурсов 4:3; Comfy prompt ID `36d40227-466f-426b-aeb7-92698df37cfd`. Источники и provenance — `.data/porsche-718-reference-map.json`. Ограничение: активный QwenDirector quality workflow пока принимает две обычные картинки через `MiniMaxH3ReferenceToVideo`; он не подключает RefMods. Сам RefMod создан напрямую в ComfyUI, поэтому ещё не имеет job/AssetVersion provenance в каталоге QwenDirector. Для использования обоих RefMods в tracked generation нужно добавить совместимый RefMods workflow/profile path и затем запускать test shot через очередь QwenDirector.
- Проект переименован пользователем в `Porsche 718 Spider RS` (`754346e8-60db-44db-b918-7179dd4e3499`); для описания автомобиля в промптах использовать официальное написание `Porsche 718 Spyder RS`. Каталог приведён к восьми сценам по REFS: `SCENE-01 · Underground Intro — «Потом»` (старый scene ID `9e096f3a-aa38-42f0-aead-74574d0c660b`) и семь новых сцен 02–08. В сцене 01 пока три старых общих shot-заглушки по 5с без утверждённых prompt/references. Все 313 путей из `/home/la6/Work/718-Spider-RS/REFS` сведены по SHA-256 к 290 уникальным ассетам в `.data/porsche-718-reference-map.json`; каталог содержит 306 assets всего (16 прежних + 290 импортированных), повторные файлы не копировались. Сцены/кадры ещё не привязаны к конкретным AssetVersion в job snapshots; jobs=0, генерация не запускалась. Режиссёрская карта и производственные ограничения: [docs/director-treatment-718-spyder-rs.md](director-treatment-718-spyder-rs.md).
- Очистка старых тестовых данных завершена после custom-format backup `.data/backups/pre-cleanup-20261010/qwendirector.dump` (список архива читается `pg_restore -l`). Транзакционно удалены только 8 старых проектов `QwenDirector Live R2V`/`H3 Quality A/B`, их scenes/shots и 9 jobs с attempts/manifests/link rows. Остался проект Porsche 718; после импорта REFS в БД 306 asset_versions, 0 jobs и 3 workflow_profiles. CAS, все asset rows и MP4 `ed88cd1a-4ee0-41a2-812a-4c969566b389` сохранены.
- 11 сохранённых workflow скопированы из ComfyUI в `.data/comfyui-workflows/` (папка содержит локальные данные, добавлена в `.gitignore`). Это исходные UI-format JSON и локальный mirror, а не импортированные/активированные профили QwenDirector. MCP notes подтверждают MiniMax H3 I2V/R2V и метаданные моделей; среди файлов также есть H3 image gen, Qwen Image 2.1 edit, SeedVR2 upscale и RefMod utility. Несколько графов содержат custom/subgraph UUID node types; перед импортом нужен API-format export и отдельная проверка реальных классов/моделей.
- ComfyUI `/api/userdata?dir=workflows/&recurse=true` показывает 11 сохранённых workflows. Полученный файл `video_mmh3_i2v_PDD_8_fixed.json` имеет UI-format (`nodes[]`), тогда как `/prompt` и проектный H3 profile API ожидают API-format graph. Автоматически импортировать UI JSON в профиль нельзя без UI-export `Save (API format)` или отдельного корректного конвертера. В проекте уже есть 3 активных H3 профиля. Live check 2026-10-10: `/ready` и `/v1/runtime` подтверждают ComfyUI, llama.cpp, storage и H3. Без побочного эффекта проверен `POST /v1/workflow-profiles/h3-ref2v-quality-8step-local/test`: HTTP 200, `quality-8step`, missingLoras=[], Ref2VA Acc 8Step LoRA и требуемые классы доступны. `h3-ref2v-draft-4step-local` и `video-minimax-h3-r2v` через `/test` вернули 409 из-за отсутствующей Turbo LoRA `minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors`. Не вызывался `/preflight`, т.к. route активирует профиль. Все три профиля уже числятся active в каталоге; два из них runtime не проходят. Не запускать draft/R2V профили до установки/замены LoRA и повторного `/test`; ничего не скачивать автоматически. Quality 8-step прошёл boundary/model preflight, но для реального job всё ещё нужны подтверждённые Porsche image references и отдельное approval.
- ComfyUI лог показывает asset seeder full scan 125 путей примерно за 70 мс (`created=0`, `skipped=125`, ошибок нет). Это лёгкая файловая индексация, не генерация; причина повторного запуска (таймер/watcher/restart) ещё не выяснена.
- ComfyUI MCP подключён в Codex как `comfy` через stdio: отдельная среда `/home/la6/.venvs/qwen-director` содержит `comfy-mcp 0.10.0`, `comfy-cli 1.22.0`, `mcp 2.3.0`; `COMFYUI_URL=http://192.168.10.165:8188`. Codex allowlist ограничен read-only `server_info`, `discover`, `list_workflow_slots`, `list_workflow_notes`, для вызовов оставлен режим prompt. `codex mcp get comfy` и прямой MCP initialize/list_tools/server_info прошли. Текущая Codex-сессия не подхватила новый namespace: после перезапуска Codex/новой сессии инструменты должны появиться. У MCP `server_info` отражает также локальный comfy-cli workspace и не является проверкой здоровья удалённого PVE; remote HTTP endpoint ранее проверен отдельно. `list_workflow_slots` на части UI workflow в comfy-cli 1.22.0 возвращает некорректный JSON envelope — диагностика записана, исходные workflow не менялись.
- Сверка Director-Studio обновлена на 2026-10-10: upstream README/architecture описывают conversation agent + Harness, Actor/Scene/Prop/Layout workflows, custom H3 boundary wizard, Ref2AV/continuation и local/API providers. В QwenDirector есть durable H3 foundation, H3 profile wizard, typed workbench UI/contracts и deterministic planner scaffold; разговорный LLM agent и реальные generic workbench graphs остаются gap. GitHub main SHA не был зафиксирован; у repo не найден LICENSE-файл, код/графы upstream не копировались. См. `docs/reference-parity.md` для приоритетного пути: golden H3 shot → bounded local agent → approved batch → continuity/edit/export → специализированные workbenches.
- `GET /v1/projects/:id` включает пустые сцены: исправлен timeline SQL (`LEFT JOIN shots`). Readback проекта Porsche 718 подтвердил восемь сцен, три старых shot-заглушки в первой сцене, пустой список jobs; генерация не запускалась. `/ready` ранее вернул HTTP 200.
- Следующие действия: (1) добавить в QwenDirector исполняемый H3 RefMods workflow/profile path с provenance; (2) привязать автомобильный RefMod, `character_01_refMod` и парковочные scene refs к одному tracked test shot сцены 02; (3) выполнить один короткий тест через QwenDirector approval/worker/asset lifecycle и оценить идентичность чёрного RS, карбон, героя и операторское движение; (4) после приёмки собрать остальные keyframes по мудбордам. Утверждённые исходные установки: чёрный RS с карбоном, существующий герой RefMod, `!NEW!` как парковочное окружение. Автозапуск Qwen не настраивать.

# Старт следующей сессии

## Проверенный checkpoint: PostgreSQL job lifecycle

Последний проход добавил immutable execution evidence: PostgreSQL commit сохраняет JSON manifest и SHA-256 его канонического представления в `attempt_manifests` в одной транзакции с fencing-проверкой и переводом job в `succeeded`. API отдаёт его через `GET /v1/attempts/:attemptId/manifest`. Миграция `005_attempt_manifests.sql` применена к локальной БД `qwendirector`. Это ещё не AssetVersion: байты не прошли staging/CAS, поэтому их нельзя честно объявлять сохранёнными assets.

Проверено: `npx tsc --noEmit`, `npm run smoke:api`, `npm run smoke:repository`, `node --import tsx scripts/smoke_pg_api.mjs`. Последний тест создаёт собственные fixtures в PostgreSQL, проверяет API create/replay/conflict/approve, repository claim и API heartbeat/commit, затем удаляет только fixtures. Запущенный ранее сервер автоматически не перезапускался.

Остаётся: заменить временную preHandler-маршрутизацию единым типизированным service layer, реализовать staging upload → hash validation → atomic CAS promotion → AssetVersion и связывать его с manifest, проверить lease expiry/cancel race и связать worker executor с adapters. Worker пока не выполняет реальные генерации автоматически; полный production workflow ещё не готов.

## Контекст

QwenDirector — local-first AI-video studio для justlovejazz. ComfyUI в PVE `pct 103` отвечает на `http://192.168.10.103:8188/` и использует RTX 5090 (33.67 GB VRAM). Qwen launcher `/home/la6/bin/qwen35-worker.sh` использует llama.cpp build `9744 (063d9c156)` и GGUF Qwen3.5-9B на `:8081`; `/health` и `/v1/models` подтверждены. Workstation: RTX 4060 Ti 16 GB, NVIDIA `595.91.07`.

Подготовлены русские документы и пустой npm workspace. Рекомендация: собственное ядро; Director Studio — источник идей и потенциальных адаптеров после локального аудита лицензии/commit. Backend: Node.js LTS/Fastify, PostgreSQL queue/state, filesystem blobs, отдельный TS worker; Vue 3/Vite; TresJS позже. Зависимостей и lockfile нет, приложения не запускаются. Ничего не скачано и не опубликовано.

## Первые действия

1. Прочитать [AGENTS](../AGENTS.md), [ADR](decision-records/ADR-001-architecture.md), [architecture](architecture.md), [adapter contract](workflow-adapter-contract.md).
2. Выполнить локальную проверку ниже. Последняя проверка записана в [локальном инвентаре](lab-inventory.local.md): Node.js/npm есть, Docker/psql/Ollama недоступны, GPU-драйвер из этой среды не отвечает.
3. Выполнить доступную read-only часть [аудита](operations.md); записать факты и неизвестные значения в новый `docs/lab-inventory.local.md` (он игнорируется git). Не сканировать сеть и не менять узлы.
4. После разрешённого запуска Qwen проверить `curl http://127.0.0.1:8081/health` и `/v1/models`; ComfyUI `/system_stats` уже проверен. Зафиксировать два execution targets: remote ComfyUI/RTX 5090 и local llama.cpp/Qwen.
5. Проверить доступные локальные версии Node.js/npm и библиотек, зафиксировать выбранные версии. Перед любой установкой соблюдать текущую задачу и сетевые ограничения; каркас не даёт разрешения скачивать зависимости.
6. Первый кодовый срез добавлен: contracts/domain/mock adapter; также подготовлены `packages/storage/migrations/001_init.sql` и `apps/api/src/http-contract.ts`. Следом расширить state transitions и runtime tests duplicate submit, stale result, cancel race и unknown execution. Затем реализовать repository/transactions PostgreSQL и один API vertical slice, затем UI. При необходимости установки сначала подготовить точный список пакетов.
7. Нативные systemd-шаблоны добавлены в `deploy/systemd`; SQL-скелет claim — `packages/storage/migrations/002_queue_claim.sql`. Они не установлены и не активированы.
8. Интеграционный слой обновлён: adapters probe реальные `/health`, `/v1/models`, `/system_stats`; `router.ts` выбирает backend по доступности и modality. Runtime TypeScript ещё не собран — зависимостей и tsconfig нет.
9. Добавлен dependency-free probe `node scripts/probe_backends.mjs`; он проверяет текущие endpoint и печатает capability snapshot.
10. Добавлен API smoke `npm run smoke:api`: create → idempotent replay → conflict → approve → cancel. Repository пока in-memory, PostgreSQL schema остаётся следующим production шагом.
11. Добавлен `apps/api/src/pg-repository.ts`: транзакционный claim и fencing-aware heartbeat/commit. Подключение к API и integration smoke требуют доступного PostgreSQL и остаются следующим проверяемым шагом.
12. Добавлен `storage-factory.ts`: `QWEN_STORAGE=memory|postgres`; PostgreSQL требует `DATABASE_URL`, default остаётся memory.
13. PostgreSQL smoke успешно проверил `claim → heartbeat → commit`; добавлен worker boundary `apps/worker/src/loop.ts`, который общается только с API.
14. `/v1/worker/claim` подключён к `PgAttemptRepository.claimNext` при `QWEN_STORAGE=postgres`; memory fallback сохранён. Smoke API и PostgreSQL проходят.
15. `apps/worker/src/loop.ts` получил long-running polling `run(signal)` с graceful stop; adapter execution callback и heartbeat/commit orchestration остаются следующим кодовым шагом.
16. Добавлен `PgNodeRepository` и API `/v1/nodes/register`, `/v1/nodes/:id/heartbeat`; integration smoke на временном node прошёл, запись удалена.
17. Добавлена миграция `003_capabilities.sql`; PostgreSQL claim теперь требует online node и проверяет `nodes.capabilities @> jobs.required_capabilities`.
18. Добавлен `requiredCapabilities(GenerationSpec)` в `packages/contracts/src/requirements.ts` для вычисления требований job из model-independent spec.
19. `PgJobRepository.create` сохраняет `requiredCapabilities` в JSONB `jobs.required_capabilities`; PostgreSQL claim фильтрует по ним.
20. Добавлен `apps/worker/src/executor.ts`: общий pipeline `prepare → submit → poll → collect → commit` с heartbeat и fail hook, без привязки к backend.
21. Добавлены concrete executors `LlamaCompletionExecutor` и `ComfyPromptExecutor`; реальный submit не выполнялся, пока workflow не будет явно утверждён.
22. Добавлен `smoke:executors`: fetch-mocked contract test проверяет llama completion payload, ComfyUI prompt_id и history success.
23. Реальный локальный Qwen completion smoke прошёл: HTTP 200, формат `choices[0].text`, ~303 ms для короткого запроса. ComfyUI generation не запускалась без утверждённого workflow.
24. Добавлены model-independent Design JSON (`packages/contracts/src/design.ts`) и importer с сохранением unknown fields; `npm run smoke:design` проверяет порядок shots и валидацию.
25. Добавлен optional `ComfyMcpClient` boundary и disabled-by-default config; локальный `comfy-mcp` на workstation пока не установлен.
26. Рекомендуемое Python-окружение для MCP и тонких адаптеров называется `qwen-director`: `~/.venvs/qwen-director`, создаётся через доступный `uv 0.11.22`. Установка пакетов в него выполняется отдельно от npm workspace.
27. `comfy-mcp 0.10.0` установлен; для удалённого ComfyUI передавать процессу `COMFYUI_URL=http://192.168.10.103:8188`. Ручной запуск без MCP-клиента ожидаемо ждёт stdio initialize.
28. В окружение `~/.venvs/qwen-director` установлен `comfy-cli 1.20.0`; создан каталог `~/.config/comfy-cli`. CLI read-only видит локальную RTX 4060 Ti (16 ГБ). MCP namespace загружается в Codex, но вызовы `server_info`/`nodes` пока возвращают внутреннюю ошибку; основной адаптер ComfyUI продолжает работать через HTTP API.
29. Worker самостоятельно регистрирует узел при старте и отправляет heartbeat каждые 15 секунд; `QWEN_NODE_ID=local` нормализуется в UUID локального узла.
30. Heartbeat worker повторно регистрирует узел при ответах API `404/409`, поэтому перезапуск API не требует ручного вмешательства.
31. Добавлен `HttpExecutionHooks` для heartbeat/commit через API с fencing token. Для безопасного подключения executor очередь должна начать возвращать `adapterId` и immutable параметры плана; до этого worker оставляет executor необязательным.
32. Миграция `004_execution_plan.sql` добавляет в jobs `adapter_id` и `plan_json`; claim теперь возвращает их worker вместе с `requiredCapabilities`. Миграция применена к локальной БД `qwendirector`.
33. Worker выбирает `llama.cpp` или `comfyui` executor по `adapterId`, выполняет lifecycle через `HttpExecutionHooks` и отклоняет неизвестные adapterId. Контрактные smoke-тесты проходят.
34. После запуска `qwen35-worker.sh` локальный Qwen снова доступен: health/models HTTP 200, модель `qwen3.5-9b-defiant-mtp-q5km`; реальный completion `QWEN_DIRECTOR_OK` прошёл.
35. End-to-end wiring завершён: job plan содержит `adapterId` и `plan.prompt`, claim передаёт plan worker, llama executor отправляет этот prompt в Qwen, а HttpExecutionHooks передаёт manifest в commit. Расширенный PostgreSQL smoke проверяет adapter, prompt и manifest.
36. Выполнена сверка с Director Studio на публичном `main` commit `d7d747282c75d3e1180a394665c9b405829f56e4`; лицензия MIT, чужой код не переносился. В `docs/reference-director.md` добавлена матрица соответствия.
37. Добавлена миграция `005_attempt_manifests.sql`: результат attempt хранится как immutable JSON evidence с hash. `npm run smoke:postgres` и `node --import tsx scripts/smoke_pg_api.mjs` подтверждают сохранение и чтение manifest.
38. Реализован `FilesystemAssetStorage`: staging-ключи, запись байтов, SHA-256 validation и atomic CAS promotion в `cas/<prefix>/<sha256>`. Абсолютные пути наружу не выдаются; `npm run smoke:storage` подтверждает успешный и ошибочный сценарии. API upload и создание `AssetVersion` остаются следующим шагом.
39. Добавлен `POST /v1/attempts/:attemptId/assets`: upload принимает fencing token, выполняет staging/CAS promotion и транзакционно создаёт `asset_versions` + `attempt_assets`. Миграция `006_attempt_assets.sql` применена к `qwendirector`; `npm run smoke:asset-upload` проверяет успешный upload, сохранение AssetVersion и отказ stale token.
40. Commit теперь сохраняет manifest как execution evidence; добавлен `GET /v1/projects/:projectId/timeline` с shots и Media Pool-ассетами. Vue-экран показывает этот read-model после создания job. Полное обогащение manifest outputs `assetVersionId` и группировка нескольких shots в одной сцене остаются UI/read-model refinement.
41. Timeline read-model теперь иерархический (`scenes[] → shots[] → assets[]`), а commit обогащает `manifest.outputs` полем `assetVersionId` по `logicalName`. `smoke:asset-upload` проверяет эту связку.
42. Добавлен model-independent `compileDirectorPrompt`: поля camera/action/composition/lighting/sound/transition компилируются детерминированно и сохраняются в plan JSON при `POST /v1/director/jobs`. `npm run smoke:prompt` подтверждает порядок и отказ пустого ввода.
43. `POST /v1/director/jobs` теперь вычисляет SHA-256 plan/request hash из фактического compiled plan и director fields; approval привязан к содержимому, а не к случайному идентификатору shot. `npm run smoke:plan-hash` подтверждает инвалидацию при изменении ввода.
44. Worker Llama executor теперь сохраняет текст completion в output descriptor, а `HttpExecutionHooks.commit` автоматически загружает такие outputs через asset API, вычисляет SHA-256 локально и отправляет в commit только безопасный descriptor с `assetVersionId`. Контрактные smoke-тесты проходят; реальный E2E worker upload ещё требует запуска API+worker и разрешённого локального job.
45. Добавлен интеграционный `smoke:worker-e2e`: настоящий Fastify API + PostgreSQL attempt + `HttpExecutionHooks` проходят `execute → HTTP upload → CAS → AssetVersion → enriched manifest`. Реальный llama.cpp backend по-прежнему не запускается автоматически.
46. ComfyUI executor теперь после успешного `history` скачивает реальные outputs через `/view`, формирует output descriptors для CAS (image/video/audio) и сохраняет `externalRunId`. `npm run smoke:comfy-collect` проверяет H3-видеофайл; запуск генерации на PVE требует утверждённого workflow snapshot.
47. Референс обновлён на `ai2764/Director-Studio` (`aa4ac92…`); LICENSE в checkout не обнаружен, код не переносится. Добавлен model-independent валидатор H3 workflow: ровно один `MiniMaxH3ReferenceToVideo`, `RandomNoise`, `SaveVideo`, с отказом I2V/ref-frame boundary. `npm run smoke:h3-workflow` проходит.
48. Добавлены H3 workflow profiles: immutable graph snapshot с `graphHash`, boundary discovery и deterministic injection prompt/width/height/length/seed/filename prefix. `npm run smoke:h3-profile` подтверждает snapshot не мутируется и invalid inputs отклоняются.
49. ComfyUI adapter перед submit валидирует snapshot boundary и выполняет PVE preflight через `/object_info`, требуя `MiniMaxH3ReferenceToVideo`, `RandomNoise` и `SaveVideo`. `npm run smoke:h3-preflight` проверяет успешный и missing-node сценарии.
50. `POST /v1/director/jobs` для `adapterId=comfyui` теперь требует H3 workflow graph, создаёт immutable profile (`graphHash` + boundary) и сохраняет его в `plan_json`; невалидный или отсутствующий graph отклоняется до approval. `npm run smoke:workflow-job-plan` проходит.
51. Worker ComfyUI path теперь использует `workflowProfile.graph` из claimed immutable plan, инжектирует compiled prompt, width/height/length/seed и output prefix через `injectH3Inputs`, затем отправляет этот snapshot в PVE. `npm run smoke:worker-h3-injection` подтверждает отсутствие мутации профиля.
52. Добавлен `uploadComfyReference` для image/audio через ComfyUI `/upload/image` с безопасным filename validation и нормализацией `{name,subfolder,type}`. `npm run smoke:comfy-upload` проходит; привязка uploaded media к конкретным H3 LoadImage/LoadAudio boundary nodes остаётся profile metadata шагом.
53. H3 profile получил явные `referenceBindings.imageNodeIds/audioNodeIds`; `injectH3Inputs` подставляет результаты upload в LoadImage/LoadAudio nodes по порядку и отклоняет переполнение/невалидные bindings. `npm run smoke:h3-references` проходит.
54. Worker ComfyUI path подключает `plan.references`: каждый immutable reference загружается в PVE через `/upload/image`, затем его `{name,subfolder,type}` инжектируется в H3 bindings перед submit. Большие references пока не должны передаваться inline в plan; следующий шаг — API asset download по `assetVersionId`.
55. Добавлен `GET /v1/assets/:assetVersionId` для чтения bytes из локального CAS с `content-type`, `content-length` и `x-content-sha256`. Director job sanitizes references до `{assetVersionId,filename,type}`, а worker fetch-ит их через API перед PVE upload; inline base64 в plan больше не используется.
56. Добавлен catalog API: `GET /v1/projects`, `GET /v1/projects/:projectId` (hierarchical scenes/shots/assets) и `GET /v1/assets?projectId=...`. `npm run smoke:catalog` подтверждает read-model.
57. Vue UI подключена к catalog API: загружает проекты при старте, позволяет выбрать проект и показывает его hierarchical timeline/Media Pool read-model.
58. Shot в timeline теперь selectable: активный shot подсвечивается и заполняет режиссёрскую форму project/scene/shot для запуска следующей job.
59. Vue director form расширена шестью H3 prompt sections (`camera`, `action`, `composition`, `lighting`, `sound`, `transition`) и отправляет их структурированно в API compiler.
60. Vue Media Pool получил выбор AssetVersion references; выбранные image/audio assets отправляются в director job как `{assetVersionId,filename,type}` и не встраиваются байтами в plan.
61. Vue получил adapter switch `llama.cpp`/`ComfyUI H3`, H3 width/height/frame параметры и workflow JSON input; ComfyUI job отправляет graph snapshot вместе с references и проходит серверную H3 validation/preflight.
62. H3 execution parameters `width/height/length/seed` теперь сохраняются в immutable `plan_json` и используются worker injection перед submit.
63. Исправлен критический failure path: добавлен `POST /v1/attempts/:attemptId/cancel`, транзакционный `PgAttemptRepository.fail` и перевод job в `failed`/`cancelled` с fencing check. `npm run smoke:failure-lifecycle` проходит.
64. Добавлен `POST /v1/admin/reconcile`: истёкшие leases переводятся в `attempt=unknown`, `job=reconciling` одной транзакцией; автоматический retry не выполняется до проверки внешнего ComfyUI state. `npm run smoke:reconcile` проходит.
65. Добавлен операторский `POST /v1/attempts/:attemptId/reconcile`: explicit `success|failed`, actor и manifest для success; unknown attempt закрывается без повторного запуска и с immutable evidence. `npm run smoke:reconcile-resolve` проходит.
66. ComfyUI polling получил timeout и backoff; timeout передаётся в worker failure path. `npm run smoke:comfy-timeout` проходит.
67. Добавлен `GET /v1/runtime`: read-only snapshot доступности ComfyUI `/system_stats` + `/object_info` и llama.cpp `/health` + `/v1/models`, с latency и статусами без секретов. `npm run smoke:runtime-health` проходит.
68. Vue UI показывает runtime health для ComfyUI/llama.cpp, имеет ручное обновление и блокирует запуск `ComfyUI H3`, если PVE runtime недоступен.
69. Vue перед отправкой ComfyUI job локально валидирует API-format workflow: ровно один H3/RandomNoise/SaveVideo и запрет MiniMaxH3ImageToVideo; некорректный graph не создаёт job.
70. UI получил image/audio node ID fields для H3 bindings; API сохраняет `workflowReferenceBindings` в immutable profile, поэтому выбранные Media Pool references подключаются к LoadImage/LoadAudio перед PVE submit.
71. HttpExecutionHooks heartbeat теперь читает job state и при `cancel_requested/cancelled` прерывает worker execution через `CANCELLED`; heartbeat API возвращает актуальное job state. Это закрывает operator cancel race для long-running H3 jobs.
72. Generic executor получил optional `cancel` hook; ComfyUI executor при `CANCELLED` вызывает PVE `/interrupt` с `prompt_id`, затем закрывает attempt через API failure path. `npm run smoke:comfy-cancel` проходит.
73. Добавлен `GET /v1/jobs/:id/result`: последняя attempt, manifest hash/JSON и связанные AssetVersion доступны по job ID; `npm run smoke:job-result` проходит.
74. Добавлены reusable H3 workflow profiles: миграция `007_workflow_profiles.sql`, `POST/GET /v1/workflow-profiles`, сохранение graph/boundary/graphHash. Профиль можно повторно выбирать для shots; `npm run smoke:workflow-profiles` проходит.
75. UI загружает сохранённые H3 profiles, позволяет выбрать профиль вместо ручного JSON и передаёт `workflowProfileId/name` вместе со snapshot в director job plan.
76. UI умеет сохранять текущий API-format H3 graph как reusable profile через `POST /v1/workflow-profiles`; server validation не допускает profile без H3 boundary, bindings сохраняются вместе со snapshot.
77. Добавлен profile activation gate `POST /v1/workflow-profiles/:id/preflight`: сохранённый graph и PVE `/object_info` проверяются до выбора profile для job. `npm run smoke:profile-preflight` проходит.
78. Workflow profiles теперь сохраняются inactive и попадают в `GET /v1/workflow-profiles` только после успешного PVE preflight; preflight атомарно активирует profile. UI-кнопка Test selected profile выполняет этот переход.
79. ComfyUI director job с `workflowProfileId` теперь читает только active profile из PostgreSQL и сохраняет его graph snapshot/hash в immutable plan; UI не обязан повторно передавать graph JSON. `npm run smoke:profile-job-source` проходит.
80. Добавлена versioned profile history: миграция `008_workflow_profile_revisions.sql`, сохранение профиля создаёт новую revision в транзакции, старые graph snapshots не перезаписываются; active остаётся только после preflight.
81. Миграция `009_profile_revision_cascade.sql` делает удаление тестового/архивного profile безопасным: его revisions удаляются каскадно, не затрагивая jobs, которые уже содержат собственные immutable snapshots.
82. Миграция `010_profile_reference_bindings.sql` сохраняет image/audio bindings в profile и каждой revision; job по `workflowProfileId` теперь использует bindings из active server profile, а не повторный ввод UI.
83. Добавлен `GET /v1/workflow-profiles/:id/revisions`: полная история graph/hash/boundary/reference bindings доступна для provenance; `npm run smoke:profile-revisions` проходит.
84. Добавлен operator job catalog `GET /v1/jobs?state=...` с project/scene/shot, adapter, plan hash и state; memory storage корректно возвращает 501, PostgreSQL read-model ограничен 100 последними jobs.
85. Vue UI показывает последние jobs в Job queue table с project/scene/shot, adapter, state и plan hash.
86. Job queue расширена operator actions: Approve, Cancel и Mark failed для reconciling attempt; API read-model возвращает latest `attempt_id/state`.
87. Добавлен manual final-take selection `POST /v1/jobs/:id/select-output`: выбирается только AssetVersion, связанный с job; решение хранится отдельно в `job_selected_outputs`, immutable manifest не изменяется. `npm run smoke:select-output` проходит.
88. Job queue UI получила кнопку Result, открывающую manifest/AssetVersion read-model по job ID через `GET /v1/jobs/:id/result`.
89. Result panel UI показывает outputs и позволяет выбрать финальный take через `POST /v1/jobs/:id/select-output`; выбранный AssetVersion отображается как operator decision.

## Локальный запуск текущего среза

```sh
cd /home/la6/Documents/Projects/QwenDirector
export QWEN_STORAGE=postgres
export DATABASE_URL=postgresql:///qwendirector
npm run dev:api
```

В отдельном терминале worker запускается через `npm --workspace apps/worker run start` с `QWEN_API_BASE_URL=http://127.0.0.1:4310` и `QWEN_NODE_ID=local`; при старте он сам регистрирует узел и затем выполняет claim-цикл. Фактический executor пока необязателен.

## Команды без установки и запуска сервисов

```sh
pwd
rg --files --hidden -g '!.git/**' -g '!.agents/**' -g '!.codex/**'
python3 scripts/check_skeleton.py
python3 scripts/check_domain_contract.py
node --version
npm --version
```

`git status --short` использовать только если каталог уже является настоящим репозиторием. При подготовке обнаружен служебный read-only каталог `.git`, git не инициализировался и коммиты не создавались. Недостающий Node.js/npm не мешает документальной проверке через Python.

## Что решить до реального GPU job

- Какой узел координатор, где primary assets и backup?
- Каковы точные VRAM, GPU UUID, свободный диск и backend versions?
- Какой workflow/model digest и output budget утверждены?
- Backend выделенный или общий; допустима ли адресная отмена?
- Кто утверждает запуск, сколько повторов разрешено, каков retention?

Безопасный следующий шаг — локальная инвентаризация и реализация mock-контракта. Compose, загрузка моделей и изменение инфраструктуры для этого не нужны.

## Проверка этой поставки

`python3 scripts/check_skeleton.py` проверяет обязательные файлы, локальные Markdown-ссылки и workspace manifests. Проверка не заменяет будущие TypeScript, integration, GPU и recovery tests. Проверка выполнена 2026-09-08: OK — 13 обязательных файлов, 17 Markdown-документов, 40 локальных ссылок, 8 workspace-пакетов. Compose проверен чтением; `docker compose config` не запускался. Приложения и GPU execution не тестировались, поскольку ещё не реализованы.

## Запись 90 — 2026-09-09

Исправлена регрессия в `PgJobRepository`: `getAsset` снова возвращает только AssetVersion, а `getJobResult` добавляет стабильный `job_id` для UI панели результата. Типизация проекта проходит (`npx tsc --noEmit`). Повторно подтверждены smoke-сценарии `smoke:job-result` и `smoke:job-catalog`; workflow profile smoke зарегистрирован под именем `smoke:workflow-profiles`.

Следующий производственный шаг: довести Result/Media Pool до полного provenance-потока (скачивание/предпросмотр CAS-asset по API, выбор финального take с идемпотентным повтором), затем проверить worker E2E с реальным H3 workflow после явного утверждения профиля.

## Запись 91 — 2026-09-09

Result и Media Pool получили прямые ссылки на immutable AssetVersion через `GET /v1/assets/:assetVersionId`: оператор может открыть или скачать CAS-файл, а выбор финального take остаётся отдельным явным действием. Веб-клиент собран через `npx vite build`; TypeScript-проверка прошла.

Дополнительно выполнен read-only preflight реального PVE ComfyUI: `/object_info` подтвердил наличие `MiniMaxH3ReferenceToVideo`, `RandomNoise` и `SaveVideo`. Контрактные smoke `runtime-health`, `h3-preflight`, `comfy-collect` и `comfy-cancel` прошли. Полный generation E2E ещё не запускался: нужен утверждённый production workflow с корректными model inputs и контролируемым output budget.

Проверен полный локальный smoke-набор из 27 сценариев: lifecycle/idempotency, fencing/lease/reconcile, CAS upload, H3 boundary/profile/revisions, reference bindings, Comfy submit/poll/collect/cancel, job result/final take, runtime health и worker E2E — все сценарии завершились `OK`.

Runtime health расширен capability-снимком ComfyUI: endpoint теперь сообщает найденные H3-классы (`capabilities.classes`) и флаг `capabilities.h3`, не ломая общий статус доступности при неполном payload `/object_info`. Типизация и `smoke:runtime-health` проходят.

Worker claim получил явную UUID-валидацию node id и совместимый локальный default UUID; некорректный идентификатор теперь даёт `400 INVALID_NODE_ID`, а штатный worker с `QWEN_NODE_ID=local` продолжает claim без ошибки. Проверено через TypeScript, `smoke:worker-e2e` и runtime health.

Живой контур проверен: node `00000000-0000-0000-0000-000000000001` зарегистрирован как `online`, worker-процесс запущен и claim при пустой очереди штатно возвращает `204`. Runtime API и оба backend-проверочных endpoint остаются доступными.

API перезапущен с явным `QWEN_STORAGE=postgres` (до этого живой процесс был memory-backed и скрывал profile routes). Одновременно исправлен локальный UUID node на корректный RFC 4122 v4 `00000000-0000-4000-8000-000000000001`; регистрация и claim теперь подтверждены через production storage, profile catalog отвечает `200`.

UI runtime health теперь показывает оператору capability H3 (`ready`/`incomplete`) рядом со статусом ComfyUI. Production-сборка веб-клиента после изменения прошла.

Скрипт `dev:api` теперь по умолчанию запускает PostgreSQL-backed storage (`qwendirector`), оставляя memory режим только при явном `QWEN_STORAGE=memory`; это предотвращает случайный запуск непроизводительного volatile-контура.

Полная проверка после перезапуска: `check_skeleton.py`, `check_domain_contract.py`, `npx tsc --noEmit`, profile preflight/job-source/revisions и PostgreSQL lifecycle — все `OK`. Read-only `/history` на PVE пока пуст, поэтому реальный H3 generation ещё не выполнялся и не выдаётся за завершённый E2E.

Read-only inventory PVE ComfyUI: версия `0.34.0`, PyTorch `2.12.1+cu130`, RTX 5090 с ~33.7 GB VRAM (свободно ~33.0 GB), очередь пуста. `/object_info` также показывает H3-специфичные `EmptyMiniMaxH3LatentAV`, `MiniMaxH3ReferenceToVideo`, `MiniMaxH3ImageToVideo` и memory-efficient attention nodes. Это подтверждает готовность runtime, но не заменяет утверждённый graph с CLIP/VAE/audio-VAE links.

Добавлен генератор portable starter graph `createH3StarterWorkflow()` с найденными на PVE Qwen/Minimax CLIP и video/audio VAE именами, latent AV и SaveVideo. Он предназначен для authoring и preflight; фактический submit намеренно не выполнялся до проверки конкретных link inputs и output budget.

Starter graph исправлен: добавлен обязательный `RandomNoise` и его link в H3 node. Новый `smoke:h3-starter` подтверждает прохождение boundary validator; TypeScript проходит.

Сверка starter с live `/object_info` показала точное совпадение обязательных входов H3 и SaveVideo; удалены неподтверждённые `latent`/`noise` поля из H3 inputs, чтобы candidate graph соответствовал фактической схеме PVE. Boundary node `RandomNoise` сохраняется как контрактный компонент до окончательной проверки production graph.

Команда `npm run preflight:h3-starter` успешно выполнила boundary + live PVE preflight без submit (`submit:false`). Она является безопасным gate перед утверждением профиля; запуск GPU generation по-прежнему не выполнен.

Импортирован пользовательский `/home/la6/Downloads/video_minimax_h3_r2v.json` (UI-format) в API-format profile `video-minimax-h3-r2v`. Live `/prompt` диагностика выявила отсутствующий `SetNode`, затем отсутствующий `CreateVideo.fps`; профиль последовательно исправлен до revision 3, preflight прошёл. Создана и approved реальная job `6ff28d87-b827-45d3-941d-a81365a7ad78`; worker claim успешен, PVE queue показывает `running=1`, job на момент записи остаётся `leased` (генерация продолжается).

После исправлений создана финальная approved job `6ff28d87-b827-45d3-941d-a81365a7ad78`: attempt `4be48d52-6eae-4fcb-8f66-5fb20589b51b` находится в `running`, heartbeat обновляется, PVE `/queue` показывает один running prompt. Это подтверждает реальный submit и исполнение graph; итоговый output ещё ожидается.

После длительного отсутствия прогресса job отменена через штатный `POST /v1/jobs/:id/cancel`: API вернул `cancel_requested`, затем job стала `cancelled`, а PVE queue вернулась к `0/0`. Это подтверждает рабочий cancel/recovery путь для реального Comfy execution; успешный output E2E не получен.

Диагностика live `/prompt` показала, что исходный run использовал 56 sampling steps и был слишком долгим. Профиль обновлён до revision 4 с включённым 4-step turbo LoRA (`minimax_h3_ref2v_turbo_4step...`) и теми же реальными model files. Новая approved job `4132c77d-ba19-406a-9f8e-3956aa9b49d4` claim’нута, PVE queue показывает running prompt `7a377174-997b-4cc2-aa39-6e3a443dabc8`; output ожидается.

Добавлен read-only `GET /v1/runtime/comfy-schema`: он отдаёт allowlisted фактические схемы `MiniMaxH3ReferenceToVideo`, `EmptyMiniMaxH3LatentAV`, `RandomNoise`, `SaveVideo`, `LoadImage`, `LoadAudio` для workflow authoring. Endpoint проверен mock smoke и живым PVE (все шесть классов найдены); API перезапущен с PostgreSQL storage.

Schema endpoint подключён к Vue UI: runtime health теперь показывает список доступных Comfy/H3 узлов, что помогает оператору собирать профиль по фактическому runtime-контракту. Веб-сборка прошла.

Live checkpoint подтверждён: `GET /v1/runtime/comfy-schema` возвращает шесть allowlisted классов, `/v1/runtime` сообщает `comfyui=true` и `llama.cpp=true`, `npx tsc --noEmit` проходит.

Добавлена транзакционная активация конкретной workflow-profile revision: `POST /v1/workflow-profiles/:id/revisions/:revision/activate`. Перед активацией выполняется H3 boundary validation; в profile snapshot копируются graph/hash/bindings ревизии и выставляется `active=true`. Типизация и история revisions проходят.

Добавлен `smoke:profile-revision-activate`: он проверяет через API и PostgreSQL, что активация revision атомарно обновляет active snapshot и совпадающий graph hash.
### 101. Реальный E2E turbo-прогон завершён
- Задание `4132c77d-ba19-406a-9f8e-3956aa9b49d4` завершилось `succeeded`; ComfyUI prompt `7a377174-997b-4cc2-aa39-6e3a443dabc8`, очередь пуста.
- Manifest и CAS AssetVersion созданы (`c9eb9421-20bd-40b7-bbf6-327fc4cf8b08`, SHA-256 `ba1bcbd614485045634ef36f0a2548ee4d37aed9a824d31310c48256ee0ea973`).
- Выявлена и исправлена нормализация MIME: SaveVideo в ComfyUI возвращает mp4 в поле `images`; теперь MIME определяется по расширению (`video/mp4` и др.). Worker перезапущен с исправлением.
- Исторический результат сохранён как есть; следующий прогон должен подтвердить `video/mp4` в новом manifest.

### 102. Зафиксирована регрессия MIME и обновлён статус продукта
- `ComfyPromptExecutor.collect` теперь определяет video MIME по расширению имени файла, включая случай ComfyUI `outputs.images[].filename=*.mp4`.
- `smoke:comfy-collect` расширен именно этим случаем; smoke и `npx tsc --noEmit` проходят.
- README синхронизирован с фактическим состоянием: production-oriented vertical slice и подтверждённый MiniMax H3 turbo E2E; hardening/backup/restore остаются следующими эксплуатационными этапами.

### 103. Добавлен локальный backup/verify контур
- `scripts/backup_local.mjs` создаёт custom-format `pg_dump`, перечисляет CAS-файлы и пишет manifest с размерами и SHA-256.
- `scripts/verify_backup.mjs` проверяет контрольную сумму dump перед восстановлением; команды доступны как `npm run backup:local` и `npm run backup:verify`.
- Практическая проверка на локальной PostgreSQL `qwendirector` выполнена во временном каталоге: dump создан, manifest проверен, найдено 2 CAS-файла.
- Восстановление намеренно не выполнялось поверх рабочей БД: следующий шаг — изолированный restore rehearsal в отдельную локальную БД/каталог и проверка ссылок AssetVersion.

### 104. Restore rehearsal подготовлен и проверен по доступам
- Добавлен `scripts/restore_rehearsal.mjs` (`npm run backup:restore-rehearsal`): уникальная временная БД, `pg_restore`, проверка числа public-таблиц и гарантированный cleanup.
- Backup и manifest verification проходят повторно.
- Фактическое создание временной БД остановлено правами текущего PostgreSQL-роли (`permission denied to create database`); рабочая БД не изменялась. Для полного restore-gate нужно один раз дать локальной backup-роли CREATEDB или выполнить rehearsal под административной ролью.

### 105. Backup теперь включает CAS и проверяет байты
- `backup_local.mjs` копирует CAS-объекты в backup-каталог, сохраняя относительные ключи, а не только их список.
- `backup:verify` сверяет dump и каждый скопированный CAS-файл по размеру и SHA-256.
- Повторная проверка текущего PostgreSQL backup прошла: database + 2 CAS records.

### 106. Полный регрессионный прогон после hardening
- Все 31 smoke-сценарий workspace завершились `OK`: API/repository/PostgreSQL, lifecycle/fencing/reconcile, CAS/AssetVersion, H3 profile/revisions/references, Comfy submit/poll/collect/cancel, runtime health и worker E2E.
- Production web build (`npm --workspace apps/web run build`) и domain contract check прошли.
- Это подтверждает отсутствие регрессий в основном контуре после изменений backup/CAS MIME; restore-rehearsal по-прежнему ждёт роли с `CREATEDB`.

### 107. Повторная попытка restore под системной ролью
- Проверено наличие `runuser`/`sudo`, но `sudo -n -u postgres` требует интерактивную аутентификацию; автоматическое изолированное восстановление из текущего пользователя невозможно.
- Рабочая PostgreSQL и CAS не изменялись. Команда rehearsal остаётся готовой для запуска оператором с локальной ролью `CREATEDB`.

### 108. Reference-план теперь проверяется на существование AssetVersion
- `POST /v1/director/jobs` с PostgreSQL проверяет каждый `references[].assetVersionId` до создания job; отсутствующий или дублирующийся объект даёт `REFERENCE_ASSET_NOT_FOUND` и откатывает транзакцию project/scene/shot/job.
- Контракт расширен явным типом `references`; typecheck, catalog и profile-job-source smoke проходят.

### 109. Добавлен dry-run отчёт CAS retention/GC
- `scripts/cas_gc_report.mjs` (`npm run cas:gc-report`) сравнивает CAS-объекты с `asset_versions.storage_key` через PostgreSQL и выводит только кандидатов на удаление.
- Фактический локальный отчёт: 2 объекта просканировано, 1 referenced, 1 orphan; удаление не выполняется.

### 110. Ошибки reference-плана возвращаются как клиентские
- `REFERENCE_ASSET_NOT_FOUND` и `INVALID_REFERENCE_PLAN` теперь отображаются API как `400`, а не как внутренняя ошибка `500`; транзакция по-прежнему откатывается.
- `npx tsc --noEmit` проходит.

### 111. Добавлен операторский список worker-узлов
- PostgreSQL node repository получил `list()`, API — `GET /v1/nodes` с id, instance, capabilities, status и heartbeat timestamp.
- Это закрывает read-side для runtime/recovery UI; typecheck проходит. Живой API-процесс потребует обычного перезапуска для публикации нового маршрута.

### 112. Node recovery read-side опубликован и проверен live
- API перезапущен с `GET /v1/nodes` и `POST /v1/admin/nodes/reconcile?staleSeconds=N`.
- Live-проверка пометила 2 просроченных узла как `stale`, оставив heartbeat активного worker `online`; список подтвердил оба статуса.
- Это даёт оператору явный механизм обнаружения потерянных workers без освобождения ресурсов только по локальному таймауту.

### 113. Worker recovery-состояние отображается в UI
- Веб-клиент загружает `GET /v1/nodes` и показывает instance/status worker рядом с runtime health, включая stale-состояния и ручное обновление.
- Production web build и `npx tsc --noEmit` проходят.

### 114. Добавлен migration sequence gate
- `scripts/check_migrations.mjs` (`npm run check:migrations`) проверяет contiguous numbering SQL-миграций до rollout.
- Live workspace содержит 11 последовательных миграций `001_init.sql`–`011_job_selected_outputs.sql`; проверка и typecheck проходят.

### 115. Разделены liveness и readiness API
- Добавлен `GET /ready`: он проверяет локальные ComfyUI `/system_stats` и llama.cpp `/health`, возвращая `200 ready` или `503 not_ready` с деталями checks.
- Живой API перезапущен и подтвердил `200 ready` при доступных обоих backend’ах; `/health` остаётся отдельным liveness endpoint.

### 116. Readiness fail-closed покрыт smoke
- Добавлен `smoke:readiness`: при недоступном llama.cpp или ComfyUI `/ready` возвращает `503 not_ready`.
- Smoke и `npx tsc --noEmit` проходят.

### 117. Readiness включает persistence
- `PgAttemptRepository.ready()` и memory-эквивалент добавлены; `/ready` теперь проверяет ComfyUI, llama.cpp и PostgreSQL (`select 1`).
- API перезапущен; live response `200 ready` содержит три checks, включая `storage`.
- TypeScript-проверка проходит.

### 118. Синхронизирована эксплуатационная документация
- `docs/operations.md` больше не называет систему «только каркасом»: зафиксированы подтверждённые локальные endpoints API/llama.cpp/ComfyUI, PostgreSQL/CAS, readiness и H3 E2E.
- Незавершённые hardening-операции (ручной backup/verify, GC, restore с CREATEDB) явно отмечены как такие.
- `check_skeleton.py`, `check:migrations` и `smoke:readiness` проходят.

### 119. Live контроль после рестарта API
- `/ready` вернул `200 ready` по ComfyUI, llama.cpp и PostgreSQL.
- `/v1/nodes` подтвердил один активный worker `online` с обновляемым heartbeat и два исторических узла `stale`.
- `cas:gc-report` повторно показал 2 CAS-объекта, 1 referenced и 1 orphan-кандидат; удаление не выполнялось.

### 120. Backup verifier получил security-gate
- `backup:verify` проверяет `schemaVersion`, обязательные секции manifest и запрещает traversal/absolute пути CAS перед чтением файлов.
- Повторный backup + verify прошёл: database + 2 CAS records; typecheck проходит.

### 121. CAS key digest проверяется при verify
- `backup:verify` сверяет digest байтов, manifest и 64-hex content-addressed имя объекта.
- Повторная проверка backup прошла; некорректный CAS path/hash теперь отвергается до restore.

### 122. Live reference rollback проверен
- На живом PostgreSQL отправлен director job с несуществующим AssetVersion UUID.
- API вернул `400 {code: REFERENCE_ASSET_NOT_FOUND}`; транзакционный путь не поставил job в очередь и не запустил worker.

### 123. Quick-start синхронизирован с production gates
- README получил команды `check:migrations`, `/ready`, `backup:local`, `backup:verify` и `cas:gc-report` с пояснением liveness/readiness и dry-run semantics.
- `check_skeleton.py` подтверждает 19 Markdown-документов и 43 локальные ссылки.

### 124. Добавлена опциональная bearer-аутентификация API
- При `QWEN_API_TOKEN` все маршруты защищены заголовком `Authorization: Bearer ...`; `/health` и `/ready` оставлены доступными для probes.
- Без переменной сохраняется local-dev поведение.
- `smoke:api-auth` и `npx tsc --noEmit` проходят.

### 125. Security-настройка добавлена в конфигурационный runbook
- `.env.example` и `docs/operations.md` документируют `QWEN_API_TOKEN`, запрет размещения токена в логах/plan snapshots и ограничение LAN-доступа без токена.

### 126. Добавлен operator ingest для Media Pool
- `POST /v1/assets/import` принимает локальный base64-файл, SHA-256, MIME и actor; создаёт immutable AssetVersion с provenance `operator-import` без фальшивой attempt.
- Повторяющийся SHA идемпотентно возвращает существующий AssetVersion; storage использует тот же CAS commit/hash gate.
- Live PostgreSQL smoke импортировал `reference-smoke.txt`, API ответил `201`; typecheck и skeleton check проходят.

### 127. Media Pool ingest подключён к UI
- В веб-клиенте появился file input: SHA-256 считается через Web Crypto, файл отправляется в `/v1/assets/import`, затем глобальный Media Pool обновляется без перезагрузки страницы.
- Загруженные AssetVersion доступны для выбора как references при создании H3 job.
- Production web build и `npx tsc --noEmit` проходят.

### 128. Исправлена snake_case/camelCase граница Media Pool
- Live API `GET /v1/assets` возвращает PostgreSQL snake_case поля; UI теперь принимает оба представления для storage key, MIME и byte size.
- Повторная live-проверка подтвердила импортированный AssetVersion: binary endpoint отвечает `200`, content-type и `x-content-sha256` совпадают с записью.
- Web build и typecheck проходят.

### 129. Reference MIME проверяется до постановки job
- PostgreSQL `createDirector` теперь сверяет `references[].type` с MIME AssetVersion (`image/*`/`audio/*`), возвращая `REFERENCE_MIME_MISMATCH` до worker submit.
- Live-проверка с text asset, заявленным как audio, вернула `400`; typecheck и catalog smoke проходят.

### 130. Live ingest идемпотентен по SHA-256
- Две последовательные загрузки одного reference через `/v1/assets/import` вернули один и тот же AssetVersion `9c231bee-6bfd-4190-ab1c-d5ff665d7663`.
- Дубликаты CAS/AssetVersion не создаются; это подтверждено непосредственно на PostgreSQL API.

### 131. CAS GC учитывает grace period
- `cas:gc-report` получил `CAS_GC_GRACE_SECONDS` (по умолчанию 24 часа) и исключает свежие orphan-объекты; eligible-кандидаты содержат age/mtime.
- Live dry-run с grace `0` показал 3 объекта, 2 referenced и 1 старый eligible orphan; удаления нет.

### 132. Ошибочные CAS uploads очищают staging
- `AssetStorage` получил optional `discardStaging`; Filesystem implementation удаляет только staging-ключи.
- PostgreSQL attempt upload и operator import вызывают cleanup при ошибке записи или SHA mismatch, предотвращая накопление мусора.
- Typecheck, `smoke:storage` и `smoke:asset-upload` проходят.

### 133. SHA mismatch очищается самим CAS storage
- `FilesystemAssetStorage.commitStaging` теперь удаляет staging-файл непосредственно при `SHA256_MISMATCH`; repository-level cleanup остаётся защитным дублем.
- `smoke:storage` проверяет отсутствие файла после ошибочного commit; smoke и typecheck проходят.

### 134. Live operator import integrity gate
- Operator import с заведомо неверным SHA вернул `400 {code: SHA256_MISMATCH}` и не создал AssetVersion/CAS object.
- В staging обнаружен один ранее оставшийся файл от доисправительного прогона; автоматическое удаление исторического staging намеренно не выполнялось.

### 135. Добавлен staging retention dry-run
- `scripts/staging_gc_report.mjs` (`npm run staging:gc-report`) перечисляет staging-файлы старше `STAGING_GC_GRACE_SECONDS` (24 часа по умолчанию), не удаляя их.
- Live dry-run с grace `0` обнаружил один старый staging-файл от ошибочного прогона; API перезапущен с cleanup-исправлением.

### 136. Live readiness после рестарта API
- `/ready` снова вернул `200 ready` по ComfyUI, llama.cpp и PostgreSQL.
- `/v1/nodes` подтвердил активный worker `00000000-0000-4000-8000-000000000001` в `online` с актуальным heartbeat; stale-узлы не участвуют в claim.

### 137. Регрессия после Media Pool/security hardening
- Контрольный набор прошёл: PostgreSQL lifecycle, CAS upload, H3 profile/reference injection, worker E2E, readiness fail-closed, API bearer auth и migration sequence.
- Все 7 сценариев завершились `OK`; текущий кодовый срез не имеет регрессий по этим критическим границам.

### 138. Финальный контрольный прогон текущего среза
- `check_skeleton.py`, migration gate, web build, TypeScript, PostgreSQL smoke, worker E2E и readiness smoke завершились успешно.
- Документация и runtime-контракты согласованы; production hardening остаётся ограничен restore rehearsal с ролью `CREATEDB` и будущими нагрузочными измерениями.

### 139. Добавлен local-first metrics endpoint
- API публикует `/metrics` в Prometheus text format с `qwendirector_http_requests_total` и `qwendirector_http_errors_total`; внешняя телеметрия не включается.
- Endpoint оставлен публичным для probes даже при `QWEN_API_TOKEN`.
- Live API вернул корректные counters; typecheck и readiness smoke проходят.

### 140. Metrics contract покрыт smoke
- `smoke:metrics` проверяет Prometheus content-type и оба счётчика без внешних сервисов.
- Smoke и `npx tsc --noEmit` проходят.

### 141. Backup catalog preflight добавлен
- `scripts/verify_backup_catalog.mjs` (`npm run backup:catalog-check`) читает `pg_restore --list` без создания БД и проверяет наличие 9 ключевых production-таблиц.
- Новый backup snapshot прошёл: manifest/CAS verify и catalog check `OK`; полноценный restore по-прежнему требует роли `CREATEDB`.

### 142. Backup/retention порядок добавлен в README
- Quick-start теперь показывает последовательность `backup:local` → `backup:verify` → `backup:catalog-check` и отдельные dry-run отчёты CAS/staging GC.
- `check_skeleton.py` подтвердил корректность локальных ссылок документации.

### 143. Live process/readiness checkpoint
- API process работает с PostgreSQL-backed конфигурацией; `/ready` вернул `200` по ComfyUI, llama.cpp и storage.
- `/metrics` показал 312 запросов и 0 ошибок 5xx на текущем процессе.
- `/v1/nodes` подтвердил активный worker `online` с heartbeat `2026-09-09T14:03:36Z`.

### 144. Устранён дублирующий worker process
- Обнаружены два процесса с одним `nodeId/instanceId`; старый экземпляр остановлен по точным PID, актуальный worker оставлен.
- После cleanup heartbeat активного узла продолжил обновляться, статус `online`; fencing и node ownership остаются защитой от повторной доставки.

### 145. Regression после worker cleanup
- CAS cleanup, API asset upload, bearer auth, Prometheus metrics и migration gate завершились `OK`.
- После остановки старого worker критические storage/security проверки не деградировали.

### 146. Ограничен размер operator import
- `/v1/assets/import` отклоняет payload больше `QWEN_MAX_IMPORT_BYTES` (по умолчанию 100 MiB) до staging/CAS записи с кодом `ASSET_IMPORT_TOO_LARGE`.
- Typecheck и API auth smoke проходят; лимит документирован через переменную окружения в runtime-контракте.

### 147. Лимит ingest добавлен в env example
- `.env.example` теперь содержит `QWEN_MAX_IMPORT_BYTES=104857600`; `check_skeleton.py` подтверждает целостность документации.

### 148. API body limit согласован с Media Pool ingest
- Fastify `bodyLimit` вычисляется из `QWEN_MAX_IMPORT_BYTES` (до 256 MiB, default 200 MiB), чтобы parser не обрывал допустимый base64 import раньше route-level проверки.
- Typecheck, auth/readiness smoke проходят; API перезапущен с новым лимитом.

### 149. Live checkpoint после body-limit hardening
- `/ready` вернул `200 ready` по трём checks, `/metrics` — 24 запроса и 0 ошибок 5xx.
- Активный worker heartbeat обновляется (`14:07:06Z`), stale-узлы остаются исключены.

### 150. Media Pool ingest описан в operator runbook
- `docs/operations.md` фиксирует `/v1/assets/import`, лимит `QWEN_MAX_IMPORT_BYTES`, hash-before-promotion, SHA idempotency, staging cleanup и grace-period GC.

### 151. Финальная проверка документации и hardening
- `check_skeleton.py`, TypeScript, storage cleanup, API auth, metrics и readiness smoke завершились `OK`.
- Текущий live API и активный worker остаются пригодны для дальнейшего restore rehearsal/нагрузочных измерений.

### 152. Job lifecycle regression после API hardening
- API lifecycle, job result/final take и reconcile-resolve smoke завершились `OK` после auth hook/body-limit изменений.
- Idempotency, approval, cancel и operator reconcile не изменили контракт.

### 153. Worker bearer auth интегрирован end-to-end
- Worker поддерживает `QWEN_API_TOKEN` на claim, register/heartbeat, reference fetch и execution hooks (asset upload/commit/fail).
- Typecheck и worker E2E smoke проходят; worker перезапущен с актуальным транспортом.

### 154. Worker auth transport покрыт smoke
- `smoke:worker-auth` проверяет, что claim-запрос worker отправляет `Authorization: Bearer ...` при заданном токене.
- Smoke и `npx tsc --noEmit` проходят.

### 155. Worker/API regression после auth интеграции
- `smoke:worker-auth`, `smoke:worker-e2e`, `smoke:api` и migration gate завершились `OK`.
- Bearer auth не нарушил claim → execution → CAS commit и базовый job lifecycle.

### 156. Timing-safe bearer token comparison
- API auth сравнивает bearer header через `timingSafeEqual` после проверки длины, исключая обычное раннее строковое сравнение.
- `smoke:api-auth` и TypeScript-проверка проходят.

### 157. Исправлены systemd templates
- API получил явный `start` script; systemd examples больше не ссылаются на отсутствующие `dist/index.js`, а запускают workspace start через `env npm`.
- В шаблонах оставлена пометка заменить npm path под фактическую Node installation; `.env` общий для API и worker, включая `QWEN_API_TOKEN`.
- Typecheck и skeleton check проходят.

### 158. Защита от duplicate online worker добавлена в schema
- Миграция `012_unique_online_worker_instance.sql` добавляет partial unique index на `nodes.instance_id` для `status='online'`.
- Один instance не сможет зарегистрировать два online-узла; stale-история сохраняется.
- Перед применением миграции нужен обычный migration gate/backup, как для остальных schema changes.

### 159. Миграция duplicate-worker применена локально
- Preflight подтвердил отсутствие duplicate `online` instance; `012_unique_online_worker_instance.sql` применена к `qwendirector`.
- Индекс `one_online_worker_instance` найден в `pg_indexes`; активный worker heartbeat продолжил обновляться.

### 160. Migration/recovery checkpoint
- `check:migrations` подтвердил 12 последовательных миграций до `012_unique_online_worker_instance.sql`.
- Live `/ready` вернул `200`, активный node остаётся `online`, heartbeat обновляется; stale nodes не получают claims.

### 161. Duplicate online instance отклоняется live
- Попытка зарегистрировать второй UUID с `instance_id=local-qwen` отклонена API `409` по индексу `one_online_worker_instance`.
- Дубликат online node не создан; текущий worker продолжил heartbeat.

### 162a. Backup после миграции 012
- Новый PostgreSQL backup после применения unique-online index прошёл `backup:verify` (database + 3 CAS records) и `backup:catalog-check` (9 обязательных таблиц).

### 162. Стабилизирован node registration error contract
- PostgreSQL unique violation для duplicate online instance преобразуется в `NODE_INSTANCE_ALREADY_ONLINE`.
- Live API теперь возвращает `409` со стабильным кодом вместо сырого текста constraint; typecheck и auth smoke проходят.

### 163. Live node constraint checkpoint
- После стабилизации registration contract `/ready` вернул `200 ready`, активный worker heartbeat обновляется (`14:17:47Z`), stale nodes не участвуют в claim.
- Migration gate подтвердил 12 последовательных миграций.

### 164. Контрольный срез после hardening
- Live `/ready` снова подтвердил доступность ComfyUI, llama.cpp и PostgreSQL; активный `local-qwen` node остаётся `online`, старый экземпляр — `stale`.
- `check:migrations` подтвердил непрерывную цепочку 001..012.
- Регрессионные smoke-проверки bearer auth API/worker, Prometheus metrics и fail-closed readiness прошли успешно.

### 165. Backup и безопасная очистка CAS проверены
- Создан новый локальный backup `.data/backups/2026-09-09T14-20-50.609Z`; manifest/hash и каталог PostgreSQL прошли проверку (9 обязательных таблиц, 3 CAS-файла).
- CAS и staging GC работают только в dry-run: при grace 24 часа удаляемых объектов нет.
- Restore rehearsal по-прежнему требует роли PostgreSQL с `CREATEDB`; production-база не затрагивалась.

### 166. Сквозной regression smoke-пакет
- Успешно прошли проверки project/scene/shot catalog, job catalog, workflow profiles и revisions/activation.
- Успешно прошли H3 references/starter, failure lifecycle, lease reconcile/resolution и final-take selection.
- Это подтверждает сохранение ключевых инвариантов после auth, migration и backup hardening.

### 167. Воспроизводимая production-сборка web
- В `apps/web/package.json` добавлены команды `build` и `typecheck`.
- `vite build` и TypeScript-проверка прошли успешно; production bundle собран в `apps/web/dist`.

### 168. Единый проверочный entrypoint
- В корневой пакет добавлены `typecheck` и `build:web`, объединяющие проверку Node/API/worker и web.
- Команды выполнены успешно; сборка и типы теперь проверяются одной reproducible-командой CI/оператора.

### 169. Release-check без внешних сервисов
- Добавлен `npm run check:release` (`scripts/check_release.mjs`): typecheck, web build, migration gate, domain и skeleton contracts.
- Проверка успешно проходит локально и не требует запуска GPU/ComfyUI, поэтому пригодна для CI перед поставкой.

### 170. Локальный production preview
- Для web добавлена команда `npm --workspace apps/web run preview`, поднимающая собранный bundle на loopback (`127.0.0.1`).
- `check:release` повторно прошёл после изменения packaging.

### 171. Systemd-контур интерфейса
- Добавлен шаблон `deploy/systemd/qwendirector-web.service.example` для запуска собранного web UI через systemd user unit.
- Операционная документация обновлена: перед включением unit требуется `npm run build:web`; release-check прошёл повторно.

### 172. Живой H3 backend checkpoint
- `smoke:h3-preflight` и `smoke:comfy-schema` прошли на текущем PVE ComfyUI.
- `probe:backends` подтвердил llama.cpp с моделью `qwen3.5-9b-defiant-mtp-q5km` и ComfyUI `0.34.0` с доступным RTX 5090 (`cuda:0`).

### 173. Повторная проверка H3 starter на live backend
- `preflight:h3-starter` успешно сопоставил starter workflow с live schema ComfyUI и подтвердил узлы MiniMax H3, RandomNoise и SaveVideo.
- Backend capability inventory получен без постановки задания в очередь; GPU-состояние не изменялось.

### 174. Проверен runtime web preview
- Собранный интерфейс запущен через `npm --workspace apps/web run preview` на loopback `127.0.0.1:4173`.
- HTTP smoke подтвердил `200 OK` и выдачу index/assets; процесс после проверки остановлен.

### 175. Авторизация web-клиента
- UI получил поле API token с локальным сохранением и общей fetch-обёрткой, автоматически добавляющей `Authorization: Bearer` ко всем API-запросам.
- Typecheck и production build прошли успешно; без токена loopback-dev продолжает работать как прежде.

### 176. Финальный regression после UI auth
- `check:release`, API/worker auth smoke и fail-closed readiness прошли повторно.
- Live `/ready` остаётся `ready`: ComfyUI, llama.cpp и PostgreSQL отвечают штатно.

### 177. Защита non-loopback запуска
- API теперь отказывается стартовать на non-loopback host без `QWEN_API_TOKEN` (`QWEN_API_TOKEN_REQUIRED_FOR_NON_LOOPBACK`).
- Это предотвращает случайную публикацию незащищённого API; typecheck и auth smoke прошли.

### 178. Регрессионный тест bind guard
- Добавлен `smoke:api-bind-guard`, проверяющий отказ старта на `0.0.0.0` без токена.
- Smoke прошёл успешно; security-инвариант закреплён автоматической проверкой.

### 179. Security включён в release gate
- `check:release` теперь включает `smoke:api-bind-guard`; полный release-check прошёл успешно.
- Поставка блокируется, если non-loopback API может стартовать без bearer-токена.

### 180. Web/API proxy для production preview
- Добавлен `apps/web/vite.config.ts` с proxy `/v1`, `/health`, `/ready`, `/metrics` на `QWEN_API_PROXY_TARGET` (по умолчанию `127.0.0.1:4310`) для dev и preview.
- Проверено live: `http://127.0.0.1:4173/ready` вернул `ready`, то есть UI-origin корректно видит API.

### 181. Proxy закреплён release smoke
- Добавлен `smoke:web-proxy`; он проверяет наличие всех API-маршрутов в server/preview proxy.
- Smoke включён в `check:release`, полный gate прошёл успешно.

### 182. Profile/job source regression
- H3 profile snapshot, profile preflight и построение ComfyUI job из активного profile прошли после proxy/auth hardening.
- Это подтверждает, что immutable workflow path не зависит от packaging-изменений.

### 183. Durable jobs/CAS regression
- PostgreSQL claim→heartbeat→manifest→commit, filesystem CAS, API upload и worker E2E прошли.
- Comfy timeout/interrupt, result API, final-take selection и runtime health прошли.

### 184. Проверен пользовательский ComfyUI workflow reference
- Добавлен `npm run inspect:workflow -- <file>` для проверки UI-format и prompt-format JSON по H3 boundary.
- Файл `/home/la6/Downloads/video_minimax_h3_r2v.json` распознан как ComfyUI UI workflow (30 nodes): ровно по одному `MiniMaxH3ReferenceToVideo`, `RandomNoise` и `SaveVideo`.

### 185. Inspector покрывает оба формата ComfyUI
- На synthetic API prompt JSON inspector подтвердил тот же H3 boundary (3 nodes).
- После проверки временный fixture удалён; `check:release` прошёл полностью.

### 186. Production gates documented end-to-end
- README обновлён: release-check, live readiness, backup creation with captured directory, verification/catalog и dry-run GC теперь указаны воспроизводимыми командами.
- Проверка release gate после обновления документации прошла успешно.

### 187. Roadmap audit checkpoint
- Release gate, PostgreSQL durable lifecycle, worker CAS E2E и H3 references снова прошли.
- Неподтверждёнными остаются только инфраструктурные требования roadmap: restore с `CREATEDB`, измеренные RPO/RTO, второй физический worker, quotas/retention и fault/load drills.
- Эти пункты явно оставлены открытыми; production-ready статус целиком пока не объявляется.

### 188. Pending jobs quota
- Для PostgreSQL director jobs добавлен ограничитель `QWEN_MAX_PENDING_JOBS` (0 = без ограничения); превышение возвращает HTTP 429 `JOB_QUOTA_EXCEEDED` до создания project/scene/shot.
- Значение добавлено в `.env.example`; typecheck, API lifecycle и PostgreSQL smoke прошли.

### 189. Quota hardening regression
- После добавления quota общий `check:release`, PostgreSQL durable lifecycle и failure lifecycle прошли повторно.
- Ограничение не изменяет state machine и не затрагивает существующие terminal jobs.

### 190. Quota config fail-closed
- `QWEN_MAX_PENDING_JOBS` теперь принимает только целое неотрицательное значение; ошибочная конфигурация даёт `INVALID_JOB_QUOTA_CONFIG`, а не отключает лимит молча.
- Typecheck и PostgreSQL lifecycle smoke прошли.

### 191. Quota default regression
- При штатном `QWEN_MAX_PENDING_JOBS=0` полный `check:release` прошёл: ограничение отключено явно, без побочных изменений.

### 192. Release/live readiness checkpoint
- `check:release` и live `/ready` одновременно прошли: web/API packaging, security, migrations и domain contracts зелёные; ComfyUI, llama.cpp и PostgreSQL доступны.

### 193. Recovery artifact checkpoint
- Создан backup `.data/backups/2026-09-09T14-35-08.383Z`; manifest/CAS hash verification и catalog check (9 таблиц) прошли.
- CAS GC dry-run при grace 24 часа не обнаружил eligible orphan; recovery-артефакты не повреждены.

### 194. Quota runbook
- `docs/operations.md` дополнен описанием `QWEN_MAX_PENDING_JOBS`, ответа 429 и fail-closed конфигурации.

### 195. Migration runbook
- В `docs/operations.md` добавлена безопасная последовательность миграций: pause claims → migration gate → backup → apply → повторная проверка и smoke.
- Автоматический rollback поверх рабочей БД явно запрещён; release gate после изменения документации прошёл.

### 196. Restore preflight command
- Добавлен `npm run backup:restore-preflight`; он показывает текущую роль, `CREATEDB` и готовность restore rehearsal без попытки изменить БД.
- На текущем окружении результат явно `requires-admin-role` (`la6`, `CREATEDB=false`).

### 197. Пауза разработки и обсуждение Kadr

- По явному запросу пользователя разработка поставлена на паузу; текущая задача — обсуждение объединения с Kadr.
- Анализ и предложение сохранены в [kadr-integration.md](kadr-integration.md), ссылка добавлена в README.
- Рекомендуемое направление: Kadr как монтажное рабочее место, QwenDirector как сервис генерации/PVE и provenance; сначала проверить обмен ассетами, затем рассмотреть встроенную панель.
- Решение о реализации не принято. Код, зависимости, БД и работающие сервисы в рамках документирования не изменялись.
- Прежние заявления о том, что остались только инфраструктурные гейты, скорректированы: продуктовые и интеграционные пробелы также остаются. Commit Kadr и runtime-совместимость ещё требуют проверки.
- Далее обсуждать целевой UX и границы интеграции; разработку возобновлять по указанию пользователя. Проверка этого изменения: наличие Markdown-документа и разрешение добавленных локальных ссылок.

### 198. Явное управление каталогом
- Добавлены PostgreSQL-операции и API `POST /v1/projects`, `POST /v1/projects/:projectId/scenes`, `POST /v1/scenes/:sceneId/shots`; позиции вычисляются транзакционно, принадлежность project/scene проверяется, ошибки возвращают 4xx.
- Добавлен `npm run smoke:catalog-mutation`: создание project → scene → shot, чтение и отрицательный сценарий проходят; `npm run typecheck` также зелёный.

### 199. Catalog UX в web
- В Vue UI добавлены формы создания project, scene и shot до генерации job; новые записи сразу обновляют catalog/timeline, shot связывается с выбранной сценой.
- Проверки: `npm run typecheck`, `npm run build:web`, `npm run smoke:catalog-mutation` прошли.

### 200. Переименование каталога
- Добавлены PATCH-маршруты для переименования project/scene/shot. Для shot увеличение `plan_revision` фиксирует изменение режиссёрского объекта и предотвращает незаметное переиспользование старого плана.
- Smoke каталога расширен проверкой трёх PATCH и чтением обновлённой иерархии; typecheck прошёл.

### 201. Catalog rename UI
- В timeline/catalog UI добавлены действия Rename для project, scene и shot; после успешного PATCH данные перечитываются, а клик по кнопке не меняет выбор shot.
- `npm run typecheck` и `npm run build:web` прошли.

### 202. Выбор пустой сцены
- Timeline позволяет выбрать сцену по заголовку, включая сцену без шотов; форма создания shot использует выбранную сцену. После загрузки timeline первая сцена выбирается автоматически только если выбор ещё не задан.
- `npm run typecheck` и `npm run build:web` прошли.

### 203. Shot timing revision
- Добавлено обязательное поле `shots.duration_seconds` (migration 013, default 5 секунд, positive constraint). PATCH shot теперь может менять название и длительность, при этом увеличивает `plan_revision`; timeline возвращает `durationSeconds`.
- Migration применена к локальной БД и проверена; `check:migrations`, typecheck и catalog mutation smoke прошли.

### 204. Timing edit в UI
- Действие Edit shot теперь изменяет название и длительность через один PATCH; timeline показывает длительность в секундах и текущую plan revision.
- `npm run typecheck`, `npm run build:web`, `npm run smoke:catalog-mutation` прошли.

### 205. Release regression после catalog UX
- Полный `npm run check:release` прошёл: typecheck, web build, migration/domain/skeleton gates, API bind guard и web proxy.

### 206. Backend probe
- `npm run probe:backends` выполнен без запуска сервисов: текущая сессия не видит llama.cpp `127.0.0.1:8081` и PVE ComfyUI `192.168.10.103:8188` (оба `fetch failed`). Реальный H3 E2E в этой сессии не запускался; требуется поднять/пробросить backend-ы и повторить readiness + worker E2E.

### 207. Release gate после timing schema
- Catalog mutation smoke дополнительно проверяет сохранение `durationSeconds`; `npm run smoke:catalog-mutation` и полный `npm run check:release` прошли.

### 208. Job без дублирования каталога
- `POST /v1/director/jobs` принимает `projectId/sceneId/shotId`; при полном наборе сервер транзакционно проверяет иерархию и не создаёт дубликаты. UI передаёт выбранные IDs из catalog; неполный набор отклоняется.
- Typecheck, web build и полный release gate прошли.

### 209. Reuse integration smoke
- Catalog mutation smoke теперь создаёт job с существующими `projectId/sceneId/shotId` и сверяет counts до/после; проверка подтверждает отсутствие дубликатов и корректную очистку тестовых данных.

### 210. Catalog IDs в provenance
- Compiled job plan теперь содержит immutable `catalog.projectId/sceneId/shotId`; smoke сверяет сохранённые IDs с исходным каталогом.
- `npm run typecheck`, `npm run smoke:catalog-mutation`, `npm run check:release` прошли.

### 211. Director idempotency groundwork
- `PgJobRepository.createDirector` принимает опциональный `idempotencyKey`; для существующего shot повтор с тем же ключом и request hash возвращает replay, а изменённое содержимое даёт `IDEMPOTENCY_CONFLICT`. Это подготовлено для безопасного повторного submit UI; полноценный live E2E требует доступных backend-ов.
- Typecheck и release gate прошли.

### 212. UI idempotent submit
- Web форма теперь передаёт стабильный `idempotencyKey` для выбранного shot и prompt, используя серверный replay/conflict контур при повторной отправке.
- `npm run typecheck` и `npm run build:web` прошли.

### 213. Idempotency failure smoke
- Catalog smoke проверяет retry replay и изменённый request с тем же ключом (`409 IDEMPOTENCY_CONFLICT`); после исправления mapping ошибок smoke и полный release gate прошли.

### 214. Canonical job digests
- Plan и request hash в `PgJobRepository.createDirector` теперь вычисляются канонической JSON-сериализацией с сортировкой ключей. Это устраняет зависимость digest от порядка полей и укрепляет immutable provenance/idempotency.
- Typecheck, catalog smoke и release gate прошли.

### 215. Reordered-payload idempotency
- Smoke дополнительно отправляет семантически тот же payload с другим порядком JSON-полей; canonical hash корректно возвращает replay. Полный release gate остаётся зелёным.

### 216. Live queue refresh
- Web UI обновляет jobs, runtime health и worker nodes каждые 5 секунд и очищает interval при unmount; изменения от worker/оператора видны без ручного обновления.
- `npm run typecheck` и `npm run build:web` прошли.

### 217. Durable PostgreSQL regression
- Независимый durable lifecycle повторно проверен: claim → heartbeat → immutable manifest → commit; `npm run smoke:postgres` прошёл при недоступных GPU backend-ах.

### 218. Worker/CAS regression
- Mock worker E2E повторно прошёл: HTTP hooks → CAS upload → AssetVersion → enriched manifest. GPU backend не требуется для проверки fencing/provenance связки.

### 219. Recovery/runtime regression
- Повторно прошли `smoke:reconcile`, `smoke:reconcile-resolve` и `smoke:runtime-health`: истёкший lease переводится в unknown/reconciling, операторское решение сохраняет manifest, runtime snapshot корректно агрегирует проверки.

### 220. Workflow/reference regression
- Повторно прошли history/transactional activation workflow profiles и H3 reference bindings injection; immutable revisions и подключение references к graph boundary подтверждены.

### 221. Auth regression
- Повторно прошли `smoke:api-auth` и `smoke:worker-auth`: bearer authentication корректно защищает API и worker claim endpoint, при этом loopback-dev режим сохраняет совместимость.

### 222. Failure/interrupt regression
- Повторно прошли failure lifecycle, ComfyUI timeout и interrupt contract: ошибка attempt корректно завершает job, polling timeout не зависает, cancel отправляет interrupt и обрабатывает контракт ответа.

### 223. Result/final-take regression
- Повторно прошли `smoke:job-result`, `smoke:select-output`, `smoke:job-catalog`: manifest и AssetVersions доступны, оператор может выбрать только связанный final take, capability boundary каталога соблюдается.

### 224. H3 starter preflight
- `smoke:h3-starter` прошёл и подтверждает boundary starter workflow. `preflight:h3-starter` не может завершиться: PVE `192.168.10.103:8188` недоступен (`EHOSTUNREACH`); schema smoke после preflight не запускался.

### 225. Runtime restored
- После запуска пользователем llama.cpp и ComfyUI: `/v1/ready` вернул `ready`, `probe:backends` подтвердил llama model `qwen3.5-9b-defiant-mtp-q5km`, ComfyUI 0.34.0 на RTX 5090; live `preflight:h3-starter` успешно обнаружил H3 nodes/boundary. Генерационный submit намеренно не запускался без явного job-подтверждения.

### 226. Reference availability
- ComfyUI `/view` подтвердил наличие обоих входных файлов пользовательского workflow: `bw-intro.jpg` и `bw-intro-1.jpg` (HTTP 200). Это снимает последний вопрос о доступности references; submit H3 job остаётся отдельным GPU-затратным действием.

### 227. Backup и CAS dry-run на текущем runtime
- Создан отдельный локальный backup-каталог `.data/backups/session-20260909T162800Z`: PostgreSQL custom dump и 3 CAS-файла.
- `backup:verify` подтвердил checksum dump и SHA-256 каждого CAS-объекта; `backup:catalog-check` подтвердил 9 обязательных таблиц каталога/очереди.
- `cas:gc-report` просканировал 3 объекта, 2 ссылки из AssetVersion и 0 eligible orphan; `staging:gc-report` также показал 0 кандидатов. Ничего не удалялось.
- Restore rehearsal в отдельную БД по-прежнему требует роли PostgreSQL с `CREATEDB`; рабочая БД не изменялась.

### 228. Restore rehearsal проверяет CAS-провенанс
- `scripts/restore_rehearsal.mjs` теперь после `pg_restore` читает все `AssetVersion.storage_key/sha256`, находит соответствующие объекты в backup CAS и пересчитывает SHA-256.
- Некорректный путь или рассогласование checksum завершают rehearsal с явной ошибкой; успешный результат включает число проверенных CAS-ссылок.
- `node --check scripts/restore_rehearsal.mjs` и полный `npm run check:release` прошли. Фактический rehearsal ожидает локальную PostgreSQL-роль с `CREATEDB`.

### 229. Runtime и recovery повторно подтверждены
- На текущем live-контуре `/ready` вернул `ready`: ComfyUI, llama.cpp и storage доступны.
- `smoke:runtime-health`, `smoke:reconcile-resolve` и `smoke:job-result` прошли: runtime snapshot, операторское разрешение неизвестной попытки и выдача manifest/AssetVersion работают.
- `backup:restore-preflight` подтвердил, что текущая роль `la6` всё ещё не имеет `CREATEDB`; рабочая БД не изменялась.

### 230. Сквозная регрессия после hardening
- `smoke:catalog-mutation` подтвердил project/scene/shot UX-контракт и идемпотентное создание job без дубликатов.
- `smoke:worker-e2e` подтвердил HTTP hooks → CAS upload → AssetVersion → enriched manifest.
- `smoke:failure-lifecycle` подтвердил корректный переход attempt/job в failed при ошибке исполнителя.

### 231. Live H3 preflight после recovery-проверок
- `probe:backends` подтвердил доступность llama.cpp с моделью `qwen3.5-9b-defiant-mtp-q5km` и ComfyUI 0.34.0 на RTX 5090.
- `preflight:h3-starter` успешно сопоставил live schema (2615 классов) и boundary `MiniMaxH3ReferenceToVideo`/`RandomNoise`/`SaveVideo`; submit остаётся `false`.
- `smoke:h3-references` подтвердил инъекцию image/audio references в immutable workflow graph.

### 232. Immutable profile и auth regression
- `smoke:profile-revisions` и `smoke:profile-revision-activate` подтвердили сохранение истории graph snapshots и транзакционную активацию конкретной revision.
- `smoke:api-auth` подтвердил bearer-защиту API при включённом токене, `smoke:worker-auth` — отдельную защиту claim endpoint worker-а.

### 233. Durable reorder для timeline
- Добавлен `PATCH /v1/scenes/:sceneId/shots/order` и транзакционный `PgJobRepository.reorderShots`.
- Сервер принимает только полный permutation текущих шотов сцены, временно сдвигает позиции для исключения конфликтов и сохраняет новый порядок атомарно.
- Неверная сцена, дубликаты или чужой shot отклоняются без частичной записи.
- `npm run typecheck` и `npm run check:release` прошли.

### 234. Reorder покрыт integration smoke
- `smoke:catalog-mutation` расширен вторым шотом и проверкой перестановки `[shot2, shot1]` через API с чтением сохранённого порядка.
- После исправления проверки поиска шота по ID smoke и полный release gate прошли.

### 235. Timeline reorder UI
- В карточках shots добавлены кнопки перемещения вверх/вниз; UI отправляет полную перестановку на durable API и перечитывает timeline после успешной записи.
- Кнопки корректно отключены на границах списка и не меняют selection при клике.
- `npm run typecheck` и `npm run build:web` прошли.

### 236. Queue/recovery smoke после UI-изменений
- `smoke:metrics` подтвердил Prometheus endpoint.
- `smoke:readiness` подтвердил fail-closed readiness при недоступном backend.
- `smoke:comfy-timeout` и `smoke:comfy-cancel` подтвердили timeout и interrupt-контракты ComfyUI.
- `smoke:select-output` подтвердил выбор только связанного финального take.

### 237. Live queue observation
- Read-only snapshot API: активный worker `local-qwen` остаётся `online`, GPU execution queue не содержит running prompts.
- В очереди присутствуют jobs в `awaiting_approval`; это ожидаемое ручное состояние, не зависшие lease/attempt. Автоматическое approve или удаление не выполнялось.
- Два старых worker instances остаются `stale` и не получают claims; fencing/reconcile-контур сохраняет защиту от повторной доставки.

### 238. Plan/provenance regression
- `smoke:workflow-job-plan` подтвердил immutable capture H3 workflow profile в job plan.
- `smoke:profile-job-source` подтвердил, что ComfyUI job использует активную profile revision.
- `smoke:job-catalog` подтвердил capability boundary каталога, `smoke:plan-hash` — изменение digest при изменении director input.

### 239. Media Pool/CAS regression
- `smoke:asset-upload` подтвердил SHA validation, дедупликацию и создание AssetVersion с привязкой к attempt.
- `smoke:comfy-upload` подтвердил контракт загрузки image/audio reference в ComfyUI.
- `smoke:comfy-collect` подтвердил получение output из ComfyUI history, `smoke:h3-references` — повторную инъекцию references в H3 graph.

### 240. Durable scene reorder API
- Добавлен `PATCH /v1/projects/:projectId/scenes/order` и транзакционный `reorderScenes` с полной permutation-проверкой текущих сцен.
- Позиции сцен обновляются атомарно через временный offset, аналогично shot reorder; ошибки не оставляют частичного порядка.
- `npm run typecheck` и `smoke:catalog-mutation` прошли.

### 241. Scene reorder UI
- Timeline UI подключён к scene-order API: сцены можно перемещать вверх/вниз, после успешной записи перечитывается проект.
- Кнопки отключаются на границах списка и не меняют текущий выбор сцены при клике.
- `npm run typecheck` и `npm run build:web` прошли.

### 242. Scene reorder покрыт integration smoke
- Catalog mutation smoke теперь создаёт две сцены, переставляет их через scene-order API и сверяет сохранённую последовательность.
- `smoke:catalog-mutation` и полный `check:release` прошли; тестовые записи очищаются в транзакционно безопасном cleanup-контуре.

### 243. Release gate после scene UX
- Полный `check:release`, `smoke:catalog-mutation` и `smoke:runtime-health` прошли после добавления scene reorder API/UI.
- Подтверждены typecheck, production web build, contiguous migrations, domain/skeleton contracts, API bind guard и web proxy.

### 244. Durable queue regression
- `smoke:postgres` подтвердил claim → heartbeat → immutable manifest → commit на PostgreSQL.
- `smoke:worker-e2e` подтвердил HTTP hooks → CAS → AssetVersion → enriched manifest.
- `smoke:reconcile` и `smoke:reconcile-resolve` подтвердили recovery истёкшего lease и операторское разрешение unknown attempt.

### 245. Queue UX filter
- В web queue добавлен фильтр по state (all/awaiting approval/queued/running/succeeded/failed/cancelled) и пустое состояние для выбранного фильтра.
- Фильтрация локальная, не меняет durable jobs и сохраняет доступ к approve/cancel/result действиям.
- `npm run typecheck` и `npm run build:web` прошли.

### 246. Scene reorder negative path
- Catalog smoke дополнительно проверяет duplicate scene IDs: API возвращает `400`, а сохранённый порядок не изменяется.
- `npm run smoke:catalog-mutation` прошёл.

### 247. Contract/documentation integrity
- `check:skeleton` подтвердил обязательные файлы, локальные ссылки и workspace-пакеты.
- `check:domain` подтвердил state machine и model-independent GenerationSpec invariants.
- `check:migrations` подтвердил непрерывную цепочку 001..013.

### 248. Live H3 OOM и корректная классификация ошибок
- Авторизованный live H3 submit `e2d9cc1e-d058-447e-a907-ff207316a283` дошёл до ComfyUI, но PVE вернул `torch.OutOfMemoryError` на `MiniMaxH3ReferenceToVideo`; output отсутствует.
- Обнаружен дефект: старый worker трактовал наличие history без проверки `status` как success и записал пустой manifest. `ComfyPromptExecutor.poll` исправлен: `status_str=error|exception` теперь возвращает `failed`.
- Добавлен executor smoke на Comfy history error; он и полный `check:release` прошли. Для применения фикса live worker требуется перезапуск; новый GPU submit до согласования параметров памяти не повторяется.

### 249. Повторный live E2E после worker/API restart
- После перезапуска API и worker создана короткая job `48d6c6c6-ffaa-480a-b857-98ae29eca092` (768×432, 17 кадров) на активном H3 profile.
- Worker корректно перевёл её в `failed`; `/result` не содержит manifest или AssetVersion, ComfyUI queue вернулась к пустому состоянию. Это подтверждает исправленную error-классификацию и отсутствие ложного success.
- Причина требует отдельного чтения ComfyUI execution log/настройки VRAM; автоматический повтор не выполнялся.

### 250. Диагностика ComfyUI execution errors
- `PollResult` и worker executor теперь передают `exception_message` из ComfyUI history (до 1000 символов) в `hooks.fail`, сохраняя полезную причину в failed attempt.
- Общий fallback `BACKEND_FAILED` сохраняется для history без диагностического сообщения.
- Executor smoke, typecheck и полный release gate прошли.

### 251. Финальный live H3 E2E после обновления worker
- После перезапуска worker активная job `05febffa-5f3f-4631-818c-260e81ac8fcf` успешно завершилась; ComfyUI queue вернулась к `running=0,pending=0`.
- `/v1/jobs/:id/result` вернул immutable manifest `68f6046a8471c301dfba290c0fa2bb1591316866d9b38a1eb599052787f04293` и AssetVersion `ea7994c7-b84c-4120-9355-34e90f62d06d` (`video/mp4`, 136865 bytes, SHA-256 `2c9e04c5bb826e71a75d11c07ad2f6e448442bd5335bd114580cca4933c68cdd`).
- Live-контур подтверждён end-to-end: durable job → lease/heartbeat → ComfyUI H3 → CAS → AssetVersion → result API.

### 252. Авторизованный preview результата в web UI
- Результаты AssetVersion теперь загружаются через `apiFetch` с bearer-заголовком и отображаются встроенно как video/audio/image preview.
- Добавлена кнопка Download asset через blob URL; старые object URL освобождаются при смене результата и размонтировании компонента.
- `npm run typecheck` и `npm run build:web` прошли.

### 253. Измерен локальный backup/restore RTO
- На контрольной PostgreSQL базе с 13 таблицами и 3 связанными AssetVersion измерены: создание backup 142 ms, `backup:verify` 81 ms, `backup:catalog-check` 97 ms, изолированный restore rehearsal 279 ms.
- Все операции завершились с кодом 0; restore подтвердил CAS-ссылки и структуру базы. Наблюдаемый локальный end-to-end RTO rehearsal (verify + catalog + restore) составил 457 ms, без учёта ручного переключения координатора.
- Это измерение относится к текущему объёму данных и loopback storage; целевые SLA для большой библиотеки и сетевого PVE ещё требуют отдельного замера.

### 254. Production-выдача CAS-ассетов
- `GET /v1/assets/:assetVersionId` теперь отдаёт immutable cache policy, SHA-256 и безопасный `Content-Disposition` для preview/download.
- Отсутствующий blob классифицируется как `410 ASSET_BLOB_MISSING`, а не как необработанный stream error; это позволяет оператору отличить потерю CAS от отсутствующего AssetVersion.
- Typecheck и полный `check:release` прошли.

### 255. API runtime обновлён после CAS hardening
- Старый API-процесс остановлен и запущен заново с PostgreSQL storage и текущим кодом выдачи AssetVersion.
- Live `/ready` после перезапуска вернул `ready`: ComfyUI, llama.cpp и PostgreSQL доступны.

### 256. Provenance отображается в result/Media Pool
- Result API и timeline теперь включают `AssetVersion.provenance` вместе с SHA-256 и MIME/размером.
- Web UI показывает сокращённый digest и источник provenance для каждого take, сохраняя immutable CAS идентификатор.
- Полный `check:release` прошёл.

### 257. Provenance API runtime применён
- API перезапущен с текущим кодом и PostgreSQL storage; live `/ready` снова подтверждает ComfyUI, llama.cpp и PostgreSQL.

### 258. Live provenance/header verification
- Новый API вернул для контрольного H3 take `attemptState=succeeded`, manifest hash и provenance `{attemptId, fencingToken, logicalName}`.
- `HEAD /v1/assets/ea7994c7-b84c-4120-9355-34e90f62d06d` подтвердил `video/mp4`, точный размер 136865, SHA-256, immutable cache и inline filename.

### 259. Structured API logging
- Fastify API теперь пишет JSON-логи с уровнем `QWEN_LOG_LEVEL` (default `info`); `req.headers.authorization` redacted.
- Release gate прошёл, API перезапущен и `/ready` подтверждает рабочий runtime.

### 260. Fault/auth/metrics regression после logging
- `smoke:failure-lifecycle`, `smoke:reconcile`, `smoke:reconcile-resolve`, `smoke:api-auth` и `smoke:metrics` прошли.
- Логи smoke подтверждают JSON-формат и отсутствие authorization в request log; отказ, истёкший lease и операторское reconcile сохраняют ожидаемые state transitions.

### 261. Capability-aware multi-node scheduling smoke
- Добавлен `npm run smoke:multi-node`: несовместимый online node (`h3=false`) не может claim H3 job, совместимый (`h3=true`) получает её, повторный claim возвращает пустой результат.
- Проверены capability boundary и single-delivery/fencing без запуска второго GPU worker.

### 262. Multi-node/workflow/CAS regression suite
- Последовательно прошли `smoke:multi-node`, `smoke:workflow-profiles`, `smoke:profile-revisions`, `smoke:h3-references`, `smoke:asset-upload` и `smoke:worker-e2e`.
- Подтверждены совместимость узлов, immutable profile revisions, reference injection, SHA/CAS upload и enriched manifest после structured logging.

### 263. Исправлены systemd deployment paths
- Примеры `qwendirector-api`, `qwendirector-worker` и `qwendirector-web` теперь используют фактический путь `%h/Documents/Projects/QwenDirector` для `WorkingDirectory` и `.env`.
- `check:skeleton` подтвердил целостность deployment-документации.

### 264. Optional API TLS hardening
- API поддерживает HTTPS при совместном задании `QWEN_TLS_CERT_FILE` и `QWEN_TLS_KEY_FILE`; неполная пара fail-closed с `QWEN_TLS_CERT_AND_KEY_REQUIRED`.
- Добавлены настройки в `.env.example` и эксплуатационное описание; loopback default не изменён.
- `check:release` прошёл, negative startup check подтвердил отказ при неполной TLS-конфигурации.

### 265. Worker recovery после API restart
- Live `/v1/nodes` подтвердил, что `local-qwen` снова зарегистрирован и имеет свежий heartbeat/status `online` после перезапуска API; старый instance остаётся `stale` и не допускается к claim.

### 266. Реальный HTTPS startup smoke
- На временном loopback-порту API запущен с самоподписанными cert/key; `curl -k https://127.0.0.1:4443/health` вернул `200`.
- После проверки временный процесс остановлен; основной API, worker и ComfyUI не изменялись.

### 267. Runbook синхронизирован с RTO baseline
- `docs/operations.md` теперь содержит измеренные значения backup/verify/catalog/restore и явно отделяет baseline текущего объёма от будущего SLA большой библиотеки или сетевого storage.

### 268. Финальный runtime audit
- `check:release` завершился `OK`; live `/ready` подтверждает ComfyUI, llama.cpp и PostgreSQL.
- Актуальный `local-qwen` online со свежим heartbeat; старый UUID остаётся stale.
- Контрольный H3 AssetVersion доступен с `video/mp4`, корректным размером/SHA-256 и immutable cache headers.

### 269. API read-only load smoke
- Добавлен `npm run smoke:api-load`: 100 параллельных запросов `/health` и `/ready` завершились успешно за 131 ms (≈761 req/s) на текущем workstation.
- Это базовый read-only показатель API; GPU generation load и длительные очереди требуют отдельного окна измерений.

### 270. Load smoke добавлен в operator runbook
- `docs/operations.md` описывает `npm run smoke:api-load`, переменную `QWEN_LOAD_REQUESTS` и ограничение на read-only характер проверки.

### 271. В runbook добавлен systemd lifecycle
- Зафиксированы команды установки user units, `daemon-reload`, `enable --now`, адресного restart API/worker и правило не перезапускать ComfyUI автоматически.

### 272. Durable failure diagnostics
- Migration 014 добавила `attempts.error_detail/error_at`; worker failure hook сохраняет до 4000 символов причины в PostgreSQL.
- `listJobs` и `getJobResult` возвращают error detail, web queue показывает его оператору с усечённым preview и tooltip.
- Миграционный gate и полный `check:release` прошли; API перезапущен, `/ready=ready`.

### 273. Migration 014 applied and failure regression repaired
- Обнаружено, что локальный runner не применяет новые SQL-файлы автоматически; additive migration 014 применена вручную через `psql -v ON_ERROR_STOP=1`.
- После применения `smoke:failure-lifecycle` снова прошёл (`200`, job `failed`); `attempts.error_detail` теперь реально доступен в текущей БД.

### 274. Идемпотентный migration runner
- Добавлен `npm run db:migrate` с таблицей `schema_migrations`; runner применяет только отсутствующие SQL-версии в отдельных транзакциях.
- Повторный запуск на текущей БД применил 013/014 после обнаружения исторически уже существующей схемы и завершился `OK: migrations current (14 files)`.
- Migration 013 сделана повторно безопасной для уже существующего check constraint.

### 275. API systemd pre-start migrations
- `qwendirector-api.service.example` теперь выполняет `npm run db:migrate` перед `apps/api` start; runbook обновлён.
- `check:skeleton` и повторный `db:migrate` завершились успешно (`14 files current`).

### 276. README status synchronized
- README отражает фактически реализованные hardening-контуры: migration runner, optional TLS, structured logs, recovery и измеренный backup/restore baseline.
- Ограничения полного SLA явно оставлены: второй физический worker, длительные fault/load drills и согласованные retention/RPO/RTO.

### 277. Recovery snapshot после migration 014
- Создан `.data/backups/2026-09-09T17-22-58.639Z`; backup manifest, CAS (4 файла), catalog check и isolated restore прошли.
- Restore подтвердил 14 public tables и 3 связанные AssetVersion, включая текущую схему durable error diagnostics.

### 278. Единый check:production
- Добавлен `npm run check:production`: db:migrate → check:release → multi-node smoke → API load smoke.
- Полный прогон прошёл: 14 migrations current, release gate OK, capability scheduling OK, 100 API requests за 108 ms (≈929 req/s).
- Проверка не запускает GPU generation и подходит для pre-deploy/restart контроля.

### 279. Production-check добавлен в README
- Quick-start README теперь начинает production-gates с `npm run check:production`, сохраняя отдельные команды для диагностики и backup.

### 280. Актуальный production baseline
- Повторный `npm run check:production` прошёл полностью: 14 migrations current, release gate OK, multi-node smoke OK, API load 100 requests за 98 ms (≈1025 req/s).

### 281. Операторский retry failed jobs
- Добавлен `POST /v1/jobs/:id/retry` с actor и проверкой последнего approval `retry_budget`; превышение бюджета отклоняется, автоматического запуска нет.
- Успешный retry возвращает job в `awaiting_approval`, сохраняя immutable plan и требуя нового ручного approval; web queue получила кнопку Retry для failed jobs.
- Typecheck/release gate прошли, API перезапущен, `/ready=ready`.

### 282. Retry route wiring и budget negative path
- Исправлена маршрутизация retry на `attempts.jobs.retry`; прежний wiring ошибочно проверял attempt repository и возвращал `501`.
- После перезапуска API существующая failed job с нулевым budget вернула `409 RETRY_BUDGET_EXHAUSTED`, состояние осталось `failed`, новый запуск не создан.

### 283. Production-check после retry changes
- Полный `npm run check:production` прошёл: 14 migrations current, release gate OK, multi-node smoke OK, API load 100 requests за 178 ms (≈563 req/s).

### 284. Retry success integration smoke
- Добавлен `npm run smoke:retry`: при `retry_budget=1` failure job корректно возвращается в `awaiting_approval` через API retry endpoint.
- Подтверждено, что повторная генерация требует нового ручного approval; автоматического claim в smoke нет.

### 285. Production-check расширен retry smoke
- `check:production` теперь включает успешный retry integration smoke между multi-node и API load проверками.
- Полный прогон прошёл: migrations/release/multi-node/retry OK, API load 100 requests за 117 ms (≈852 req/s).

### 286. Worker runtime после production-check
- Live `/v1/nodes` подтверждает актуальный `local-qwen` `online` с heartbeat `2026-09-09T17:27:30Z`; старый UUID остаётся `stale`.

### 287. Auth/readiness/backend control regression
- `smoke:worker-auth`, `smoke:readiness`, `smoke:comfy-timeout` и `smoke:comfy-cancel` прошли после retry/migration changes.
- Подтверждены bearer transport worker, fail-closed readiness и timeout/interrupt контракты ComfyUI без GPU generation.

### 288. H3 result quality diagnosis and duration UX
- Анализ `/home/la6/Downloads/05febffa-5f3f-4631-818c-260e81ac8fcf_00001_.mp4`: 768×432, 24 fps, 22 frames, длительность 0.917 s, H.264/AAC; job plan содержал `length=17`, поэтому это не 5-секундный take.
- В web UI поле ComfyUI H3 заменено на Duration (s); значение автоматически округляется к допустимому H3 кратному 17 (5 s → 124 frames @ 24 fps). Это не меняет автоматически turbo/VRAM-профиль.
- `npm run typecheck` и `npm run build:web` прошли.

### 289. H3 quality contract aligned with reference
- В `docs/workflow-adapter-contract.md` зафиксировано: 5 секунд при 24 fps → 124 кадров; sampler/LoRA/steps остаются immutable profile policy.
- Director Studio reference подтверждает тот же boundary-подход: явные prompt/dimensions/duration/seed/references, выбор final output и отдельное тестирование workflow перед активацией.

### 290. H3 profile selected by default
- Web UI автоматически выбирает первый активный H3 workflow profile и переключает generation adapter на ComfyUI при загрузке профилей.
- Это уменьшает риск случайного manual/llama submit без immutable H3 graph; пользователь всё ещё может явно выбрать другой adapter.
- `npm run typecheck` и `npm run build:web` прошли.

### 291. H3 long-take VRAM warning
- Web UI предупреждает перед approval, если рассчитанная длительность превышает 56 кадров; оператору предлагается проверить свободную VRAM, без автоматического снижения разрешения/качества.
- `npm run typecheck` и `npm run build:web` прошли.

### 292. Production-check после H3 UX hardening
- `check:production` прошёл полностью: migrations/release/multi-node/retry OK, API load 100 requests за 115 ms (≈873 req/s).

### 293. Turbo quality transparency
- Web UI распознаёт выбранный H3-профиль с `LoraLoaderModelOnly` turbo LoRA и показывает предупреждение: режим экономит VRAM, но может снижать детализацию.
- Предупреждение не меняет immutable graph и не запускает GPU автоматически; оператор осознанно выбирает профиль перед approval.
- `npm run typecheck` и `npm run build:web` прошли.

### 294. H3 regression verification
- H3 workflow/profile/preflight/references и workflow-job-plan smoke-тесты прошли после изменения UX длительности и turbo warning.
- `npm run check:production` прошёл: 14 migrations current, release/multi-node/retry OK, API load 100 requests за 105 ms (≈951 req/s).

### 295. Manifest export boundary
- Добавлен `GET /v1/jobs/:id/export`: выдаёт результат job как скачиваемый immutable JSON manifest с `content-disposition`, `no-store` и 404 для отсутствующего результата.
- Web helper скачивает manifest через авторизованный fetch/Blob; токены не сохраняются в URL.
- `npm run typecheck` и `npm run build:web` прошли.

### 296. Runtime export verification
- После перезапуска API `/ready` вернул `ready` (ComfyUI, llama.cpp и PostgreSQL online).
- Для существующей успешной H3 job export endpoint вернул HTTP 200, JSON manifest с `job_id`, `content-disposition` и `cache-control: no-store`.

### 297. Recovery and CAS verification
- `backup:restore-preflight` подтвердил `canCreateDatabase=true` и `restoreRehearsal=ready`.
- Новый локальный backup `.data/backups/2026-09-09T17-38-10.938Z` прошёл `backup:verify` (database + 4 CAS records) и `backup:catalog-check` (9 обязательных таблиц).
- CAS/staging GC dry-run просканировал 4 объекта, 3 ссылки; удаляемых orphan-объектов нет.

### 298. Export regression gate
- Добавлен `scripts/smoke_export.mjs`; `check:production` теперь проверяет HTTP export manifest, attachment header, `no-store` и соответствие `job_id`.
- Полный production-check прошёл: migrations/release/multi-node/retry/export OK, API load 100 requests за 144 ms (≈695 req/s).

### 299. Full lifecycle smoke verification
- Worker E2E (heartbeat → CAS upload → AssetVersion → enriched manifest), reconcile/resolve, runtime health, worker auth, readiness fail-closed, ComfyUI timeout и cancel smoke-тесты прошли.
- Проверка не запускала новую GPU-генерацию и не меняла инфраструктуру PVE.

### 300. Manifest export UI action
- В web UI добавлена видимая команда `Export current manifest` для текущей созданной job; скачивание выполняется через авторизованный Blob flow.
- `npm run typecheck` и `npm run build:web` прошли.

### 301. Contract documentation and static gates
- README уточнён: production-check включает проверку attachment/no-store/job_id для manifest export.
- `check:skeleton` и `check:domain` прошли (13 обязательных файлов, 20 Markdown-документов, 8 workspace-пакетов; state machine и idempotency invariants OK).

### 302. UI idempotency input coverage
- Исправлен UI idempotency key: теперь он включает prompt, adapter, H3 duration/frames, dimensions, seed, workflow profile и отсортированные references.
- Изменение параметров больше не может ошибочно replay-нуть job с прежним execution plan; неизменный набор входов по-прежнему дедуплицируется.
- typecheck/build, `smoke:plan-hash` и `smoke:workflow-job-plan` прошли.

### 303. Live H3 preflight and node state
- `preflight:h3-starter` подтвердил boundary H3 (`h3NodeId=6`, `noiseNodeId=5`, `saveNodeId=7`) и наличие требуемых ComfyUI classes; submit не выполнялся.
- Live `/v1/runtime`: ComfyUI H3 ready и llama.cpp online; `/v1/nodes` показывает актуальный `local-qwen` online, старые регистрации — stale.

### 304. Catalog and Media Pool integration verification
- Catalog, catalog mutation, asset upload/SHA validation, job result, final output selection и storage-boundary smoke-тесты прошли.
- Подтверждены project → scene → shot операции, порядок сцен/шотов и связывание immutable AssetVersion с attempt/result.

### 305. H3 readiness regression
- `preflight:h3-starter` и `smoke:h3-starter` прошли на PVE ComfyUI; runtime подтвердил H3 capability и online worker.

### 306. Job queue offcanvas UX
- Основной inline Job queue скрыт; добавлена кнопка `Jobs` со счётчиком незавершённых задач.
- Очередь перенесена в UIkit right offcanvas: фильтр состояний и действия approve/retry/cancel/reconcile/result доступны без перегрузки рабочего экрана.
- `npm run typecheck` и `npm run build:web` прошли.

### 307. Offcanvas visual verification
- Через локальный UI подтверждено: кнопка `JOBS 21` открывает правую панель, в ней отображаются фильтр и действия для awaiting approval/succeeded/failed jobs; основной экран остаётся доступен.

### 308. Production gate after UI redesign
- Полный `npm run check:production` прошёл после offcanvas UX: migrations/release/multi-node/retry/export OK, API load 100 requests за 122 ms (≈816 req/s).

### 309. Empty-catalog onboarding
- Добавлен видимый onboarding card «Начнём с проекта» при пустом каталоге; первый проект можно создать без предварительного состояния или ручного API-вызова.
- typecheck, web build и `check:skeleton` прошли.

### 310. Release gate after onboarding
- `npm run check:release` прошёл: typecheck/web-build, migration/domain/skeleton, API bind guard и web proxy checks OK.

### 311. Project catalog filtering
- В Project catalog добавлен live-фильтр по имени проекта; select показывает только совпадения и сохраняет существующую загрузку timeline.
- typecheck и web build прошли.

### 312. Selected project filter safety
- Фильтр всегда сохраняет выбранный project option, даже если он не совпадает с поисковой строкой; native select не теряет текущее значение.
- typecheck и web build прошли.

### 313. Queue refresh affordance
- В offcanvas Job queue добавлена явная кнопка `Refresh`; оператор может вручную синхронизировать список без закрытия панели.
- typecheck и web build прошли.

### 314. Shot duration form sync
- При выборе shot в Timeline его сохранённая длительность автоматически подставляется в форму генерации; H3 frame conversion и idempotency key используют это значение.
- typecheck и web build прошли.

### 315. Project context isolation
- При переключении проекта UI сбрасывает scene/shot и выбранные Media Pool references, затем загружает новый timeline; references не переносятся случайно между проектами.
- typecheck и web build прошли.

### 316. No-worker operator warning
- Health-блок UI показывает предупреждение, если зарегистрированные worker-узлы есть, но ни один не online; это отделяет доступность API от фактической исполнимости очереди.
- typecheck и web build прошли.

### 317. Постоянные skills для интерфейсного качества
- Установлен готовый skill `design-taste-frontend` из открытого репозитория `Leonxlnx/taste-skill`; он используется для audit-first проверки визуальной иерархии, типографики, цвета, motion и защиты от шаблонного «AI UI».
- Создан и валидирован локальный skill `interface-taste` для сложного product UI QwenDirector: project → scene → shot, progressive disclosure, рабочая плотность, операционные drawer-панели, accessibility и обязательная визуальная проверка.
- Ограничение зафиксировано явно: официальный Taste ориентирован прежде всего на выразительный frontend, поэтому для studio/dashboard UX его визуальные правила применяются совместно с продуктовым skill, а не вместо него.

### 318. Studio workspace redesign
- Главный экран переработан в адаптивное трёхколоночное рабочее пространство: библиотека проектов, редактор генерации, сцены и медиатека.
- Очередь задач и runtime/API-настройки вынесены в отдельные правые offcanvas-панели; сырой workflow JSON и node bindings скрыты в раскрываемом блоке расширенных настроек.
- Добавлены единые semantic color tokens, системная светлая/тёмная тема, спокойный синий accent, согласованные радиусы, focus-state и reduced-motion режим.

### 319. UI copy и операционная ясность
- Удалён скрытый inline-дубль Job queue; очередь теперь представлена в DOM только один раз.
- Локализованы состояния и действия задач, выбор финального дубля, управление сценами/шотами, длительность и provenance-подписи.
- Header actions объединены в адаптивную группу, поэтому появление команды экспорта не перекрывает кнопки очереди и настроек.

### 320. Проверка redesign
- `npm run typecheck` и `npm run build:web` прошли; production bundle собран Vite без ошибок.
- Визуальная проверка локального экрана 1440×1000 подтвердила рабочую трёхколоночную композицию, читаемую тёмную тему, отсутствие горизонтального переполнения и свёрнутые advanced controls; при ширине 720 px интерфейс корректно перестраивается в один поток.

### 321. Сверка с актуальным Director Studio
- По актуальному README Director Studio выделены дополнительные продуктовые поверхности: typed Actor/Scene/Prop/Layout workbenches, Picture/Audio reference roles, conversational shot planning, пошаговый workflow import и exclusive VRAM coordination.
- QwenDirector уже закрывает project/scene/shot catalog, общий Media Pool, локальный H3 workflow, durable jobs, approval/recovery, CAS/provenance и manifest export. Разрывы и безопасная очередность реализации занесены в [reference-director.md](reference-director.md).

### 322. Безопасный импорт workflow из UI
- В advanced H3-настройках добавлен импорт API-format JSON-файла. Он только заполняет редактор и не сохраняет/активирует профиль автоматически.
- Сохранение, H3 boundary validation и preflight остаются явными действиями оператора; immutable workflow snapshot job не изменён.
- `npm run typecheck` и `npm run build:web` требуется повторить после перезапуска локального dev server.

### 323. Канонический API-экспорт H3 сохранён как fallback
- Проверен файл `/home/la6/Downloads/video_minimax_h3_r2v_api.json`: 26 узлов, `MiniMaxH3ReferenceToVideo=136`, `RandomNoise=129`, `SaveVideo=92`; boundary validator проходит.
- Экспорт соответствует текущему профилю по графу, но содержит исходную конфигурацию без turbo LoRA (`Enable Lightning LoRA=false`, 56 steps). Активная revision 4 остаётся production-вариантом с turbo 4-step для контролируемого времени/VRAM.
- Файл не активировался автоматически; его можно импортировать через advanced H3 settings и использовать для отдельной ревизии после явного preflight.

### 324. Typed reference roles в Media Pool
- План job теперь сохраняет роль каждого reference (`picture`, `actor`, `set`, `prop`, `audio`) вместе с `assetVersionId`, filename и MIME type.
- UI Media Pool получил явный выбор роли; audio-ассеты ограничены ролью `audio`, image-ассеты — визуальными ролями. Роли участвуют в idempotency key, поэтому смена роли не может ошибочно переиспользовать старый план.
- API валидирует role/MIME compatibility и возвращает `400 INVALID_REFERENCE_ROLE` до создания job при некорректной комбинации.
- `npm run typecheck` и `npm run check:production` прошли: 14 migrations current, release/multi-node/retry/export/API-load OK.

### 325. Workflow revision history в UI
- Backend API `GET /v1/workflow-profiles/:id/revisions` и атомарная активация revision теперь доступны из advanced H3 controls.
- UI показывает revision number и graph hash, а активация требует явного подтверждения; новые jobs используют выбранный immutable snapshot, уже созданные jobs не меняются.
- Исправлена нормализация `graph_hash → graphHash` для отображения профилей, импортированный API-export можно сопоставлять с активной ревизией.
- `npm run typecheck` и `npm run build:web` прошли.

### 326. Durable shot prompt drafts
- Миграция `015_shot_prompt.sql` добавляет к shot JSON режиссёрского черновика и отдельный `prompt_revision`; изменение черновика увеличивает также `plan_revision`.
- Timeline read-model возвращает сохранённый prompt, а UI подставляет его при выборе shot и предоставляет явную кнопку «Сохранить черновик шота».
- Добавлен `PATCH /v1/shots/:id/prompt`; сохранённый draft не изменяет уже созданные jobs и становится входом только при следующем submit.
- `npm run typecheck`, `npm run db:migrate` и `npm run check:release` прошли; в локальной БД применено 15 миграций.

### 327. Shot prompt persistence smoke gate
- Добавлен `scripts/smoke_shot_prompt.mjs`: create project/scene/shot → PATCH prompt → read timeline → проверка `prompt_revision`/`plan_revision` и отказа от массива вместо объекта.
- `smoke:shot-prompt` включён в `check:production`; полный production gate прошёл с 15 миграциями, release, multi-node, retry, export, shot-prompt и API-load.

### 328. Exclusive execution lock per worker node
- Миграция `016_node_execution_lock.sql` добавляет partial unique index: у одного node не может быть более одной active attempt (`leased`, `running`, `unknown`).
- PostgreSQL claim дополнительно исключает busy node через `NOT EXISTS`; это закрывает параллельную выдачу двух GPU-heavy jobs одному worker и сохраняет безопасный `SKIP LOCKED` flow.
- `smoke_multi_node` расширен вторым queued job и подтверждает, что занятый compatible node не получает новую задачу; полный `check:production` прошёл с 16 миграциями.

### 329. Финальный output boundary для ComfyUI
- `ComfyPromptExecutor.collect` теперь принимает только outputs единственного validated `SaveVideo` node из execution graph; промежуточные изображения и служебные outputs не попадают в CAS/Media Pool.
- Совместимый fallback сохранён для executor без graph, а H3 worker всегда передаёт immutable workflow snapshot.
- `smoke:comfy-collect` дополнен промежуточным output и включён в `check:production`; проверено, что скачивается только финальный video asset.

### 330. Операторский retry budget
- Approval UI теперь позволяет задать число повторов после ошибки (`0–10`); значение передаётся и из основной формы, и из Job Queue offcanvas.
- Backend уже хранит retry budget в approval и ограничивает повторный запуск; UI больше не скрывает эту operational policy.
- `npm run typecheck` и полный `npm run check:production` прошли.

### 331. Project manifest export
- Добавлен `GET /v1/projects/:projectId/export`: локальный no-store attachment с project metadata, сценами, shot prompt/plan revisions и ссылками Media Pool на immutable AssetVersion.
- UI получил действие «Экспорт проекта» в библиотеке проектов; CAS-байты не дублируются, манифест сохраняет их content-addressed ссылки.
- Добавлен `smoke:project-export`; после штатного перезапуска API live export вернул 200, attachment/no-store и корректный `project_id`.
- Полный `npm run check:production` прошёл с project export gate.

### 332. Live production audit after API restart
- `/ready` вернул `ready`: PostgreSQL, ComfyUI и llama.cpp отвечают; runtime capability сообщает `comfyui.h3=true` и классы `MiniMaxH3ReferenceToVideo`, `RandomNoise`, `SaveVideo`.
- Активный worker `local-qwen` (RFC4122 node id `00000000-0000-4000-8000-000000000001`) online; старые регистрации остаются `stale` и видны recovery read-side.
- Последний успешный H3 result `05febffa-5f3f-4631-818c-260e81ac8fcf` содержит ровно один финальный asset `comfy-92-0-…mp4` с MIME `video/mp4`; исторический turbo result `4132c77d…` сохранён immutable с прежней ошибочной MIME-меткой и не переписывается.
- Это подтверждает сохранность production storage после перезапуска API и корректную работу нового final-output boundary для новых executions.

### 333. Project export включает job lifecycle
- Project manifest теперь содержит read-only `jobs[]`: state, plan hash, adapter, scene/shot, latest attempt state, error detail и timestamps.
- CAS-байты и workflow graph не дублируются: экспорт сохраняет ссылки и immutable hashes, поэтому подходит для backup/переноса операционного контекста.
- `smoke:project-export` проверяет `jobs[]`, `project_id`, attachment и `no-store`; после перезапуска API и полный `check:production` прошли.

### 334. UX-переработка рабочего пространства
- Основной экран перестроен вокруг пользовательского цикла «выбрать шот → описать → отправить»: добавлена контекстная шапка с текущим проектом/сценой/шотом и явным состоянием.
- Редкие действия создания сущностей, режиссёрские параметры и формат генерации переведены в progressive disclosure через `<details>`, чтобы не перегружать первый экран.
- Prompt стал визуальным центром редактора; технический JSON/ответы API скрыты в секции «Технические сведения», а CTA и статус получили отдельную иерархию.
- Сохранены Job Queue и Settings в offcanvas, Media Pool и timeline; обновлены адаптивные правила для узких экранов.
- Проверки: `npm run typecheck`, `npm run build:web`; headless visual QA 1440×1000 подтверждён, overflow не обнаружен.

### 335. Production gate после UX-изменений
- `npm run check:production` прошёл полностью: 16 миграций, release checks, multi-node fencing, retry, job/project export, prompt persistence, ComfyUI final-output boundary и API-load (838 req/s в smoke).
- Дополнительно выполнена визуальная проверка narrow viewport 720×1200: контекст, действия, библиотека и редактор складываются в один последовательный мобильный поток без горизонтального overflow.

### 336. Backup/readiness audit
- Live `/ready` подтвердил доступность PostgreSQL, ComfyUI и llama.cpp (`status=ready`).
- Создан локальный backup с 4 CAS-файлами; `backup:verify` и `backup:catalog-check` прошли.
- CAS и staging GC выполнены в dry-run режиме: удаляемых orphan-объектов нет.

### 337. Production gate расширен worker E2E
- `check:production` теперь включает `smoke:worker-e2e`, чтобы каждый production gate проверял полный mock worker flow: claim → heartbeat → HTTP asset upload → CAS/AssetVersion → enriched manifest.
- Gate прошёл после изменения; итоговый API-load smoke: 999 req/s.

### 338. Recovery restore rehearsal
- Для последнего локального backup выполнен `backup:restore-preflight`: текущий пользователь может создать изолированную БД, rehearsal готов.
- `backup:restore-rehearsal` завершился успешно в отдельной базе: восстановлены 13 public tables и проверены 2 CAS AssetVersion links.
- Рабочая БД и текущий CAS при rehearsal не изменялись.

### 339. H3-specific contract audit
- `smoke:runtime-health` и `smoke:comfy-schema` подтвердили readiness и allowlisted MiniMax H3 node schema.
- `smoke:h3-references` подтвердил typed reference bindings, а `smoke:worker-h3-injection` — инъекцию snapshot без изменения immutable profile.
- `smoke:profile-revision-activate` подтвердил транзакционную активацию workflow revision.

### 340. Единый лабораторный gate
- В `package.json` добавлен `npm run check:lab` — единая проверка локальной H3-лаборатории.
- Gate последовательно проверяет fail-closed readiness, runtime health, allowlisted ComfyUI schema, H3 reference bindings, immutable worker injection, transactional profile activation и worker→CAS E2E.
- `npm run check:lab` завершился успешно на текущем локальном контуре.

### 341. PVE H3 workflow preflight
- `preflight:h3-starter` получил фактическую схему ComfyUI с PVE `192.168.10.103:8188`; boundary подтверждён (`MiniMaxH3ReferenceToVideo`, `RandomNoise`, `SaveVideo`), submit не выполнялся.
- `smoke:h3-starter` и `smoke:h3-workflow` прошли: starter graph соответствует boundary contract и валидируется до отправки.

### 342. ComfyUI recovery contract audit
- Проверены `smoke:comfy-upload`, `smoke:comfy-cancel` и `smoke:comfy-timeout`: загрузка references, interrupt и timeout работают по контракту.
- `smoke:reconcile` и `smoke:reconcile-resolve` подтвердили безопасный путь expired lease → unknown → reconciling и ручное разрешение с manifest.
- Новая GPU-генерация не запускалась; проверка изолирована на контрактном уровне.

### 343. Live process inventory
- На момент проверки слушают ожидаемые порты API `127.0.0.1:4310`, web `::1:5173`, llama.cpp `:8081` и PostgreSQL `:5432`.
- Отдельный `apps/worker` process и активный systemd-user worker unit не обнаружены; это эксплуатационный gap для следующего реального queued H3 E2E.
- GPU-задача автоматически не запускалась, чтобы не менять состояние лаборатории без явного запуска worker.

### 344. Worker поднят и heartbeat подтверждён
- Worker запущен штатной командой `npm --workspace apps/worker run start` в отдельной сессии.
- `GET /v1/nodes` подтвердил активный node `00000000-0000-4000-8000-000000000001`, instance `local-qwen`, статус `online`, heartbeat обновляется.
- Очередь не инициировалась и GPU generation не запускалась; worker оставлен работающим для следующего контролируемого E2E.

### 345. Queue safety audit перед live H3
- В live queue обнаружены старые `awaiting_approval` smoke jobs с неполными графами и без references; автоматически approve/retry их нельзя.
- Production profile `video-minimax-h3-r2v` присутствует в API, worker online и heartbeat актуален.
- Следующий live E2E должен использовать только production profile, валидированный starter boundary и явно выбранные references; некорректные smoke jobs оставить без запуска до отдельной очистки/архивации.

### 346. Worker stability after queue audit
- Worker оставался без ошибок в течение контрольного интервала; heartbeat node `00000000-0000-4000-8000-000000000001` обновился до `18:30:49`.
- В состояниях `queued/leased/running` задач нет, поэтому worker не захватил старые smoke jobs и не инициировал GPU execution.

### 347. Security checks включены в production gate
- `check:production` расширен smoke-проверками API bearer auth, worker claim auth и non-loopback bind guard.
- Полный gate прошёл: auth-контракты, durable lifecycle, worker E2E и API-load (1046 req/s) подтверждены одной командой.

### 348. Live readiness + heartbeat follow-up
- После контрольного интервала worker node `local-qwen` остаётся `online`, heartbeat обновляется (`18:31:30`).
- `/ready` снова вернул `ready`; ComfyUI, llama.cpp и storage отвечают 200.

### 349. Runtime health visibility in primary UX
- В контекстную шапку UI добавлены компактные live-пилюли `ComfyUI готов/недоступен` и количество online workers.
- Индикаторы используют уже загруженные runtime/nodes данные и не создают новый backend coupling; Settings остаётся местом подробной диагностики.
- `npm run typecheck` прошёл.

### 350. Combined production/lab verification
- Последовательно выполнены `npm run check:production` и `npm run check:lab` после добавления runtime health pills в UI.
- Web build, auth/bind guards, durable lifecycle, worker E2E, H3 schema/profile/reference contracts и readiness прошли; API-load smoke: 912 req/s.

### 351. Финальная visual QA после health pills
- Headless screenshots 1440×1000 и 720×1200 проверены после добавления live-индикаторов.
- Контекстная шапка, ComfyUI/worker health, основной prompt flow и responsive stacking отображаются без overlap и горизонтального overflow.

### 352. Worker documentation synchronized
- Обновлён `apps/worker/README.md`: удалено устаревшее утверждение, что реализации нет; описаны registration/heartbeat/claim, llama.cpp и ComfyUI H3 execution paths, HTTP-only persistence boundary и штатный запуск.

### 353. Observability включена в production gate
- `check:production` теперь включает `smoke:metrics`; `/metrics` отдаёт Prometheus-compatible counters `qwendirector_http_requests_total` и `qwendirector_http_errors_total`.
- Live endpoint проверен: 2052 requests, 0 errors на момент аудита.

### 354. Release regression audit
- `npm run check:release` прошёл после изменений gate/UI; migration, domain, skeleton, auth bind и web proxy checks зелёные.
- Дополнительно `smoke:job-catalog`, `smoke:job-result` и `smoke:select-output` подтвердили capability boundary, выдачу manifest/assets и выбор финального take.

### 355. Operator runbook commands synchronized
- README теперь явно различает `check:production` (код/схема/безопасность/durable lifecycle) и `check:lab` (живые H3 runtime/schema/profile/reference/worker).

### 356. Documentation/domain consistency check
- `check:skeleton` и `check:domain` прошли после обновления README и worker runbook: 49 локальных ссылок, обязательные документы и state-machine invariants корректны.

### 357. Live state checkpoint
- Worker `local-qwen` остаётся `online`, heartbeat `18:35:04`; `/ready` возвращает `ready`.
- Активных `queued/leased/running` jobs нет; live H3 execution не инициирован автоматически.

### 358. Idempotency and immutable plan audit
- `smoke:plan-hash` и `smoke:prompt` подтвердили детерминированный prompt compiler и изменение plan hash при изменении director input.
- `smoke:workflow-job-plan` подтвердил capture immutable H3 workflow profile в job plan; повторный конфликт корректно отклоняется.
- `smoke:profile-job-source` подтвердил, что ComfyUI job берёт graph только из активного profile после preflight.

### 359. Clean checkout release verification
- `package.json` корректно экспонирует `check:production` и `check:lab`; команды выводят полный состав проверок без скрытых ручных шагов.
- Повторный `npm run check:release` прошёл: web build, typecheck, migration/domain/skeleton/auth/bind/proxy guards — OK.

### 360. Duplicate worker cleanup
- В live process inventory обнаружены два worker с одним node identity; интерактивный дубликат остановлен штатным SIGINT.
- Остался один worker process, node `local-qwen` продолжает иметь статус `online` и обновляемый heartbeat.

### 361. Worker singleton checkpoint
- Повторная проверка process list обнаружила ровно один реальный `node .../tsx src/main.ts` worker; единственный online node соответствует ему.

### 362. Worker environment readiness
- У активного worker заданы `QWEN_API_BASE_URL` и `QWEN_NODE_ID`; остальные параметры используют безопасные defaults (`local-qwen`, ComfyUI `192.168.10.103:8188`, poll 1s).
- Значения секретов не выводились; проверка выполнена только по наличию переменных.

### 363. Pre-live-E2E checkpoint
- `/ready` остаётся `ready` по всем трём зависимостям; online worker ровно один, heartbeat `18:37:15`.
- Jobs в `queued/leased/running/reconciling` отсутствуют; лаборатория готова к явному операторскому approve production H3 job.

### 364. Stable PVE preflight checkpoint
- Повторный `preflight:h3-starter` получил актуальную PVE schema и завершился с `submit: false`.
- `/ready` вернул `ready`; в process list ровно один worker `tsx src/main.ts`.

### 365. Roadmap status synchronized
- `docs/roadmap.md` получил фактическую статус-сводку по этапам 0–4: подтверждённые production-oriented части отделены от незакрытых SLA/preview требований.

### 366. Roadmap documentation gate
- После синхронизации roadmap `check:skeleton` и `check:release` прошли; локальные ссылки и production web/type/domain guards корректны.

### 367. Catalog/result regression checkpoint
- `smoke:catalog`, `smoke:catalog-mutation`, `smoke:job-result` и `smoke:select-output` прошли после последних изменений; project/scene/shot CRUD, idempotency, manifest/assets и final-take selection работают.

### 368. Fresh full production gate
- Свежий `npm run check:production` прошёл после roadmap/README изменений: auth, metrics, multi-node, retry, export, prompt, final output, worker E2E и API-load (878 req/s).

### 369. Lab gate повторён на живом worker
- `npm run check:lab` повторён на текущем live-контуре; readiness/runtime/schema, H3 references, immutable profile activation и worker E2E завершились `OK`.

### 370. Operator handoff checkpoint
- Live `/ready`: `ready`; online workers: `1`; активные `queued/leased/running/reconciling` jobs: `0`.
- Контур стабилен и готов к ручному запуску только валидированной production H3 job.

### 371. Live H3 E2E attempt and safe recovery
- После явного разрешения создана и утверждена новая job `eeb0a312-1d80-4784-89b4-41572388e74d` с production profile `video-minimax-h3-r2v` и двумя импортированными image AssetVersion references.
- Worker получил lease, но ComfyUI queue осталась пустой: submit завис до постановки prompt. Cancel не завершился за контрольный интервал.
- Worker остановлен штатным SIGTERM; `POST /v1/admin/reconcile` нашёл attempt `54055fc8-e2e0-4dab-91d6-6560627e07fd`, ручное reconcile с decision `failed` завершило job без потери CAS/БД.
- Это реальный отрицательный E2E: durable lease/cancel/reconcile работают, но production worker transport требует отдельной диагностики перед повторным GPU запуском.

### 372. Comfy transport hang fix
- Причина подтверждена: `uploadComfyReference` и `ComfyPromptExecutor.submit` выполняли network fetch без deadline; при PVE transport stall attempt оставался `leased` до lease expiry.
- Добавлены `overwrite=true` для повторяемых reference filenames и `AbortSignal.timeout(30_000)` для upload/submit requests.
- Typecheck и `smoke:comfy-upload`/`smoke:comfy-timeout` прошли; текущая зависшая job безопасно reconciled в `failed`.
- Следующий live E2E должен повториться после запуска worker с этим кодом; таймаут теперь переводит ошибку через hooks вместо бесконечного ожидания.

### 373. Media Pool UX redesign
- Media Pool переработан по итогам UX-аудита: CAS hashes и raw byte counters убраны из primary view; вместо них показываются имя файла, тип, размер в KB, иконка, роль reference и скрытая provenance-информация.
- Визуальная иерархия следует progressive disclosure и human-readable asset intake паттернам; технические идентификаторы доступны только через `i` details.
- Headless visual QA 1440×1000 подтверждена; `npm run typecheck` и `npm run build:web` прошли.

### 374. Режиссёрский workspace переработан
- Основной экран больше не является формой из трёх равноправных колонок: слева появился компактный навигатор `проект → сцена → шот`, в центре — единственный рабочий стол выбранного шота, справа — контекстный инспектор Media Pool. Очередь и диагностика сохранены в offcanvas-панелях.
- Убран редактируемый на главном экране дублирующий контекст `Project / Scene / Shot`: выбор шота автоматически заполняет бриф, режиссёрские поля и длительность. `loadTimeline` также выбирает первый доступный шот, чтобы начальный экран не показывал «Новый проект» поверх реального каталога.
- Рабочая последовательность стала явной: ключевой кадр и бриф → вкладка «Режиссура» → вкладка «Генерация» → единственное действие «Подготовить задачу». Workflow JSON и revisions остались за «Расширенными настройками».
- Выполнены `npm run typecheck` и `npm run build:web`; headless visual QA 1440×1000 подтвердила новый desktop layout. Нужна следующая ручная оценка в браузере на реальном сценарии с несколькими сценами/шотами и, при необходимости, следующая итерация по её результатам.

### 375. Превью референса в рабочем кадре
- Выбранный первый reference теперь автоматически загружается через CAS endpoint и отображается в stage рабочего шота; пользователь видит визуальную опору до подготовки задачи, а не только строку имени в Media Pool.
- Для изображения и видео используется соответствующий нативный preview; при снятии всех выделений объектная URL освобождается. Существующий просмотр результата задачи продолжает использовать тот же безопасный preview pipeline.
- `npm run typecheck` и `npm run build:web` прошли после изменения.

### 376. Навигация и выбор финального дубля
- В инспекторе «Дубли» добавлена последовательная навигация по output-ассетам (`←/→`), счётчик текущего варианта и отдельное визуальное состояние previewed/final.
- Выбор финального take остаётся явным операторским действием через существующий `POST /v1/jobs/:id/select-output`; UI теперь поддерживает просмотр вариантов без возврата к JSON/result panel.
- Проверки `npm run typecheck`, `npm run build:web` и `check_skeleton.py` прошли.

### 377. Живой контур повторно поднят и проверен
- Read-only проверка показала `/ready=ready`: PostgreSQL, ComfyUI и llama.cpp доступны; ComfyUI capability snapshot содержит H3 classes и `h3=true`.
- Worker был остановлен в live-контуре; он запущен штатно с `QWEN_NODE_ID=local`, повторно зарегистрировал UUID-узел и обновил heartbeat. Пустой claim-цикл работает, активных jobs нет.
- `npm run check:production` и `npm run check:lab` завершились `OK`. Реальный GPU generation в этой сессии не запускался, чтобы не создавать незапланированный расход VRAM/очередь.

### 378. Production checkpoint подтверждён по текущей БД
- Активный профиль `video-minimax-h3-r2v` доступен на revision 4, `active=true`, с H3 boundary и reference bindings.
- В каталоге CAS присутствует успешный H3 output `video/mp4`; `GET /v1/jobs/05febffa-5f3f-4631-818c-260e81ac8fcf/result` возвращает succeeded attempt, manifest hash и связанный AssetVersion.
- Live API показывает отсутствие активных jobs; worker зарегистрирован и heartbeat обновляется. Повторный GPU запуск не требуется для этого checkpoint.

### 379. Исправлены исторические MIME метаданные CAS
- Добавлена миграция `017_repair_video_mime.sql`: для уже сохранённых output-ассетов с immutable logical filename `.mp4/.webm/.mov/.mkv` MIME приводится к соответствующему `video/*`; изображения и неоднозначные записи не затрагиваются.
- Миграция применена к локальной PostgreSQL (`17 files`); успешный исторический H3 job теперь возвращает `video/mp4`, согласованный с output filename и CAS preview.
- `npm run check:production` прошёл полностью после миграции.

### 380. Restore rehearsal выполнен в изолированной БД
- Создан свежий локальный backup `2026-09-09T21-02-51.948Z` с database dump и 6 CAS records.
- `backup:verify` подтвердил manifest и контрольные суммы; `backup:catalog-check` подтвердил 9 обязательных таблиц.
- `backup:restore-rehearsal` успешно восстановил dump в отдельную временную PostgreSQL БД: 14 public tables и 5 AssetVersion CAS links проверены, рабочая БД не изменялась.
- RPO/RTO, длительные fault/load drills и политика retention остаются эксплуатационными решениями, которые нужно согласовать отдельно.

### 381. CAS и staging retention guard подтверждён
- `npm run cas:gc-report` просканировал 6 CAS-объектов: 5 referenced, 0 eligible orphan при grace period 24 часа.
- `npm run staging:gc-report` не нашёл eligible staging-файлов.
- Оба отчёта работают в режиме `dry-run`; автоматическое удаление не выполняется. Это подтверждает безопасный retention guard без риска потерять результат или reference.

### 382. Runtime health возвращён в постоянный контекст UI
- После workspace redesign состояние ComfyUI и worker было доступно только через «Настройки». В верхнюю панель добавлен компактный постоянный health-снимок с semantic цветами (`готов`, `нет worker`, `недоступен`).
- Операционный статус остаётся discoverable, а подробные latency/capabilities и node list по-прежнему скрыты в offcanvas Settings.
- `npm run typecheck` и `npm run build:web` прошли.

### 383. Systemd templates hardened
- Примеры user units для API/web/worker получили явные зависимости `network-online` и API; worker/web не стартуют раньше координатора.
- Для API и worker добавлены `ProtectSystem=strict`, `ProtectHome=read-only`, ограниченный `ReadWritePaths` для `.data` и graceful `TimeoutStopSec`; web получил read-only home и доступ только к `apps/web/dist`.
- Изменены только `.service.example`: units не устанавливались и не перезапускали пользовательские сервисы. `check_skeleton.py` и `check:release` прошли.
- Попытка `systemd-analyze verify` напрямую отклонена самим инструментом для файлов с суффиксом `.service.example`; это ограничение имени примера, а не ошибка unit-содержимого. Переименование/установка units в системе намеренно не выполнялись.

### 384. Restore baseline обновлён по актуальной схеме
- На backup с 17 миграциями, 14 public tables, 5 AssetVersion links и 6 CAS records измерены: backup 140 ms, verify 80 ms, catalog check 100 ms, isolated restore 290 ms.
- Baseline записан в `docs/operations.md`; он является локальным измерением, не заявленным SLA для большой библиотеки или сетевого хранилища.

### 385. Systemd hardening добавлен в release gate
- Добавлен dependency-free `scripts/check_systemd_examples.mjs` и команда `npm run check:systemd`: проверяются секции unit, зависимости API/network, `ProtectSystem`, `ProtectHome`, ограниченные `ReadWritePaths` и stop timeout.
- `check:release` теперь включает `systemd-hardening`; проверены все 4 example units.
- `npm run check:systemd` и `npm run check:release` завершились `OK`.

### 386. Полный production и lab gate после hardening
- После добавления systemd gate и MIME-repair повторно выполнены `npm run check:production` и `npm run check:lab`.
- Все migration/release/auth/multi-node/retry/export/CAS/worker-load проверки, H3 schema/profile/reference и worker hooks завершились `OK`.
- API load smoke: 100 запросов за 98 ms (~1021 req/s); GPU job в рамках gate не создаётся.

### 387. Быстрые действия каталога возвращены в shot tree
- В новом дереве проекта снова доступны rename и изменение порядка шотов; действия появляются рядом с выбранным/наведённым шотом и не конкурируют с основным кликом выбора.
- Восстановлены вызовы существующих `PATCH /v1/shots/:id` и `/order`; структура остаётся доступной с клавиатуры через отдельные buttons.
- `npm run typecheck`, `npm run build:web` и `npm run check:systemd` прошли.

### 388. Visual QA после shot actions и health strip
- Headless visual QA повторена на 1440×1000 и 720×1000 после добавления shot tools и постоянного runtime health strip.
- В desktop и narrow layout нет горизонтального overflow; tree actions остаются компактными, health status читается без открытия Settings, основной CTA сохраняет позицию.

### 389. Live MiniMax H3 E2E после перезапуска worker
- Создан новый короткий job `7fd0c9e6-9ed8-4c78-b111-3044f2cf8b6e` с активным profile `video-minimax-h3-r2v`, 17 frames, 768×432 и без новых uploads; выполнен explicit approval с `retryBudget=0`.
- Worker claim → ComfyUI submit → poll → collect → CAS commit завершились `succeeded` за один короткий проход. Attempt manifest hash: `ab1e7c3eadf9da4998756c7e6be89eb4b1982d9abc774fc78aa4080bca8a5d61`.
- Output `b9e4a0bb-0bb1-4234-8dc5-549a8f1e651f` имеет MIME `video/mp4`, скачан через `/v1/assets/:id` и распознан как ISO MP4; PVE `/queue` после завершения показывает `running=0`, `pending=0`.

### 390. Визуальный sanity-check live output
- Из нового AssetVersion извлечён контрольный frame 768×432 на 0.4 s; PNG валиден и содержит различимый H3-сгенерированный black-and-white jazz кадр без признаков пустого/повреждённого output.
- Проверка не подменяет художественную оценку качества и не меняет immutable result.

### 391. R2V reference transport diagnosis
- Новый короткий R2V job `f4f09878-a700-4cb5-b3a5-f799e524062d` с двумя CAS image references получил lease, но не создал PVE prompt; `/queue` оставалась `running=0,pending=0`.
- Прямой `curl` к PVE `/upload/image` с уникальным filename также возвращает HTTP 500 за ~13 ms. Job отменён штатно, admin reconcile перевёл attempt `42afbf71-bb39-4a42-a8fa-5fa59eecf331` в `failed`; зависший lease не оставлен.
- `uploadComfyReference` теперь включает очищенное тело ошибки PVE (до 500 символов) в exception detail. `typecheck`, `smoke:comfy-upload` и `smoke:comfy-timeout` прошли. Следующий R2V запуск требует исправления/проверки upload endpoint в PVE, а не повторной постановки той же задачи.

### 392. Исправлен и подтверждён реальный R2V upload
- Причина HTTP 500 найдена: в multipart поле ComfyUI `type` передавалось как media type (`image`/`audio`), тогда как PVE ожидает storage target (`input/temp/output`). `uploadComfyReference` теперь всегда отправляет `type=input`, сохраняя image/audio только в доменном reference contract.
- После перезапуска worker создан job `fb9ec367-1d1b-4223-9cf5-3c210274e359` с двумя CAS image references; lifecycle `claim → upload → H3 submit → poll → collect → CAS` завершился `succeeded`.
- Manifest hash `c9cb4402aaae40404d179ec7db9995802e75f065adcd57c4e5a59d836ff6e933`; output AssetVersion `ed88cd1a-4ee0-41a2-812a-4c969566b389`, MIME `video/mp4`, H.264/AAC, 768×432, 0.917 s. PVE queue после run пуста.
- `typecheck`, `smoke:comfy-upload` и `smoke:comfy-collect` прошли.

### 393. Визуальный sanity-check реального R2V output
- Из `ed88cd1a-4ee0-41a2-812a-4c969566b389` извлечён контрольный frame: валидный PNG 768×432 с различимым цветным cyberpunk-портретом, соответствующим импортированному reference-контексту.
- MP4 подтверждён как H.264/AAC, длительность 0.917 s (17 кадров при 24 fps), размер 122231 bytes; PVE queue пуста.

### 394. Full gates после исправления R2V upload
- После изменения multipart `type=input` повторно выполнены `npm run check:production` и `npm run check:lab`; migration, release, auth, multi-node, CAS, H3 profile/reference и worker lifecycle checks завершились `OK`.
- API load smoke в production gate: 100 запросов за 103 ms (~967 req/s); live GPU jobs в рамках gate не создаются.

### 395. Live R2V final-take decision
- Для успешного job `fb9ec367-1d1b-4223-9cf5-3c210274e359` операторское решение записано через `POST /v1/jobs/:id/select-output`: финальный AssetVersion `ed88cd1a-4ee0-41a2-812a-4c969566b389`, actor `live-operator`.
- Повторный вызов того же выбора вернул `200` и тот же AssetVersion без создания дополнительной строки; `GET /v1/jobs/:id/result` возвращает selection отдельно от неизменяемого manifest hash.

### 396. Clean production checkpoint после R2V
- Текущий API `/ready` сообщает `ready` по ComfyUI, llama.cpp и PostgreSQL; PVE queue пуста (`0 running / 0 pending`).
- Каталог jobs не содержит активных `queued/leased/running/reconciling` попыток.
- `npm run check:release` повторно прошёл полностью, включая systemd hardening, 17 migrations и web/type/domain/security gates.

### 397. README синхронизирован с R2V production state
- Главный README обновлён на 2026-09-10: явно отражены успешный R2V E2E с двумя CAS references, исправленный `type=input`, выбор final take, CAS persistence и пустая PVE queue после прогона.
- Ограничения не скрыты: второй физический worker, длительные fault/load drills и согласование RPO/RTO/retention остаются отдельными SLA-задачами.
- `check_skeleton.py` и `check:release` прошли.

### 398. Retention guard после R2V обновлён
- После live R2V в CAS просканировано 8 объектов: 7 referenced, 0 eligible orphan при grace period 24 часа.
- Staging GC также не нашёл eligible файлов; dry-run не удалил ни один объект.
- Result read-model успешного R2V продолжает возвращать выбранный final AssetVersion и неизменяемый manifest hash.

### 399. Job detail переведён на полноценный durable read-model
- `GET /v1/jobs/:id` в PostgreSQL-режиме теперь возвращает не только plan, но и каталог проекта/сцены/шота, timestamps отмены и последний attempt (`attempt_id`, state, fencing token, lease, heartbeat sequence, error detail).
- Это устраняет разрыв между Job Queue и фактическим состоянием worker после перезапуска API: UI может восстанавливать карточку задачи только из PostgreSQL, без in-memory fallback.
- `npm run typecheck` и `npm run check:release -- --skip-build` прошли; миграции и web build остаются зелёными.

### 400. Job Queue подключена к durable detail
- В offcanvas Job Queue добавлено отображение состояния последней попытки и адаптера; для каждой задачи доступна команда «Подробнее», читающая `/v1/jobs/:id` из PostgreSQL.
- Кнопка «Результат» показывается только для терминальных состояний, чтобы не создавать ложное ожидание результата у queued/running jobs.
- `npm run typecheck` и production web build прошли.

### 401. История попыток доступна оператору
- Добавлен `GET /v1/jobs/:id/attempts`: возвращает все попытки задачи в PostgreSQL с node, fencing token, lease, heartbeat, состоянием и ошибками.
- Действие «Подробнее» в Job Queue теперь объединяет durable job detail и полную историю попыток, что позволяет разбирать retry/reconcile после перезапуска worker.
- `npm run typecheck`, `npm run check:release -- --skip-build` и `smoke_job_result` прошли.

### 402. История попыток визуализирована в Job Queue
- После «Подробнее» в offcanvas появляется компактная лента attempt history: состояние, node и время создания, а при наличии — короткая причина ошибки.
- Технический JSON сохранён как диагностический fallback, но основной recovery-сценарий теперь читается без ручного разбора payload.
- `npm run typecheck` и production web build прошли.

### 403. Reconcile получил подтверждение оператора
- Действие reconcile теперь требует явного подтверждения и передаёт решение вместе с provenance (`reconciledBy`, `decision`).
- API-контракт поддерживает оба исхода (`success` и `failed`); текущая кнопка ошибки использует новый безопасный обработчик.
- `npm run typecheck` прошёл.

### 404. В Job Queue доступны оба решения reconcile
- Для состояния `reconciling` UI теперь показывает отдельные действия «Признать успешной» и «Зафиксировать ошибку».
- Оба действия требуют подтверждения и используют общий API с явным decision/provenance; успешный путь сохраняет manifest reconcile.
- `npm run typecheck` и `smoke_reconcile_resolve` прошли.

### 405. Полный production/lab gate после recovery UI
- `npm run check:production` прошёл: 17 миграций, release/security gates, auth, retry/export, CAS worker E2E и API load (~1000 req/s).
- `npm run check:lab` прошёл: readiness fail-closed, runtime health, ComfyUI H3 schema, references, immutable profile injection, revision activation и worker E2E.
- После проверок активных queued/leased/running задач не создавалось; изменения готовы к следующему live R2V прогону.

### 406. Live runtime checkpoint перед следующим R2V
- API `/ready` вернул `ready`: PostgreSQL, ComfyUI и llama.cpp доступны.
- `/v1/runtime` подтвердил H3 capability (`MiniMaxH3ReferenceToVideo`, `RandomNoise`, `SaveVideo`); online worker `local-qwen` присутствует.
- ComfyUI queue пуста (`0 running / 0 pending`), поэтому следующий live R2V можно запускать без очистки зависших задач.

### 407. Durable attempt history защищена smoke-тестом
- Добавлен `smoke:job-attempts`, который создаёт реальную PostgreSQL job/attempt и проверяет `GET /v1/jobs/:id/attempts` через Fastify inject.
- Smoke включён в `check:production`; endpoint подтверждён с реальным `attempt_id`, а не только статическим контрактом.
- `npm run smoke:job-attempts` и `npm run typecheck` прошли.

### 408. Job Queue получила heartbeat observability
- `/v1/jobs` теперь включает `lease_expires_at` и `heartbeat_seq` последней попытки; Queue показывает heartbeat рядом с состоянием worker.
- Оператор видит признак активности lease до открытия полной истории попыток.
- `npm run typecheck` и `smoke:job-catalog` прошли.

### 409. Lease отображается в человеческом виде
- В карточке задачи добавлен относительный lease-индикатор: «lease ещё N с» или «lease истёк».
- Значение вычисляется от durable `lease_expires_at` и обновляется вместе с очередью каждые 5 секунд.
- `npm run typecheck` и production web build прошли.

### 410. Production gate включает attempt history
- Полный `npm run check:production` прошёл после добавления `smoke:job-attempts`.
- Подтверждены 17 миграций, release/security, auth, retry/export, durable attempt history, ComfyUI collect, CAS worker E2E и API load 1024 req/s.

### 411. Добавлена компактная полоса timeline
- В центральном рабочем поле появилась read-only последовательность всех шотов проекта с общей длительностью.
- Клик по сегменту переключает текущий shot; существующие формы, queue и Media Pool не изменены.
- Полоса горизонтально прокручивается на узких экранах; `npm run typecheck` и production web build прошли.

### 412. Исправлено смешивание контекста Queue и результата
- При открытии результата задачи история попыток предыдущей job очищается, поэтому в интерфейсе не остаются устаревшие recovery-данные.
- `npm run typecheck` прошёл.

### 413. Timeline получила контекст сцены
- Каждый сегмент timeline теперь имеет native tooltip с названием сцены; одинаковые названия шотов различимы при наведении.
- Изменение не добавляет состояния и не меняет модель данных; `npm run typecheck` прошёл.

### 414. Lab gate после timeline и recovery UI
- `npm run check:lab` прошёл полностью: readiness, runtime health, ComfyUI schema, H3 references, immutable profile injection/revision activation и worker E2E.

### 415. Timeline показывает сцену непосредственно
- В каждом сегменте timeline теперь видны номер, название сцены, название шота и длительность; tooltip сохранён для длинных названий.
- `npm run typecheck` прошёл.

### 416. Timeline meta-иерархия отполирована
- Подпись сцены оформлена вторичным мета-текстом с обрезанием длинных названий; основной акцент остаётся на названии shot.
- `npm run typecheck` прошёл.

### 417. Runtime checkpoint после UI-полировки
- `/ready` снова вернул `ready`; PostgreSQL, ComfyUI и llama.cpp доступны.
- Worker `local-qwen` остаётся `online` с актуальным heartbeat; исторические node-записи корректно отмечены `stale`.
- ComfyUI queue пуста (`0 running / 0 pending`), инфраструктура готова к следующему live H3 R2V.

### 418. Release gate после timeline metadata
- `npm run check:release` прошёл: typecheck, web build, 17 migrations, domain/skeleton/auth, proxy и systemd hardening.
- Production bundle собирается без предупреждений, timeline и lease-индикаторы не нарушили контракт приложения.

### 419. Открытая attempt history обновляется автоматически
- Выбранная job запоминается в UI; каждые 5 секунд история попыток перечитывается из `/v1/jobs/:id` и `/v1/jobs/:id/attempts` вместе с очередью.
- Оператор видит актуальные переходы состояния без ручного повторного открытия карточки.
- `npm run typecheck` прошёл.

### 420. Release gate после live attempt refresh
- `npm run check:release` прошёл: web build, typecheck, migrations, domain/skeleton/auth, proxy и systemd hardening.
- Автообновление attempt history не изменило API-контракты и не вызвало регрессий сборки.

### 421. Roadmap синхронизирован с текущим UI
- Статус обновлён на 2026-09-10: timeline overview добавлен в этап Assets/preview.
- Незакрытыми явно остаются полноценный TresJS compositor, второй физический worker, длительные fault/load drills и согласование SLA RPO/RTO.

### 422. Повторный live H3 R2V E2E подтверждён
- Создан и утверждён job `88fb4b91-63c5-4a35-bf73-357d38054ee9` с активным профилем `video-minimax-h3-r2v` и CAS image reference.
- Worker/ComfyUI завершили lifecycle `queued → succeeded`; manifest hash `0fcd110ff2526cd269563f044775b333d287e42d1b71e30587dab005d3b7da07`, output AssetVersion `bd039fa2-b91f-454a-86ac-dd15a7c1251a` (`video/mp4`, 116370 bytes).
- Final take выбран оператором через API; ComfyUI queue после прогона пуста.

### 423. CAS output прошёл физическую проверку
- Последний выбранный AssetVersion скачан через `/v1/assets/:id` из CAS без обхода API.
- `ffprobe` подтвердил контейнер MP4, H.264 video 768×432, AAC audio и длительность 0.917 s.
- Файл распознаётся как ISO Base Media; результат пригоден для дальнейшего preview/download в UI.

### 424. Визуальная проверка live R2V preview
- Из последнего MP4 извлечён первый кадр 768×432; PNG валиден и визуально пригоден для режиссёрского preview: различимы персонаж, световой контраст и окружение.
- Проверка выполнена на байтах, полученных через CAS API, а не на исходном файле ComfyUI.

### 425. Production acceptance checklist формализован
- В `docs/operations.md` добавлен обязательный checklist выпуска: второй физический worker, fault-drills, RPO/RTO/retention/quota, backup rehearsal и fencing после ротации credentials.
- Документ явно отделяет подтверждённый локальный single-worker контур от условий масштабирования production.

### 426. Зафиксирована H3 quality A/B стратегия
- Текущий `minimax_h3_ref2v_turbo_4step_v0.1` обозначен как draft/скоростной профиль; его нельзя считать quality-default без сравнения.
- Для 8-step теста требуется отдельный immutable profile с теми же seed/prompt/references/resolution/length; сравниваются identity, motion, audio, VRAM и latency.

### 427. UI помечает 4-step как draft
- При выборе turbo-профиля UI явно предупреждает, что 4-step — скоростной draft, пока не выполнено сравнение с 8-step quality-профилем.
- Это предупреждение не блокирует подготовку задачи и не меняет immutable workflow snapshot.
- `npm run typecheck` прошёл.

### 428. 8-step quality blocker подтверждён повторно
- Повторный запрос ComfyUI `/object_info` показывает для `LoraLoaderModelOnly` только H3 4-step LoRA; 8-step Ref2VA/PDD файл по-прежнему отсутствует.
- A/B quality-прогон сейчас нельзя проводить корректно без разрешённой установки совместимой 8-step модели и перезапуска ComfyUI.

### 429. H3 preflight проверяет наличие LoRA
- `preflightH3Runtime` теперь сопоставляет `LoraLoaderModelOnly.inputs.lora_name` профиля с каталогом LoRA из ComfyUI `/object_info`.
- Профиль с отсутствующей LoRA отклоняется до активации с кодом `COMFY_MISSING_LORA`; это защищает будущий 8-step профиль от дорогого заведомо неверного запуска.
- `npm run typecheck`, `smoke:profile-revision-activate` и `smoke:h3-profile` прошли.

### 430. Негативный LoRA preflight закреплён smoke-тестом
- `smoke:h3-preflight` теперь проверяет отказ профиля при отсутствующей LoRA (`COMFY_MISSING_LORA`) и сохраняет проверку обязательных H3-классов.
- `npm run smoke:h3-preflight` и `npm run typecheck` прошли.

### 431. Production gate после LoRA guard
- `npm run check:production` прошёл полностью: 17 migrations, release/security, auth, retry/export, attempt history, ComfyUI collect, CAS worker E2E и API load 1061 req/s.
- Проверка подтверждает, что quality preflight добавлен без регрессии текущего 4-step production-контура.

### 432. Clean runtime после quality gate
- `/ready` сообщает `ready`, ComfyUI queue пуста, queued jobs отсутствуют.
- В durable catalog нет `leased/running/cancel_requested/reconciling` задач; 24 `awaiting_approval` — исторические подготовленные jobs, не активные исполнения.

### 433. README синхронизирован с quality-ограничением H3
- README теперь явно называет текущий 4-step Turbo draft-профилем и указывает, что 8-step A/B невозможен до установки совместимой LoRA в PVE.
- `check_skeleton.py` и `npm run typecheck` прошли.

### 434. Сверка продуктовых поверхностей с Director Studio
- Добавлена `docs/reference-parity.md` с матрицей: закрытые durable execution возможности, отсутствующие Actor/Scene/Prop workflows, Layout study, structured six-section H3 prompt, custom workflow wizard, local Director planner, VRAM exclusivity и packaging.
- Зафиксирован порядок следующего этапа: structured H3 prompt → typed Media Pool → Layout → custom workflow wizard → local planner → VRAM coordinator/second worker → portable packaging.
- README получил ссылку на parity backlog.

### 435. Индикатор полноты режиссёрского брифа
- В контракт добавлены стабильные секции `prompt/camera/action/composition/lighting/sound/transition` и helper `getDirectorPromptCompleteness`.
- В shot editor появился ненавязчивый readiness-индикатор 0–100% и подсказка о незаполненных секциях; это не ломает быстрый draft и не меняет immutable snapshot.
- `npm run typecheck` и `check_skeleton.py` прошли.

### 436. Readiness сохранён в immutable job plan
- `createDirector` теперь вычисляет `promptCompleteness` тем же контрактным helper и сохраняет `filled/missing/score` в `plan_json`.
- Метрика доступна для аудита и будущих quality-gates без блокировки draft-режима и без изменения уже созданных задач.
- `npm run typecheck` и `check_skeleton.py` прошли.

### 437. Typed Media Pool metadata
- Миграция `018_asset_catalog_metadata.sql` добавляет `asset_kind` и `tags` к `asset_versions` с безопасным default `reference`.
- Импорт ассета принимает проверяемые `assetKind/tags`, сохраняя типизацию в CAS-каталоге; поддержаны actor/scene/prop/audio/layout/reference/video/other.
- `npm run typecheck` и `check_skeleton.py` прошли. Existing imports остаются обратно совместимыми через default.

### 438. Typed metadata surfaced by asset catalog API
- `listAssets` теперь возвращает `asset_kind` и `tags` для project-scoped и global Media Pool выдачи.
- Это позволяет UI и будущему поиску фильтровать ассеты по назначению без чтения provenance вручную.
- `npm run typecheck` и `npm run check:migrations` прошли (18 миграций).

### 439. Media Pool filter by asset kind
- В инспекторе добавлен фильтр `Все типы/Персонажи/Локации/Предметы/Аудио/Layout/Референсы/Видео`.
- В строке ассета отображается `asset_kind`, полученный из API; выбор референса и существующие роли остаются совместимыми.
- `npm run typecheck` и `npm run check:migrations` прошли.

### 440. Тип и теги при импорте ассета
- В Media Pool добавлены поля типа и тегов перед загрузкой файла.
- UI отправляет `assetKind/tags` в `/v1/assets/import`; backend валидирует и сохраняет их в `asset_versions`.
- `npm run typecheck` и `npm run check:migrations` прошли.

### 441. Lineage при импорте ассета
- `/v1/assets/import` принимает `derivedFromAssetVersionIds`; backend проверяет существование родителей и сохраняет связь в provenance.
- Отсутствующий родитель отклоняется с `LINEAGE_PARENT_NOT_FOUND`; CAS blobs остаются неизменяемыми.
- `npm run typecheck` и `npm run check:migrations` прошли.

### 442. Детальный AssetVersion возвращает lineage metadata
- `GET /v1/assets/:assetVersionId` теперь возвращает provenance, `asset_kind`, tags и `created_at` вместе с CAS storage metadata.
- Операторские preview/export инструменты могут восстановить происхождение без отдельного запроса к БД.
- `npm run typecheck` и `npm run check:migrations` прошли.

### 443. Production gate после typed/lineage изменений
- Миграция 018 применена в PostgreSQL; `npm run check:production` прошёл полностью: release/security, auth, multi-node, retry/export, shot prompt, attempt history, Comfy collect, worker E2E и API load (1101 req/s).
- Runtime-контур не получил регрессий после расширения AssetVersion metadata.

### 444. API для просмотра AssetVersion lineage
- Добавлен `GET /v1/assets/:assetVersionId/lineage`, возвращающий тип/теги ассета и метаданные всех родительских версий.
- Ответ строится только из immutable CAS-каталога и provenance; отсутствующий ассет даёт 404.
- `npm run typecheck` и `npm run check:migrations` прошли.

### 445. PVE 8-step LoRA и реальный прогон подтверждены
- Свежий `/object_info` PVE объявляет `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors`; 4-step Ref2V также доступен.
- Операторский 8/8 прогон завершился успешно за 272.13 s; два 4/4 прогона ранее заняли 3.86 и 4.68 s.
- Следующий quality gate: подтвердить, что доступная 8-step FL2V LoRA совместима с нашим Ref2V workflow; затем создать отдельный immutable quality-профиль и провести одинаковый A/B (seed/prompt/refs/size/length) по визуальной оценке и VRAM/latency.

### 446. Guard FL2V LoRA в Ref2V профиле
- H3 preflight теперь отклоняет граф `MiniMaxH3ReferenceToVideo`, если он пытается загрузить LoRA с `fl2v` в имени (`COMFY_INCOMPATIBLE_LORA`).
- Smoke-тест закрепляет missing-LoRA и FL2V/Ref2V incompatibility cases; это предотвращает ложный quality-профиль до подтверждения совместимого файла.
- `npm run typecheck` и `npm run smoke:h3-preflight` прошли.

### 447. Live lab gate после LoRA guard
- `npm run check:lab` прошёл: readiness fail-closed, runtime health, allowlisted Comfy schema, H3 reference injection, immutable profile activation и worker CAS E2E.
- Текущий live runtime остаётся пригодным для отдельного quality A/B; FL2V/Ref2V guard не ломает существующий контур.

### 448. Lineage endpoint smoke и источник ускорения H3
- Добавлен `smoke:asset-lineage` в `check:production`; реальный PostgreSQL smoke подтвердил 200 и возврат родительского AssetVersion.
- Пользователь указал видео с практиками ускорения MiniMax H3; YouTube не отдал содержимое через автоматический просмотр, поэтому настройки из ролика не считаются проверенными фактами.
- Любые ускорения (LoRA/steps/VRAM offload) далее фиксируем отдельной immutable revision и проверяем одинаковым A/B.

### 449. Полный production gate с lineage smoke
- `npm run check:production` прошёл после добавления `smoke:asset-lineage`: 18 migrations, release/security, auth, multi-node, retry/export, shot prompt, job attempts, lineage, Comfy collect, worker E2E и API load 1141 req/s.
- PostgreSQL каталог и runtime-контур остаются чистыми после smoke cleanup.

### 450. Найден кандидат на настоящий 8-step Ref2VA
- Официальные/первичные описания Comfy-Org подтверждают, что доступная `minimax_h3_fl2v_turbo_8step...` относится к FL2V, а отдельные PDD-Acc материалы публикуют `minimax_h3_ref2va_pdd_acc_8step_comfyui.safetensors` для Ref2VA.
- Кандидат только зафиксирован в runbook; скачивание/установка не выполнялись. Нужны лицензия, digest, совместимость UNet и явное разрешение перед изменением PVE.

### 451. H3 preflight quality classification
- Preflight возвращает `qualityHint`: `draft-4step`, `quality-8step` или `unknown` по фактической LoRA профиля.
- Классификация информационная и не подменяет визуальный A/B; FL2V/Ref2V incompatibility guard срабатывает раньше.
- `npm run typecheck` и `npm run smoke:h3-preflight` прошли.

### 452. Quality hint отображается в UI
- После preflight UI показывает оператору `4-step draft`, `8-step quality` или `не определён` рядом с кнопкой проверки профиля.
- Ошибка несовместимого FL2V/Ref2V по-прежнему показывается в техническом результате и не позволяет принять профиль.
- `npm run typecheck` и `npm run smoke:h3-preflight` прошли.

### 453. Матрица H3-оптимизаций по транскрипции ролика
- Добавлена `docs/h3-optimization-lab.md`: отдельные immutable кандидаты 4-step draft, Ref2VA 8-step quality, Sage/Soul + Block Cache и latent upscale.
- Зафиксированы одинаковые A/B-параметры и метрики (latency, peak VRAM, identity, motion, texture, flicker, audio sync).
- Экспериментальные custom nodes не устанавливались; FL2V/Ref2V смешивание запрещено.

### 454. Инвентаризация H3 optimization nodes в PVE
- `/object_info` PVE обнаружил `MiniMaxH3MemoryEfficientSageAttentionPatch`, `EasyCache`, `LazyCache`, `LatentUpscale` и `LatentUpscaleBy`; Soul Attention не обнаружен.
- `preflightH3Runtime` теперь возвращает `optimizationNodes`, чтобы UI/аудит видел доступные ускорители без включения их в граф.
- Наличие класса не считается доказательством совместимости; нужен отдельный workflow smoke на целевой GPU.

### 455. Optimization inventory отображается в UI
- Результат preflight рядом с quality hint показывает доступные optimization nodes PVE.
- Список информационный: UI не меняет graph и не активирует ускорители автоматически.
- `npm run typecheck` и `npm run smoke:h3-preflight` прошли.

### 456. Release gate после optimization inventory UI
- `npm run check:release` и `check_skeleton.py` прошли: production web build, 18 migration contract, domain/skeleton, bind guard, proxy и systemd hardening.

### 457. Runtime snapshot перед quality A/B
- `/ready` = `200 ready`; ComfyUI и llama.cpp healthy, storage healthy.
- `/v1/runtime`: ComfyUI H3 capability доступна, latency 161 ms; текущий `local-qwen` worker online с heartbeat менее минуты назад.
- Durable jobs не показывают активного исполнения в snapshot; исторические stale nodes сохранены для аудита и не назначаются scheduler.

### 458. Optimization nodes в runtime health
- `/v1/runtime` для ComfyUI теперь публикует `capabilities.optimizationNodes` из `/object_info`.
- Оператор видит доступность Sage patch/EasyCache/LatentUpscale ещё до preflight профиля; включение в graph остаётся отдельным immutable экспериментом.
- `npm run typecheck` и `npm run smoke:runtime-health` прошли.

### 459. Optimization inventory в runtime panel UI
- Runtime panel теперь показывает список доступных PVE ускорителей рядом со статусами ComfyUI/llama.cpp.
- Типизация runtime DTO расширена `optimizationNodes`; `npm run typecheck` прошёл.

### 460. Runtime optimization inventory smoke
- `smoke:runtime-health` теперь проверяет содержимое `capabilities.optimizationNodes`, включая Sage patch и EasyCache.
- Контракт observability защищён от тихой потери inventory при изменениях `/v1/runtime`.

### 461. Runtime smoke включён в production gate
- `check:production` теперь запускает `smoke:runtime-health` вместе с auth, jobs, lineage, Comfy collect, worker E2E и API load.
- Полный gate после изменения прошёл; API load 1109 req/s.

### 462. Lab gate после runtime observability
- `npm run check:lab` прошёл полностью: readiness, runtime health с optimization inventory, Comfy schema, H3 references, immutable profile activation и worker CAS E2E.

### 463. Воспроизводимая карточка H3 A/B
- В `docs/h3-optimization-lab.md` добавлен manifest-шаблон контрольного прогона: graph/profile/model digests, входы, latency/VRAM, output hash и ручные quality scores.
- A/B разрешён только при одинаковых входах и `workflow_mode`; изменение LoRA/UNet/attention/cache требует новой immutable revision.

### 464. Typed metadata в timeline read-model
- Timeline и job result queries теперь включают `asset_kind` и `tags`, поэтому Media Pool получает одинаковые metadata для глобальных и привязанных к шоту ассетов.
- `npm run typecheck` и `npm run smoke:shot-prompt` прошли.

### 465. Production gate после typed timeline metadata
- Полный `npm run check:production` прошёл после изменения timeline/job result queries; включены runtime inventory и lineage smoke.
- Worker CAS E2E и API load также зелёные (1011 req/s).

### 466. Сброс stale preflight state в UI
- При смене workflow-профиля UI очищает предыдущие `qualityHint` и optimization inventory до новой проверки.
- Это исключает ложное отображение 4-step/8-step статуса от ранее выбранной ревизии.
- `npm run typecheck` прошёл.

### 467. Сброс preflight при смене execution mode
- При переключении llama.cpp/ComfyUI preflight quality и optimization inventory также очищаются.
- H3-specific readiness больше не отображается в нерелевантном execution mode.
- `npm run typecheck` прошёл.

### 468. Layout reference role в job contract
- Director job API и PostgreSQL validation теперь принимают роль `layout` для image AssetVersion.
- Семантика остаётся композиционной Picture reference; роль не превращается в I2V first-frame.
- `npm run typecheck` и `npm run smoke:shot-prompt` прошли.

### 469. Быстрое назначение Layout в Media Pool
- В инспекторе добавлено действие «Назначить выбранное как Layout» для выбранных AssetVersion.
- Действие меняет только роль reference в текущем shot draft; Layout остаётся композиционным Picture reference и попадает в immutable job snapshot при submit.
- `npm run typecheck` прошёл.

### 470. Layout selection visibility
- UI показывает счётчик выбранных Layout references рядом с действием назначения.
- Это делает композиционные refs явными до submit и не меняет семантику H3 boundary.
- `npm run typecheck` прошёл.

### 471. Повторяемая установка user-units
- Добавлен `scripts/install_user_units.sh`: устанавливает только API/worker/web шаблоны в user systemd и делает daemon-reload/enable.
- Скрипт намеренно не останавливает и не запускает процессы, чтобы не прерывать ручную лабораторию.
- `bash -n scripts/install_user_units.sh` и `check_skeleton.py` прошли.

### 472. User-units установлены в локальной лаборатории
- Скрипт установки выполнен: `qwendirector-api.service`, `qwendirector-worker.service` и `qwendirector-web.service` установлены и включены в user target.
- Все юниты пока `inactive`, текущий API продолжает работать вручную через `tsx`; это предотвращает двойной запуск и конфликт портов.
- Для переключения после остановки ручных процессов использовать `systemctl --user start qwendirector-api.service qwendirector-worker.service qwendirector-web.service`, затем проверить `/ready` и `/v1/runtime`.

### 473. Production user-unit smoke и исправление запуска API
- Выявлен и исправлен эксплуатационный дефект шаблонов: user systemd не наследовал NVM PATH, а API unit не задавал `QWEN_API_AUTOSTART=true`.
- В шаблоны добавлены явный Node 24 PATH и autostart-флаг API; units перезагружены.
- API теперь `active`, `/ready` отвечает 200, а `/v1/runtime` в живом процессе показывает H3 optimization inventory: SageAttention, EasyCache, LazyCache и LatentUpscale варианты.
- Worker и web preview также запущены units; worker пока не регистрируется, если его `QWEN_API_BASE_URL`/token не совпадают с локальным API, это следующий runtime-конфигурационный check.

### 474. PostgreSQL user-unit runtime подтверждён
- API unit переведён на PostgreSQL socket URL с peer-аутентификацией; явные `QWEN_STORAGE=postgres` и `DATABASE_URL` задаются в `ExecStart`, чтобы не переопределяться лабораторным `.env`.
- После исправления `%`-экранирования systemd API и worker активны; `GET /v1/nodes` отвечает 200 и показывает `local-qwen` online.
- `/v1/runtime` продолжает отдавать ComfyUI H3 capability и optimization inventory; web preview активен на `127.0.0.1:4173`.
- Первый worker registration может логировать transient fetch failure во время рестарта API, но heartbeat/регистрация после готовности API подтверждены состоянием node `online`.

### 475. Readiness-gate для worker unit
- В `qwendirector-worker.service.example` добавлен `ExecStartPre`, ожидающий `/ready` API до 30 секунд перед запуском worker.
- При рестарте API+worker проверено: оба units `active`, node `local-qwen` снова `online`; гонка старта больше не приводит к запуску worker до readiness.

### 476. Recovery smoke включён в production gate
- `check:production` теперь запускает `smoke:failure-lifecycle`, `smoke:reconcile` и `smoke:reconcile-resolve`.
- Production gate реально покрывает failure → failed, expired lease → unknown/reconciling и операторское разрешение unknown attempt.
- Полный `npm run check:production` прошёл; API load smoke: 1197 req/s.

### 477. Явная worker runtime-конфигурация
- Worker unit теперь явно задаёт `QWEN_API_BASE_URL`, стабильный UUID node и `QWEN_INSTANCE_ID`; перенос/перезапуск не зависит от неявных fallback-значений.
- После daemon-reload и restart worker остаётся `active`, а `local-qwen` подтверждён `online` через `/v1/nodes`.

### 478. Повторная лабораторная проверка после systemd hardening
- `npm run check:lab` прошёл: readiness fail-closed, runtime health, allowlisted ComfyUI schema, H3 reference bindings, immutable profile injection, transactional revision activation и worker CAS E2E.

### 479. H3 capability advertisement в живом worker
- Worker объявляет `adapters`, `h3=true` и список доступных optimization nodes; это позволяет PostgreSQL `@>` claim-фильтру не направлять H3 job на несовместимый узел.
- После удаления дублирующего ручного worker и чистого systemd restart `/v1/nodes` подтвердил актуальный capability payload и статус `local-qwen=online`.

### 480. Capability inventory синхронизирован с ComfyUI runtime
- Worker перед регистрацией запрашивает `/v1/runtime` и берёт `h3`/`optimizationNodes` из живого ComfyUI snapshot; статический optimistic список больше не является источником истины.
- На PVE runtime подтверждены H3 и пять доступных optimization nodes; worker registry после restart содержит этот payload.
- `npm run typecheck` прошёл.

### 481. Production gate после dynamic capabilities
- Полный `npm run check:production` прошёл после изменения worker startup; recovery, fencing, CAS/provenance, H3 runtime и worker E2E не регрессировали.
- API load smoke: 1354 req/s.

### 482. Единый runtime snapshot с node health
- `/v1/runtime` в PostgreSQL-режиме теперь включает `nodes` рядом с backend checks: status, heartbeat и capabilities каждого worker.
- Живой snapshot после systemd restart подтвердил ComfyUI/llama.cpp `ok` и `local-qwen=online` с H3 capability payload.
- UI и мониторинг могут использовать один endpoint для backend и worker health, без рассинхронизации отдельных запросов.

### 483. Production baseline после runtime snapshot
- Все три user units (`api`, `worker`, `web`) остаются `active`; дублирующих ручных API/worker процессов не обнаружено.
- `/ready` отвечает 200; единый `/v1/runtime` показывает оба backend runtime `ok` и один актуальный worker `online` (исторические smoke nodes остаются `stale` и не участвуют в claim).

### 484. Реальный backup/restore rehearsal
- Создан локальный backup snapshot `.data/backups/production-check-20260910` через `backup:local`.
- `backup:verify` подтвердил manifest и hashes 9 CAS-файлов.
- `backup:restore-rehearsal` восстановил dump в изолированную PostgreSQL БД, проверил 14 public tables и 8 AssetVersion CAS links, затем удалил временную БД.

### 485. Release и restore preflight после backup rehearsal
- `npm run check:release` прошёл: typecheck, web build, migration/domain/skeleton/systemd gates.
- `npm run backup:restore-preflight` подтвердил роль `la6` с правом создания изолированной БД; restore rehearsal готов к повторению.

### 486. Regression smoke для unified runtime nodes
- Добавлен `smoke:runtime-nodes`: PostgreSQL-backed test создаёт online node, вызывает `/v1/runtime` и проверяет capabilities в едином snapshot, затем удаляет test node.
- Smoke и полный `check:production` прошли; API load smoke: 1252 req/s.

### 487. UI использует unified runtime snapshot
- `loadRuntime` теперь принимает `nodes` из `/v1/runtime` и обновляет health panel одним authoritative ответом; отдельный `/v1/nodes` оставлен как fallback/ручное обновление.
- Web/API typecheck прошёл.

### 488. Устранён race health polling
- Автоматический 5-секундный refresh больше не вызывает отдельный `/v1/nodes`; worker health обновляется только из unified `/v1/runtime`.
- Ручное обновление исполнителей сохранено, но не может перезаписать более свежий runtime snapshot.
- `npm run typecheck` прошёл.

### 489. Stale worker visibility в UI
- В верхнюю health-панель добавлен счётчик `stale` для всех не-online исполнителей с подсказкой о недоступных узлах.
- Потерянный или устаревший worker теперь заметен до открытия настроек; online count и семантика claim не изменены.
- `npm run typecheck` прошёл.

### 490. Release build после health UX
- `npm run check:release` прошёл после stale-индикатора: web production bundle собран, 18 миграций, domain/skeleton, bind guard и systemd hardening подтверждены.

### 491. Live web preview синхронизирован
- После production build перезапущен `qwendirector-web.service`; unit `active`.
- `http://127.0.0.1:4173/` отвечает 200 с актуальным собранным интерфейсом.

### 492. User-session service invariant
- API, worker и web units одновременно `enabled` и `active`.
- Unified runtime snapshot подтверждает минимум один `online` node (`local-qwen`); проверка выполнена после web restart.

### 493. Lab gate расширен unified runtime nodes
- `check:lab` теперь включает `smoke:runtime-nodes`, поэтому лабораторный gate проверяет PostgreSQL node health внутри `/v1/runtime` вместе с H3 schema/reference/profile/E2E сценариями.
- Полный `npm run check:lab` прошёл.

### 494. Автовосстановление H3 capabilities после backend recovery
- Worker обновляет ComfyUI H3/optimization inventory перед каждым heartbeat, поэтому временная недоступность ComfyUI не требует ручного рестарта для возврата capability-флага.
- После restart worker typecheck прошёл, node `local-qwen` снова online с актуальным H3 payload.

### 495. Production gate после capability recovery
- Полный `npm run check:production` прошёл после heartbeat inventory refresh: approval/retry, failure/reconcile, multi-node fencing, CAS lineage, Comfy collect и worker E2E зелёные.
- API load smoke: 746 req/s (локальный прогон с параллельными сервисами; это диагностическое измерение, не SLA).

### 496. Online-first node health ordering
- `PgNodeRepository.list()` сортирует online nodes первыми, затем по свежести heartbeat и UUID.
- После API/worker restart `/v1/nodes` показывает актуальный `local-qwen` первым; stale historical nodes остаются видимыми, но не заслоняют активный ресурс.
- `npm run typecheck` прошёл.

### 497. Release gate после node ordering
- `npm run check:release` прошёл после изменения PostgreSQL node read-model: production web bundle, миграции, domain/skeleton, bind guard и systemd hardening зелёные.

### 498. Regression guard для online-first порядка
- `smoke:runtime-nodes` теперь проверяет, что свежий online node находится первым в unified snapshot перед stale nodes.
- Smoke и API/web typecheck прошли.

### 499. README синхронизирован с текущим режимом
- Убрана устаревшая формулировка «разработка на паузе»; Kadr указан как отдельный integration track, текущий QwenDirector продолжает развиваться автономно.
- README дополнен безопасным способом установки/запуска user-units без автоматической остановки лабораторных процессов.

### 500. Live H3 starter preflight
- `npm run preflight:h3-starter` успешно проверил PVE ComfyUI schema и H3 boundary (`MiniMaxH3ReferenceToVideo`, `RandomNoise`, `SaveVideo`), inventory содержит `LatentUpscale`/`LatentUpscaleBy`; submit не выполнялся.

### 501. Актуальный LoRA inventory для quality A/B
- Прямой `/object_info` PVE подтвердил только `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors` и `minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors`.
- Ref2VA 8-step в текущем PVE inventory отсутствует; автоматическая смена профиля не выполняется, чтобы не нарушить совместимость Ref2V boundary.

### 502. Компактный H3 inventory probe
- Добавлена команда `npm run probe:h3-inventory`, которая выводит только H3 LoRA, H3 node classes и доступные optimization nodes вместо тысяч строк полного `/object_info`.
- Живой probe подтвердил 2 H3 LoRA, 3 H3 node classes и 5 optimization nodes; `npm run typecheck` прошёл.

### 503. Discoverability H3 probe
- Команда `npm run probe:h3-inventory` добавлена в основной список production/lab проверок README.
- `check_skeleton.py` подтвердил локальные ссылки и обязательные документы после изменения.

### 504. Runtime baseline спустя непрерывную работу
- API, worker и web units остаются `active` при повторной проверке.
- Живой probe подтвердил ComfyUI `ok`, H3 `true`, 5 optimization nodes и 1 online worker.

### 505. H3 inventory включён в lab gate
- `check:lab` теперь запускает `probe:h3-inventory` рядом с runtime/schema/profile/reference checks.
- Полный live-lab gate прошёл после расширения; inventory PVE остаётся проверяемым артефактом каждого прогона.

### 506. Исправлен systemd code fence в operations runbook
- В `docs/operations.md` закрыт fenced-блок команд непосредственно после `systemctl --user status`; пояснение про `install_user_units.sh` снова находится вне shell-блока.
- `check_skeleton.py` прошёл; копирование команд из runbook теперь не захватывает русский текст.

### 507. Runtime baseline после документационных изменений
- Все units остаются `enabled` и `active`.
- Unified snapshot подтверждает `comfyui=true`, `h3=true`, 5 optimization nodes и 1 online worker.

### 508. Release/documentation baseline
- `check_skeleton.py` и `npm run check:release` прошли после синхронизации README/runbook.
- Подтверждены 18 contiguous migrations, domain/skeleton contracts, bind guard, web proxy и systemd hardening.

### 509. Длительный live baseline
- Повторная проверка показала все три units `active`, `/ready` с ComfyUI/llama.cpp/storage `ok`.
- H3 inventory PVE стабилен: FL2V 8-step, Ref2V 4-step, 5 optimization nodes и 3 H3 classes.

### 510. Production gate после live baseline
- Полный `npm run check:production` прошёл после стабильного live baseline; durable lifecycle, recovery, CAS/provenance и worker E2E зелёные.
- API load smoke: 1215 req/s.

### 511. H3 LoRA inventory в runtime и UI
- `/v1/runtime` теперь включает отфильтрованный `capabilities.h3Loras`; UI показывает список H3 LoRA рядом с optimization nodes.
- После restart API/worker/web живой snapshot подтвердил H3=true, 2 LoRA и 5 optimization nodes.
- `npm run typecheck` прошёл.

### 512. Runtime health smoke покрывает H3 LoRA
- `smoke:runtime-health` расширен mock schema с `LoraLoaderModelOnly` и проверкой фильтрации H3 LoRA.
- Smoke и API/web typecheck прошли.

### 513. Production gate после H3 LoRA contract
- Полный `npm run check:production` прошёл после изменения runtime capabilities; recovery, fencing, CAS/provenance, H3 E2E и unified runtime checks зелёные.
- API load smoke: 1238 req/s.

### 514. Release/documentation gate после H3 UI inventory
- `check_skeleton.py` и `npm run check:release` прошли после добавления H3 LoRA в runtime/UI.
- Подтверждены web build, 18 migrations, domain/skeleton, bind guard, proxy и systemd hardening.

### 515. Финальный live baseline текущей итерации
- API, worker и web units остаются `active`, `/ready` проходит.
- PVE inventory стабилен: FL2V 8-step и Ref2V 4-step LoRA, 5 optimization nodes и 3 H3 node classes.

### 516. Drift check после текущей итерации
- Все units снова `active`; unified runtime подтверждает оба backend `ok`, H3=true, 2 LoRA, 5 optimization nodes и 1 online worker.

### 517. Операторский stale reconcile в UI
- В настройках добавлена кнопка «Проверить stale», вызывающая `POST /v1/admin/nodes/reconcile` и затем обновляющая unified runtime snapshot.
- Живой вызов endpoint вернул `markedStale: 0`; online worker сохранён, исторические stale nodes остаются quarantined.
- `npm run typecheck` прошёл.

### 518. Release gate после stale reconcile UX
- `npm run check:release` прошёл: новый UI action, runtime snapshot и API контракт собираются в production bundle; systemd hardening и migration/domain gates без регрессий.

### 519. Итоговый production gate текущей итерации
- Полный `npm run check:production` прошёл после всех runtime/UI/reconcile изменений.
- Durable jobs, recovery/reconcile, multi-node fencing, CAS lineage, H3 inventory/runtime и worker E2E зелёные; API load smoke: 1358 req/s.

### 520. Live-lab gate после operator UX
- `npm run check:lab` прошёл после добавления stale reconcile action и H3 LoRA inventory UI; H3 schema, references, immutable profiles и CAS worker E2E без регрессий.

### 521. Production gate после operator UX
- Полный `npm run check:production` прошёл после stale reconcile и H3 inventory UI; durable lifecycle, recovery, CAS/provenance, H3 E2E и runtime checks зелёные.
- API load smoke: 1216 req/s.

### 522. Расширенный API load baseline
- Выполнен read-only `QWEN_LOAD_REQUESTS=1000 npm run smoke:api-load`.
- 1000 запросов `/health`/`/ready` завершились за 388 ms (2577 req/s); GPU jobs и данные не изменялись.

### 523. Live restart recovery drill
- Выполнен контролируемый `systemctl --user restart` API+worker.
- Через 6 секунд оба units `active`, `/ready` проходит, а `local-qwen` снова зарегистрирован `online` с обновлённым heartbeat.

### 524. Post-restart stability baseline
- Повторная проверка после recovery-дрилла подтвердила стабильное состояние без ручного вмешательства: API, worker и web units `active`.
- Unified runtime: ComfyUI `ok`, H3 capability `true`, один online worker `00000000-0000-4000-8000-000000000001`.

### 525. Сохранение режиссёрского prompt в существующем шоте
- `PgJobRepository.createDirector` теперь транзакционно сохраняет поля режиссёрской формы в `shots.director_prompt` и увеличивает `prompt_revision`/`plan_revision` перед созданием нового job.
- Повторный idempotent replay не создаёт лишнюю ревизию; timeline сохраняет последний утверждённый набор полей шота.
- Проверки: `npm run typecheck`, `npm run smoke:catalog`.

### 526. Детерминированная provenance-мета для H3 quality A/B
- Immutable H3 profile теперь вычисляет из графа `qualityHint` (`draft-4step`/`quality-8step`/`unknown`), `samplingSteps` и список LoRA.
- Эти поля входят в сохранённый `workflowProfile`, поэтому результаты A/B можно группировать по graph hash, LoRA и числу шагов без ручного разбора workflow JSON.
- Проверки: `npm run typecheck`, `npm run smoke:h3-profile`, `npm run smoke:worker-h3-injection`.

### 527. CAS/staging retention dry-run
- Выполнены `npm run cas:gc-report` и `npm run staging:gc-report` с grace period 24 часа.
- CAS: просканировано 9 объектов, 8 ссылок из `asset_versions`, eligible orphan отсутствует; staging: eligible stale-файлов нет.
- Удаление остаётся намеренно отдельной операторской процедурой после согласования retention/RPO/RTO.

### 528. Regression smoke для catalog prompt persistence
- Расширен `smoke:workflow-job-plan`: существующий shot передаёт H3 job, проверяется сохранение `director_prompt` и увеличение `prompt_revision`, а невалидный новый workflow по отдельному idempotency key отклоняется с `400`.
- Проверка прошла: `npm run smoke:workflow-job-plan`.

### 529. Полный production gate после catalog/H3 изменений
- `npm run check:production` завершился успешно: миграции, release checks, auth/bind guard, runtime health и node health, lifecycle/reconcile/retry, export, shot prompt, CAS lineage, Comfy collect, worker E2E и API load smoke без регрессий.

### 530. Live H3 inventory: доступен Ref2VA 8-step кандидат
- `npm run probe:h3-inventory` подтвердил на PVE `MiniMax-H3-Ref2VA-Acc-8Step.safetensors` и `MiniMax-H3-FL2VA-Acc-8Step.safetensors` наряду с текущими Turbo 4-step/FL2V 8-step LoRA.
- Обязательные H3-ноды и пять optimization nodes доступны. Ref2VA 8-step пока не становится default: требуется digest, отдельный immutable profile и три парных A/B-прогона на одинаковых входах.

### 531. Lab gate после обновления H3 quality inventory
- `npm run check:lab` завершился успешно: readiness fail-closed, runtime/node health, live H3 inventory, Comfy schema, references, immutable profile activation и worker E2E без регрессий.

### 532. Разделение H3 LoRA по workflow mode
- `probe:h3-inventory` теперь явно выводит `ref2vLoras`, `fl2vLoras` и кандидатов `ref2v8step`/`ref2v4step`.
- Live PVE классифицирован однозначно: `MiniMax-H3-Ref2VA-Acc-8Step.safetensors` — quality-кандидат для Ref2V; `MiniMax-H3-FL2VA-Acc-8Step.safetensors` не допускается в Ref2V boundary.

### 533. Contract smoke для Ref2VA 8-step
- `smoke:h3-preflight` теперь подтверждает, что `MiniMax-H3-Ref2VA-Acc-8Step.safetensors` получает `quality-8step`, а FL2V LoRA по-прежнему отклоняется на Ref2V boundary.
- Проверка прошла: `npm run smoke:h3-preflight`.

### 534. Quality provenance в workflow profile catalog
- API read-model `GET /v1/workflow-profiles` и `GET /v1/workflow-profiles/:id` теперь возвращает вычисленные из immutable graph поля `quality_hint`, `sampling_steps` и `loras`.
- Проверки: `npm run typecheck`, `npm run smoke:profile-revision-activate`.

### 535. Dedicated workflow profile read endpoint
- Добавлен `GET /v1/workflow-profiles/:id`, возвращающий immutable graph, revision state и quality provenance; это устраняет зависимость UI/оператора от списка только active-профилей.
- Smoke расширен проверкой Ref2VA 8-step metadata и transactional revision activation.

### 536. Release gate после profile read API
- `npm run check:release` прошёл: typecheck, web build, migration/domain/skeleton gates, API bind guard, proxy и systemd hardening.

### 537. Web type contract для quality provenance
- Тип модели workflow profiles в Vue расширен полями `quality_hint`, `sampling_steps` и `loras`, совместимыми с новым API read-model.
- Проверка: `npm run typecheck`.

### 538. Lab gate после profile read-model
- `npm run check:lab` прошёл после добавления profile endpoint и quality provenance: readiness, runtime inventory, H3 schema/references, profile revision activation и worker E2E зелёные.

### 539. Live service baseline после lab gate
- API, worker и web units `active`; `/ready` отвечает успешно.
- Runtime подтверждает ComfyUI `ok`, H3 `true`, 4 H3 LoRA в inventory и 1 online worker.

### 540. Provenance в ответе активации profile revision
- `POST /v1/workflow-profiles/:id/revisions/:revision/activate` теперь возвращает `qualityHint`, `samplingSteps` и `loras` активируемой ревизии вместе с graph hash.
- Smoke и typecheck прошли: `npm run typecheck`, `npm run smoke:profile-revision-activate`.

### 541. Реальный Ref2V quality profile на PVE
- Из сохранённого `/home/la6/Downloads/video_minimax_h3_r2v_api.json` создан отдельный профиль `h3-ref2v-quality-8step-local`; исходный workflow не изменён.
- Profile preflight на PVE прошёл: `active=true`, graph hash `5bc76c4a3aa1b344c0c4c4e6f5bc5dd1f6f46e5e0131adc132d2b45c43f74597`, `qualityHint=quality-8step`, `missingLoras=[]`.
- Профиль готов к парным A/B-прогонам, но quality default ещё не назначен до трёх повторений и ручной оценки.

### 542. Симметричный Ref2V draft profile для A/B
- Из исходного API workflow создан `h3-ref2v-draft-4step-local`; preflight на PVE прошёл с `qualityHint=draft-4step`, `missingLoras=[]`.
- Graph hash draft: `d8e09dedd9f9af50c31fab774b6876d26aef209caf48a0c9b172504d5c3ca02b`; quality profile hash отличается (`5bc76c…`), что обеспечивает воспроизводимое разделение вариантов.

### 543. Предварительная проверка реального A/B workflow
- Исходный Ref2V graph содержит два обязательных `LoadImage` (`bw-intro.jpg`, `bw-intro-1.jpg`), поэтому реальный A/B нельзя запускать без явной загрузки/привязки reference AssetVersion через Media Pool.
- Профили и preflight готовы; следующий безопасный шаг — использовать выбранные reference assets, затем запускать парные jobs с одинаковыми входами.

### 544. Fail-closed image binding для H3 jobs
- `createDirector` теперь отклоняет H3 workflow, если число `LoadImage` превышает число `referenceBindings.imageNodeIds`; references не могут незаметно остаться с placeholder filenames.
- Локальные 4-step и 8-step Ref2V profiles пересохранены с bindings `137,139`; quality profile повторно прошёл PVE preflight (`active=true`, `missingLoras=[]`).
- Проверки: `npm run typecheck`, `npm run smoke:h3-references`.

### 545. Binding guard в lab gate
- Добавлен `smoke:h3-binding-guard`, проверяющий HTTP `400 H3_WORKFLOW_IMAGE_BINDINGS_REQUIRED` для workflow с незаполненным `LoadImage` binding.
- Скрипт включён в `check:lab`; smoke прошёл.

### 546. Lab gate с fail-closed reference bindings
- Обновлённый `npm run check:lab` прошёл: readiness, runtime inventory, H3 schema/references, binding guard, immutable profiles и worker E2E без регрессий.

### 547. Production gate после H3 binding guard
- `npm run check:production` прошёл после fail-closed image binding: migrations/release, auth, runtime/node health, durable lifecycle/reconcile/retry, CAS lineage, Comfy collect, worker E2E и API load smoke зелёные.

### 548. Live profile catalog after API restart
- После контролируемого restart API direct profile endpoint подтвердил оба варианта: draft 4-step (`active=false`, bindings `137,139`, steps `4`) и quality 8-step (`active=true`, bindings `137,139`, steps `8`).
- Worker остался `active`/online, ComfyUI `ok`.

### 549. Оба H3 A/B профиля доступны в UI-каталоге
- Draft профиль прошёл PVE preflight и активирован как selectable (не quality default).
- `GET /v1/workflow-profiles` теперь возвращает оба варианта: draft 4-step и quality 8-step; оба имеют `missingLoras=[]` и bindings `137,139`.

### 550. Первый реальный Ref2V 8-step job
- Через QwenDirector создан и утверждён job `344fa77f-1832-40f8-a197-6150cb62c649` с профилем `h3-ref2v-quality-8step-local` и новой `MiniMax-H3-Ref2VA-Acc-8Step.safetensors`.
- Реальный worker/ComfyUI attempt завершился `succeeded`; результат сохранён в CAS как AssetVersion `85bbcc15-d642-4c9c-bf2e-bc337d7c1413`, `video/mp4`, SHA-256 `b577e11969499f4c175ce00698bcdf7409d229c59b376e1fa42840ab97af49e0`.

### 551. Проверка CAS video delivery
- `HEAD /v1/assets/85bbcc15-d642-4c9c-bf2e-bc337d7c1413` вернул `200`, `content-type: video/mp4`, `content-length: 173114` и тот же SHA-256, что в manifest.

### 552. Media validation 8-step output
- `ffprobe` подтвердил MP4 H.264 `768×512`, 24 fps, 22 video frames и AAC audio track; длительность контейнера `0.917 s`, размер `173114` байт.
- Файл пригоден для дальнейшего просмотра/монтажа; короткая длительность соответствует тестовому `length=17` и не является production-quality оценкой.

### 553. Первый парный 4-step Ref2V job
- На тех же references, prompt, seed и разрешении запущен `h3-ref2v-draft-4step-local`; job `89e8bb1d-9855-4210-8279-2d0337b3ccef` завершился `succeeded`.
- CAS output: AssetVersion `07f301e2-c29f-4728-b77b-6bb8538d897c`, `video/mp4`, SHA-256 `b03c33073b1a92d1812bd941c5380389f0914a625c209c4224cc990c0e649830`.
- Реальная пара 4-step/8-step теперь собрана; следующий шаг — сравнить кадры, motion consistency, texture и flicker по карточке эксперимента.

### 554. Исправление включения 8-step LoRA и повторный baseline
- Контрольные кадры первого 8-step job побитно совпали с 4-step: исходный graph имел `PrimitiveBoolean` switch `146=false`, поэтому LoRA была отключена.
- Quality profile пересохранён с `146.value=true`, новый graph hash `7e1d542b47d6371761dcdd49256f1b03679d8b8b316350d1bbd39281d9d5c920`.
- Повторный 8-step job `8df5c061-48a8-461e-a654-08162089f358` завершился `succeeded`; CAS AssetVersion `530aed3d-e9fd-4b9b-bd7a-291b492631ae`, SHA-256 `660de317b2b1d5bfa4b9753bc0df7754c01e540d4b863fae46aa3a3259a3e9d8`.
- Контрольные кадры повторного 8-step имеют отличающиеся SHA от 4-step baseline; quality A/B теперь технически валиден.

### 555. Визуальный quality review A/B
- Контрольные кадры 4-step и исправленного 8-step просмотрены визуально: 8-step даёт более яркую/детализированную текстуру лица и материала, 4-step — более контрастный и цветно-агрессивный draft.
- Это предварительная ручная оценка одного короткого прогона; default quality profile не меняется до трёх повторений с заполненной карточкой motion/texture/flicker.

### 560. Численная проверка различия A/B
- Для соответствующих кадров 4-step и исправленного 8-step рассчитан FFmpeg PSNR: средний `12.777466 dB` (Y `11.229740 dB`), что подтверждает существенное различие видео.
- PSNR используется только как метрика различия, а не как оценка «лучше/хуже»; итоговое решение остаётся за ручной проверкой texture/motion/flicker.

### 562. Backup реальных A/B assets
- Создан backup `.data/backups/ab-baseline-20260910`; `npm run backup:verify -- .data/backups/ab-baseline-20260910` подтвердил БД и 9 CAS records.

### 563. Вторая парная A/B репетиция
- Повторены 4-step и 8-step jobs на одинаковых входах и seed `424243`; оба завершились `succeeded`.
- 4-step AssetVersion `aafeb066-0fe3-45bc-b445-4ffb743610a7`, SHA `a78a6b24ccba62df50e71565517a04d256dbb17f05799d5064adffb255f20eb5`; 8-step AssetVersion `37c9fa83-c677-492a-9474-2b5a792f1885`, SHA `43fa1a92567b4fda0c2d32d445c43828d42f1ff26a333da602603d24c15af2d7`.
- До минимального набора quality policy остаётся одна парная репетиция и ручная оценка карточек.

### 564. Третья парная A/B репетиция
- Повторены 4-step и 8-step jobs на одинаковых входах и seed `424244`; оба завершились `succeeded`.
- 4-step AssetVersion `eba6e616-e654-4b11-ab30-f22e97620370`, SHA `6b75721828cf6389202439daabab9b1099c81725929475da94487ed0d30374a0`; 8-step AssetVersion `4822c9ca-bc30-4799-b975-00a6069f9558`, SHA `6cc9bae7e076b27a46acf9b5bbb07f78879de9430704809d488d2a5dbd6ea262`.
- Минимум из трёх технически валидных пар выполнен; итоговый default по-прежнему требует ручной оценки карточек.

### 556. Стабилизация graphHash через canonical JSON
- Исправлен hashing H3 profiles: `graphHash` теперь рассчитывается по canonical JSON с сортированными ключами, а не по порядку полей входного объекта.
- Это устраняет расхождение hash между API/БД/worker для одного immutable graph.
- Проверки: `npm run typecheck`, `npm run smoke:h3-profile`, `npm run smoke:workflow-job-plan`.

### 557. Пересохранение live H3 profiles после hash fix
- Оба PVE профиля пересохранены и повторно прошли preflight после canonical hashing.
- Текущие active revisions: draft 4-step `r3`, hash `f0374ff99cc168f2fdaeeb2501cd9136b4b0e0925088db714d2cfd3527af900b`; quality 8-step `r4`, hash `1bb019734d4b07f4f6d26de352fec2d0c5c319d68b96ae7a39a0c1cc472f99d8`.

### 558. Canonical hash invariant smoke
- `smoke:h3-profile` теперь проверяет одинаковый `graphHash` для идентичного workflow при перестановке ключей JSON.
- Проверки: `npm run smoke:h3-profile`, `npm run typecheck`.

### 559. Release gate после canonical hashing
- `npm run check:release` прошёл после canonical graph hashing и исправления quality switch: web build, 18 migrations, domain/skeleton, bind guard, proxy и systemd hardening зелёные.

### 565. Подтверждение новой 8-step LoRA в live-профиле
- API/PVE-профиль `h3-ref2v-quality-8step-local` активен и использует `MiniMax-H3-Ref2VA-Acc-8Step.safetensors`.
- Текущие параметры профиля: `quality_hint=quality-8step`, `sampling_steps=8`, image bindings `137,139`, canonical graph hash `1bb019734d4b07f4f6d26de352fec2d0c5c319d68b96ae7a39a0c1cc472f99d8`.
- Переключатель LoRA в графе включён (`PrimitiveBoolean` node `146=true`); результаты трёх A/B пар технически различаются и сохранены в CAS. Ручная оценка motion/texture/flicker остаётся последним шагом перед сменой default quality.

### 566. Повторная лабораторная проверка H3 после установки 8-step LoRA
- `probe:h3-inventory` подтвердил наличие `MiniMax-H3-Ref2VA-Acc-8Step.safetensors` и корректную классификацию как `qualityCandidates.ref2v8step`.
- Live GET профиля подтвердил `active=true`, `quality_hint=quality-8step`, `sampling_steps=8`, LoRA и bindings `137,139`.
- `npm run check:lab` прошёл полностью: readiness/runtime, Comfy schema, H3 references и binding guard, worker injection, revision activation и worker E2E.

### 567. Production regression gate после quality-проверки
- `npm run check:production` прошёл полностью: миграции, release gate, auth/bind guards, metrics/runtime, multi-node fencing, failure lifecycle, reconcile/retry, exports, prompt/timeline, lineage, Comfy collection, worker E2E и API load.
- API load smoke: 100 запросов за 80 ms (≈1252 req/s) на локальном контуре.

### 568. Синхронизация acceptance-документации
- `docs/roadmap.md` и `docs/operations.md` синхронизированы с фактом: Ref2V 8-step A/B уже выполнен тремя парами, но quality-default ещё требует ручной карточки motion/texture/flicker.
- Старое утверждение о ещё не подтверждённой совместимости 8-step Ref2V удалено, чтобы acceptance checklist отражал текущий live-контур.

### 569. Проверка постоянно запущенного локального контура
- User units `qwendirector-api.service`, `qwendirector-worker.service` и `qwendirector-web.service` одновременно `active` и `enabled`.
- `/health` возвращает `status=ok`, `/ready` — `ready`; readiness подтверждает ComfyUI, llama.cpp и storage (`200`). Web preview отвечает собранным bundle на `127.0.0.1:4173`.

### 570. Регрессия для включённой quality LoRA
- `smoke_h3_profile.mjs` расширен проверкой quality-графа: Ref2VA 8-step LoRA распознаётся как `quality-8step`, шаги равны 8, список LoRA сохраняется, а boolean switch `146` обязан быть `true`.
- `npm run smoke:h3-profile` прошёл; это предотвращает повтор прежнего дефекта, когда LoRA присутствовала в JSON, но фактически была отключена.

### 571. Quality LoRA smoke включён в общий lab gate
- `check:lab` теперь запускает `smoke:h3-profile` после Comfy schema; защита switch/steps/LoRA выполняется вместе с остальными live-проверками.
- Полный `npm run check:lab` прошёл, включая inventory PVE, binding guard, profile activation и worker E2E.

### 572. Quality LoRA smoke включён в production gate
- `check:production` теперь также запускает `smoke:h3-profile` сразу после release gate.
- Полный `npm run check:production` прошёл; API load smoke подтвердил 100 запросов за 249 ms (≈401 req/s) на текущем локальном контуре.

### 573. Безопасный выбор H3 quality-профиля в UI
- Нормализованы snake_case-поля profile read-model (`quality_hint`, `sampling_steps`) в Vue.
- При первом открытии редактора UI теперь предпочитает активный `quality-8step` профиль вместо случайного первого профиля; явный выбор пользователя сохраняется.
- Выполнены `npm run typecheck`, `npm run build:web`; web unit перезапущен и отдаёт новый bundle `index-dOS-EFXj.js`.

### 574. Live-проверка UI/API после пересборки
- Web preview отдаёт новый bundle `index-dOS-EFXj.js` на `127.0.0.1:4173`.
- API `/ready` остаётся `ready`; ComfyUI, llama.cpp и storage отвечают `200` после перезапуска web unit.

### 575. Проверка runtime-логов после production gate
- Последние 120 записей API/worker через `journalctl` не содержат `error`, `fatal`, `uncaught`, `OOM` или необработанных исключений.
- Скрытых runtime-ошибок после пересборки и полного regression gate не обнаружено.

### 576. Аудит загрязнения локальной очереди smoke-данными
- Прямой read-only запрос PostgreSQL показал 24 jobs в `awaiting_approval`, 1 `cancelled`, 7 `failed` и 14 `succeeded`; attempts: 8 `failed`, 14 `succeeded`.
- Это ожидаемые артефакты повторных smoke-прогонов, но они не должны смешиваться с рабочей очередью оператора. Удаление не выполнялось; следующий production-шаг — изолировать lab fixtures отдельным namespace/БД либо добавить безопасный cleanup с retention и явным dry-run.

### 577. Безопасный smoke-job dry-run отчёт
- Добавлен `npm run report:smoke-jobs` (`scripts/report_smoke_jobs.mjs`): read-only отчёт по известным fixture project names, без удаления и без изменения БД.
- Первый запуск нашёл 23 job-кандидата; инструмент предназначен для операторского подтверждения перед будущей retention/cleanup процедурой.

### 578. README синхронизирован с состоянием очереди
- Убрано устаревшее утверждение о пустой очереди после прогонов; явно указано наличие лабораторных jobs и команда read-only отчёта.

### 579. Повторная проверка smoke-job отчёта
- Прямой запуск `node scripts/report_smoke_jobs.mjs` успешно сформировал JSON с `dryRun=true` и 23 кандидатами; состояние БД не изменялось.

### 580. Origin для изоляции лабораторных jobs
- Добавлена миграция `019_job_origin.sql`: jobs получают `origin=user|lab|system` с безопасным default `user` и constraint.
- Director API принимает явный `origin`; smoke-job отчёт показывает origin для операторской фильтрации. Старые записи не переписывались и остаются `user` до отдельного подтверждения.
- `npm run db:migrate` применил 19 миграций, typecheck прошёл.

### 581. Проверка схемы job origin
- Read-only транзакция PostgreSQL подтвердила default `'user'` и constraint `jobs_origin_check`; постоянные данные не создавались и транзакция откатана.

### 582. Очистка явно тестовых каталогов
- По явному запросу оператора удалены только проекты `workflow`, `profile-source`, `QwenDirector E2E` и `asset smoke`: 28 project/scene/shot записей, 31 jobs, 9 attempts и связанные manifest/asset links.
- Проекты `H3 Quality A/B`, `QwenDirector Live…`, `Новый проект 1` и CAS AssetVersion сохранены.
- После очистки осталось 15 jobs и 13 attempts в сохранённых проектах; операция выполнена транзакционно без касания инфраструктуры.

### 583. Чистый lab-прогон после очистки
- `npm run check:lab` повторно прошёл полностью на очищенной базе; PVE inventory, 8-step switch/LoRA regression, references, profile activation и worker E2E подтверждены.
- Автоматический post-run audit не обнаружил новых fixture-проектов: smoke-скрипты корректно убрали свои записи; сохранено 15 рабочих jobs в реальных проектах.

### 584. Baseline перед новым real-H3 прогоном
- `/v1/runtime` подтверждает ComfyUI `ok=true` (system_stats/object_info, latency 161 ms), H3 capability и Ref2VA 8-step LoRA; зарегистрирован один совместимый worker `local-qwen`.
- Штатного real-H3 runner в репозитории нет; запуск через обход durable queue не выполнялся. Новый real job должен создаваться через UI/API с immutable profile, references и approval.

### 585. Финальная очистка старых Live smoke-проектов
- Удалены только `QwenDirector Live Check`, `QwenDirector Live H3 Retry` и `QwenDirector Live H3 E2E`: 3 проекта, 3 jobs и 3 attempts; CAS-ассеты не удалялись.
- Сохранены `H3 Quality A/B`, `QwenDirector Live R2V` и `Новый проект 1`; после очистки в каталоге 12 jobs и 12 проектов, только в сохранённых рабочих проектах.

### 586. Состояние после очистки
- API, worker и web units `active`; `/ready` возвращает `ready`.
- В сохранённых рабочих проектах: 2 `awaiting_approval`, 1 `failed`, 9 `succeeded`; тестовые служебные проекты отсутствуют.

### 587. Smoke-job отчёт после очистки пуст
- `node scripts/report_smoke_jobs.mjs` вернул `dryRun=true`, `count=0`; ни один сохранённый рабочий job не классифицируется как известный smoke fixture.

### 588. API smoke для job origin
- Добавлен `smoke:job-origin`: временный Director job с `origin=lab` создаётся через API, поле проверяется в PostgreSQL и fixture удаляется в `finally`.
- `npm run smoke:job-origin` прошёл (`201`, `origin=lab`), постоянного lab job не осталось.

### 589. Origin smoke включён в оба gate
- `smoke:job-origin` добавлен в `check:lab` и `check:production`, чтобы проверка изоляции выполнялась автоматически вместе с regression suite.

### 590. Production gate после очистки и origin migration
- `npm run check:production` прошёл полностью после миграции 019 и удаления старых smoke-проектов.
- API load smoke: 100 запросов за 61 ms (≈1643 req/s); worker E2E, CAS/lineage, reconcile, fencing и origin smoke зелёные.

### 591. Post-gate queue hygiene
- После полного production gate `report:smoke-jobs` возвращает `count=0`.
- Рабочая очередь не изменилась: 2 `awaiting_approval`, 1 `failed`, 9 `succeeded`; новые smoke fixtures не остались.

### 592. Удаление шаблонного тестового проекта
- По явному запросу оператора удалены два дубликата проекта `Новый проект 1`: 2 проекта, 3 jobs, 1 attempt и связанные links.
- После очистки в базе 10 проектов и 9 jobs: 1 `failed`, 8 `succeeded`; `report:smoke-jobs` по-прежнему возвращает `count=0`.
- Сохранены только H3 A/B и Live R2V результаты; CAS не удалялся.

### 593. Удаление mutation fixtures
- Удалены два служебных проекта `mutation-<uuid>` и их scenes/shots без jobs.
- В каталоге остались только `H3 Quality A/B` и `QwenDirector Live R2V`: 8 project records и 9 jobs; CAS-ассеты сохранены.

### 594. Проверка профилей и CAS после очистки
- API подтверждает три активных профиля: Ref2V quality 8-step (`1bb019…`, `MiniMax-H3-Ref2VA-Acc-8Step`), Ref2V draft 4-step (`f0374f…`) и исходный 4-step (`1a7ded…`).
- В CAS сохранено 16 AssetVersion и 8 attempt-assets; очистка тестовых каталогов не затронула outputs и references.

### 595. Аудит выбора финальных дублей
- В проекте `QwenDirector Live R2V` успешный job имеет явно выбранный `AssetVersion` (`ed88cd1a-4ee0-41a2-812a-4c969566b389`); failed job не имеет selected output.
- Шесть A/B jobs проекта `H3 Quality A/B` намеренно остаются без selected output до ручного quality sign-off — это сохраняет нейтральность сравнительного эксперимента.

### 596. Backup после очистки каталога
- Создан `.data/backups/post-clean-20260910-v2`; backup содержит 9 CAS files.
- `npm run backup:verify -- .data/backups/post-clean-20260910-v2` подтвердил database + 9 CAS records.

### 597. Fail-closed CAS completeness guard
- `backup_local.mjs` теперь сверяет все `asset_versions` с фактическими CAS blobs и отказывается создавать неполный backup.
- Проверка на текущем каталоге выявила 8 отсутствующих blobs (`BACKUP_CAS_MISSING:8`). Автоматическое удаление AssetVersion не выполнялось; требуется операторское решение: восстановление файлов или orphan-retention cleanup с проверкой lineage.

### 598. Классификация отсутствующих CAS blobs
- Все 8 отсутствующих записей проверены: 1 reference без links и 7 output AssetVersion, каждая связана с `attempt_assets`; selected output среди отсутствующих нет.
- Удаление отложено: 7 outputs нужны для исторической provenance/lineage, а reference может потребоваться для повторяемости. Backup остаётся намеренно fail-closed до восстановления или согласованной retention-политики.

### 599. Проверка доступных backup-копий для CAS recovery
- Все локальные backup-каталоги проверены по SHA-именам отсутствующих blobs; совпадений нет.
- Автоматическое восстановление невозможно без внешней копии исходных файлов. Подмена, генерация нулевых файлов или удаление связанных AssetVersion запрещены до операторского решения.

### 600. Проверка staging/CAS путей
- Повторный поиск по `.data/assets` и staging не обнаружил отсутствующие blobs по SHA; они действительно отсутствуют локально.
- `backup:catalog-check` подтверждает структуру backup (9 required tables), но полноценный backup остаётся заблокирован CAS completeness guard до решения по 8 AssetVersion.

### 601. Restore capability preflight
- `npm run backup:restore-preflight` подтвердил PostgreSQL user `la6` с `canCreateDatabase=true`; изолированный restore технически готов.
- Единственный текущий блокер restore rehearsal — отсутствие 8 CAS blobs, а не права или структура БД.

### 602. Отдельный CAS health report
- Добавлен `npm run report:cas-health`: read-only JSON по present/missing AssetVersion, asset kind, attempt links и selected-output links.
- Текущий отчёт: 16 AssetVersion, 8 present, 8 missing; инструмент не изменяет БД и предназначен для безопасного retention/recovery решения.

### 603. Strict CAS gate для production
- Добавлен `npm run check:cas` (`report_cas_health.mjs --strict`), который завершает проверку с ошибкой при missing blobs.
- `check:production` теперь включает strict CAS gate; на текущем состоянии он закономерно блокируется из-за 8 отсутствующих blobs, делая production-риск видимым вместо ложного green.

### 604. Полный strict production gate
- `check:release` проходит, затем `check:production` останавливается именно на `check:cas` с `missingCount=8`; остальные production smoke не запускаются до восстановления CAS.

### 605. Восстановление одного reference blob
- В `/home/la6/Downloads` найден `photo_2026-09-09_22-21-04.jpg` с SHA `0c3b41e660f5f889253837eaca17d41ca68c5fa97af98586cfc71a8fec4bd271`; blob восстановлен в `.data/assets/cas/0c/...` без изменения AssetVersion.
- CAS health улучшился с 8 до 7 missing; backup остаётся fail-closed (`BACKUP_CAS_MISSING:7`). Остальные 7 outputs требуют исходных файлов или retention-решения.

### 606. Поиск output recovery в локальных медиа
- Все локальные `.mp4/.mov/.webm` в Downloads и рабочем каталоге проверены по SHA семи missing outputs; точных совпадений нет.
- Текущее CAS health: 16 total, 9 present, 7 missing. Для восстановления outputs потребуется доступ к исходному PVE/ComfyUI storage или согласованное удаление orphan-версий.

### 607. Полное восстановление CAS с PVE
- Через ComfyUI `/history/:promptId` и `/view` найдены все 7 outputs; каждый blob проверен точным SHA и восстановлен в исходный CAS path.
- CAS health теперь `16/16 present`, `missingCount=0`; восстановление выполнено без изменения БД/AssetVersion.
- Создан `.data/backups/post-recovery-20260910` (17 файлов); `backup:verify` и изолированный `backup:restore-rehearsal` прошли: 14 public tables, 16 AssetVersion links verified.

### 608. Финальный production acceptance после очистки
- Удалены тестовые проекты и связанные job/attempt/link записи; пользовательские H3 Quality A/B и Live R2V сохранены.
- `npm run check:cas` проходит в strict-режиме (`16/16 present`, `missingCount=0`).
- `npm run check:production` полностью проходит, включая release checks, CAS gate, lineage/worker/comfy smoke и API load (100 запросов).

### 609. Повторная проверка живой лаборатории
- `npm run check:lab` повторно проходит на текущем локальном контуре: readiness, runtime health/nodes, H3 inventory/schema/profile, references, binding guard, worker injection и профильная активация.

### 610. Финальная проверка исходников после очистки
- `npm run typecheck`, `npm run build:web` и `npm run check:skeleton` прошли без ошибок.
- Production web bundle собран Vite; локальные ссылки и обязательные проектные артефакты валидны.

### 611. Синхронизация backup baseline
- `docs/operations.md` обновлён по последнему snapshot: 17 миграций, 14 public tables, 16 AssetVersion links и 17 CAS-файлов.
- Старые малые timing-замеры явно помечены как не-SLA; до production SLA требуется отдельное измерение на согласованном объёме библиотеки.

### 612. Защита CAS от чрезмерных worker outputs
- Добавлен fail-fast лимит `QWEN_MAX_OUTPUT_BYTES` (default 512 MiB): oversized output отклоняется до staging/CAS с HTTP 400 `ASSET_OUTPUT_TOO_LARGE`.
- Body parser учитывает оба лимита import/output; typecheck и полный `check:production` прошли.

### 613. Acceptance checklist расширен quota controls
- В операторский production checklist добавлены явные проверки лимитов import, output и pending jobs; отсутствие/некорректное значение не должно незаметно отключать защиту.

### 614. README синхронизирован с quota hardening
- В статусе продукта явно перечислены `QWEN_MAX_PENDING_JOBS`, `QWEN_MAX_IMPORT_BYTES` и `QWEN_MAX_OUTPUT_BYTES`, чтобы quick-start отражал действующие ограничения очереди и CAS.

### 615. Acceptance snapshot live runtime
- PostgreSQL подтверждает CAS `16/16 present`, активные H3 профили Draft 4-step, Quality 8-step и turbo production.
- `/ready` возвращает `status=ready`: ComfyUI, llama.cpp и storage доступны.
- В очереди нет pending jobs; сохранены 8 успешных H3 validation jobs и один исторический failed job для анализа отказа.

### 616. Удаление последнего тестового следа
- Failed job `Two image reference smoke` и его пустой проектный каталог удалены транзакционно вместе с attempt/manifest связями.
- `report:smoke-jobs` теперь показывает `count=0`; в PostgreSQL остались только 8 успешных validation jobs.

### 617. Проверка целостности сохранённых jobs
- Для всех 8 успешных jobs подтверждены по одному attempt и одному связанному AssetVersion; orphan `attempt_assets` и `job_selected_outputs` не обнаружены.
- Live R2V job имеет выбранный final output; семь A/B jobs сохранены как сравнительный материал без автоматического выбора quality-default.

### 618. Production gate после удаления failed job
- Полный `npm run check:production` повторно прошёл после транзакционной очистки; API load smoke: 100 запросов за 65 ms (~1527 req/s).

### 619. Lab gate после quota hardening
- `npm run check:lab` прошёл после добавления output-size guard; readiness, runtime nodes, H3 schema/profile/reference checks и worker CAS E2E без регрессий.

### 620. Единый production-readiness audit
- Добавлен `docs/production-readiness-audit.md` с матрицей требований, доказательств и остаточных условий.
- Аудит отделяет подтверждённый single-worker локальный продуктовый контур от ещё не выполненных HA/SLA условий.

### 621. Исправлена навигация README
- После добавления audit исправлена дублирующаяся нумерация quick-start списка; `check:skeleton` подтверждает 52 локальные ссылки.

### 622. Повторная сверка Director Studio
- По актуальному README референса подтверждены дополнительные поверхности: Actor/Scene/Prop workbenches, Layout study, conversational Director Agent, H3 import/test/use wizard и portable packaging.
- `docs/reference-parity.md` дополнен явным функциональным gap-list и отделяет его от уже подтверждённого H3 single-worker контура и HA/SLA условий.

### 623. Runbook для второго worker
- В `docs/operations.md` добавлена процедура регистрации второго worker, capability-aware claim, mock-приёмки и безопасной ротации credentials/fencing.

### 624. Уточнена production-граница single-node
- По сверке с Director Studio второй worker исключён из обязательных критериев текущего продукта и оставлен будущим HA-треком.
- Для single-node PVE остаются только длительные fault/load drills и согласование RPO/RTO/retention; audit и roadmap синхронизированы.

### 625. Single-node production gate после пересмотра границ
- Полный `npm run check:production` прошёл после уточнения границ; API load smoke: 100 запросов за 71 ms (~1412 req/s).

### 626. Старт parity-цели
- Создана новая active goal для функционального parity с Director Studio.
- Матрица уточнена по текущему коду: typed Media Pool и structured prompt уже существуют; следующий кодовый фокус — специализированные Actor/Scene/Prop workbenches, Layout study и пошаговый H3 import/test/activate wizard.

### 627. Контрактная проверка parity primitives
- Повторно прошли `smoke:h3-profile`, `smoke:h3-references`, `smoke:profile-revisions` и `smoke:asset-lineage`.
- Immutable graph/input injection, reference bindings, revision history и provenance lineage подтверждены перед дальнейшей UI-работой.

### 628. H3 workflow wizard — первый UI-срез
- Добавлен компонент `apps/web/src/components/WorkflowWizard.vue`: import JSON → image/audio bindings → validation step → immutable profile activation через существующий API.
- Wizard подключён в основной интерфейс; `npm run typecheck` и `npm run build:web` прошли.

### 629. Boundary validation в wizard
- Wizard теперь детерминированно обнаруживает уникальные `MiniMaxH3ReferenceToVideo`, `RandomNoise` и `SaveVideo` узлы и блокирует активацию несовместимого графа.
- Добавлен `scripts/smoke_workflow_wizard.mjs`; контрактный smoke прошёл.

### 630. Typed asset workbench UI
- Добавлен `apps/web/src/components/AssetWorkbench.vue` с отдельными режимами Actor, Scene, Prop и Layout.
- Каждый режим импортирует AssetVersion через существующий API с `assetKind`, tags и bearer token; отдельная модель данных не создаётся.
- `npm run typecheck` и `npm run build:web` прошли.

### 631. Workbench contract smoke
- Добавлен `scripts/smoke_asset_workbench.mjs`; проверены режимы Actor/Scene/Prop/Layout и обязательные поля `assetKind`/tags.

### 632. Workbench smoke включён в npm scripts
- Добавлен `npm run smoke:asset-workbench`; он проходит вместе с typecheck и защищает typed-workbench контракт от регрессий.

### 633. Wizard smoke включён в npm scripts
- Добавлен `npm run smoke:workflow-wizard`; вместе с workbench smoke, typecheck и `check:skeleton` проходит.

### 634. Release gate после parity UI
- `npm run check:release` прошёл: typecheck, web build, 19 миграций, domain/skeleton, bind guard, proxy и systemd hardening.
- Оба parity smoke (`smoke:asset-workbench`, `smoke:workflow-wizard`) также прошли.

### 635. Завершение parity-цели
- Финальный набор `check:release`, `check:lab`, `smoke:asset-workbench` и `smoke:workflow-wizard` прошёл.
- Для single-node PVE parity-цель закрыта: typed workbench UI и Layout AssetVersion/reference flow доступны, H3 wizard сохраняет immutable profile через существующий API.

### 636. ComfyUI MCP/runtime validation
- MCP `server_info` вернул ошибку инструмента, поэтому генерация через MCP не запускалась вслепую.
- PVE endpoint `192.168.10.103:8188` доступен по `/system_stats` и `/object_info`; экспортированный H3 API graph содержит ровно по одному `MiniMaxH3ReferenceToVideo`, `RandomNoise` и `SaveVideo`.

### 637. Wizard runtime preflight перед активацией
- После сохранения нового workflow wizard автоматически вызывает `/v1/workflow-profiles/:id/preflight`; активация происходит только после boundary и runtime проверки ComfyUI.
- Typecheck, web build и `smoke:workflow-wizard` прошли.

### 638. Разделены test и activate workflow
- Добавлен `POST /v1/workflow-profiles/:id/test`: boundary/runtime validation без изменения `active`.
- Wizard сначала вызывает test, затем активирует профиль через существующий preflight только при успешной проверке.
- `npm run typecheck` и полный `check:production` прошли.

### 639. Проверка reference bindings в wizard
- Wizard проверяет, что указанные image/audio node IDs существуют в графе и имеют `LoadImage`/`LoadAudio` class_type; несовместимые bindings блокируют активацию.
- Typecheck, web build и `smoke:workflow-wizard` прошли.

### 641. Финальная цель зарегистрирована и начата
- Создана новая active goal для полного single-node parity; второй worker и portable package явно исключены из acceptance.
- Добавлен `packages/workflow-adapters/src/workbenches.ts` с типизированными контрактами Actor/Scene/Prop/Layout, required inputs, output slots и AssetVersion kinds.
- `smoke_workbench_contract.mjs` и typecheck прошли.

### 642. Единый workbench adapter boundary
- Добавлены `validateWorkbenchInputs` и `mapWorkbenchOutputs`: обязательные inputs fail-fast, outputs получают slot и provenance (`source=workbench`, kind, slot).
- Workbench smoke расширен проверкой input validation и Layout output mapping; typecheck прошёл.

### 643. Local planner contract
- Добавлен `packages/contracts/src/planner.ts`: deterministic brief planning по семи режиссёрским секциям, decision SHA-256 и provenance `source=local-planner`.
- Добавлен `scripts/smoke_planner.mjs`; повторяемость decision hash и заполнение секций подтверждены.

### 644. Planner API boundary
- Добавлен `POST /v1/planner/plan`: локально структурирует режиссёрский brief и возвращает decision hash/provenance; пустой prompt отклоняется.
- Добавлен `scripts/smoke_planner_api.mjs`; API decision provenance подтверждён на отдельном процессе.

### 645. Planner Assist в shot editor
- Добавлен `PlannerAssist.vue`: кнопка вызывает локальный planner API и применяет семь секций к shot editor, показывая decision hash.
- Typecheck и production web build прошли после исправления типизации event tuple.

### 646. Generic workbench execution plan
- `planWorkbench` формирует adapterId, workflow digest, concurrency/disk requirements и output slots для typed Actor/Scene/Prop/Layout; не принимает отсутствующий или невалидный graph digest.
- Workbench smoke и `check:release` прошли.

### 647. Planner/workbench smoke entrypoints
- В npm добавлен `smoke:planner-api`; planner API, typed workbench и H3 wizard smoke теперь запускаются отдельными стандартными командами.
- Все три команды прошли в текущем окружении.

### 648. Production gate после planner API
- `npm run check:production` прошёл после добавления planner endpoint и workbench planning boundary; API load smoke: 100 запросов за 70 ms (~1419 req/s).
- Реальные графы Actor/Scene/Prop/Layout остаются следующим этапом поверх стабильного adapter boundary.

### 649. Проверка локальных workflow-исходников
- В workspace и Downloads обнаружены H3/I2V/T2V/audio графы, но готовых Actor/Scene/Prop/Layout API-format графов нет; новые модели и внешние файлы не скачивались.
- Adapter boundary расширен `createWorkbenchPlan` с provenance kind; подключение реальных графов ожидает их локальных экспортов.

### 640. Зафиксирована финальная Definition of Done
- `docs/production-readiness-audit.md` дополнен единой parity-целью: реальные Actor/Scene/Prop adapters, Layout study AssetVersion lineage, runtime-tested H3 wizard и planner provenance.
- Второй worker и portable package явно вынесены за пределы single-node acceptance.

### 650. Исполняемый workbench boundary
- Добавлен `ComfyWorkbenchExecutor`: Actor/Scene/Prop/Layout теперь имеют общий durable ComfyUI submit/poll/cancel/collect путь без подмены H3-валидацией.
- Сбор результатов маркирует workbench и provenance для последующего создания AssetVersion; граф должен содержать реальные ComfyUI nodes и не может быть пустым.
- Добавлен `smoke:workbench-executor`; `typecheck` и `check:release` прошли. Реальные production-графы четырёх workbench остаются обязательным входом следующего этапа.

### 651. Workbench plan API
- Добавлен `POST /v1/workbenches/plan`: API выдаёт проверенный typed plan с digest, requirements, output slots и provenance для Actor/Scene/Prop/Layout.
- Ошибки пустых inputs, неизвестного kind и отсутствующего SHA-256 digest возвращаются как 400; генерация не запускается до передачи валидного плана в durable jobs.
- Typecheck и smoke executor прошли.

### 652. Контрактные output slots
- `ComfyWorkbenchExecutor` теперь назначает слоты из `WORKBENCH_CONTRACTS` (`master`, `turnaround`, `establishing`, `angles`, `detail`, `layout`), а не технические индексы.
- Provenance каждого результата содержит workbench, slot и внешний ComfyUI run ID; это готовит безопасное создание AssetVersion без потери lineage.
- Typecheck и executor smoke прошли.

### 653. Каталог production workbench graphs
- Добавлен `workbench-catalog.ts` с canonical именами графов Director Studio для Actor/Scene/Prop/Layout и обязательными boundary-классами.
- `validateWorkbenchGraph` вычисляет SHA-256 digest, проверяет классы и отклоняет digest mismatch; executor использует эту проверку перед submit.
- Локальные Downloads всё ещё не содержат этих четырёх графов; это зафиксированный внешний вход, а не скрытая заглушка. `typecheck`, catalog smoke и executor smoke прошли.

### 654. Сверка с upstream workflow tree
- В upstream `Director-Studio` подтверждены точные пути `backend/workflows/{qwen_actor_asset_workbench.api.json,QwenEdit2511_MultiAngle_SceneRef.api.json,qwen_prop_master.api.json,ref_frame_layout.api.json}` и классы `LoadImage`/`SaveImage`.
- У репозитория нет опубликованного LICENSE-файла, поэтому JSON-графы не копировались в проект; в каталог внесены только имена и проверяемые boundary-требования.
- Каталог усилен обязательным `SaveImage` для четырёх image/previs workbench; smoke и typecheck требуют оба класса.

### 655. Runtime validate endpoint
- Добавлен `POST /v1/workbenches/validate`: принимает импортированный API-format graph, проверяет boundary-классы и optional expected digest, возвращает вычисленный digest только для принятого графа.
- Добавлен `smoke:workbench-validate-api`; `typecheck` и `check:release` прошли.
- Следующий шаг — сохранить принятый graph/profile и запустить его через durable job с CAS AssetVersion lineage.

### 656. Durable generic workbench profiles
- Добавлен `POST /v1/workbenches/profiles`: после validate граф сохраняется транзакционно в существующие `workflow_profiles` и `workflow_profile_revisions` с `workbenchKind` в immutable bindings.
- Сохраняется вычисленный graph hash и boundary classes; профиль остаётся неактивным до отдельного runtime/операторского approval.
- `typecheck` и `check:release` прошли.

### 657. Generic workbench test/activate
- Добавлены `POST /v1/workbenches/profiles/:id/test` и `/activate`.
- Test повторно проверяет digest/boundary и наличие `LoadImage`/`SaveImage` в живом ComfyUI `/object_info`; activation разрешается только для валидного профиля.
- `typecheck` и `check:release` прошли; дальнейшая связка — запуск profile graph через durable job и CAS upload/lineage.

### 658. Durable job принимает generic workbench profile
- `PgJobRepository.createDirector` теперь распознаёт `workflowReferenceBindings.workbenchKind` и сохраняет generic Actor/Scene/Prop/Layout profile в job plan без ошибочного H3 boundary parser.
- Graph hash остаётся частью плана; существующий worker/CAS upload path может обработать outputs тем же fencing/manifest контрактом.
- `typecheck` прошёл. Runtime E2E ожидает реальный импортированный graph и PVE ComfyUI.

### 659. Generic job-plan regression guard
- Добавлен `smoke:generic-job-plan`, проверяющий generic workbench branch в `PgJobRepository.createDirector` и сохранение graph hash в durable plan.
- `check:release` прошёл; runtime E2E остаётся привязанным к фактическому импортированному графу и доступности PVE ComfyUI.

### 660. Lab/production regression verification
- После generic profile/job изменений полностью прогнаны `npm run check:lab` и `npm run check:production`.
- Подтверждены runtime PVE H3 inventory, Comfy schema, CAS 16/16, recovery/reconcile, fencing, worker E2E, asset lineage, exports и API load без регрессий.

### 661. Acceptance matrix refresh
- `docs/production-readiness-audit.md` дополнен фактическим статусом generic profile lifecycle и durable job routing.
- Явно отмечено, что контрактные API подтверждены, но production acceptance не объявляется завершённым до импорта реальных четырёх графов и generic E2E с CAS lineage.

### 662. Workbench catalog discoverability
- Добавлен `GET /v1/workbenches/catalog`: возвращает четыре workbench-контракта, canonical upstream filenames и обязательные boundary-классы.
- Endpoint позволяет UI/automation сформировать корректный import checklist до загрузки graph; `typecheck` и `check:release` прошли.

### 663. Generic gates включены в production check
- `check:production` теперь включает catalog, validate API и generic job-plan smoke; новые workbench-контракты не могут регрессировать незаметно.
- Полный `check:production` прошёл: CAS 16/16, lab/runtime/recovery/worker E2E и API load 100 запросов (~1423 req/s).

### 664. Generic executor HTTP E2E
- Добавлен `smoke:workbench-executor-e2e` с HTTP ComfyUI double: submit → poll → collect подтверждает output slot `master` и provenance Actor.
- Smoke включён в `check:production`; `typecheck` и E2E smoke прошли. GPU runtime с реальным graph по-прежнему требует локальных upstream exports.

### 665. Полный production gate после generic E2E
- `npm run check:production` полностью прошёл после включения generic executor E2E.
- Финальный хвост gate подтверждает generic job-plan smoke и submit/poll/collect E2E; существующие CAS, recovery, H3 и API-load проверки также прошли.

### 666. MCP optional fallback documented
- В `docs/operations.md` зафиксировано: ComfyUI MCP — optional discovery/authoring канал; при его transport failure worker продолжает через прямой HTTP API ComfyUI.
- Это соответствует single-node production boundary и не требует запуска второго worker или облачного провайдера.

### 667. Подтверждённый PDD quality candidate для Porsche SCENE-02
- Успешно исполнен и сохранён API graph `.data/comfyui-workflows/video_mmh3_fl2v_PDD8_fixed_test_qc-718-pdd8-api.json`; исходный UI workflow оставлен без изменений. Prompt ID `25423e84-dc69-41d4-b2b0-d83a7e94aada`, graph SHA-256 `94a876ac64acb397c9af7b8f00321dc4fde79874ec00bf3ed0f23d288ef2f635`.
- Ролик 1344×768, 124 кадра @24 fps, 5.167 s импортирован в локальный CAS как `ba37e183-1040-4960-8998-fc31120bea98` (SHA-256 `145bb2e89cc8305c65aebb8d72bc9a9634182dc6eb6b47d3183bd503087ce02d`). Пользователь подтвердил, что качество стало нормальным.
- Зафиксированные настройки: INT8 ConvRot FL2VA + official PDD Acc 8-step, Euler, NFE 8, SigmaShift 12/3; low-res pass 896×512; PDD tail 8 NFE / denoise 0.25; FP32 3D latent upscaler до 1344×768 с temporal chunking. Тот же кадр `3.jpeg` и seed 7180218.
- Для QC отключён недоступный last frame; I2V source подан на оба прохода. Длительность исходного saved graph изменена с 15 на 5 s. ComfyUI 0.39.0 завершил prompt успешно, queue вернулась в 0/0; минимум свободной VRAM в наблюдаемом snapshot ~0.88 GiB.
- Этот результат не является причинным A/B с high-res native прогоном: кроме PDD и двух проходов, здесь не применялись RefMods. Качество подтверждено пользователем; baseline зафиксирован, но не приписывать весь выигрыш одной настройке. Не включать как production default на одном субъективном результате. Для дальнейшего A/B брать сохранённый API graph за baseline и менять один фактор. Не использовать `video_mmh3_i2v_lora_PDD_ACC_8NEW.json` как эталон PDD: по проводке его PDD branch не подключает PDD sigma output к sampler и использует `res_multistep`/BasicScheduler.


### 668. Приоритизация оставшейся работы (2026-10-10)
- Проверен локальный поиск в QwenDirector, Downloads и Porsche refs: canonical Actor/Scene/Prop/Layout Comfy API graphs не найдены. Реальные workflows нельзя подменять синтетическими без пользовательских требований/референсов.
- Read-only `GET /v1/workbenches/catalog` на локальном API отвечает; все четыре контракта и ожидаемые filenames доступны. Generic validate/profile/test/activate/job/CAS executor уже реализован по предыдущим записям.
- Приоритет №1: получить четыре canonical graph exports (или выбрать один — Actor для вертикального среза), импортировать, validate, сохранить inactive immutable profile, runtime-test, затем вручную approve durable job и подтвердить CAS lineage.
- До появления graph-файла следующий продуктивный шаг — локальный workflow export из ComfyUI; не создавать фиктивный граф и не запускать GPU. Не запускал тесты и генерацию.

### 669. Инвентаризация состояния проекта и лаборатории (2026-10-14, без ComfyUI и GPU)
- Контекст изменился: на pve работает VM 111 `cachyws` (8 vCPU, 16384 MB, 120 GB, `hostpci0 0000:07:00.0,pcie=1,x-vga=1` = RX 6600, `onboot: 1`). Все контейнеры остановлены, включая pct 103 `comfyui` (16 vCPU, 22000 MB, 200 GB rootfs, mp0 GALAXY, nvidia bind-mounts). На хосте pve остались только RTX 4060 Ti (`01:00.0`) и RX 6600 (проброшена VM 111); RTX 5090 физически находится на workstation `la6su-ws` (`192.168.10.165`).
- Следствие: pct 103 нельзя поднять рядом с `cachyws` — при 31.9 GB RAM хоста и 16.8 GB RSS kvm остаётся ~13.4 GB доступных против запрошенных 22000 MB. Даже при запуске GPU-профиль pct 103 стал бы 4060 Ti 16 GB, чего не хватает зафиксированный QC-бейслайн H3 (1344×768, 124 кадра).
- ComfyUI с полным H3-стеком уже перенесён на workstation: `/mnt/AI_FAST/comfyui` (182 GB: app, env, custom_nodes SatoDive/latent-upscaler/PDD/TeaCache, INT8 ConvRot FL2VA+Ref2VA, PDD Acc 8-step, Qwen3VL encoder, 3D latent upscaler), лаунчер `~/.local/bin/comfyui` (`--listen 0.0.0.0 --port 8188 --base-directory /mnt/AI_FAST/comfyui --use-ck-attention`, `CUDA_VISIBLE_DEVICES=0`). Последний прогон — 2026-10-12 16:12 (`MiniMax_h3_00010.mp4`). По решению оператора ComfyUI не запускался, порт 8188 закрыт.
- Конфиг-дрейф цели ComfyUI: `.env` → `192.168.10.103:8188` (остановленный pct 103); `docs/operations.md` и `docs/start-local.md` → `192.168.10.165:8188` (workstation); `docs/architecture.md`, `docs/lab-inventory.local.md`, `docs/workflow-adapter-contract.md` → `.103`. Требуется зафиксировать один endpoint.
- PostgreSQL: живой каталог лежит в volume `qwendirector_qwendirector_pgdata`, а compose после переименования каталога в `qwen-director` поднимал новый пустой `qwen-director_qwendirector_pgdata`. Исправлено добавкой `COMPOSE_PROJECT_NAME=qwendirector` в `.env` и запуском `qwendirector-postgres-1` (127.0.0.1:54329). Проверено: 1 проект (`Porsche 718 Spider RS`), 319 `asset_versions`, 13 jobs (12 succeeded, 1 failed `1af214d2-bf20-4e55-8bb7-9611f990028a`), 11 профилей / 20 revisions, 19 миграций. CAS: 319/319 файлов на диске (346 MB), 2 сироты — `staging/import-3e462f4a-0f77-4dd7-af5f-919c93e3bcfb/589d0bb3-….bin` и `cas/fb/fb0c637b1fbd21aaaa147399ea912cc6efc528fabc3c8f98458fe7442a6502d4`.
- Гейты без ComfyUI: `db:migrate` (19) и весь `check:release` прошли (typecheck, web-build, migration-gate 001..019, domain/skeleton contract, api-bind-guard, web-proxy, systemd-hardening 4 юнита). Прошли: `smoke:h3-profile`, `api-auth`, `worker-auth`, `api-bind-guard`, `metrics`, `runtime-health`, `multi-node`, `comfy-collect`, `workbench-catalog`, `workbench-validate-api`, `generic-job-plan`, `workbench-executor-e2e`, `export`, `project-export`. `GET /v1/projects` отдаёт живой Porsche-проект.
- Обнаружен блокирующий дефект окружения: `check:cas` и 10 smoke (`job-origin`, `failure-lifecycle`, `reconcile`, `reconcile-resolve`, `retry`, `shot-prompt`, `job-attempts`, `asset-lineage`, `worker-e2e`, `runtime-nodes`) падают с `ENOENT /var/run/postgresql/.s.PGSQL.5432`. Причина: 25 из 29 скриптов хардкодят `pg.Pool({host:'/var/run/postgresql'})` (и 8 из них дополнительно перезаписывают `DATABASE_URL='postgresql:///qwendirector'`), тогда как `apply_migrations`, `smoke_postgres`, `smoke_multi_node`, `backup_restore_preflight` уже поддерживают `connectionString: process.env.DATABASE_URL`. На `la6su-ws` нет нативного Postgres и каталога `/var/run/postgresql`, БД доступна только как TCP `127.0.0.1:54329` → цепочка `check:production` обрывается на `check:cas`.
- `smoke:api-load` падает ожидаемо: `/ready` отвечает 503, пока ComfyUI недоступен (`comfyui:false, llama.cpp:true, storage:true`). Это контрактное поведение, а не регресс.
- LLM-адаптер: незакоммиченные 7 файлов переводят llama.cpp-адаптер на Strata/OpenAI-compatible (`http://127.0.0.1:8080`, Bearer `QWEN_LLAMA_API_KEY`, `/v1/chat/completions`). `probe:backends` даёт `backendVersion=strata`, `models=[qwen3.8-flash-next-iq3_xxs]`, но только после `set -a; source .env; set +a`; без этого `/v1/models` возвращает 401. `smoke:executors` проходит.
- Следующие команды (CPU-only): (1) общий `scripts/db.mjs` с `connectionString` и перевод 25 скриптов, убрать перезапись `DATABASE_URL`; (2) зафиксировать один `COMFYUI_URL` и привести документы к нему; (3) импортировать `video_mmh3_r2v_2Stage-VEDA` API JSON через UI wizard, проверить runtime/preflight на активном ComfyUI, затем провести ручной approve одной job и подтвердить CAS lineage; (4) закоммитить или заstashить 7 файлов llama→Strata вместе с `docs/start-local.md`.
- Ограничения сессии: ComfyUI и GPU-генерация не запускались; Proxmox, passthrough, драйверы и сетевые правила не изменялись; секреты не выводились.

### 670. Сверка с DeepSeek Harness Director и выбор H3 workflow (2026-10-26)
- По запросу пользователя проверен публичный [`ai2764/dsh-director`](https://github.com/ai2764/dsh-director), версия 0.1.76, commit `cb3525fef18c7d2f7d347765ef388e1ea87919f4`. Просмотрены source modules `proposal-state`, `shot-proposal`, `workflow-discovery`, `workflow-preflight`, `workflow-live-preflight`, `submit-comfy-video`, `asset-catalog`, `image-staging`, `gpu-status` и соответствующие focused tests. Код не импортировался; сравнение и приоритеты записаны в `docs/reference-parity.md`.
- Ключевые пробелы QwenDirector: conversational agent/tool loop с persisted sessions; версионированная shot/reference review card с явным подтверждением конкретного clip; pre-submit сверка фактических reference bytes/order и clip-параметров; общий workflow/node-schema inspector с проверкой связей до output; media review в контексте агента; подтверждённый shared-GPU LLM unload/handoff. Durable jobs, fencing и CAS QD уже сильнее process-local monitor плагина — эту основу сохранять.
- Выбранный пользователем текущий workflow: `video_mmh3_r2v_2Stage-VEDA`, файл `/mnt/AI_FAST/comfyui/user/default/workflows/video_mmh3_r2v_2Stage-VEDA.json`, SHA-256 `d8403049ee6d7dc21fa41b3598790036dfcef42fc1123da90801c570a16301b6`.
- Найденный файл — ComfyUI UI workflow (`nodes`/`links`, 74 node, 71 links), не API graph. В нём два `RandomNoise`, один `MiniMaxH3ReferenceToVideo`, `VedaSparseAttention`, `MMH3UltimateUpscale`/VEDA nodes и два `VHS_VideoCombine` output nodes (IDs `6541`, `6606`). Текущий QD `validateH3Workflow` требует ровно один `RandomNoise` и один `SaveVideo`; текущий executor тоже ищет `SaveVideo`. Прямо импортировать/активировать этот файл сейчас нельзя.
- Следующий узкий шаг: получить API-format export этого же workflow, проверить двух-stage wiring и семантику обоих output nodes, затем расширить H3 boundary/collect под подтверждённый graph contract и сохранить отдельную immutable revision. В текущем collect executor без `SaveVideo` фильтрация по output node не срабатывает, поэтому для двух `VHS_VideoCombine` нужно явно сохранить только выбранный финальный output. До этого не подменять UI-файл синтетическим графом, не активировать другой профиль как VEDA и не запускать GPU job.
- Проверки этой сессии: read-only анализ локальных файлов/графа и source/tests checkout в `/tmp/dsh-director-review`; тесты плагина, ComfyUI, GPU и остальные внешние сервисы не запускались. Существующие пользовательские diff сохранены.

### 671. Импортируемый H3 VEDA API graph (2026-10-26)
- Пользователь предоставил API export `/home/la6/Downloads/video_mmh3_r2v_2Stage-VEDA.json`; SHA-256 `f60175b3555541f0c862cdeaddafb39f8b15efcb2ae0dd19a1c2bc9b7735017f`, 46 API nodes.
- Подтверждена структура: H3 prompt node `6359`; prompt text `6350` за `StringConcatenate`; длительность `6342` → expression `6344` с alignment `17k+5`; resolution input `6341` → selector `6345`; LoadImage `6511`; first-stage sampler/output ведёт к VHS `6541`; `MMH3UltimateUpscale` `6600` и второй noise `6591` ведут через VAE decode к финальному VHS `6606`; в model path есть `VedaSparseAttention` `6616`.
- Код теперь распознаёт именно этот двухэтапный boundary, проверяет связи обоих output paths, автоматически связывает единственный reference LoadImage, не разрывает graph links при prompt/duration/resolution injection и собирает только финальный VHS output. Если указан seed, он применяется к обоим noise nodes; без seed immutable graph сохраняет исходные значения. Wizard и shot editor допускают VEDA boundary; контракт обновлён.
- Следующий этап: импортировать API JSON через QwenDirector workflow wizard и выполнить его runtime test/preflight. Preflight активирует профиль только после проверки наличия VEDA/VHS nodes и всех graph LoRA names. Затем вручную утвердить одну job и подтвердить final-output → CAS lineage.
- Ограничение: `ResolutionSelector` округляет dimensions до graph multiple; UI width/height передаются как target resolution и фактический результат node может отличаться на округление. `.env` всё ещё содержит `COMFYUI_URL=http://192.168.10.103:8188`; read-only `GET http://192.168.10.165:8188/system_stats` завершился timeout (повторён вне sandbox, тот же результат). Endpoint не менял. Не запускал QwenDirector typecheck/smoke, ComfyUI или GPU; `git diff --check` прошёл. Реальная ComfyUI compatibility и output collect ещё не подтверждены.

### 672. CUDA llama.cpp восстановлен для локального Qwen (2026-10-26)
- История pacman объяснила исчезновение CUDA: 15 сентября ставились `llama-cpp` вместе с `ggml-cuda` и CUDA; 18 сентября `llama-cpp` обновили кастомным `0.4.1.r20260918.911f6cdc8`, после чего `ggml`/`ggml-cuda` удалили. 22 октября системное обновление заменило кастомную сборку на Arch `llama-cpp 0.6.0-1` и CPU-only `ggml 0.26.0-1`.
- Собран официальный llama.cpp с тем же commit `d81235049` и `GGML_CUDA=ON` для Ada 8.9; отдельная установка `/home/la6/.local/opt/llama.cpp-cuda`. Системный `/usr/bin/llama-server` и пакет pacman не заменялись. Для динамических библиотек сборки нужен `LD_LIBRARY_PATH=/home/la6/.local/opt/llama.cpp-cuda/lib:/opt/cuda/lib64`.
- GPU build видит RTX 5090 и RTX 4060 Ti. Сервер запущен вручную с `CUDA_VISIBLE_DEVICES=1` только на 4060 Ti: `/home/la6/models/Qwen3.8-27B-GSQ-RCO-IQ3_S.gguf`, alias `qwen3.8-27b-gsq-rco-iq3_s`, порт `127.0.0.1:8081`, context 4096, один слот. Контрольный OpenAI-compatible запрос прошёл; скорость короткой генерации около 20 tok/s, VRAM 4060 Ti занята примерно на 11.7 GiB. Сервер оставлен работающим.
- После успешного теста `.env` переключён на `QWEN_LLAMA_URL=http://127.0.0.1:8081` и правильный alias; API key не менялся. Обновлены `docs/operations.md` и `docs/start-local.md` с ручной командой запуска. Изменения пользователя в остальных файлах сохранены.
- Не запускались QwenDirector API/worker и ComfyUI workflow; интеграционный worker/API smoke остаётся следующим полезным шагом. GPU доступность и OpenAI API Qwen проверены отдельно. Сборка из официального репозитория автоматически скачала upstream UI assets; hosted inference не использовался.

### 673. Импорт и live preflight VEDA-профиля (2026-10-26)
- Фактический ComfyUI запущен на этой workstation по `127.0.0.1:8188`, версия `0.39.0`, использует RTX 5090 (`cuda:0`, на чтении оставалось ~8.46 GB VRAM); очередь `0/0`. `.env` и локальная инструкция обновлены с устаревшего `.103` на loopback. RTX 4060 Ti продолжает обслуживать отдельный llama.cpp Qwen.
- Подключён существующий контейнер `qwendirector-postgres-1` на сохранённом volume `qwendirector_qwendirector_pgdata` (порт `127.0.0.1:54329`); API запущен на `127.0.0.1:4310`, `/ready=ready` по ComfyUI, llama.cpp и Postgres. Другой пустой `qwen-director-postgres-1` не запускался. Worker и Vite не запускались.
- Через QD API импортирован `video_mmh3_r2v_2Stage-VEDA` revision 1 (`video-mmh3-r2v-2stage-veda`, graph SHA-256 `2bd618868146f311896e29b2ec21df044278f8cfa212d84eb7e61b2e40296d0a`) и активирован после успешного `/test`. Boundary: H3 `6359`, noise `217` и `6591`, оба VHS outputs `6541`/`6606`, финальный output `6606`, reference `LoadImage 6511`.
- Live preflight прошёл: VEDA/H3/VHS классы присутствуют, 9 LoRA names доступны, missing LoRA нет; `qualityHint` preflight=`draft-4step`. При profile derivation `qualityHint=unknown`, потому что первый `BasicScheduler` имеет 8 steps при активном 4-step LoRA; второй scheduler имеет 2 steps и дополнительную LMS LoRA. Это расхождение метаданных требует сверки, но экспортированный граф не менялся.
- В экспортированном workflow статический prompt и reference относятся к прозрачной игровой мыши (`transparent_rgb_gaming_mouse.png`, локальный ComfyUI input, 1,383,312 bytes, SHA-256 `49696748d2fff0e8c9b63c7173c6d6282b70eac0195def5b39402f9564410e75`). В CAS такого AssetVersion пока нет. В каталоге есть Porsche 718 `SCENE-02` и отдельный placeholder `Scene/Shot`; job не создавался, пока оператор не выберет content target. Следующий шаг: после выбора пользователя импортировать/связать правильный reference и создать job в `awaiting_approval`; не вызывать approve/Comfy `/prompt` до ручного решения.
- В ComfyUI не отправлялся prompt, GPU-generation не запускалась. `git diff --check` проходит; изменения пользователя в исходниках сохранены.

### 674. Подготовлен VEDA job для реновации спальни (2026-10-26)
- Пользователь добавил `/mnt/AI_FAST/comfyui/input/blank-room.png` (1088×1920, SHA-256 `dbe200a0b73b65407b8f417c8329680ef20c4a5329542cf19fb7f571777d4c5a`) и `final-render.png` (1088×1920, SHA-256 `9e302cbda683b5c2795d2fe26305f2ab72468ad260cd58c1547103ed34b72150`). Импортированы в CAS как immutable reference AssetVersions: `91d2700c-f11e-4e33-9df5-bcef51de954c` и `934fa960-2291-479a-9f50-325e575fdca4`.
- `validateVedaWorkflow` теперь проверяет последовательные H3 reference slots и уникальный upstream `LoadImage` на слот. Workflow contract обновлён. Сохранена и активирована revision 2 профиля `video-mmh3-r2v-2stage-veda`, с двумя refs (blank-room slot 0, final-render slot 1), graph SHA-256 `2d2860992c626c05ed2b3a5fc9ee627b2476bce72b34328593b620c4df07aeb9`. Старая revision 1 сохранена.
- Live `POST /v1/workflow-profiles/:id/test` прошёл на локальной ComfyUI: boundary определил два loader-а, нужные VEDA/H3/VHS nodes и все 9 LoRA names доступны, missing LoRAs нет. API перезапущен с актуальным кодом; `/ready` остаётся ready. Метаданные качества остаются неоднозначными: активна Turbo 4-step LoRA, первый scheduler показывает 8 steps, второй — 2 steps с LMS LoRA; это наследуется из пользовательского workflow и намеренно не менялось.
- Создан job `32207f1c-492f-4599-96c2-27b40cc4991f` (plan hash `cd950ac9a1345e35e0e0080fc3dc24aa1ce6a0832cde07f9350b84204a461c08`) для нового проекта «Спальня — ремонт». План содержит 470-словный H3 Ref2VA prompt на английском, обе AssetVersion refs в нужном порядке, 1088×1920 и 362 frames (15 секунд при 24 fps с требуемым VEDA align). Seed не переопределён, чтобы сохранить значения двух noise nodes из immutable graph.
- Job проверен через GET и находится в `awaiting_approval`; Comfy queue не запускалась и GPU render не отправлялся. Две картинки являются reference conditioning, а не жёсткими start/end frames, поэтому соответствие финального кадра `final-render.png` не гарантируется. Для продолжения вручную утвердить этот plan hash; только после approval worker сможет отправить граф в ComfyUI.
- Проверки: live profile test и `/ready` успешны; `git diff --check` успешен. Smoke/typecheck и GPU generation не запускались. Пользовательские diff сохранены.

### 675. Диагностика артефактов VEDA и контрольный повтор (2026-10-26)
- Сравнены исходный stage1 H3 MP4 и итоговые MP4 с одинаковыми refs/prompt/seed для двух фаз. В исходнике фазы стены (job `af2e310c-7ee5-490e-b9eb-14fb0d892559`) отделённой руки нет; она появляется после `MMH3UltimateUpscale` в stage2 при denoise `0.30`. Это локализует главный артефакт в VEDA latent upscale, а не в H3, refs или MP4-кодировании.
- Активная revision 8 профиля `video-mmh3-r2v-2stage-veda` использует stage2 denoise `0.10` (2 шага). Контрольный повтор стены: job `1c036fcc-59b3-48bc-b0e2-05a3a389724b`, asset `de0df6ac-b66d-447b-9cf5-a51113cb4b04`, `/tmp/qwd-phase1-review/phase1-low-denoise.mp4`; оторванная рука исчезла. Контрольный повтор пола: job `fc117699-a9e1-4f8c-a987-d011b4bfc483`, asset `0408ef57-6ec4-457a-946c-76cee2afde51`, `/tmp/qwd-phase1-review/phase2-low-denoise.mp4`; аналогичная рука на стене также исчезла.
- На denoise `0.10` сохраняются небольшие ошибки самого H3: в начале стены возникает неуместная длинная жёлтая рейка (вероятно визуальная интерпретация измерения/инструмента из prompt), стыки и форма панелей местами меняются между кадрами. Для следующего wall-pass убрать действие с измерением/длинной рейкой и ограничить действия одним инструментом/операцией за раз. Это отдельные генеративные несоответствия, не артефакты stage2.
- Проверен пустой keyframe с установленной люстрой: job `b184cc08-bf58-4592-92bb-22bd33cd40aa`, asset `bab8ffa0-708a-45f9-a13d-11039917f72b`, `/tmp/qwd-phase1-review/keyframe-chandelier-empty.png`; валидная комната без людей и мебели, зелёная стена, паркет, люстра. Масштаб людей в принятых двух контрольных видео соответствует последнему bed-scale ориентиру пользователя.
- Для API job planner исправлено автоматическое связывание LoadImage: generic Scene Workbench больше не требует H3 `workbenchKind`. Изменён `apps/api/src/pg-jobs.ts`, API перезапущен; Qwen Image workbench jobs доступны. Видеосгенерация выполнялась ранее по задаче пользователя; тестовые наборы не запускались.
- Следующий шаг: использовать revision 8 для остальных фаз; для повторного wall-pass упростить prompt (убрать измерение/рейку), затем визуально проверить таймлайн перед продолжением финальной сборки. Не считать проект завершённым: готовые проверенные фазы только стена и пол.

### 676. Собран review master реновации спальни (2026-10-26)
- Собран `/mnt/AI_FAST/comfyui/output/qwendirector/bedroom-renovation-production/final/bedroom-renovation-instagram-review.mp4`: 1120×1984, 24 fps, 35.25 s, H.264/AAC. Шесть фаз склеены по 5.875 s; master помечен как review, не как утверждённый финал.
- Последний сгенерированный клип исключён: в нём были лишние люди и белый пар/дым у окна. На шестой фазе удерживается чистый финальный кадр фазы 5, без людей и дыма; в конце аудиодорожки добавлена тишина до конца видео.
- Просмотрен contact sheet всего монтажа. В фазе 4 остаётся табурет у кровати — пользователь предложил сначала посмотреть цельный ролик. Нужно получить его комментарии по таймкодам, затем согласовать конкретные перегенерации/перестановки.
- Удалены локальные невыбранные тестовые MP4, review-кадры и временные `/tmp/qwd-bedroom-final`, `/tmp/qwd-phase1-review`. Выбранные клипы, production refs/keyframes, финальный master и CAS/job provenance сохранены.
- Проверка через ffprobe: video duration 35.208 s (845 кадров), audio и container duration 35.250 s. API/worker/ComfyUI не менялись в этой сборочной операции.

### 677. Подготовка нового стартового кадра фазы 1 (2026-10-26)
- Пользователь уточнил новый target: сначала отдельный стартовый still через локальный Qwen Image 2.1 — ровная белая черновая штукатурка, без логотипа на синей куртке, короткие аккуратно собранные провода у потолка. Только после отбора still запускать видеогенерацию.
- Из `/mnt/AI_FAST/comfyui/input/bedroom-renovation_.mp4` извлечены кадры начала и границы примерно 5.00 s. VEDA кандидат `clips/phase-1-wall-wires-retry-v2.mp4` завершён (5.875 s, 1120×1984): стену и провода улучшил, но рабочий в начале тянет лишний длинный провод вниз; этот вариант не принимать.
- Job `8cc4d38d-a73e-4ef0-bbf1-4cb924e17f0d` с вариантом промпта без касания кабеля отменён; для него истёкшая попытка reconciled как failed. Computer-use approval gate отказал в наблюдении ComfyUI origin `http://127.0.0.1:8188`; не открывать страницу повторно и не обходить gate через другие UI/browser способы.
- Старые сведения о непроверенном still и ожидании доступа заменены фактическим результатом в следующем пункте: Qwen still проверен, пользователь уточнил валик, затем был запущен отдельный VEDA вариант.

### 678. Qwen стартовый still и пробный видеопереход фазы 1 (2026-10-26)
- По уточнению пользователя стартовый кадр изменён: Worker A уже касается стены валиком с зелёной краской. Утверждённый визуально Qwen Image 2.1 still: `/mnt/AI_FAST/comfyui/output/qwendirector/bedroom-renovation-phase1/qwen-start-frame-v4-green-roller-40step_00001_.png` (768×1376), локальная генерация через ComfyUI; ровная белая стена и простая куртка без логотипа. Варианты v2/v3 дали шумную/пятнистую стену и отброшены.
- С разрешения пользователя запущен VEDA job `8e8e6887-c007-49e8-ae22-a2f15c1302ee`, output AssetVersion `564e5c02-17bf-49ad-9edd-cee5d7603556`. Локальная review-копия `clips/phase-1-qwen-white-start-green-roller.mp4`: 1120×1984, 24 fps, 5.875 s, H.264/AAC.
- Клип не утверждать и не подменять им монтаж: в конце модель следует старому end reference и возвращает длинные провода с потолка и логотип на куртке; покраска стены визуально ускоряется скачком. Start кадр соответствует новому target. Для следующей попытки заменить/исправить end reference, чтобы он не закреплял провода и знак; оценивать transition только после просмотра полного клипа.
- GPU после завершения свободен от генерации; Qwen остаётся загружен на 4060 Ti (~11.7 GiB на последней проверке), ComfyUI на 5090 завершил очередь. Не считать это результатом финального рендера или публикационной приёмкой.

### 679. Фаза 1 переделана как отдельная покраска (2026-10-26)
- Замечание пользователя подтверждено просмотром: предыдущий переход нарушал причинность покраски и резко перескакивал к Worker B/проводам. Выпущен промежуточный VEDA v2 `phase-1-paint-only-roller-led-v2.mp4`; валик стал лучше объяснять рост зелёного покрытия, но H3 породил чёрную потолочную конструкцию, поэтому v2 отклонён.
- Qwen Image подготовил пару чистых ключевых кадров: `keyframes/phase-1-start-candidate-v3.png` и `keyframes/phase-1-end-candidate-v3.png` в production-папке. Между ними только Worker A перемещается слева направо и красит; потолок на обоих кадрах гладкий белый без монтажного узла. AssetVersions `6a679d01-0b13-40fd-8735-f0914e130ff9` и `7db7065b-3919-414f-aa99-74fd99e8ffe6`.
- VEDA job `ce046282-ebdc-4d41-ba66-857c7219c60e`, output asset `153bfc3f-28db-4f83-845d-3516ec29ecf9`, финальный H.264/AAC `/mnt/AI_FAST/comfyui/output/qwendirector/bedroom-renovation-production/clips/phase-1-paint-only-seamless-ceiling-v3.mp4`: 1120×1984, 24 fps, 5.875 s. Contact sheet `review-frames/phase-1-paint-only-seamless-ceiling-v3-contact.png`.
- Проверены кадры 0, 1.2, 2.4, 3.6, 4.8 и 5.7 s. Краска следует за последовательными вертикальными проходами и расширяется слева направо; лишнего рабочего и потолочной конструкции нет. Кандидат пока не выбран и не вставлен в review master; дождаться оценки пользователя. Старые клипы/мастер сохранены.
- После выполнения ComfyUI очередь пуста; RTX 5090 на последней проверке вернулась примерно к исходным 7.1 GiB занято, 4060 Ti — 11.7 GiB для llama.cpp.

### 680. VRAM cache, отклонение покраски и новый потолочный keyframe (2026-10-26)
- Пользователь отклонил paint-only v3: краска всё ещё не воспринимается причинно привязанной к валику; в кадре также должен оставаться небольшой центральный проём для будущей люстры. V3 не брать в монтаж.
- Во время idle-снимка после Qwen Image ComfyUI PID 19883 удерживал на RTX 5090 17,540 MiB; очередь была пустая. Перед этим после H3 оставалось около 6,756 MiB. RTX 4060 Ti стабильно держал 11,724 MiB процесс llama.cpp — это выбранный Qwen-сервер, не утечка ComfyUI.
- Текущий H3 VEDA job `ce046282-ebdc-4d41-ba66-857c7219c60e` занял по Comfy history 378.8 s (6:18.8); во время рендера GPU был занят на 97–100%, около 30 GiB VRAM. Это вычислительная длительность 124-frame, 1120×1984 двухэтапного графа, а не ожидание из-за остаточной памяти. ComfyUI намеренно кэшировал последнюю модель между jobs.
- Проверено штатное освобождение: ComfyUI `POST /free` с `unload_models` и `free_memory`, применённое после короткого CPU PreviewImage; 5090 снизилась с 17,905 MiB до 1,937 MiB занятых (1,572 MiB у ComfyUI процесса), utilization 0%, очередь пуста. Temp preview удалён. Worker/API/ComfyUI не перезапускались. Оставшийся базовый контекст ComfyUI нормален.
- Подготовлена, но ещё не импортирована в CAS, новая пара Qwen stills с центральной круглой точкой подключения и коротко уложенными проводами: `keyframes/phase-1-start-candidate-v4-opening.png`, `keyframes/phase-1-end-candidate-v4-opening.png`; сравнение `review-frames/phase-1-opening-keyframes-v4.png`. Эти кадры исправляют отсутствие точки, но сам VEDA переход ещё не проверен.
- Пользователь отметил, что отверстие в v4 слишком крупное и контрастное. Новая пара v5 возвращает малую едва заметную точку из предыдущих удачных Qwen кадров: `keyframes/phase-1-start-candidate-v5-small-hole.png`, `keyframes/phase-1-end-candidate-v5-small-hole.png`, сравнение `review-frames/phase-1-opening-keyframes-v5-small.png`. Повторно использованы approved start v4 и end image с Worker A справа; большой вариант v4 не брать.
- После Qwen edit v7 ComfyUI снова кэшировал модель до ~17.5 GiB. Штатный `/free` повторён при пустой очереди; сейчас на RTX 5090 ~1.9 GiB, utilization 0%, очередь пуста. Временный PreviewImage удалён.

### 681. Выбран повтор фазы 1 с прежней динамикой покраски (2026-10-26)
- По прямому указанию пользователя повтор использует прежний успешный prompt/action timing из job `1ef7ed47-cb9d-408b-a381-977499d8a2c2`, active graph hash `f9283b3d2ec5d87d35728f464d42b6caeb1b6918c73d52f38b80edbb589e090f`; поменян стартовый still на утверждённый Qwen V4 (ровная белая стена, валик с зелёной краской, небольшая точка под люстру), конечный ref оставлен прежним. Не добавлялась новая детальная хореография; wall finish ограничен ровной матовой штукатуркой и естественной фактурой валика.
- Job `7d7298ce-38af-4af1-951d-964254baf7cc`, output AssetVersion `b0fb008c-5a2d-4d73-851b-f4cfa24fd223`, локальный файл `/mnt/AI_FAST/comfyui/output/qwendirector/bedroom-renovation-production/clips/phase-1-smooth-wall-original-motion-v5.mp4`: H.264/AAC, 1120×1984, 24 fps, 5.875 s. Contact sheet: `/tmp/phase1-original-motion-v5/contact.png` (временный файл, при необходимости пересоздать из MP4).
- Пользователь выбрал этот output для фазы 1; selection записан в API (`selected_asset_version_id=b0fb008c-5a2d-4d73-851b-f4cfa24fd223`). Review master не пересобирался и исходные клипы сохранены.
- Причинность нельзя обещать одним Ref2VA prompt: текущий граф использует две статические картинки как reference conditioning, не жёсткую временную привязку каждого действия. Следующий вариант покраски строить с несколькими промежуточными состояниями стены/валика и проверять стык каждого короткого сегмента. Не запускать ещё один полный проход с теми же двумя крайними кадрами и тем же способом.


### 682. Video reference bindings для H3 workflow (2026-11-14)
- Продолжена интеграция автономного shot-to-Comfy пути: video AssetVersion теперь сохраняет тип и MIME-семантику на API job boundary (`video/*`), worker загружает ассет через локальный ComfyUI `/upload/image` (этот endpoint принимает файл в `input`; поле `type` задаёт storage target), затем инъектор заполняет выбранный узел `LoadVideo.file`, `VHS_LoadVideo.video` или `VHS_LoadVideoPath.video`. Профили поддерживают `videoNodeIds`; расширенный редактор и Workflow Wizard позволяют задать bindings.
- Поддерживаются роли video, разделение image/audio/video при загрузке и injection. Для профиля с video refs нужно явно задать `videoNodeIds`; API проверяет количество audio/video refs против соответствующих bindings до enqueue. Живая `/object_info` подтвердила input поля `LoadVideo.file`, `VHS_LoadVideo.video`, `VHS_LoadVideoPath.video`. В локальном UI workflow VEDA (77 nodes) обнаружен активный `LoadVideo` → `GetVideoComponents` → `MiniMaxH3ReferenceToVideo.ref_videos.ref_video_0`, а `LoadAudio` подключён к H3 `ref_audios.ref_audio_0`; для видео binding указывать loader ID `6627`, аудио binding `6628` после импорта/conversion (ID могут измениться при пересохранении).
- Проверки: `npm run typecheck`, `npm run smoke:h3-references`, `npm run smoke:worker-h3-injection`, `npm run smoke:comfy-upload`, `npm run build:web` прошли. Первый Vite build выявил duplicate local identifier в Wizard; исправлено и build повторно прошёл. `smoke:workflow-job-plan` и `smoke:workflow-profiles` не дошли до DB-проверок: PostgreSQL Unix socket `/var/run/postgresql/.s.PGSQL.5432` недоступен. Сервисы не поднимались.
- ComfyUI runtime оставлен без рестарта. Ранее проверенный локальный checkout уже совпадал с `origin/master`, runtime отвечал на 8188; пользовательские upstream diff сохранены. Повторный сетевой fetch в этом срезе подтвердил, что `HEAD` и `origin/master` совпадают на `08ff3c11b3a85eb07c2c06f21cb378ac2e086840` (2026-10-09); обновления upstream нет. Три локально изменённых файла ComfyUI сохранены, runtime не перезапускался.
- Следующий срез: добавить API/job-plan coverage для MIME/role/video slot mismatch, исследовать конкретный active VEDA graph binding для video refs по его `/object_info` socket (прежде чем генерировать, не менять active workflow и не запускать GPU job без отдельного одобренного plan), затем повторить durable job tests при доступной БД.

### 683. Media role guard для workflow adapters (2026-11-14)
- Текущая проверка job plan выявила опасное несоответствие: RefMod и image workbenches могли принять audio/video references, которые не поддерживаются их image-only input binding. Теперь `PgJobRepository.createDirector` отклоняет эти планы до insert: `H3_REFMOD_REFERENCE_MEDIA_UNSUPPORTED` и `WORKBENCH_REFERENCE_MEDIA_UNSUPPORTED` (HTTP 400). Generic H3 продолжает принимать image/audio/video при достаточном числе bindings.
- Повторные проверки после исправления: `npm run typecheck`, `smoke:h3-references`, `smoke:worker-h3-injection`, `smoke:comfy-upload`, `smoke:workflow-wizard`, `build:web`, `git diff --check` прошли. DB-backed job/profile smoke остаются неисполненными из-за недоступного локального PostgreSQL socket; GPU generation не отправлялась.

### 684. Workflow reference binding validation (2026-11-14)
- Укрепил границу workflow profile: `imageNodeIds` должны указывать на `LoadImage`, audio bindings — на `LoadAudio`/`VHS_LoadAudio`, video — на `LoadVideo`/`VHS_LoadVideo`/`VHS_LoadVideoPath`. Duplicate IDs и несовместимые классы теперь отвергаются при создании профиля, до job creation/worker lease. RefMod профили явно image-only и не принимают audio/video bindings.
- Повторно прошли `typecheck`, `smoke:h3-profile`, `smoke:h3-refmod-profile`, `smoke:h3-references`, `smoke:workflow-wizard`, `build:web`, `git diff --check`. Сейчас ComfyUI отвечает на `127.0.0.1:8188/system_stats` (HTTP 200); QD API `127.0.0.1:4310` и PostgreSQL на `54329`/Unix socket недоступны. Никакие сервисы не запускались, generation не ставилась в очередь.


### 685. Durable video binding API coverage (2026-11-14)
- Изолированная dev PostgreSQL текущего checkout запущена отдельным compose project `qwen-director-dev` на своём новом named volume. Старый `qwendirector` project/volume не использовался; обнаруженное случайное краткое включение его контейнера было отменено без SQL или изменения данных. На изолированную БД применены текущие 19 migrations.
- `smoke_workflow_job_plan.mjs` теперь использует переданный `DATABASE_URL`, создает/удаляет одно видео AssetVersion fixture и проверяет durable API: без `videoNodeIds` получает `H3_WORKFLOW_VIDEO_BINDINGS_REQUIRED`; binding на `LoadImage` отвергается; корректный `LoadVideo.file` binding создает `awaiting_approval` job с сохранённым `videoNodeIds` в plan snapshot.
- `npm run db:migrate`, `npm run smoke:workflow-job-plan`, `npm run smoke:workflow-profiles` прошли на PostgreSQL 18. Временная DB login роль удалена; smoke fixtures удалены скриптами. После проверки dev PostgreSQL остановлена, named volume сохранён. GPU job не отправлялась.


### 686. Model stack visibility и пользовательский лидер Pika Flex (2026-11-14)
- По уточнению пользователя не считаем VEDA или PDD лидером: текущий лучший пока вариант — standard H3 Ref2V `minimax_h3_ref2va_pruned_int8_convrot` + `pika_h3_flex_ref2va_v1_bf16`; финального решения ещё нет. В `reference-parity.md` и `h3-optimization-lab.md` зафиксирована предварительность выбора и запрет менять active/default по этому сообщению.
- Реальный UI workflow `video_pika_h3_flex_ref2va.json` (21 API node после converter) прошёл установленный ComfyUI `/object_info` schema validation, H3 R2V boundary, profile build, image injection и runtime Pika LoRA preflight; LoRA available, missing нет. `qualityHint=unknown` оставлен честно, потому что sampling steps не выводятся из имени Pika LoRA. GPU submit не выполнялся. Отдельный `video_pika+HQ_h3_flex_ref2va.json` использует другой UNET и не выбран пользователем как лидер.
- `H3WorkflowProfile` теперь получает детерминированный graph-derived `modelStack` (diffusion, LoRA, text encoder, VAE); API profile save/read отдаёт `model_stack`, профильный dropdown показывает diffusion+LoRA filenames рядом с названием/hash. Это облегчает сравнение и не переключает default.
- Проверки после изменений: `npm run typecheck`, `smoke:h3-profile`, `smoke:h3-refmod-profile`, `build:web`, `smoke:workflow-profiles` и DB-backed `smoke:workflow-job-plan` прошли; в последнем проверены unbound video (400), wrong loader class (400) и valid `LoadVideo` (201 snapshot). `git diff --check` чистый. Изолированная dev БД остановлена; обе БД volumes сохранены, smoke fixtures и login роль отсутствуют.


### 687. Local llama.cpp shot-plan assist (2026-11-14)
- `PlannerAssist` больше не маркирует echo/stub как генерацию: UI отправляет текущие shot fields в `/v1/planner/assist`; API выбирает только модель из локального `GET /v1/models` (`QWEN_LLAMA_MODEL` опционален), вызывает `POST /v1/chat/completions` и проверяет строгий JSON из семи строковых секций. Предложение применяется только в UI после пользовательского клика; endpoint не читает/записывает каталог, не вызывает tools и не создаёт/утверждает jobs. Старый детерминированный `/v1/planner/plan` сохранён для совместимости.
- Input/output ограничены по размеру, неизвестные поля/невалидный JSON отвергаются; недоступная модель даёт 503, неверный результат 502, некорректный brief 400. Модель по умолчанию берётся из локального `/v1/models`, фиксированный выбор — `QWEN_LLAMA_MODEL`.
- Сверены рабочие конфиги: `docs/operations.md` и `deploy/systemd/llama-server.service.example` используют порт 8081, тогда как API/worker/adapters/probe по умолчанию смотрели на 8080. Согласовал кодовые defaults и `.env.example` на `http://127.0.0.1:8081`; это loopback, облачные providers не добавлялись. Сейчас локальные llama endpoints 8080 и 8081 оба недоступны, поэтому реальный inference не проверен; mock API smoke подтверждает только transport/validation behavior.
- Проверки после изменений: `npm run typecheck`, `npm run smoke:local-planner`, `npm run smoke:planner-api`, `npm run build:web`, `git diff --check` прошли. Следующий шаг — live проверка на пользовательском llama runtime после его запуска; разговор и tools на тот момент отсутствовали.

### 688. Persisted local Director context (2026-11-14)
- Добавлена миграция `020_director_agent_sessions.sql` и PostgreSQL API для создания/чтения сессии и атомарного сохранения user/assistant exchange с version check, максимум 40 turns и 100 KB. Planner Assist получает project ID, сохраняет ID сессии в localStorage по проекту и отправляет последующие shot briefs с краткой историей.
- `/v1/planner/assist` для session-bound вызова читает ограниченную выборку project timeline и active workflow metadata. Они передаются в локальную llama.cpp как результат read-only контекста `read_selected_project` и `list_active_workflows`; полный граф workflow и asset storage keys не передаются. Provenance отмечает использованные инструменты. Никаких записей в каталог, jobs, approvals или ComfyUI нет.
- Проверки: `npm run typecheck`, `npm run smoke:local-planner` (включая валидацию передачи истории/контекста и отказ session storage в memory mode), `npm run check:migrations`, `npm run build:web`, `git diff --check` прошли.
- На изолированной `qwen-director-dev` PostgreSQL применена migration 020 и прошёл `smoke:director-sessions`: API создал persistent session, записал обмен, вернул его на GET; stale version получила `DIRECTOR_SESSION_VERSION_CONFLICT`. Smoke session удалена, временная DB роль и её grants удалены, dev-контейнер остановлен, volume сохранён. Legacy `qwendirector` БД не трогалась.
- Проверки: `npm run typecheck`, `smoke:local-planner`, `smoke:director-sessions` на PostgreSQL, `check:migrations`, `build:web`, `git diff --check` прошли. Ограничения: live llama.cpp inference недоступен, UI runtime не проверялся; в memory mode persistent sessions намеренно отвечают 501. Текущий UI сохраняет планирующие обмены, а не произвольный свободный чат. Следующий шаг — session-backed inference на локальной модели и reviewable shot-plan approval. Не менять пользовательский provisional Pika Flex выбор и не менять ComfyUI profile по умолчанию.

### 689. ComfyUI v0.45.0 и live Pika Flex preflight (2026-11-14)
- ComfyUI был на commit `08ff3c11` (version `0.39.0`), локальная ветка совпадала с тогдашним origin, но upstream default branch достиг commit `eee59185` и официального stable release `v0.45.0` (`989d93d0`), published 2026-11-10. Runtime был idle, queue 0/0.
- Сохранён backup branch `codex/comfyui-pre-update-20261114` и stash с тремя первоначальными локальными diff. Создана рабочая ветка `codex/comfyui-v0.45.0` на официальном stable tag. Upstream уже содержит PDD stacked-head support для MiniMax H3; старый локальный PDD diff оставлен в stash как резерв и не наложен поверх более новой реализации. Локальная NVFP4 conditioning поддержка для Qwen Image перенесена вручную в актуальный encoder. Models/base directory, custom node directory и workflow JSON не менялись.
- По `uv pip install --dry-run` обновлялись только 8 ComfyUI/frontend/template/kitchen packages; PyTorch/CUDA не менялись. После обновления `/system_stats` сообщает ComfyUI `0.45.0`, frontend `1.58.5`, templates `0.11.105`, docs `0.5.16`, comfy-kitchen `0.2.41`, comfy-aimdo `0.6.0`; runtime использует ту же RTX 5090, очередь 0/0.
- Live Comfy `/object_info` подтвердил H3 boundary, `SaveVideo`, `LoraLoaderModelOnly`, доступную Pika Flex LoRA и оптимизационные nodes. Workflow `/mnt/AI_FAST/comfyui/user/default/workflows/video_pika_h3_flex_ref2va.json` конвертирован в 21-node API graph; schema validation, H3 boundary build, model stack extraction и live LoRA preflight прошли, `missingLoras=[]`, `qualityHint=unknown`. Ничего не ставилось в очередь, GPU generation не выполнялась.
- Следующий шаг: live llama.cpp session inference и UI smoke. Отдельно проверить NVFP4 conditioning на соответствующей Qwen Image модели; сейчас проверен синтаксис/импорт, но не выполнен реальный quantized image generation. Если потребуется откат, вернуться к backup ветке, восстановить stash и вернуть пакетные версии по старому `requirements.txt`; не удалять backup ветку/stash до подтверждения стабильности новых workflows.

### 690. Visible Planner Assist conversation (2026-11-14)
- Planner Assist стал session-based dialogue: пользователь добавляет режиссёрское уточнение к текущему shot brief, видит сохранённые user/assistant turns и может начать новый локальный диалог. Session ID хранится в браузере отдельно для каждого проекта; восстановление делает API GET по session ID. Ассистент по-прежнему предлагает typed shot sections, которые применяются в редактор только после клика.
- `/v1/planner/assist` передаёт локальной модели уточнение вместе с неизменёнными полями shot brief и ограниченной историей. PostgreSQL сохраняет текст запроса и структурированный ответ; read-only project/workflow context и прежняя version check остаются. Записи каталога, job, approval и ComfyUI недоступны.
- Проверки: `typecheck`, `smoke:local-planner`, `build:web`, `git diff --check` прошли. Обновлённый PostgreSQL smoke прошёл на изолированной dev-БД: сохраняет уточнение, восстанавливает пару turns, отвергает устаревшую версию; временная роль/grants и тестовая session удалены, контейнер остановлен.
- В live окружении ComfyUI доступен, но QD API и llama.cpp не запущены; GPU inventory показывает только RTX 5090, поэтому модель не стартовал поверх рабочего ComfyUI. Live inference и реальный browser/UI runtime остаются непроверенными. Следующий безопасный продуктовый шаг — проверить UI через API+llama на предусмотренном локальном runtime/доступном GPU, затем добавить typed review proposal для явного утверждения shot plan перед durable job creation.

### 691. H3 directing method and AIMixer reference (2026-11-14)
- Из пользовательского `minimax-h3-director` skill встроены advisory монтажные эвристики в локальный Planner Assist и добавлен `docs/director-method.md` с границами подтверждённых H3 фактов и непроверенных книжных атрибуций. H3 Ref2VA job snapshot теперь компилирует шесть текстовых секций, распределяет `<Picture N>` / `<Video N>` / `<Audio N>` по ролям, разделяет soundscape и music; prompt и поля сохраняются в плане. Музыка проходит от UI/planner к job и shot draft.
- Добавлен общий контракт кадров `17k+5` при 24 fps; UI округляет длительность вверх, диапазон 124–362 помечен как advisory trained range. Примечание в `docs/workflow-adapter-contract.md` фиксирует, что шесть секций — наша prompt-конвенция, а не схема ComfyUI.
- Проверен установленный `AIMixer/ComfyUI_MiniMaxH3_Director`: чистый checkout на `4c6245e518dd8a494f3afc4f3cccd53f22d82d10`, Apache-2.0; upstream main на момент проверки — `85c66f59d6b13bec71324271258fcae07a2a5898`. Ценные продуктовые паттерны: segment timeline, reference groups, run selection, segment report и выключаемый context handoff. Не копировать код и не подключать Semantic Bridge/SelfLift/continuity-патчи к provisional Ref2V INT8 + Pika Flex без отдельного quality сравнения. Установка не обновлялась.
- Проверки: `npm run typecheck`, `npm run build:web`, `npm run smoke:cinematic`, `npm run smoke:prompt`, `npm run smoke:local-planner`, `npm run smoke:planner-api`, `npm run smoke:worker-h3-injection`, `python3 scripts/check_skeleton.py`, `git diff --check` прошли. Worker smoke подтверждает, что скомпилированный Ref2VA prompt попадает в cloned H3 workflow при сохранении исходного profile graph. В первом локальном planner smoke устаревшая поддельная модель не возвращала новый `music` ключ; фикстура обновлена, повторный smoke проходит. GPU generation/live inference не запускались.
- Осталось: добавить DB-backed smoke, что H3 Ref2VA compiled prompt и music immutable snapshot реально инъектятся в job; проверить migration 020/session-backed inference и UI runtime на предусмотренном локальном llama runtime. Монтажные правила остаются advisory, книжные страницы/reference файлы ещё не переданы. Не менять provisional model choice.

### 692. MiniMax+H3+Director workflow compatibility audit (2026-11-14)
- Проверен `/mnt/AI_FAST/comfyui/user/default/workflows/MiniMax+H3+Director.json`: 15-node UI graph с plugin `MiniMaxH3Director`; embedded timeline описывает 4 segments (362 + 362 + 362 + 124 кадров, 1210 frames / 24 fps = 50.42 s), R2V, общие refs и context handoff 22 frames. Активный model stack отличается от пользовательского текущего provisional baseline: hybrid FL2VA/Ref2VA INT8 + FL2V Turbo8 LoRA.
- Conversion против live Comfy `/object_info` выявила старый widget order: числовые/enum значения отображались как `frame_rate=randomize`, `timeline_data=1210`, `steps="高级采样"`, `shift_video="simple"`, `export_source_images` string. Добавлена общая primitive/enum validation в `validateComfyApiWorkflowSchema`; этот workflow теперь отклоняется с точными именами некорректных входов вместо тихо испорченного API graph. QwenDirector H3 profile boundary пока поддерживает native H3, но не `MiniMaxH3Director` custom node.
- Live Comfy `/view` проверил 7 unique image references из plugin timeline: ни один файл сейчас не доступен как input. Даже после boundary adapter потребуется import в CAS и remap к AssetVersion, чтобы восстановить immutable references/provenance. Исходный workflow не изменялся; queue и GPU generation не затрагивались.
- Расширен PostgreSQL `smoke:workflow-job-plan`: проверяются шесть compiled Ref2VA sections, `music=N/A`, director fields в immutable plan и shot prompt JSON. На изолированной `qwen-director-dev` БД прошли `smoke:workflow-job-plan` и `smoke:director-sessions`; временная роль после первого cleanup отказа из-за grants была очищена явными REVOKE + DROP, dev container остановлен, legacy DB оставлена остановленной.
- Дополнительно прошли `typecheck`, `build:web`, `smoke:workflow-import`, `smoke:workflow-conversion-api`, `smoke:cinematic`, `smoke:worker-h3-injection`, `smoke:planner-api`, `smoke:local-planner`, `check_skeleton.py`, `git diff --check`. H3 snapshot → worker graph injection проверен контрактно; live prompt submit/GPU run не выполнялся.
- Следующий шаг: решить adapter boundary для AIMixer segmented timeline и импорт его embedded media в AssetVersion; сохранить user-owned segmentation/prompts при single durable job или явно раскладывать на shot jobs до approval. Не активировать этот graph как Ref2V Pika baseline и не маскировать missing references.

### 693. Named ComfyUI widget values for workflow import (2026-11-14)
- На вопрос о `MiniMax+H3+Director`: да, workflow был проверен в сессии #692. Добавлена поддержка `widgets_values_named` на UI node или в `properties`; если она присутствует, именованные поля имеют приоритет над устаревшим позиционным `widgets_values`. Это позволяет безопасно разбирать workflow, экспортированные frontend/plugin версиями, которые сохраняют значения по имени.
- В проверенном AIMixer workflow named map отсутствует, а массив не соответствует актуальному API input order. Generic converter намеренно не пытается эвристически реконструировать его значения; текущий импорт должен завершиться schema/preflight отказом до постановки в очередь. Нужен специализированный AIMixer timeline adapter с версионированным контрактом либо workflow, заново сохранённый с именованными значениями.
- Добавлен smoke для конфликта старых positional и корректных named значений. Прошли `npm run smoke:workflow-import`, `npm run typecheck`, `git diff --check`. Live AIMixer workflow повторно не запускался; этот срез не добавляет `MiniMaxH3Director` в поддерживаемую H3 job boundary и не запускает GPU generation.
- Следующий срез: реализовать read-only parser AIMixer `timeline_data` по фактической версии локального plugin и подготовить mapping segment/reference в QD shot + AssetVersion contract. Сначала определить, как надёжно привязать сохранённый timeline к model/LoRA stack, seed и текущим runtime inputs; missing media должны оставаться видимыми preflight errors.

### 694. AIMixer segmented timeline v5 parser (2026-11-14)
- Реализован `parseMiniMaxDirectorTimeline` для фактического AIMixer `timeline_data` version 5. Он сохраняет source snapshot, normalizes кадры/FPS/размеры, prompts, task type, continuity flag и объединяет повторы global/segment refs; отклоняет неизвестную версию, дублирующиеся segment IDs, перекрытия и ошибочные диапазоны. Добавлен package export и `smoke:minimax-director-timeline`.
- Parser запущен на пользовательском `/mnt/AI_FAST/comfyui/user/default/workflows/MiniMax+H3+Director.json`: версия v5, 1210 кадров при 24 fps, 4 сегмента `[362,362,362,124]`, 3 сегмента с prompt и 3 continuity handoffs; получено 7 уникальных media refs, все требуют разрешения в AssetVersion. Оригинальный workflow и очередь ComfyUI не менялись.
- Проверки: `smoke:minimax-director-timeline`, `smoke:workflow-import`, `smoke:workflow-conversion-api`, `smoke:comfy-schema`, `typecheck`, `git diff --check` прошли.
- Ограничение: это parser, не executor/profile boundary. Имена Comfy input файлов пока остаются неразрешёнными media descriptors, поэтому shots/jobs не создаются; generic UI workflow importer по-прежнему не может безопасно восстановить устаревший positional widget map. Следующий шаг — read-only media resolver/import в CAS → AssetVersion mapping, затем версионированная AIMixer profile boundary, которая переносит model/LoRA/sampling snapshot и каждый сегмент в reviewable shot plan до ручного approval.

### 695. AIMixer reference asset resolver and importer (2026-11-14)
- Сверен существующий QD `/v1/assets/import`: принимает байты, SHA-256, MIME и actor; CAS дедуплицирует по hash и записывает immutable AssetVersion. Добавлен `scripts/import_aimixer_references.mjs` / `npm run import:aimixer-references`: по умолчанию только dry-run, работает лишь с loopback ComfyUI/API, ограничивает размер и находит timeline v5 без жёсткой привязки к widget index. `--commit` требует все refs разрешёнными, actor и локальный QD API; возвращает SHA → AssetVersion mapping.
- Fresh dry-run на текущем workflow получил 7/7 HTTP 404 и 0 импортов. Никакие asset rows, jobs, workflow profiles и Comfy queue не изменены. После восстановления файлов можно выполнить `QWEN_IMPORT_ACTOR=<локальный-оператор> npm run import:aimixer-references -- --commit`; при QD API token дополнительно выставить `QWEN_API_TOKEN`, endpoints можно задать через loopback `COMFYUI_URL`/`QWEN_API_URL`.
- Проверки: `npm run import:aimixer-references` (dry-run, 7 отсутствующих refs), `npm run smoke:minimax-director-timeline`, `npm run typecheck`, `git diff --check` прошли.
- Ограничение: importer создаёт AssetVersion по одному и пока не делает segment association; если сервер/API прервётся посреди commit, content-addressed blobs уже записанных refs останутся в каталоге и безопасно dedupe при повторе. Следующий шаг — importer report с durable mapping и staged review, затем преобразование сегментов в shots с этими AssetVersion IDs. Workflow importer widget order и полная AIMixer execution boundary всё ещё требуют отдельного решения.

### 696. Синтез пользовательского аудита H3 практик (2026-11-14)
- Сверена технология Open-H3 Regenerate: это локальный генеративный 2-й pass, отличающийся от hosted MiniMax Regenerate API. На локальном workflow установленной версии схема: VAE encode → LBH 3D latent upscale → re-noise/refine → VAE decode; release sigma `start_sigma=0` запускает штатную сетку около 0.909 и означает сильную перерисовку, а не слабое вмешательство. README установленного пакета показывает пример drift мелкого лица на release grid и меньший drift при `start_sigma=0.8`.
- В ComfyUI реально присутствуют Open-H3 Regenerate commit `9b686c5`, Pika Ref2VA Flex, Open-H3 r128/Sharp weights, 3D latent upscalers, SelfLift/FaceRefine/SolAttn nodes, Save Refined Latent. Veta/VSA в текущем `/object_info` нет. Фактический Pika workflow — Ref2VA, Pika LoRA strength 1, 1344×768. Наличие нод/моделей не считается quality approval.
- Принята архитектурная рекомендация `draft → optional finish`: Pika draft остаётся provisional baseline; Regenerate — отдельный reviewable профиль, никогда не второй LoRA поверх Pika. Для важных интерьеров/логотипов оставляется путь без Regenerate. Save Latent добавляется перед тяжёлым decoder как recovery, не как способ снизить его peak memory.
- Документирован короткий честный A/B для 5 секунд на RTX 5090: один и тот же 124-frame draft, draft vs release sigma vs 0.8 sigma; отдельный интерьер с инвариантами и план с малой фигурой; измерять VRAM/RAM и encode/refine/decode отдельно. Ни один finish job не запускался.
- Отдельные числовые claims из переданного аудита (0.5 MP минимум, 8–12 шагов для звука, Veta speedups, 50–60% от cleanup, язык/артефакты и универсальные overlap settings) оставлены гипотезами, так как не предоставлены исходные ролики/повторяемые измерения. Local `h3-optimization-lab.md` получил таблицу решений и этот A/B план; `director-method.md` фиксирует генеративный риск 2K стадии.
- Внешняя сверка: NVIDIA описывает open refiner как 3-step full-resolution diffusion после latent upscale и отдельно от закрытого hosted API; ComfyUI hosted Regenerate node принимает необработанный 768p 24 fps клип; установленный local pack документирует latent recovery и свои реальные ограничения по GPU. Ссылки записаны в тексте ответа; плагины и модели не обновлялись/не скачивались.
- Следующий продуктовый шаг: завершить AIMixer → DesignDocument mapping на AssetVersion IDs, а затем реализовать отдельный immutable finish profile с graph hash, explicit output mode, sigma, audio routing и Save Refined Latent. Запускать сначала только утверждённый короткий A/B на RTX 5090; не менять Pika default до ручного сравнения.
### AI Everywhere: quality gate и seed contact sheet (2026-11-15)
- Уточнён production gate в `docs/music-video-ai-everywhere.md`: отбор начинается с нескольких seed при неизменном prompt, просмотр still на полном кадре и 100% важных зон, temporal QC движения до любого refine; hard invariants остаются на детерминированном finish пути, если диффузионный pass их меняет.
- Для существующего Verse 1 contact-sheet shot созданы три локальных Qwen Image 2.1 варианта с одинаковым prompt и seed `920201`/`920202`/`920203`; вместе с base frame составлен 2×2 лист `AI-Everywhere-contact-sheet-2x2-v1.png` (1376×768). Все четыре варианта просмотрены при одинаковом масштабе: читаемые wireframe-road композиции, выраженно разная геометрия skyline, явных артефактов в still не видно. Это контрольный отбор вариантов, не финальный художественный выбор.
- Собран короткий silent selection preview `AI-Everywhere-contact-sheet-2bar-v1.mp4`: 82 кадра, 24 fps, 1376×768, 3.4167 s; сначала по очереди подсвечивается каждый из четырёх вариантов, затем остаётся контакт-лист. Контрольные кадры проверены; это наглядная монтажная проба без master audio, и её длительность пока не привязана к реальному downbeat.
- Оба артефакта импортированы в CAS с lineage от исходной картинки и трёх seed: contact sheet AssetVersion `0a4a8b23-79c2-4ba5-875f-b7b6ec53f9b6`; video AssetVersion `350a8bbf-9067-4f9b-a927-3f3b95dbf453`. Оба связаны с AI Everywhere project как deliverables. API `/health` ответил `ok`.
- Рабочая цель качества теперь проверяема: композиция на полном кадре, ключевые зоны в 100%, геометрия/фаза/мерцание на начале-середине-конце видео, пригодность после точной подрезки. Любая неудача требует сменить дубль/постановку; upscale сам по себе не считается исправлением. Существующий 6-step H3 результат остаётся motion preview, не master.
- Следующий шаг: продолжить шот `Мокрая улица — машина проходит слева направо` → macro chrome → contact-sheet insert и проверить реальный монтажный стык по оси/экранному вектору/крупности. Перед объявлением музыкальной синхронизации сверить края с master audio; при наличии времени сделать кадровый QC H3 source, а не только retimed selection preview.

### 697. Live H3 profile preflight после GitHub push (2026-11-15)
- После коммита `f1d2cb4` проверено рабочее дерево: `main` совпадает с `origin/main`; локально оставлены незакоммиченными `docs/next-session.md` и два документа ремонта спальни, которые не публиковались из-за машинных путей и личных материалов.
- Локальные QwenDirector `/health` и `/ready` отвечают 200; `/ready` = `ready`, `degraded: true` только из-за optional llama.cpp, ComfyUI и storage отмечены доступными.
- Через QwenDirector live preflight проверены `ai-everywhere-h3-pika-digital-world-v2`, `ai-everywhere-h3-pika-refmod-preview` и `ai-everywhere-h3-pika-refmod-room-preview`: `tested=true`, общий H3 node boundary найден, `missingLoras=[]`. GPU очередь не менялась и генерация не запускалась.
- Отдельный Comfy MCP инструмент сейчас сообщает remote target, недоступный из его probe-контекста; он не совпадает с фактически успешным loopback ComfyUI endpoint QwenDirector. Для проекта использовать и дальше проверять адрес, заданный в локальной конфигурации QwenDirector; не перенаправлять генерацию через Comfy MCP без проверки target.
- Следующий engineering шаг: portable PostgreSQL verification scripts. Много smoke/report scripts по-прежнему принудительно задают Unix socket `/var/run/postgresql` и/или перезаписывают `DATABASE_URL`, из-за чего production checks не переносятся на текущую TCP-конфигурацию. Исправить единообразно, не затрагивая пользовательскую БД до явной изоляции тестового окружения; после этого добавить DB-backed доказательство profile snapshot → worker graph injection.
