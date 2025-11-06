# Техническая спецификация: GUI для Figma Export Tool

## Версия документа: 1.0
**Дата создания:** 29 октября 2025  
**Автор:** Kilo Code  
**Платформа:** macOS  
**Статус:** Готов к реализации

---

## 1. Обзор проекта

### 1.1 Назначение документа
Данный документ представляет собой детальный технический план реализации графического интерфейса для CLI инструмента Figma-export. Спецификация основана на существующем коде и PRD требованиях, определяет архитектуру, технологии и этапы разработки.

### 1.2 Текущее состояние
Проект уже имеет базовую структуру Electron приложения с минимальным функционалом:
- Базовый Electron main process ([`main.js`](../main.js:1))
- Простой preload script ([`preload.js`](../preload.js:1))
- Базовый UI с 4 шагами ([`renderer/index.html`](../renderer/index.html:1))
- Упрощенная логика управления ([`renderer/app.js`](../renderer/app.js:1))

### 1.3 Цель реализации
Расширить существующий базовый прототип до полнофункционального GUI приложения в соответствии с PRD требованиями, добавив все недостающие функции и улучшив архитектуру.

---

## 2. Архитектура решения

### 2.1 Общая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                     │
├─────────────────────────────────────────────────────────────┤
│  Main Process (main.ts)                                    │
│  ├── System Integration                                    │
│  ├── IPC Handlers                                          │
│  ├── Process Management                                    │
│  └── Database Operations                                   │
├─────────────────────────────────────────────────────────────┤
│  Preload Script (preload.ts)                               │
│  └── Secure IPC Bridge                                     │
├─────────────────────────────────────────────────────────────┤
│  Renderer Process (renderer/)                              │
│  ├── UI Components                                         │
│  ├── State Management                                      │
│  └── User Interaction                                      │
├─────────────────────────────────────────────────────────────┤
│  Backend Integration                                       │
│  ├── CLI Scripts (scripts/)                               │
│  ├── SQLite Database (figma_backups.db)                   │
│  └── Configuration (.env)                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Технологический стек

#### Основные технологии
- **Framework:** Electron v28+ (уже используется в проекте)
- **Language:** TypeScript (миграция с JavaScript)
- **Runtime:** Node.js v20 LTS
- **Database:** SQLite3 (уже используется)
- **Process Management:** execa (замена spawn)
- **Configuration:** dotenv (уже используется)

#### Дополнительные зависимости
```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "better-sqlite3": "^9.0.0",
    "dotenv": "^16.0.0",
    "execa": "^8.0.0"
  },
  "devDependencies": {
    "@electron/rebuild": "^3.3.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

### 2.3 Структура проекта

```
figma-export/
├── gui/                          # GUI обертка (новая структура)
│   ├── package.json             # Зависимости GUI
│   ├── tsconfig.json            # Конфигурация TypeScript
│   ├── main.ts                  # Main process (Electron)
│   ├── preload.ts               # Preload script (IPC bridge)
│   ├── renderer/                # Renderer process
│   │   ├── index.html          # UI markup
│   │   ├── styles.css          # Стили
│   │   ├── renderer.ts         # UI логика на TypeScript
│   │   └── components/         # UI компоненты
│   │       ├── welcome.ts      # Экран установки
│   │       ├── config.ts       # Экран конфигурации
│   │       ├── backup.ts       # Экран выполнения бэкапа
│   │       ├── statistics.ts   # Экран статистики
│   │       └── settings.ts     # Экран настроек
│   └── utils/                   # Утилиты
│       ├── node-checker.ts     # Проверка Node.js
│       ├── installer.ts        # Установка зависимостей
│       ├── env-manager.ts      # Управление .env
│       ├── db-reader.ts        # Чтение SQLite
│       ├── script-runner.ts    # Запуск npm скриптов (execa)
│       ├── validator.ts        # Валидация ввода
│       └── logger.ts           # Логирование и диагностика
├── scripts/                      # Оригинальные скрипты (без изменений)
├── playwright.config.ts         # Конфигурация Playwright
├── package.json                 # Оригинальный package.json
├── .env                         # Конфигурация (создается через GUI)
├── files.json                   # Список файлов (генерируется)
├── figma_backups.db            # База данных (SQLite)
├── logs/                        # Директория логов
│   └── figma-export-gui.log    # Основной лог-файл
└── start-gui.command            # Лаунчер для macOS
```

---

## 3. Детальная реализация модулей

### 3.1 Main Process (main.ts)

#### 3.1.1 Инициализация приложения
```typescript
import { app, BrowserWindow, ipcMain, dialog, Notification } from 'electron';
import { join } from 'path';
import { Logger } from './utils/logger';
## 11. Устранение типичных проблем

### 11.1 Ошибка `Cannot read properties of undefined (reading 'whenReady')`

**Симптом:** При запуске Electron приложения возникает ошибка:
```
TypeError: Cannot read properties of undefined (reading 'whenReady')
```

