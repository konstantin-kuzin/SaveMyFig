# Техническая спецификация: Figma Export Tool + GUI

## Версия документа: 1.1
**Дата обновления:** 15 ноября 2025  
**Актуализировал:** Codex (GPT‑5)  
**Платформа:** macOS 11+  
**Статус:** Соответствует текущему коду репозитория

---

## 1. Назначение документа
Документ фиксирует фактическую архитектуру решения для резервного копирования проектов Figma. Он описывает CLI‑скрипты, Playwright‑автоматизацию, базу данных, а также Electron‑приложение `gui/`, которое выступает в роли графической оболочки. Спецификация служит источником правды для команды разработки и документации.

---

## 2. Общее описание решения

| Слой | Назначение | Основные файлы |
| --- | --- | --- |
| **CLI / backend** | Сбор списка файлов через Figma API, ведение SQLite, запуск Playwright для скачивания `.fig/.jam/.deck` | `backup/*.js` (в т.ч. `figma-lib.js`), `automations/*.ts`, `playwright.config.ts`, `figma_backups.db` |
| **GUI (Electron)** | Настройка `.userData/.env`, установка зависимостей, запуск CLI‑скриптов и просмотр статистики без терминала | `gui/src/main.ts`, `gui/src/utils/preload.ts`, `gui/src/ui-*.ts`, `gui/src/static/*`, `gui/dist/*` |
| **Инфраструктура** | Конфигурация, хранение токенов, очереди и логов | `.userData/.env`, `.userData/figma_backups.db`, `.userData/files.json`, `.auth/*`, `downloads/*`, `logs/` |

Основной сценарий: пользователь задаёт токены/ID в `.userData/.env`, запускает `npm run run-backup` (через GUI или CLI), после чего:
1. Генерируется свежий `.userData/files.json` (по TEAMS или PROJECTS).
2. Playwright выполняет авторизацию в Figma и скачивает файлы в `DOWNLOAD_PATH`.
3. SQLite фиксирует дату последнего бэкапа и переносит ошибки в очередь повторов.
4. (Опционально) выполняется `rsync` на внешнее хранилище, если смонтирован `Alloy`.

---

## 3. Структура репозитория

```
Figma-export/
├── automations/              # Playwright setup + тест скачивания
│   ├── auth.setup.ts         # Авторизация/ротация аккаунтов → .auth/user.json
│   └── download.spec.ts      # Скачивание файлов из .userData/files.json
├── backup/
│   ├── run-backup.js         # Точка входа, orchestration
│   ├── get-team-files.js     # Генерация .userData/files.json по team ID
│   ├── get-project-files.js  # Аналог по project ID
│   ├── db.js                 # Работа с SQLite (backups)
│   ├── figma-lib.js          # Вызовы Figma API
│   └── generate-db-report.js # HTML-отчёт по БД
├── gui/                      # Электронный GUI
│   ├── src/main.ts, src/utils/preload.ts
│   ├── src/static/*          # index.html и стили
│   ├── src/ui-*.ts           # Логика экранов
│   └── dist/                 # Собранный main/renderer/ui
├── .userData/                # Runtime‑данные и конфигурация
│   ├── .env                  # Основной конфиг (токены, пути, ID)
│   ├── files.json            # Очередь скачивания (внутри .userData/)
│   ├── figma_backups.db      # SQLite база
│   ├── backup-results/       # Трейсы и артефакты Playwright
│   └── backup-reports/       # HTML отчёты
├── playwright.config.ts
├── README.md, docs/*.md
└── downloads/…               # Результат скачиваний (см. DOWNLOAD_PATH)
```

---

## 4. Поток данных CLI

1. **Конфигурация** — `.userData/.env` содержит `FIGMA_ACCESS_TOKEN`, акккаунты (`FIGMA_ACCOUNT_<N>_*`), `DOWNLOAD_PATH`, `TEAMS` или `PROJECTS`, `WAIT_TIMEOUT`.
2. **Выбор исходных данных** — `backup/run-backup.js` читает `.userData/.env` и вызывает:
   - `node backup/get-team-files.js <teamIds>` если задан `TEAMS`.
   - `node backup/get-project-files.js <projectIds>` если задан `PROJECTS`.
