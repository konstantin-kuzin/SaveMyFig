import { execSync } from 'child_process';
import { Logger } from './logger';
import fs from 'fs';
import path from 'path';

export class NodeChecker {
  private logger: Logger;
  private fallbackPaths = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'];

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
      const nodeBin = this.resolveNodeBinary();
      if (!nodeBin) {
        this.logger.error('Node.js not found in resolveNodeBinary');
        return { installed: false };
      }

      const version = execSync(`"${nodeBin}" --version`, { encoding: 'utf8' }).trim();
      const resolvedPath = nodeBin;
      const versionNumber = version.replace('v', '');
      const majorVersion = parseInt(versionNumber.split('.')[0]);
      
      return {
        installed: true,
        version,
        path: resolvedPath,
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
      require('fs').accessSync(brewPath, require('fs').constants.W_OK);
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

  private resolveNodeBinary(): string | null {
    const envPaths = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
    const dirs = Array.from(new Set([...this.fallbackPaths, ...envPaths]));
    for (const dir of dirs) {
      try {
        const full = path.join(dir, 'node');
        const stat = fs.statSync(full);
        if (stat.isFile() || stat.isSymbolicLink()) {
          return full;
        }
      } catch {
        // skip
      }
    }
    return null;
  }
}
