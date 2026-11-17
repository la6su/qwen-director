# MiniMax H3 Fun ControlNet Union 2.0 — matched A/B QC

Дата: 2026-11-17. Статус: локальная интеграция исполнена end-to-end; визуальная польза ограниченная, оба тестовых видео не выбраны для монтажа.

## Где именно ControlNet

ControlNet — структурное conditioning внутри H3-графа, не видимая поверх кадра графика и не отдельный цветовой стиль. В исполненном ComfyUI workflow:

1. `ModelPatchLoader` (`174`) загружает `minimax_h3_fun_controlnet_union_2.0_pruned_int8_convrot.safetensors`.
2. `VHS_LoadVideo` (`175`) читает исходное видео как 124 кадра при 24 fps.
3. `Canny` (`177`, low/high `0.4/0.8`) формирует control frames.
4. `MiniMaxH3FunControlNetApply` (`176`, strength `1`, active `0–100%`) применяет patch к H3 model и подключает control frames.
5. Пропаченная модель идёт в H3 sampler. В Comfy execution record `9e7c57ce-ef85-4dde-a4bb-e9e34866da78` сохранены эти точные node classes и inputs.

То есть в готовом MP4 нет отдельного видимого «слоя ControlNet»: его влияние — изменение того, как модель удерживает структуру. И сам Ref2VA уже получает исходный Video 1, поэтому один ControlNet output нельзя честно оценивать без baseline.

## Matched baseline

Сделан второй запуск с тем же source, `Picture 1/2`, prompt, seed `706198701`, 1280×720, 124 кадрами, sampler, scheduler и 20 шагами. Отличие baseline-графа только в том, что удалены nodes `174`, `176`, `177`, а исходная H3 model напрямую подключена к guider и scheduler. Video 1 остаётся на входе Ref2VA.

| Вариант | QD job | CAS AssetVersion | SHA-256 | ComfyUI output |
|---|---|---|---|---|
| ControlNet + Canny | `9fe5bf97-159c-459f-adea-73c5186ec4f4` | `8e2822e9-5d07-482d-a6ff-a0818506debb` | `766d5360f6d81f075d237cc1bd3d7b561a033c4722fbfb0fcb55e8fc972d0c04` | `qwendirector/9fe5bf97-159c-459f-adea-73c5186ec4f4_00001_.mp4` |
| Ref2VA baseline без ControlNet | `7e453d89-8b19-4acc-85fa-c543f1d6e6d4` | `69ac855c-49ed-443e-a4ec-01099fa067d2` | `8b7a869922a587fac1b8618a880e6d1d085c1f6e0c52f98c9f9ee2f70caac6b1` | `qwendirector/7e453d89-8b19-4acc-85fa-c543f1d6e6d4_00001_.mp4` |

Оба результата: H.264 1280×720, 24 fps, 124 кадров, 5.167 s, AAC присутствует только как generated audio и не должен попадать на монтажную дорожку.

## QC и вывод

Просмотрены 124-кадровый contact sheet ControlNet, такой же baseline sheet, 11 синхронных sample frames по всей длительности и общий crop кадра 60. В обоих результатах сохраняются один райдер/один велосипед, экранное направление и общая география фасада. ControlNet не рисует контуры в готовом кадре; различия находятся в фактурах и локальной геометрии и визуально умеренные. Видимого выигрыша уровня «новый/лучший монтажный план» нет, маркировка `DURA ACE` не читается.

Full-frame метрики (только дополнительный инструмент проверки совпадения): source↔ControlNet SSIM `0.8518`, source↔baseline `0.8190`, ControlNet↔baseline `0.8032`. Они подтверждают, что выходы отличаются и ControlNet-вариант немного ближе к source по этому агрегату, но это не visual quality score и не доказательство воспринимаемой пользы.

**Итог:** локальная интеграция технически работает и patch реально был выполнен; A/B показывает небольшой, неочевидный зрителю эффект на этом source. В предыдущем одновариантном тесте вывод о том, что patch «помог удержать» изображение, был слишком уверенным — Ref2VA baseline сам сохраняет большую часть сцены. Оба MP4 — technical proof, `unselected for cut`; не повторять этот кадр ради монтажа.

## Контактные листы

![11 одинаково расположенных кадров: source, baseline и ControlNet](controlnet-ab-samples.png)

![Крупный sync crop кадра 60: source, baseline и ControlNet](controlnet-ab-frame-060.png)

Полные contact sheets: [124 кадров ControlNet](controlnet-all-124-frames.png), [124 кадров baseline](controlnet-baseline-all-124-frames.png).
