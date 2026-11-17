> **Архив / предыдущая версия:** Исторический разбор ошибок image-edit и screen composite прежней версии. Общие lessons по реальным refs и физической непрерывности могут информировать QC, но screen/projector сюжет и старые workflows здесь неактивны.

# Image editing и экранный композит: зафиксированные выводы

Дата: 2026-11-16. Документ предотвращает повторение ошибок при дальнейшей работе над `THE LAST RECORD`. Все перечисленные неудачные результаты сохранены в CAS как lineage, но не выбраны.

## Ответ про кратность 32

Кадры магазина A7–A10 имеют размер `1376×768`; обе стороны делятся на 32. Следовательно, размер основного canvas соблюдает обычную latent-grid кратность. Референс обложек — `1910×1520`; в использованных Qwen Image 2.1 графах `TextEncodeQwenImage21` получал `resolution=1024` и сам ресайзил reference с округлением к кратности 32.

Это **не объясняет** результат A8/A9: оба использованных edit graph обрабатывали весь кадр, без доказанного spatial mask/crop composite. Текстура обложек распространилась по остальному изображению. Для A10 применили экспериментальный `LatentCompositeMasked` graph; итог испортил кадр целиком. Нельзя утверждать, что причина A10 именно в кратности 32: это не установлено; вероятная область ошибки — непроверенная семантика/связность latent и mask ветвей.

Итого: кратность 32 важна при подготовке latent размеров/масок, но не превращает full-frame graph в локальный редактор и не является установленной причиной этих артефактов. Перед использованием графа надо сверять размеры каждого узла и смысл mask/composite в runtime.

## Разбор конкретных попыток

- **A7, shop master** — `c07a2b14-9d89-4c0f-8b18-17bfe9bdaaee`, PNG `1376×768`. В prompt мы явно запретили artwork на обложках, поэтому получились пустые sleeves. Это наша ошибка в задании. Кадр можно оставить только как draft географии/света, не как мастер магазина и не как источник обложек.
- **A8** — job `4c3d6315-8156-4e6f-9a2f-e56b8317c191`, output `ac75038e-28eb-4dfe-9e0a-032895f98954`; full-frame edit дал постороннюю текстуру по сцене. Reject.
- **A9** — job `4f245125-4fe9-4131-aaf2-029ecf6c7aae`, output `621aff9f-f80c-482a-a983-e3450c12bd0b`; та же проблема глобального редактирования. Reject.
- **A10** — job `17aa146e-98b6-4b9a-b0c4-034a0ebfd8c8`, output `e7631b48-f5d8-49c4-aa78-f559a45ef2b6`; непроверенный masked latent graph повредил изображение целиком. Reject; не повторять этот profile/graph.
- **H3 shop motion test** — output `f7992401-0378-4cd3-8bc2-c1fd8269d155`, `1280×720`, 24 fps, 124 frames (~5.17 s). Пользовательский QC: общее качество слабое; видимой деформации пользователь не подтвердил. Не выбран.
- **Hero sleeve** — output `a603b12a-12e0-4a90-a033-bc6444da7da7`; пользователю не понравился отдельный дизайн конверта героя. Не использовать как art direction.

Реальные источники обложек сохранены: `/tmp/last-record-rough-trade-shop-crop.jpg` (Wikimedia Rough Trade East crop, CC BY-SA 4.0; AssetVersion `15f5a940-8023-4e41-ae18-2a186d88fc99`) и `/tmp/last-record-album-covers-reference.jpg` (crop из Unsplash source; AssetVersion `a9866bbc-8ec8-4e7b-8914-8b2be22959fd`). Не генерировать псевдообложки вместо использования выбранных реальных источников без отдельного творческого решения.

## Статус workflow profiles: active не означает пригодность

При live-проверке 2026-11-16 три shop-cover profiles остались `active=true`, несмотря на отклонённые outputs: `last-record-qwen-image21-shop-cover-restoration-v1` (hash `bbd5f17a...`), `last-record-qwen-image21-shop-covers-single-ref-v1` (hash `e87d6a7d...`) и `last-record-qwen-image21-shop-covers-masked-composite-v1` (hash `5d16f456...`). Не выбирать их по признаку active и не отправлять через них новые jobs. Прежний H3 shop profile `ai-everywhere-last-record-h3-shop-track-v1` также остаётся active, хотя его единственный take получил слабый visual QC; не использовать повторно без отдельной переработки и проверки качества. Сам факт `/test`/preflight подтверждает только структуру/совместимость графа, не пригодность и не принятие кадра.

## Экранная вставка: что уже было и чего нет

