> **Архив / предыдущая версия:** Исторические review boards и generated candidates прежнего сценария. Старые Codex-selected trims не равны текущему пользовательскому отбору и не считать материалом новой версии без нового явного выбора.

# User review boards — AI EVERYWHERE / THE LAST RECORD

Статус: подготовлено для первичного пользовательского отбора. **Ни одна строка ниже не означает финальное принятие в клип.** QD-теги `QC-selected-working-trim`, `selected-review-trim` и `selected-take-trim` описывают предыдущую техническую селекцию Codex. Пользовательский shortlist и picture lock остаются отдельными решениями.

## Контактные листы в Media Pool

| Board | Project AssetVersion | SHA-256 | Содержимое |
|---|---|---|---|
| 01 | `59579f42-b5ad-4226-9546-6916be6a5b23` | `955f92f04cf1074195b91e0f92b43bb950bc2c43990127e4df17dfa21bb4f37d` | LR-008-01/04, LR-009-02, LR-010-01/02/03/04; варианты отмечены коротким префиксом AssetVersion. |
| 02 | `5a9b879a-5008-41aa-8dc1-8552aed8ea91` | `67109e7d0da29dc6bd1d9b539168fc6ef118132bb86e7240732d967a8004a36a` | LR-011-01 (2 варианта), LR-011-02, LR-012-01, LR-018-01/02, LR-019-01/02. |
| 03 | `8369daac-36ae-42b5-a761-f819d3a97e35` | `f19f04b97114f3f7db5add6a903fd49b18e0212abef3a48414dfaf63ea881c0d` | Восстановленные точные trims LR-007-03/04/05 и альтернативный LR-008-01. LR-007-04 здесь — padlock на воротах, не велосипедный замок. |

Каждая миниатюра снята из середины исходного video trim. Это только навигация по AssetVersion: она не показывает движение целиком и не доказывает качество действия, continuity, анатомию или техническую корректность. Для решения открыть и проиграть исходный video AssetVersion из Media Pool, проверить первые/последние кадры и движение.

## Video candidates, отображаемые на board

| Shot | AssetVersion | Длительность | Источник/примечание |
|---|---|---:|---|
| LR-007-03 | `7c197ddf-2c40-4ba7-8fa6-4be27ca7647d` | 2.292 s | H3 trim candidate, source frames `[24,79)`. |
| LR-007-04 | `33647a05-05ac-44e7-aea3-0be063143889` | 2.500 s | Gate padlock; user review required. Не путать с отвергнутым bicycle U-lock shot LR-008-03. |
| LR-007-05 | `d9b9a7b0-ec52-4dc5-80de-4a61b021003b` | 2.917 s | Выход от ворот на той же оси; full take проверить. |
| LR-008-01 (A) | `de86c174-b74b-4b8f-b46e-63e0ecaf89be` | 2.917 s | Основной tagged review trim, source `[48,118)`. |
| LR-008-01 (B) | `11ec445c-f407-4be6-b44d-c1b2c63ebb87` | 2.500 s | Alternate source `[48,108)`. |
| LR-008-04 | `92d1b813-8e1d-4032-aa41-907ac922c0d8` | 2.917 s | Low walking/bicycle insert; не доказывает закрытие U-lock. |
| LR-009-02 | `6dc756b5-7788-49dc-a1b4-cde1f7fca307` | 3.333 s | Shop aisle walk-in. |
| LR-010-01 (A) | `23ca8036-dbe2-45bc-9ba5-a9aedd2dc430` | 2.917 s | DJ eye-lift trim candidate. |
| LR-010-01 (B) | `e013d041-357b-4526-9379-e62ea1eac704` | 3.000 s | Alternate trim, compare motion/source handles. |
| LR-010-02 | `a6676046-bec2-4d15-a6bb-260743c10663` | 3.000 s | Courier opens one black backpack; blank mailer not approved cover art. |
| LR-010-03 | `3b871a60-059e-4062-b40a-c398b0921d48` | 3.000 s | Printed sleeve insert; inspect print/hand detail. |
| LR-010-04 (A) | `76d8833f-f6b4-4e38-aede-c6f73207df57` | 3.000 s | DJ places his worn sleeve beside new cover. |
| LR-010-04 (B) | `93f1058c-d720-4a00-b1dd-ba3187f6176a` | 4.000 s | Longer alternate of same take; not a second angle. |
| LR-011-01 (A) | `469d213c-ecbc-4168-8d08-108b49a4103c` | 2.750 s | OTS invitation gesture. |
| LR-011-01 (B) | `4e230b6f-f976-4d37-89c2-96c82405b71d` | 2.000 s | Compact alternate; same source/composition. |
| LR-011-02 | `fb7130ea-e62d-40e4-9e3e-18164047a45e` | 2.833 s | DJ reverse and eye-line shift. |
| LR-012-01 | `22287715-4db1-4394-8b60-887813053ac5` | 2.750 s | Practical projector activation. |
| LR-018-01 | `ada09d15-4766-4dbf-ace3-250f6613474f` | 1.750 s | Wide fixed-gear ride; below preferred 2–4 s, candidate can be lengthened only after source QC. |
| LR-018-02 | `49937331-a41b-4acf-a03e-d0b768f9d959` | 3.000 s | Wide source with subtle post digital push; no physical parallax. |
| LR-019-01 | `65cb15de-638d-4cb7-b7eb-cd9006724d52` | 2.500 s | Low trolley insert crossing the sill. |
| LR-019-02 | `ba303922-2297-456d-ac21-10a28ed01ffd` | 2.500 s | Reaction close-medium at doorway; not a dismount shot. |

## Доступность и восстановление

При подготовке первых двух boards API вернул HTTP 500 для четырёх AssetVersion trims: LR-007-03, LR-007-04, LR-007-05 и LR-008-01 alternate B. До восстановления проверил их SHA-256 и размер по Media Pool manifest и сверил локальные производные с lineage/source. CAS-blob был создан только если соответствующий путь отсутствовал; существующие данные не перезаписывались. Все четыре точных байтовых файла теперь снова отдаются через QD API с теми же AssetVersion IDs и SHA. Board 03 добавлен в Project как derivative `reference`; его parent lineage ведёт на эти четыре video assets.

## Как прислать shortlist

Достаточно указать `LR-xxx-xx` и короткий префикс, напечатанный под thumbnail, например `LR-010-04 / 76d8833f`. По твоему выбору перенесу статусы в shot map, исключу отвергнутые takes из рабочей сборки и пересчитаю монтажные окна. Полные UUID уже указаны выше; можно прислать и только названия кадров без UUID.
