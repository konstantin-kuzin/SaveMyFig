import { Logger } from './logger';
import { spawn } from 'child_process';

export class ScriptRunner {
  private logger: Logger;
  private currentProcess: any = null;

 constructor() {
    this.logger = new Logger();
  }

  async installDependencies(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info('Starting npm install...');
      
      // Используем spawn вместо execa
      this.currentProcess = spawn('npm', ['install'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
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
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
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
      
      // Используем spawn вместо execa
      this.currentProcess = spawn('npm', ['run', command], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

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
}