**Причины:**
1. Установлена переменная окружения `ELECTRON_RUN_AS_NODE`, при которой процесс запускается как «чистый» Node и модуль electron не предоставляет объект app в рантайме.
2. Скрипт main запущен не через бинарь Electron, а обычной командой `node main.js`, поэтому `require('electron')` не возвращает корректный модуль для главного процесса.
3. Некорректный импорт или ранний доступ до загрузки модуля: импортировать нужно именно из `electron` (или `electron/main`) согласно документации главного процесса.

**Решение:**
1. Убедиться, что нет переменной окружения `ELECTRON_RUN_AS_NODE`:
   ```bash
   unset ELECTRON_RUN_AS_NODE
   ```

2. Запускать проект через Electron, а не Node:
   ```bash
   npm run start
   # или
   npx electron .
   ```

3. Проверить импорт в main файле:
   ```typescript
   import { app, BrowserWindow, ipcMain, dialog, Notification } from 'electron';
   ```

4. Убедиться, что в package.json указан правильный путь к основному файлу:
   ```json
   {
     "main": "dist/main.js"
   }
   ```

**Примечание:** В новых версиях Electron (например, 39.0.0 и выше) структура установки может измениться, и файл `node_modules/electron/index.js` может возвращать путь к исполняемому файлу, а не объект с API. В таких случаях рекомендуется использовать стабильные версии Electron (например, 28.x.x) или использовать скомпилированные файлы из папки `dist` для запуска приложения.

**Дополнительная информация:**
- В главном процессе Electron API должны быть доступны через стандартный импорт
- Не используйте `require('electron')` для получения отдельных компонентов, если не уверены в структуре установки
- При использовании TypeScript, убедитесь, что скомпилированный JavaScript файл также использует правильные импорты
import { EnvManager } from './utils/env-manager';
import { DatabaseManager } from './utils/db-reader';
import { ScriptRunner } from './utils/script-runner';
#### Особенности работы с разными версиями Electron

Следует учитывать, что в разных версиях Electron могут быть различия в архитектуре установки:

- **Electron 28.x.x и более ранние версии**: `require('electron')` возвращает объект с API
- **Electron 39.x и более новые версии**: файл `node_modules/electron/index.js` может возвращать путь к исполняемому файлу, а не объект с API

При работе с новыми версиями Electron рекомендуется:
1. Проверять структуру установки перед началом разработки
2. Использовать скомпилированные файлы из папки `dist` для запуска приложения
3. Убедиться, что переменная окружения `ELECTRON_RUN_AS_NODE` не установлена
4. Запускать приложение через `npx electron .` или `npm run start`, а не через `node main.js`

В случае проблем с импортом API в новых версиях Electron, может потребоваться использовать альтернативные методы получения доступа к API, такие как:
- Использование `process.mainModule.require('electron')` вместо `require('electron')`
- Прямое обращение к глобальным переменным, предоставляемым Electron в главном процессе
- Использование динамического импорта в определенных сценариях

class FigmaExportApp {
  private mainWindow: BrowserWindow | null = null;
  private logger: Logger;
  private envManager: EnvManager;
  private dbManager: DatabaseManager;
  private scriptRunner: ScriptRunner;

  constructor() {
    this.logger = new Logger();
    this.envManager = new EnvManager();
    this.dbManager = new DatabaseManager();
    this.scriptRunner = new ScriptRunner();
    
    this.setupApp();
    this.setupIPC();
  }

  private setupApp(): void {
    app.whenReady().then(() => this.createWindow());
    
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 1000,
      minHeight: 600,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        enableRemoteModule: false
      },
      titleBarStyle: 'hiddenInset'
    });

    this.mainWindow.loadFile(join(__dirname, 'renderer/index.html'));
    
    // DevTools в development
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }
  }
}
```

#### 3.1.2 IPC Handlers
```typescript
private setupIPC(): void {
  // System checks
  ipcMain.handle('check-nodejs', async () => {
    return await this.checkNodeJS();
  });

  // Installation
  ipcMain.handle('install-dependencies', async () => {
    return await this.scriptRunner.installDependencies();
  });

  // Environment management
  ipcMain.handle('read-env', async () => {
    return await this.envManager.readEnv();
  });

  ipcMain.handle('write-env', async (event, config: Record<string, string>) => {
    return await this.envManager.writeEnv(config);
  });

  // Script execution
  ipcMain.handle('run-script', async (event, command: string) => {
    return await this.scriptRunner.runScript(command, (data) => {
      this.mainWindow?.webContents.send('script-output', data);
    });
  });

  ipcMain.handle('stop-script', async () => {
    return await this.scriptRunner.stopScript();
  });

  // Database operations
  ipcMain.handle('query-db', async (event, sql: string, params?: any[]) => {
    return await this.dbManager.query(sql, params);
  });

  // File operations
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(this.mainWindow!, {
      properties: ['openDirectory']
    });
    return result.filePaths[0] || '';
  });
}
```

### 3.2 Preload Script (preload.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // System operations
  checkNodeJS: () => ipcRenderer.invoke('check-nodejs'),
  
  // Installation
  installDependencies: () => ipcRenderer.invoke('install-dependencies'),
  
  // Environment management
  readEnv: () => ipcRenderer.invoke('read-env'),
  writeEnv: (config: Record<string, string>) => ipcRenderer.invoke('write-env', config),
  
  // Script execution
  runScript: (command: string) => ipcRenderer.invoke('run-script', command),
  stopScript: () => ipcRenderer.invoke('stop-script'),
  
  // Database operations
  queryDB: (sql: string, params?: any[]) => ipcRenderer.invoke('query-db', sql, params),
  
  // File operations
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // Event listeners
  onScriptOutput: (callback: (data: string) => void) => {
    ipcRenderer.on('script-output', (_, data) => callback(data));
  },
  
  onScriptProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('script-progress', (_, progress) => callback(progress));
  },
  
  onScriptComplete: (callback: (result: any) => void) => {
    ipcRenderer.on('script-complete', (_, result) => callback(result));
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
```

