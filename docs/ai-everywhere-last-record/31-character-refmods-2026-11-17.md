# Персонажные RefMod — 2026-11-17

## Источники и решение по входам

Созданы отдельные identity RefMod для двух персонажей нового проекта `8dc7d22f-7e16-426c-b5f8-f897edb692b5`. Входы не смешивались между героями. Новые continuity sheets импортированы в QwenDirector CAS как отдельные AssetVersion с lineage от ранее связанного исходного портрета; ошибочные имена C02-файлов на диске сохранены, а логические имена в CAS исправлены на `LR-C02`.

| ID | Входы | AssetVersion результата | SHA-256 | Размер |
|---|---|---|---|---:|
| `LR-C01` — курьер | 4 обновлённых continuity sheets, точное Pexels 7061987 identity фото, точный hair/braid crop | `669a281b-d013-4d17-aaad-94a402792de1` | `7f4593842882d724f4669d41deb69477315c366ee41253ee2c64470e486f514b` | 3,794,151 B |
| `LR-C02` — DJ | 5 обновлённых continuity sheets, DJ identity base 1536×2048 | `82b07d05-3912-4750-a11b-c0b4ec51d947` | `ad7d38ee9bdc29befe974325ec6f2a1487fcbefaf0c11ee9548dbee172d54656` | 3,370,960 B |

Файлы ComfyUI находятся в `/mnt/AI_FAST/comfyui/models/refmods/QwenDirector/`:

- `qd_14c660ae_0ea9_4b1a_96cb_b306d1258f83_0ddda9f5_d658_420b_b4a0_21de8f69dc5a.safetensors` — C01.
- `qd_3e55596c_bba6_4644_aaf7_05fb8c90f8bb_a95391f3_d721_4561_8e7e_6dfb14fa8486.safetensors` — C02.

Имена на диске намеренно сохраняют QwenDirector job/attempt lineage. В ComfyUI оба зарегистрированы как `QwenDirector/<имя без расширения>`; RefMod library показывает bundle, а встроенная metadata указывает `concept_type=identity`, 7 tensor entries и 7,680 tokens на персонажа. В проекте они прикреплены как reference под логическими именами `LR-C01 · courier identity RefMod · v1 · pending shot QC` и `LR-C02 · veteran DJ identity RefMod · v1 · pending shot QC`.

## QwenDirector execution/provenance

Для локального `refmod-create` создан и проверен candidate профиль `lr-last-record-refmod-create-v1`, revision 1, граф `workflows/h3_refmod_create.api.json`, graph hash `31b89cf733d918a495bd0b2286b671d3ef3eb32f27347be165ddfe8fbe2bab4f`. Runtime schema preflight подтвердил `H3RefModCreateFromFolder` и `VAELoader`. Локальный target: `COMFYUI_URL=http://127.0.0.1:8188`; ComfyUI 0.45.0, PyTorch 2.13.0+cu130, RTX 5090. Очередь перед запуском была пуста; llama.cpp оставался optional/unavailable и не запускался.

- C01: job `14c660ae-0ea9-4b1a-96cb-b306d1258f83`, attempt `0ddda9f5-d658-420b-b4a0-21de8f69dc5a`, plan hash `c2f1b10824d0538f13ed6f18fe7a9cc9eaecd5c4b9e44ee514ad3a12388947ff`, manifest hash `73ea82af33996a856c16f05929ebd4ba88ec214ac6af1396858f305c308f1605`.
- C02: job `3e55596c-bba6-4644-aaf7-05fb8c90f8bb`, attempt `a95391f3-d721-4561-8e7e-6dfb14fa8486`, plan hash `bc91b5d7494c3640beda9a986e2ca978c400a663d3170a42c7d90ea00559472c`, manifest hash `9354951b04c59e2122df3ee640a3fca721a0b20968874a2204415442cdb62b20`.

Оба задания прошли штатную последовательность `awaiting_approval → queued → succeeded`, immutable snapshot, worker lease/fencing и CAS output collection. Во время запуска выяснилось, что durable approval endpoint использовал только volatile in-memory job map. Исправлен только маршрут `/v1/jobs/:id/approve`: при PostgreSQL repository он теперь делегирует `attempts.jobs.approve`, сохраняет обычную запись approval и проверяет plan hash; in-memory поведение оставлено fallback. `.env` дополнен одной локальной настройкой `QWEN_COMFY_REFMODS_ROOT=/mnt/AI_FAST/comfyui/models/refmods`, worker/API перезапущены для применения изменений. Остальные значения `.env` сохранены.

В предпроизводственной сцене есть один пустой C02 setup shot `7990be82-71c0-4cf5-9169-12a9e6c65088`, созданный при неудачном первом вызове с неполной ссылкой на каталог; он не запускался и не содержит output. Рабочий C02 job находится на отдельном shot `2035c4d0-f2b7-4bf9-a47b-36f5549f580e`. Пустой setup record оставлен без удаления и без скрытия истории.

