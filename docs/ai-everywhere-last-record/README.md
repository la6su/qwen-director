# AI EVERYWHERE / THE LAST RECORD — актуальная документация клипа

**Дата сверки:** 2026-11-17. **Этап:** литературный сценарий `05` остаётся DRAFT и должен быть прочитан пользователем перед storyboard/shot-by-shot generation; продолжаются независимая документационная сверка, reference research и исправление причинно-следственных/технических несостыковок. Hero и DJ portraits — принятые пользователем identity anchors. Shop imagery и S02 visual experiments остаются кандидатами, не утверждёнными кадрами. Детальные receipts/QC: [30-production-readiness-and-storyboard-v1.md](30-production-readiness-and-storyboard-v1.md), scene refs — [31-scene-reference-completion.md](31-scene-reference-completion.md). Полного storyboard, picture-locked EDL и финального экспорта нет.


> **LR-S03 intro approved:** пользователь утвердил `The_Last_Record_Storefront.png` (1672×941, SHA-256 `f78f044f47299fddcb703204d371bae59bf000bdf312937b30739a7e3b8169c5`, QD AssetVersion `318def94-a89c-4b75-bb34-6fff230eeb45`). Это единственный текущий approved storefront reference. Сохранить вывеску и наклеенные велостойки; наружная стойка с афишами исключена. Предыдущие фасадные композиты не использовать как выбранный дизайн.

**Актуальные референсы по всем сценам:** [аудит пробелов и источников](29-scene-reference-audit.md); актовые контакт-листы лежат в `references/visual/last-record/acts/act-{1,2,3}/reference-board-act-{1,2,3}.jpg`. Они предназначены для визуального исследования и не являются утверждённым дизайном локаций.

## Проекты QwenDirector

Текущий QwenDirector Project: `8dc7d22f-7e16-426c-b5f8-f897edb692b5`. Live GET 2026-11-17 подтвердил 8 scenes / 47 linked project assets / 28 shots. Пользователь выбрал portrait anchors `LR-C01` `51dd8ca8-44fc-4a68-95b2-dacd5b382d93` и `LR-C02` `4d79b520-7033-4f35-bcf9-0221fd87fdd4`; первый S01 storyboard output `8c9b0158-2f03-401d-a6d0-410aaccac918` не выбран. В `LR-S02` есть технический bike ControlNet/Ref2VA A/B test, unselected dark-underpass image edits, unselected soft drivetrain crop и новый high-resolution dark face reference (not user-selected). В `LR-S03` выбранный ночной фасад v3 (`cec501fd-e39e-4dac-b607-c4edd9466a0c`) дополнен композитом с объёмной вывеской, настоящими poster plates и пустой велопарковкой. Первый композит v1 (`a4711717-0720-471d-91a0-33a213ec7d6c`) сохранён; более заметный v2 прикреплён к Project как review candidate (`057833fe-ee5d-4d5f-b584-2829663c0a41`), ещё не user-selected. Основные cover files, фасад Rough Trade, интерьерные фото Sister Ray/Rough Trade и Phonica crop связаны с новым Project как research/reference assets; часть cover art также использована в производных композитах. Полного locked storyboard, conform EDL и финального экспорта пока нет. Старый Project `88a4fdec-156b-4f4b-abd9-e04328a512e1` оставлен нетронутым как provenance прежнего production; его кадры и jobs не становятся референсами нового фильма без выбора пользователя.

## Творческий канон

- В ночь закрытия независимого магазина молодой постоянный посетитель едет на fixed gear и привозит виниловую пластинку со своим новым треком.
- Он хочет сам поставить работу перед пожилым владельцем-DJ и получить признание как автор.
- DJ давно знает героя и до закрытия ищет, кому передать пост. Услышав трек, он доверяет герою собственный назначенный клубный выход.
- Этот выход — последний в карьере DJ. Этой ночью он уходит из DJ-сцены и передаёт герою свой пост.
- В магазине герой сам ставит пластинку на клиентский listening deck; DJ слушает. Единственная передача места за booth происходит в клубе.
- В клубе музыка героя сама обосновывает передачу; он принимает пост, читает зал и ведёт сет. Толпа отвечает разными людьми и не движется синхронно.
- Исходный master MP3 неприкосновенен; базовый вариант непрерывный. Клубную room perspective и ручное продление инструментальной части можно проверить на копии таймлайна, не меняя исходник; игла не вызывает ложный restart.
- Тема — преемственность ремесла и сообщества между эпохами и инструментами. Винил и AI не противопоставлены лозунгом; смена поколений показана через передачу реального поста и последующее действие героя.
- Визуальная партитура существует полнокадрово в самом клипе, не на экране внутри сюжета. Она должна развивать одну узнаваемую линию героя, велосипеда, города и сообщества.

Запрещённые элементы: авторская комната, shop radio/эфир, мастерская нарезки пластинки, проектор/экран, магические переходы, выдуманная погоня, второй велосипедист, paper set list, повторная передача деки и будущая резиденция.

## Главные рабочие документы