### 3.3 Утилиты

#### 3.3.1 Node.js Checker (utils/node-checker.ts)
```typescript
import { execSync } from 'child_process';
import { Logger } from './logger';

export class NodeChecker {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  async checkNodeJS(): Promise<{
    installed: boolean;
    version?: string;
    path?: string;
    meetsRequirement?: boolean;
  }> {
    try {
      const version = execSync('node --version', { encoding: 'utf8' }).trim();
      const path = execSync('which node', { encoding: 'utf8' }).trim();
      const versionNumber = version.replace('v', '');
      const majorVersion = parseInt(versionNumber.split('.')[0]);
      
      return {
        installed: true,
        version,
        path,
        meetsRequirement: majorVersion >= 20
      };
    } catch (error) {
      this.logger.error('Node.js not found: ' + error);
      return { installed: false };
    }
  }

  async installNodeJS(): Promise<{ success: boolean; message: string }> {
    try {
      // Проверка наличия Homebrew
      execSync('which brew', { encoding: 'utf8' });
      
      // Установка Node.js через Homebrew
      execSync('brew install node@20', { stdio: 'pipe' });
      
      return {
        success: true,
        message: 'Node.js v20 успешно установлен через Homebrew'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Ошибка установки Node.js. Установите вручную: https://nodejs.org'
      };
    }
  }
}
```

#### 3.3.2 Script Runner (utils/script-runner.ts)
```typescript
import { execa, ExecaError } from 'execa';
import { Logger } from './logger';

export class ScriptRunner {
  private logger: Logger;
  private currentProcess: ReturnType<typeof execa> | null = null;

  constructor() {
    this.logger = new Logger();
  }

  async installDependencies(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info('Starting npm install...');
      
      this.currentProcess = execa('npm', ['install'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 600000 // 10 минут
      });

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.logger.info(text);
      });

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.logger.warn(text);
      });

      await this.currentProcess;
      
      // Установка Playwright browsers
      this.logger.info('Installing Playwright browsers...');
      await execa('npx', ['playwright', 'install'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 300000 // 5 минут
      });

      return {
        success: true,
        message: 'Зависимости успешно установлены'
      };
    } catch (error: any) {
      this.logger.error('Installation failed: ' + error.message);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    } finally {
      this.currentProcess = null;
    }
  }

  async runScript(
    command: string, 
    onOutput?: (data: string) => void,
    onProgress?: (progress: any) => void
  ): Promise<{ success: boolean; message?: string }> {
    try {
      this.logger.info(`Running script: ${command}`);
      
      this.currentProcess = execa('npm', ['run', command], {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 3600000 // 1 час
      });

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.logger.info(text);
        onOutput?.(text);
        
        // Парсинг прогресса
        const progress = this.parseProgress(text);
        if (progress) {
          onProgress?.(progress);
        }
      });

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.logger.warn(text);
        onOutput?.(text);
      });

      const result = await this.currentProcess;
      
      return {
        success: true,
        message: `Команда ${command} выполнена успешно`
      };
    } catch (error: any) {
      this.logger.error(`Script ${command} failed: ${error.message}`);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    } finally {
      this.currentProcess = null;
    }
  }

  stopScript(): void {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.logger.info('Script stopped by user');
    }
  }

  private parseProgress(text: string): { current: number; total: number } | null {
    const patterns = [
      /(?:Downloaded|Скачано|Загрузили).*?(\d+)\/(\d+)/gi,
      /\[(\d+)\/(\d+)\]/gi,
      /Progress:?\s*(\d+)%/gi,
      /(\d+)\s*of\s*(\d+)\s*files?/gi
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          current: parseInt(match[1], 10),
          total: parseInt(match[2], 10)
        };
      }
    }
    return null;
  }

  private getErrorMessage(error: ExecaError): string {
    if (error.timedOut) {
      return 'Процесс превысил лимит времени';
    }
    if (error.signal) {
      return `Процесс завершен сигналом: ${error.signal}`;
    }
    if (error.code !== undefined) {
      return `Процесс завершился с кодом ошибки ${error.code}`;
    }
    return error.message || 'Неизвестная ошибка';
  }
}
```