## Проверка и ограничения

- Оба `.safetensors` читаются как валидный safetensors header/JSON metadata, содержат ожидаемые 7 tensor entries; SHA-256 локальных файлов совпадает с CAS.
- ComfyUI `/refmods/library` перечисляет оба bundle.
- QwenDirector project показывает оба результата и входные sheets в Assets/References.
- Execution evidence ставит `reviewStatus=pending-human-review`, `qualityControl=not-performed`. RefMod generation success и валидный контейнер **не доказывают** визуальную идентичность. Следующий содержательный контроль — несколько image/video test shots отдельно на каждого персонажа, затем ручное сравнение лица, hairline/кос, возраста, бороды, одежды и поведения при боковом ракурсе.
- Пользовательские bike refs в `references/photo/` проверены. `fixedgear-bike.jpeg`, authoritative crop/prop sheet/reference board, отдельная carbon-wheel detail и пять телефонных ракурсов дают общий вид и узлы велосипеда: bullhorn с оплёткой, фиксированная цепь, carbon front wheel с надписью DURA ACE, заднее колесо и bottle cage. Несколько файлов — contact/reference boards, поэтому их не подавали как одиночный image input. Новая Qwen Image генерация велосипедного референса не нужна: авторитетными остаются исходные фото пользователя, а генерация здесь могла бы добавить лишние детали.

## Исправление велосипедного набора источников — RefMod v2 candidate

При повторной проверке выяснилось, что первый `LR-V01` RefMod использовал главную фотографию `fixedgear-bike.jpeg`, три новых фото велосипеда и один прежний component reference, но пропустил два новых пользовательских ракурса — заднюю часть велосипеда (`photo_2026-11-17_09-13-58.jpg`) и крупный план DURA-ACE/руля (`photo_2026-11-17_09-14-02.jpg`). Это было упущением при аудите входов.

Оба пропущенных исходника импортированы без изменения в CAS и прикреплены к проекту:

- `photo_2026-11-17_09-13-58.jpg` — AssetVersion `7523fceb-3201-48f9-99ec-e9af8eec2661`, SHA-256 `b62cd48c6fff9b39e82b39996b5db756fbbae8e73b00bce00fa1c10dd08e0143`.
- `photo_2026-11-17_09-14-02.jpg` — AssetVersion `8173ad11-a94c-4ce4-b85e-c3e8f98410fd`, SHA-256 `5ebfcffde4c833adc839ce9b4a12b8c4cadd2c0887d540a8510d9b0edae1d039`.

Создан отдельный RefMod v2 candidate штатным QwenDirector flow; v1 сохранён. Перед запуском `/ready` подтвердил ComfyUI и storage, очередь была пуста, а активный профиль `lr-last-record-bike-refmod-create-v1` прошёл runtime test с graph hash `56e53b7175098c0a8fc16d48cea8f93e0f73a29bd85f031bc93635d22b1c29a7`. Immutable job snapshot содержал пять изображений: авторитетное `fixedgear-bike.jpeg` и четыре различных ракурса велосипеда, включая новые rear-wheel и DURA-ACE/bullhorn detail. Job `dad4c39c-22f5-4ed6-8099-b24141f8f7fa`, attempt `b76d8f27-9b90-4780-b080-7488d1403fc1`, plan hash `5e5063af5a2e9a58fac0735d0c38b71f68aee311bbefc94820ffddf79ae26663`; завершился `succeeded` через штатное approval, lease/fencing и CAS.

- Новый safetensors: `/mnt/AI_FAST/comfyui/models/refmods/QwenDirector/qd_dad4c39c_22f5_4ed6_8099_b24141f8f7fa_b76d8f27_9b90_4780_b080_7488d1403fc1.safetensors`, AssetVersion `c33ef529-0f89-48fa-ae8b-4c29a16f09b1`, SHA-256 `3f98aba4c6878f3bd985f69985410dc2c745264e8f7821d69912587d196ff8c7`, 2,882,259 B, 6 tensor entries, 6,000 tokens.
- ComfyUI `/refmods/library` перечисляет новый bundle `QwenDirector/qd_dad4c39c_22f5_4ed6_8099_b24141f8f7fa_b76d8f27_9b90_4780_b080_7488d1403fc1`.
- Job output прикреплён к новому shot `LR-V01-REFMOD-02 — Revised fixed-gear RefMod with complete user details · v2 candidate`. Контактный preview совпадает с исходной rear-wheel фотографией; это подтверждает корректный первый вход, но **не** качество представления всех компонент внутри RefMod. Manifest остаётся `pending-human-review`; следующий шаг — отдельный test shot с V01 RefMod и визуальная сверка силуэта, буллхорнов, цепи, бутылочного держателя и колеса DURA ACE. Пятый телефонный снимок `photo_2026-11-17_09-14-05.jpg` не включён: его ракурс руля избыточен относительно более информативного `09-14-02`.
