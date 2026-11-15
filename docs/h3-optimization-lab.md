# Лаборатория оптимизации MiniMax H3

Источник: предоставленная транскрипция ролика «Master MiniMax H3: 10x Faster, Low VRAM & 2K Resolution | ComfyUI Workflow». Настройки из ролика считаются гипотезами до локального A/B.

## Кандидаты

| Профиль | Изменение | Ожидаемый эффект | Риск |
|---|---|---|---|
| `h3-ref2v-draft-4step` | текущая Ref2V Turbo 4-step | минимальная latency | глянцевая кожа, артефакты движения |
| `h3-ref2v-quality-8step` | совместимая Ref2VA 8-step LoRA | лучше texture/identity при умеренной latency | нужна именно Ref2V LoRA и совместимый UNet |
| `h3-attention-sage` | Sage Attention | быстрее и меньше VRAM | custom node/GPU compatibility |
| `h3-attention-hybrid` | Sage на первых блоках, Soul на последующих + Block Cache | дополнительное ускорение | Soul нестабилен, меняет вычислительный граф |
| `h3-latent-upscale` | low-res base → latent upscale → короткий denoise | высокое разрешение при меньшем времени base pass | high-res latent всё равно занимает VRAM, temporal artifacts |

## Правила эксперимента

Каждый кандидат — отдельный immutable workflow profile/revision. В A/B фиксируются один и тот же prompt, seed, Picture/Audio references, width/height, length и output codec. Сохраняются latency, peak VRAM, identity, motion consistency, texture, flicker и audio sync.

Профиль не становится quality-default по одному удачному запуску. Минимум три повторения на целевой GPU и ручная проверка кадров/видео. Если меняется тип режима (FL2V ↔ Ref2V), это не A/B одной задачи, а отдельная capability-линейка.

## Карточка контрольного прогона

Для каждого запуска сохраняем в manifest:

```text
profile_id / profile_revision / graph_hash
workflow_mode (ref2v | fl2v)
loras + model digests
prompt_hash / seed / reference_asset_version_ids
width / height / length / fps
wall_time_ms / peak_vram_mb / output_sha256
identity / motion / texture / flicker / audio_sync (1–5)
operator / decision (keep | reject | investigate)
```

Сравниваются только строки с одинаковыми входными параметрами и одним `workflow_mode`. Любое изменение LoRA, UNet, attention или cache создаёт новую revision и новую карточку.

## Текущий статус

- В PVE обнаружены совместимые кандидаты `MiniMax-H3-Ref2VA-Acc-8Step.safetensors` и `MiniMax-H3-FL2VA-Acc-8Step.safetensors`, а также текущая Ref2V Turbo 4-step. 8-step FL2VA и 8-step FL2V нельзя смешивать с неподходящим workflow boundary.
- Sage/Soul/Block Cache и latent-upscale ноды в PVE не инвентаризированы и не устанавливаются автоматически.
- Инвентаризация PVE 2026-09-10 обнаружила `MiniMaxH3MemoryEfficientSageAttentionPatch`, `EasyCache`, `LazyCache`, `LatentUpscale` и `LatentUpscaleBy`. Soul Attention в `/object_info` не обнаружен.
- Наличие ноды не доказывает совместимость с текущим H3-графом: сначала импорт отдельного workflow, затем preflight и короткий mock/real smoke на целевой GPU.
- Следующее действие для quality: зафиксировать digest `MiniMax-H3-Ref2VA-Acc-8Step.safetensors`, импортировать отдельный Ref2V workflow profile с этой LoRA, выполнить preflight и провести три парных A/B-прогона на одинаковых входах.

## Синтез аудита практик MiniMax H3 (2026-11-14)

### Рекомендуемая схема производства

