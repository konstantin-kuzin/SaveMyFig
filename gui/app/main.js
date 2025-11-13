"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appInstance = void 0;
if (process.env.ELECTRON_RUN_AS_NODE) {
    delete process.env.ELECTRON_RUN_AS_NODE;
}
const electron_1 = require("electron");
const path_1 = require("path");
const logger_1 = require("./utils/logger");
const env_manager_1 = require("./utils/env-manager");
const db_reader_1 = require("./utils/db-reader");
const script_runner_1 = require("./utils/script-runner");
const node_checker_1 = require("./utils/node-checker");
class FigmaExportApp {
    mainWindow = null;
    logger;
    envManager;
    dbManager;
    scriptRunner;
    nodeChecker;
    constructor() {
        this.logger = new logger_1.Logger();
        this.envManager = new env_manager_1.EnvManager();
        this.dbManager = new db_reader_1.DatabaseManager();
        this.scriptRunner = new script_runner_1.ScriptRunner();
        this.nodeChecker = new node_checker_1.NodeChecker();
        this.setupApp();
        this.setupIPC();
    }
    setupApp() {
        electron_1.app.whenReady().then(() => this.createWindow());
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin')
                electron_1.app.quit();
        });
    }
    createWindow() {
        this.mainWindow = new electron_1.BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 8000,
            minHeight: 400,
            webPreferences: {
                preload: (0, path_1.join)(__dirname, 'preload.js'),
                nodeIntegration: false
            },
        });
        const indexPath = electron_1.app.isPackaged
            ? (0, path_1.join)(__dirname, '../dist/index.html')
            : (0, path_1.join)(__dirname, '../dist/index.html');
        this.mainWindow.loadFile(indexPath);
        if (!electron_1.app.isPackaged) {
            this.mainWindow.webContents.openDevTools();
        }
    }
    setupIPC() {
        electron_1.ipcMain.handle('check-nodejs', async () => {
            return await this.nodeChecker.checkNodeJS();
        });
        electron_1.ipcMain.handle('check-npm', async () => {
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
            }
            catch (error) {
                this.logger.error('npm not found: ' + error);
                return { installed: false };
            }
        });
        electron_1.ipcMain.handle('install-dependencies', async () => {
            return await this.scriptRunner.installDependencies();
        });
        electron_1.ipcMain.handle('read-env', async () => {
            return await this.envManager.readEnv();
        });
        electron_1.ipcMain.handle('write-env', async (event, config) => {
            return await this.envManager.writeEnv(config);
        });
        electron_1.ipcMain.handle('validate-config', async (event, config) => {
            return await this.envManager.validateConfig(config);
        });
        electron_1.ipcMain.handle('run-script', async (event, command) => {
            return await this.scriptRunner.runScript(command, (data) => {
                this.mainWindow?.webContents.send('script-output', data);
            });
        });
        electron_1.ipcMain.handle('run-script-with-progress', async (event, command) => {
            return await this.scriptRunner.runScript(command, (data) => {
                this.mainWindow?.webContents.send('script-output', data);
            }, (progress) => {
                this.mainWindow?.webContents.send('script-progress', progress);
            });
        });
        electron_1.ipcMain.handle('stop-script', async () => {
            return await this.scriptRunner.stopScript();
        });
        electron_1.ipcMain.handle('query-db', async (event, sql, params) => {
            return await this.dbManager.query(sql, params);
        });
        electron_1.ipcMain.handle('get-backups-needing-backup', async () => {
            return await this.dbManager.getBackupsNeedingBackup();
        });
        electron_1.ipcMain.handle('get-all-backups', async () => {
            return await this.dbManager.getAllBackups();
        });
        electron_1.ipcMain.handle('get-statistics', async () => {
            return await this.dbManager.getStatistics();
        });
        electron_1.ipcMain.handle('reset-errors', async () => {
            return await this.dbManager.resetErrors();
        });
        electron_1.ipcMain.handle('select-directory', async () => {
            const result = await electron_1.dialog.showOpenDialog(this.mainWindow, {
                properties: ['openDirectory']
            });
            return result.filePaths[0] || '';
        });
        electron_1.ipcMain.handle('show-notification', async (event, options) => {
            new electron_1.Notification({
                title: options.title,
                body: options.body
            }).show();
        });
        electron_1.ipcMain.handle('open-external', async (event, url) => {
            if (url) {
                await electron_1.shell.openExternal(url);
            }
        });
    }
}
const appInstance = new FigmaExportApp();
exports.appInstance = appInstance;
