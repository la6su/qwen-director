# Музыкальная карта и предварительный cue sheet

**Master:** `references/audio/AI_EVERYWHERE_MUSIC_CONFORM_KIT_v1/AI-EVERYWERE(1).MP3`  
**Статус:** Audio Conform Candidate v1, принят как рабочая музыкальная разметка; **не** locked lyric spotting и **не** финальная DAW-сетка. Сюжетные функции ниже относились к сценарию `23-scenario-review-draft.md`, который пользователь отверг целиком; не переносить их в новый сценарий. Акустические окна и candidate markers можно использовать после подтверждения, что активный монтажный master остаётся этим файлом.  
**Редакционная политика:** 2–4 секунды — ориентир для большинства планов, не жёсткая длительность: короткие перебивки и более длинные планы разрешены, когда работают музыкально и драматически. Кандидатные маркеры помогают выбирать склейки, но не диктуют сетку. Не резать на каждый удар автоматически.

## Источник и проверка

Оба файла — `references/audio/AI-EVERYWERE.mp3` и `references/audio/AI_EVERYWHERE_MUSIC_CONFORM_KIT_v1/AI-EVERYWERE(1).MP3` — сейчас присутствуют и побайтно совпадают: SHA-256 `8192c5f66a3e18993459522842760ade7335dccdb97cab0d276aaa3d0976865d`, 2,508,223 bytes. `ffprobe` подтвердил MP3, 44,100 Hz, stereo, 156.760813 s, 128,002 bit/s. Hash совпадает с ранее импортированным master AssetVersion; файлы не изменялись в этой проверке.

- Визуальная карта пользователя: [music-map.png](../../references/audio/music-map.png), 1690×889; показывает waveform/RMS, onset novelty и спектрограмму. Она помогает видеть плотность, но сама по себе не подтверждает слова или доли.
- Аналитическая карта kit: [AI_EVERYWHERE_rhythm_dynamics_map.png](../../references/audio/AI_EVERYWHERE_MUSIC_CONFORM_KIT_v1/AI_EVERYWHERE_rhythm_dynamics_map.png); RMS/LUFS proxy, низкочастотная энергия и кандидаты на переходы.
- Полный исходный документ: [AI_EVERYWHERE_Codex_MUSIC_CUE_SHEET_v1.md](../../references/audio/AI_EVERYWHERE_MUSIC_CONFORM_KIT_v1/AI_EVERYWHERE_Codex_MUSIC_CUE_SHEET_v1.md). Исходные CSV/JSON сохранены без изменений.

## Темп и точность

Kit сообщает tempo hypothesis около **166.50 BPM** по autocorrelation/совпадениям перкуссионных атак: четверть ≈0.3604 s, 4/4 bar ≈1.4414 s, 2 bars ≈2.8828 s. Это лучше согласуется с предоставленным анализом, чем ранее упоминавшиеся 164 BPM, но всё ещё гипотеза: первый бар, downbeat phase, микросдвиги и локальный drift не подтверждены DAW-прослушиванием. Маркеры HIT/CUT-HIT взяты из спектральных атак моно-суммы с разрешением порядка 23 ms; они не гарантируют snare, downbeat или границу слова. TC округлён к ближайшему кадру 24 fps и при conform может требовать сдвига на 1–3 кадра.

В раннем brief приводился текст лирики, но пользователь сообщил, что тогдашний трек был не тем и заменил мастер; поэтому прежний текст **не считать каноническим** до ручного сопоставления с этим MP3. Пословные onset/offset не подтверждены; точные слова и тайминг остаются `UNVERIFIED`. 01:39–01:59 — подтверждённое по карте разрежение/перестройка аранжировки, но конкретные слова и эмоция вокала остаются `UNVERIFIED`. Финальный плотный участок — преимущественно инструментальный jungle с fills/ad-libs по Candidate v1; вручную сверить и не называть его автоматически припевом.

Пользовательский kit содержит 40 отобранных editorial cue candidates, 109 приблизительных bar starts и 55 математических двухтактовых отметок. Независимый локальный spectral-flux scan (`audio-transients-candidates-new.json`) на том же hash выдал 332 transient candidates. Эти списки получены разными методами и не подтверждают друг друга как музыкальную сетку; никакой из них не является ASR, downbeat detector или финальным cut list.

## История по музыкальным секциям

