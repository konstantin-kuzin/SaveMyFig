# SaveMy.Fig

SaveMy.Fig — графический интерфейс (Electron) для массового скачивания файлов Figma (.fig/.jam/.deck) с очередями, автоматической авторизацией и учётом бэкапов в SQLite.

## Назначение проекта

Инструмент позволяет без терминала подготовить конфиг `.env`, установить зависимости, запустить резервное копирование файлов Figma и отслеживать прогресс/статистику. Основные особенности:
- очередь по TEAMS/PROJECTS с ограничением числа файлов за прогон;
- поддержка нескольких аккаунтов Figma с ротацией для обхода квот;
- headed Playwright-запуск для стабильной авторизации;
- SQLite-база `figma_backups.db` для дат бэкапов и повторов неудачных загрузок.

## Принцип работы скрипта бэкапа

1. Очередь формируется по `PROJECTS` или `TEAMS`, указанных в `.userData/.env`.
2. Для каждого файла выбирается учётка Figma и токен/cookie для Playwright.
3. Скрипт `npm run run-backup` открывает Figma в headed-режиме и скачивает `.fig/.jam/.deck` в `DOWNLOAD_PATH/<team?>/<Project name (project.id)>/<File name (file.key)>.fig`.
4. После скачивания обновляется таблица `backups` в `.userData/figma_backups.db`; ошибки отправляются в повторные попытки.

## Принцип работы GUI

- **Installation**: ставит зависимости в корне (`npm install`, `npx playwright install`) и в `gui/`.
- **Config**: редактирует `.userData/.env` (токен, email, auth cookie, пути, PROJECTS/TEAMS, таймауты).
- **Backup**: запускает `npm run run-backup`, показывает лог и статус очереди.
- **Statistics**: выводит карточки и таблицу `backups`; отсутствующие на диске файлы помечаются ⚠.
- Диагностика и остановка процесса в интерфейсе пока закомментированы в коде.

## Установка и запуск GUI (macOS)

Инструкция рассчитана на пользователей без опыта работы в терминале.

1) **Разрешите запуск .command** (делается один раз):
```bash
chmod +x install.command backup.command
```
После этого их можно открывать двойным кликом.

2) **Запустите install.command** — это первый и главный шаг.
- Дважды кликните `install.command` в корне проекта (или выполните `./install.command` в терминале).
- Скрипт сам:
  - скачает и включит portable Node.js 20.17.0, если npm не установлен;
  - установит зависимости в корне и Playwright Chromium;
  - установит зависимости GUI в `gui/`;
  - откроет графический интерфейс. Лог установки: `.install.log`.
- Повторять этот шаг нужно только если обновлялись зависимости или если установка прерывалась.

3) **Настройте GUI**:
- Вкладка Installation: при необходимости нажмите `Install Dependencies` (повторит установку).
- Вкладка Config: введите токен `figd_...`, email, auth cookie `__Host-figma.authn`, выберите папку загрузки и IDs в `PROJECTS` или `TEAMS`, нажмите **Save settings**.
  - Если в Diagnostics → Figma API Access подсвечиваются красным строки `FIGMA_ACCOUNT_1_EMAIL` или `FIGMA_ACCOUNT_1_AUTH_COOKIE`, проверьте, что ключи в `.userData/.env` записаны точно так: `FIGMA_ACCOUNT_1_EMAIL=...` и `FIGMA_ACCOUNT_1_AUTH_COOKIE=...`, затем перезапустите GUI.

4) **Запускайте бэкап**:
- Для повторных запусков без переустановки используйте `backup.command` (двойной клик или `./backup.command` в терминале) — он просто открывает GUI.
- Во вкладке Backup нажмите **Start backup**. Прогресс и ошибки видно сразу, скачанные файлы окажутся в выбранном `DOWNLOAD_PATH`.

## Конфигурация (.userData/.env)

```bash
FIGMA_ACCESS_TOKEN="figd_..."

FIGMA_ACCOUNT_1_EMAIL="user@example.com"
FIGMA_ACCOUNT_1_AUTH_COOKIE="__Host-figma.authn=..."
# Опционально: FIGMA_ACCOUNT_1_PASSWORD="..."

DOWNLOAD_PATH="/Users/you/Figma-backups"
PROJECTS="12345 67890"   # или TEAMS="11111 22222"
WAIT_TIMEOUT="10000"
```

Все секреты и рабочие данные (`.env`, `figma_backups.db`, `files.json`, Playwright отчёты) лежат в `.userData/`. В прод-сборке Electron папка хранится в `~/Library/Application Support/SaveMy.Fig/.userData`.

## Структура

```
SaveMy.Fig/
├── .userData/               # Пользовательские файлы, логи
├── backup/                  # Скрипты бекапа
├── gui/                     # Electron GUI
└── automations/             # Playwright-автотесты скачивания
```