| Этап | Решение для QwenDirector | Основание / ограничение |
|---|---|---|
| Планирование и драфт | Сохранять текущий provisional Ref2VA INT8 pruned + Pika Flex как отдельный профиль. Локальный `video_pika_h3_flex_ref2va.json` рендерит 1344×768 (~1.03 MP). Генерировать шоты/сегменты независимо и хранить draft до ручного решения. | Это уже имеющийся baseline. Переход на 0.5 MP не нужен без A/B; он может уменьшить мелкий объект до нестабильного числа пикселей. |
| Монтаж длинной сцены | Передавать сегменты как отдельные QD shots/jobs, хранить исходные frame offsets и reference lineage. Пробовать 124 или 192 кадра (5.17/8 с) как управляемые длительности там, где действие допускает разрез; сохранять overlap отдельно от чистой длины. Экспортировать сегменты независимо и монтировать в NLE. | Timeline v5 parser уже строит shot proposal. Длинные 362-кадровые сегменты не дробить автоматически: это изменит авторскую фазу и требует review. 22 кадра — стартовая настройка, не оптимум для каждого движения. |
| Необязательный 2K finish | Отдельная ветка после принятого draft: encode → 3D latent upscaler → Open-H3 re-noise/refine → сохранить refined latent → decode. Для чувствительных к идентичности кадров оставить draft/обычный апскейл альтернативой и сравнить кадры до/после. | Это генеративное восстановление деталей, а не нейтральное масштабирование: возможен drift лиц, орнаментов, логотипов и текста. `start_sigma=0` в установленном NVIDIA recipe означает штатную release-сетку, начинающуюся около 0.909; это не слабая доводка. Локальная документация Open-H3 сообщает, что `0.8` держит результат ближе к draft, но это другая sigma-сетка и компромисс по деталям. |
| Recovery / VRAM | Всегда ставить локальную `OpenH3SaveRefinedLatent` перед тяжёлым decode в экспериментальном 2K графе; хранить latent как промежуточный артефакт с provenance. Запускать короткий 5-секундный тест на RTX 5090 и измерять фактический peak VRAM, RAM и decode latency. | Save Latent позволяет повторить decode после OOM/сбоя; он сам по себе не уменьшает пик памяти. Установленный plugin README приводит 45 GB peak для 15-секундного 2K fast decode на 72-GB карте; 32-GB RTX 5090 не следует считать проверенной для полного 15-секундного пути. |
| Далёкие лица / мелкие детали | В дальнем плане предпочитать силуэт, контровой свет, профиль/спину и foreground occlusion; важную мимику выносить в отдельный крупный план и планировать отдельное восстановление лица только после A/B. | Режиссёрская страховка полезна независимо от конкретного sampler. FACE/VOSR nodes/версии и их качество надо проверить на выбранном локальном наборе, а не подразумевать из наличия имени node. |

### Что установлено локально

- ComfyUI 0.45 содержит native H3 и `MiniMaxH3LatentUpscaleWithModel`; установлены `ComfyUI-Open-H3-Regenerate` commit `9b686c5`, `Comfyui_Minimax_h3_latent_Upscaler`, upscaler weights и локальные Open-H3 r128 / Sharp curve веса. Есть `OpenH3SaveRefinedLatent` и `MiniMaxH3SaveLatent`. Значит, отдельный local finish workflow технически можно исследовать без облачного вызова или скачивания новых весов.
- `MiniMaxH3DirectorSelfLift`, `MiniMaxH3DirectorFaceRefine`, `SolAttnPatch` и `BlockSparseAttention` присутствуют в `/object_info`; Singularity Ref2VA модели тоже лежат локально. Это наличие, не quality verdict. Veta/VSA node в текущем `/object_info` не обнаружен.
- Проверенный Pika Flex Ref2VA workflow использует Pika Ref2VA LoRA 1.0 и 1344×768. В существующем 2K локальном workflow видна иная экспериментальная компоновка; её нельзя принимать за валидированный QD profile без точного graph/schema audit.

### Что из предоставленного аудита не становится правилом по умолчанию

- 0.5–0.6 MP как универсальный минимум draft, обязательные 8–12 шагов для чистого звука, превосходство Pika по количеству сцен, точная потеря качества от каждой перегонки, 50–60% цена VRAM cleanup, диапазоны для Veta/VSA/SoL и строго английский язык для отсутствия цветных артефактов — это наблюдения отдельных workflow/video, без предоставленных исходных роликов, материалов сравнения и повторяемых локальных прогонов. В QwenDirector они могут стать тестируемыми гипотезами, но не preflight запретами.
- Hosted MiniMax H3 Regenerate-to-2K и локальный NVIDIA Open-H3-Regenerate-2K — разные пути. Hosted node отправляет готовый 768P клип в MiniMax job; open pipeline использует локальные открытые веса и повторный diffusion pass. QwenDirector оставляет cloud path выключенным по local-first контракту.
- Open-H3 refiner объединяет собственный refiner с FL2VA Turbo и LMS Sharp. Его нельзя подключать поверх Pika Flex как ещё одну LoRA. Корректный кандидат — самостоятельный второй workflow/profile, отдельный от Pika draft.

