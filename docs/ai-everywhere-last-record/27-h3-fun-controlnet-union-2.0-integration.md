# MiniMax H3 Fun ControlNet Union 2.0 — локальная интеграция

Обновлено: 2026-11-17. Назначение — отдельный экспериментальный QwenDirector workflow для локального video-to-video управления структурой кадра. Это не production-lock и не подтверждение визуального качества.

## Источник и ограничения

- Репозиторий: `alibaba-pai/MiniMax-H3-Fun-Controlnet-Union-2.0`.
- Разрешённый код ревизии HF: `7d2c95de2e351ed6a0b360af45f62daa04c26f88`.
- Исходный Alibaba checkpoint (`13,551,637,688` байт; SHA-256 `ecaf457aacc18ca6ed9889a276a36722e88c09962549bcd9e153b97e35ea921e`) был удалён по прямому указанию пользователя после подтверждения несовместимости с локальным ComfyUI `ModelPatchLoader`. Исходный файл не нужен локальному runtime и не хранится в `model_patches`.
- Для native ComfyUI используется официальный совместимый repack `Comfy-Org/MiniMax-H3/model_patches/minimax_h3_fun_controlnet_union_2.0_pruned_int8_convrot.safetensors`, revision `4b53a35191437de05370da548e59aeabe2a5a09a`; ожидаемый размер `4,531,220,608` байт; LFS SHA-256 `890af58bb350f0c2f6c409b1c67ea8f4196654297d037769b72de1e6f504c612`. Совместимость интенсива подтверждена native Comfy H3 model-patch format; исходник Alibaba и Comfy repack не взаимозаменяемы на уровне ключей/диффузионной базы.
- Модель является патчем ControlNet для MiniMax H3, не самостоятельной базовой моделью. Конфигурация v2 описывает 10 control blocks и входную ширину 49; поддерживаемые типы контроля включают Canny, Depth, HED, MLSD, Pose, Scribble, Layout и Gray.
- Пользовательский режим: только локальная работа, без публикации. Применяется лицензия MiniMax H3 Community License; до распространения или публичного показа нужно отдельно проверить территориальные ограничения и условия на актуальной карточке.

## QwenDirector workflow

- Первый кандидат `last-record-h3-fun-controlnet-union-2.0-ref2va-canny-v1` сохранён как inactive/superseded: наследовал sampler `lcm`. Первая job `24d42bb8-86ba-4688-8fa6-6dd99de76b2c` с исходным Alibaba state dict завершилась на `ModelPatchLoader` (`UnboundLocalError: model`); видеогенерация не началась, output assets не созданы. Повторять эту job нельзя.
- Текущий профиль `last-record-h3-fun-controlnet-union-2.0-ref2va-canny-v2`, revision 2, штатно активирован 2026-11-17 после live preflight. Graph SHA-256 `dce4289b45cd500d7ae6d2a22f053602624f68533c39c9896dedd6ac9c62d3d7`; graph JSON `workflows/last_record_h3_fun_controlnet_union_2_0_ref2va_canny_v2.api.json`. `ModelPatchLoader` ссылается на совместимый Comfy-Org repack.
- Для этого ComfyUI оставлен только официальный совместимый repack: `minimax_h3_fun_controlnet_union_2.0_pruned_int8_convrot.safetensors`, revision `4b53a35191437de05370da548e59aeabe2a5a09a`, 4,531,220,608 байт, SHA-256 `890af58bb350f0c2f6c409b1c67ea8f4196654297d037769b72de1e6f504c612`. Live `ModelPatchLoader` choices содержат имя файла; QwenDirector profile preflight вернул `tested=true`, `active=true`, без missing models/nodes.
- Профиль использует H3 sampler `res_multistep` + `simple` scheduler, 20 шагов. Это runtime/schema compatibility evidence; качество движения и изображения может подтвердить только просмотр реального результата.
- Основа — Ref2VA graph без Pika LoRA. Source video проходит через `VHS_LoadVideo` (24 fps, 1280×720, до 124 кадров), затем Canny и `MiniMaxH3FunControlNetApply`; две image refs — велосипед и actor identity.
- Test shot: scene `LR-S02` (`f51e9bd1-8920-4e68-82fe-8558df772608`), shot `8d2e731e-61df-4213-bf2d-add488095fce`; prompt revision 3 сохранена через QwenDirector: exact `<Video 1>`, `<Picture 1>`, `<Picture 2>` roles через QwenDirector. Видеореференс — ранее одобренный пользователем проход одного героя на велосипеде мимо витрины, screen direction слева направо. Локально проверены контактные кадры: одна фигура/один велосипед, постоянный ракурс, одна география магазина. Target trim — 2.5 s; исходник — 5.167 s. Это технический test shot, не утверждённый монтажный план.
- Для job используются bike AssetVersion `a652857d-09bc-4ee0-a045-6fa546a34b77` (SHA `b24d6130818fc1c671e6f2d648f76a3aad3d08737feb6449dfad795109648dd8`), actor AssetVersion `31ba354f-72fd-4d43-a87e-a8d19477a4b1` и source video AssetVersion `c3594186-c2d6-4a85-9220-ac1a84b33a73`. Все три refs находятся в Project; их наличие/типы совпадают с двумя image и одной video bindings выбранного графа.

