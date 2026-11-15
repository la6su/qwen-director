# AI Everywhere v2 — song / beat map

Версия: 0.1 · Статус: `PROPOSED / UNAPPROVED` · Дата: 2026-11-15
Источники: оригинальная лирика пользователя (`LYR-01…LYR-22` ниже); `/home/la6/AI-Everywhere.mp3`; v22 EDL; машинная exploratory-карта `audio-markers.json`.
Утверждено: длительность мастер-трека 164.520 s; текст оригинальной песни; режиссёрский принцип «из темноты — свет» и открывающий переход «тёмная комната → тёмный экран → один цифровой мир» как starting material.
Непроверено: слова по кадрам/времени, точные вдохи, музыкальные downbeats и границы вокальных фраз. Все показанные интервалы — `GRID_ONLY / UNVERIFIED`.

## song structure / rhythm_curve / progress

`OBSERVED`: master длится 164.520 s. Текущий EDL хранит `bar_grid_bpm=140`, onset autocorrelation `139.85` и approximate phase `0.08 s`; это прежняя оценка, не вокальная разметка. Свежая грубая локальная проверка декодированного master (ffmpeg → mono 22.05 kHz, 20 ms RMS novelty, autocorrelation) неоднозначна: сильные соседние пики около 142.86 и 136.36 BPM; scoring 140-BPM phase дал около 0.025 s, но этот метод не доказывает downbeat. Первый устойчивый сигнал по условному −55 dB RMS threshold около 0.18 s — это не обязательно начало вокала. Значит 140 BPM и исходные 7 окон остаются только `PROPOSED / GRID_ONLY`. 96 тактов при ровно 140 BPM занимают 164.571 s, на 0.051 s длиннее аудио; не растягивать master и не подгонять слова. Ни один downbeat/слог не проверен прослушиванием.

`OBSERVED / MACHINE CANDIDATES`: `scripts/analyze_master_audio.py` локально декодировал master через ffmpeg и собрал 271 spectral-flux peak candidate в `audio-markers.json`. В каждом маркере есть время с hop около 10 ms и эквивалентная координата кадра 24 fps. Они отсортированы и укладываются в длительность аудио. Это только набор точек для последующего прослушивания: модель не классифицирует kick/snare, не подтверждает такт/downbeat и не размечает вокал. В системе не найден локальный ASR runtime/вес; 23 `LYR-*` entries имеют пустые in/out и статус `UNVERIFIED_NO_LOCAL_ASR`. Исходный MP3 не изменён; SHA-256 `5369d3fead4b4c335be16e90d1089f8bc085abe4cb328e1fb5b1a79e40bdc154`.

Повторить анализ на той же машине: `python3 scripts/analyze_master_audio.py --input /home/la6/AI-Everywhere.mp3 --output docs/ai-everywhere-v2/audio-markers.json`. Нужны только уже установленные ffmpeg/ffprobe и NumPy; скрипт ничего не устанавливает и не переписывает аудио.

| Scene / section ID | Working interval | Bars (hypothesis) | Dramatic pressure / rhythm | Lyric IDs | Status |
|---|---:|---:|---|---|---|
| `AE-SC01` Intro | 00:00.000–00:13.714 | 1–8 | Тихое наблюдение → первый телесный выбор; редкие планы, дыхание комнаты | `LYR-01…05` | границы — `PROPOSED`; вокал `UNVERIFIED` |
| `AE-SC02` Verse 1 | 00:13.714–00:48.000 | 9–28 | Любопытство → перебор → неудача/самоповтор → отбор | `LYR-06…12` | `GRID_ONLY` |
| `AE-SC03` Chorus 1 | 00:48.000–01:15.429 | 29–44 | Seed-world из вступления получает выбранную геометрию и полную драматургическую форму | `LYR-13…15` | `GRID_ONLY` |
| `AE-SC04` Verse 2 | 01:15.429–01:49.714 | 45–64 | Скорость и разнообразие превращаются в перегрузку; герой ограничивает выбор | `LYR-16…18` | `GRID_ONLY` |
| `AE-SC05` Bridge | 01:49.714–02:03.429 | 65–72 | Резкое снятие шума; различение эффекта и авторского решения | `LYR-19…20` | `GRID_ONLY` |
| `AE-SC06` Final chorus | 02:03.429–02:30.857 | 73–88 | Синтез отобранных мотивов; не новый каталог, а законченная форма | `LYR-13R…15R` | `GRID_ONLY` |
| `AE-SC07` Outro | 02:30.857–02:44.520 (+ 0.480 hold) | 89–96 + tail | Возврат, физическое завершение работы, короткое эхо | `LYR-22` | `GRID_ONLY`; tail — `OBSERVED` |