### Минимальный честный A/B для локального finish

Использовать один принятый 124-кадровый 1344×768 Pika draft с теми же prompt, seed и references. Сравнить draft и локальный Open-H3 outputs при release sigma (0), затем ближний к draft sigma (0.8); отдельно сохранить один identity-sensitive интерьерный дубль с текстом/узором и один кадр с малой фигурой. Записать peak VRAM/RAM и время отдельно для encode/upscale/refine/decode. Сначала — 5 секунд, RTX 5090, один job, без параллельной нагрузки. Acceptance: движение и монтажные границы не ломаются; нет новых/изменённых объектов в важных инвариантах; аудио совпадает или его сохранение явно назначено; восстановление decode из сохранённого latent работает. Это предложение эксперимента, а не уже выполненный тест.

Источники для проверки реализации: [NVIDIA Open-H3-Regenerate-2K](https://nvlabs.github.io/Sana/Open-H3-Regenerate-2K/), [установленный ComfyUI Open-H3 Regenerate](https://github.com/rdh9616/ComfyUI-Open-H3-Regenerate), [ComfyUI hosted MiniMax H3 Regenerate node docs](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MinimaxHailuo03RegenerateNode/en.md). Они описывают разные локальный и hosted пути; hosted node не включается в local-first QwenDirector.

### Уточнение для SCENE-02 RefMod I2V

Исправлено после живого A/B 2026-10-10: сначала был выполнен baseline `MiniMaxH3ImageToVideo` на INT8 FL2VA, 16 шагов без LoRA; затем корректный FL2V Turbo8 BF16 LoRA на 8 шагах. Оба jobs завершились, но заметного улучшения качества между ними нет. Вывод A/B ограниченный: число шагов/наличие этой Turbo LoRA не выглядит единственной причиной. Ref2VA LoRA по-прежнему относится к `MiniMaxH3ReferenceToVideo` и не подходит этому image-to-video графу.

Живой профиль revision 2 использует `minimax_h3_fl2va_pruned_int8_convrot.safetensors` для diffusion UNet, `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` только как NVFP4/AWQ Qwen3VL text encoder, INT8 ConvRot video VAE и `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors` для LoRA. Сверка показала два варианта sampling: активный `res_multistep` + `simple` соответствует sampler в Comfy-Org native H3 UI template; готовый [LightX2V ComfyUI I2V workflow](https://github.com/ModelTC/Minimax-H3-Turbo/blob/main/example_workflows/video_minimax_h3_i2v_lightx2v_turbo.json) использует отдельный рецепт `euler`, `BasicScheduler(simple, 8, denoise=1)` и `MiniMaxH3SigmaShift(shift_video=12, shift_audio=3)` для FL2VA Turbo8 544p. Это альтернативный режим, а не доказанная ошибка native графа; sampler нужно проверять как независимую гипотезу.

Эталонная Resolution Selector таблица LightX2V даёт 864×480 как 0.4 MP вариант и 1344×768 как 0.98 MP; Comfy-Org нативный H3 гайд рекомендует короткую сторону 768 (для 16:9 — 1344×768) как качество выше draft. Текущие 832×480 не совпадают ни с одним эталонным размером. Проверить VRAM/preflight до выбора высокого canvas; не повышать разрешение одновременно с другими параметрами в первом диагностическом A/B.

Промпт должен начинаться точной FL2VA инструкцией выравнивания первого и последнего кадра по реальной длительности; затем описывать один связный `[Shot 1]`, исходное состояние, видимое движение камеры и последовательное достижение финального состояния. В текущем наборе две дневные парковочные картинки заметно различаются крупностью/ракурсом, а prompt задаёт слишком много действий (подход, открытие двери, посадка, запуск) за один клип. Для первого quality retest уменьшить путь до одного движения камеры и одного действия либо выбрать более согласованную пару keyframes. H3 prompt guide также требует три поля: `integrated_multimodal_description`, `overall_soundscape`, `non_diegetic_music`.

NVFP4 пока не считается причиной дефектов: diffusion UNet в обоих сравниваемых результатах был INT8 и совпадает с официальным Comfy-Org stack; NVFP4 относится только к текстовому Qwen3VL. Чтобы проверить, влияет ли NVFP4 encoder, понадобится отдельное сравнение при неизменных diffusion UNet, sampler, shifts, seed, prompt, references и canvas; запускать его только после устранения найденных графовых расхождений.

### Подтверждённый PDD quality-вариант SCENE-02 (2026-10-10)

Пользователь оценил результат как наконец-то нормальное качество. Успешно исполнен сохранённый двухпроходный workflow `video_mmh3_fl2v_PDD8_fixed_test.json` с его PDD ACC схемой. Фактически исполненный ComfyUI API graph сохранён в `.data/comfyui-workflows/video_mmh3_fl2v_PDD8_fixed_test_qc-718-pdd8-api.json`; SHA-256 graph: `94a876ac64acb397c9af7b8f00321dc4fde79874ec00bf3ed0f23d288ef2f635`. Исходный UI workflow не перезаписывался.

- Вход: тот же CAS кадр `3.jpeg`, AssetVersion `104d18de-b611-4394-a916-67407b303494`; seed `7180218`; тот же prompt; RefMods в этом FL2VA PDD graph не применялись, тогда как в предыдущем high-res native run они были включены.
- Pass 1: 896×512; INT8 ConvRot FL2VA; PDD `MiniMax-H3-FL2VA-Acc-8Step.safetensors`, NFE 8, strength 1/1, Euler, SigmaShift video/audio 12/3, `on_off_grid=error`.
- Pass 2: PDD scheduler NFE 8, denoise 0.25; latent 3D upscaler `minimax_h3_latent_upscaler_3d_conv_v1_fp32.pth` → 1344×768, FP32, temporal chunking включён. Конечный ролик: 124 кадра, 24 fps, 5.167 s. Длительность в исходном графе уменьшена с 15 до 5 s для QC-прогона.
- В доступном серверном входе найден только начальный кадр; отсутствующий last-frame отключён в обоих H3 conditioning nodes. Первый кадр сохранён и подан на оба прохода через соответствующий resize. Вариант поэтому остаётся I2V, а не FL2V с двумя независимыми keyframes.
- RTX 5090 / ComfyUI 0.39.0 / PyTorch 2.13.0+cu130; очередь перед запуском была пустой. Выполнение Comfy завершилось `success` без node errors; наблюдаемый минимум свободной VRAM около 0.88 GiB.
- Результат сохранён в CAS как AssetVersion `ba37e183-1040-4960-8998-fc31120bea98`, SHA-256 `145bb2e89cc8305c65aebb8d72bc9a9634182dc6eb6b47d3183bd503087ce02d`, 5,668,427 bytes. Lineage указывает на исходный кадр. Comfy prompt ID: `25423e84-dc69-41d4-b2b0-d83a7e94aada`.
- На дату эксперимента это был подтверждённый PDD quality-кандидат для данной SCENE-02 проверки, не production default. В ноябре пользователь уточнил, что пока выше оценивает стандартный Ref2V INT8 pruned + Pika Flex; PDD/VEDA не считать текущими лидерами без новых сравнений.

Сохранённый `video_mmh3_i2v_lora_PDD_ACC_8NEW.json` не является эквивалентом этого корректного PDD режима: текущий false toggle выбирает базовый UNet/20 steps; true ветка выбирает PDD model, но остаются `res_multistep` и `BasicScheduler`, причём PDD Apply sigmas не поданы в sampler. Для PDD использовать Euler и sigma output от Apply, как в рабочем двухпроходном графе.



### Текущий пользовательский лидер: standard Ref2V + Pika Flex (2026-11-14)

Пользователь сообщил, что лучший вариант на текущем этапе анализа — стандартная модель `minimax_h3_ref2va_pruned_int8_convrot.safetensors` с `pika_h3_flex_ref2va_v1_bf16.safetensors`. Это предварительная оценка, не финальное решение и не production default; пользователь продолжает собственные тесты. PDD и VEDA остаются альтернативами.

Сохранённый локальный UI workflow `video_pika_h3_flex_ref2va.json` содержит 21 узел. Его UI→API import, installed ComfyUI `/object_info` schema validation, стандартная H3 R2V boundary, profile creation, prompt/reference injection и runtime LoRA preflight прошли read-only dry-run; `pika_h3_flex_ref2va_v1_bf16.safetensors` доступна, missing LoRAs нет. GPU submit не выполнялся. Профиль корректно показывает `qualityHint: unknown`: имя Pika Flex не задаёт известное число sampling steps.

В QwenDirector model stack теперь выводится из immutable graph (`UNETLoader`, LoRA, CLIP/VAE loaders) и показывается рядом с именем профиля. Это помогает отличать кандидатов; выбор/default автоматически не меняется.
