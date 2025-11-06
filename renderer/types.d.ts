// Глобальные типы для Electron API
declare global {
  interface Window {
    electronAPI: {
      // System operations
      checkNodeJS: () => Promise<any>;
      checkNpm: () => Promise<any>;
      
      // Installation
      installDependencies: () => Promise<any>;
      
      // Environment management
      readEnv: () => Promise<Record<string, string>>;
      writeEnv: (config: Record<string, string>) => Promise<any>;
      validateConfig: (config: Record<string, string>) => Promise<{ valid: boolean; errors: string[] }>;
      
      // Script execution
      runScript: (command: string) => Promise<any>;
      runScriptWithProgress: (command: string) => Promise<any>;
      stopScript: () => Promise<any>;
      
      // Database operations
      queryDB: (sql: string, params?: any[]) => Promise<any>;
      getBackupsNeedingBackup: () => Promise<any>;
      getAllBackups: () => Promise<any>;
      getStatistics: () => Promise<any>;
      resetErrors: () => Promise<any>;
      
      // File operations
      selectDirectory: () => Promise<string>;
      
      // Notifications
      showNotification: (options: { title: string; body: string }) => Promise<void>;
      
      // Event listeners
      onScriptOutput: (callback: (data: string) => void) => void;
      onScriptProgress: (callback: (progress: any) => void) => void;
      onScriptComplete: (callback: (result: any) => void) => void;
      
      // Remove listeners
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};