3. **Figma API** — `backup/figma-lib.js` вызывает `/v1/teams/{teamId}/projects` и `/v1/projects/{projectId}/files` с заголовком `X-FIGMA-TOKEN`.
4. **SQLite** — `backup/db.js` обновляет таблицу `backups` (ключ `file_key`) и сортирует очередь по `last_backup_date`/`next_attempt_date`.
5. **files.json** — `get-team-files.js` / `get-project-files.js` фильтруют записи БД и записывают только выбранные файлы (по умолчанию `MAX_FILES = 3` за прогон) в `.userData/files.json` в формате:
   ```json
   [
     {
       "id": "123",
       "name": "Design system",
       "team_id": "999",
       "files": [{"key": "ABC", "name": "Spec", "last_modified": "..." }]
     }
   ]
   ```
6. **Playwright** — `npx playwright test automations/download.spec.ts`:
   - `auth.setup.ts` добавляет cookie или логинится парой Email/Password согласно `FIGMA_ACCOUNT_<N>_*`.
   - `download.spec.ts` открывает `https://www.figma.com/design/<file.key>/`, вызывает `Save as .fig/.jam/.deck` и сохраняет файл в `${DOWNLOAD_PATH}/${teamId?}/<Project name (project.id)>/`.
   - После успешного сохранения вызывает `updateBackupDate(file.key)`, при ошибке — `recordBackupFailure(file.key)`.
7. **Завершение** — `run-backup.js` закрывает SQLite (`closeDb()`) и, если доступен `/Volumes/Alloy/...`, выполняет `rsync` (требует ручной правки путей под конкретное окружение).

---

## 5. Компоненты и ответственность

### 5.1 CLI
- **`backup/run-backup.js`** — чистит старый `.userData/files.json`, выбирает `TEAMS` или `PROJECTS`, запускает Playwright, следит за ошибками и инициирует post-processing (`rsync`).
- **`backup/get-*-files.js`** — собирают файлы из API, обновляют SQLite и формируют очередь скачивания. Ключевые настройки:
  - `MAX_FILES = 3` — ограничение на число файлов за один запуск (при необходимости увеличить константу).
  - Фильтрация по наличию записей в актуальном API ответе (устаревшие записи пропускаются).
- **`backup/figma-lib.js`** — инкапсулирует HTTP запросы к Figma API, повторно использует `dotenv` для токена.
- **`backup/db.js`** — единая точка чтения/записи SQLite. Методы: `getFilesToBackup()`, `updateBackupInfo()`, `updateBackupDate()`, `recordBackupFailure()`, `close()`.
- **`automations/auth.setup.ts`** — формирует `.auth/user.json` и ротуирует аккаунты по порядку (`FIGMA_ACCOUNT_1_*`, `FIGMA_ACCOUNT_2_*` и т.д.), сохраняя состояние в `.auth/account-state.json`.
- **`automations/download.spec.ts`** — единственный тест, который исчерпывающим образом скачивает каждый файл из `.userData/files.json` и кладёт результат в `DOWNLOAD_PATH`.

### 5.2 GUI (`gui/`)
- **Main process (`gui/src/main.ts`)** — создаёт окно 1200×800, подключает preload, регистрирует IPC:
  - `check-nodejs`/`check-npm` — проверки через `child_process.execSync`.
  - `install-dependencies` — передаёт управление `ScriptRunner`, который последовательно выполняет `npm install` и `npx playwright install` в корне репозитория.
  - `read-env`/`write-env`/`validate-config` — используют `EnvManager` и работают только с `.userData/.env` (без electron-store).
  - `run-script(-with-progress)`/`stop-script` — запускают `npm run <command>` через `child_process.spawn`.
  - `get-statistics`, `get-all-backups`, `reset-errors` — читают SQLite через `DatabaseManager`.
  - `select-directory`, `show-notification`, `open-external` — вспомогательные операции.
