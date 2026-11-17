# Аудит визуальных источников по сценам

**Дата:** 2026-11-17. **Статус:** исследовательская подборка для screenplay draft; это не location lock и не approval дизайна кадров. Фото редакционные/авторские и в большинстве случаев `rights-unverified`: сохранены как внутренние справочные материалы; не загружать в production job и не включать в финальный клип без отдельной проверки прав и необходимости.

## Сводная проверка

| Сцена | Что уже есть / добавлено | Что это подтверждает | Оставшийся пробел / следующий шаг |
|---|---|---|---|
| `LR-S01` Закрытие магазина | Sister Ray night facade; Rough Trade East interior; реальный shelf-cover research board; отдельный интернет identity source DJ | ночная экспозиция витрины, shop depth, sleeves, лицо персонажа из отдельного источника | нет принятого вымышленного фасада/интерьера; конкретные закрывающие жесты и графика `CLOSING TONIGHT` остаются сценарием/storyboard, не фактами |
| `LR-S02` Ночной маршрут | пользовательский `references/photo/fixedgear-bike.jpeg` — единственный источник конструкции; существующие night cyclist и alley — только свет/поза/фактура | bike identity и общая ночная физика | правильный bullhorn и fixed gear не брать из веб-фото; дополнительные bike refs создадут риск чужих деталей. Нужны утверждённые camera angles из собственного bike anchor после сценарного lock |
| `LR-S03` Прибытие | Готовый фасадный photo reference `london-record-shop-rough-trade-east-unsplash.jpg`; `london-record-shop-sister-ray-geograph.jpg` — интерьерный ориентир, не фасад; тот же bike anchor | Rough Trade East даёт фасцию, витрину и отдельную дверь; Sister Ray даёт реальную внутреннюю глубину, bins и прилавок | генерировать фотографию вымышленного магазина, используя фасадное фото как image input; не прикреплять spatial plan. Убрать людей, вывески/бренды и читаемый генеративный текст; отдельный establishing storyboard должен оставить байк устойчиво у входа, не на стекле/в дверном проёме |
| `LR-S04` Частное прослушивание | Phonica listening-station photo и безлюдный crop `phonica-turntable-counter-no-face-research-only.jpg`; Capsule tonearm photo; `album-cover-shelves-unsplash-klaus-g-derived-crop.jpg` и `covers-research/` | Есть отдельные источники для настоящей деки/прилавка, меха́ники руки и реальных графических обложек; кроп Phonica исключает лица и людей | фото Phonica использовать только как предметно-пространственный reference, не переносить его толпу, несколько дек, логотип и дневной свет. Сцену снять/генерировать раздельным покрытием: two-shot только с героем и DJ; затем отдельные руки/винил/deck details. На полках выбрать несколько cover plates из `covers-research/`, не генерировать полиграфику. Никаких club booth cues |
| `LR-S05` Эллипсис магазин→клуб | M.O.T. exterior (новый) и alley/night motion refs; M.O.T. лишь кандидат | тип индустриального входа/практического света и монтажного ощущения перехода | нельзя утверждать маршрут или непрерывную географию: адреса не выбраны. Достаточно монтажного эллипсиса, не придумывать поездку DJ |
| `LR-S06` Единственная передача клубного сета | M.O.T. interior + Bunker/club booth examples; turntable handling source | физическая компактность booth и отношение booth↔floor; действие можно покрыть отдельными планами | площадка не выбрана; нужен собственный layout sheet после location lock. Передача позиции только здесь, не в магазине |
| `LR-S07` Ответ зала | Social Records community photo + прежние Matter/Finland sheets | разные реакции людей и разделение слоёв аудитории | веб-фото не доказывают нужную jungle-аудиторию; создать отдельные группы по 2–4 человека с несинхронными микродействиями, затем отдельные реакции DJ из зала. Не просить H3 анимировать толпу одним общим танцем |

## Источники, добавленные в этот проход

Все файлы в `references/visual/last-record/incoming-online/`, помечены `research-only`; источники указаны для поиска и проверки контекста. Размер и SHA-256 зафиксированы. Семь сценовых файлов импортированы в QD Media Pool текущего Project как `reference`, с provenance tags `research-only/rights-unverified` (CC лицензия отдельного Rough Trade кадра сохранена); generation job должна повторно назначать input roles по конкретной задаче.