Длительности и акустические наблюдения ниже принадлежат предоставленному candidate kit. Функции ниже соответствуют текущему сценарию для пользовательской редакции; точное действие и стыки ещё могут измениться после review и ручного conform. Не читать таблицу как locked shot list.

| Блок | Окно audio, s | Динамическое наблюдение из kit | Функция текущего story draft (не утверждена) | Монтажный принцип при плане 2–4 s |
|---|---:|---|---|---|
| S01 | 0.000–10.147 | Spoken opening, sparse impacts | Начать с закрывающего магазин DJ, затем кратко перебить движением героя; короткий counterpoint закрытие / дорога | 2–4 секунды как ориентир; монтаж может использовать короткие перебивки, если движение/форма связывают их |
| S02 | 10.147–33.158 | Вход groove и нарастание плотности | Начало ночного движения к магазину; представить райдера, велосипед и направление | Смена масштаба и среды мотивирована действием; один ясный план движения внутри череды деталей |
| S03 | 33.158–56.192 | Groove становится сильнее; локальный спад около 53.313 | Ночной маршрут набирает масштаб и скорость; не добавлять искусственное препятствие | Варьировать крупности/вектор, использовать спад как дыхание, не как обязательную смену локации |
| S04 | 56.192–79.273 | Плотный syncopated groove; акценты 64.853 и 74.931; mini-break 75.651 | Читаемый фасад; герой оставляет велосипед у входа и входит | Вывеска/витрина → интерьерная ось → взаимодействие; сильные акценты не требуют автоматической склейки |
| S05 | 79.273–98.731 | Энергичный участок до breakdown-in | Герой просит о личном прослушивании; DJ соглашается, но остаётся на своей позиции. Здесь нет передачи деки | 2–4 s; чередовать фасад/интерьерную ось и реакции, не повторять однотипные планы вертушки |
| S06 | 98.731–119.188 | Разреженный/broken middle, отдельные акценты; pre-drop 118.329 | Частное прослушивание; давнее знакомство плюс услышанный трек убеждают DJ передать пост преемнику. Pre-drop может подготовить эллипсис к клубу | Сдержать склейки, но держать планы обычно 2–4 s; не ставить hand-off в магазине |
| S07 | 119.188–153.763 | Высокоэнергичный jungle instrumental и fills | DJ передаёт свой последний назначенный выход, уходит из DJ-сцены; герой берёт пост и ведёт зал музыкой | 2–4 s как средний ориентир с короткими inserts и паузами; установить клубную географию, выделить передачу, уход и асинхронные реакции |
| S08 | 153.763–156.761 | Финальная перкуссия и затухание | DJ уходит в ночь, герой остаётся вести зал; финальный образ подтверждает передачу поста | Финал следует музыкальному хвосту; длительность экспорта — реальная длина master, без подрезки |

## Candidate cue points

Точные исходные секунды и TC перенесены из `AI_EVERYWHERE_scene_and_accent_cues_24fps.csv`. Время — аудио-кандидаты для монтажа, не утверждённый picture EDL.