### Existing source anchors (`04` contains the complete mapping)

| Scene | v22 EDL segment UUIDs | Source AssetVersion UUIDs | Candidate role |
|---|---|---|---|
| `AE-SC01` | `ed26577b-d002-42f0-8680-a691cd12b401`, `cbb84ed7-2030-47e3-94b0-953328f9ba66`, `06c636a8-fd58-4d34-9201-1d290a7508a1`, `b8302556-18fe-4e02-a0be-6a8f5c71b109` | `56914d01-2f6e-45b7-b543-5613400eaf4b`, `b13419bf-d318-4916-8012-5d7a7b21dbf9`, `126f82b2-b929-4c45-a45f-d6d6fccf691d`, `e25d3622-7bc1-4d82-8764-b68316d740ed` | Accepted opening starting material; preserve room → dark screen → one seed-world. |
| `AE-SC02` | `62b50221-0678-4cd9-9fb3-6173dfa8140e`, `74a4b66b-cf29-4761-8fb3-a3f04349e38b`, `d720ff73-e8e7-47b7-9531-63c2b39446f0` | `f33e89ce-70bd-4c72-bb17-446e20ac978d`, `0ff27109-8b6e-4519-aaa0-dc6de3b72e8b`, `5662b9a5-3d52-4619-bada-aa730ec78be4` | Selection, room return and distinct labyrinth candidates. |
| `AE-SC03` | `88d06077-444a-41dd-9c99-ac5011426896`, `8279e6cb-fe4a-4b09-ae6f-e2af52ad3498`, `caec9807-99ac-4f52-aa8f-97016e3b352e` | `0b2605e3-bb5f-4f20-ac02-d3b15a055b2d`, `d89976dc-0fd6-47f2-a6a9-435c1d4b564a`, `f0d3361f-c313-45ef-9e49-a4a8b9bfe549` | Candidate screen/world and one authored full development. |
| `AE-SC04` | `4ad2b057-09cc-473a-84c9-cfa0bf6ecc6c`, `c3998cf9-e83e-43d1-b375-0cabbbdf07bf`, `340cd335-7bce-4c16-baf2-3a54680f9767` | `24b7cfa2-dcb3-49e6-a9d5-ae77ec71b7b1`, `5b2f78e5-fd10-4d5f-ba78-010edf72e643`, `aee9b39d-8770-4be3-9a0b-c2f4d04eff5e` | Tactile/workstation/identity candidates for overload and choice. |
| `AE-SC05` | `c4cd4455-bd31-4720-bf67-6654458db6a2`, `d7d46898-f421-47c1-a17e-cbf590725ba0`, `ae770358-0134-4db7-beaa-9c7239086aff` | `1d511524-0d2d-4eaa-b35a-aa52c079bc75`, `57666650-976e-47f9-9320-d2125150d881`, `0e6afb55-7707-48d8-a30d-057e1b560470` | Re-edit reflective motifs into a quiet decision. |
| `AE-SC06` | `fe89ed72-cfb5-4dcd-a1a4-49350f340a85`, `e18c547c-6f29-4102-b40c-a3bb0f9699a2`, `59b4315e-3096-4c2f-b5de-9b5c0e1eeb7c` | `83ebabc7-060f-4756-8669-8769286dd38d`, `97596f40-79ae-4b4f-b409-457d0d4af813`, `32d8dfc8-e86d-4790-85f3-8c653eebd305` | Raw world assets; only inherited motifs should remain in final synthesis. |
| `AE-SC07` | `2f553d90-1dc7-422c-836b-b977a0c16eb3`, `357eb721-9819-4912-928e-3c1de4f884b5`, `29c52556-6408-4d2c-a173-46456ad8bc3d` | `dde85ea2-d439-436e-9644-d8acc923e264`, `8060cadc-6f47-44dd-933e-0b30d89c9f41`, `3b1d9a3a-22fa-4ba2-9fc3-a9880f52dd6b` | Return-to-room candidates; late observatory is not automatically retained. |