#### 3.3.3 Environment Manager (utils/env-manager.ts)
```typescript
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { Logger } from './logger';

export class EnvManager {
  private logger: Logger;
  private envPath: string;

  constructor() {
    this.logger = new Logger();
    this.envPath = path.join(process.cwd(), '.env');
  }

  async readEnv(): Promise<Record<string, string>> {
    try {
      if (fs.existsSync(this.envPath)) {
        const envConfig = config({ path: this.envPath });
        return envConfig.parsed || {};
      }
      return {};
    } catch (error) {
      this.logger.error('Error reading .env file: ' + error);
      return {};
    }
  }

  async writeEnv(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
    try {
      let content = '';
      
      // Добавляем версию конфигурации
      content += `CONFIG_VERSION="1.0"\n`;
      
      // Записываем все параметры
      for (const [key, value] of Object.entries(config)) {
        if (value && value.trim() !== '') {
          content += `${key}="${value.trim()}"\n`;
        }
      }

      fs.writeFileSync(this.envPath, content, 'utf8');
      this.logger.info('.env file updated successfully');
      
      return {
        success: true,
        message: 'Конфигурация сохранена успешно'
      };
    } catch (error) {
      this.logger.error('Error writing .env file: ' + error);
      return {
        success: false,
        message: 'Ошибка сохранения конфигурации'
      };
    }
  }

  validateConfig(config: Record<string, string>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Валидация токена
    if (!config.FIGMA_ACCESS_TOKEN) {
      errors.push('FIGMA_ACCESS_TOKEN обязателен');
    } else if (!config.FIGMA_ACCESS_TOKEN.startsWith('figd_')) {
      errors.push('FIGMA_ACCESS_TOKEN должен начинаться с "figd_"');
    }

    // Валидация пути загрузки
    if (!config.DOWNLOAD_PATH) {
      errors.push('DOWNLOAD_PATH обязателен');
    } else {
      try {
        fs.accessSync(config.DOWNLOAD_PATH, fs.constants.W_OK);
      } catch {
        errors.push('DOWNLOAD_PATH недоступен для записи');
      }
    }

    // Валидация аккаунтов
    const hasAccount = 
      (config.FIGMA_ACCOUNT_1_EMAIL && config.FIGMA_ACCOUNT_1_PASSWORD) ||
      config.FIGMA_ACCOUNT_1_AUTH_COOKIE;
    
    if (!hasAccount) {
      errors.push('Минимум один аккаунт Figma обязателен');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

#### 3.3.4 Database Reader (utils/db-reader.ts)
```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { Logger } from './logger';

export interface BackupRecord {
  file_key: string;
  project_name: string;
  file_name: string;
  last_backup_date: string | null;
  last_modified_date: string;
  next_attempt_date: string | null;
}