| ID | Время, s | TC 24 fps | Событие | Уверенность | Предложенное применение |
|---|---:|---|---|---|---|
| CUE-001 | 0.000 | `00:00:00:00` | START | dry opening / spoken voice; establish first image | high | Let the opening composition register; exact image order remains subject to the scenario review |
| CUE-002 | 10.147 | `00:00:10:04` | INTRO-HIT | prominent sub/percussive accent / intro opening | high | Candidate for the first major visual transition or in-frame movement; do not pre-assign a workshop cut |
| CUE-003 | 11.587 | `00:00:11:14` | GROOVE | strong, clean percussive strike; rhythmic hook | high | Start rhythmic journey coverage in 2–4 s plans; maintain geography |
| CUE-004 | 17.345 | `00:00:17:08` | GROOVE-HIT | pronounced drum accent | high | punctuation / detail insert |
| CUE-005 | 19.853 | `00:00:19:20` | VERSE-FLOW | marked drum hit in early driving section | medium | possible shift to courier movement; check vocal phrase edge |
| CUE-006 | 22.988 | `00:00:23:00` | CUT-HIT | drum accent within early section | medium | hands / prop insert; maintain matching motion |
| CUE-007 | 28.909 | `00:00:28:22` | TEXTURE | lighter accent; weaker structural signal | low | reaction or shot-length contrast; do not force a cut |
| CUE-008 | 33.158 | `00:00:33:04` | ENERGY-UP | notable shift from restrained into stronger groove | high | Candidate for a consequential action/reveal if the approved story places one here |
| CUE-009 | 39.915 | `00:00:39:22` | PHRASE | weak hit near a musical continuation | low | story action, do not force scene boundary |
| CUE-010 | 43.654 | `00:00:43:16` | BASS-PUSH | percussive accent near a stronger bass block | medium | new shot family / location reveal if story motivates it |
| CUE-011 | 51.873 | `00:00:51:21` | CUT-HIT | strong beat within full groove | high | action cut at a completed phase; detail -> medium or wide only if geography stays clear |
| CUE-012 | 53.313 | `00:00:53:08` | ENERGY-DIP | sharp transient near a short energy pullback | high | visual breath before renewed action |
| CUE-013 | 56.192 | `00:00:56:05` | ENERGY-RETURN | groove comes back strongly | high | hard cut into new action or shot variation |
| CUE-014 | 59.095 | `00:00:59:02` | CUT-HIT | solid snare/percussive marker | high | match on action or new angle |
| CUE-015 | 64.853 | `00:01:04:20` | CUT-HIT | reliable strong beat | high | insert or moment of decisive action |
| CUE-016 | 66.688 | `00:01:06:17` | GROOVE-PUSH | texture / low end changes, beat continues | medium | intensify shot cadence, not arbitrary location change |
| CUE-017 | 74.931 | `00:01:14:22` | DRUM-ACCENT | strong late-section rhythmic event | high | rapid 2–4-shot series start or climax build |
| CUE-018 | 75.651 | `00:01:15:16` | MINI-BREAK | local energy pullback after strong accents | high | short hold or cut to reaction |
| CUE-019 | 79.273 | `00:01:19:07` | GROOVE-RETURN | rhythm returns with strong transient | high | new action / stronger tempo |
| CUE-020 | 85.751 | `00:01:25:18` | CUT-HIT | strong drum accent | high | tight change of scale, keep action direction; retain 2–4 s plan length |
| CUE-021 | 87.911 | `00:01:27:22` | CUT-HIT | clear transient | high | close-up / physical detail |
| CUE-022 | 90.070 | `00:01:30:02` | PUSH | strong rhythmic accent in dense run | high | optional stronger angle switch |
| CUE-023 | 98.731 | `00:01:38:18` | BREAKDOWN-IN | noticeable low-end drop and rhythmic restructuring near 1:39 | high | Candidate for a change from kinetic coverage into a decision/relationship scene; exact scene waits for story approval |
| CUE-024 | 105.256 | `00:01:45:06` | BRIDGE-HIT | isolated strong accent within sparse sequence | high | one deliberate image; leave space to hear the vocal |
| CUE-025 | 106.696 | `00:01:46:17` | BRIDGE-HIT | sharp hit while arrangement is sparse | high | reaction or hands close-up; avoid frenetic cutting |
| CUE-026 | 111.247 | `00:01:51:06` | BRIDGE-HIT | spaced accent | medium | character-to-object visual exchange |
| CUE-027 | 114.707 | `00:01:54:17` | BRIDGE-BUILD | isolated accent before the final return | high | Candidate for DJ's decision/closing action; do not assign a needle drop or exact gesture without manual conform |
| CUE-028 | 118.329 | `00:01:58:08` | PRE-DROP | low intensity transitional beat | medium | Candidate to establish club geography before the return; not a forced cut or handoff frame |
| CUE-029 | 119.188 | `00:01:59:05` | FINAL-DROP | energetic percussive return after sparse middle | high | Candidate for the single physical booth handoff and visual expansion; shop invitation is already decided and is not repeated |
| CUE-030 | 125.341 | `00:02:05:08` | JUNGLE-HIT | prominent jungle accent | high | rhythmic montage in 2–4 s plans; group accents into coherent action phrases |
| CUE-031 | 128.244 | `00:02:08:06` | JUNGLE-HIT | prominent drum accent | high | visual match cut / change of shot scale |
| CUE-032 | 131.146 | `00:02:11:04` | JUNGLE-HIT | prominent drum accent | high | change visual sub-theme within justified sequence |
| CUE-033 | 134.026 | `00:02:14:01` | JUNGLE-BREAK | brief bass/drop contrast and prominent drums | high | short visual reset or major match-cut |
| CUE-034 | 137.671 | `00:02:17:16` | JUNGLE-HIT | rhythmic accent | high | action continuation, spatial vector consistency |
| CUE-035 | 141.990 | `00:02:22:00` | JUNGLE-RETURN | dense section launches after preceding gap | high | another high-energy showreel phrase |
| CUE-036 | 145.241 | `00:02:25:06` | LATE-HIT | accent in closing high-energy block | medium | sync insert / extreme close-up |
| CUE-037 | 149.954 | `00:02:29:23` | ENDING-FILL | marked rhythm near ending fill | high | last crescendo: 2–4 s cuts in a brief rising phrase, then release |
| CUE-038 | 153.763 | `00:02:33:18` | FINAL-PUNCTUATION | last discernible hard accent before fade tail | medium | final action / insert / match back to record |
| CUE-039 | 154.700 | `00:02:34:17` | FADE | decaying audio; no stable full groove | high | end picture on held visual or decisive cut |
| CUE-040 | 156.761 | `00:02:36:18` | END | actual end of MP3 | high | End picture at the actual master boundary; use the final resolved action/hold, not a default extra black frame |