В `08-beat-to-shot-preview.md` для LR-006/LR-012/LR-021 уже запланирован `screen composite`; `11-character-world-reference-spec.md` описывает экран/проектор и витрину; shop master содержит blank screen plate. Однако проверка доступных UI, workbench profiles и workflows не обнаружила отдельной реализованной функции «вставить кадр в экран». Значит, постановочное решение и blank plate были, но готовый dedicated insert инструмент не подтверждён.

Для неподвижного кадра использовать локальный corner-pin/perspective composite на реальную четырёхугольную плоскость экрана. Для движения камеры — трекать плоскость по кадрам либо подготовить отдельный plate с устойчивой геометрией; не рендерить заново всю комнату только ради замены содержимого. Сохранить исходный plate, insert source и финальный composite отдельными версиями с provenance. На экране сохранить рамку/засветку и реалистичный уровень свечения; контент должен быть виден именно из заданной точки зрителя.

## Обязательный порядок перед следующей правкой

1. Сначала определить точную область изменения: sleeve faces, экран или другой объект.
2. Проверить, умеет ли выбранный workflow ограничивать edit пространственно; изучить graph, revision/hash, node bindings и live schema. Не выводить это из названия профиля или prompt.
3. Для геометрически плоского объекта предпочесть отдельный слой и перспективную вставку. Qwen edit использовать только если acceptable full-frame restyling либо mask path доказан.
4. Проверить input, mask, latent и output dimensions; округления к 32 проверять отдельно на каждом уровне. Сохранять оригинальный aspect ratio и не растягивать source.
5. Для маски: один дешёвый изолированный proof; сравнить область вне маски с исходником. Без точной идентичности — отменить этот путь.
6. Просмотреть полный кадр, края вставки и enlarged crop. Проверить качество изображения, читаемость, материалы и физику — schema pass не является visual QC.
7. На глобальной утечке или повреждении отвергнуть job с причиной и больше не переиспользовать тот же graph.

Экранный композит не создан этим документом и генерация сейчас не запускалась. Здесь зафиксированы только текущий статус и предотвращающие правила.

## Инцидент LR-003-KF01: references упомянуты, но не переданы

2026-11-16: output AssetVersion `c30997d3-41ae-4922-b846-761b417ac203` отклонён как identity/prop candidate. При визуальной проверке он показывает generic-вариант героя и дорожный велосипед, не утверждённый образ C01 и не исходный fixed gear. Проверка immutable job `210b6191-4222-4122-8775-a2243bea546f` подтвердила причину: профиль `last-record-qwen-image21-character-sheet-v1`, режим `image-generate`, `plan_json.references=[]`, граф без `LoadImage`. В тексте были слова “Picture 1” и “Picture 2”, но реальные AssetVersion inputs не были переданы. Значит, это не сбой «кратности 32» и не доказанный дефект модели при референсном edit: генерация вообще шла без reference conditioning.

Не использовать output `c30997d3-41ae-4922-b846-761b417ac203` как continuity anchor или родителя следующих jobs. Он сохранён в CAS/Media Pool как rejected lineage. Корректная повторная задача — только с bicycle `a652857d-09bc-4ee0-a045-6fa546a34b77` и выбранным face anchor `34b0b14e-745b-444e-b901-0df6aff4a49a`, привязанными к image-edit узлам 470/471. Перед approval сверить оба ID в job snapshot. Новый job `cd91a21c-7b9a-4256-a698-bf8ecd68cf92` уже содержит обе ссылки и прошёл live schema preflight, но всё ещё ждёт штатного approval; его ещё нельзя считать исправленным визуальным результатом.

## LR-003 workshop keyframe: bicycle geometry rejected

Job `2c69a304-89af-483f-9f00-94683814bd6c` produced AssetVersion `65b7dd03-b19a-46c3-bead-9fbbb8bfb59c` (1376×768). Its workshop doorway, warm cutting-lathe interior and wet route are directionally useful, but the whole keyframe is rejected: the handlebar became road-drop style, the rear drivetrain reads as derailleur/cassette gears, the wheel lettering is pseudo-text, the cage is malformed, and the red carrier appears mounted outside the bag. The user explicitly called the frame wrong. Do not select it or use it as an image parent.

Local inventory still has only one actual bicycle angle: `references/photo/fixedgear-bike.jpeg` / AssetVersion `a652857d-09bc-4ee0-a045-6fa546a34b77`. The 16:9 crop `8c9948df-dbd6-4634-9801-afa92537d9ea` is derived from that same side view, not a second view. User is looking for another real angle. Pause further bike generations until it arrives; use the real bicycle reference, not an AI-invented angle. The workshop/background can be developed independently.

