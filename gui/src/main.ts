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
import { UpdatesChecker } from './utils/updates-checker';

class FigmaExportApp {
  private mainWindow: BrowserWindow | null = null;
  private logger: Logger;
  private envManager: EnvManager;
  private dbManager: DatabaseManager;
  private scriptRunner: ScriptRunner;
  private nodeChecker: NodeChecker;
  private updatesChecker: UpdatesChecker;
  private readonly githubRepo = 'konstantin-kuzin/SaveMyFig';

  constructor() {
    this.logger = new Logger();
    this.envManager = new EnvManager();
    this.dbManager = new DatabaseManager();
    this.scriptRunner = new ScriptRunner();
    this.nodeChecker = new NodeChecker();
    this.updatesChecker = new UpdatesChecker(this.githubRepo, this.logger);
    
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
      return await this.checkNpm();
    });

    ipcMain.handle('diagnostics:get-system-info', async () => {
      const [nodeInfo, npmInfo] = await Promise.all([
        this.nodeChecker.checkNodeJS(),
        this.checkNpm()
      ]);

      return {
        node: nodeInfo,
        npm: npmInfo,
        guiVersion: app.getVersion(),
        scriptVersion: this.getScriptVersion(),
        logFile: this.logger.getLogFilePath()
      };
    });

    ipcMain.handle('diagnostics:get-dependencies', async () => {
      return await this.getDependencyStatus();
    });

    ipcMain.handle('diagnostics:get-fs-status', async () => {
      return await this.getFsStatus();
    });

    ipcMain.handle('diagnostics:get-api-status', async () => {
      return await this.getApiStatus();
    });

    ipcMain.handle('diagnostics:read-logs', async () => {
      return await this.readAppLogs();
    });

    ipcMain.handle('diagnostics:clear-logs', async () => {
      return await this.clearAppLogs();
    });

    ipcMain.handle('diagnostics:open-logs-folder', async () => {
      const folder = this.logger.getLogsDir();
        await shell.openPath(folder);
      return { success: true, folder };
    });

    ipcMain.handle('updates:check', async () => {
      const currentVersion = this.getRootPackageVersion();
      return await this.updatesChecker.checkForUpdates(currentVersion);
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

  private async checkNpm(): Promise<{
    installed: boolean;
    version?: string;
    path?: string;
    meetsRequirement?: boolean;
  }> {
    try {
      const version = require('child_process').execSync('npm --version', { encoding: 'utf8' }).trim();
      const npmPath = require('child_process').execSync('which npm', { encoding: 'utf8' }).trim();
      const versionNumber = version;
      const majorVersion = parseInt(versionNumber.split('.')[0]);
      
      return {
        installed: true,
        version,
        path: npmPath,
        meetsRequirement: majorVersion >= 8
      };
    } catch (error) {
      this.logger.error('npm not found: ' + error);
      return { installed: false };
    }
  }

  private getScriptVersion(): string {
    const candidates = [
      path.join(this.resolveRepoRoot(), 'package.json'),
      path.join(app.getAppPath(), 'package.json')
    ];

    for (const candidate of candidates) {
      try {
        if (!fs.existsSync(candidate)) continue;
        const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (pkg?.version) {
          return pkg.version;
        }
      } catch (error) {
        this.logger.warn(`Unable to read version from ${candidate}: ${error}`);
      }
    }

    return 'unknown';
  }

  private resolveRepoRoot(): string {
    const baseFromRunner = this.scriptRunner.getBaseCwd();
    const candidates = [
      path.resolve(baseFromRunner, '..'),
      baseFromRunner,
      path.resolve(app.getAppPath(), '..'),
      path.resolve(app.getAppPath(), '..', '..'),
      process.cwd()
    ];

    for (const candidate of candidates) {
      try {
        const stat = fs.statSync(candidate);
        if (stat.isDirectory() && fs.existsSync(path.join(candidate, 'package.json'))) {
          return candidate;
        }
      } catch {
        // skip
      }
    }

    return candidates.find(c => fs.existsSync(c)) || process.cwd();
  }

  /**
   * Returns version strictly from the repository root package.json.
   * Falls back to Electron app version if root package is not found.
   */
  private getRootPackageVersion(): string {
    try {
      const repoRoot = this.resolveRepoRoot();
      const pkgPath = path.join(repoRoot, 'package.json');

      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg?.version) {
          return pkg.version;
        }
        this.logger.warn(`Version not found in ${pkgPath}`);
      } else {
        this.logger.warn(`Root package.json not found at ${pkgPath}`);
      }
    } catch (error: any) {
      this.logger.warn(`Failed to read root package version: ${error?.message || error}`);
    }

    return app.getVersion() || '0.0.0';
  }

  private async getDependencyStatus(): Promise<Array<{ name: string; ok: boolean; message: string }>> {
    const repoRoot = this.resolveRepoRoot();
    const guiDir = path.join(repoRoot, 'gui');
    const statuses: Array<{ name: string; ok: boolean; message: string }> = [];

    const rootNodeModules = path.join(repoRoot, 'node_modules');
    statuses.push(this.buildStatus(
      'Dependencies (root)',
      fs.existsSync(rootNodeModules),
      `Found (${rootNodeModules})`,
      'Run npm install in repository root'
    ));

    const guiNodeModules = path.join(guiDir, 'node_modules');
    const guiDepsInstalled = fs.existsSync(guiNodeModules) || fs.existsSync(rootNodeModules);
    statuses.push(this.buildStatus(
      'Dependencies (GUI workspace)',
      guiDepsInstalled,
      guiDepsInstalled
        ? `Found (${fs.existsSync(guiNodeModules) ? guiNodeModules : rootNodeModules})`
        : 'Not found',
      'Run npm install in root (workspace) or inside gui/'
    ));

    const playwrightBrowsers = this.detectPlaywrightBrowsers(repoRoot);
    statuses.push(this.buildStatus(
      'Playwright browsers',
      playwrightBrowsers.ok,
      playwrightBrowsers.ok
        ? `Found (${playwrightBrowsers.path})`
        : `Not found${playwrightBrowsers.checked.length ? ` (checked: ${playwrightBrowsers.checked.slice(0, 3).join(', ')}${playwrightBrowsers.checked.length > 3 ? ', ...' : ''})` : ''}`,
      'Run npx playwright install in the repo root'
    ));

    const dbPath = path.join(this.envManager.getUserDataDir(), 'figma_backups.db');
    statuses.push(this.buildStatus(
      'Backups DB',
      fs.existsSync(dbPath),
      `Found (${dbPath})`,
      'Will be created automatically after first run'
    ));

    return statuses;
  }

  private async getFsStatus(): Promise<Array<{ name: string; ok: boolean; message: string }>> {
    const envPath = this.envManager.getEnvPath();
    const userDataDir = this.envManager.getUserDataDir();
    const envConfig = await this.envManager.readEnv();
    const downloadPath = envConfig?.DOWNLOAD_PATH;

    const statuses: Array<{ name: string; ok: boolean; message: string }> = [];
    statuses.push(this.buildStatus(
      '.userData',
      fs.existsSync(userDataDir),
      `Available (${userDataDir})`,
      '.userData directory not created yet'
    ));

    statuses.push(this.buildStatus(
      '.env',
      fs.existsSync(envPath),
      `Found (${envPath})`,
      'Create .env via Config tab'
    ));

    statuses.push(this.checkPathAccess(this.logger.getLogsDir(), 'Logs folder'));

    if (downloadPath) {
      statuses.push(this.checkPathAccess(downloadPath, 'DOWNLOAD_PATH', true));
    } else {
      statuses.push({
        name: 'DOWNLOAD_PATH',
        ok: false,
        message: 'Path not set in .env'
      });
    }

    return statuses;
  }

  private async getApiStatus(): Promise<Array<{ name: string; ok: boolean; message: string }>> {
    const envConfig = await this.envManager.readEnv();
    const statuses: Array<{ name: string; ok: boolean; message: string }> = [];

    statuses.push(this.buildStatus(
      'FIGMA_ACCESS_TOKEN',
      Boolean(envConfig.FIGMA_ACCESS_TOKEN),
      'Token set',
      'Add FIGMA_ACCESS_TOKEN to .env'
    ));

    statuses.push(this.buildStatus(
      'FIGMA_ACCOUNT_1_EMAIL',
      Boolean(envConfig.FIGMA_ACCOUNT_1_EMAIL),
      'Email set',
      'Provide FIGMA_ACCOUNT_1_EMAIL'
    ));

    statuses.push(this.buildStatus(
      'FIGMA_ACCOUNT_1_AUTH_COOKIE',
      Boolean(envConfig.FIGMA_ACCOUNT_1_AUTH_COOKIE),
      'Cookie set',
      'Add FIGMA_ACCOUNT_1_AUTH_COOKIE'
    ));

    return statuses;
  }

  private buildStatus(name: string, ok: boolean, okMessage: string, failMessage: string) {
    return {
      name,
      ok,
      message: ok ? okMessage : failMessage
    };
  }

  private checkPathAccess(targetPath: string, label: string, mustExist = false) {
    try {
      const exists = fs.existsSync(targetPath);
      if (!exists && mustExist) {
        return {
          name: label,
          ok: false,
          message: `${label} not found: ${targetPath}`
        };
      }

      const dirToCheck = exists && fs.statSync(targetPath).isDirectory()
        ? targetPath
        : path.dirname(targetPath);

      fs.accessSync(dirToCheck, fs.constants.R_OK | fs.constants.W_OK);
      return {
        name: label,
        ok: true,
        message: `Available (${dirToCheck})`
      };
    } catch (error: any) {
      return {
        name: label,
        ok: false,
        message: error?.message || `No access to ${targetPath}`
      };
    }
  }

  private async readAppLogs(): Promise<{ success: boolean; content?: string; message?: string; path: string }> {
    const logFile = this.logger.getLogFilePath();

    try {
      if (!fs.existsSync(logFile)) {
        return { success: true, content: '', path: logFile };
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const maxLength = 50000; // limit to last ~50KB
      const trimmed = content.length > maxLength ? content.slice(-maxLength) : content;

      return { success: true, content: trimmed, path: logFile };
    } catch (error: any) {
      this.logger.error('Failed to read logs: ' + error);
      return {
        success: false,
        message: error?.message || 'Failed to read logs',
        path: logFile
      };
    }
  }

  private async clearAppLogs(): Promise<{ success: boolean; message?: string; path: string }> {
    const logFile = this.logger.getLogFilePath();
    try {
      fs.writeFileSync(logFile, '');
      return { success: true, path: logFile };
    } catch (error: any) {
      this.logger.error('Failed to clear logs: ' + error);
      return {
        success: false,
        message: error?.message || 'Failed to clear logs',
        path: logFile
      };
    }
  }

  private detectPlaywrightBrowsers(repoRoot: string): { ok: boolean; path?: string; checked: string[] } {
    const checked: string[] = [];
    const apiPath = this.getChromiumPathViaApi(repoRoot);
    if (apiPath) {
      return { ok: true, path: apiPath, checked };
    }

    const candidates = new Set<string>();
    const rootNodeModules = path.join(repoRoot, 'node_modules');
    const guiNodeModules = path.join(repoRoot, 'gui', 'node_modules');

    // 1) PLAYWRIGHT_BROWSERS_PATH env (may be colon separated)
    const envPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (envPath) {
      envPath.split(path.delimiter).filter(Boolean).forEach(p => candidates.add(p));
    }

    // 2) Local node_modules (root + gui) for playwright and playwright-core
    [
      path.join(rootNodeModules, 'playwright', '.local-browsers'),
      path.join(rootNodeModules, 'playwright-core', '.local-browsers'),
      path.join(guiNodeModules, 'playwright', '.local-browsers'),
      path.join(guiNodeModules, 'playwright-core', '.local-browsers')
    ].forEach(p => candidates.add(p));

    // 3) Resolve playwright/playwright-core package and derive .local-browsers near it
    const tryResolve = (mod: string, base: string) => {
      try {
        const resolved = require.resolve(mod, { paths: [base] });
        const pkgDir = path.dirname(resolved);
        candidates.add(path.join(pkgDir, '..', '.local-browsers'));
      } catch {
        // ignore
      }
    };
    tryResolve('playwright', repoRoot);
    tryResolve('playwright-core', repoRoot);
    tryResolve('playwright', path.join(repoRoot, 'gui'));
    tryResolve('playwright-core', path.join(repoRoot, 'gui'));

    // 4) Default cache used by Playwright installer
    const homeCache = path.join(require('os').homedir(), '.cache', 'ms-playwright');
    candidates.add(homeCache);

    for (const candidate of candidates) {
      checked.push(candidate);
      const chromiumDir = this.findChromiumFolder(candidate);
      if (chromiumDir) {
        return { ok: true, path: chromiumDir, checked };
      }
    }

    return { ok: false, checked };
  }

  private getChromiumPathViaApi(repoRoot: string): string | null {
    const bases = [repoRoot, path.join(repoRoot, 'gui')];
    for (const base of bases) {
      try {
        // Try playwright-core first (lighter), then playwright
        const pwCore = require(require.resolve('playwright-core', { paths: [base] }));
        const execPath = pwCore.chromium?.executablePath?.();
        if (execPath && fs.existsSync(execPath)) {
          return path.dirname(execPath);
        }
      } catch {
        // ignore
      }

      try {
        const pw = require(require.resolve('playwright', { paths: [base] }));
        const execPath = pw.chromium?.executablePath?.();
        if (execPath && fs.existsSync(execPath)) {
          return path.dirname(execPath);
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  private findChromiumFolder(base: string): string | null {
    try {
      if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
        return null;
      }
      const entries = fs.readdirSync(base, { withFileTypes: true });
      const chromiumDir = entries.find(e => e.isDirectory() && e.name.startsWith('chromium-'));
      return chromiumDir ? path.join(base, chromiumDir.name) : null;
    } catch {
      return null;
    }
  }
}

// Запуск приложения
const appInstance = new FigmaExportApp();

// Экспорт для тестирования
export { appInstance };