## Черновой монтажный conform и оставшиеся проверки

Пользовательская текущая актовая гипотеза уточняет драматургию, не меняя найденную акустическую карту: вся разреженная зона `98.731–119.188 s` (≈20.46 s) содержит частное прослушивание, решение DJ и эллипсис к клубу. Рабочее редакторское разбиение: личный play/реакция `98.731–114.707 s` (≈15.98 s), затем закрытие магазина и клубная география `114.707–119.188 s` (≈4.48 s). Это не измерение точных cut points. Герой сам ставит пластинку на listening turntable; DJ остаётся на месте и слушает. **Передачи деки в магазине нет.** Кандидаты `105.256`, `106.696`, `111.247` помогают выбирать реакцию/деталь, но не требуют отдельной склейки каждый раз.

`118.329 s` (CUE-028, pre-drop) — кандидат для монтажного эллипсиса от выхода из магазина к уже начавшемуся клубному сету. `119.188 s` (CUE-029, energy return) — главный кандидат, чтобы DJ уступил герою свой уже назначенный клубный выход. Предложение: действие hand-off занимает самостоятельный 2–4-секундный клубный план, а не дублирует магазинное прослушивание; точка действия может лечь на drop внутри плана. Все эти маркеры требуют ручной сверки в NLE и не задают точную вокальную синхронизацию.

Участок `119.188–153.763 s` (≈34.575 s) позволяет ориентировочно 9–17 монтажных планов по пользовательскому ориентиру 2–4 s; это диапазон длительностей, не обязательное количество. Клуб начинается уже как существующее событие: люди двигаются с разной интенсивностью, затем откликаются на трек героя не одновременно. Крупность, реакцию, ось и направление менять по действию; не резать механически на каждый кандидатный transient. Старые музыкальные блоки S01–S08 — сегментация исходного kit, а не драматургические акты.

Перед EDL: вручную прослушать весь master и проверить вокальные входы, actual downbeat/phase, возможный drift, переход soundtrack→diegetic vinyl (если он выбран), cue-point частного play и самый последний звук. Радио/эфир не вводить: record shop не является радиостанцией. Звуковой мост через винил может быть только визуальным source reveal — исходный MP3 остаётся непрерывным, без старта заново, остановки, растяжения или замены. Если needle drop около breakdown не совпадёт с фактическим звуком или этот приём не будет выбран, оставить master non-diegetic и не изображать поздний старт иглы как источник уже звучащего фрагмента. Сумма picture-отрезков должна покрывать мастер; picture fade/black выбирается по музыке, файл не обрезать. Все timing поля остаются candidate до ручной проверки.


## Sound perspective: два монтажных варианта

Исходный MP3 хранится неизменным и не перезапускается иглой. Для storyboard/assembly сравнить:
1. **A — continuous score:** исходный master непрерывно закадровый, как уже принято.
2. **B — club perspective:** тот же музыкальный материал получает плавно введённую room perspective в клубной кульминации (пространственные отражения/фильтрация/дистанция), без ложного старта с нуля. Если драматургическому моменту нужно больше времени, отдельно подготовить копию timeline с аккуратным продлением подходящего инструментального участка/хвоста; это не изменение исходника, а пользовательский монтажный вариант.

Пока длительность клипа остаётся по оригинальному мастеру 156.760813 s. Если пользователь утвердит продление, аудиоокна и EDL пересчитать заново; текущие cue timecodes тогда будут привязаны к source, не к окончательной монтажной длине. Ни один вариант не выбран окончательно.