export class DatabaseManager {
  private db: Database.Database;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    const dbPath = path.join(process.cwd(), 'figma_backups.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS backups (
        file_key TEXT PRIMARY KEY,
        project_name TEXT,
        file_name TEXT,
        last_backup_date TEXT,
        last_modified_date TEXT,
        next_attempt_date TEXT
      )
    `;
    
    this.db.exec(createTableSQL);
    this.logger.info('Database initialized');
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params);
    } catch (error) {
      this.logger.error(`Database query error: ${error}`);
      throw error;
    }
  }

  async getBackupsNeedingBackup(): Promise<BackupRecord[]> {
    const sql = `
      SELECT * FROM backups 
      WHERE (last_modified_date > last_backup_date OR last_backup_date IS NULL)
        AND (next_attempt_date IS NULL OR next_attempt_date <= datetime('now'))
      ORDER BY 
        CASE 
          WHEN last_backup_date IS NULL THEN 0
          ELSE 1
        END,
        last_backup_date ASC
    `;
    
    return await this.query(sql);
  }

  async getAllBackups(): Promise<BackupRecord[]> {
    const sql = 'SELECT * FROM backups ORDER BY last_backup_date DESC';
    return await this.query(sql);
  }

  async getStatistics(): Promise<{
    total: number;
    needingBackup: number;
    withErrors: number;
  }> {
    const total = await this.query('SELECT COUNT(*) as count FROM backups');
    const needingBackup = await this.query(`
      SELECT COUNT(*) as count FROM backups 
      WHERE (last_modified_date > last_backup_date OR last_backup_date IS NULL)
        AND (next_attempt_date IS NULL OR next_attempt_date <= datetime('now'))
    `);
    const withErrors = await this.query(`
      SELECT COUNT(*) as count FROM backups 
      WHERE next_attempt_date IS NOT NULL
    `);

    return {
      total: total[0].count,
      needingBackup: needingBackup[0].count,
      withErrors: withErrors[0].count
    };
  }

  async resetErrors(): Promise<{ success: boolean; message: string }> {
    try {
      const stmt = this.db.prepare(`
        UPDATE backups 
        SET next_attempt_date = NULL 
        WHERE next_attempt_date IS NOT NULL
      `);
      
      const result = stmt.run();
      this.logger.info(`Reset ${result.changes} error records`);
      
      return {
        success: true,
        message: `Сброшено ${result.changes} записей с ошибками`
      };
    } catch (error) {
      this.logger.error('Error resetting errors: ' + error);
      return {
        success: false,
        message: 'Ошибка сброса ошибок'
      };
    }
  }

  close(): void {
    this.db.close();
    this.logger.info('Database connection closed');
  }
}
```

#### 3.3.5 Logger (utils/logger.ts)
```typescript
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class Logger {
  private logFile: string;
  private maxLogSize = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 5;

  constructor() {
    const userDataPath = app ? app.getPath('userData') : process.cwd();
    const logsDir = path.join(userDataPath, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logFile = path.join(logsDir, 'figma-export-gui.log');
  }

  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logEntry);
      this.rotateLogsIfNeeded();
    } catch (error) {
      console.error('Logger error:', error);
    }
  }

  private rotateLogsIfNeeded(): void {
    try {
      const stats = fs.statSync(this.logFile);
      if (stats.size > this.maxLogSize) {
        const dir = path.dirname(this.logFile);
        const files = fs.readdirSync(dir)
          .filter(f => f.startsWith('figma-export-gui'))
          .sort()
          .reverse();
        
        if (files.length >= this.maxLogFiles) {
          fs.unlinkSync(path.join(dir, files[files.length - 1]));
        }
        
        const timestamp = Date.now();
        fs.renameSync(this.logFile, `${this.logFile}.${timestamp}`);
      }
    } catch (error) {
      console.error('Log rotation error:', error);
    }
  }

  info(message: string): void { this.log('INFO', message); }
  warn(message: string): void { this.log('WARN', message); }
  error(message: string): void { this.log('ERROR', message); }
  debug(message: string): void { this.log('DEBUG', message); }
}
```

---

## 4. UI Компоненты

### 4.1 Основная структура (renderer/index.html)

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figma Export GUI</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="app">
    <!-- Навигация -->
    <nav class="sidebar">
      <div class="logo">
        <h1>Figma Export</h1>
      </div>
      <ul class="nav-menu">
        <li><a href="#" data-tab="welcome" class="nav-link active">🏠 Установка</a></li>
        <li><a href="#" data-tab="config" class="nav-link">⚙️ Настройки</a></li>
        <li><a href="#" data-tab="backup" class="nav-link">📥 Скачивание</a></li>
        <li><a href="#" data-tab="statistics" class="nav-link">📊 Статистика</a></li>
        <li><a href="#" data-tab="settings" class="nav-link">🔧 Диагностика</a></li>
      </ul>
    </nav>

    <!-- Основной контент -->
    <main class="main-content">
      <!-- Экран установки -->
      <div id="welcome-tab" class="tab-content active">
        <div class="tab-header">
          <h2>Установка и настройка</h2>
          <p>Проверка системы и установка необходимых зависимостей</p>
        </div>
        <div class="tab-body">
          <div id="system-check" class="check-section">
            <h3>Проверка системы</h3>
            <div id="node-status" class="status-item">
              <span class="status-label">Node.js:</span>
              <span class="status-value">Проверка...</span>
            </div>
            <div id="npm-status" class="status-item">
              <span class="status-label">npm:</span>
              <span class="status-value">Проверка...</span>
            </div>
          </div>
          
          <div id="installation-section" class="install-section">
            <h3>Установка зависимостей</h3>
            <button id="install-btn" class="btn btn-primary" disabled>
              Установить зависимости
            </button>
            <div id="install-progress" class="progress-container hidden">
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
              <div class="progress-text">Установка...</div>
            </div>
            <div id="install-log" class="log-container hidden">
              <div class="log-content"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Экран конфигурации -->
      <div id="config-tab" class="tab-content">
        <div class="tab-header">
          <h2>Конфигурация</h2>
          <p>Настройка параметров Figma и путей загрузки</p>
        </div>
        <div class="tab-body">
          <form id="config-form">
            <!-- Figma Access Token -->
            <div class="form-section">
              <h3>Figma Access Token</h3>
              <div class="form-group">
                <label for="figma-token">Токен доступа:</label>
                <div class="input-group">
                  <input type="password" id="figma-token" name="FIGMA_ACCESS_TOKEN" 
                         placeholder="figd_..." required>
                  <button type="button" id="toggle-token" class="btn btn-secondary">👁️</button>
                </div>
                <small class="form-help">
                  <a href="https://www.figma.com/developers/api#authentication" target="_blank">
                    Как получить токен
                  </a>
                </small>
              </div>
            </div>

            <!-- Figma Accounts -->
            <div class="form-section">
              <h3>Аккаунты Figma</h3>
              <div id="accounts-container">
                <!-- Аккаунты будут добавлены динамически -->
              </div>
              <button type="button" id="add-account" class="btn btn-secondary">
                + Добавить аккаунт
              </button>
            </div>