## Уточнение LR-V01 после новых фото (2026-11-16)

Три исходника и их роли:
- `references/photo/fixedgear-bike.jpeg` — главный reference для точной сборки: белая обмотка bullhorn, карбоновое глубокое переднее колесо, серебристый флягодержатель, чёрная fixed-gear рама.
- `references/photo/fixedgear-bike-1.jpg` и `fixedgear-bike-2.jpg` — вспомогательные виды только для геометрии рамы/общего силуэта. Их рули без обмотки и обычные тонкие колёса не переносить.
- `references/photo/LR-V01-bike-reference-board.jpg` — контактный лист с визуально помеченным приоритетом; CAS AssetVersion `3056fdc3-7b44-47cc-9b6e-8a9fa62b0225`, lineage на все три исходника. В двух-image-input профиле подавать board как `prop`, выбранный face anchor как `actor`. В prompt явно повторить приоритет главной панели.

Не генерировать псевдографические надписи на ободе; читаемый brand text оставить только если он достоверно воспроизведён из главного фото, иначе показать маркировку вне фокуса/неразборчивой без выдуманных букв. Для движения проверить fixed hub без кассеты/переключателя; держать руки героя у выноса/обмотанных участков bullhorn в физически возможных местах, показывая отдельно спокойный монтажный план захвата.

## Проп-консистентность LR-V01: QC вывод

Mixed sheet с двумя старыми колёсными конфигурациями нельзя отправлять в генерацию. Dedicated sheet `LR-V01-authoritative-prop-sheet.jpg` (`21054772-2fb8-4dbb-9d24-67ea66bebd79`) и крупный crop (`74ac691b-ea0f-4320-92b3-0ff4f26932d6`) содержат только главный пользовательский кадр и его crops. Даже с ними KF03 изменил переднее колесо, руль и задний узел: оба результата остаются rejected. Причина подтверждена графом, а не предположением: `KSampler` denoise=1. Перед новым bike/rider кадром нужен reference-preserving режим/меньшая сила перерисовки или другой локальный метод удержания геометрии. Никакой дальнейший кадр с велосипедом не считать прошедшим QC без сравнения с основным фото в деталях.

## LR-004-01: H3 Ref2VA создал второго велосипедиста при переходе wide → close

2026-11-16. Оба take отклонены и оставлены без выбранного AssetVersion:

- R1, три image references: job `a4b97004-2c5c-486c-aa87-5c6637a992a0`, output `f06426f8-dcda-4f1d-a062-4f08ecc1044a`, SHA-256 `3e5907856a58dc7619bb85fb5032951228d0ccf7bc54bde79174151415b6656a`. Contact sheet показывает отдельные кадры bike crop в начале, затем дальнего курьера и вторую крупную руку/велосипед на переднем плане. `selected_asset_version_id=null`.
- R2, один continuity reference: job `76decca2-428a-4f73-b785-98f7b759fe38`, output `1e553a71-4797-46a7-af9c-a0ad0c2d441b`, SHA-256 `7290f73ef359d7dda93cb18c46d798d76106e5c332d6c9abb9c4dc3343868c01`. Кадр повторно сохраняет дальнего велосипедиста и добавляет крупную руку/руль/переднюю часть другого велосипеда при попытке push-in. `selected_asset_version_id=null`.
- R2 использовал профиль `last-record-h3-single-continuity-ref2va-v1`, graph SHA-256 `1279678d577407f7a7ac5572b0bdcdf8155fa8fdee359d68ed326171a867a9cf`: один `LoadImage` node 149. Единственная ссылка уменьшила риск показа reference-картинок как вставок, но не решила дублирование при camera reframing из wide source. Single-reference не считать автоматически безопасным.
- Производственный вывод: каждый H3 shot должен сохранять крупность исходного reference или начинаться с отдельного keyframe, уже скомпонованного в нужном масштабе. Не просить непрерывный push-in, который должен превратить полный wide shot велосипедиста в detail того же велосипедиста. Крупности делать самостоятельными jobs и склеивать в NLE; cutaway без человека использовать только если он несёт ясное действие. Для каждого take проверять всю временную последовательность: первый кадр, середину, финал и контактный лист; наличие двух людей/велосипедов в любой фазе — reject независимо от качества остальных кадров.

## LR-C01-ANCHOR-09: braids reference не перенёсся, кадр отклонён

