"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    checkNodeJS: () => electron_1.ipcRenderer.invoke('check-nodejs'),
    checkNpm: () => electron_1.ipcRenderer.invoke('check-npm'),
    installDependencies: () => electron_1.ipcRenderer.invoke('install-dependencies'),
    readEnv: () => electron_1.ipcRenderer.invoke('read-env'),
    writeEnv: (config) => electron_1.ipcRenderer.invoke('write-env', config),
    validateConfig: (config) => electron_1.ipcRenderer.invoke('validate-config', config),
    runScript: (command) => electron_1.ipcRenderer.invoke('run-script', command),
    runScriptWithProgress: (command) => electron_1.ipcRenderer.invoke('run-script-with-progress', command),
    stopScript: () => electron_1.ipcRenderer.invoke('stop-script'),
    queryDB: (sql, params) => electron_1.ipcRenderer.invoke('query-db', sql, params),
    getBackupsNeedingBackup: () => electron_1.ipcRenderer.invoke('get-backups-needing-backup'),
    getAllBackups: () => electron_1.ipcRenderer.invoke('get-all-backups'),
    getStatistics: () => electron_1.ipcRenderer.invoke('get-statistics'),
    resetErrors: () => electron_1.ipcRenderer.invoke('reset-errors'),
    selectDirectory: () => electron_1.ipcRenderer.invoke('select-directory'),
    showNotification: (options) => electron_1.ipcRenderer.invoke('show-notification', options),
    onScriptOutput: (callback) => {
        electron_1.ipcRenderer.on('script-output', (_, data) => callback(data));
    },
    onScriptProgress: (callback) => {
        electron_1.ipcRenderer.on('script-progress', (_, progress) => callback(progress));
    },
    onScriptComplete: (callback) => {
        electron_1.ipcRenderer.on('script-complete', (_, result) => callback(result));
    },
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    }
});