            <!-- Пути и параметры -->
            <div class="form-section">
              <h3>Пути и параметры</h3>
              <div class="form-group">
                <label for="download-path">Папка для загрузки:</label>
                <div class="input-group">
                  <input type="text" id="download-path" name="DOWNLOAD_PATH" 
                         placeholder="Выберите папку" readonly required>
                  <button type="button" id="select-path" class="btn btn-secondary">📁</button>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="wait-timeout">Таймаут (мс):</label>
                  <input type="number" id="wait-timeout" name="WAIT_TIMEOUT" 
                         value="10000" min="5000" max="60000" required>
                </div>
                
                <div class="form-group">
                  <label for="max-files">Максимум файлов:</label>
                  <input type="number" id="max-files" name="MAX_FILES" 
                         value="45" min="1" max="200" required>
                </div>
              </div>
              
              <div class="form-group">
                <label for="retry-delay">Задержка повтора (часы):</label>
                <input type="number" id="retry-delay" name="RETRY_DELAY_HOURS" 
                       value="72" min="1" max="720" required>
              </div>
            </div>

            <!-- Team/Project IDs -->
            <div class="form-section">
              <h3>Выбор файлов</h3>
              <div class="form-group">
                <div class="radio-group">
                  <label>
                    <input type="radio" name="select-type" value="team" checked>
                    По Team IDs
                  </label>
                  <label>
                    <input type="radio" name="select-type" value="project">
                    По Project IDs
                  </label>
                </div>
              </div>
              
              <div class="form-group">
                <label for="team-ids" class="team-label">Team IDs:</label>
                <label for="project-ids" class="project-label hidden">Project IDs:</label>
                <textarea id="team-ids" name="TEAM_IDS" class="team-input" 
                          placeholder="team1,team2,team3" rows="3"></textarea>
                <textarea id="project-ids" name="PROJECT_IDS" class="project-input hidden" 
                          placeholder="project1,project2,project3" rows="3"></textarea>
                <small class="form-help">Максимум 50 ID, разделенных запятой</small>
              </div>
              
              <button type="button" id="generate-files" class="btn btn-secondary">
                🔄 Сгенерировать files.json
              </button>
            </div>

            <!-- Кнопки действий -->
            <div class="form-actions">
              <button type="button" id="load-config" class="btn btn-secondary">
                📂 Загрузить из .env
              </button>
              <button type="submit" class="btn btn-primary">
                💾 Сохранить конфигурацию
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Экран выполнения бэкапа -->
      <div id="backup-tab" class="tab-content">
        <div class="tab-header">
          <h2>Выполнение бэкапа</h2>
          <p>Запуск и мониторинг процесса скачивания файлов</p>
        </div>
        <div class="tab-body">
          <div class="backup-controls">
            <div class="form-group">
              <label for="script-command">Команда:</label>
              <select id="script-command" class="form-control">
                <option value="start">npm run start - основной запуск</option>
                <option value="retry">npm run retry - повтор неудачных</option>
                <option value="dry-run">npm run dry-run - предпросмотр</option>
                <option value="run-backup">npm run run-backup - полный цикл</option>
              </select>
            </div>
            
            <div class="backup-buttons">
              <button id="start-backup" class="btn btn-success">▶️ Start</button>
              <button id="stop-backup" class="btn btn-danger" disabled>⏹️ Stop</button>
              <button id="clear-log" class="btn btn-secondary">🗑️ Clear Log</button>
            </div>
          </div>
          
          <div class="backup-status">
            <div class="status-indicator">
              <span class="status-dot idle"></span>
              <span class="status-text">Idle</span>
            </div>
            <div class="progress-info">
              <span id="progress-text">Готов к запуску</span>
            </div>
          </div>
          
          <div class="log-container">
            <div id="backup-log" class="log-content"></div>
          </div>
        </div>
      </div>

      <!-- Экран статистики -->
      <div id="statistics-tab" class="tab-content">
        <div class="tab-header">
          <h2>Статистика и база данных</h2>
          <p>Просмотр информации о бэкапах и управление базой данных</p>
        </div>
        <div class="tab-body">
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-info">
                <div class="stat-value" id="total-files">0</div>
                <div class="stat-label">Всего файлов</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">⏳</div>
              <div class="stat-info">
                <div class="stat-value" id="needing-backup">0</div>
                <div class="stat-label">Требуют бэкапа</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">❌</div>
              <div class="stat-info">
                <div class="stat-value" id="with-errors">0</div>
                <div class="stat-label">С ошибками</div>
              </div>
            </div>
          </div>
          
          <div class="table-controls">
            <input type="text" id="table-search" placeholder="Поиск по имени файла или проекта...">
            <label>
              <input type="checkbox" id="filter-needing-backup">
              Только требующие бэкапа
            </label>
            <button id="refresh-data" class="btn btn-secondary">🔄 Обновить</button>
            <button id="export-csv" class="btn btn-secondary">📥 Экспорт CSV</button>
            <button id="reset-errors" class="btn btn-warning">🔧 Сбросить ошибки</button>
          </div>
          
