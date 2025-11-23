import { Logger } from './logger';
import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export class ScriptRunner {
  private logger: Logger;
  private currentProcess: any = null;
  private baseCwd: string;

  constructor() {
    this.logger = new Logger();
    this.baseCwd = this.resolveBaseCwd();
    this.logger.info(`ScriptRunner base cwd: ${this.baseCwd}`);
  }

  async installDependencies(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info('Starting npm install...');
      
      // Используем spawn вместо execa
      this.currentProcess = spawn('npm', ['install'], {
        cwd: this.baseCwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: this.getSpawnEnv()
      });

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.logger.info(text);
      });

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.logger.warn(text);
      });

      // Ожидаем завершения процесса
      await new Promise<void>((resolve, reject) => {
        this.currentProcess.on('close', (code: number) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Process exited with code ${code}`));
          }
        });
        
        this.currentProcess.on('error', (error: Error) => {
          reject(error);
        });
      });
      
      // Установка Playwright browsers
      this.logger.info('Installing Playwright browsers...');
      const playwrightProcess = spawn('npx', ['playwright', 'install'], {
        cwd: this.baseCwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: this.getSpawnEnv()
      });
      
      // Ожидаем завершения процесса Playwright
      await new Promise<void>((resolve, reject) => {
        playwrightProcess.on('close', (code: number) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Playwright process exited with code ${code}`));
          }
        });
        
        playwrightProcess.on('error', (error: Error) => {
          reject(error);
        });
      });

      return {
        success: true,
        message: 'Зависимости успешно установлены'
      };
    } catch (error: any) {
      this.logger.error('Installation failed: ' + error.message);
      return {
        success: false,
        message: error.message || 'Неизвестная ошибка установки'
      };
    } finally {
      this.currentProcess = null;
    }
  }

 async runScript(
    command: string,
    onOutput?: (data: string) => void,
    onProgress?: (progress: any) => void
 ): Promise<{ success: boolean; message?: string }> {
    try {
      this.logger.info(`Running script: ${command}`);

      // Специальный кейс: запуск резервного скрипта напрямую через node
      if (command === 'run-backup') {
        const backupScript = this.resolveBackupScript();
        if (!backupScript) {
          return { success: false, message: 'Не найден backup/run-backup.js в собранном приложении' };
        }

        const nodeBin = this.resolveNodeBinary();
        if (!nodeBin) {
          return { success: false, message: 'Node.js не найден в системе' };
        }

        this.currentProcess = spawn(nodeBin, [backupScript], {
          cwd: this.baseCwd,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: this.getSpawnEnv()
        });
      } else {
        // Используем npm run для остальных команд
        this.currentProcess = spawn('npm', ['run', command], {
          cwd: this.baseCwd,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: this.getSpawnEnv()
        });
      }

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.logger.info(text);
        onOutput?.(text);
        
        // Парсинг прогресса
        const progress = this.parseProgress(text);
        if (progress) {
          onProgress?.(progress);
        }
      });

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.logger.warn(text);
        onOutput?.(text);
      });

      // Ожидаем завершения процесса
      const result = await new Promise<{ success: boolean; message?: string }>((resolve) => {
        this.currentProcess.on('close', (code: number) => {
          if (code === 0) {
            resolve({
              success: true,
              message: `Команда ${command} выполнена успешно`
            });
          } else {
            resolve({
              success: false,
              message: `Команда ${command} завершена с кодом ошибки ${code}`
            });
          }
        });
        
        this.currentProcess.on('error', (error: Error) => {
          resolve({
            success: false,
            message: `Ошибка выполнения команды ${command}: ${error.message}`
          });
        });
      });
      
      return result;
    } catch (error: any) {
      this.logger.error(`Script ${command} failed: ${error.message}`);
      return {
        success: false,
        message: error.message || 'Неизвестная ошибка выполнения скрипта'
      };
    } finally {
      this.currentProcess = null;
    }
  }

  stopScript(): void {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.logger.info('Script stopped by user');
    }
  }

  private parseProgress(text: string): { current: number; total: number } | null {
    const patterns = [
      /(?:Downloaded|Скачано|Загрузили).*?(\d+)\/(\d+)/gi,
      /\[(\d+)\/(\d+)\]/gi,
      /Progress:?\s*(\d+)%/gi,
      /(\d+)\s*of\s*(\d+)\s*files?/gi
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          current: parseInt(match[1], 10),
          total: parseInt(match[2], 10)
        };
      }
    }
    return null;
  }

 private getErrorMessage(error: any): string {
    if (error.timedOut) {
      return 'Процесс превысил лимит времени';
    }
    if (error.signal) {
      return `Процесс завершен сигналом: ${error.signal}`;
    }
    if (error.exitCode !== undefined) {
      return `Процесс завершился с кодом ошибки ${error.exitCode}`;
    }
    return error.message || 'Неизвестная ошибка';
  }

  private getSpawnEnv() {
    // Ensure common PATH locations are available in packaged apps
    const fallbackPaths = [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      path.join(this.baseCwd, 'node_modules', '.bin'),
      path.join(process.resourcesPath, 'app', 'node_modules', '.bin'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '.bin')
    ];
    const existing = process.env.PATH ? process.env.PATH.split(path.delimiter) : [];

    // Keep only valid directories to avoid ENOTDIR when spawning
    const unique = Array.from(new Set([...fallbackPaths, ...existing]));
    const validDirs = unique.filter(p => {
      try {
        return fs.statSync(p).isDirectory();
      } catch {
        return false;
      }
    });

    const merged = validDirs.join(path.delimiter);

    return {
      ...process.env,
      PATH: merged
    };
  }

  private resolveBaseCwd(): string {
    if (!app?.isPackaged) {
      return process.cwd();
    }

    const candidates = [
      app.getAppPath(),
      path.join(process.resourcesPath, 'app'),
      path.join(process.resourcesPath, 'app.asar.unpacked'),
      path.dirname(app.getAppPath()),
      process.resourcesPath
    ];

    // Prefer a directory that has package.json with the needed script
    for (const candidate of candidates) {
      const pkgPath = path.join(candidate, 'package.json');
      try {
        const stat = fs.statSync(candidate);
        if (!stat.isDirectory()) continue;
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (pkg?.scripts?.['run-backup']) {
            return candidate;
          }
        }
      } catch {
        // skip
      }
    }

    // Otherwise any existing directory is fine
    for (const candidate of candidates) {
      try {
        const stat = fs.statSync(candidate);
        if (stat.isDirectory()) {
          return candidate;
        }
      } catch {
        // skip
      }
    }

    this.logger.warn('Could not determine packaged base cwd, falling back to process.cwd()');
    return process.cwd();
  }

  private resolveBackupScript(): string | null {
    const candidates: string[] = [
      path.join(this.baseCwd, 'backup', 'run-backup.js'),
      // relative to compiled utils directory
      path.join(__dirname, '..', 'backup', 'run-backup.js'),
      path.join(__dirname, '..', '..', 'backup', 'run-backup.js'),
      path.join(__dirname, '..', '..', '..', 'backup', 'run-backup.js'),
      // relative to current working dir (useful when run outside of packaged app)
      path.join(process.cwd(), 'backup', 'run-backup.js'),
      path.join(process.cwd(), '..', 'backup', 'run-backup.js')
    ];

    if (process.resourcesPath) {
      candidates.push(
        path.join(process.resourcesPath, 'app', 'backup', 'run-backup.js'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'backup', 'run-backup.js')
      );
    }

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    this.logger.error(`Backup script not found. Checked: ${candidates.join(', ')}`);
    return null;
  }

  private resolveNodeBinary(): string | null {
    // Build candidate paths
    const envPaths = (this.getSpawnEnv().PATH || '').split(path.delimiter).filter(Boolean);
    const hardcoded = [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      path.join(this.baseCwd, '.node', 'bin'),
      path.join(process.resourcesPath, '.node', 'bin')
    ];

    const allDirs = Array.from(new Set([...hardcoded, ...envPaths]));
    const candidateBins = allDirs.map(dir => path.join(dir, 'node'));

    for (const bin of candidateBins) {
      try {
        const stat = fs.statSync(bin);
        if (stat.isFile() || stat.isSymbolicLink()) {
          return bin;
        }
      } catch {
        // skip
      }
    }

    this.logger.error('Node binary not found in expected locations');
    return null;
  }

  getBaseCwd(): string {
    return this.baseCwd;
  }
}