2026-11-16. Job `bbf877c7-53f4-4c51-8f5b-78fdcce2f178`, shot `9b50d3de-d1cf-4b5f-8cfb-0106f6f236c7`, attempt `834fd73a-e16e-4654-9a5f-32bba5d224a4`, output AssetVersion `b229940b-05b4-402b-b02f-09483afed030`, SHA-256 `11bffd0b1e06d494e9b00cdc246d16980dd41a81449a30ecbafe62d8b788587d`. Пользователь отклонил результат: причёска осталась объёмными кудрями вместо коротких scalp-close cornrows из `hero-reference-pexels-7061987.jpg`; лицо и фактура всего изображения стали синтетичнее/пережареннее. Не выбирать этот output, не использовать его как parent/reference и не включать в character sheet.

Причина подтверждена ревизией активного graph `last-record-qwen-image21-hero-braids-transfer-2ref-v1`, revision 1, SHA `f6a28eaedb664202e87b73d406178c72d6bf51ddf5439447340d5683ccc87f3f`: `KSampler` `459:458` имеет `denoise=0.72`; latent проходит через `VAEEncode` `459:482` от полного base image `LoadImage 470`, затем в `KSampler` через активную ветку `ComfySwitchNode 459:468`. В графе нет маски, crop-only edit или пространственного ограничения. Hair reference в `LoadImage 471` передан как второе Qwen image condition, но это не ограничивает изменяемую область. Поэтому workflow перерисовывает весь портрет; schema/preflight и наличие двух референсов не доказывают transfer причёски.

До новой попытки:
- не повторять этот граф с другой формулировкой prompt;
- сначала проверить локальный inpaint/composite path: маска должна включать исходный объём волос и целевую scalp/hairline область, защищая лицо, одежду и фон;
- сделать один изолированный test и сравнить пиксели вне маски с base image; при global drift, сером latent или поломке лица остановиться до production job;
- подавать `hero-reference-pexels-7061987` именно как hair reference (не `6315298`, где кудри); после результата проверять полный размер и крупный crop косичек.

Base AssetVersion `a0634de2-d0c6-45cc-b7c9-5d14bfb20efa` (`ce664384e95dcfc6b96ad67b3937d48da5b6cc6bb5df8ec7954063cd4c0c847c`) больше не использовать как hero identity reference. Character identity sheet не locked.

### Коррекция исходного character reference

Пользователь уточнил: `hero-reference-pexels-7061987.jpg` — это **сам референс героя**, а не только источник причёски. Он задаёт и внешность/лицо, и вплетённые в косички волосы. Предыдущая постановка `a0634...` как base actor + 7061987 как вторичная hair texture была неверной. Больше не переносить причёску с 7061987 на синтетическое лицо и не подавать AssetVersion `a0634de2-d0c6-45cc-b7c9-5d14bfb20efa` как identity reference. Для новых hero jobs основным actor reference должен быть исходный AssetVersion `31ba354f-72fd-4d43-a87e-a8d19477a4b1` (`hero-reference-pexels-7061987.jpg`, Pexels source). Производную копию `ce9df462-b472-4ac7-ae3c-2b7652130f59` не использовать без отдельной проверки содержимого и размеров. `hero-reference-pexels-6315298.jpg` не является референсом этого героя.

### Исправление входов и prompt — LR-C01-ANCHOR-10 (2026-11-16)

Предыдущая рекомендация «не повторять профиль только с правкой prompt» отменена после сверки фактических входов ANCHOR-09: в base slot стоял синтетический портрет, а derivative `ce9df...` был обрезан так, что не показывал волосы. По просьбе пользователя исправлены prompt и reference bindings; профиль повторно использован с корректными входами.

- Job `95100e35-11d6-4b07-b344-b7095c72df05`, shot `7f8b9713-26ed-4d95-8105-eba1e945079c`; approval и execution прошли штатно.
- LoadImage `470` / Picture 1: полный `hero-reference-pexels-7061987.jpg`, AssetVersion `31ba354f-72fd-4d43-a87e-a8d19477a4b1`.
- LoadImage `471` / Picture 2: face/hair crop из того же источника, AssetVersion `62956b9f-84f4-41c8-a680-4c51c47211a6`.
- Profile revision 1, graph SHA `f6a28eaedb664202e87b73d406178c72d6bf51ddf5439447340d5683ccc87f3f`; output AssetVersion `166c8ee6-1af0-4364-aa3e-fbf74914aa36`, SHA-256 `f77adc14e27515ebb07a32acbe645e45191d2d527b36fb5bc1887f7b07b2e8e3`, PNG 2400×3600. Candidate прикреплён к Project Assets и визуально проверен.
- QC: лицо, тон кожи, фактура волос, одежда и кадрирование сохранились близко к source. Это source-anchored identity candidate, почти без художественной переработки; это не готовый character sheet. До job нужно открывать реальные пиксели каждого изображения и проверять, что нужный файл привязан к нужному LoadImage slot.