- **Preload (`gui/src/utils/preload.ts`)** — экспортирует API под `window.electronAPI` (ContextBridge включён, но `contextIsolation` пока закомментирован в `BrowserWindow`).
- **Renderer (`gui/dist/index.html`, `gui/src/ui-*.ts`)** — навигация на 4 вкладки:
  1. **Installation** — проверяет Node/npm и запускает установку зависимостей (`npm install`, `npx playwright install`).
  2. **Backup** — кнопка `Start backup` → `npm run run-backup`, окно логов, индикатор статуса.
  3. **Statistics** — три карточки (`total`, `needing backup`, `with errors`) + таблица `backups`. Поиск/фильтры предусмотрены в коде, но UI‑элементы минимальны (тоггл поиска).
  4. **Config** — форма для `FIGMA_ACCOUNT_1_EMAIL`, `FIGMA_ACCOUNT_1_AUTH_COOKIE`, `FIGMA_ACCESS_TOKEN`, `DOWNLOAD_PATH`, `PROJECTS`, `TEAMS`. `WAIT_TIMEOUT` жёстко фиксирован на `10000` мс.
  > Экран Diagnostics присутствует в коде (`ui-settings.ts`) и скрыт в меню (`index.html` закомментирована ссылка).
- **Утилиты (`gui/src/utils/*.ts`)**:
  - `EnvManager` — читает/пишет `.userData/.env` (включая `CONFIG_VERSION=1.0`), выполняет базовую валидацию.
  - `ScriptRunner` — обёртка вокруг `spawn`, умеет парсить прогресс из stdout (`[x/y]`, `Downloaded…`).
  - `DatabaseManager` — лениво открывает SQLite (`.userData/figma_backups.db`), предоставляет запросы и `resetErrors()`.
  - `NodeChecker` — проверяет `node --version` / `which node`, при необходимости умеет запускать `brew install node@20` (используется вручную).
  - `Logger` — пишет ротационные логи в `~/Library/Application Support/Figma Export GUI/logs/figma-export-gui.log`.

---

## 6. Конфигурация (`.env`)

Файл конфигурации располагается в `.userData/.env` и игнорируется системой контроля версий.

| Переменная | Обязательна | Описание |
| --- | --- | --- |
| `FIGMA_ACCESS_TOKEN` | Да | Personal Access Token (`figd_…`). Используется в `backup/figma-lib.js` и Playwright.
| `FIGMA_ACCOUNT_<N>_EMAIL` | Да (минимум один) | Email аккаунта для Playwright авторизации. Для cookie‑режима поле можно оставить пустым.
| `FIGMA_ACCOUNT_<N>_PASSWORD` | Опционально | Пароль, если используем логин/пароль. Не используется в текущем GUI (форма содержит только email + cookie).
| `FIGMA_ACCOUNT_<N>_AUTH_COOKIE` | Опционально | Значение `__Host-figma.authn`. В GUI поле обязательно, если не планируется вводить пароль вручную в браузере.
| `DOWNLOAD_PATH` | Да | Абсолютный путь до каталога, куда Playwright будет сохранять файлы. Структура: `/…/Downloads/<team>/<Project name (id)>/<filename (key)>.fig`.
| `TEAMS` / `PROJECTS` | Достаточно заполнить одну | Списки ID через пробел/запятую. `run-backup` выберет TEAMS в приоритете перед PROJECTS.
| `WAIT_TIMEOUT` | Да | Таймаут в миллисекундах, передаётся в Playwright (`timeout = WAIT_TIMEOUT + 120s`). GUI всегда записывает `10000`.

> **Примечание:** GUI показывает только поля первого аккаунта. Для второго/третьего аккаунтов `.userData/.env` необходимо редактировать вручную (шаблон `FIGMA_ACCOUNT_2_EMAIL` и т.д.).

---

## 7. База данных

- Файл: `.userData/figma_backups.db` (sqlite3).
- Таблица `backups` создаётся автоматически (см. `backup/db.js`).

| Поле | Тип | Описание |
| --- | --- | --- |
| `file_key` | TEXT (PK) | Идентификатор файла Figma (используется в ссылках и при скачивании).
| `project_name` | TEXT | Имя проекта, чтобы группировать отчёты.
| `file_name` | TEXT | Человекочитаемое имя файла в Figma.
| `last_backup_date` | TEXT | ISO‑дата последнего успешного скачивания.
| `last_modified_date` | TEXT | Последняя дата правки в Figma (нормализуется до секунды).
| `next_attempt_date` | TEXT | Дата следующей попытки, если загрузка упала (`recordBackupFailure` откладывает на +72h).

