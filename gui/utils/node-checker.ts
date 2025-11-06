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

  async checkPermissions(): Promise<{ canWrite: boolean; needsSudo?: boolean; suggestion?: string }> {
    const brewPath = '/usr/local/bin';
    try {
      // Проверяем права записи в brew path
      (await import('fs')).accessSync(brewPath, (await import('fs')).constants.W_OK);
      return { canWrite: true };
    } catch {
      try {
        // Проверяем, доступен ли sudo
        const result = execSync('sudo -n echo test', { encoding: 'utf8' });
        if (result.trim() === 'test') {
          return { canWrite: true, needsSudo: true };
        }
        return { 
          canWrite: false, 
          suggestion: 'Требуется пароль sudo для установки Homebrew' 
        };
      } catch {
        return { 
          canWrite: false, 
          suggestion: 'Требуются права администратора для установки Homebrew' 
        };
      }
    }
  }
}