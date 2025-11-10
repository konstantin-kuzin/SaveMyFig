declare global {
  interface Window {
    electronAPI: {
      // Файловые операции
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string) => Promise<void>;
      selectFile: () => Promise<string | null>;
      selectDirectory: () => Promise<string | null>;
      
      // Уведомления
      showNotification: (title: string, message: string) => Promise<void>;
      
      // IPC для скриптов
      onScriptOutput: (callback: (data: string) => void) => void;
      onScriptProgress: (callback: (progress: { current: number; total: number }) => void) => void;
      runScriptWithProgress: (command: string) => Promise<{ success: boolean; message: string }>;
      stopScript: () => Promise<void>;
      
      // Системная информация
      getSystemInfo: () => Promise<{
        platform: string;
        arch: string;
        nodeVersion: string;
        electronVersion: string;
        figmaPath: string | null;
        hasGit: boolean;
      }>;
      
      // Проверка зависимостей
      checkDependencies: () => Promise<{
        node: boolean;
        git: boolean;
        figma: boolean;
        all: boolean;
      }>;
      
      // Конфигурация
      readEnv: () => Promise<any>;
      writeEnv: (config: any) => Promise<{ success: boolean; message: string }>;
      validateConfig: (config: any) => Promise<{ valid: boolean; errors: string[] }>;
      
      // Проверка системных компонентов
      checkNodeJS: () => Promise<{
        installed: boolean;
        version: string;
        path: string;
      }>;
      checkNpm: () => Promise<{
        installed: boolean;
        version: string;
        path: string;
      }>;
      checkNode: () => Promise<{
        installed: boolean;
        version: string;
        path: string;
      }>;
      
      // Установка зависимостей
      installDependencies: () => Promise<{ success: boolean; message: string }>;
      
      // Статистика
      resetErrors: () => Promise<{ success: boolean; message: string }>;
      getStatistics: () => Promise<any>;
      getAllBackups: () => Promise<any[]>;
      
      // Версия приложения
      getVersion: () => string;
    };
  }
}

export {};