"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const { ipcRenderer } = require('electron');
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    checkNodeJS: () => ipcRenderer.invoke('check-nodejs'),
    checkNpm: () => ipcRenderer.invoke('check-npm'),
    installDependencies: () => ipcRenderer.invoke('install-dependencies'),
    readEnv: () => ipcRenderer.invoke('read-env'),
    writeEnv: (config) => ipcRenderer.invoke('write-env', config),
    validateConfig: (config) => ipcRenderer.invoke('validate-config', config),
    runScript: (command) => ipcRenderer.invoke('run-script', command),
    runScriptWithProgress: (command) => ipcRenderer.invoke('run-script-with-progress', command),
    stopScript: () => ipcRenderer.invoke('stop-script'),
    queryDB: (sql, params) => ipcRenderer.invoke('query-db', sql, params),
    getBackupsNeedingBackup: () => ipcRenderer.invoke('get-backups-needing-backup'),
    getAllBackups: () => ipcRenderer.invoke('get-all-backups'),
    getStatistics: () => ipcRenderer.invoke('get-statistics'),
    resetErrors: () => ipcRenderer.invoke('reset-errors'),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    showNotification: (options) => ipcRenderer.invoke('show-notification', options),
    onScriptOutput: (callback) => {
        ipcRenderer.on('script-output', (event, data) => callback(data));
    },
    onScriptProgress: (callback) => {
        ipcRenderer.on('script-progress', (event, progress) => callback(progress));
    },
    onScriptComplete: (callback) => {
        ipcRenderer.on('script-complete', (event, result) => callback(result));
    },
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
