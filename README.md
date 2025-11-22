# Figma Export Tool + GUI

Инструмент для массового скачивания файлов Figma в формате .fig/.jam/.deck с CLI и графическим интерфейсом (Electron).

## 📋 Описание

Утилита автоматически собирает список файлов Figma по Team ID или Project ID, скачивает их через Playwright и ведет учёт в SQLite. GUI помогает подготовить `.env`, установить зависимости и запустить `npm run run-backup` без терминала.

### Преимущества

- **Массовая загрузка** — очередь файлов из TEAMS/PROJECTS
- **Автоматическая авторизация** — поддержка нескольких аккаунтов Figma
- **Обход лимитов API** — ротация аккаунтов для увеличения квоты
- **Отслеживание изменений** — база данных SQLite с датами последнего бэкапа
- **Повтор неудачных** — повторные попытки по очереди ошибок
- **Графический интерфейс** — установка зависимостей, конфиг и мониторинг

## 🖥️ Требования

### CLI
- Node.js 20 LTS и npm 10+
- Установленные браузеры Playwright (`npx playwright install`)
- macOS / Linux / Windows

### GUI
- macOS 11+ (Big Sur и новее)
- Node.js 20 LTS (устанавливается вручную)
- Доступ к интернету для `npm install` и Playwright

## 📦 Установка

### CLI версия

```bash
git clone https://github.com/konstantin-kuzin/Figma-export.git
cd Figma-export

npm install
npx playwright install

mkdir -p .userData
cp .env.example .userData/.env
```

### Быстрый старт без терминала (macOS)

Дважды кликните по `install.command` (может поставляться как `start-gui.command`). Скрипт:
- скачает portable Node.js 20.17.0, если npm не найден;
- установит зависимости в корне и Playwright Chromium;
- установит зависимости в `gui/`;
- запустит GUI (production build при наличии `gui/dist`).
Логи установки: `.install.log`. Portable Node кладётся в `.node/` (активация: `source .node/activate`).

### GUI версия

1. Выполните установку CLI выше (npm install + playwright install в корне).
2. Установите зависимости GUI:
   ```bash
   cd gui
   npm install
   ```
3. Запуск (очистка dist + build + electron):
   ```bash
   npm run start
   ```
   Альтернативы: из корня `npm run start --workspace gui` или `npm run start` (root скрипт проксирует в workspace).
4. Сборка DMG: в корне `npm run build-app` (build GUI + electron-builder).

## ⚙️ Конфигурация

### Создание .env файла

Используйте шаблон `.env.example` и заполните `.userData/.env`:

```bash
FIGMA_ACCESS_TOKEN="figd_..."

FIGMA_ACCOUNT_1_EMAIL="user@example.com"
FIGMA_ACCOUNT_1_AUTH_COOKIE="__Host-figma.authn=..."
# Если используете пароль вместо cookie:
# FIGMA_ACCOUNT_1_PASSWORD="password123"

DOWNLOAD_PATH="/Users/you/Figma-backups"
PROJECTS="12345 67890"   # или через запятую/пробел
# TEAMS="11111 22222"    # можно указать вместо PROJECTS
WAIT_TIMEOUT="10000"
```

> ⚠️ Все секреты и runtime‑данные (`.env`, `figma_backups.db`, `files.json`, Playwright отчёты) живут в `.userData/`. Папка не коммитится — держите резервные копии отдельно.
>
> Ограничения очереди по умолчанию: 3 файла за прогон для TEAMS (`backup/get-team-files.js`) и 20 файлов за прогон для PROJECTS (`backup/get-project-files.js`, константа `MAX_FILES`).

### Получение Figma Access Token

1. Перейдите в [Figma Developer Settings](https://www.figma.com/developers/api#authentication)
2. Создайте Personal Access Token
3. Убедитесь, что токен начинается с `figd_`

### Получение Auth Cookie

1. Авторизуйтесь в Figma в браузере
2. Откройте DevTools (F12) → Application → Cookies → https://www.figma.com
3. Найдите cookie `__Host-figma.authn`
4. Скопируйте значение

### Генерация files.json вручную

```bash
# Для Project IDs
node backup/get-project-files.js 12345 67890

# Для Team IDs
node backup/get-team-files.js 11111 22222
```

## ▶️ Использование

### CLI

```bash
# Полный автоматический цикл (очередь + Playwright, headed)
npm run run-backup   # вызывает backup/run-backup.js

# Только скачивание по уже сгенерированному .userData/files.json
npx playwright test automations/download.spec.ts
```

`run-backup` удаляет старый `.userData/files.json`, собирает очередь по TEAMS/PROJECTS и запускает Playwright в headed‑режиме.

### GUI

1. Запустите GUI (см. установку).
2. Вкладка Installation: `Install Dependencies` выполнит `npm install` и `npx playwright install` в корне.
3. Вкладка Config: заполните email/cookie/token, путь и PROJECTS/TEAMS, нажмите `Save settings`.
4. Вкладка Backup: `Start backup` запускает `npm run run-backup` и показывает лог/прогресс.
5. Вкладка Statistics: метрики и таблица `backups`; файлы, которых нет на диске, подсвечены ⚠.

## 📊 Мониторинг

### База данных SQLite

Инструмент использует `figma_backups.db` в `.userData/`:

```sql
CREATE TABLE backups (
  file_key TEXT PRIMARY KEY,
  project_name TEXT,
  file_name TEXT,
  last_backup_date TEXT,
  last_modified_date TEXT,
  next_attempt_date TEXT
);
```

### Просмотр

- GUI → вкладка Statistics (карточки + таблица)
- Любой SQLite‑клиент, таблица `backups`

## 🛠️ Разработка

### Структура проекта

```
figma-export/
├── .userData/               # Закрытая директория пользовательских данных
│   ├── .env                 # Конфигурация (токены, ID)
│   ├── figma_backups.db     # База данных SQLite
│   ├── files.json           # Список файлов для загрузки
│   ├── backup-results/      # Playwright артефакты
│   └── backup-reports/      # HTML отчёты
├── backup/                  # CLI скрипты
│   ├── get-team-files.js    # Получение списка файлов по Team IDs
│   ├── get-project-files.js # Получение списка файлов по Project IDs
│   ├── run-backup.js        # Основной скрипт бэкапа
│   ├── db.js                # Работа с базой данных
│   └── figma-lib.js         # Вызовы Figma API
├── gui/                     # Графический интерфейс (Electron)
│   ├── src/
│   │   ├── main.ts          # Main process
│   │   ├── static/          # index.html, стили
│   │   ├── ui-*.ts          # Логика экранов (welcome/backup/statistics/config)
│   │   └── utils/           # preload, ScriptRunner, EnvManager, DatabaseManager, Logger
│   └── dist/                # Собранные файлы
├── automations/             # Playwright автоматизации
└── playwright.config.ts     # Конфиг Playwright
```

### Сборка GUI

```bash
# Установка зависимостей GUI (из gui/)
npm install

# Компиляция TypeScript
npm run build

# Создание дистрибутива
npm run build-app   # из корня, electron-builder
```

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте изменения (`git push origin feature/amazing-feature`)
5. Откройте Pull Request
