import { contextBridge } from 'electron';
const { ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // System operations
  checkNodeJS: () => ipcRenderer.invoke('check-nodejs'),
  checkNpm: () => ipcRenderer.invoke('check-npm'),
  getSystemInfo: () => ipcRenderer.invoke('diagnostics:get-system-info'),
  getDependencyStatus: () => ipcRenderer.invoke('diagnostics:get-dependencies'),
  getFsStatus: () => ipcRenderer.invoke('diagnostics:get-fs-status'),
  getApiStatus: () => ipcRenderer.invoke('diagnostics:get-api-status'),
  readLogs: () => ipcRenderer.invoke('diagnostics:read-logs'),
  clearLogs: () => ipcRenderer.invoke('diagnostics:clear-logs'),
  openLogsFolder: () => ipcRenderer.invoke('diagnostics:open-logs-folder'),
  
  // Installation
  installDependencies: () => ipcRenderer.invoke('install-dependencies'),
  
  // Environment management
  readEnv: () => ipcRenderer.invoke('read-env'),
  writeEnv: (config: Record<string, string>) => ipcRenderer.invoke('write-env', config),
  validateConfig: (config: Record<string, string>) => ipcRenderer.invoke('validate-config', config),
  
  // Script execution
  runScript: (command: string) => ipcRenderer.invoke('run-script', command),
  runScriptWithProgress: (command: string) => ipcRenderer.invoke('run-script-with-progress', command),
  stopScript: () => ipcRenderer.invoke('stop-script'),
  
  // Database operations
  queryDB: (sql: string, params?: any[]) => ipcRenderer.invoke('query-db', sql, params),
  getBackupsNeedingBackup: () => ipcRenderer.invoke('get-backups-needing-backup'),
  getAllBackups: () => ipcRenderer.invoke('get-all-backups'),
  getStatistics: () => ipcRenderer.invoke('get-statistics'),
  resetErrors: () => ipcRenderer.invoke('reset-errors'),
  
  // File operations
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // Notifications
  showNotification: (options: { title: string; body: string }) => 
    ipcRenderer.invoke('show-notification', options),
  
 // Event listeners
 onScriptOutput: (callback: (data: string) => void) => {
    ipcRenderer.on('script-output', (event: any, data: any) => callback(data));
  },
  
  onScriptProgress: (callback: (progress: any) => void) => {
     ipcRenderer.on('script-progress', (event: any, progress: any) => callback(progress));
   },
  
  onScriptComplete: (callback: (result: any) => void) => {
     ipcRenderer.on('script-complete', (event: any, result: any) => callback(result));
   },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