| Локальный файл | Автор/источник и роль | Размер | SHA-256 |
|---|---|---:|---|
| `mot-exterior-londoner-2025-research-only.jpg` | [The Londoner — M.O.T. venue profile](https://www.the-londoner.co.uk/the-maverick-who-built-london-best-club-venue-mot/). Индустриальная дверь/вход и масштаб, не утверждённая локация | 2000×1500 | `262d16b4cc762ef28b6b8f31bc36d9123165c881b435cce79664d48c82d63362` | `e2c38330-038d-44ac-973d-66bb291c0434` |
| `sister-ray-night-shopfront-editorial-research-only.jpg` | [ON Mag — London record shops](https://www.on-mag.fr/index.php/topaudio/musique/10865-ou-trouver-des-disques-vinyles-a-londres-la-tournee-des-disquaires-de-soho-a-brick-lane). Витрина/свет ночью; не копировать бренд, людей или точный фасад | 1000×705 | `2660ff4b7f13829534ad3a67d1b81ed9e6f9c2198322277db442284081ecaec3` | `73837ef2-224b-466c-ae3e-f6f3a871df42` |
| `phonica-listening-station-jeff-gilbert-research-only.jpg` | Jeff Gilbert, [London photography documentary](https://www.jeffgilbert.co.uk/photography/photo-documentary-london/). Масштаб listening corner; не копировать вывески, личности или несколько дек | 1500×1000 | `fcfdbfdd75e44ff3c0879a7a0c13c169deacd80c9c2569a9ff4956ea70b31fc8` | `e0d7efbd-e569-46ca-9b8e-757758f711bc` |
| `vinyl-cueing-tonearm-capsule-records-research-only.png` | [Capsule Records](https://capsulerecords.co.uk/pages/capsule-connect-calendar). Только ориентир по руке/тонарму; фотограф/права не установлены, действие перед постановкой сверить с выбранной декой | 1654×1654 | `d1781e4d7fd3daf80c6f97980af3a174cef72ad40f7adeee5e603d491663226c` | `c2627eca-488e-4359-95ad-25a727ef9501` |
| `bunker-deptford-floor-timeout-research-only.jpg` | [Time Out — Bunker, Deptford](https://www.timeout.com/london/music/so-youve-never-been-to-bunker). Историческая editorial-фотография; малая booth/floor геометрия и отдельные позы, не конкретное место/люди/свет | 1200×675 | `59eadbb01f9e57988b18fb5d0e426c0a8b62c1ee4c0e7b9331f6dedd33fa8dc9` | `2a84e76c-fd7c-4579-886c-3040328e061d` |
| `social-records-society-community-vinyl-factory-research-only.jpg` | [The Vinyl Factory — Social Records Society](https://www.thevinylfactory.com/features/social-records-society-vinyl-community). Только асинхронные групповые реакции и глубина комнаты | 1000×675 | `52c575c310b85fff490fd4bafcd7c01954abeeabd8d3f46b92b9e69af3e74b88` | `60fbb6e3-5dfd-4f89-a5ce-1f4a3468fa44` |

Кроп Rough Trade East, использованный только как base-layout в первом storyboard job: Nick-D, Wikimedia Commons CC BY-SA 4.0; SHA `58ad2ed6882d6e72f141147b0aa50489030e5dbca8460aa01903c5c55e29cdb2`, QD AssetVersion `15f5a940-8023-4e41-ae18-2a186d88fc99`. Это разрешённый для внутренней адаптации с атрибуцией reference, не финальная локация; перед выпуском учитывать условия CC BY-SA.

Рабочие character-sheet bases (resize с сохранённым aspect, source photo remains available separately):

| ID | Основа / размер | SHA-256 | QD AssetVersion |
|---|---|---|---|
| `LR-C02` DJ | `dj-reference-pexels-8173263.jpg` → `characters/LR-C02-8173263-source/dj-identity-base-1536x2048.jpg`, 1536×2048 | `88c2fee6b27fe25b81a2e2bdd2e7a2174d11f0da9eecae26662498c9df23a283` | `39c0397f-35a1-4076-a29e-8e48775d9b43` |
| `LR-C01` courier | `hero-reference-pexels-7061987.jpg` → `characters/LR-C01-7061987-source/hero-identity-base-1536x2304.jpg`, 1536×2304 | `05faacc944a9db754de6b58fff9ada181dc892a54cf33f230606f86f5577dc8b` | `b77ad375-fa40-49e4-bd43-9113e96d66e7` |

Обе производные — ресайз оригинальной identity-фотографии, а не сгенерированные character sheets. Они стали основами двух QD jobs; результаты и их отбор зафиксированы ниже.

## Результаты генераций и новые референсы — 2026-11-17

Пользователь поручил Codex самостоятельно подтвердить три подготовленные локальные задачи. Approval выполнен штатным `POST /v1/jobs/:id/approve` с неизменёнными `planHash`, actor `codex-user-authorized`, retry budget `0`; jobs завершились через worker, CAS и provenance. Прямого ComfyUI submit не было.

| Shot / job | CAS AssetVersion / SHA-256 | Фактический результат и решение |
|---|---|---|
| `LR-S01-01A` / `e96fce6e-2630-43d3-8d6c-f518597d3fda` | `8c9b0158-2f03-401d-a6d0-410aaccac918` / `abe79b73a42ecd8e7bac202c7af1d4e83c2fb95264bf11183528843c646485d0` | 1376×768. Глубина магазина читается, но output сохранил нескольких людей и вывел постороннего мужчину вместо identity DJ. Пользователь считает кадр в целом неплохим, но хочет поднять качество. Не storyboard lock и не continuity input; оставить как shop-depth candidate, не использовать в сцене. Следующую версию делать после корректировки метода: image-generate с явно связанными референсами или заново проверенный graph, не повторять crowd-base image-edit при низком denoise. |
| `LR-C02` / `2f012813-226c-4f6d-8649-0ce3fdfd6b76` | `4d79b520-7033-4f35-bcf9-0221fd87fdd4` / `55703ffee8b7fdc2babb6dfee46e976ae36f90d110f110a87d3766d85ff87a13` | 1536×2048. Пользователь: «получилось супер». Выбрано как DJ face-detail anchor. Фактический output — крупный одиночный портрет, а не 2×2 angle sheet: хорош для кожи/возраста/лица, волосы и общий вид подтверждать исходным фото. |
| `LR-C01` / `cbc340b1-a80c-4273-9eed-bcff5746d45b` | `51dd8ca8-44fc-4a68-95b2-dacd5b382d93` / `244ca7c622e532aef837e9734c7dc5943d818b97b76bea3dfbea225677d99546` | 1536×2304. Пользователь: «третий с главным героем тоже супер». Выбрано как hero face/wardrobe anchor; короткие плотные scalp-close braids читаются. Фактический output — одиночный портрет, не 2×2 sheet. Hair detail остаётся за оригинальным Pexels 7061987 и его crop. |

Подтверждение двух портретов не доказывает multi-angle identity consistency. Для крупных ракурсов использовать также исходные identity photos; каждый значимый generated take проверять отдельно.

Добавлены три локальных `research-only` image refs; они не связаны в generation jobs и не являются character/location lock:

| Файл | Источник / назначение | Размер | SHA-256 | QD AssetVersion | Ограничение |
|---|---|---:|---|---|---|
| `incoming-online/lucky-seven-closing-shop-interior-research-only.jpg` | The Vinyl Factory, [история Lucky Seven](https://www.thevinylfactory.com/features/lucky-seven-stoke-newington-homage); глубина и визуальная неидеальность закрывающейся независимой лавки | 665×444 | `2e6073432ee3902b8c5e7ad0914ec8e51eabc236fd8152001f258a5ba0f80f36` | `6bde1b9c-d184-4e31-8ad6-8add26bd8771` | Editorial, rights-unverified. В кадре много комиксов/печатных изделий; не источник обложек 12-inch и не production input. |
| `incoming-online/eddie-otchere-metalheadz-dj-research-only.jpg` | Eddie Otchere / Mixmag, [Metalheadz / Grooverider archive photo](https://mixmag.net/feature/jungle-rave-book-photos-photography-reload); близость участников, candid gestures, жёсткая прямая вспышка | 1000×675 | `a0d69b6d6911efc2089de5384909e7c095ff80596c987024a4d22d7435a573e8` | `3d46055d-34a5-4ec7-a749-88326bddcea7` | Авторское/editorial, rights-unverified. Не использовать показанных музыкантов, граффити или точный интерьер. |
| `incoming-online/eddie-otchere-metalheadz-duo-research-only.jpg` | Eddie Otchere / Mixmag, [Storm & Kemistry archive photo](https://mixmag.net/feature/jungle-rave-book-photos-photography-reload); музыкальная сосредоточенность и индивидуальные взгляды | 1000×687 | `71a47f502e619ce04d6af208d5bf69546b1dee52eb2107af070da920c02e2f05` | `4ee35814-f903-426c-918d-9460c524ac19` | Авторское/editorial, rights-unverified. Не character reference; двойная экспозиция и тёплый flash не копировать буквально. |

Три дополнительных Unsplash-кандидата открыты и визуально отвергнуты: один London cyclist снят при сером дневном свете на generic bike, две crowd фотографии выглядят как bright EDM / большая синхронная масса и конфликтуют с компактным raw jungle финалом. Они не добавлены в reference bundle и не попадут в prompts.

## Identity-проверка персонажей

- `LR-C01`: оригинальное фото Pexels `7061987` остаётся identity authority героя. Велосипед — отдельный asset; лицо и детали собранного велосипеда не смешивать в одном слабоконтролируемом референсе.
- `LR-C02`: использовать локальный оригинал `incoming-online/dj-reference-pexels-8173263.jpg` как новый identity source пожилого DJ (лицо/возраст, не костюм, тело, магазин или актёрское действие). Точный путь есть, но этот аудит не подтверждает наличие файла в активном Media Pool или художественное утверждение character sheet.
- Сгенерированный ранее anchor `c9c7e1a6-70db-4aac-b9fc-066abeb69de0` не использовать как источник внешности нового персонажа до отдельного подтверждения; он не заменяет исходное интернет-фото.

## Контакт-листы

- [Акт I](../../references/visual/last-record/acts/act-1/reference-board-act-1.jpg): фасад, interior depth, реальные sleeve refs.
- [Акт II](../../references/visual/last-record/acts/act-2/reference-board-act-2.jpg): listening setup, cueing mechanics, sleeve refs.
- [Акт III](../../references/visual/last-record/acts/act-3/reference-board-act-3.jpg): индустриальный фасад-кандидат, booth scale, разнохарактерная аудитория.

## Production consequence

Подбор закрывает визуальную исследовательскую нехватку для текущей разбивки. Он не закрывает storyboard, точную сценографию или утверждение площадок. Следующий артефакт после screenplay/storyboard approval — собственные location/prop sheets, собранные из выбранных независимых признаков с точной осью и географией; затем по каждой сцене — небольшие тестовые кадры и QC. Не вставлять исследовательские фото в image-edit references автоматически: выбирать один конкретный reference role под задачу и проверять влияние на идентичность/композицию.

### S05–S07 update — M.O.T. remains a research candidate (2026-11-17)

Current web check finds M.O.T. listed at Orion Business Centre, Surrey Canal Road, SE14 5RT, with ongoing event listings; RA search results include a jungle listing for 20 Nov 2026. This supports current operation and genre relevance, not location approval or production access. Local exterior image `mot-exterior-londoner-2025-research-only.jpg` is a daytime service/backstage passage, not a proven public entrance; do not use it as the film’s club-front establishing or imply the camera sees the actual entrance. Use its industrial service-yard texture only. The interior reference may inform a fictional room, but the storyboard must establish one coherent entrance, dancefloor, DJ booth and exit with a single camera axis. Sources: [Resident Advisor venue page](https://ra.co/clubs/156290), [Drop The Bass venue description](https://dropthebass.co/venues/mot), [The Londoner photo essay](https://www.the-londoner.co.uk/the-maverick-who-built-london-best-club-venue-mot/).

