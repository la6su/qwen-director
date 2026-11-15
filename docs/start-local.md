# Локальный запуск для разработки

Эта инструкция запускает веб-интерфейс и API с локальной PostgreSQL на чистом компьютере. Для первого запуска не нужны GPU, модели, ComfyUI, Python или доступ к лабораторной сети. Без ComfyUI можно проверять интерфейс и mock-исполнение; генерация изображений и видео недоступна.

## Windows 11

### 1. Установите инструменты

Установите Git for Windows, Node.js LTS (вместе с npm) и Docker Desktop. При первом запуске Docker Desktop дождитесь статуса **Running**. После установки Git и Node.js перезапустите PowerShell.

Проверьте установки:

```powershell
git --version
node --version
npm --version
docker --version
docker compose version
```

### 2. Получите проект и зависимости

Откройте PowerShell в папке, куда хотите поместить проект:

```powershell
git clone <URL-репозитория>
cd qwen-director
npm ci
```

Если проект уже открыт из checkout или архива, пропустите `git clone` и откройте PowerShell в корне проекта. Файл `.env` не добавляйте в Git.

### 3. Создайте локальный пароль PostgreSQL

```powershell
Copy-Item .env.example .env
$dbPassword = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
$envText = (Get-Content .env -Raw).Replace('POSTGRES_PASSWORD=', "POSTGRES_PASSWORD=$dbPassword")
[IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), $envText, [Text.UTF8Encoding]::new($false))
$env:DATABASE_URL = "postgresql://qwendirector:$([uri]::EscapeDataString($dbPassword))@127.0.0.1:54329/qwendirector"
```

Пароль создаётся на вашем компьютере и записывается в игнорируемый Git файл `.env`. Не копируйте пароль в issue, PR, скриншоты или сообщения. Оставьте это окно PowerShell открытым: в нём уже настроен `DATABASE_URL`. Запустите базу:

```powershell
docker compose -f docker-compose.dev.yml --profile dev up -d postgres
docker compose -f docker-compose.dev.yml ps
```

### 4. Запустите API и веб-интерфейс

В том же окне PowerShell задайте параметры API и запустите его:

```powershell
$env:QWEN_STORAGE = 'postgres'
$env:QWEN_API_AUTOSTART = 'true'
npx tsx apps/api/src/index.ts
```

Откройте второе окно PowerShell в корне проекта и запустите web:

```powershell
npm run dev:web
```

В третьем окне, если хотите запускать очередь с mock-исполнителем, запустите worker:

```powershell
$env:QWEN_API_BASE_URL = 'http://127.0.0.1:4310'
$env:QWEN_NODE_ID = 'local'
$env:QWEN_INSTANCE_ID = 'local-windows'
npm --workspace apps/worker run start
```

Откройте <http://127.0.0.1:5173/>. Проверка API: <http://127.0.0.1:4310/health>. API и web по умолчанию доступны только на этом компьютере.

Для проверки web-интерфейса с другого устройства в доверенной локальной сети запустите Vite с LAN bind:

```sh
npm --workspace apps/web run dev -- --host 0.0.0.0
```

Откройте `http://<LAN-IP-компьютера>:5173/`. Vite проксирует API локально; API и PostgreSQL отдельно в сеть не публикуйте. Узнать LAN IP: `ip -brief address` (Linux) или `ipconfig getifaddr en0` (macOS).

Если Linux firewall включён, разрешите TCP 5173 только на LAN-интерфейсе и для доверенной подсети, например `sudo ufw allow in on <интерфейс> from <CIDR-подсеть> to any port 5173 proto tcp`. Не отключайте firewall целиком.

### Остановка

Остановите API, web и worker сочетанием `Ctrl+C` в соответствующих окнах. Остановить PostgreSQL с сохранением данных:

```powershell
docker compose -f docker-compose.dev.yml --profile dev stop postgres
```

Для следующего запуска используйте `docker compose -f docker-compose.dev.yml --profile dev start postgres`. Удаление базы со всеми локальными данными выполняет команда `docker compose -f docker-compose.dev.yml --profile dev down -v`; это действие необратимо.

## macOS и Linux

Установите Git, Node.js LTS с npm и Docker с Compose. Из корня репозитория выполните `npm ci`, создайте `.env` из `.env.example`, задайте уникальный `POSTGRES_PASSWORD`, затем запустите PostgreSQL:

```sh
cp .env.example .env
docker compose -f docker-compose.dev.yml --profile dev up -d postgres
```

Запустите API и web в отдельных терминалах. В URL замените `<URL-encoded-password>` на пароль из `.env`, предварительно URL-кодировав его:

```sh
QWEN_STORAGE=postgres DATABASE_URL='postgresql://qwendirector:<URL-encoded-password>@127.0.0.1:54329/qwendirector' QWEN_API_AUTOSTART=true npx tsx apps/api/src/index.ts
npm run dev:web
```

Опционально запустите worker третьим терминалом:

```sh
QWEN_API_BASE_URL=http://127.0.0.1:4310 QWEN_NODE_ID=local QWEN_INSTANCE_ID=local-dev npm --workspace apps/worker run start
```

## Что включено и что нет

- `npm ci` устанавливает версии из `package-lock.json`; используйте npm и не смешивайте менеджеры пакетов.
- PostgreSQL хранит состояние в Docker volume. Обычная остановка контейнера сохраняет данные.
- Mock-исполнитель нужен для базового job lifecycle. Он не генерирует настоящее видео.
- Для workflows отдельно установите ComfyUI и необходимые модели на доступном GPU, затем укажите адрес через `COMFYUI_URL` для worker. Модели в репозиторий не входят.
- Не используйте production/lab команды из README для первого запуска: им нужны заранее настроенные сервисы и операторские данные.

## Частые проблемы

- **`docker` не найден или daemon недоступен:** запустите Docker Desktop, дождитесь **Running**, затем откройте новое окно PowerShell.
- **Порт 54329 занят:** измените `POSTGRES_PORT` в `.env` и используйте тот же порт в `DATABASE_URL`.
- **API сообщает об ошибке подключения к БД:** проверьте `docker compose ... ps`, пароль в `.env` и совпадение пользователя, базы и порта в `DATABASE_URL`.
- **`npm ci` завершился ошибкой:** проверьте `node --version` (нужен Node.js LTS) и запускайте команду из корня репозитория.

## Для Codex и других агентов

Перед изменениями прочитайте корневой [AGENTS.md](../AGENTS.md), README и нужные контракты в `docs/`. Сначала проверьте `git status` и diff, сохраняя незакоммиченные изменения пользователя. Не читайте и не выводите `.env`; для проверки публикации используйте только имена отслеживаемых файлов и `.gitignore`. Не публикуйте локальные пути, адреса узлов, токены, модели и данные `.data/`. В конце сессии обновите `docs/next-session.md`, указав изменения, проверки и ограничения. Не создавайте commit и PR без прямого поручения пользователя.
