// Убедимся, что переменная ELECTRON_RUN_AS_NODE не установлена
if (process.env.ELECTRON_RUN_AS_NODE) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}

import fs from 'fs';
import path from 'path';
import { app, BrowserWindow, ipcMain, dialog, Notification, shell } from 'electron';
import { Logger } from './utils/logger';
import { EnvManager } from './utils/env-manager';
import { BackupRecord, DatabaseManager } from './utils/db-reader';
import { ScriptRunner } from './utils/script-runner';
import { NodeChecker } from './utils/node-checker';

class FigmaExportApp {
  private mainWindow: BrowserWindow | null = null;
  private logger: Logger;
  private envManager: EnvManager;
  private dbManager: DatabaseManager;
  private scriptRunner: ScriptRunner;
  private nodeChecker: NodeChecker;

  constructor() {
    this.logger = new Logger();
    this.envManager = new EnvManager();
    this.dbManager = new DatabaseManager();
    this.scriptRunner = new ScriptRunner();
    this.nodeChecker = new NodeChecker();
    
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
        preload: path.join(__dirname, 'utils', 'preload.js'),
        //contextIsolation: true,
        nodeIntegration: false
      },
      //titleBarStyle: 'hiddenInset'
    });

    // Загрузка HTML файла
    const indexPath = app.isPackaged
      ? path.join(__dirname, 'src', 'static', 'index.html')
      : path.join(__dirname, 'src', 'static', 'index.html');
    
    this.mainWindow.loadFile(indexPath);
    
    // DevTools в development
    if (!app.isPackaged) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  private setupIPC(): void {
    // System checks
    ipcMain.handle('check-nodejs', async () => {
      return await this.nodeChecker.checkNodeJS();
    });

    ipcMain.handle('check-npm', async () => {
      try {
        const version = require('child_process').execSync('npm --version', { encoding: 'utf8' }).trim();
        const path = require('child_process').execSync('which npm', { encoding: 'utf8' }).trim();
        const versionNumber = version;
        const majorVersion = parseInt(versionNumber.split('.')[0]);
        
        return {
          installed: true,
          version,
          path,
          meetsRequirement: majorVersion >= 8
        };
      } catch (error) {
        this.logger.error('npm not found: ' + error);
        return { installed: false };
      }
    });

    // Installation
    ipcMain.handle('install-dependencies', async () => {
      return await this.scriptRunner.installDependencies();
    });

    // Environment management
    ipcMain.handle('read-env', async () => {
      return await this.envManager.readEnv();
    });

    ipcMain.handle('write-env', async (event: any, config: Record<string, string>) => {
      return await this.envManager.writeEnv(config);
    });

    ipcMain.handle('validate-config', async (event: any, config: Record<string, string>) => {
      return await this.envManager.validateConfig(config);
    });

    // Script execution
    ipcMain.handle('run-script', async (event: any, command: string) => {
      return await this.scriptRunner.runScript(command, (data: string) => {
        this.mainWindow?.webContents.send('script-output', data);
      });
    });

    ipcMain.handle('run-script-with-progress', async (event: any, command: string) => {
      return await this.scriptRunner.runScript(command, 
        (data: string) => {
          this.mainWindow?.webContents.send('script-output', data);
        },
        (progress: any) => {
          this.mainWindow?.webContents.send('script-progress', progress);
        }
      );
    });

    ipcMain.handle('stop-script', async () => {
      return await this.scriptRunner.stopScript();
    });

    // Database operations
    ipcMain.handle('query-db', async (event: any, sql: string, params?: any[]) => {
      return await this.dbManager.query(sql, params);
    });

    ipcMain.handle('get-backups-needing-backup', async () => {
      return await this.dbManager.getBackupsNeedingBackup();
    });

    ipcMain.handle('get-all-backups', async () => {
      const backups = await this.dbManager.getAllBackups();
      return await this.enrichBackupsWithFileStatus(backups);
    });

    ipcMain.handle('get-statistics', async () => {
      const baseStats = await this.dbManager.getStatistics();

      try {
        const backups = await this.dbManager.getAllBackups();
        const enriched = await this.enrichBackupsWithFileStatus(backups);
        const withErrors = enriched.filter(b => Boolean(b.next_attempt_date)).length;

        const needingBackup = enriched.reduce((count, backup) => {
          const hasNextAttempt = Boolean(backup.next_attempt_date);
          const lastBackup = backup.last_backup_date ? new Date(backup.last_backup_date).getTime() : null;
          const lastModified = backup.last_modified_date ? new Date(backup.last_modified_date).getTime() : null;
          const modifiedAfterBackup = lastModified !== null && (lastBackup === null || lastModified > lastBackup);

          return hasNextAttempt || modifiedAfterBackup || lastBackup === null ? count + 1 : count;
        }, 0);

        return { ...baseStats, withErrors, needingBackup };
      } catch (error: any) {
        this.logger.warn(`Failed to enrich statistics with backup file status: ${error?.message || error}`);
        return baseStats;
      }
    });

    ipcMain.handle('reset-errors', async () => {
      return await this.dbManager.resetErrors();
    });

    // File operations
    ipcMain.handle('select-directory', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory']
      });
      return result.filePaths[0] || '';
    });

    // System notifications
    ipcMain.handle('show-notification', async (event: any, options: { title: string; body: string }) => {
      new Notification({
        title: options.title,
        body: options.body
      }).show();
    });

    ipcMain.handle('open-external', async (_event: any, url: string) => {
      if (url) {
        await shell.openExternal(url);
      }
    });
  }

  /**
   * Enriches backups with a flag about physical presence of the backup file.
   * If the file is missing, forces next_attempt_date to now for display purposes.
   */
  private async enrichBackupsWithFileStatus(backups: BackupRecord[]): Promise<Array<BackupRecord & { backup_missing: boolean }>> {
    const envConfig = await this.envManager.readEnv();
    const downloadPath = envConfig?.DOWNLOAD_PATH;

    if (!downloadPath) {
      this.logger.warn('DOWNLOAD_PATH is not configured; skipping backup file existence check.');
      return backups.map(backup => ({ ...backup, backup_missing: false }));
    }

    if (!fs.existsSync(downloadPath)) {
      this.logger.warn(`DOWNLOAD_PATH does not exist: ${downloadPath}`);
      return backups.map(backup => ({ ...backup, backup_missing: false }));
    }

    const fileKeys = new Set(backups.map(b => b.file_key).filter(Boolean));
    if (fileKeys.size === 0) {
      return backups.map(backup => ({ ...backup, backup_missing: false }));
    }

    const nowIso = new Date().toISOString();
    const existingKeys = await this.findExistingBackupKeys(downloadPath, fileKeys);

    return backups.map(backup => {
      const missing = backup.file_key ? !existingKeys.has(backup.file_key) : true;
      return {
        ...backup,
        backup_missing: missing,
        next_attempt_date: missing ? nowIso : backup.next_attempt_date
      };
    });
  }

  private async findExistingBackupKeys(root: string, fileKeys: Set<string>): Promise<Set<string>> {
    const found = new Set<string>();
    const stack = [root];

    while (stack.length > 0 && found.size < fileKeys.size) {
      const current = stack.pop() as string;
      let entries: fs.Dirent[];

      try {
        entries = await fs.promises.readdir(current, { withFileTypes: true });
      } catch (error: any) {
        this.logger.warn(`Cannot read directory ${current}: ${error?.message || error}`);
        continue;
      }

      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);

        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }

        if (!entry.isFile()) continue;

        for (const key of fileKeys) {
          if (entry.name.includes(key)) {
            found.add(key);
            break;
          }
        }
      }
    }

    return found;
  }
}

// Запуск приложения
const appInstance = new FigmaExportApp();

// Экспорт для тестирования
export { appInstance };