`getFilesToBackup()` возвращает записи, где `last_modified_date > last_backup_date` или `last_backup_date IS NULL`, а также `next_attempt_date <= now`. Очередь сортируется так, чтобы приоритет имели никогда не скачанные файлы.

---

## 8. Файлы и каталоги рантайма
- `files.json` — всегда перегенерируется перед запуском Playwright и хранится в `.userData/`. Если `TEAMS/PROJECTS` не заданы, `run-backup` завершится без создания файла.
- `.auth/user.json` — storage state Playwright, генерируется из `auth.setup.ts`. Папка `.auth` создаётся автоматически.
- `playwright-report/` и `test-results/` — стандартные артефакты Playwright.
- `downloads/` или значение `DOWNLOAD_PATH` — структура `<team(optional)>/<project name (id)>/<file name (key)>.fig`.
- `logs/*` — в корне нет логов GUI, зато Electron сохраняет их в `~/Library/Application Support/Figma Export GUI/logs` (см. Logger).

---

## 9. Запуск и сценарии

### 9.1 Терминал
```bash
# 1. Установка зависимостей
npm install && npx playwright install

# 2. Заполнение `.userData/.env` (см. .env.example)

# 3. Запуск полной процедуры
npm run run-backup
```
Дополнительно доступны:
- `node backup/get-project-files.js 123 456`
- `node backup/get-team-files.js 789`
- `npx playwright test automations/download.spec.ts --debug`
- `node backup/generate-db-report.js` → `backup_report.html`

### 9.2 GUI
```bash
cd gui
npm install
npm run main        # очистка dist + build + electron .
```
Далее использовать вкладки:
1. **Installation** → Install Dependencies (важно запускать до Config).
2. **Backup** → `Start backup` (выполняет `npm run run-backup`).
3. **Statistics** → просмотреть таблицу (в режиме read-only).
4. **Config** → заполнить поля и `Save settings`.
> Экран Diagnostics есть в коде, но ссылка в сайдбаре закомментирована.

---

## 10. Логирование и диагностика
- CLI выводит прогресс в STDOUT/STDERR (сохраняется в GUI‑журнал, если запуск через UI).
- Playwright генерирует `playwright-report` (HTML) и `test-results/`.
- GUI журнал (`Logger`) реализует ротацию по 10 МБ, хранит до 5 файлов.
- Диагностический экран пока не читает реальный файл логов — выводит лишь сообщения, сформированные в рантайме.

---

## 11. Известные ограничения / TODO
1. **Жёстко закодированный rsync** в `backup/run-backup.js` → требуется вынести в конфигурацию или удалить для нейтральной сборки.
2. **`MAX_FILES = 3`** — ограничивает пропускную способность. Для полного бэкапа больших проектов придётся поднимать лимит вручную.
3. **GUI Config** поддерживает только поля первого аккаунта и не умеет редактировать `WAIT_TIMEOUT`, `MAX_FILES`, `RETRY_DELAY_HOURS` и т.п.
4. **Installation tab** не пытается ставить Node.js — пользователь должен сделать это вручную (несмотря на подсказки в интерфейсе).
5. **Download tab** не предоставляет выбор команды, нет кнопки Stop (закомментирована), нет сохранения логов между сессиями.
6. **Statistics tab** рендерит метрики и таблицу, но поиск/фильтры/экспорт практически отсутствуют (есть только тумблер поиска).
7. **Diagnostics** скрыт из меню; экран показывает версии Node/npm и временный лог, но не читает реальные логи и не проверяет Playwright/БД/права.
8. **Electron окно** создано без `contextIsolation: true` (строка закомментирована) — для продакшена рекомендуется включить.
9. **`start-gui.command`** отсутствует в репозитории (README и старые документы упоминали его). Лаунчер нужно добавить или обновить инструкции.
10. **Многоязычие UI** — часть интерфейса на английском, часть подсказок/доков на русском.

---

## 12. Связанные документы
- `README.md` — общая инструкция по CLI/GUI.
- `docs/Figma-Export-GUI-PRD.md` — продуктовые требования (обновлены в том же коммите).
- `docs/Figma-Export-GUI-User-Guide.md` — руководство пользователя.

Документ следует обновлять при каждом существенном изменении архитектуры или бизнес‑логики.
