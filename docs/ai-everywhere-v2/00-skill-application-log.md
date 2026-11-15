# AI Everywhere v2 — журнал применения skills

Версия: 0.1 · Статус: `PROPOSED / UNAPPROVED` · Дата: 2026-11-15
Источники: проектные документы, v22/EDL, master audio; локальные skill-файлы; удалённый репозиторий film-production-skills.
Утверждено: только неизменность мастер-трека и уже созданных ассетов. Сценарий v2 и монтажная карта не утверждены.
Непроверено: точные вокальные атаки/дыхание; сплошной покадровый QC v22; недоступные первичные тексты книг.

## Семь стадий film-production-skills

Источник всех семи: [`zhangzhangco/film-production-skills`](https://github.com/zhangzhangco/film-production-skills), branch `main`, проверенный commit `47b2a6a432235e716fa2aa0d08eefae76fdb34fd` (2026-11-15). Каждый удалённый `SKILL.md` и соответствующий `references/field-guide.md` фактически прочитан по `raw.githubusercontent.com` на этом commit. В рабочем `/home/la6/.codex/skills` они **NOT INSTALLED**; это удалённое применение инструкций к документам, а не установка плагина. Источник установки: README репозитория; установка не выполнялась.

| Skill | Фактически прочитанные файлы | Применение в этом пакете |
|---|---|---|
| `structure-screenplay` | `skills/structure-screenplay/SKILL.md`, `skills/structure-screenplay/references/field-guide.md` | `01-song-beat-map.md`: 7 сцен, 21 lyric unit, source IDs, стабильные `AE-SC/AE-U/AE-B`, phrase bins и отдельные статусы тайминга; текст песни сохранён дословно. |
| `shape-story-blueprint` | `skills/shape-story-blueprint/SKILL.md`, `skills/shape-story-blueprint/references/field-guide.md` | `02-director-treatment.md`: creative brief с происхождением ограничений, 7 причинно меняющих ситуацию story nodes, planning board и continuity notes. Не навязывается внешняя трёхактная формула. |
| `design-production-assets` | `skills/design-production-assets/SKILL.md`, `skills/design-production-assets/references/field-guide.md` | `03-storyboard-shot-bible.md`: паспорта героя/локации/реквизита, неизменные anchors, допустимые вариации, asset coverage и неоднозначности. Только спецификации, без генерации изображений. |
| `plan-camera-shots` | `skills/plan-camera-shots/SKILL.md`, `skills/plan-camera-shots/references/field-guide.md` | `03-storyboard-shot-bible.md`: пространственные базы, оси, векторы, сегменты с `start/action/end`, предлагаемые длительности и preflight. Времена — монтажные bins, не word sync. |
| `compile-generation-prompts` | `skills/compile-generation-prompts/SKILL.md`, `skills/compile-generation-prompts/references/field-guide.md` | `05-generation-handoff.md`: provider-neutral `shot_ir`, storyboard frames, image/video/provider request sketches, quality gate. Не отправлялись в ComfyUI и не выдаются за готовый исполняемый workflow. |
| `execute-media-generation` | `skills/execute-media-generation/SKILL.md`, `skills/execute-media-generation/references/field-guide.md` | Только provenance audit существующих результатов в `04-v22-creative-and-edit-audit.md` и `05-generation-handoff.md`: EDL source IDs и project AssetVersion IDs. Skill generation **не исполнялся**: новых запросов/джобов/трат нет. |
| `review-and-assemble` | `skills/review-and-assemble/SKILL.md`, `skills/review-and-assemble/references/field-guide.md` | `04-v22-creative-and-edit-audit.md`: 58-сегментный non-destructive audit, `UNREVIEWED` статусы, source ranges, reuse decisions. Export manifest намеренно отсутствует: revised plan не утверждён, blocking QC не пройден. |

## Локальные применённые материалы

| Файл | Статус и фактическое применение |
|---|---|
| `/home/la6/.codex/skills/music-video-subtitle-generator/SKILL.md` | Прочитан. Skill найден локально, но его `compatibility` требует MiniMax Hub Canvas и Hub generation/routing — этих инструментов в текущей среде нет. Поэтому production skill формально **не исполнялся**. Переносимы только правила: master audio — единственная музыкальная основа; слова не переписывать; длинный клип — модульный shotlist; текст в кадре — отдельный слой и только если он оправдан. Применение: `01`, `02`, `03`, `05`. |
| `/home/la6/.codex/skills/h3-prompt-writing/SKILL.md` | Прочитан; применён как локальный prompt-spec skill на плановом уровне. |
| `/home/la6/.codex/skills/h3-prompt-writing/references/base-en.txt` и `ref-en.txt` | Оба прочитаны. В `05` разделены keyframe-first I2VA/FL2VA и multi-reference Ref2VA; поля и reference roles планируются без выдачи этих sketches за готовый prompt или поддержанный профиль. |
| `docs/director-method.md` | Прочитан. Даёт локальные continuity-проверки и явно предупреждает, что первичные страницы Соколова/Медынского не переданы; числовые правила из пользовательского ранее вставленного skill здесь не атрибутированы как проверенные цитаты. |

## Отсутствующие локальные материалы

- `minimax-h3-director` — **NOT INSTALLED** в локальных skill roots. Ранее вставленный пользователем текст был виден в контексте, но не является фактически прочитанным локальным `SKILL.md`/reference. Отдельный файл отсутствует; установка из сети не выполнялась. Будущий источник: ранее указанный пользователем skill/репозиторий AIMixer; прежде чем ссылаться на конкретную версию — закрепить URL и commit.
- `sokolov_editing_skill.md`, `medynsky_composition.md`, `art_concept_cinematic_director.md` — **NOT FOUND** в проекте и каталогах локальных skills при поиске имён. Поэтому в документах ниже используются только осторожные практические проверки из `director-method.md` и явно маркированные постановочные предложения; точные книжные цитаты/формулы не заявляются.
- Внешние skills не установлены. По README репозитория можно установить их командой `npx skills add zhangzhangco/film-production-skills --skill '*' --agent codex`; это предложение, не выполненное действие.

## Источники и ограничения аудита

- `README.md`, `docs/next-session.md`, `docs/music-video-ai-everywhere-script.md`, `docs/music-video-ai-everywhere.md`, `docs/director-method.md`.
- Master `/home/la6/AI-Everywhere.mp3`: SHA-256 `5369d3fead4b4c335be16e90d1089f8bc085abe4cb328e1fb5b1a79e40bdc154`, `164.520 s`, stereo 48 kHz; embedded cover-art stream 360×360 не является video master.
- Master декодирован локально без сохранения производной копии: грубая 20 ms RMS novelty autocorrelation даёт близкие конкурирующие пики 142.86/136.36 BPM, поэтому не используется как beat lock; условный первый сигнал около 0.18 s не является vocal onset. См. `01-song-beat-map.md`.
- Viewing cut `/tmp/AI-Everywhere-full-2m45-v22-1080p.mp4`: SHA-256 `b3191be9c4d3abef3d855e5df372cdb11f782b928ac8605878b5d1402204eaca`, 1920×1080/24 fps, 3960 frames / `165.000 s`.
- EDL `/tmp/AI-Everywhere-full-2m45-v22.edl.json`: SHA-256 `46d8ca762c7a530c9340ec0c5a83343b4093e1883f1144512ae3c5b986b34100`, 58 segments, 3950 picture frames, final hold. Project `a654d533-63f0-463d-bbec-aab87b231d06`; video AssetVersion `0d3b54e4-9a8a-4d2a-a091-206701ac028b`; EDL AssetVersion `42ceb6a4-e1dc-47d2-aa4b-5db720035f5b`; master AssetVersion `4aeb59be-8b2a-4702-955b-b397a8b8f0e8`.
- v22 визуально оценён по midpoint contact sheets всех 58 EDL сегментов (`/tmp/ai-everywhere-v22-review/contact-1.jpg` … `contact-3.jpg`) и EDL descriptions. Это просмотр ключевого кадра каждого сегмента, **не** непрерывный просмотр/прослушивание полного ролика.