          <div class="table-container">
            <table id="backups-table">
              <thead>
                <tr>
                  <th data-sort="file_key">Ключ файла</th>
                  <th data-sort="project_name">Проект</th>
                  <th data-sort="file_name">Имя файла</th>
                  <th data-sort="last_backup_date">Последний бэкап</th>
                  <th data-sort="last_modified_date">Изменен в Figma</th>
                  <th data-sort="next_attempt_date">Следующая попытка</th>
                </tr>
              </thead>
              <tbody id="backups-tbody">
                <!-- Данные будут добавлены динамически -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Экран диагностики -->
      <div id="settings-tab" class="tab-content">
        <div class="tab-header">
          <h2>Диагностика и настройки</h2>
          <p>Информация о системе и настройках приложения</p>
        </div>
        <div class="tab-body">
          <div class="diagnostic-section">
            <h3>Системная информация</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Node.js версия:</label>
                <span id="node-version">Проверка...</span>
              </div>
              <div class="info-item">
                <label>Node.js путь:</label>
                <span id="node-path">Проверка...</span>
              </div>
              <div class="info-item">
                <label>npm версия:</label>
                <span id="npm-version">Проверка...</span>
              </div>
              <div class="info-item">
                <label>npm путь:</label>
                <span id="npm-path">Проверка...</span>
              </div>
              <div class="info-item">
                <label>Версия GUI:</label>
                <span id="gui-version">1.0.0</span>
              </div>
              <div class="info-item">
                <label>Версия скрипта:</label>
                <span id="script-version">Проверка...</span>
              </div>
            </div>
          </div>
          
          <div class="diagnostic-section">
            <h3>Статус зависимостей</h3>
            <div id="deps-status" class="status-list">
              <!-- Статус будет добавлен динамически -->
            </div>
          </div>
          
          <div class="diagnostic-section">
            <h3>Доступ к файловой системе</h3>
            <div id="fs-status" class="status-list">
              <!-- Статус будет добавлен динамически -->
            </div>
          </div>
          
          <div class="diagnostic-section">
            <h3>Доступ к Figma API</h3>
            <div id="api-status" class="status-list">
              <!-- Статус будет добавлен динамически -->
            </div>
          </div>
          
