// Убедимся, что переменная ELECTRON_RUN_AS_NODE не установлена
if (process.env.ELECTRON_RUN_AS_NODE) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}

import { app, BrowserWindow, ipcMain, dialog, Notification } from 'electron';
import { join } from 'path';
import { Logger } from './renderer/utils/logger';
import { EnvManager } from './renderer/utils/env-manager';
import { DatabaseManager } from './renderer/utils/db-reader';
import { ScriptRunner } from './renderer/utils/script-runner';
import { NodeChecker } from './renderer/utils/node-checker';

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
        preload: join(__dirname, 'preload.js'),
        //contextIsolation: true,
        nodeIntegration: false
      },
      //titleBarStyle: 'hiddenInset'
    });

    // Загрузка HTML файла
    const indexPath = app.isPackaged
      ? join(__dirname, 'index.html')
      : join(__dirname, 'index.html');
    
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
      return await this.dbManager.getAllBackups();
    });

    ipcMain.handle('get-statistics', async () => {
      return await this.dbManager.getStatistics();
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
  }
}

// Запуск приложения
const appInstance = new FigmaExportApp();

// Экспорт для тестирования
export { appInstance };