`progress`: структура секций `partial`; 271 candidate transient markers подготовлены для playback review; lyric phrase-to-time pass `blocked_pending_listen`; downbeat pass `UNVERIFIED` (coarse signal analysis insufficient); generation `not_started_by_design`; no approved picture lock.

## lyrics / units / beats

Текст ниже переписан дословно из пользовательского источника. Beat ID — смысловая/фразовая единица сценарной разработки, не удар музыкальной сетки. Для будущего точного conform нужен прослушивательный проход с waveform/transient marks и отдельными вокальными in/out.

| Unit | Beat IDs | Lyric source IDs | Source phrase (verbatim) | Grid window (approx only) | Musical/editing intention |
|---|---|---|---|---|---|
| `AE-U01` | `AE-B001` | `LYR-01` | `Yeah, yeah` | SC01 / bars 1–2 | Два малых бытовых жеста; тишина комнаты важнее фантастики. |
| `AE-U02` | `AE-B002` | `LYR-02` | `No set, no lens, no green screen` | SC01 / bars 3–4 | Показать реальное отсутствие съёмочной площадки через пустое отражение окна/комнаты. |
| `AE-U03` | `AE-B003` | `LYR-03` | `Still got the whole world on my screen` | SC01 / bars 5–6 | На неподвижном мониторе начинает проявляться один кольцевой seed-world; пока мы остаёмся у порога. |
| `AE-U04` | `AE-B004` | `LYR-04` | `Uh, let's go!` | SC01 / bar 7 | Решение рукой запускает проход камеры через неподвижный экран. |
| `AE-U05` | `AE-B005` | `LYR-05` | `AI everywhere!` | SC01 / bar 8 | Один цифровой мир раскрывается из темноты; без каталога разных городов. |
| `AE-U06` | `AE-B006` | `LYR-06` | `Two A.M., blue glow, rain on the glass,` | SC02 / bars 9–11 | Комнатный холод и окно, но без буквальной иллюстрации дождя, если его нет в фактической погоде/референсе. |
| `AE-U07` | `AE-B007` | `LYR-07` | `Made a whole skyline from a blank canvas.` | SC02 / bars 12–14 | Наблюдаемое создание одного каркасного элемента, не готовый город из воздуха. |
| `AE-U08` | `AE-B008` | `LYR-08` | `No crew in the room, no lights on the street, / But the cars keep moving to a drum machine beat.` | SC02 / bars 15–18 | Сопоставить одиночество комнаты с повторяемым ритмом машин; один направленный экранный вектор. |
| `AE-U09` | `AE-B009` | `LYR-09` | `Chrome on the pavement, camera down low, / One prompt, three seeds, now the whole scene glows.` | SC02 / bars 19–22 | Тактильная низкая деталь → три версии → показать материальный акт сравнения и отказа. |
| `AE-U10` | `AE-B010` | `LYR-10` | `They see the final cut, think it came with a click, / They ain't seen fifty versions just to make that one hit.` | SC02 / bars 23–25 | Слишком быстрый повтор вариантов съедает различия; остановить цикл и сохранить один. |
| `AE-U11` | `AE-B011` | `LYR-11` | `No actors, no extras, no million-dollar stage, / Got a storm in a folder and a world on a page.` | SC02 / bars 26–28 | Материальная папка/распечатка становится рабочим носителем отбора; точные реквизиты уточнить по фото. |
| `AE-U12` | `AE-B012` | `LYR-12` | `Change the lens, change the light, take it frame by frame, / By the time they catch the glitch, I already changed the game.` | SC02 / bars 27–28 (переход) | Осознанная смена точки зрения и света исправляет проблему; строка ведёт в самостоятельный первый мир. |
| `AE-U13` | `AE-B013` | `LYR-13` | `AI everywhere! (Hey!) / AI everywhere! (Whoa!) / All these worlds in my head, / Now they're everywhere I go.` | SC03 / bars 29–34 | Один мир раскрывается четырьмя изменениями дистанции/отношения; не четыре похожих города. |
| `AE-U14` | `AE-B014` | `LYR-14` | `AI everywhere! (Yeah!) / AI everywhere! / No camera on the scene, / But the movie's right there.` | SC03 / bars 35–38 | Впервые экран перестаёт быть ограничением изображения через мотивированный match cut. |
| `AE-U15` | `AE-B015` | `LYR-15` | `Flash, cut, reload, watch the skyline bend, / Build it up, break it down, run the shot again. / AI everywhere! (Hey!) / AI everywhere! / If it feels like the future, / Then we're already there.` | SC03 / bars 39–44 | Сборка/разборка одного мира получает причинность; финальный повтор — результат завершённой конструкции. |
| `AE-U16` | `AE-B016` | `LYR-16` | `Moon in the rearview, got a sun in my hand, / Changed the weather in a second, put a sea on the sand.` | SC04 / bars 45–49 | Три разных оптических состояния; «солнце в руке» — метафора контроля света, не буквальный предмет. |
| `AE-U17` | `AE-B017` | `LYR-17` | `Street turns to glass when I switch the view, / Last frame looked impossible, next one coming through. / My GPU's sweating, but the vision stays cold, / Got a thousand little glitches that I turn into gold.` | SC04 / bars 50–56 | Ускоренный конфликт вариаций; локальный дефект становится выбранным золотым швом после ясного отказа от лишнего. |
| `AE-U18` | `AE-B018` | `LYR-18` | `Everybody wants the prompt, wanna skip to the win, / They don't know the hard part is deciding what stays in. / One foot in the real, other foot in the code, / I can shoot a hundred cities down a single road. / No need to pretend that the machine does it all, / Somebody has to dream it before the pixels fall.` | SC04 / bars 57–64 | Персонаж физически сопоставляет варианты и удаляет/откладывает лишние; цифровое пространство теряет объём до выбора. |
| `AE-U19` | `AE-B019` | `LYR-19` | `What's real? (What's real?) / What's fake? (What's fake?) / Cut through the noise, / Let the whole world shake. / What if? (What if?) / Why wait? (Why wait?)` | SC05 / bars 65–69 | Вопрос-ответ строится на смене реального предмета, отражения и пустоты; монтаж редкий, пауза слышна. |
| `AE-U20` | `AE-B020` | `LYR-20` | `Turn a single frame / Into a whole new place.` | SC05 / bars 70–72 | Один осознанный клик/поворот кадра запускает единственный match cut и готовит финальную форму. |
| `AE-U21` | `AE-B021` | `LYR-13R…LYR-15R` | Final chorus (`LYR-13R…LYR-15R`): `AI everywhere! (Hey!) / AI everywhere! (Whoa!) / All these worlds in my head, / Now they're everywhere I go. / AI everywhere! (Yeah!) / AI everywhere! / No camera on the scene, / But the movie's right there. / Flash, cut, reload, watch the skyline bend, / Build it up, break it down, run the shot again. / AI everywhere! (Hey!) / AI everywhere! / If it feels like the future, / Then we're already there.` | SC06 73–88 | Слова припева возвращаются, но изображение синтезирует мотивы предыдущих выборов. |
| `AE-U22` | `AE-B022` | `LYR-22` | Outro (`LYR-22`): `No camera. (Nah) / No crew. (Nah) / Still got a movie. / Yeah! / AI everywhere.` | SC07 89–96 | Завершённое изображение/файл и физический возврат комнаты. |

## Sync policy

- `OBSERVED`: аудиофайл 164.520 s; coarse onset check неоднозначен и не задаёт надёжный beat grid. `PROPOSED`: 96-bar scaffold при 140 BPM и 7 section windows из пользовательского задания. `UNVERIFIED`: каждое вокальное начало/конец, вдох, ad-lib, transient accent, downbeat phase и соответствие phrase bin сценарию.
- Не сдвигать текст песни и не резать активное слово. До picture lock размечать onset каждого полного phrase, дыхания, snare/kick/hihat акцентов отдельно; затем распределить монтажные события по ближайшему подходящему музыкальному импульсу.
- Формальный lyric subtitle overlay не задан. Текст появится только если отдельная дизайнерская причина будет одобрена; любые надписи должны быть пост-слоем из оригинальной лирики, не генерацией букв моделью.