          <div class="diagnostic-section">
            <h3>Логи приложения</h3>
            <div class="log-controls">
              <button id="refresh-logs" class="btn btn-secondary">🔄 Обновить</button>
              <button id="clear-logs" class="btn btn-warning">🗑️ Очистить</button>
              <button id="open-logs-folder" class="btn btn-secondary">📁 Открыть папку</button>
            </div>
            <div class="log-container">
              <div id="diagnostic-log" class="log-content"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script src="renderer.js"></script>
</body>
</html>
```

---

## 5. План реализации

### 5.1 Этапы разработки

#### Фаза 1: Подготовка и миграция (2-3 дня)
- [ ] Создание TypeScript конфигурации
- [ ] Миграция существующего кода на TypeScript
- [ ] Настройка сборки и разработки
- [ ] Создание структуры папок `gui/`

#### Фаза 2: Основные утилиты (3-4 дня)
- [ ] Реализация [`Logger`](utils/logger.ts:1) с ротацией логов
- [ ] Реализация [`NodeChecker`](utils/node-checker.ts:1) с установкой через Homebrew
- [ ] Реализация [`ScriptRunner`](utils/script-runner.ts:1) с полной обработкой ошибок
- [ ] Реализация [`EnvManager`](utils/env-manager.ts:1) с валидацией
- [ ] Реализация [`DatabaseManager`](utils/db-reader.ts:1) для работы с SQLite

#### Фаза 3: Main Process (2-3 дня)
- [ ] Миграция [`main.js`](../main.js:1) в [`main.ts`](main.ts:1)
- [ ] Реализация всех IPC handlers
- [ ] Интеграция с утилитами
- [ ] Настройка безопасности (contextIsolation)

#### Фаза 4: Preload Script (1 день)
- [ ] Миграция [`preload.js`](../preload.js:1) в [`preload.ts`](preload.ts:1)
- [ ] Определение безопасного API для renderer process
- [ ] Типизация всех IPC вызовов

#### Фаза 5: UI Компоненты (4-5 дней)
- [ ] Создание новой структуры HTML в соответствии с дизайном
- [ ] Реализация компонента установки (Welcome)
- [ ] Реализация компонента конфигурации (Config)
- [ ] Реализация компонента выполнения бэкапа (Backup)
- [ ] Реализация компонента статистики (Statistics)
- [ ] Реализация компонента диагностики (Settings)

#### Фаза 6: Renderer Logic (3-4 дня)
- [ ] Миграция [`app.js`](../renderer/app.js:1) в [`renderer.ts`](renderer/renderer.ts:1)
- [ ] Реализация навигации между вкладками
- [ ] Реализация управления состоянием
- [ ] Интеграция с preload API
- [ ] Обработка событий и пользовательского ввода

#### Фаза 7: Стили и UX (2-3 дня)
- [ ] Обновление [`style.css`](../renderer/style.css:1) для нового дизайна
- [ ] Реализация адаптивного дизайна
- [ ] Добавление анимаций и переходов
- [ ] Улучшение UX (индикаторы загрузки, прогресс-бары)

#### Фаза 8: Тестирование и отладка (2-3 дня)
- [ ] Тестирование всех функций
- [ ] Проверка обработки ошибок
- [ ] Тестирование на macOS
- [ ] Оптимизация производительности

#### Фаза 9: Упаковка и документация (1-2 дня)
- [ ] Создание [`start-gui.command`](start-gui.command:1) лаунчера
- [ ] Обновление README с инструкциями по установке
- [ ] Создание документации для пользователей
- [ ] Подготовка к распространению

### 5.2 Общая оценка трудозатрат
**Всего: 20-26 дней разработки**

---

## 6. Риски и митигация

### 6.1 Технические риски

#### Риск 1: Проблемы с миграцией на TypeScript
- **Вероятность:** Средняя
- **Влияние:** Среднее
- **Митигация:**
  - Постепенная миграция модулей
  - Использование строгой типизации с начала
  - Тестирование каждого модуля после миграции

#### Риск 2: Проблемы с установкой Node.js
- **Вероятность:** Средняя
- **Влияние:** Высокое
- **Митигация:**
  - Детальная проверка прав доступа
  - Четкие инструкции для пользователя
  - Резервный вариант с bundled Node.js

#### Риск 3: Несовместимость с существующими скриптами
- **Вероятность:** Низкая
- **Влияние:** Высокое
- **Митигация:**
  - НЕ модифицировать оригинальные скрипты
  - Тестирование с последней версией скриптов
  - Обратная совместимость в API

### 6.2 Пользовательские риски

#### Риск 1: Сложность первоначальной настройки
- **Вероятность:** Средняя
- **Влияние:** Среднее
- **Митигация:**
  - Подробные инструкции с скриншотами
  - Автоматическая проверка системы
  - Понятные сообщения об ошибках

#### Риск 2: Проблемы с правами доступа на macOS
- **Вероятность:** Средняя
- **Влияние:** Среднее
- **Митигация:**
  - Проверка прав перед операциями
  - Запрос повышенных прав при необходимости
  - Инструкции по решению проблем

---

## 7. Требования к качеству

### 7.1 Производительность
- Запуск приложения: < 3 секунд
- Отклик UI: < 100мс на действия пользователя
- Потребление памяти: < 200MB в простое
- Установка зависимостей: < 10 минут

### 7.2 Безопасность
- Использование `contextBridge` для IPC
- `nodeIntegration: false` в BrowserWindow
- `contextIsolation: true`
- Безопасное хранение токенов (только в .env)
- Валидация всех пользовательских вводов

### 7.3 Надежность
- Полная обработка ошибок во всех модулях
- Логирование всех операций
- Graceful degradation при ошибках
- Восстановление после сбоев

### 7.4 Совместимость
- macOS 11+ (Big Sur и новее)
- Node.js 20 LTS
- Electron 28+
- Экранное разрешение: минимальный 1280x720

---

## 8. Тестирование

### 8.1 Модульное тестирование
- Тестирование всех утилит
- Тестирование IPC handlers
- Тестирование валидации
- Тестирование обработки ошибок

### 8.2 Интеграционное тестирование
- Тестирование полного цикла бэкапа
- Тестирование установки зависимостей
- Тестирование работы с базой данных
- Тестирование сохранения/загрузки конфигурации

### 8.3 Пользовательское тестирование
- Тестирование на чистой системе
- Тестирование с разными версиями Node.js
- Тестирование с различными конфигурациями
- Тестирование обработки ошибок пользователя

---

## 9. Развитие и поддержка

### 9.1 Версионирование
- Использование семантического версионирования
- Обратная совместимость конфигурации
- Миграция между версиями

### 9.2 Обновления
- Автоматическая проверка обновлений (v2)
- Простое обновление через замену файлов
- Сохранение пользовательских данных при обновлении

### 9.3 Расширения (v2)
- Поддержка Windows и Linux
- Темный режим интерфейса
- Автообновление
- Планировщик бэкапов
- Графики статистики

---

## 10. Заключение

Данная техническая спецификация определяет полный план реализации GUI для Figma Export Tool. Основные преимущества предложенного решения:

1. **Сохранение существующего функционала** - GUI является оберткой над CLI
2. **Модернизация технологии** - миграция на TypeScript для надежности
3. **Полная функциональность** - все требования из PRD реализованы
4. **Безопасность** - изоляция процессов и безопасное управление токенами
5. **Расширяемость** - архитектура готова к будущим улучшениям

Реализация данной спецификации позволит создать современное, надежное и удобное приложение для массового скачивания Figma файлов, значительно упростив использование инструмента для пользователей с низким техническим уровнем подготовки.