## Сравнение с Temporal Window & Spatial Tiles

[ComfyUI-MiniMaxH3-TemporalWindow-SpatialTiles](https://github.com/mo-akkakk/ComfyUI-MiniMaxH3-TemporalWindow-SpatialTiles) — другой класс инструмента: он выполняет последовательные перекрывающиеся temporal windows и/или spatial tiles для длинного или крупного по разрешению H3 V2V, чтобы продолжать движение и сводить швы плиток. Он не подаёт Canny/Depth/Pose control signal в transformer.

Для текущего теста длина 124 кадра (одна нативная H3 длительность), формат 1280×720 (~0.92 MP), поэтому ControlNet video-to-video уже получает одну структурную control sequence; temporal windows и spatial tiles не требуются. Рассмотреть этот custom node отдельно для действительно длинных проходов или выше ~1 MP, если появится такой сценарий. Проверена README, но пакет не установлен и ComfyUI не перезапускался.

## Текущий fetch и следующий gate

### Контролируемый generation test и A/B 2026-11-17

- Перед запуском: `/ready=ready/degraded` (обязательные ComfyUI/storage доступны; llama.cpp отсутствует как optional), worker `local-qwen` online, Comfy queue пуста, GPU RTX 5090 доступен; профиль rev2 успешно прошёл QwenDirector live preflight.
- Новый immutable snapshot/job `9fe5bf97-159c-459f-adea-73c5186ec4f4`, plan hash `8f60f2c3e8165424c01b0c32819f9069edefd5b3bbb36a199cd6d1628f39ab22`, shot `LR-S02-FUN-CN-TEST-02`. В снимке проверены repack filename, graph revision, 1280×720, 124 frames / 24 fps и порядок ролей: Picture 1 bike, Picture 2 actor, Video 1 previously user-reviewed ride source.
- Job создан в `awaiting_approval`, затем утверждён штатным QwenDirector route; attempt `9e7c57ce-ef85-4dde-a4bb-e9e34866da78` завершился `succeeded` через worker lease/fencing token 1. Comfy history подтверждает исполнение `MiniMaxH3FunControlNetApply` с patch-файлом и завершившийся 124-frame output. Comfy output: `qwendirector/9fe5bf97-159c-459f-adea-73c5186ec4f4_00001_.mp4`.
- CAS AssetVersion результата `8e2822e9-5d07-482d-a6ff-a0818506debb`, SHA-256 `766d5360f6d81f075d237cc1bd3d7b561a033c4722fbfb0fcb55e8fc972d0c04`, 3,332,530 bytes. `ffprobe`: H.264 1280×720, 24 fps, 124 frames, 5.167 s; generated AAC присутствует и должен быть исключён из финального монтажа.
- Execution graph (из Comfy history): node `174 ModelPatchLoader` загрузил совместимый repack; `175 VHS_LoadVideo` передал 124 кадра при 24 fps; `177 Canny` с low/high thresholds `0.4/0.8` подал контуры в `176 MiniMaxH3FunControlNetApply` (strength 1.0, start 0, end 1). Пропаченная модель связана с H3 sampler; это реальный структурный ControlNet, а не наложенная на изображение маска.
- Чтобы ответить, заметен ли его вклад, создан matched baseline: профиль `last-record-h3-fun-controlnet-union-2.0-ref2va-baseline-v2`, revision 2, graph SHA `be45f8c8e168b69379dbd6dc8265fad019ca78a0bb214b184a537fe6b889f671`. В нём удалены только nodes 174/176/177, а base model подключена напрямую к guider/scheduler; тот же source video всё ещё подан в `MiniMaxH3ReferenceToVideo`. Это важно: исходный Ref2VA уже способен сохранить значительную часть движения и геометрии и без ControlNet.
- Baseline job `7e453d89-8b19-4acc-85fa-c543f1d6e6d4`, plan hash `0820f883462818af540f6fc3e90a3050b8c6834d82d6e5ac30aa22fffcf47b4f`, attempt `1b821a29-d190-42c8-a5f3-b9048e925bb9`, завершён `succeeded`; совпадают source video, actor/bike refs, prompt, seed `706198701`, dimensions, 124 frames, 20 steps, sampler и scheduler. Только patch/Canny branch отключён.
- Baseline CAS AssetVersion `69ac855c-49ed-443e-a4ec-01099fa067d2`, SHA-256 `8b7a869922a587fac1b8618a880e6d1d085c1f6e0c52f98c9f9ee2f70caac6b1`, 3,401,208 bytes, те же H.264 параметры и generated AAC. Comfy output: `qwendirector/7e453d89-8b19-4acc-85fa-c543f1d6e6d4_00001_.mp4`.
- Сравнение на кадрах с одинаковыми индексами: SSIM исходник↔ControlNet `0.8518`, исходник↔baseline `0.8190`, ControlNet↔baseline `0.8032`; PSNR соответственно `24.59`, `24.44` и `23.06 dB`. Это вспомогательные full-frame similarity метрики, не score качества и не доказательство воспринимаемого улучшения. В triptych на кадре 60 и полосе 11 кадров видны умеренные изменения кадра, но зрителю почти неотличимая крупная геометрия/тот же ракурс; явной драматургической или «ControlNet-стилистики» нет. ControlNet — conditioning, он не рисуется поверх картинки.
- QC ControlNet output: просмотрен contact sheet всех 124 кадров, 21 кадр с интервалом около 0.25 s, финальные 14 кадров и crop source/output. В baseline и ControlNet сохранены один райдер/велосипед, screen direction и общая фасадная география; на просмотренных contact sheets не найдено явного второго райдера или большого spatial break. Надпись DURA ACE не становится читаемой. Ни один из двух тестовых выходов не выбран для cut.
- Вывод: end-to-end загрузка и применение контрольной ветки подтверждены нодами и matched A/B, но **видимый выигрыш небольшой** и этим тестом не доказано превосходство для других сцен/типов контроля. Пара файлов — техпруф, не production take; этот уже пройденный райд не генерировать повторно для монтажа.

Визуальные материалы: [matched A/B, 11 синхронных кадров](qc/controlnet-ab-samples.png), [крупный crop одного sync frame](qc/controlnet-ab-frame-060.png), [124-кадровые contact sheets ControlNet](qc/controlnet-all-124-frames.png) и [baseline](qc/controlnet-baseline-all-124-frames.png).

Workflow не отправлялся прямым вызовом в ComfyUI. Не повторять job с raw Alibaba checkpoint и не считать test output выбранным монтажным кадром. Перед использованием на любом другом сюжетном шоте подобрать уже осмысленный source-motion plate и определить измеримую задачу (например, удержание геометрии/движения); затем повторить profile preflight и review полного результата. Работа над интернет-обложками магазина отложена по текущему указанию пользователя.

## UI-граф для просмотра в ComfyUI

Для визуального просмотра создана отдельная UI-workflow-копия: [`last_record_h3_fun_controlnet_union_2_0_ref2va_canny_v2.inspection.ui.json`](../../workflows/last_record_h3_fun_controlnet_union_2_0_ref2va_canny_v2.inspection.ui.json). Та же копия находится в `ComfyUI/user/default/workflows/`. ComfyUI userdata API (`/api/userdata?dir=workflows`) подтвердил, что файл виден в списке workflow; открой его по имени `last_record_h3_fun_controlnet_union_2_0_ref2va_canny_v2.inspection.ui.json` через список workflow в ComfyUI.

Это UI-представление топологии исполненного QwenDirector API-графа: `ModelPatchLoader` → `MiniMaxH3FunControlNetApply`, `VHS_LoadVideo` → `Canny` → `control_video`. Оно не меняет активный QD профиль. Все вычислительные ноды имеют режим `Never` (muted), чтобы файл служил только для просмотра и не запускался напрямую мимо QwenDirector approval/provenance flow; у video input оставлен placeholder.

После вопроса пользователя «где здесь ControlNet?» обнаружена причина плохой видимости: исходный viewport `offset=[0,0]` оставлял узел модели и видеоисточник на `x=-480` за левым краем canvas. Исправлена раскладка рамки и начальный viewport (`scale=0.6`, `offset=[460,250]`), чтобы при открытии были видны заметка, model patch, control-video → Canny, apply node и связь с H3 model. Обновлённый JSON скопирован в `ComfyUI/user/default/workflows/`; repo copy и runtime copy совпадают по SHA-256 `8ced7bd3cf68ce1c9d580391cf99b3b00b92237048ea9bbfccfe8831eef4d35b`. Сам холст через браузер этой среды не проверен: browser surface недоступен. JSON и все 31 UI-link проверены структурно.

## Технические источники

- [Карточка исходной модели Hugging Face](https://huggingface.co/alibaba-pai/MiniMax-H3-Fun-Controlnet-Union-2.0)
- [Официальный Comfy-Org int8 v2 repack](https://huggingface.co/Comfy-Org/MiniMax-H3/blob/4b53a35191437de05370da548e59aeabe2a5a09a/model_patches/minimax_h3_fun_controlnet_union_2.0_pruned_int8_convrot.safetensors)
- [Документация ноды ComfyUI MiniMaxH3FunControlNetApply](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/MiniMaxH3FunControlNetApply/en.md)
- [Официальный tutorial ComfyUI H3 Fun ControlNet](https://github.com/Comfy-Org/docs/blob/main/tutorials/video/minimax/minimax-h3-fun-controlnet.mdx)
- [Официальный MiniMax H3 guide и sampler/workflow notes](https://github.com/Comfy-Org/docs/blob/main/tutorials/video/minimax/minimax-h3.mdx)
- [README Temporal Window & Spatial Tiles (сравнительный кандидат, не установлен)](https://github.com/mo-akkakk/ComfyUI-MiniMaxH3-TemporalWindow-SpatialTiles)