| Файл | Содержание | Статус |
|---|---|---|
| `00-source-and-skills-audit.md` | Источники, master fingerprint, реально прочитанные skills и project state | Фактический audit |
| `01-music-cue-sheet.md` | Master и музыкальная карта | Метки candidate; нужен ручной conform |
| `02-reference-and-theme-matrix.md` | Авторская позиция, тема и референсные методы | Актуализировано по сценарию |
| `03-three-story-directions.md` | Выбранный story engine и red-team вариантов | Активный вариант — draft |
| `04-literary-treatment.md` | Цельное изложение фильма | Draft для редакции |
| `05-screenplay-draft.md` | Сцены, действия, изменения ценности и переходы | Основной сценарный draft для пользователя |
| `06-director-statement-and-editing-grammar.md` | Камера, свет, ГРИП, звук и монтаж | Режиссёрская грамматика, не prompts |
| `07-continuity-and-feasibility.md` | Герои, реквизит, пространство, разрешение и runtime ограничения | Production preflight; single portrait anchors приняты, multi-angle sheets не получены |
| `08-beat-to-shot-preview.md` | Candidate music windows и нужное покрытие | Не EDL и не locked shot list |
| `09-creative-red-team.md` | Сильные стороны, риски, что вырезать/усилить | Текущий критический pass |
| `24-current-creative-constraints.md` | Подтверждённые пользовательские решения и production вопросы | Творческий контракт |
| `25-act-structure-workshop-v1.md` | Актовая карта и постановочные вопросы | Обновлено по последним ответам |
| `story-bible.md` | Компактная передача канона следующей модели | Актуальная версия |
| `26-documentation-conformance-audit.md` | Проверка документов и проект/runtime receipt | Аудит |
| `27-h3-fun-controlnet-union-2.0-integration.md` | Локальная интеграция ControlNet и matched A/B тест | Технический тест; оба видео unselected |
| `28-record-shop-prop-reference-plan.md` | Обложки, винил и дека; просмотр реальных shop outputs и интернет-референсы | Research/preflight, не storyboard |

## Архив и provenance

`10-production-handoff.md`, `11`–`19`, `23-scenario-review-draft.md`, старые storyboard/job/prompt/shot files сохраняют историю прежнего производства и помечены как архив/отвергнутый материал. Не переносить их prompts, takes, shot IDs и сюжетные решения автоматически. Существующие job/CAS материалы не удалять и не переписывать. Внешние фотографии в `references/visual/last-record/` — research references, а не утверждённые локации/кадры.

## Локальный ControlNet эксперимент

Отдельная интеграция `MiniMax H3 Fun ControlNet Union 2.0` описана в [`27-h3-fun-controlnet-union-2.0-integration.md`](27-h3-fun-controlnet-union-2.0-integration.md). Совместимый Comfy-Org repack установлен и checksum-проверен; несовместимый raw Alibaba checkpoint удалён по указанию пользователя. Профиль QwenDirector revision 2 активирован после runtime preflight. Выполнена пара локальных jobs через штатный QD approval/worker/CAS flow: ControlNet v2 и matched Ref2VA baseline с тем же source/seed/параметрами, но без patch/Canny. Узлы ControlNet действительно исполнены; на просмотренных contact sheets разница визуально умеренная, крупная геометрия почти та же. Оба файла оставлены `technical test / unselected for cut`, финальный клип take не создан. Хэши и синхронное сравнение — в [A/B отчёте](qc/controlnet-ab-report.md).

## Открытые решения после сценарного чтения

1. Пользовательские исправления и утверждение текста до storyboard.
2. Выбор реальных магазина и клуба, планировок и правдоподобной географии.
3. Точный blocking ухода DJ на выбранной площадке.
4. Пользовательская редакция предложенной full-frame visual-score партитуры и её motifs/proof moments в `05`/`08` — они остаются draft, без экранного события внутри сюжета.
5. Проверить предложенные props `CLOSING TONIGHT` / `FINAL DJ SET — TONIGHT`: они делают закрытие и цену слота понятными без диалога, но пока остаются редакторским решением, а не утверждённым пользователем дизайном.
6. Ручной conform исходного MP3: downbeat/phase, вокальные границы и хвост остаются непроверенными; сравнить обычный непрерывный master с отдельным клубным room-perspective/extension edit на копии.

Готовый exterior photo-reference `references/visual/last-record/london-record-shop-rough-trade-east-unsplash.jpg` уже связан с текущим Project как AssetVersion `68611ae4-33e5-4978-91fd-464f8b8f327a`. Использовать фото как исходный визуальный reference для фотографии фасада; пространственную схему магазина оставлять только режиссёрской заметкой и никогда не подавать как image input. Сценарный draft можно править автономно по уже данным решениям; story-specific storyboard и следующий generation batch не считать locked до пользовательской редакции сценария.

В `references/visual/last-record/covers-research/` добавлены локальные jungle sleeve references. Пользователь подтвердил, что магазинные обложки нужно строить по реальным интернет-изображениям; не возвращаться к случайной генеративной типографике. Читаемые cover plates делать контролируемым композитом, сохраняя provenance. Hero dubplate пока не получает отдельную иллюстрированную sleeve.

Сценарий остаётся draft, поэтому дальнейшие storyboard frames — reviewable candidates с точной привязкой к действию, а не окончательный picture lock. Пользователь разрешил автономно двигать визуальную разработку; продолжать один кадр/один workflow за раз через штатный QD approval/provenance, внимательно отбраковывать мягкие/AI-slop outputs и вести character/prop/location refs. Перед каждым Qwen Image/H3 job проверять фактические revision/hash, режим, входные роли и runtime.
